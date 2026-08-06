import { beforeEach, describe, expect, it, vi } from "vitest";

const requireInternalOperator = vi.hoisted(() => vi.fn());
const manageApiError = vi.hoisted(() => vi.fn(() => ({ status: 500, error: "Request failed" })));
vi.mock("@/lib/manage/auth", () => ({ requireInternalOperator, manageApiError }));

import { POST } from "@/app/api/manage/locations/route";

const organizationId = "22222222-2222-4222-8222-222222222222";
const locationId = "44444444-4444-4444-8444-444444444444";

function createDatabase() {
  const inserted: Array<{ table: string; payload: Record<string, unknown> }> = [];
  const organizations = {
    select: vi.fn(() => organizations),
    eq: vi.fn(() => organizations),
    maybeSingle: vi.fn().mockResolvedValue({ data: { id: organizationId }, error: null }),
  };
  const locations = {
    select: vi.fn(() => locations),
    eq: vi.fn(() => locations),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn((payload: Record<string, unknown>) => {
      inserted.push({ table: "locations", payload });
      return {
        select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: locationId }, error: null }) })),
      };
    }),
  };
  const audit = {
    insert: vi.fn((payload: Record<string, unknown>) => {
      inserted.push({ table: "internal_audit_events", payload });
      return Promise.resolve({ error: null });
    }),
  };
  return {
    inserted,
    db: { from: vi.fn((table: string) => table === "organizations" ? organizations : table === "locations" ? locations : audit) },
  };
}

describe("internal location creation", () => {
  beforeEach(() => requireInternalOperator.mockReset());

  it("requires a complete street address", async () => {
    const database = createDatabase();
    requireInternalOperator.mockResolvedValue({ db: database.db, userId: "operator-id" });
    const response = await POST(new Request("https://costivra.ai/api/manage/locations", {
      method: "POST",
      body: JSON.stringify({ organizationId, name: "Austin HQ", city: "Austin" }),
    }));
    expect(response.status).toBe(400);
    expect(database.db.from).not.toHaveBeenCalled();
  });

  it("writes the account-scoped location and audit event", async () => {
    const database = createDatabase();
    requireInternalOperator.mockResolvedValue({ db: database.db, userId: "operator-id" });
    const response = await POST(new Request("https://costivra.ai/api/manage/locations", {
      method: "POST",
      body: JSON.stringify({ organizationId, name: "Austin HQ", line1: "123 Main Street", city: "Austin", state: "TX", postalCode: "78701", country: "US" }),
    }));
    expect(response.status).toBe(201);
    expect(database.inserted[0]).toMatchObject({ table: "locations", payload: { organization_id: organizationId, name: "Austin HQ" } });
    expect(database.inserted[1]).toMatchObject({ table: "internal_audit_events", payload: { organization_id: organizationId, action: "crm.location_created", resource_id: locationId } });
  });
});
