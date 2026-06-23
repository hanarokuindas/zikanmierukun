import random

CLIENTS = ["株式会社ABC", "DEF商事", "GHIホールディングス"]
COURSES = [
    "Excel自動化基礎講座",
    "生成AI活用講座",
    "Pythonデータ分析入門",
    "業務効率化のためのRPA講座",
]
DEPTS = ["営業部", "経理部", "総務部", "開発部", "企画部"]
UNITS = ["月", "日", "年"]
USAGES = ["業務", "プライベート"]
COMMENTS = [
    "資料作成が大幅に早くなった",
    "関数を覚えて毎日の集計が楽になった",
    "AIで議事録作成が効率化できた",
    "繰り返し作業を自動化できた",
    "データ分析のスピードが上がった",
    "もっと早く受けたかった",
    "実務にすぐ活かせる内容だった",
]


def generate_sample_data(count=120):
    rows = []
    for i in range(count):
        unit = random.choice(UNITS)
        month = random.randint(1, 12)
        if unit == "日":
            time_value = random.randint(1, 3)
        elif unit == "月":
            time_value = random.randint(2, 20)
        else:
            time_value = random.randint(20, 200)

        rows.append(
            {
                "response_id": f"S{i + 1}",
                "course_name": random.choice(COURSES),
                "client_name": random.choice(CLIENTS),
                "respondent_dept": random.choice(DEPTS),
                "answered_at": f"2026-{month:02d}-15",
                "time_unit": unit,
                "time_value": time_value,
                "usage_type": random.choice(USAGES),
                "satisfaction_score": random.randint(3, 5),
                "comprehension_score": random.randint(2, 5),
                "nps_score": random.randint(5, 10),
                "instructor_score": random.randint(3, 5),
                "difficulty_level": random.randint(1, 4),
                "would_apply": random.choice(["はい", "はい", "わからない"]),
                "free_comment": random.choice(COMMENTS) if random.random() > 0.3 else None,
            }
        )
    return rows
