import { SurveyResponse, WorkdayMode, DashboardFilters } from "./types";

// 時間値を「年間時間」に換算する。
// - 月あたり → ×12
// - 年あたり → ×1
// - 日あたり → 用途に応じて係数を切り替え。
//     業務利用    : 勤務日数（workdayMode: 260 or 365）
//     プライベート: 365日
// workdayMode はダッシュボード上のトグルで切り替えられる「日あたり業務利用」の換算係数。
export function toAnnualHours(r: SurveyResponse, workdayMode: WorkdayMode): number {
  const v = r.time_value;
  if (!Number.isFinite(v)) return 0;
  switch (r.time_unit) {
    case "年":
      return v;
    case "月":
      return v * 12;
    case "日": {
      // プライベート利用は常に365日換算、業務利用はトグルに従う
      if (r.usage_type === "プライベート") return v * 365;
      return v * workdayMode;
    }
    default:
      return 0;
  }
}

export function applyFilters(
  rows: SurveyResponse[],
  filters: DashboardFilters
): SurveyResponse[] {
  return rows.filter((r) => {
    if (filters.clients.length && !filters.clients.includes(r.client_name)) return false;
    if (filters.courses.length && !filters.courses.includes(r.course_name)) return false;
    if (
      filters.usageTypes.length &&
      (!r.usage_type || !filters.usageTypes.includes(r.usage_type))
    )
      return false;
    return true;
  });
}

export interface KpiSummary {
  totalAnnualHours: number;
  avgAnnualHoursPerPerson: number;
  responseCount: number;
  avgSatisfaction: number | null;
  avgComprehension: number | null;
  nps: number | null; // -100 〜 100
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// NPS = 推奨者割合(9-10) - 批判者割合(0-6)、%表記
export function calcNps(scores: number[]): number | null {
  if (!scores.length) return null;
  const promoters = scores.filter((s) => s >= 9).length;
  const detractors = scores.filter((s) => s <= 6).length;
  return ((promoters - detractors) / scores.length) * 100;
}

export function computeKpis(
  rows: SurveyResponse[],
  workdayMode: WorkdayMode
): KpiSummary {
  const total = rows.reduce((sum, r) => sum + toAnnualHours(r, workdayMode), 0);
  const count = rows.length;
  const satisfaction = avg(
    rows.map((r) => r.satisfaction_score).filter((n): n is number => n != null)
  );
  const comprehension = avg(
    rows.map((r) => r.comprehension_score).filter((n): n is number => n != null)
  );
  const nps = calcNps(
    rows.map((r) => r.nps_score).filter((n): n is number => n != null)
  );
  return {
    totalAnnualHours: total,
    avgAnnualHoursPerPerson: count ? total / count : 0,
    responseCount: count,
    avgSatisfaction: satisfaction,
    avgComprehension: comprehension,
    nps,
  };
}

// グループ別集計（講座別・クライアント別など）
export interface GroupAgg {
  key: string;
  totalAnnualHours: number;
  count: number;
  avgAnnualHours: number;
  avgSatisfaction: number | null;
}

export function groupBy(
  rows: SurveyResponse[],
  field: "course_name" | "client_name",
  workdayMode: WorkdayMode
): GroupAgg[] {
  const map = new Map<string, SurveyResponse[]>();
  for (const r of rows) {
    const k = r[field] || "(未設定)";
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(r);
  }
  const result: GroupAgg[] = [];
  for (const [key, group] of map) {
    const total = group.reduce((s, r) => s + toAnnualHours(r, workdayMode), 0);
    const sat = avg(
      group.map((r) => r.satisfaction_score).filter((n): n is number => n != null)
    );
    result.push({
      key,
      totalAnnualHours: total,
      count: group.length,
      avgAnnualHours: group.length ? total / group.length : 0,
      avgSatisfaction: sat,
    });
  }
  return result.sort((a, b) => b.totalAnnualHours - a.totalAnnualHours);
}

// 月別の時系列集計（answered_at の YYYY-MM 単位）
export interface TrendPoint {
  month: string; // YYYY-MM
  totalAnnualHours: number;
  count: number;
}

export function trendByMonth(
  rows: SurveyResponse[],
  workdayMode: WorkdayMode
): TrendPoint[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const r of rows) {
    const month = (r.answered_at || "").slice(0, 7);
    if (!month) continue;
    if (!map.has(month)) map.set(month, { total: 0, count: 0 });
    const e = map.get(month)!;
    e.total += toAnnualHours(r, workdayMode);
    e.count += 1;
  }
  return Array.from(map.entries())
    .map(([month, v]) => ({ month, totalAnnualHours: v.total, count: v.count }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

// 評価スコアの分布（1-5 や 0-10）
export function scoreDistribution(
  rows: SurveyResponse[],
  field: "satisfaction_score" | "comprehension_score" | "instructor_score" | "difficulty_level",
  max: number
): { score: number; count: number }[] {
  const counts = new Array(max + 1).fill(0);
  for (const r of rows) {
    const v = r[field];
    if (v != null && v >= 0 && v <= max) counts[v] += 1;
  }
  const result: { score: number; count: number }[] = [];
  for (let i = 1; i <= max; i++) result.push({ score: i, count: counts[i] });
  return result;
}

// 自由記述の頻出キーワード（簡易：2文字以上の連続文字を素朴に集計）
const STOPWORDS = new Set([
  "そして", "また", "ました", "です", "ます", "という", "こと", "これ", "それ",
  "ので", "から", "など", "して", "した", "ある", "いる", "なる", "思い", "とても",
]);

export function keywordFrequency(
  rows: SurveyResponse[],
  topN = 20
): { word: string; count: number }[] {
  const freq = new Map<string, number>();
  for (const r of rows) {
    const text = r.free_comment || "";
    // 日本語・英数字の連続を抽出（記号区切り）
    const tokens = text.match(/[一-龠ぁ-んァ-ヶa-zA-Z0-9]{2,}/g) || [];
    for (const t of tokens) {
      if (STOPWORDS.has(t)) continue;
      freq.set(t, (freq.get(t) || 0) + 1);
    }
  }
  return Array.from(freq.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}
