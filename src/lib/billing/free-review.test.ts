import { describe, expect, it, vi } from "vitest";
import { FREE_REVIEW_LIMIT, getFreeReviewStatus } from "@/lib/billing/free-review";

function chain(result: { data?: unknown; count?: number | null; error?: { code?: string } | null }) {
  const query = {
    select: () => query,
    eq: () => query,
    in: () => query,
    neq: () => query,
    limit: async () => result,
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
  return query;
}

describe("free review access", () => {
  it("shows the remaining three-document allowance when the usage table is unavailable", async () => {
    const db = {
      from: vi.fn((table: string) => table === "billing_subscriptions"
        ? chain({ data: [], error: null })
        : table === "free_review_slots"
          ? chain({ count: null, error: { code: "42P01" } })
          : chain({ count: 2, error: null })),
    } as never;

    await expect(getFreeReviewStatus(db, "org-1")).resolves.toEqual({
      mode: "free",
      hasPaidAccess: false,
      used: 2,
      limit: FREE_REVIEW_LIMIT,
      remaining: 1,
    });
  });

  it("recognizes active and trialing subscriptions as paid access", async () => {
    const db = {
      from: vi.fn(() => chain({ data: [{ status: "active" }], error: null })),
    } as never;

    await expect(getFreeReviewStatus(db, "org-1")).resolves.toMatchObject({
      mode: "paid",
      hasPaidAccess: true,
      limit: null,
      remaining: null,
    });
  });
});
