export function formatBytes(n: number): string {
  if (n < 1024) {
    return `${n} B`;
  }
  if (n < 1024 * 1024) {
    return `${(n / 1024).toFixed(0)} KB`;
  }
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatNumber(n: number | null, digits = 2): string {
  if (n === null) {
    return "-";
  }
  return Number.isInteger(n) ? String(n) : n.toFixed(digits);
}

/** Stable, distinguishable colors for files on the map and in lists. */
export const FILE_COLORS = [
  "#1f77b4",
  "#d62728",
  "#2ca02c",
  "#ff7f0e",
  "#9467bd",
  "#8c564b",
  "#e377c2",
  "#17becf",
  "#bcbd22",
  "#7f7f7f",
];

export function fileColor(index: number): string {
  return FILE_COLORS[index % FILE_COLORS.length] ?? "#333333";
}
