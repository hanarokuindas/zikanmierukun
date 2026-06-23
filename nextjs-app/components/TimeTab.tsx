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
  LineChart,
  Line,
  Legend,
} from "recharts";
import { SurveyResponse, WorkdayMode } from "@/lib/types";
import { groupBy, trendBy, TrendGranularity } from "@/lib/aggregate";
import { fmtHours, fmtDecimal } from "@/lib/format";

interface Props {
  rows: SurveyResponse[];
  workdayMode: WorkdayMode;
}

const GRANULARITY_LABELS: Record<TrendGranularity, string> = {
  day: "日次",
  month: "月次",
  year: "年次",
};

export function TimeTab({ rows, workdayMode }: Props) {
  const [granularity, setGranularity] = useState<TrendGranularity>("month");

  const byCourse = useMemo(
    () => groupBy(rows, "course_name", workdayMode),
    [rows, workdayMode]
  );
  const byClient = useMemo(
    () => groupBy(rows, "client_name", workdayMode),
    [rows, workdayMode]
  );
  const trend = useMemo(
    () => trendBy(rows, workdayMode, granularity),
    [rows, workdayMode, granularity]
  );

  if (!rows.length) {
    return <p className="muted">条件に合うデータがありません。</p>;
  }

  return (
    <div className="chart-grid">
      <div className="card chart-card">
        <h3>講座別 総節約時間（年間換算）</h3>
        <p className="chart-caption">
          講座ごとに、回答者全員分の節約時間を年間換算した合計値です。多い順に並んでいます。
        </p>
        <ResponsiveContainer width="100%" height={Math.max(220, byCourse.length * 36)}>
          <BarChart data={byCourse} layout="vertical" margin={{ left: 20, right: 24 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tickFormatter={(v) => fmtHours(v)} />
            <YAxis type="category" dataKey="key" width={140} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => [`${fmtHours(v)} 時間/年`, "総節約時間"]} />
            <Bar dataKey="totalAnnualHours" fill="#2563eb" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card chart-card">
        <h3>クライアント別 総節約時間（年間換算）</h3>
        <p className="chart-caption">
          クライアント（企業）ごとの節約時間の年間換算合計です。提案資料の根拠として使えます。
        </p>
        <ResponsiveContainer width="100%" height={Math.max(220, byClient.length * 36)}>
          <BarChart data={byClient} layout="vertical" margin={{ left: 20, right: 24 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tickFormatter={(v) => fmtHours(v)} />
            <YAxis type="category" dataKey="key" width={140} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => [`${fmtHours(v)} 時間/年`, "総節約時間"]} />
            <Bar dataKey="totalAnnualHours" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card chart-card" style={{ gridColumn: "1 / -1" }}>
        <div className="chart-card-header">
          <h3>節約時間トレンド（回答日ベース）</h3>
          <div className="toggle-group">
            {(["day", "month", "year"] as TrendGranularity[]).map((g) => (
              <button
                key={g}
                className={granularity === g ? "active" : ""}
                onClick={() => setGranularity(g)}
              >
                {GRANULARITY_LABELS[g]}
              </button>
            ))}
          </div>
        </div>
        <p className="chart-caption">
          回答日を{GRANULARITY_LABELS[granularity]}単位で集計しています。青線は年間換算した節約時間の合計、グレー線は回答件数です。
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={trend} margin={{ left: 8, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis
              yAxisId="left"
              tickFormatter={(v) => fmtHours(v)}
              label={{ value: "時間/年", angle: -90, position: "insideLeft", fontSize: 11 }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              allowDecimals={false}
              label={{ value: "件数", angle: 90, position: "insideRight", fontSize: 11 }}
            />
            <Tooltip
              formatter={(v: number, name: string) =>
                name === "回答件数" ? [`${v} 件`, name] : [`${fmtHours(v)} 時間/年`, name]
              }
            />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="totalAnnualHours"
              name="総節約時間(年間換算)"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="count"
              name="回答件数"
              stroke="#94a3b8"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card chart-card" style={{ gridColumn: "1 / -1" }}>
        <h3>講座別 サマリー</h3>
        <p className="chart-caption">
          講座ごとの時間効果と評価指標を一覧できます。NPSは-100〜100、満足度・理解度・講師評価は1〜5、難易度は1〜5（高いほど難しい）です。
        </p>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>講座</th>
                <th>回答数</th>
                <th>総節約時間(年)</th>
                <th>1人あたり(年)</th>
                <th>満足度</th>
                <th>理解度</th>
                <th>講師評価</th>
                <th>難易度</th>
                <th>NPS</th>
              </tr>
            </thead>
            <tbody>
              {byCourse.map((g) => (
                <tr key={g.key}>
                  <td>{g.key}</td>
                  <td>{g.count}</td>
                  <td>{fmtHours(g.totalAnnualHours)} 時間</td>
                  <td>{fmtHours(g.avgAnnualHours)} 時間</td>
                  <td>{fmtDecimal(g.avgSatisfaction)}</td>
                  <td>{fmtDecimal(g.avgComprehension)}</td>
                  <td>{fmtDecimal(g.avgInstructor)}</td>
                  <td>{fmtDecimal(g.avgDifficulty)}</td>
                  <td>{g.avgNps == null ? "—" : Math.round(g.avgNps)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
