export const reportRecipientTerminalStatuses = new Set([
  "accepted",
  "delivered",
  "failed",
  "bounced",
  "complained",
  "suppressed",
  "skipped",
]);

const reportRecipientFailureStatuses = new Set([
  "failed",
  "bounced",
  "complained",
  "suppressed",
]);

/**
 * A run is a summary of all recipient rows. It is only accepted when every
 * recipient has been accepted by the provider, and only delivered when every
 * recipient has reached delivered (or was intentionally skipped).
 */
export function aggregateReportDeliveryStatus(statuses: readonly string[]) {
  if (!statuses.length) return "claimed" as const;
  if (statuses.some((status) => reportRecipientFailureStatuses.has(status)))
    return "failed" as const;
  if (statuses.every((status) => status === "skipped")) return "skipped" as const;
  if (statuses.every((status) => status === "delivered" || status === "skipped"))
    return "delivered" as const;
  if (
    statuses.every((status) =>
      ["accepted", "delivered", "skipped"].includes(status),
    )
  )
    return "accepted" as const;
  return "claimed" as const;
}

export function reportRecipientStatusForProviderEvent(eventStatus: string) {
  if (eventStatus === "sent") return "accepted" as const;
  if (eventStatus === "delivered") return "delivered" as const;
  if (eventStatus === "bounced") return "bounced" as const;
  if (eventStatus === "complained") return "complained" as const;
  if (eventStatus === "suppressed") return "suppressed" as const;
  if (eventStatus === "failed") return "failed" as const;
  return null;
}

export function isReportScheduleClaimCurrent(
  schedule: { status?: unknown; next_run_at?: unknown } | null | undefined,
  scheduledFor: string,
) {
  return schedule?.status === "active"
    && typeof schedule.next_run_at === "string"
    && schedule.next_run_at === scheduledFor;
}

/**
 * Report delivery depends on a small set of reviewed migrations. Keep schema
 * failures distinguishable from transient provider/database failures so the
 * cron can stop claiming work and tell the operator exactly what is missing.
 */
export function isReportDeliverySchemaSetupError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: unknown; message?: unknown };
  const code = typeof value.code === "string" ? value.code : "";
  const message = typeof value.message === "string" ? value.message : "";
  if (code === "42P01") return true;
  if (code !== "42703") return false;
  return /report_delivery_runs|report_delivery_recipients|attempt_count|next_retry_at/i.test(message);
}
