export function fmtHours(h: number): string {
  return Math.round(h).toLocaleString("ja-JP");
}

export function fmtDecimal(n: number | null, digits = 1): string {
  if (n == null) return "—";
  return n.toFixed(digits);
}

// 大きな時間を「人日（8h）/人月(160h)」換算で補助表示
export function toPersonDays(hours: number): string {
  const days = hours / 8;
  if (days >= 220) return `約 ${(days / 220).toFixed(1)} 人年`;
  return `約 ${Math.round(days).toLocaleString("ja-JP")} 人日`;
}
