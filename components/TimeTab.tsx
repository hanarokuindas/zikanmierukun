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
  LineChart,
  Line,
  Legend,
} from "recharts";
import { SurveyResponse, WorkdayMode } from "@/lib/types";
import { groupBy, trendByMonth } from "@/lib/aggregate";
import { fmtHours } from "@/lib/format";

interface Props {
  rows: SurveyResponse[];
  workdayMode: WorkdayMode;
}

export function TimeTab({ rows, workdayMode }: Props) {
  const byCourse = useMemo(
    () => groupBy(rows, "course_name", workdayMode),
    [rows, workdayMode]
  );
  const byClient = useMemo(
    () => groupBy(rows, "client_name", workdayMode),
    [rows, workdayMode]
  );
  const trend = useMemo(
    () => trendByMonth(rows, workdayMode),
    [rows, workdayMode]
  );

  if (!rows.length) {
    return <p className="muted">条件に合うデータがありません。</p>;
  }

  return (
    <div className="chart-grid">
      <div className="card chart-card">
        <h3>講座別 総節約時間（年間換算）</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={byCourse} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={(v) => fmtHours(v)} />
            <YAxis type="category" dataKey="key" width={140} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => [`${fmtHours(v)} 時間/年`, "総節約時間"]} />
            <Bar dataKey="totalAnnualHours" fill="#2563eb" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card chart-card">
        <h3>クライアント別 総節約時間（年間換算）</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={byClient} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={(v) => fmtHours(v)} />
            <YAxis type="category" dataKey="key" width={140} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => [`${fmtHours(v)} 時間/年`, "総節約時間"]} />
            <Bar dataKey="totalAnnualHours" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card chart-card" style={{ gridColumn: "1 / -1" }}>
        <h3>月別 節約時間トレンド（回答日ベース）</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" tickFormatter={(v) => fmtHours(v)} />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="totalAnnualHours"
              name="総節約時間(年間換算)"
              stroke="#2563eb"
              strokeWidth={2}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="count"
              name="回答件数"
              stroke="#94a3b8"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card chart-card" style={{ gridColumn: "1 / -1" }}>
        <h3>講座別 サマリー</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>講座</th>
              <th>回答数</th>
              <th>総節約時間(年)</th>
              <th>1人あたり(年)</th>
              <th>平均満足度</th>
            </tr>
          </thead>
          <tbody>
            {byCourse.map((g) => (
              <tr key={g.key}>
                <td>{g.key}</td>
                <td>{g.count}</td>
                <td>{fmtHours(g.totalAnnualHours)} 時間</td>
                <td>{fmtHours(g.avgAnnualHours)} 時間</td>
                <td>{g.avgSatisfaction == null ? "—" : g.avgSatisfaction.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
