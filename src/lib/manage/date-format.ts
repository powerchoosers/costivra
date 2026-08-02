export const MANAGE_TIME_ZONE = "America/Chicago";

export function formatManageDate(value: string | null, withTime = false) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", withTime
    ? {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: MANAGE_TIME_ZONE,
      }
    : {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: MANAGE_TIME_ZONE,
      }).format(parsed);
}

export function formatManageDateTime(value: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: MANAGE_TIME_ZONE,
  }).format(parsed);
}
