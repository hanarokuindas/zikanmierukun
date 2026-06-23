"use client";

import { useMemo } from "react";
import { SurveyResponse, DashboardFilters, UsageType } from "@/lib/types";

interface Props {
  rows: SurveyResponse[];
  filters: DashboardFilters;
  onChange: (f: DashboardFilters) => void;
}

function uniq(values: (string | undefined)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v))).sort();
}

function multiValues(e: React.ChangeEvent<HTMLSelectElement>): string[] {
  return Array.from(e.target.selectedOptions).map((o) => o.value);
}

export function Filters({ rows, filters, onChange }: Props) {
  const clients = useMemo(() => uniq(rows.map((r) => r.client_name)), [rows]);
  const courses = useMemo(() => uniq(rows.map((r) => r.course_name)), [rows]);

  return (
    <>
      <label>
        クライアント（複数選択可）
        <select
          multiple
          value={filters.clients}
          onChange={(e) => onChange({ ...filters, clients: multiValues(e) })}
        >
          {clients.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label>
        講座（複数選択可）
        <select
          multiple
          value={filters.courses}
          onChange={(e) => onChange({ ...filters, courses: multiValues(e) })}
        >
          {courses.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label>
        用途
        <select
          value={filters.usageTypes[0] ?? ""}
          onChange={(e) =>
            onChange({
              ...filters,
              usageTypes: e.target.value
                ? [e.target.value as UsageType]
                : [],
            })
          }
        >
          <option value="">すべて</option>
          <option value="業務">業務</option>
          <option value="プライベート">プライベート</option>
        </select>
      </label>
    </>
  );
}
