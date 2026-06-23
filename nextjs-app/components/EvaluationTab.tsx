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

      <div className="card chart-card">
        <h3>自由記述の頻出キーワード</h3>
        <p className="chart-caption">自由記述コメントから頻出する単語を抽出し、出現回数が多いほど大きく表示しています。</p>
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
