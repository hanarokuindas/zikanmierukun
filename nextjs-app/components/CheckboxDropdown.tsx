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
          <div className="checkbox-dropdown-actions">
            <button type="button" onClick={() => onChange([])}>
              すべて解除
            </button>
            <button type="button" onClick={() => onChange(options)}>
              すべて選択
            </button>
          </div>
          <ul>
            {options.map((opt) => (
              <li key={opt}>
                <label>
                  <input
                    type="checkbox"
                    checked={selected.includes(opt)}
                    onChange={() => toggle(opt)}
                  />
                  {opt}
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
