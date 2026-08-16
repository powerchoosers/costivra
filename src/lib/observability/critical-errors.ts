export type CriticalError = {
  source: string;
  status: string;
  errorCode: string;
  occurredAt: string;
  recoveryHref: string;
};

export type DeduplicatedCriticalError = CriticalError & {
  occurrences: number;
  state: "open";
};

/**
 * Collapse repeated current failure states into actionable signals. Resolution
 * is snapshot-based: once the source ledger no longer returns the failure,
 * the signal disappears from the next snapshot.
 */
export function deduplicateCriticalErrors(errors: CriticalError[]): DeduplicatedCriticalError[] {
  const grouped = new Map<string, DeduplicatedCriticalError>();
  for (const error of errors) {
    const key = [error.source, error.status, error.errorCode, error.recoveryHref].join("|");
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, { ...error, occurrences: 1, state: "open" });
      continue;
    }
    existing.occurrences += 1;
    if (Date.parse(error.occurredAt) > Date.parse(existing.occurredAt)) existing.occurredAt = error.occurredAt;
  }
  return [...grouped.values()].sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt));
}
