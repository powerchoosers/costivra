import { beforeEach, describe, expect, it, vi } from "vitest";

const requirePortalContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/portal/repository", () => ({ requirePortalContext }));

import { DELETE, PATCH } from "@/app/api/portal/team/[id]/route";

const organizationId = "22222222-2222-4222-8222-222222222222";
const operatorId = "33333333-3333-4333-8333-333333333333";
const targetId = "44444444-4444-4444-8444-444444444444";
const route = { params: Promise.resolve({ id: targetId }) };

function database(targetRole = "member") {
  const filters: Array<[string, string]> = [];
  const updates: Array<Record<string, unknown>> = [];
  const audits: Array<Record<string, unknown>> = [];
  let deleted = false;
  const memberships = {
    select: vi.fn(() => memberships),
    eq: vi.fn((column: string, value: string) => {
      filters.push([column, value]);
      return memberships;
    }),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { user_id: targetId, role: targetRole },
      error: null,
    }),
    update: vi.fn((payload: Record<string, unknown>) => {
      updates.push(payload);
      return memberships;
    }),
    delete: vi.fn(() => {
      deleted = true;
      return memberships;
    }),
  };
  const audit = {
    insert: vi.fn((payload: Record<string, unknown>) => {
      audits.push(payload);
      return Promise.resolve({ error: null });
    }),
  };
  return {
    filters,
    updates,
    audits,
    get deleted() { return deleted; },
    db: { from: vi.fn((table: string) => table === "organization_memberships" ? memberships : audit) },
  };
}

describe("team member lifecycle", () => {
  beforeEach(() => requirePortalContext.mockReset());

  it("updates a non-owner role inside the active organization", async () => {
    const store = database();
    requirePortalContext.mockResolvedValue({
      db: store.db,
      organizationId,
      userId: operatorId,
      role: "owner",
    });
    const response = await PATCH(new Request(`https://costivra.ai/api/portal/team/${targetId}`, {
      method: "PATCH",
      body: JSON.stringify({ role: "viewer" }),
    }), route);
    expect(response.status).toBe(200);
    expect(store.filters).toContainEqual(["organization_id", organizationId]);
    expect(store.filters).toContainEqual(["user_id", targetId]);
    expect(store.updates).toEqual([{ role: "viewer" }]);
    expect(store.audits[0]).toMatchObject({
      action: "team_member.role_updated",
      resource_id: targetId,
      metadata: { previous_role: "member", role: "viewer" },
    });
  });

  it("does not let this control change or remove the workspace owner", async () => {
    const store = database("owner");
    requirePortalContext.mockResolvedValue({
      db: store.db,
      organizationId,
      userId: operatorId,
      role: "owner",
    });
    const patchResponse = await PATCH(new Request(`https://costivra.ai/api/portal/team/${targetId}`, {
      method: "PATCH",
      body: JSON.stringify({ role: "member" }),
    }), route);
    const deleteResponse = await DELETE(
      new Request(`https://costivra.ai/api/portal/team/${targetId}`, { method: "DELETE" }),
      route,
    );
    expect(patchResponse.status).toBe(409);
    expect(deleteResponse.status).toBe(409);
    expect(store.updates).toEqual([]);
    expect(store.deleted).toBe(false);
  });

  it("removes membership without deleting the person's profile", async () => {
    const store = database("viewer");
    requirePortalContext.mockResolvedValue({
      db: store.db,
      organizationId,
      userId: operatorId,
      role: "admin",
    });
    const response = await DELETE(
      new Request(`https://costivra.ai/api/portal/team/${targetId}`, { method: "DELETE" }),
      route,
    );
    expect(response.status).toBe(200);
    expect(store.deleted).toBe(true);
    expect(store.db.from).not.toHaveBeenCalledWith("profiles");
    expect(store.audits[0]).toMatchObject({
      action: "team_member.removed",
      resource_id: targetId,
    });
  });
});
