"use client";

import { useMemo, useState } from "react";
import { SurveyResponse, WorkdayMode, DashboardFilters, UsageType } from "@/lib/types";
import { parseCsv } from "@/lib/parseCsv";
import { generateSampleData } from "@/lib/sampleData";
import { applyFilters, computeKpis } from "@/lib/aggregate";
import { fmtHours, fmtDecimal, toPersonDays } from "@/lib/format";
import { Filters } from "@/components/Filters";
import { TimeTab } from "@/components/TimeTab";
import { EvaluationTab } from "@/components/EvaluationTab";
import { Uploader } from "@/components/Uploader";

type TabKey = "time" | "evaluation";

export default function Home() {
  const [rows, setRows] = useState<SurveyResponse[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [tab, setTab] = useState<TabKey>("time");
  const [workdayMode, setWorkdayMode] = useState<WorkdayMode>(260);
  const [filters, setFilters] = useState<DashboardFilters>({
    clients: [],
    courses: [],
    usageTypes: [],
  });

  function handleCsv(text: string) {
    const result = parseCsv(text);
    setRows(result.rows);
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
          <Uploader onCsv={handleCsv} onSample={loadSample} errors={errors} />
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
                データ操作
                <button className="btn" onClick={() => setRows([])}>
                  別のCSVを読み込む
                </button>
              </label>
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
            </div>

            {tab === "time" ? (
              <TimeTab rows={filtered} workdayMode={workdayMode} />
            ) : (
              <EvaluationTab rows={filtered} />
            )}
          </>
        )}
      </main>
    </>
  );
}
