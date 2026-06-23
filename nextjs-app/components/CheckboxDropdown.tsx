"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
}

export function CheckboxDropdown({ label, options, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  const summary =
    selected.length === 0
      ? "すべて"
      : selected.length <= 2
      ? selected.join(", ")
      : `${selected.length}件選択中`;

  return (
    <div className="checkbox-dropdown" ref={ref}>
      <span className="checkbox-dropdown-label">{label}</span>
      <button
        type="button"
        className="checkbox-dropdown-trigger"
        onClick={() => setOpen((o) => !o)}
      >
        <span>{summary}</span>
        <span className="checkbox-dropdown-caret">▾</span>
      </button>
      {open && (
        <div className="checkbox-dropdown-panel">
          <p className="checkbox-dropdown-hint">
            未選択の場合はすべて表示されます。絞り込みたい項目だけチェックしてください。
          </p>
          <ul>
            {options.map((opt) => (
              <li key={opt}>
                <label>
                  <input
                    type="checkbox"
                    checked={selected.includes(opt)}
                    onChange={() => toggle(opt)}
                  />
                  <span>{opt}</span>
                </label>
              </li>
            ))}
          </ul>
          {selected.length > 0 && (
            <button
              type="button"
              className="checkbox-dropdown-clear"
              onClick={() => onChange([])}
            >
              選択をクリア（すべて表示）
            </button>
          )}
        </div>
      )}
    </div>
  );
}
