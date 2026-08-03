import { beforeEach, describe, expect, it, vi } from "vitest";

const requirePortalContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/portal/repository", () => ({ requirePortalContext }));

import { DELETE, PATCH } from "@/app/api/portal/locations/[id]/route";

const locationId = "11111111-1111-4111-8111-111111111111";
const organizationId = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";
const route = { params: Promise.resolve({ id: locationId }) };

function database() {
  const filters: Array<[string, string]> = [];
  const updates: Array<Record<string, unknown>> = [];
  const audits: Array<Record<string, unknown>> = [];
  let locationLookup = 0;
  const locations = {
    select: vi.fn(() => locations),
    eq: vi.fn((column: string, value: string) => {
      filters.push([column, value]);
      return locations;
    }),
    ilike: vi.fn(() => locations),
    neq: vi.fn(() => locations),
    maybeSingle: vi.fn(() => {
      locationLookup += 1;
      return Promise.resolve(locationLookup % 2 === 1
        ? { data: { id: locationId, name: "Austin", status: "active" }, error: null }
        : { data: null, error: null });
    }),
    update: vi.fn((payload: Record<string, unknown>) => {
      updates.push(payload);
      return locations;
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
    db: { from: vi.fn((table: string) => table === "locations" ? locations : audit) },
  };
}

describe("customer location lifecycle", () => {
  beforeEach(() => requirePortalContext.mockReset());

  it("scopes edits to the active tenant", async () => {
    const store = database();
    requirePortalContext.mockResolvedValue({ db: store.db, organizationId, userId, role: "admin" });
    const response = await PATCH(new Request(`https://costivra.ai/api/portal/locations/${locationId}`, {
      method: "PATCH",
      body: JSON.stringify({ name: "Austin HQ", status: "active" }),
    }), route);
    expect(response.status).toBe(200);
    expect(store.filters).toContainEqual(["id", locationId]);
    expect(store.filters).toContainEqual(["organization_id", organizationId]);
    expect(store.updates).toEqual([{ name: "Austin HQ", status: "active", address: null }]);
    expect(store.audits[0]).toMatchObject({ action: "location.updated", resource_id: locationId });
  });

  it("archives instead of deleting historical location context", async () => {
    const store = database();
    requirePortalContext.mockResolvedValue({ db: store.db, organizationId, userId, role: "owner" });
    const response = await DELETE(
      new Request(`https://costivra.ai/api/portal/locations/${locationId}`, { method: "DELETE" }),
      route,
    );
    expect(response.status).toBe(200);
    expect(store.updates).toEqual([{ status: "inactive" }]);
    expect(store.audits[0]).toMatchObject({ action: "location.archived", resource_id: locationId });
  });
});
