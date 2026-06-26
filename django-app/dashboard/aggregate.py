import re
from collections import OrderedDict


def to_annual_hours(row, workday_mode):
    """時間値を「年間時間」に換算する（nextjs-app/lib/aggregate.ts と同一ロジック）。"""
    v = row.get("time_value") or 0
    unit = row.get("time_unit")
    if unit == "年":
        return v
    if unit == "月":
        return v * 12
    if unit == "日":
        # プライベート利用は常に365日換算、業務利用はトグル(260/365)に従う
        if row.get("usage_type") == "プライベート":
            return v * 365
        return v * workday_mode
    return 0


def apply_filters(rows, filters):
    clients = filters.get("clients") or []
    courses = filters.get("courses") or []
    usage_types = filters.get("usage_types") or []

    def keep(r):
        if clients and r.get("client_name") not in clients:
            return False
        if courses and r.get("course_name") not in courses:
            return False
        if usage_types and r.get("usage_type") not in usage_types:
            return False
        return True

    return [r for r in rows if keep(r)]


def _avg(nums):
    nums = [n for n in nums if n is not None]
    if not nums:
        return None
    return sum(nums) / len(nums)


def calc_nps(scores):
    scores = [s for s in scores if s is not None]
    if not scores:
        return None
    promoters = len([s for s in scores if s >= 9])
    detractors = len([s for s in scores if s <= 6])
    return (promoters - detractors) / len(scores) * 100


def compute_kpis(rows, workday_mode):
    total = sum(to_annual_hours(r, workday_mode) for r in rows)
    count = len(rows)
    satisfaction = _avg([r.get("satisfaction_score") for r in rows])
    comprehension = _avg([r.get("comprehension_score") for r in rows])
    nps = calc_nps([r.get("nps_score") for r in rows])
    return {
        "total_annual_hours": total,
        "avg_annual_hours_per_person": (total / count) if count else 0,
        "response_count": count,
        "avg_satisfaction": satisfaction,
        "avg_comprehension": comprehension,
        "nps": nps,
    }


def compute_kirkpatrick(rows, kpis, roi_result):
    """カークパトリック4段階モデルのスコアを算出する（0〜100）。

    Level 1 反応  : 満足度平均(1-5) を 0-100 に換算
    Level 2 学習  : 理解度平均(1-5) を 0-100 に換算
    Level 3 行動  : 実践予定「はい」の割合(%)
    Level 4 結果  : 1人あたり年間節約時間を120hを満点として換算
    """
    def pct(val, lo, hi):
        if val is None:
            return None
        return round((val - lo) / (hi - lo) * 100)

    l1 = pct(kpis.get("avg_satisfaction"), 1, 5)
    l2 = pct(kpis.get("avg_comprehension"), 1, 5)

    answered = [r for r in rows if r.get("would_apply") is not None]
    if answered:
        yes = sum(1 for r in answered if r.get("would_apply") == "はい")
        l3 = round(yes / len(answered) * 100)
    else:
        l3 = None

    avg_h = kpis.get("avg_annual_hours_per_person", 0)
    l4 = min(100, round(avg_h / 120 * 100)) if avg_h > 0 else (0 if kpis.get("response_count") else None)

    def label(s):
        if s is None:
            return "データなし"
        if s >= 75:
            return "高い"
        if s >= 50:
            return "普通"
        return "改善余地あり"

    def color(s):
        if s is None:
            return "#94a3b8"
        if s >= 75:
            return "#22c55e"
        if s >= 50:
            return "#f59e0b"
        return "#ef4444"

    levels = [
        {"level": 1, "name": "反応（Reaction）", "description": "受講者が研修にどう感じたか", "score": l1, "label": label(l1), "color": color(l1)},
        {"level": 2, "name": "学習（Learning）", "description": "知識・スキルがどれだけ身についたか", "score": l2, "label": label(l2), "color": color(l2)},
        {"level": 3, "name": "行動（Behavior）", "description": "学んだことを実務で実践しているか", "score": l3, "label": label(l3), "color": color(l3)},
        {"level": 4, "name": "結果（Results）", "description": "業務への定量的な成果・ROI", "score": l4, "label": label(l4), "color": color(l4)},
    ]
    return {"levels": levels, "radar": [{"subject": f"Level {d['level']}", "score": d["score"] or 0} for d in levels]}


def compute_roi(total_annual_hours, hourly_wage, training_cost):
    """ROI（投資対効果）を算出する。

    cost_savings : 年間節約時間 × 想定時給 = コスト削減額（円/年）
    roi_percent  : (削減額 - 研修費用) / 研修費用 × 100。研修費用が0以下ならNone。
    """
    wage = hourly_wage or 0
    cost = training_cost or 0
    cost_savings = total_annual_hours * wage
    net_benefit = cost_savings - cost
    roi_percent = (net_benefit / cost * 100) if cost > 0 else None
    return {
        "cost_savings": cost_savings,
        "training_cost": cost,
        "net_benefit": net_benefit,
        "roi_percent": roi_percent,
    }


def group_by(rows, field, workday_mode):
    groups = OrderedDict()
    for r in rows:
        key = r.get(field) or "(未設定)"
        groups.setdefault(key, []).append(r)

    result = []
    for key, group in groups.items():
        total = sum(to_annual_hours(r, workday_mode) for r in group)
        sat = _avg([r.get("satisfaction_score") for r in group])
        comp = _avg([r.get("comprehension_score") for r in group])
        nps = calc_nps([r.get("nps_score") for r in group])
        diff = _avg([r.get("difficulty_level") for r in group])
        inst = _avg([r.get("instructor_score") for r in group])
        result.append(
            {
                "key": key,
                "total_annual_hours": total,
                "count": len(group),
                "avg_annual_hours": (total / len(group)) if group else 0,
                "avg_satisfaction": sat,
                "avg_comprehension": comp,
                "avg_nps": nps,
                "avg_difficulty": diff,
                "avg_instructor": inst,
            }
        )
    result.sort(key=lambda g: g["total_annual_hours"], reverse=True)
    return result


_TREND_KEY_LEN = {"day": 10, "month": 7, "year": 4}


def trend_by(rows, workday_mode, granularity="month"):
    key_len = _TREND_KEY_LEN.get(granularity, 7)
    buckets = OrderedDict()
    for r in rows:
        key = (r.get("answered_at") or "")[:key_len]
        if not key:
            continue
        e = buckets.setdefault(key, {"total": 0, "count": 0})
        e["total"] += to_annual_hours(r, workday_mode)
        e["count"] += 1

    points = [
        {"month": m, "total_annual_hours": v["total"], "count": v["count"]}
        for m, v in buckets.items()
    ]
    points.sort(key=lambda p: p["month"])
    return points


def trend_by_month(rows, workday_mode):
    return trend_by(rows, workday_mode, "month")


def score_distribution(rows, field, max_score):
    counts = [0] * (max_score + 1)
    for r in rows:
        v = r.get(field)
        if v is not None and 0 <= v <= max_score:
            counts[int(v)] += 1
    return [{"score": i, "count": counts[i]} for i in range(1, max_score + 1)]


STOPWORDS = {
    "そして", "また", "ました", "です", "ます", "という", "こと", "これ", "それ",
    "ので", "から", "など", "して", "した", "ある", "いる", "なる", "思い", "とても",
}

_KEYWORD_PATTERN = re.compile(r"[一-龠ぁ-んァ-ヶa-zA-Z0-9]{2,}")


def keyword_frequency(rows, top_n=20):
    freq = OrderedDict()
    for r in rows:
        text = r.get("free_comment") or ""
        for token in _KEYWORD_PATTERN.findall(text):
            if token in STOPWORDS:
                continue
            freq[token] = freq.get(token, 0) + 1

    items = sorted(freq.items(), key=lambda kv: kv[1], reverse=True)
    return [{"word": w, "count": c} for w, c in items[:top_n]]


def would_apply_distribution(rows):
    counts = OrderedDict([("はい", 0), ("いいえ", 0), ("わからない", 0)])
    for r in rows:
        v = r.get("would_apply")
        if v in counts:
            counts[v] += 1
    return [{"name": k, "value": v} for k, v in counts.items() if v > 0]


def nps_breakdown(rows):
    scores = [r.get("nps_score") for r in rows if r.get("nps_score") is not None]
    promoters = len([s for s in scores if s >= 9])
    passives = len([s for s in scores if 7 <= s <= 8])
    detractors = len([s for s in scores if s <= 6])
    data = [
        {"name": "推奨者 (9-10)", "value": promoters},
        {"name": "中立者 (7-8)", "value": passives},
        {"name": "批判者 (0-6)", "value": detractors},
    ]
    return {
        "data": [d for d in data if d["value"] > 0],
        "nps": calc_nps(scores),
    }
