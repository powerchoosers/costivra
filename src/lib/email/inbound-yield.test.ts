import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { recordInboundEmailJobYield } from "@/lib/email/inbound-intake";

describe("inbound worker budget yield", () => {
  it("requeues with the lock guard and does not consume a failure attempt", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: "event-1" }, error: null });
    const chain = {
      eq: vi.fn(() => chain),
      select: vi.fn(() => chain),
      maybeSingle,
    };
    const update = vi.fn(() => chain);
    const db = { from: vi.fn(() => ({ update })) };

    const result = await recordInboundEmailJobYield(db as never, {
      id: "event-1",
      attempt_count: 3,
      lock_token: "lock-1",
    } as never);

    expect(result.status).toBe("queued");
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      status: "queued",
      attempt_count: 2,
      lock_token: null,
      error_message: null,
    }));
    expect(chain.eq).toHaveBeenNthCalledWith(1, "id", "event-1");
    expect(chain.eq).toHaveBeenNthCalledWith(2, "lock_token", "lock-1");
  });
});
