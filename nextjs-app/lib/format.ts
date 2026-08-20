export function fmtHours(h: number): string {
  return Math.round(h).toLocaleString("ja-JP");
}

export function fmtDecimal(n: number | null, digits = 1): string {
  if (n == null) return "—";
  return n.toFixed(digits);
}

// 金額（円）。大きな額は万円・億円で読みやすく補助表記する。
export function fmtYen(amount: number): string {
  return Math.round(amount).toLocaleString("ja-JP");
}

// 円を「万円 / 億円」のざっくり表記に変換（補助ラベル用）
export function toYenUnit(amount: number): string {
  const oku = amount / 100_000_000;
  if (Math.abs(oku) >= 1) return `約 ${oku.toFixed(2)} 億円`;
  const man = amount / 10_000;
  if (Math.abs(man) >= 1) return `約 ${man.toFixed(1)} 万円`;
  return `${fmtYen(amount)} 円`;
}

// 評価スコア（X / max）を達成率％に換算する。例: 4.0 / 5 → 80%
export function fmtScorePercent(avg: number | null, max = 5): string {
  if (avg == null) return "—";
  return `${Math.round((avg / max) * 100)}%`;
}

// 大きな時間を「人日（8h）/人月(160h)」換算で補助表示
export function toPersonDays(hours: number): string {
  const days = hours / 8;
  if (days >= 220) return `約 ${(days / 220).toFixed(1)} 人年`;
  return `約 ${Math.round(days).toLocaleString("ja-JP")} 人日`;
}
