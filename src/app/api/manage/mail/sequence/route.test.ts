import { beforeEach, describe, expect, it, vi } from "vitest";

const requireInternalOperator = vi.hoisted(() => vi.fn());
const manageApiError = vi.hoisted(() => vi.fn((error: unknown) => {
  const message = error instanceof Error ? error.message : "INTERNAL_ERROR";
  return message === "MAILBOX_ACCESS_REQUIRED"
    ? { status: 403, error: "You do not have access to that mailbox." }
    : { status: 500, error: message };
}));

vi.mock("@/lib/manage/auth", () => ({ requireInternalOperator, manageApiError }));

import { GET } from "./route";

const mailboxId = "11111111-1111-4111-8111-111111111111";

describe("GET /api/manage/mail/sequence", () => {
  beforeEach(() => requireInternalOperator.mockReset());

  it("does not expose a personally assigned mailbox to another operator", async () => {
    const mailboxQuery = {
      select: vi.fn(() => mailboxQuery),
      eq: vi.fn(async () => ({
        data: [{ id: mailboxId, mailbox_type: "personal", assigned_to: "another-operator", status: "active" }],
        error: null,
      })),
    };
    const db = { from: vi.fn(() => mailboxQuery) };
    requireInternalOperator.mockResolvedValue({ db, userId: "operator-1", role: "operator" });

    const response = await GET(new Request(`https://costivra.ai/api/manage/mail/sequence?mode=queue&mailbox=${mailboxId}`));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "You do not have access to that mailbox." });
    expect(db.from).toHaveBeenCalledTimes(1);
  });
});
