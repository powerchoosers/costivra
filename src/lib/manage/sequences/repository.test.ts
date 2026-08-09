import { describe, expect, it } from "vitest";
import { summarizeSequenceStats } from "./repository";

describe("summarizeSequenceStats", () => {
  it("counts real sends, replies, active enrollments, and future touches only", () => {
    const now = Date.parse("2026-08-10T12:00:00.000Z");
    expect(summarizeSequenceStats("sequence-1", [
      { sequence_id: "sequence-1", state: "active", next_action_at: "2026-08-10T15:00:00.000Z" },
      { sequence_id: "sequence-1", state: "completed", next_action_at: null },
      { sequence_id: "sequence-1", state: "pending", next_action_at: "2026-08-09T15:00:00.000Z" },
    ], [
      { sequence_id: "sequence-1", provider_status: "delivered" },
      { sequence_id: "sequence-1", provider_status: "failed" },
    ], [
      { sequence_id: "sequence-1", event_type: "reply_received" },
      { sequence_id: "sequence-1", event_type: "email_sent" },
    ], now)).toEqual({ activeEnrollments: 2, scheduledNext24Hours: 1, sent: 1, replies: 1 });
  });
});
