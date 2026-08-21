export type RecordHistoryDisplayState = "error" | "loading" | "empty" | "ready";

export function getRecordHistoryDisplayState(
  loading: boolean,
  itemCount: number,
  error?: string | null,
): RecordHistoryDisplayState {
  if (loading) return "loading";
  if (error) return "error";
  return itemCount > 0 ? "ready" : "empty";
}

export function formatRecordHistoryTimestamp(value: string) {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return "Date not recorded";

  return timestamp.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
