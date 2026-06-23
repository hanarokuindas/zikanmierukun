// アンケート回答1件分のデータ型
export type TimeUnit = "月" | "日" | "年";
export type UsageType = "業務" | "プライベート";
export type WouldApply = "はい" | "いいえ" | "わからない";

export interface SurveyResponse {
  response_id: string;
  course_name: string;
  client_name: string;
  respondent_dept?: string;
  answered_at: string; // YYYY-MM-DD
  time_unit: TimeUnit;
  time_value: number;
  usage_type?: UsageType;
  satisfaction_score?: number; // 1-5
  comprehension_score?: number; // 1-5
  nps_score?: number; // 0-10
  instructor_score?: number; // 1-5
  difficulty_level?: number; // 1-5
  would_apply?: WouldApply;
  free_comment?: string;
}

// 年間換算モード（プライベート利用を想定した365日か、勤務日260日か）
export type WorkdayMode = 365 | 260;

// フィルタ条件
export interface DashboardFilters {
  clients: string[]; // 空配列なら全件
  courses: string[];
  usageTypes: UsageType[];
}
