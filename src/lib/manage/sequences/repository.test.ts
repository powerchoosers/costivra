import { describe, expect, it } from "vitest";
import { findOutreachBlock, latestEnrollmentTouches, summarizeSequenceStats } from "./repository";

function query(result: { data: unknown; error: unknown }) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    order: () => builder,
    limit: () => builder,
    maybeSingle: async () => result,
    then: (resolve: (value: { data: unknown; error: unknown }) => unknown) => Promise.resolve(result).then(resolve),
  };
  return builder;
}

describe("summarizeSequenceStats", () => {
  it("counts real sends, replies, active enrollments, and future touches only", () => {
    const now = Date.parse("2026-08-10T12:00:00.000Z");
    expect(summarizeSequenceStats("sequence-1", [
      { sequence_id: "sequence-1", state: "active", next_action_at: "2026-08-10T15:00:00.000Z" },
      { sequence_id: "sequence-1", state: "completed", next_action_at: null },
      { sequence_id: "sequence-1", state: "pending", next_action_at: "2026-08-09T15:00:00.000Z" },
      { sequence_id: "sequence-1", state: "paused", next_action_at: null },
    ], [
      { sequence_id: "sequence-1", provider_status: "delivered" },
      { sequence_id: "sequence-1", provider_status: "failed" },
    ], [
      { sequence_id: "sequence-1", event_type: "reply_received" },
      { sequence_id: "sequence-1", event_type: "email_sent" },
    ], now)).toEqual({ activeEnrollments: 1, scheduledNext24Hours: 1, sent: 1, replies: 1 });
  });
});

describe("latestEnrollmentTouches", () => {
  it("returns the newest real touch and ignores staging-only events", () => {
    expect(latestEnrollmentTouches([
      { enrollment_id: "enrollment-1", event_type: "enrolled", occurred_at: "2026-08-10T08:00:00.000Z" },
      { enrollment_id: "enrollment-1", event_type: "email_sent", occurred_at: "2026-08-10T09:00:00.000Z" },
      { enrollment_id: "enrollment-1", event_type: "task_created", occurred_at: "2026-08-10T10:00:00.000Z" },
      { enrollment_id: "enrollment-1", event_type: "email_delivered", occurred_at: "2026-08-10T09:30:00.000Z" },
      { enrollment_id: "enrollment-2", event_type: "step_scheduled", occurred_at: "2026-08-10T11:00:00.000Z" },
    ])).toEqual(new Map([["enrollment-1", "2026-08-10T10:00:00.000Z"]]));
  });
});

describe("findOutreachBlock", () => {
  it("blocks an explicit marketing opt-out", async () => {
    const db = {
      from(table: string) {
        if (table === "crm_outreach_suppressions") return query({ data: [], error: null });
        if (table === "crm_marketing_consents") return query({ data: { status: "opted_out" }, error: null });
        if (table === "crm_email_messages") return query({ data: null, error: null });
        throw new Error(`Unexpected table ${table}`);
      },
    };
    await expect(findOutreachBlock(db as never, { contactId: "contact-1", email: "person@example.com" })).resolves.toEqual({
      code: "marketing_opted_out",
      reason: "Contact has opted out of email marketing.",
      stopReason: "unsubscribe",
    });
  });

  it("blocks a prior provider suppression", async () => {
    const db = {
      from(table: string) {
        if (table === "crm_outreach_suppressions") return query({ data: [], error: null });
        if (table === "crm_marketing_consents") return query({ data: null, error: null });
        if (table === "crm_email_messages") return query({ data: { provider_status: "bounced" }, error: null });
        throw new Error(`Unexpected table ${table}`);
      },
    };
    await expect(findOutreachBlock(db as never, { contactId: "contact-1", email: "person@example.com" })).resolves.toEqual({
      code: "prior_provider_suppression",
      reason: "Contact has a prior bounced email result.",
      stopReason: "bounce",
    });
  });

  it("allows a contact whose latest consent is opted in", async () => {
    const db = {
      from(table: string) {
        if (table === "crm_outreach_suppressions") return query({ data: [], error: null });
        if (table === "crm_marketing_consents") return query({ data: { status: "opted_in" }, error: null });
        if (table === "crm_email_messages") return query({ data: null, error: null });
        throw new Error(`Unexpected table ${table}`);
      },
    };
    await expect(findOutreachBlock(db as never, { contactId: "contact-1", email: "person@example.com" })).resolves.toBeNull();
  });
});
