import { beforeEach, describe, expect, it, vi } from "vitest";

const requirePortalEditor = vi.hoisted(() => vi.fn());
const createServerSupabaseClient = vi.hoisted(() => vi.fn());

vi.mock("@/lib/portal/repository", () => ({
  requirePortalContext: vi.fn(),
  requirePortalEditor,
}));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient }));

import { DELETE } from "@/app/api/portal/integrations/mailbox/route";

describe("DELETE /api/portal/integrations/mailbox", () => {
  beforeEach(() => {
    requirePortalEditor.mockReset();
    createServerSupabaseClient.mockReset();
  });

  it("deletes the tenant-scoped connection so stored OAuth tokens and rules are removed", async () => {
    const organizationId = "22222222-2222-4222-8222-222222222222";
    const userId = "33333333-3333-4333-8333-333333333333";
    const connectionId = "11111111-1111-4111-8111-111111111111";
    const lookupMaybeSingle = vi.fn().mockResolvedValue({
      data: { id: connectionId, provider: "google_gmail" },
      error: null,
    });
    const lookupOrganization = vi.fn(() => ({ maybeSingle: lookupMaybeSingle }));
    const lookupId = vi.fn(() => ({ eq: lookupOrganization }));
    const deleteOrganization = vi.fn().mockResolvedValue({ error: null });
    const deleteId = vi.fn(() => ({ eq: deleteOrganization }));
    const deleteConnection = vi.fn(() => ({ eq: deleteId }));
    const auditInsert = vi.fn().mockResolvedValue({ error: null });
    const db = {
      from: vi.fn((table: string) => table === "mailbox_oauth_connections"
        ? {
            select: vi.fn(() => ({ eq: lookupId })),
            delete: deleteConnection,
          }
        : { insert: auditInsert }),
    };
    requirePortalEditor.mockResolvedValue({ organizationId, userId });
    createServerSupabaseClient.mockReturnValue(db);

    const response = await DELETE(new Request(`https://costivra.ai/api/portal/integrations/mailbox?id=${connectionId}`, { method: "DELETE" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ disconnected: true });
    expect(deleteConnection).toHaveBeenCalledTimes(1);
    expect(deleteId).toHaveBeenCalledWith("id", connectionId);
    expect(deleteOrganization).toHaveBeenCalledWith("organization_id", organizationId);
    expect(auditInsert).toHaveBeenCalledWith(expect.objectContaining({
      action: "mailbox.disconnected",
      metadata: { provider: "google_gmail", stored_tokens_deleted: true },
    }));
  });

  it("does not report success for a connection outside the active tenant", async () => {
    const lookupMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const db = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle: lookupMaybeSingle })),
          })),
        })),
      })),
    };
    requirePortalEditor.mockResolvedValue({
      organizationId: "22222222-2222-4222-8222-222222222222",
      userId: "33333333-3333-4333-8333-333333333333",
    });
    createServerSupabaseClient.mockReturnValue(db);

    const response = await DELETE(new Request("https://costivra.ai/api/portal/integrations/mailbox?id=11111111-1111-4111-8111-111111111111", { method: "DELETE" }));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Mailbox connection was not found." });
  });
});
