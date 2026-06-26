import Papa from "papaparse";
import { SurveyResponse, TimeUnit, UsageType, WouldApply } from "./types";

export interface ParseResult {
  rows: SurveyResponse[];
  errors: string[];
}

// 列名の表記ゆれを吸収するためのエイリアス
const HEADER_ALIASES: Record<string, keyof SurveyResponse> = {
  response_id: "response_id",
  回答id: "response_id",
  回答ID: "response_id",
  course_name: "course_name",
  講座名: "course_name",
  コース名: "course_name",
  client_name: "client_name",
  クライアント名: "client_name",
  企業名: "client_name",
  respondent_dept: "respondent_dept",
  部署: "respondent_dept",
  answered_at: "answered_at",
  回答日: "answered_at",
  タイムスタンプ: "answered_at",
  timestamp: "answered_at",
  time_unit: "time_unit",
  時間単位: "time_unit",
  単位: "time_unit",
  time_value: "time_value",
  時間: "time_value",
  節約時間: "time_value",
  usage_type: "usage_type",
  用途: "usage_type",
  satisfaction_score: "satisfaction_score",
  満足度: "satisfaction_score",
  comprehension_score: "comprehension_score",
  理解度: "comprehension_score",
  nps_score: "nps_score",
  推奨度: "nps_score",
  nps: "nps_score",
  instructor_score: "instructor_score",
  講師評価: "instructor_score",
  difficulty_level: "difficulty_level",
  難易度: "difficulty_level",
  would_apply: "would_apply",
  実践予定: "would_apply",
  free_comment: "free_comment",
  自由記述: "free_comment",
  コメント: "free_comment",
};

function normalizeHeader(h: string): keyof SurveyResponse | null {
  const key = h.trim();
  return HEADER_ALIASES[key] ?? HEADER_ALIASES[key.toLowerCase()] ?? null;
}

function parseTimeUnit(v: string): TimeUnit | null {
  const s = v.trim();
  if (s.includes("月")) return "月";
  if (s.includes("日")) return "日";
  if (s.includes("年")) return "年";
  return null;
}

function parseUsageType(v: string): UsageType | undefined {
  const s = v.trim();
  if (s.includes("プライベート") || s.toLowerCase() === "private") return "プライベート";
  if (s.includes("業務") || s.toLowerCase() === "work") return "業務";
  return undefined;
}

function parseWouldApply(v: string): WouldApply | undefined {
  const s = v.trim();
  if (s.includes("はい") || s.toLowerCase() === "yes") return "はい";
  if (s.includes("いいえ") || s.toLowerCase() === "no") return "いいえ";
  if (s.includes("わからない")) return "わからない";
  return undefined;
}

// 回答日の表記ゆれを吸収。Googleフォームの「2026/06/01 13:45:00」を
// 「2026-06-01」に正規化する（トレンド集計のキーを揃えるため）。
function normalizeDate(v: string): string {
  const s = v.trim();
  if (!s) return "";
  const m = s.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (m) {
    const [, y, mo, d] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return s;
}

function num(v: string): number | undefined {
  if (v == null || v.trim() === "") return undefined;
  const n = Number(v.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

export function parseCsv(text: string): ParseResult {
  const errors: string[] = [];
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length) {
    for (const e of parsed.errors.slice(0, 5)) {
      errors.push(`行${(e.row ?? 0) + 1}: ${e.message}`);
    }
  }

  const rows: SurveyResponse[] = [];
  const rawRows = parsed.data || [];

  rawRows.forEach((raw, idx) => {
    // ヘッダーを正規化したオブジェクトに変換
    const obj: Partial<Record<keyof SurveyResponse, string>> = {};
    for (const [k, v] of Object.entries(raw)) {
      const norm = normalizeHeader(k);
      if (norm) obj[norm] = v;
    }

    const lineNo = idx + 2; // ヘッダー行込みの行番号

    const time_unit = obj.time_unit ? parseTimeUnit(obj.time_unit) : null;
    const time_value = num(obj.time_value ?? "");

    if (!obj.course_name && !obj.client_name) {
      errors.push(`行${lineNo}: 講座名・クライアント名が両方空のためスキップ`);
      return;
    }
    if (!time_unit) {
      errors.push(`行${lineNo}: 時間単位(月/日/年)が不正のため時間=0で扱います`);
    }

    rows.push({
      response_id: obj.response_id?.trim() || String(idx + 1),
      course_name: obj.course_name?.trim() || "(未設定)",
      client_name: obj.client_name?.trim() || "(未設定)",
      respondent_dept: obj.respondent_dept?.trim() || undefined,
      answered_at: normalizeDate(obj.answered_at ?? ""),
      time_unit: (time_unit ?? "年") as TimeUnit,
      time_value: time_value ?? 0,
      usage_type: obj.usage_type ? parseUsageType(obj.usage_type) : undefined,
      satisfaction_score: num(obj.satisfaction_score ?? ""),
      comprehension_score: num(obj.comprehension_score ?? ""),
      nps_score: num(obj.nps_score ?? ""),
      instructor_score: num(obj.instructor_score ?? ""),
      difficulty_level: num(obj.difficulty_level ?? ""),
      would_apply: obj.would_apply ? parseWouldApply(obj.would_apply) : undefined,
      free_comment: obj.free_comment?.trim() || undefined,
    });
  });

  if (!rows.length) errors.push("有効なデータ行が見つかりませんでした。");

  return { rows, errors };
}
