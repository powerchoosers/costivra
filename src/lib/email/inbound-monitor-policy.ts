export type InboundQueueHealthRecord = {
  id: string;
  organization_id: string;
  status: string;
  attempt_count: number;
  max_attempts: number;
  error_message: string | null;
  received_at: string;
  updated_at: string;
  organizations?: { name?: string | null } | Array<{ name?: string | null }> | null;
};

export type InboundQueueIncident = {
  key: "dead_letter" | "stuck_processing" | "stuck_queued" | "quarantine_aging";
  title: string;
  body: string;
};

const FIFTEEN_MINUTES_MS = 15 * 60 * 1_000;
const QUARANTINE_ALERT_MS = 24 * 60 * 60 * 1_000;

function validTimestamp(value: string) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function classifyInboundQueueIncident(
  record: InboundQueueHealthRecord,
  now = Date.now(),
): InboundQueueIncident | null {
  const receivedAt = validTimestamp(record.received_at);
  const updatedAt = validTimestamp(record.updated_at);
  if (receivedAt === null || updatedAt === null) return null;
  const ageMs = now - receivedAt;
  const unchangedMs = now - updatedAt;

  if (record.status === "dead_letter") {
    return {
      key: "dead_letter",
      title: "Invoice email needs operator review",
      body: `Processing stopped after ${record.attempt_count} of ${record.max_attempts} safe attempts.`,
    };
  }
  if (record.status === "processing" && unchangedMs >= FIFTEEN_MINUTES_MS) {
    return {
      key: "stuck_processing",
      title: "Invoice email processing appears stuck",
      body: "The worker has held this message in processing for more than 15 minutes.",
    };
  }
  if (
    ["queued", "retrying"].includes(record.status) &&
    ageMs >= FIFTEEN_MINUTES_MS &&
    unchangedMs >= FIFTEEN_MINUTES_MS
  ) {
    return {
      key: "stuck_queued",
      title: "Invoice email is waiting too long",
      body: "This message has not advanced through the intake queue for more than 15 minutes.",
    };
  }
  if (record.status === "quarantined" && ageMs >= QUARANTINE_ALERT_MS) {
    return {
      key: "quarantine_aging",
      title: "Quarantined invoice email needs attention",
      body: "An attachment has remained in private quarantine for more than 24 hours.",
    };
  }
  return null;
}
