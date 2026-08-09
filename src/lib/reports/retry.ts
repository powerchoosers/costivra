export const MAX_REPORT_ATTEMPTS = 4;

const retryDelaysMs = [5 * 60_000, 30 * 60_000, 2 * 60 * 60_000] as const;

function normalizedAttemptCount(value: number) {
  return Number.isFinite(value) ? Math.max(1, Math.trunc(value)) : 1;
}

export function nextReportRetryAt(attemptCount: number, now = new Date()) {
  const attempt = normalizedAttemptCount(attemptCount);
  if (attempt >= MAX_REPORT_ATTEMPTS) return null;
  const delay = retryDelaysMs[Math.min(attempt - 1, retryDelaysMs.length - 1)];
  return new Date(now.getTime() + delay).toISOString();
}

export function reportRetryIsDue(
  run: { status?: unknown; attempt_count?: unknown; next_retry_at?: unknown } | null | undefined,
  now = new Date(),
) {
  if (!run || run.status !== "failed") return false;
  const attemptCount = typeof run.attempt_count === "number" ? run.attempt_count : Number(run.attempt_count ?? 1);
  if (!Number.isFinite(attemptCount) || Math.trunc(attemptCount) >= MAX_REPORT_ATTEMPTS) return false;
  if (typeof run.next_retry_at !== "string" || !run.next_retry_at) return true;
  const retryAt = Date.parse(run.next_retry_at);
  return Number.isFinite(retryAt) && retryAt <= now.getTime();
}
