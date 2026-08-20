"use client";

import { useMemo, useState } from "react";
import {
  METRICS,
  SurveyConfig,
  buildQuestions,
  generateAppsScript,
  generateCsvTemplate,
  generateMarkdown,
} from "@/lib/surveyTemplate";

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function SurveyBuilder() {
  const [config, setConfig] = useState<SurveyConfig>({
    formTitle: "講座アンケート",
    courseName: "",
    clientName: "",
    askDept: true,
    selectedMetricIds: METRICS.map((m) => m.id),
  });

  const questions = useMemo(() => buildQuestions(config), [config]);

  function toggleMetric(id: string) {
    setConfig((c) => ({
      ...c,
      selectedMetricIds: c.selectedMetricIds.includes(id)
        ? c.selectedMetricIds.filter((x) => x !== id)
        : [...c.selectedMetricIds, id],
    }));
  }

  async function copyAppsScript() {
    try {
      await navigator.clipboard.writeText(generateAppsScript(config));
      alert("Apps Scriptコードをコピーしました。Googleフォームのスクリプトエディタに貼り付けてください。");
    } catch {
      alert("コピーに失敗しました。ダウンロードをご利用ください。");
    }
  }

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <h2 style={{ marginTop: 0 }}>アンケート設計・自動生成</h2>
      <p className="muted">
        計測したい指標を選ぶだけで、集計とそのまま整合するアンケートを生成します。
        質問のタイトルが集計の列名と一致するため、Googleフォームの回答CSVを加工なしで取り込めます。
      </p>

      <div className="builder-grid">
        <div>
          <h3>1. 基本情報</h3>
          <label className="builder-field">
            フォームタイトル
            <input
              type="text"
              value={config.formTitle}
              onChange={(e) => setConfig((c) => ({ ...c, formTitle: e.target.value }))}
            />
          </label>
          <label className="builder-field">
            講座名（フォームの説明用・回答者には質問しません）
            <input
              type="text"
              placeholder="例: Excel自動化基礎講座"
              value={config.courseName}
              onChange={(e) => setConfig((c) => ({ ...c, courseName: e.target.value }))}
            />
          </label>
          <label className="builder-field">
            クライアント名（フォームの説明用・回答者には質問しません）
            <input
              type="text"
              placeholder="例: 株式会社ABC"
              value={config.clientName}
              onChange={(e) => setConfig((c) => ({ ...c, clientName: e.target.value }))}
            />
          </label>
          <p className="muted" style={{ fontSize: 12, margin: "0 0 4px" }}>
            💡 講座名・クライアント名は回答者に入力させず、CSV取り込み時にまとめて指定します
            （表記ゆれ防止のため）。ここでの入力はフォームの説明文とCSVテンプレートの記入例に使われます。
          </p>
          <label className="builder-checkbox">
            <input
              type="checkbox"
              checked={config.askDept}
              onChange={(e) => setConfig((c) => ({ ...c, askDept: e.target.checked }))}
            />
            部署を質問する
          </label>

          <h3 style={{ marginTop: 20 }}>2. 計測する指標</h3>
          {METRICS.map((m) => (
            <label key={m.id} className="builder-metric">
              <input
                type="checkbox"
                checked={config.selectedMetricIds.includes(m.id)}
                onChange={() => toggleMetric(m.id)}
              />
              <span>
                <strong>{m.label}</strong>
                <span className="muted" style={{ display: "block", fontSize: 12 }}>
                  {m.description}
                </span>
              </span>
            </label>
          ))}

          <h3 style={{ marginTop: 20 }}>3. 出力</h3>
          <div className="builder-exports">
            <button
              className="btn btn-primary"
              onClick={() =>
                download("create_form.gs", generateAppsScript(config), "text/plain")
              }
            >
              Googleフォーム生成スクリプト(.gs)
            </button>
            <button className="btn" onClick={copyAppsScript}>
              スクリプトをコピー
            </button>
            <button
              className="btn"
              onClick={() =>
                download("survey_template.csv", generateCsvTemplate(config), "text/csv")
              }
            >
              CSVテンプレート
            </button>
            <button
              className="btn"
              onClick={() =>
                download("survey_questions.md", generateMarkdown(config), "text/markdown")
              }
            >
              質問票(Markdown)
            </button>
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
            .gsの使い方: <a href="https://script.google.com/" target="_blank" rel="noreferrer">script.google.com</a> で新規プロジェクトを作り、コードを貼り付けて関数 <code>createForm</code> を実行するとフォームが自動生成されます。
          </p>
        </div>

        <div>
          <h3>プレビュー（{questions.length}問）</h3>
          <ol className="builder-preview">
            {questions.map((q, i) => (
              <li key={i}>
                <strong>{q.title}</strong>
                {q.required && <span className="req">必須</span>}
                {q.help && <div className="muted">{q.help}</div>}
                {q.type === "scale" && (
                  <div className="muted">
                    {q.low}〜{q.high}（{q.lowLabel} 〜 {q.highLabel}）
                  </div>
                )}
                {q.type === "choice" && (
                  <div className="muted">選択肢: {(q.options || []).join(" / ")}</div>
                )}
                {q.type === "number" && <div className="muted">数値入力</div>}
                {q.type === "paragraph" && <div className="muted">自由記述（長文）</div>}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
