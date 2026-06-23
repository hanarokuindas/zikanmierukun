import { SurveyResponse, TimeUnit, UsageType } from "./types";

// デモ用のサンプルデータを生成（CSVを持っていなくても画面を体験できるように）
const clients = ["株式会社ABC", "DEF商事", "GHIホールディングス"];
const courses = [
  "Excel自動化基礎講座",
  "生成AI活用講座",
  "Pythonデータ分析入門",
  "業務効率化のためのRPA講座",
];
const depts = ["営業部", "経理部", "総務部", "開発部", "企画部"];
const units: TimeUnit[] = ["月", "日", "年"];
const usages: UsageType[] = ["業務", "プライベート"];
const comments = [
  "資料作成が大幅に早くなった",
  "関数を覚えて毎日の集計が楽になった",
  "AIで議事録作成が効率化できた",
  "繰り返し作業を自動化できた",
  "データ分析のスピードが上がった",
  "もっと早く受けたかった",
  "実務にすぐ活かせる内容だった",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateSampleData(count = 120): SurveyResponse[] {
  const rows: SurveyResponse[] = [];
  for (let i = 0; i < count; i++) {
    const unit = pick(units);
    const month = randInt(1, 12);
    rows.push({
      response_id: `S${i + 1}`,
      course_name: pick(courses),
      client_name: pick(clients),
      respondent_dept: pick(depts),
      answered_at: `2026-${String(month).padStart(2, "0")}-15`,
      time_unit: unit,
      time_value:
        unit === "日" ? randInt(1, 3) : unit === "月" ? randInt(2, 20) : randInt(20, 200),
      usage_type: pick(usages),
      satisfaction_score: randInt(3, 5),
      comprehension_score: randInt(2, 5),
      nps_score: randInt(5, 10),
      instructor_score: randInt(3, 5),
      difficulty_level: randInt(1, 4),
      would_apply: pick(["はい", "はい", "わからない"] as const),
      free_comment: Math.random() > 0.3 ? pick(comments) : undefined,
    });
  }
  return rows;
}
