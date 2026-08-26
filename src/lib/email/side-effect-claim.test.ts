import { describe, expect, it, vi } from "vitest";
import { claimExternalSideEffect } from "./side-effect-claim";

type State = {
  status: string;
  request_hash: string;
  id: string;
  provider_reference: string | null;
  failure_class?: string | null;
  retry_count?: number | null;
};

function dbFor(state: State | null) {
  return {
    from(table: string) {
      if (table !== "external_side_effects") throw new Error(`Unexpected table: ${table}`);
      return {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({ single: async () => state
            ? { data: null, error: { code: "23505" } }
            : { data: { id: "effect-1", status: "approved" }, error: null } })),
        })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle: async () => ({ data: state, error: null }) })),
          })),
        })),
        update: vi.fn((row: Record<string, unknown>) => {
          const query: {
            eq: ReturnType<typeof vi.fn>;
            is: ReturnType<typeof vi.fn>;
            select: ReturnType<typeof vi.fn>;
          } = {} as never;
          query.eq = vi.fn(() => query);
          query.is = vi.fn(() => query);
          query.select = vi.fn(() => ({ maybeSingle: async () => {
              if (state?.status !== "failed") return { data: null, error: null };
              state.status = String(row.status);
              state.retry_count = Number(row.retry_count ?? state.retry_count ?? 0);
              return { data: { id: state.id }, error: null };
            } }));
          return query;
        }),
      };
    },
  } as never;
}

const input = {
  organizationId: "org-1",
  type: "lifecycle_email",
  destination: "owner@example.com",
  idempotencyKey: "lifecycle/org-1/finding_ready/finding-1/owner@example.com",
  requestHash: "hash-1",
  authorizationMethod: "lifecycle_event_policy_v1",
};

describe("external side-effect claims", () => {
  it("lets only the insert winner claim a new send", async () => {
    const result = await claimExternalSideEffect(dbFor(null), input);
    expect(result).toEqual({ claimed: true, id: "effect-1" });
  });

  it("does not send again when another worker has the claim", async () => {
    const result = await claimExternalSideEffect(dbFor({ id: "effect-1", status: "approved", request_hash: "hash-1", provider_reference: null }), input);
    expect(result).toMatchObject({ claimed: false, duplicate: true, id: "effect-1" });
  });

  it("reclaims a failed side effect with a compare-and-set update", async () => {
    const state = { id: "effect-1", status: "failed", request_hash: "hash-1", provider_reference: null, failure_class: "safe_retry", retry_count: 1 };
    const result = await claimExternalSideEffect(dbFor(state), input);
    expect(result).toEqual({ claimed: true, id: "effect-1" });
    expect(state.retry_count).toBe(2);
  });

  it.each([
    { provider_reference: "msg-1", failure_class: "safe_retry", retry_count: 1 },
    { provider_reference: null, failure_class: "provider_ambiguous", retry_count: 1 },
    { provider_reference: null, failure_class: "safe_retry", retry_count: 3 },
  ])("does not retry an effect that needs reconciliation or human review", async (safety) => {
    const result = await claimExternalSideEffect(dbFor({
      id: "effect-1",
      status: "failed",
      request_hash: "hash-1",
      ...safety,
    }), input);
    expect(result).toMatchObject({ claimed: false, duplicate: true, id: "effect-1", status: "failed" });
  });

  it("rejects a reused idempotency key with different content", async () => {
    const result = await claimExternalSideEffect(dbFor({ id: "effect-1", status: "sent", request_hash: "different", provider_reference: "msg-1" }), input);
    expect(result).toEqual({ claimed: false, duplicate: false, error: "EMAIL_IDEMPOTENCY_CONTENT_MISMATCH" });
  });
});
