"use client";

import { useRef, useState } from "react";
import { SurveyMeta } from "@/lib/parseCsv";

interface Props {
  onCsv: (text: string, meta: SurveyMeta) => void;
  onSample: () => void;
  errors: string[];
}

export function Uploader({ onCsv, onSample, errors }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [courseName, setCourseName] = useState("");
  const [clientName, setClientName] = useState("");
  const [overwrite, setOverwrite] = useState(false);

  function readFile(file: File) {
    const reader = new FileReader();
    reader.onload = () =>
      onCsv(String(reader.result || ""), {
        courseName,
        clientName,
        mode: overwrite ? "overwrite" : "fill",
      });
    reader.readAsText(file, "UTF-8");
  }

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <h2 style={{ marginTop: 0 }}>アンケートCSVをアップロード</h2>
      <p className="muted">
        Googleフォーム等から出力したアンケート回答のCSVを読み込みます。
        列名は日本語・英語どちらにも対応しています（例: 講座名 / course_name）。
      </p>

      <div className="upload-meta">
        <p className="upload-step-label">STEP 1. 講座名・クライアント名を指定（先に入力してください）</p>
        <p className="muted" style={{ margin: "0 0 8px", fontSize: 12 }}>
          講座名・クライアント名は回答者に入力させず、ここでまとめて指定できます
          （1フォーム＝1講座・1クライアントを想定）。CSVに既に列がある場合は空欄の行だけ補完します。
        </p>
        <div className="upload-meta-fields">
          <label className="builder-field" style={{ marginBottom: 0 }}>
            講座名（このファイル全体に適用）
            <input
              type="text"
              placeholder="例: 校務改善のためのICT活用研修"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
            />
          </label>
          <label className="builder-field" style={{ marginBottom: 0 }}>
            クライアント名（このファイル全体に適用）
            <input
              type="text"
              placeholder="例: 都留市教育委員会"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </label>
        </div>
        <label className="builder-checkbox" style={{ marginTop: 8 }}>
          <input
            type="checkbox"
            checked={overwrite}
            onChange={(e) => setOverwrite(e.target.checked)}
          />
          CSVに値がある行も上書きする
        </label>
      </div>

      <p className="upload-step-label">STEP 2. CSVファイルを選択（選択すると自動で読み込まれます）</p>
      <div
        className="dropzone"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) readFile(file);
        }}
        style={dragOver ? { background: "#c7defe" } : undefined}
      >
        <p style={{ margin: 0, fontWeight: 600 }}>
          📁 ここにCSVファイルをドラッグ＆ドロップ
        </p>
        <p className="muted" style={{ margin: "6px 0 0" }}>
          またはクリックしてファイルを選択
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) readFile(file);
          }}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <button className="btn btn-primary" onClick={onSample}>
          サンプルデータで試す
        </button>
      </div>

      {errors.length > 0 && (
        <div className="error-box">
          {errors.slice(0, 5).map((e, i) => (
            <div key={i}>{e}</div>
          ))}
        </div>
      )}

      <details style={{ marginTop: 20 }}>
        <summary className="muted" style={{ cursor: "pointer" }}>
          CSVの推奨フォーマットを見る
        </summary>
        <table className="data-table" style={{ marginTop: 10 }}>
          <thead>
            <tr>
              <th>列名</th>
              <th>説明</th>
              <th>例</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["course_name / 講座名", "講座名", "Excel自動化基礎講座"],
              ["client_name / クライアント名", "企業名", "株式会社ABC"],
              ["answered_at / 回答日", "回答日", "2026-06-01"],
              ["time_unit / 時間単位", "月/日/年あたり", "月"],
              ["time_value / 時間", "節約時間(数値)", "5"],
              ["usage_type / 用途", "業務/プライベート", "業務"],
              ["satisfaction_score / 満足度", "1〜5", "5"],
              ["comprehension_score / 理解度", "1〜5", "4"],
              ["nps_score / 推奨度", "0〜10", "9"],
              ["free_comment / 自由記述", "コメント", "作業が早くなった"],
            ].map((r, i) => (
              <tr key={i}>
                <td>{r[0]}</td>
                <td>{r[1]}</td>
                <td>{r[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
