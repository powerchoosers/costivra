import { beforeEach, describe, expect, it, vi } from "vitest";

const requirePortalEditor = vi.hoisted(() => vi.fn());
vi.mock("@/lib/portal/repository", () => ({ requirePortalEditor }));

import { PATCH } from "@/app/api/portal/integrations/[id]/route";

describe("PATCH /api/portal/integrations/[id]", () => {
  beforeEach(() => requirePortalEditor.mockReset());

  it("does not turn a catalog record into a fake connection", async () => {
    const auditInsert = vi.fn().mockResolvedValue({ error: null });
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: "11111111-1111-4111-8111-111111111111", provider: "quickbooks", status: "available" },
      error: null,
    });
    const db = {
      from: vi.fn((table: string) => table === "integrations"
        ? {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({ maybeSingle })),
              })),
            })),
          }
        : { insert: auditInsert }),
    };
    requirePortalEditor.mockResolvedValue({
      db,
      organizationId: "22222222-2222-4222-8222-222222222222",
      userId: "33333333-3333-4333-8333-333333333333",
    });

    const response = await PATCH(
      new Request("https://costivra.ai/api/portal/integrations/11111111-1111-4111-8111-111111111111", {
        method: "PATCH",
        body: JSON.stringify({ operation: "connect" }),
      }),
      { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) },
    );

    expect(response.status).toBe(501);
    await expect(response.json()).resolves.toEqual({
      error: "quickbooks setup is not available in-product yet.",
    });
    expect(auditInsert).toHaveBeenCalledWith(expect.objectContaining({
      action: "integration.setup_requested",
    }));
  });
});
