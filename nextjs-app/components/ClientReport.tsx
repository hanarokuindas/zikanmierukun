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
  groupBy,
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
  const byCourse = useMemo(() => groupBy(rows, "course_name", workdayMode), [rows, workdayMode]);
  const trend = useMemo(() => trendBy(rows, workdayMode, "month"), [rows, workdayMode]);
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
        <h2 className="report-heading">2. 時間削減の内訳</h2>
        <p className="report-desc">
          どの講座で、いつ、どれだけの時間が生み出されたかを示します。
        </p>

        <div className="report-card">
          <h3 className="report-card-title">講座別の年間節約時間</h3>
          <p className="report-card-desc">講座ごとに、受講者全員分の節約時間を1年分に換算して合計したものです。棒が長いほど効果が大きい講座です。</p>
          <ResponsiveContainer width="100%" height={Math.max(200, byCourse.length * 40)}>
            <BarChart data={byCourse} layout="vertical" margin={{ left: 20, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => fmtHours(v)} />
              <YAxis type="category" dataKey="key" width={150} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`${fmtHours(v)} 時間/年`, "年間節約時間"]} />
              <Bar dataKey="totalAnnualHours" fill="#2563eb" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
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

      {/* 用語の説明 */}
      <section className="report-section">
        <h2 className="report-heading">用語の説明</h2>
        <dl className="report-glossary">
          <dt>年間の節約時間</dt>
          <dd>受講者が「効率化できた」と回答した時間を、回答単位（日・月・年あたり）に応じて1年分に換算し合計したものです。</dd>
          <dt>コスト削減額</dt>
          <dd>節約時間に想定時給を掛けて金額に換算したものです。時間短縮を人件費の観点から金額で表しています。</dd>
          <dt>ROI（投資対効果）</dt>
          <dd>研修費用に対して得られた効果（コスト削減額）の割合です。100%超で費用以上の効果を意味します。</dd>
          <dt>NPS（推奨度）</dt>
          <dd>「人にすすめたいか」を0〜10で尋ね、推奨者の割合から批判者の割合を引いた指標です（−100〜＋100）。</dd>
          <dt>達成率</dt>
          <dd>5段階評価の平均を「5点満点に対する割合（%）」で表したものです。</dd>
        </dl>
      </section>
    </div>
  );
}
