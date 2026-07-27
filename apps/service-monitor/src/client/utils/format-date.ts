/**
 * Formats an ISO date-time string into a deterministic representation ('YYYY-MM-DD HH:MM UTC')
 * to ensure SSR HTML matches initial client hydration across timezones and locales.
 */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return `${date.toISOString().replace('T', ' ').slice(0, 16)} UTC`;
}
