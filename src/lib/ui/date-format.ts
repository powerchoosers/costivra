/**
 * Costivra Standard Financial Date Formatter
 * 
 * Standardizes date formatting across all financial records, invoices, line items,
 * and review modals into MM/DD/YYYY for accountants, controllers, and finance leaders.
 * Handles ISO strings (YYYY-MM-DD) safely without UTC timezone shift bugs.
 */

export function formatFinancialDate(
  value: string | Date | null | undefined,
  fallback = "—",
): string {
  if (!value) return fallback;

  if (typeof value === "string") {
    const clean = value.trim();
    if (!clean) return fallback;

    // Direct ISO date format: YYYY-MM-DD or YYYY-MM-DDT...
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(clean);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return `${month}/${day}/${year}`;
    }

    // Already in MM/DD/YYYY format
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(clean)) {
      return clean;
    }

    const parsed = new Date(clean);
    if (Number.isNaN(parsed.getTime())) return clean;

    const mm = String(parsed.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(parsed.getUTCDate()).padStart(2, "0");
    const yyyy = parsed.getUTCFullYear();
    return `${mm}/${dd}/${yyyy}`;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return fallback;
    const mm = String(value.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(value.getUTCDate()).padStart(2, "0");
    const yyyy = value.getUTCFullYear();
    return `${mm}/${dd}/${yyyy}`;
  }

  return fallback;
}

export function formatFinancialDateTime(
  value: string | Date | null | undefined,
  fallback = "—",
  timeZone = "America/Chicago",
): string {
  if (!value) return fallback;
  const parsed = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(parsed.getTime())) return fallback;

  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(parsed);
}
