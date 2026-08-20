"use client";

import { useMemo, useState } from "react";
import { SurveyResponse, WorkdayMode, DashboardFilters, UsageType, RoiSettings } from "@/lib/types";
import { parseCsv, applySurveyMeta, SurveyMeta } from "@/lib/parseCsv";
import { generateSampleData } from "@/lib/sampleData";
import { applyFilters, computeKpis, computeRoi } from "@/lib/aggregate";
import { fmtHours, fmtDecimal, toPersonDays, fmtYen, toYenUnit } from "@/lib/format";
import { Filters } from "@/components/Filters";
import { TimeTab } from "@/components/TimeTab";
import { EvaluationTab } from "@/components/EvaluationTab";
import { Uploader } from "@/components/Uploader";
import { SurveyBuilder } from "@/components/SurveyBuilder";
import { KirkpatrickTab } from "@/components/KirkpatrickTab";

type TabKey = "time" | "evaluation" | "kirkpatrick" | "builder";

export default function Home() {
  const [rows, setRows] = useState<SurveyResponse[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [tab, setTab] = useState<TabKey>("time");
  const [workdayMode, setWorkdayMode] = useState<WorkdayMode>(260);
  const [roi, setRoi] = useState<RoiSettings>({ hourlyWage: 3000, trainingCost: 0 });
  const [filters, setFilters] = useState<DashboardFilters>({
    clients: [],
    courses: [],
    usageTypes: [],
  });

  function handleCsv(text: string, meta: SurveyMeta) {
    const result = parseCsv(text);
    setRows(applySurveyMeta(result.rows, meta));
    setErrors(result.errors);
    setFilters({ clients: [], courses: [], usageTypes: [] });
  }

  function loadSample() {
    setRows(generateSampleData());
    setErrors([]);
    setFilters({ clients: [], courses: [], usageTypes: [] });
  }

  const filtered = useMemo(() => applyFilters(rows, filters), [rows, filters]);
  const kpis = useMemo(
    () => computeKpis(filtered, workdayMode),
    [filtered, workdayMode]
  );
  const roiResult = useMemo(
    () => computeRoi(kpis.totalAnnualHours, roi),
    [kpis.totalAnnualHours, roi]
  );

  const hasData = rows.length > 0;

  return (
    <>
      <header className="app-header">
        <div className="container">
          <h1>⏱ 時間見えるくん</h1>
          <p>IT講座の事後アンケートから、節約・効率化できた時間と講座評価を可視化します</p>
        </div>
      </header>

      <main className="container">
        {!hasData ? (
          <>
            <Uploader onCsv={handleCsv} onSample={loadSample} errors={errors} />
            <SurveyBuilder />
          </>
        ) : (
          <>
            <div className="toolbar">
              <Filters rows={rows} filters={filters} onChange={setFilters} />
              <label>
                日あたり業務利用の年間換算
                <div className="toggle-group">
                  <button
                    className={workdayMode === 260 ? "active" : ""}
                    onClick={() => setWorkdayMode(260)}
                  >
                    勤務日 (260日)
                  </button>
                  <button
                    className={workdayMode === 365 ? "active" : ""}
                    onClick={() => setWorkdayMode(365)}
                  >
                    全日 (365日)
                  </button>
                </div>
              </label>
              <label>
                想定時給（円）
                <input
                  type="number"
                  className="roi-input"
                  min={0}
                  step={100}
                  value={roi.hourlyWage}
                  onChange={(e) =>
                    setRoi((r) => ({ ...r, hourlyWage: Number(e.target.value) || 0 }))
                  }
                />
              </label>
              <label>
                研修費用（円・任意）
                <input
                  type="number"
                  className="roi-input"
                  min={0}
                  step={10000}
                  placeholder="ROI%算出に使用"
                  value={roi.trainingCost || ""}
                  onChange={(e) =>
                    setRoi((r) => ({ ...r, trainingCost: Number(e.target.value) || 0 }))
                  }
                />
              </label>
              <label>
                データ操作
                <button className="btn" onClick={() => setRows([])}>
                  別のCSVを読み込む
                </button>
              </label>
              <label>
                レポート出力
                <button className="btn btn-primary" onClick={() => window.print()}>
                  印刷 / PDFで保存
                </button>
              </label>
            </div>

            <div className="print-only print-report-header">
              <h2>時間見えるくん レポート</h2>
              <p>
                出力日: {new Date().toLocaleDateString("ja-JP")} ／
                クライアント: {filters.clients.length ? filters.clients.join("、") : "すべて"} ／
                講座: {filters.courses.length ? filters.courses.join("、") : "すべて"} ／
                用途: {filters.usageTypes.length ? filters.usageTypes.join("、") : "すべて"}
              </p>
            </div>

            {errors.length > 0 && (
              <div className="error-box">
                <strong>読み込み時の注意 ({errors.length}件):</strong>
                <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                  {errors.slice(0, 5).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="label">総節約時間（年間換算・全体）</div>
                <div className="value">
                  {fmtHours(kpis.totalAnnualHours)}
                  <span className="unit">時間/年</span>
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  {toPersonDays(kpis.totalAnnualHours)}
                </div>
              </div>
              <div className="kpi-card kpi-card-highlight">
                <div className="label">コスト削減額（年間換算）</div>
                <div className="value value-money">
                  {fmtYen(roiResult.costSavings)}
                  <span className="unit">円/年</span>
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  {toYenUnit(roiResult.costSavings)}（時給 {fmtYen(roi.hourlyWage)} 円換算）
                </div>
              </div>
              <div className="kpi-card kpi-card-highlight">
                <div className="label">ROI（投資対効果）</div>
                <div className="value">
                  {roiResult.roiPercent == null ? (
                    "—"
                  ) : (
                    <>
                      {Math.round(roiResult.roiPercent).toLocaleString("ja-JP")}
                      <span className="unit">%</span>
                    </>
                  )}
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  {roiResult.roiPercent == null
                    ? "研修費用を入力すると算出されます"
                    : `純便益 ${toYenUnit(roiResult.netBenefit)}`}
                </div>
              </div>
              <div className="kpi-card">
                <div className="label">1人あたり平均節約時間</div>
                <div className="value">
                  {fmtHours(kpis.avgAnnualHoursPerPerson)}
                  <span className="unit">時間/年</span>
                </div>
              </div>
              <div className="kpi-card">
                <div className="label">回答件数（サンプル数）</div>
                <div className="value">
                  {kpis.responseCount.toLocaleString("ja-JP")}
                  <span className="unit">件</span>
                </div>
              </div>
              <div className="kpi-card">
                <div className="label">平均満足度</div>
                <div className="value">
                  {fmtDecimal(kpis.avgSatisfaction)}
                  <span className="unit">/ 5</span>
                </div>
              </div>
              <div className="kpi-card">
                <div className="label">NPS（推奨度）</div>
                <div className="value">
                  {kpis.nps == null ? "—" : Math.round(kpis.nps)}
                </div>
              </div>
            </div>

            <div className="tabs">
              <button
                className={`tab ${tab === "time" ? "active" : ""}`}
                onClick={() => setTab("time")}
              >
                時間効果
              </button>
              <button
                className={`tab ${tab === "evaluation" ? "active" : ""}`}
                onClick={() => setTab("evaluation")}
              >
                講座評価
              </button>
              <button
                className={`tab ${tab === "kirkpatrick" ? "active" : ""}`}
                onClick={() => setTab("kirkpatrick")}
              >
                効果測定（4段階）
              </button>
              <button
                className={`tab ${tab === "builder" ? "active" : ""}`}
                onClick={() => setTab("builder")}
              >
                アンケート作成
              </button>
            </div>

            {tab === "time" && <TimeTab rows={filtered} workdayMode={workdayMode} />}
            {tab === "evaluation" && <EvaluationTab rows={filtered} />}
            {tab === "kirkpatrick" && (
              <KirkpatrickTab rows={filtered} workdayMode={workdayMode} roi={roi} />
            )}
            {tab === "builder" && <SurveyBuilder />}
          </>
        )}
      </main>
    </>
  );
}
