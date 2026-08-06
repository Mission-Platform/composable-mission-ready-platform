/** Formats a ratio (0–1) as a one-decimal percentage string (e.g. '99.9%'). */
export function formatPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

/** Formats a millisecond duration as a rounded 'N ms' string. */
export function formatMs(ms: number): string {
  return `${Math.round(ms)} ms`;
}
