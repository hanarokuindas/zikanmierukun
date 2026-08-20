// アンケート設計＆自動生成のための共通ロジック。
// 重要な設計方針:
//   生成する質問の「タイトル」を、集計側(parseCsv)が認識する正規の日本語列名
//   （講座名 / 満足度 / 節約時間 など）と一致させる。
//   こうすることで Googleフォームの回答CSV（列名＝質問タイトル）を、
//   加工なしでそのままダッシュボードに取り込める。

export type QuestionType = "number" | "choice" | "scale" | "text" | "paragraph";

export interface QuestionDef {
  // CSV列名・フォーム質問タイトルになる正規名（parseCsvのエイリアスと一致させる）
  title: string;
  help?: string;
  type: QuestionType;
  options?: string[]; // choice用
  low?: number; // scale下限
  high?: number; // scale上限
  lowLabel?: string;
  highLabel?: string;
  required?: boolean;
}

export interface MetricDef {
  id: string;
  label: string;
  description: string;
  questions: QuestionDef[];
}

// 計測指標 → 質問テンプレート（日本語の質問文・選択肢を自動生成する元データ）
export const METRICS: MetricDef[] = [
  {
    id: "time_saving",
    label: "節約・効率化できた時間",
    description: "このアプリの中心指標。時間・単位・用途の3問で構成されます。",
    questions: [
      {
        title: "節約時間",
        help: "この講座で習得したスキルにより、削減・効率化できた時間を数値で入力してください（例: 5）",
        type: "number",
        required: true,
      },
      {
        title: "時間単位",
        help: "上記の時間は「月あたり・日あたり・年あたり」のどれですか？",
        type: "choice",
        options: ["月", "日", "年"],
        required: true,
      },
      {
        title: "用途",
        help: "その時間短縮は主にどの用途ですか？",
        type: "choice",
        options: ["業務", "プライベート"],
        required: true,
      },
    ],
  },
  {
    id: "satisfaction",
    label: "満足度",
    description: "講座全体の満足度（5段階）",
    questions: [
      {
        title: "満足度",
        help: "講座全体の満足度を教えてください",
        type: "scale",
        low: 1,
        high: 5,
        lowLabel: "非常に不満",
        highLabel: "非常に満足",
      },
    ],
  },
  {
    id: "comprehension",
    label: "理解度",
    description: "内容の理解度（5段階）",
    questions: [
      {
        title: "理解度",
        help: "講座内容をどの程度理解できましたか？",
        type: "scale",
        low: 1,
        high: 5,
        lowLabel: "ほとんど理解できなかった",
        highLabel: "十分に理解できた",
      },
    ],
  },
  {
    id: "nps",
    label: "推奨度（NPS）",
    description: "同僚・知人への推奨度（0〜10）",
    questions: [
      {
        title: "推奨度",
        help: "この講座を同僚や知人にどの程度すすめたいですか？",
        type: "scale",
        low: 0,
        high: 10,
        lowLabel: "全くすすめない",
        highLabel: "強くすすめる",
      },
    ],
  },
  {
    id: "instructor",
    label: "講師評価",
    description: "講師の分かりやすさ（5段階）",
    questions: [
      {
        title: "講師評価",
        help: "講師の説明の分かりやすさはいかがでしたか？",
        type: "scale",
        low: 1,
        high: 5,
        lowLabel: "非常に不満",
        highLabel: "非常に満足",
      },
    ],
  },
  {
    id: "difficulty",
    label: "難易度",
    description: "講座の難易度（5段階）",
    questions: [
      {
        title: "難易度",
        help: "講座の難易度はいかがでしたか？",
        type: "scale",
        low: 1,
        high: 5,
        lowLabel: "とても易しい",
        highLabel: "とても難しい",
      },
    ],
  },
  {
    id: "would_apply",
    label: "実践予定",
    description: "学んだ内容を実務で実践する予定があるか",
    questions: [
      {
        title: "実践予定",
        help: "学んだ内容を実務で実践する予定はありますか？",
        type: "choice",
        options: ["はい", "いいえ", "わからない"],
      },
    ],
  },
  {
    id: "free_comment",
    label: "自由記述",
    description: "感想・要望の自由記述",
    questions: [
      {
        title: "自由記述",
        help: "講座の感想・改善要望などをご自由にお書きください",
        type: "paragraph",
      },
    ],
  },
];

export interface SurveyConfig {
  formTitle: string;
  courseName: string;
  clientName: string;
  askDept: boolean; // 部署を質問するか
  selectedMetricIds: string[];
}

// 設定 → 実際の質問リストを組み立てる（属性質問 + 選択された指標の質問）
//
// 設計方針: 講座名・クライアント名は「回答者に入力させない」。
//   1フォーム＝1講座＝1クライアントが通常のため、回答者に毎回入力させると
//   表記ゆれ（タイプミス）で集計が壊れる。これらは主催者が把握している値なので、
//   アプリのCSV取り込み時に一括指定する（下記 assignMeta を参照）。
//   ここでは回答者向けの質問（部署 + 選択された指標）だけを組み立てる。
export function buildQuestions(config: SurveyConfig): QuestionDef[] {
  const questions: QuestionDef[] = [];

  if (config.askDept) {
    questions.push({
      title: "部署",
      help: "所属部署を入力してください（任意）",
      type: "text",
    });
  }

  for (const id of config.selectedMetricIds) {
    const metric = METRICS.find((m) => m.id === id);
    if (metric) questions.push(...metric.questions);
  }

  return questions;
}

// --- エクスポート1: Googleフォーム自動生成 Apps Script (.gs) ---
function gsString(s: string): string {
  return "'" + s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n") + "'";
}

export function generateAppsScript(config: SurveyConfig): string {
  const questions = buildQuestions(config);
  const lines: string[] = [];
  lines.push("/**");
  lines.push(" * 時間見えるくん: アンケート自動生成スクリプト");
  lines.push(" * 使い方:");
  lines.push(" *  1. https://script.google.com/ で新規プロジェクトを作成");
  lines.push(" *  2. このコードを貼り付けて保存");
  lines.push(" *  3. 関数 createForm を実行（初回は権限を承認）");
  lines.push(" *  4. 実行ログに表示される編集URL/回答URLからフォームを利用");
  lines.push(" */");
  lines.push("function createForm() {");
  lines.push(`  var form = FormApp.create(${gsString(config.formTitle || "講座アンケート")});`);
  const desc =
    `講座: ${config.courseName || "(未設定)"} / クライアント: ${config.clientName || "(未設定)"}\n` +
    "ご回答ありがとうございます。所要時間は約2〜3分です。";
  lines.push(`  form.setDescription(${gsString(desc)});`);
  lines.push("  form.setCollectEmail(false);");
  lines.push("");

  for (const q of questions) {
    switch (q.type) {
      case "scale":
        lines.push("  form.addScaleItem()");
        lines.push(`    .setTitle(${gsString(q.title)})`);
        if (q.help) lines.push(`    .setHelpText(${gsString(q.help)})`);
        lines.push(`    .setBounds(${q.low ?? 1}, ${q.high ?? 5})`);
        if (q.lowLabel || q.highLabel)
          lines.push(`    .setLabels(${gsString(q.lowLabel || "")}, ${gsString(q.highLabel || "")})`);
        lines.push(`    .setRequired(${q.required ? "true" : "false"});`);
        break;
      case "choice":
        lines.push("  form.addMultipleChoiceItem()");
        lines.push(`    .setTitle(${gsString(q.title)})`);
        if (q.help) lines.push(`    .setHelpText(${gsString(q.help)})`);
        lines.push(`    .setChoiceValues([${(q.options || []).map(gsString).join(", ")}])`);
        lines.push(`    .setRequired(${q.required ? "true" : "false"});`);
        break;
      case "paragraph":
        lines.push("  form.addParagraphTextItem()");
        lines.push(`    .setTitle(${gsString(q.title)})`);
        if (q.help) lines.push(`    .setHelpText(${gsString(q.help)})`);
        lines.push(`    .setRequired(${q.required ? "true" : "false"});`);
        break;
      case "number":
      case "text":
      default:
        lines.push("  form.addTextItem()");
        lines.push(`    .setTitle(${gsString(q.title)})`);
        if (q.help) lines.push(`    .setHelpText(${gsString(q.help)})`);
        lines.push(`    .setRequired(${q.required ? "true" : "false"});`);
        break;
    }
    lines.push("");
  }

  lines.push("  Logger.log('フォーム編集URL: ' + form.getEditUrl());");
  lines.push("  Logger.log('フォーム回答URL: ' + form.getPublishedUrl());");
  lines.push("}");
  return lines.join("\n");
}

// --- エクスポート2: 空CSVテンプレート ---
export function generateCsvTemplate(config: SurveyConfig): string {
  const questions = buildQuestions(config);
  // 回答日(タイムスタンプ)はフォームが自動付与するが、手入力用に列として用意
  const headers = ["回答日", ...questions.map((q) => q.title)];

  const exampleByTitle: Record<string, string> = {
    回答日: "2026-06-01",
    講座名: config.courseName || "Excel自動化基礎講座",
    クライアント名: config.clientName || "株式会社ABC",
    部署: "営業部",
    節約時間: "5",
    時間単位: "月",
    用途: "業務",
    満足度: "5",
    理解度: "4",
    推奨度: "9",
    講師評価: "5",
    難易度: "2",
    実践予定: "はい",
    自由記述: "作業が早くなった",
  };
  const example = headers.map((h) => exampleByTitle[h] ?? "");

  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [headers.map(esc).join(","), example.map(esc).join(",")].join("\n");
}

// --- エクスポート3: 質問票（Markdown / 印刷・配布用） ---
export function generateMarkdown(config: SurveyConfig): string {
  const questions = buildQuestions(config);
  const lines: string[] = [];
  lines.push(`# ${config.formTitle || "講座アンケート"}`);
  lines.push("");
  lines.push(`- 講座: ${config.courseName || "(未設定)"}`);
  lines.push(`- クライアント: ${config.clientName || "(未設定)"}`);
  lines.push("");
  questions.forEach((q, i) => {
    lines.push(`### Q${i + 1}. ${q.title}${q.required ? "（必須）" : ""}`);
    if (q.help) lines.push(q.help);
    if (q.type === "scale") {
      lines.push(`回答: ${q.low}〜${q.high} の段階（${q.lowLabel} 〜 ${q.highLabel}）`);
    } else if (q.type === "choice") {
      lines.push(`選択肢: ${(q.options || []).join(" / ")}`);
    } else if (q.type === "number") {
      lines.push("回答: 数値");
    } else if (q.type === "paragraph") {
      lines.push("回答: 自由記述（長文）");
    } else {
      lines.push("回答: 記述");
    }
    lines.push("");
  });
  return lines.join("\n");
}
