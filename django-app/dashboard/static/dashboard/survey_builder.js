/**
 * 時間見えるくん: アンケート設計・自動生成 UI ロジック
 * 生成ロジックは nextjs-app/lib/surveyTemplate.ts と同一仕様を維持する。
 */

const METRICS = [
  {
    id: "time_saving",
    label: "節約・効率化できた時間",
    description: "このアプリの中心指標。時間・単位・用途の3問で構成されます。",
    questions: [
      { title: "節約時間", help: "この講座で習得したスキルにより、削減・効率化できた時間を数値で入力してください（例: 5）", type: "number", required: true },
      { title: "時間単位", help: "上記の時間は「月あたり・日あたり・年あたり」のどれですか？", type: "choice", options: ["月", "日", "年"], required: true },
      { title: "用途", help: "その時間短縮は主にどの用途ですか？", type: "choice", options: ["業務", "プライベート"], required: true },
    ],
  },
  { id: "satisfaction", label: "満足度", description: "講座全体の満足度（5段階）",
    questions: [{ title: "満足度", help: "講座全体の満足度を教えてください", type: "scale", low: 1, high: 5, lowLabel: "非常に不満", highLabel: "非常に満足" }] },
  { id: "comprehension", label: "理解度", description: "内容の理解度（5段階）",
    questions: [{ title: "理解度", help: "講座内容をどの程度理解できましたか？", type: "scale", low: 1, high: 5, lowLabel: "ほとんど理解できなかった", highLabel: "十分に理解できた" }] },
  { id: "nps", label: "推奨度（NPS）", description: "同僚・知人への推奨度（0〜10）",
    questions: [{ title: "推奨度", help: "この講座を同僚や知人にどの程度すすめたいですか？", type: "scale", low: 0, high: 10, lowLabel: "全くすすめない", highLabel: "強くすすめる" }] },
  { id: "instructor", label: "講師評価", description: "講師の分かりやすさ（5段階）",
    questions: [{ title: "講師評価", help: "講師の説明の分かりやすさはいかがでしたか？", type: "scale", low: 1, high: 5, lowLabel: "非常に不満", highLabel: "非常に満足" }] },
  { id: "difficulty", label: "難易度", description: "講座の難易度（5段階）",
    questions: [{ title: "難易度", help: "講座の難易度はいかがでしたか？", type: "scale", low: 1, high: 5, lowLabel: "とても易しい", highLabel: "とても難しい" }] },
  { id: "would_apply", label: "実践予定", description: "学んだ内容を実務で実践する予定があるか",
    questions: [{ title: "実践予定", help: "学んだ内容を実務で実践する予定はありますか？", type: "choice", options: ["はい", "いいえ", "わからない"] }] },
  { id: "free_comment", label: "自由記述", description: "感想・要望の自由記述",
    questions: [{ title: "自由記述", help: "講座の感想・改善要望などをご自由にお書きください", type: "paragraph" }] },
];

function getConfig() {
  const selectedIds = Array.from(
    document.querySelectorAll(".metric-check:checked")
  ).map((el) => el.dataset.id);
  return {
    formTitle: document.getElementById("formTitle").value || "講座アンケート",
    courseName: document.getElementById("courseName").value,
    clientName: document.getElementById("clientName").value,
    askDept: document.getElementById("askDept").checked,
    selectedMetricIds: selectedIds,
  };
}

function buildQuestions(config) {
  // 講座名・クライアント名は回答者に入力させない（案A）。
  // 1フォーム＝1講座＝1クライアントのため、表記ゆれ防止に取り込み時一括指定する。
  const qs = [];
  if (config.askDept) qs.push({ title: "部署", help: "所属部署を入力してください（任意）", type: "text" });
  for (const id of config.selectedMetricIds) {
    const m = METRICS.find((x) => x.id === id);
    if (m) qs.push(...m.questions);
  }
  return qs;
}

function gsStr(s) {
  return "'" + s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n") + "'";
}

function generateAppsScript(config) {
  const questions = buildQuestions(config);
  const lines = [
    "/**",
    " * 時間見えるくん: アンケート自動生成スクリプト",
    " * 使い方:",
    " *  1. https://script.google.com/ で新規プロジェクトを作成",
    " *  2. このコードを貼り付けて保存",
    " *  3. 関数 createForm を実行（初回は権限を承認）",
    " *  4. 実行ログに表示される編集URL/回答URLからフォームを利用",
    " */",
    "function createForm() {",
    `  var form = FormApp.create(${gsStr(config.formTitle)});`,
    `  form.setDescription(${gsStr(`講座: ${config.courseName || "(未設定)"} / クライアント: ${config.clientName || "(未設定)"}\nご回答ありがとうございます。所要時間は約2〜3分です。`)});`,
    "  form.setCollectEmail(false);",
    "",
  ];
  for (const q of questions) {
    switch (q.type) {
      case "scale":
        lines.push("  form.addScaleItem()");
        lines.push(`    .setTitle(${gsStr(q.title)})`);
        if (q.help) lines.push(`    .setHelpText(${gsStr(q.help)})`);
        lines.push(`    .setBounds(${q.low}, ${q.high})`);
        if (q.lowLabel || q.highLabel) lines.push(`    .setLabels(${gsStr(q.lowLabel || "")}, ${gsStr(q.highLabel || "")})`);
        lines.push(`    .setRequired(${q.required ? "true" : "false"});`);
        break;
      case "choice":
        lines.push("  form.addMultipleChoiceItem()");
        lines.push(`    .setTitle(${gsStr(q.title)})`);
        if (q.help) lines.push(`    .setHelpText(${gsStr(q.help)})`);
        lines.push(`    .setChoiceValues([${(q.options || []).map(gsStr).join(", ")}])`);
        lines.push(`    .setRequired(${q.required ? "true" : "false"});`);
        break;
      case "paragraph":
        lines.push("  form.addParagraphTextItem()");
        lines.push(`    .setTitle(${gsStr(q.title)})`);
        if (q.help) lines.push(`    .setHelpText(${gsStr(q.help)})`);
        lines.push(`    .setRequired(${q.required ? "true" : "false"});`);
        break;
      default:
        lines.push("  form.addTextItem()");
        lines.push(`    .setTitle(${gsStr(q.title)})`);
        if (q.help) lines.push(`    .setHelpText(${gsStr(q.help)})`);
        lines.push(`    .setRequired(${q.required ? "true" : "false"});`);
    }
    lines.push("");
  }
  lines.push("  Logger.log('フォーム編集URL: ' + form.getEditUrl());");
  lines.push("  Logger.log('フォーム回答URL: ' + form.getPublishedUrl());");
  lines.push("}");
  return lines.join("\n");
}

function generateCsvTemplate(config) {
  const questions = buildQuestions(config);
  const headers = ["回答日", ...questions.map((q) => q.title)];
  const examples = {
    回答日: "2026-06-01", 講座名: config.courseName || "Excel自動化基礎講座",
    クライアント名: config.clientName || "株式会社ABC", 部署: "営業部",
    節約時間: "5", 時間単位: "月", 用途: "業務",
    満足度: "5", 理解度: "4", 推奨度: "9",
    講師評価: "5", 難易度: "2", 実践予定: "はい", 自由記述: "作業が早くなった",
  };
  const esc = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [headers.map(esc).join(","), headers.map((h) => esc(examples[h] || "")).join(",")].join("\n");
}

function generateMarkdown(config) {
  const questions = buildQuestions(config);
  const lines = [
    `# ${config.formTitle}`, "",
    `- 講座: ${config.courseName || "(未設定)"}`,
    `- クライアント: ${config.clientName || "(未設定)"}`, "",
  ];
  questions.forEach((q, i) => {
    lines.push(`### Q${i + 1}. ${q.title}${q.required ? "（必須）" : ""}`);
    if (q.help) lines.push(q.help);
    if (q.type === "scale") lines.push(`回答: ${q.low}〜${q.high} の段階（${q.lowLabel} 〜 ${q.highLabel}）`);
    else if (q.type === "choice") lines.push(`選択肢: ${(q.options || []).join(" / ")}`);
    else if (q.type === "number") lines.push("回答: 数値");
    else if (q.type === "paragraph") lines.push("回答: 自由記述（長文）");
    else lines.push("回答: 記述");
    lines.push("");
  });
  return lines.join("\n");
}

function download(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function updatePreview() {
  const config = getConfig();
  const questions = buildQuestions(config);
  const list = document.getElementById("preview-list");
  if (!list) return;
  list.innerHTML = "";
  document.getElementById("preview-count").textContent = questions.length + "問";
  questions.forEach((q, i) => {
    const li = document.createElement("li");
    let detail = "";
    if (q.type === "scale") detail = `${q.low}〜${q.high}（${q.lowLabel} 〜 ${q.highLabel}）`;
    else if (q.type === "choice") detail = `選択肢: ${(q.options || []).join(" / ")}`;
    else if (q.type === "number") detail = "数値入力";
    else if (q.type === "paragraph") detail = "自由記述（長文）";
    else detail = "テキスト入力";
    li.innerHTML = `<strong>${q.title}</strong>${q.required ? ' <span class="req">必須</span>' : ""}<div class="muted">${q.help || ""}</div><div class="muted">${detail}</div>`;
    list.appendChild(li);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".metric-check, #formTitle, #courseName, #clientName, #askDept")
    .forEach((el) => el.addEventListener("input", updatePreview));
  updatePreview();

  document.getElementById("btn-gs-download")?.addEventListener("click", () => {
    download("create_form.gs", generateAppsScript(getConfig()), "text/plain");
  });
  document.getElementById("btn-gs-copy")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(generateAppsScript(getConfig()));
      alert("Apps Scriptコードをコピーしました。\nGoogleフォームのスクリプトエディタに貼り付けてください。");
    } catch { alert("コピーに失敗しました。ダウンロードをご利用ください。"); }
  });
  document.getElementById("btn-csv")?.addEventListener("click", () => {
    download("survey_template.csv", generateCsvTemplate(getConfig()), "text/csv");
  });
  document.getElementById("btn-md")?.addEventListener("click", () => {
    download("survey_questions.md", generateMarkdown(getConfig()), "text/markdown");
  });
});
