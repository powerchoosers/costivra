import { describe, expect, it } from "vitest";
import {
  classifyInboundQueueIncident,
  type InboundQueueHealthRecord,
} from "@/lib/email/inbound-monitor-policy";

const now = Date.parse("2026-08-02T18:30:00.000Z");

function record(
  status: string,
  receivedAt: string,
  updatedAt = receivedAt,
): InboundQueueHealthRecord {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    organization_id: "22222222-2222-4222-8222-222222222222",
    status,
    attempt_count: status === "dead_letter" ? 5 : 1,
    max_attempts: 5,
    error_message: null,
    received_at: receivedAt,
    updated_at: updatedAt,
  };
}

describe("inbound queue operational monitoring", () => {
  it("alerts immediately when bounded retries reach the dead letter state", () => {
    expect(
      classifyInboundQueueIncident(
        record("dead_letter", "2026-08-02T18:29:00.000Z"),
        now,
      )?.key,
    ).toBe("dead_letter");
  });

  it("alerts for processing or queued work that has stopped advancing", () => {
    expect(
      classifyInboundQueueIncident(
        record("processing", "2026-08-02T18:00:00.000Z"),
        now,
      )?.key,
    ).toBe("stuck_processing");
    expect(
      classifyInboundQueueIncident(
        record("queued", "2026-08-02T18:00:00.000Z"),
        now,
      )?.key,
    ).toBe("stuck_queued");
  });

  it("allows normal retries and short quarantines time to resolve", () => {
    expect(
      classifyInboundQueueIncident(
        record("retrying", "2026-08-02T18:25:00.000Z"),
        now,
      ),
    ).toBeNull();
    expect(
      classifyInboundQueueIncident(
        record("quarantined", "2026-08-02T17:30:00.000Z"),
        now,
      ),
    ).toBeNull();
  });

  it("escalates a quarantine after 24 hours", () => {
    expect(
      classifyInboundQueueIncident(
        record("quarantined", "2026-08-01T18:00:00.000Z"),
        now,
      )?.key,
    ).toBe("quarantine_aging");
  });
});
