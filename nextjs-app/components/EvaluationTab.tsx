"use client";

import { useMemo, useState } from "react";
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
import { SurveyResponse } from "@/lib/types";
import { scoreDistribution, calcNps } from "@/lib/aggregate";
import { fmtDecimal, fmtScorePercent } from "@/lib/format";

interface Props {
  rows: SurveyResponse[];
}

function avgOf(rows: SurveyResponse[], field: "satisfaction_score" | "comprehension_score"): number | null {
  const vals = rows.map((r) => r[field]).filter((n): n is number => n != null);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

const PIE_COLORS = ["#2563eb", "#94a3b8", "#f59e0b"];

export function EvaluationTab({ rows }: Props) {
  const satDist = useMemo(
    () => scoreDistribution(rows, "satisfaction_score", 5),
    [rows]
  );
  const compDist = useMemo(
    () => scoreDistribution(rows, "comprehension_score", 5),
    [rows]
  );
  const diffDist = useMemo(
    () => scoreDistribution(rows, "difficulty_level", 5),
    [rows]
  );
  // 自由記述の全文一覧（空欄は除外）
  const comments = useMemo(
    () =>
      rows
        .map((r) => ({
          text: (r.free_comment || "").trim(),
          course: r.course_name,
          client: r.client_name,
          date: r.answered_at,
        }))
        .filter((c) => c.text !== ""),
    [rows]
  );
  const PER_PAGE = 20;
  const [commentPage, setCommentPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(comments.length / PER_PAGE));
  const page = Math.min(commentPage, pageCount - 1);
  const pageComments = comments.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  const applyDist = useMemo(() => {
    const counts: Record<string, number> = { はい: 0, いいえ: 0, わからない: 0 };
    for (const r of rows) {
      if (r.would_apply) counts[r.would_apply] = (counts[r.would_apply] || 0) + 1;
    }
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [rows]);

  const npsBreakdown = useMemo(() => {
    const scores = rows
      .map((r) => r.nps_score)
      .filter((n): n is number => n != null);
    const promoters = scores.filter((s) => s >= 9).length;
    const passives = scores.filter((s) => s >= 7 && s <= 8).length;
    const detractors = scores.filter((s) => s <= 6).length;
    return {
      data: [
        { name: "推奨者 (9-10)", value: promoters },
        { name: "中立者 (7-8)", value: passives },
        { name: "批判者 (0-6)", value: detractors },
      ].filter((d) => d.value > 0),
      nps: calcNps(scores),
    };
  }, [rows]);

  const avgSat = useMemo(() => avgOf(rows, "satisfaction_score"), [rows]);
  const avgComp = useMemo(() => avgOf(rows, "comprehension_score"), [rows]);

  if (!rows.length) {
    return <p className="muted">条件に合うデータがありません。</p>;
  }

  return (
    <div className="chart-grid">
      <div className="card chart-card">
        <h3>満足度の分布</h3>
        <p className="score-stat">
          平均 {fmtDecimal(avgSat)} / 5
          <span className="score-stat-pct">達成率 {fmtScorePercent(avgSat)}</span>
        </p>
        <p className="chart-caption">満足度は1（低い）〜5（高い）の自己評価です。横軸が評価値、縦軸が回答件数。</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={satDist}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="score" label={{ value: "満足度", position: "insideBottom", offset: -2, fontSize: 11 }} />
            <YAxis allowDecimals={false} label={{ value: "件数", angle: -90, position: "insideLeft", fontSize: 11 }} />
            <Tooltip formatter={(v: number) => [`${v} 件`, "回答数"]} />
            <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card chart-card">
        <h3>理解度の分布</h3>
        <p className="score-stat">
          平均 {fmtDecimal(avgComp)} / 5
          <span className="score-stat-pct">達成率 {fmtScorePercent(avgComp)}</span>
        </p>
        <p className="chart-caption">理解度は1（低い）〜5（高い）の自己評価です。横軸が評価値、縦軸が回答件数。</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={compDist}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="score" label={{ value: "理解度", position: "insideBottom", offset: -2, fontSize: 11 }} />
            <YAxis allowDecimals={false} label={{ value: "件数", angle: -90, position: "insideLeft", fontSize: 11 }} />
            <Tooltip formatter={(v: number) => [`${v} 件`, "回答数"]} />
            <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card chart-card">
        <h3>NPS内訳（推奨度）{npsBreakdown.nps != null && ` / NPS: ${Math.round(npsBreakdown.nps)}`}</h3>
        <p className="chart-caption">推奨度（0-10）を、推奨者(9-10)・中立者(7-8)・批判者(0-6)の3グループに分けた内訳です。NPSは推奨者%-批判者%。</p>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={npsBreakdown.data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {npsBreakdown.data.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="card chart-card">
        <h3>実践予定</h3>
        <p className="chart-caption">「学んだ内容を実践する予定があるか」への回答の内訳です。</p>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={applyDist}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {applyDist.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="card chart-card">
        <h3>難易度の分布</h3>
        <p className="chart-caption">難易度は1（簡単）〜5（難しい）の自己評価です。横軸が評価値、縦軸が回答件数。</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={diffDist}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="score" label={{ value: "難易度", position: "insideBottom", offset: -2, fontSize: 11 }} />
            <YAxis allowDecimals={false} label={{ value: "件数", angle: -90, position: "insideLeft", fontSize: 11 }} />
            <Tooltip formatter={(v: number) => [`${v} 件`, "回答数"]} />
            <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card chart-card" style={{ gridColumn: "1 / -1" }}>
        <div className="chart-card-header">
          <h3>自由記述コメント（全文）</h3>
          {comments.length > 0 && (
            <span className="muted" style={{ fontSize: 12 }}>
              全 {comments.length} 件中 {page * PER_PAGE + 1}〜
              {Math.min(page * PER_PAGE + PER_PAGE, comments.length)} 件
            </span>
          )}
        </div>
        <p className="chart-caption">受講者の自由記述を全文で表示します。20件ごとにページを切り替えられます。</p>
        {comments.length === 0 ? (
          <p className="muted">自由記述データがありません。</p>
        ) : (
          <>
            <ol className="comment-list" start={page * PER_PAGE + 1}>
              {pageComments.map((c, i) => (
                <li key={i} className="comment-item">
                  <p className="comment-text">{c.text}</p>
                  <div className="comment-meta muted">
                    {[c.course, c.client, c.date].filter(Boolean).join(" ・ ")}
                  </div>
                </li>
              ))}
            </ol>
            {pageCount > 1 && (
              <div className="comment-pager">
                <button
                  className="btn"
                  disabled={page === 0}
                  onClick={() => setCommentPage(page - 1)}
                >
                  ← 前の20件
                </button>
                <span className="muted" style={{ fontSize: 13 }}>
                  {page + 1} / {pageCount} ページ
                </span>
                <button
                  className="btn"
                  disabled={page >= pageCount - 1}
                  onClick={() => setCommentPage(page + 1)}
                >
                  次の20件 →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
