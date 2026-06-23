"use client";

import { useMemo } from "react";
import { SurveyResponse, DashboardFilters, UsageType } from "@/lib/types";
import { CheckboxDropdown } from "@/components/CheckboxDropdown";

interface Props {
  rows: SurveyResponse[];
  filters: DashboardFilters;
  onChange: (f: DashboardFilters) => void;
}

function uniq(values: (string | undefined)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v))).sort();
}

export function Filters({ rows, filters, onChange }: Props) {
  const clients = useMemo(() => uniq(rows.map((r) => r.client_name)), [rows]);
  const courses = useMemo(() => uniq(rows.map((r) => r.course_name)), [rows]);

  return (
    <>
      <CheckboxDropdown
        label="クライアント（複数選択可）"
        options={clients}
        selected={filters.clients}
        onChange={(clients) => onChange({ ...filters, clients })}
      />

      <CheckboxDropdown
        label="講座（複数選択可）"
        options={courses}
        selected={filters.courses}
        onChange={(courses) => onChange({ ...filters, courses })}
      />

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
