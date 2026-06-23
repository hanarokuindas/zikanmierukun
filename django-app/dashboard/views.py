from django.shortcuts import redirect, render

from . import aggregate
from .parsing import parse_csv
from .sample_data import generate_sample_data

SESSION_ROWS = "survey_rows"
SESSION_ERRORS = "survey_errors"


def index(request):
    errors = request.session.get(SESSION_ERRORS, [])
    if request.session.get(SESSION_ROWS):
        return redirect("dashboard:dashboard")
    return render(request, "dashboard/index.html", {"errors": errors})


def upload(request):
    if request.method != "POST":
        return redirect("dashboard:index")

    csv_file = request.FILES.get("csv_file")
    if not csv_file:
        request.session[SESSION_ERRORS] = ["ファイルが選択されていません。"]
        return redirect("dashboard:index")

    text = csv_file.read().decode("utf-8-sig", errors="replace")
    rows, errors = parse_csv(text)

    request.session[SESSION_ROWS] = rows
    request.session[SESSION_ERRORS] = errors

    if rows:
        return redirect("dashboard:dashboard")
    return redirect("dashboard:index")


def load_sample(request):
    if request.method != "POST":
        return redirect("dashboard:index")

    request.session[SESSION_ROWS] = generate_sample_data()
    request.session[SESSION_ERRORS] = []
    return redirect("dashboard:dashboard")


def clear(request):
    if request.method == "POST":
        request.session.pop(SESSION_ROWS, None)
        request.session.pop(SESSION_ERRORS, None)
    return redirect("dashboard:index")


def dashboard(request):
    rows = request.session.get(SESSION_ROWS)
    if not rows:
        return redirect("dashboard:index")

    errors = request.session.get(SESSION_ERRORS, [])

    selected_clients = request.GET.getlist("clients")
    selected_courses = request.GET.getlist("courses")
    usage_type = request.GET.get("usage_type", "")
    usage_types = [usage_type] if usage_type else []
    try:
        workday_mode = int(request.GET.get("workday_mode", "260"))
    except ValueError:
        workday_mode = 260
    if workday_mode not in (260, 365):
        workday_mode = 260
    tab = request.GET.get("tab", "time")
    if tab not in ("time", "evaluation"):
        tab = "time"

    filters = {
        "clients": selected_clients,
        "courses": selected_courses,
        "usage_types": usage_types,
    }
    filtered = aggregate.apply_filters(rows, filters)

    kpis = aggregate.compute_kpis(filtered, workday_mode)
    by_course = aggregate.group_by(filtered, "course_name", workday_mode)
    by_client = aggregate.group_by(filtered, "client_name", workday_mode)
    trend_day = aggregate.trend_by(filtered, workday_mode, "day")
    trend_month = aggregate.trend_by(filtered, workday_mode, "month")
    trend_year = aggregate.trend_by(filtered, workday_mode, "year")
    sat_dist = aggregate.score_distribution(filtered, "satisfaction_score", 5)
    comp_dist = aggregate.score_distribution(filtered, "comprehension_score", 5)
    diff_dist = aggregate.score_distribution(filtered, "difficulty_level", 5)
    keywords = aggregate.keyword_frequency(filtered, 25)
    apply_dist = aggregate.would_apply_distribution(filtered)
    nps_breakdown = aggregate.nps_breakdown(filtered)

    all_clients = sorted({r["client_name"] for r in rows})
    all_courses = sorted({r["course_name"] for r in rows})

    chart_data = {
        "byCourse": [
            {
                "key": g["key"],
                "totalAnnualHours": g["total_annual_hours"],
                "count": g["count"],
            }
            for g in by_course
        ],
        "byClient": [
            {
                "key": g["key"],
                "totalAnnualHours": g["total_annual_hours"],
                "count": g["count"],
            }
            for g in by_client
        ],
        "trendByGranularity": {
            "day": [
                {"month": p["month"], "totalAnnualHours": p["total_annual_hours"], "count": p["count"]}
                for p in trend_day
            ],
            "month": [
                {"month": p["month"], "totalAnnualHours": p["total_annual_hours"], "count": p["count"]}
                for p in trend_month
            ],
            "year": [
                {"month": p["month"], "totalAnnualHours": p["total_annual_hours"], "count": p["count"]}
                for p in trend_year
            ],
        },
        "satDist": sat_dist,
        "compDist": comp_dist,
        "diffDist": diff_dist,
        "npsBreakdown": nps_breakdown,
        "applyDist": apply_dist,
    }

    context = {
        "errors": errors,
        "kpis": kpis,
        "by_course": by_course,
        "keywords": keywords,
        "chart_data": chart_data,
        "all_clients": all_clients,
        "all_courses": all_courses,
        "selected_clients": selected_clients,
        "selected_courses": selected_courses,
        "usage_type": usage_type,
        "workday_mode": workday_mode,
        "tab": tab,
        "has_filtered_rows": bool(filtered),
    }
    return render(request, "dashboard/dashboard.html", context)
