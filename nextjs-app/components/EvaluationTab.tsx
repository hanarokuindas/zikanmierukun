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
import { SurveyResponse } from "@/lib/types";
import { scoreDistribution, keywordFrequency, calcNps } from "@/lib/aggregate";

interface Props {
  rows: SurveyResponse[];
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
  const keywords = useMemo(() => keywordFrequency(rows, 25), [rows]);

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

  if (!rows.length) {
    return <p className="muted">条件に合うデータがありません。</p>;
  }

  return (
    <div className="chart-grid">
      <div className="card chart-card">
        <h3>満足度の分布</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={satDist}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="score" />
            <YAxis allowDecimals={false} />
            <Tooltip formatter={(v: number) => [`${v} 件`, "回答数"]} />
            <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card chart-card">
        <h3>理解度の分布</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={compDist}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="score" />
            <YAxis allowDecimals={false} />
            <Tooltip formatter={(v: number) => [`${v} 件`, "回答数"]} />
            <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card chart-card">
        <h3>NPS内訳（推奨度）{npsBreakdown.nps != null && ` / NPS: ${Math.round(npsBreakdown.nps)}`}</h3>
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
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={diffDist}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="score" />
            <YAxis allowDecimals={false} />
            <Tooltip formatter={(v: number) => [`${v} 件`, "回答数"]} />
            <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card chart-card">
        <h3>自由記述の頻出キーワード</h3>
        {keywords.length === 0 ? (
          <p className="muted">自由記述データがありません。</p>
        ) : (
          <div className="tag-cloud">
            {keywords.map((k) => (
              <span
                key={k.word}
                className="tag"
                style={{ fontSize: 12 + Math.min(k.count, 10) }}
              >
                {k.word} ({k.count})
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
