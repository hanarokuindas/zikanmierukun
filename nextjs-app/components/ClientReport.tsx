"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { SurveyResponse, WorkdayMode, RoiSettings, DashboardFilters } from "@/lib/types";
import {
  computeKpis,
  computeRoi,
  trendBy,
  scoreDistribution,
  calcNps,
} from "@/lib/aggregate";
import { fmtHours, fmtDecimal, toPersonDays, fmtYen, toYenUnit, fmtScorePercent } from "@/lib/format";

interface Props {
  rows: SurveyResponse[];
  workdayMode: WorkdayMode;
  roi: RoiSettings;
  filters: DashboardFilters;
  onClose: () => void;
}

const PIE_COLORS = ["#2563eb", "#94a3b8", "#f59e0b"];

function avgOf(rows: SurveyResponse[], field: "satisfaction_score" | "comprehension_score" | "instructor_score"): number | null {
  const vals = rows.map((r) => r[field]).filter((n): n is number => n != null);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function ClientReport({ rows, workdayMode, roi, filters, onClose }: Props) {
  const kpis = useMemo(() => computeKpis(rows, workdayMode), [rows, workdayMode]);
  const roiResult = useMemo(() => computeRoi(kpis.totalAnnualHours, roi), [kpis, roi]);
  const trend = useMemo(() => trendBy(rows, workdayMode, "month"), [rows, workdayMode]);

  // 年間節約時間の算定根拠（回答単位ごとの換算内訳）
  const basis = useMemo(() => {
    const cats = [
      { key: "月あたり", factor: 12, match: (r: SurveyResponse) => r.time_unit === "月" },
      { key: "年あたり", factor: 1, match: (r: SurveyResponse) => r.time_unit === "年" },
      {
        key: "日あたり（業務）",
        factor: workdayMode,
        match: (r: SurveyResponse) => r.time_unit === "日" && r.usage_type !== "プライベート",
      },
      {
        key: "日あたり（プライベート）",
        factor: 365,
        match: (r: SurveyResponse) => r.time_unit === "日" && r.usage_type === "プライベート",
      },
    ];
    return cats
      .map((c) => {
        const rs = rows.filter(c.match);
        const inputSum = rs.reduce((s, r) => s + (Number.isFinite(r.time_value) ? r.time_value : 0), 0);
        return { key: c.key, factor: c.factor, count: rs.length, inputSum, annual: inputSum * c.factor };
      })
      .filter((c) => c.count > 0);
  }, [rows, workdayMode]);
  const satDist = useMemo(() => scoreDistribution(rows, "satisfaction_score", 5), [rows]);
  const compDist = useMemo(() => scoreDistribution(rows, "comprehension_score", 5), [rows]);
  const avgSat = useMemo(() => avgOf(rows, "satisfaction_score"), [rows]);
  const avgComp = useMemo(() => avgOf(rows, "comprehension_score"), [rows]);
  const avgInst = useMemo(() => avgOf(rows, "instructor_score"), [rows]);

  const applyDist = useMemo(() => {
    const counts: Record<string, number> = { はい: 0, いいえ: 0, わからない: 0 };
    for (const r of rows) if (r.would_apply) counts[r.would_apply] = (counts[r.would_apply] || 0) + 1;
    return Object.entries(counts).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [rows]);

  const nps = useMemo(
    () => calcNps(rows.map((r) => r.nps_score).filter((n): n is number => n != null)),
    [rows]
  );

  const comments = useMemo(
    () => rows.map((r) => (r.free_comment || "").trim()).filter((t) => t !== ""),
    [rows]
  );

  // 実践予定「はい」割合
  const applyYesPct = useMemo(() => {
    const answered = rows.filter((r) => r.would_apply != null);
    if (!answered.length) return null;
    return Math.round((answered.filter((r) => r.would_apply === "はい").length / answered.length) * 100);
  }, [rows]);

  const today = new Date().toLocaleDateString("ja-JP");
  const clientLabel = filters.clients.length ? filters.clients.join("、") : "全対象";
  const courseLabel = filters.courses.length ? filters.courses.join("、") : "全講座";

  if (!rows.length) {
    return (
      <div className="report-page">
        <div className="report-toolbar report-noprint">
          <button className="btn" onClick={onClose}>← ダッシュボードに戻る</button>
        </div>
        <p className="muted">条件に合うデータがありません。</p>
      </div>
    );
  }

  return (
    <div className="report-page">
      <div className="report-toolbar report-noprint">
        <button className="btn" onClick={onClose}>← ダッシュボードに戻る</button>
        <button className="btn btn-primary" onClick={() => window.print()}>
          PDF / 印刷で保存
        </button>
        <span className="muted" style={{ fontSize: 12 }}>
          「PDF / 印刷で保存」を押し、送信先で「PDFに保存」を選ぶとレポートPDFが作成できます。
        </span>
      </div>

      {/* 表紙見出し */}
      <header className="report-header">
        <h1>研修効果レポート</h1>
        <table className="report-meta">
          <tbody>
            <tr><th>対象</th><td>{clientLabel}</td></tr>
            <tr><th>講座</th><td>{courseLabel}</td></tr>
            <tr><th>回答件数</th><td>{kpis.responseCount.toLocaleString("ja-JP")} 件</td></tr>
            <tr><th>作成日</th><td>{today}</td></tr>
          </tbody>
        </table>
        <p className="report-lead">
          本レポートは、受講後アンケートの回答をもとに、研修によって生み出された
          時間的・金額的な効果と、受講者の評価をまとめたものです。
          各指標には見方の説明を添えています。
        </p>
      </header>

      {/* 1. サマリー */}
      <section className="report-section">
        <h2 className="report-heading">1. 効果サマリー</h2>
        <p className="report-desc">
          研修全体の成果を示す代表的な指標です。数値が大きいほど効果が高いことを表します。
        </p>
        <div className="report-kpi-grid">
          <div className="report-kpi">
            <div className="report-kpi-label">年間の節約時間</div>
            <div className="report-kpi-value">{fmtHours(kpis.totalAnnualHours)}<span>時間/年</span></div>
            <div className="report-kpi-note">
              受講者が「効率化できた」と回答した時間を1年分に換算した合計です（{toPersonDays(kpis.totalAnnualHours)}に相当）。
            </div>
          </div>
          <div className="report-kpi">
            <div className="report-kpi-label">金額換算のコスト削減額</div>
            <div className="report-kpi-value report-kpi-money">{fmtYen(roiResult.costSavings)}<span>円/年</span></div>
            <div className="report-kpi-note">
              節約時間を人件費（想定時給 {fmtYen(roi.hourlyWage)} 円）で換算した年間の削減額です（{toYenUnit(roiResult.costSavings)}）。
            </div>
          </div>
          {roiResult.roiPercent != null && (
            <div className="report-kpi">
              <div className="report-kpi-label">投資対効果（ROI）</div>
              <div className="report-kpi-value">{Math.round(roiResult.roiPercent).toLocaleString("ja-JP")}<span>%</span></div>
              <div className="report-kpi-note">
                研修費用に対して得られた効果の割合です。100%を超えると、かけた費用以上の効果が出ていることを意味します。
              </div>
            </div>
          )}
          <div className="report-kpi">
            <div className="report-kpi-label">1人あたりの節約時間</div>
            <div className="report-kpi-value">{fmtHours(kpis.avgAnnualHoursPerPerson)}<span>時間/年</span></div>
            <div className="report-kpi-note">
              受講者1人が1年間に生み出した平均の時間です。
            </div>
          </div>
          <div className="report-kpi">
            <div className="report-kpi-label">平均満足度</div>
            <div className="report-kpi-value">{fmtDecimal(avgSat)}<span>/ 5（{fmtScorePercent(avgSat)}）</span></div>
            <div className="report-kpi-note">
              受講者による5段階評価の平均です。5に近いほど満足度が高いことを示します。
            </div>
          </div>
          {nps != null && (
            <div className="report-kpi">
              <div className="report-kpi-label">推奨度（NPS）</div>
              <div className="report-kpi-value">{Math.round(nps)}</div>
              <div className="report-kpi-note">
                「この研修を人にすすめたいか」を表す指標です。−100〜＋100の範囲で、プラスが大きいほど好意的です。
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 2. 時間削減の内訳 */}
      <section className="report-section">
        <h2 className="report-heading">2. 年間節約時間とその算定根拠</h2>
        <p className="report-desc">
          この研修によって生み出された時間と、その算出方法を示します。
        </p>

        <div className="report-card">
          <div className="report-total">
            <div>
              <div className="report-total-label">年間の節約時間（合計）</div>
              <div className="report-total-value">{fmtHours(kpis.totalAnnualHours)}<span>時間/年</span></div>
            </div>
            <div>
              <div className="report-total-label">1人あたり（{kpis.responseCount}名）</div>
              <div className="report-total-value">{fmtHours(kpis.avgAnnualHoursPerPerson)}<span>時間/年</span></div>
            </div>
          </div>
          <p className="report-total-sub">{toPersonDays(kpis.totalAnnualHours)}に相当します。</p>
        </div>

        <div className="report-card">
          <h3 className="report-card-title">算定根拠</h3>
          <p className="report-card-desc">
            各受講者が回答した「効率化できた時間」を、回答単位（月・日・年あたり）に応じて1年分に換算し合計しています。
            日あたり（業務）は年間の勤務日数 {workdayMode} 日、日あたり（プライベート）は 365 日で換算しています。
          </p>
          <table className="report-table">
            <thead>
              <tr>
                <th>回答単位</th>
                <th className="num">件数</th>
                <th className="num">入力時間の合計</th>
                <th className="num">年間換算係数</th>
                <th className="num">年間換算時間</th>
              </tr>
            </thead>
            <tbody>
              {basis.map((b) => (
                <tr key={b.key}>
                  <td>{b.key}</td>
                  <td className="num">{b.count} 件</td>
                  <td className="num">{fmtDecimal(b.inputSum)} 時間</td>
                  <td className="num">×{b.factor}</td>
                  <td className="num">{fmtHours(b.annual)} 時間</td>
                </tr>
              ))}
              <tr className="report-table-total">
                <td>合計</td>
                <td className="num">{kpis.responseCount} 件</td>
                <td className="num">—</td>
                <td className="num">—</td>
                <td className="num">{fmtHours(kpis.totalAnnualHours)} 時間/年</td>
              </tr>
            </tbody>
          </table>
          <p className="report-card-desc" style={{ marginTop: 10, marginBottom: 0 }}>
            コスト削減額は、上記の年間節約時間に想定時給 {fmtYen(roi.hourlyWage)} 円を掛けて算出しています
            （{fmtHours(kpis.totalAnnualHours)} 時間 × {fmtYen(roi.hourlyWage)} 円 = {fmtYen(roiResult.costSavings)} 円/年）。
            {roiResult.roiPercent != null && (
              <>
                {" "}ROIは、コスト削減額から研修費用 {fmtYen(roiResult.trainingCost)} 円を差し引いた純便益を
                研修費用で割って算出しています（ROI {Math.round(roiResult.roiPercent).toLocaleString("ja-JP")}%）。
              </>
            )}
          </p>
        </div>

        {trend.length > 1 && (
          <div className="report-card">
            <h3 className="report-card-title">月別の推移</h3>
            <p className="report-card-desc">回答日をもとに、月ごとの節約時間の合計を並べたものです。研修の効果がいつ表れているかがわかります。</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={trend} margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => fmtHours(v)} />
                <Tooltip formatter={(v: number) => [`${fmtHours(v)} 時間/年`, "節約時間"]} />
                <Bar dataKey="totalAnnualHours" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* 3. 受講者の評価 */}
      <section className="report-section">
        <h2 className="report-heading">3. 受講者の評価</h2>
        <p className="report-desc">
          受講者が研修をどのように受け止めたかを示します。満足度・理解度は5段階評価、達成率は「5点満点に対する割合」です。
        </p>

        <div className="report-grid-2">
          <div className="report-card">
            <h3 className="report-card-title">満足度の分布</h3>
            <p className="report-score">平均 {fmtDecimal(avgSat)} / 5（達成率 {fmtScorePercent(avgSat)}）</p>
            <p className="report-card-desc">横軸が評価（1〜5）、縦軸がその評価を選んだ人数です。右側（高評価）に多いほど良好です。</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={satDist}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="score" />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={(v: number) => [`${v} 件`, "回答数"]} />
                <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="report-card">
            <h3 className="report-card-title">理解度の分布</h3>
            <p className="report-score">平均 {fmtDecimal(avgComp)} / 5（達成率 {fmtScorePercent(avgComp)}）</p>
            <p className="report-card-desc">研修内容をどれだけ理解できたかの自己評価（1〜5）です。右側に多いほど理解が進んでいます。</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={compDist}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="score" />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={(v: number) => [`${v} 件`, "回答数"]} />
                <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {nps != null && (
            <div className="report-card">
              <h3 className="report-card-title">推奨度（NPS）の内訳 / NPS: {Math.round(nps)}</h3>
              <p className="report-card-desc">
                推奨度（0〜10）を、推奨者（9〜10）・中立者（7〜8）・批判者（0〜6）に分けた割合です。推奨者が多いほど良好です。
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={(() => {
                      const s = rows.map((r) => r.nps_score).filter((n): n is number => n != null);
                      return [
                        { name: "推奨者 (9-10)", value: s.filter((x) => x >= 9).length },
                        { name: "中立者 (7-8)", value: s.filter((x) => x >= 7 && x <= 8).length },
                        { name: "批判者 (0-6)", value: s.filter((x) => x <= 6).length },
                      ].filter((d) => d.value > 0);
                    })()}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    label
                  >
                    {[0, 1, 2].map((i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {applyDist.length > 0 && (
            <div className="report-card">
              <h3 className="report-card-title">
                学んだ内容の実践予定{applyYesPct != null && `（「はい」${applyYesPct}%）`}
              </h3>
              <p className="report-card-desc">
                「学んだ内容を実務で実践する予定があるか」への回答割合です。「はい」が多いほど、現場での活用が期待できます。
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={applyDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label>
                    {applyDist.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        {avgInst != null && (
          <p className="report-desc" style={{ marginTop: 8 }}>
            なお、講師に対する評価は平均 {fmtDecimal(avgInst)} / 5（達成率 {fmtScorePercent(avgInst)}）でした。
          </p>
        )}
      </section>

      {/* 4. 受講者の声 */}
      {comments.length > 0 && (
        <section className="report-section">
          <h2 className="report-heading">4. 受講者の声（自由記述）</h2>
          <p className="report-desc">
            アンケートに寄せられた自由記述コメントを、いただいたまま全文で掲載しています（全 {comments.length} 件）。
          </p>
          <ul className="report-comments">
            {comments.map((c, i) => (
              <li key={i} className="report-comment">{c}</li>
            ))}
          </ul>
        </section>
      )}

    </div>
  );
}
