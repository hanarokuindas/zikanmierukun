import csv
import io
import re

# 列名の表記ゆれを吸収するためのエイリアス（nextjs-app/lib/parseCsv.ts と同一仕様）
HEADER_ALIASES = {
    "response_id": "response_id",
    "回答id": "response_id",
    "回答ID": "response_id",
    "course_name": "course_name",
    "講座名": "course_name",
    "コース名": "course_name",
    "client_name": "client_name",
    "クライアント名": "client_name",
    "企業名": "client_name",
    "respondent_dept": "respondent_dept",
    "部署": "respondent_dept",
    "answered_at": "answered_at",
    "回答日": "answered_at",
    "time_unit": "time_unit",
    "時間単位": "time_unit",
    "単位": "time_unit",
    "time_value": "time_value",
    "時間": "time_value",
    "節約時間": "time_value",
    "usage_type": "usage_type",
    "用途": "usage_type",
    "satisfaction_score": "satisfaction_score",
    "満足度": "satisfaction_score",
    "comprehension_score": "comprehension_score",
    "理解度": "comprehension_score",
    "nps_score": "nps_score",
    "推奨度": "nps_score",
    "nps": "nps_score",
    "instructor_score": "instructor_score",
    "講師評価": "instructor_score",
    "difficulty_level": "difficulty_level",
    "難易度": "difficulty_level",
    "would_apply": "would_apply",
    "実践予定": "would_apply",
    "free_comment": "free_comment",
    "自由記述": "free_comment",
    "コメント": "free_comment",
}

NUMERIC_FIELDS = (
    "satisfaction_score",
    "comprehension_score",
    "nps_score",
    "instructor_score",
    "difficulty_level",
)


def _normalize_header(h):
    key = h.strip()
    return HEADER_ALIASES.get(key) or HEADER_ALIASES.get(key.lower())


def _parse_time_unit(v):
    s = v.strip()
    if "月" in s:
        return "月"
    if "日" in s:
        return "日"
    if "年" in s:
        return "年"
    return None


def _parse_usage_type(v):
    s = v.strip()
    if "プライベート" in s or s.lower() == "private":
        return "プライベート"
    if "業務" in s or s.lower() == "work":
        return "業務"
    return None


def _parse_would_apply(v):
    s = v.strip()
    if "はい" in s or s.lower() == "yes":
        return "はい"
    if "いいえ" in s or s.lower() == "no":
        return "いいえ"
    if "わからない" in s:
        return "わからない"
    return None


def _to_number(v):
    if v is None or v.strip() == "":
        return None
    cleaned = re.sub(r"[^0-9.\-]", "", v)
    try:
        n = float(cleaned)
        return n
    except ValueError:
        return None


def parse_csv(text):
    """CSVテキストをパースして (rows, errors) を返す。"""
    errors = []
    reader = csv.DictReader(io.StringIO(text))

    if reader.fieldnames is None:
        return [], ["有効なデータ行が見つかりませんでした。"]

    rows = []
    for idx, raw in enumerate(reader):
        obj = {}
        for k, v in raw.items():
            if k is None:
                continue
            norm = _normalize_header(k)
            if norm:
                obj[norm] = v or ""

        line_no = idx + 2  # ヘッダー行込みの行番号

        time_unit = _parse_time_unit(obj.get("time_unit", "")) if obj.get("time_unit") else None
        time_value = _to_number(obj.get("time_value", ""))

        if not obj.get("course_name") and not obj.get("client_name"):
            errors.append(f"行{line_no}: 講座名・クライアント名が両方空のためスキップ")
            continue
        if not time_unit:
            errors.append(f"行{line_no}: 時間単位(月/日/年)が不正のため時間=0で扱います")

        row = {
            "response_id": (obj.get("response_id") or "").strip() or str(idx + 1),
            "course_name": (obj.get("course_name") or "").strip() or "(未設定)",
            "client_name": (obj.get("client_name") or "").strip() or "(未設定)",
            "respondent_dept": (obj.get("respondent_dept") or "").strip() or None,
            "answered_at": (obj.get("answered_at") or "").strip(),
            "time_unit": time_unit or "年",
            "time_value": time_value if time_value is not None else 0,
            "usage_type": _parse_usage_type(obj["usage_type"]) if obj.get("usage_type") else None,
            "would_apply": _parse_would_apply(obj["would_apply"]) if obj.get("would_apply") else None,
            "free_comment": (obj.get("free_comment") or "").strip() or None,
        }
        for field in NUMERIC_FIELDS:
            row[field] = _to_number(obj.get(field, ""))

        rows.append(row)

    if not rows:
        errors.append("有効なデータ行が見つかりませんでした。")

    return rows, errors
