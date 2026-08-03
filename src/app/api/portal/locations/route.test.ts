import { beforeEach, describe, expect, it, vi } from "vitest";

const requirePortalContext = vi.hoisted(() => vi.fn());
vi.mock("@/lib/portal/repository", () => ({ requirePortalContext }));

import { POST } from "@/app/api/portal/locations/route";

const organizationId = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";

function createDatabase() {
  const inserted: Array<{ table: string; payload: Record<string, unknown> }> = [];
  const locations = {
    select: vi.fn(() => locations),
    eq: vi.fn(() => locations),
    ilike: vi.fn(() => locations),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn((payload: Record<string, unknown>) => {
      inserted.push({ table: "locations", payload });
      return {
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: "44444444-4444-4444-8444-444444444444" }, error: null }),
        })),
      };
    }),
  };
  const audit = {
    insert: vi.fn((payload: Record<string, unknown>) => {
      inserted.push({ table: "audit_events", payload });
      return Promise.resolve({ error: null });
    }),
  };
  return {
    inserted,
    db: { from: vi.fn((table: string) => table === "locations" ? locations : audit) },
  };
}

describe("customer location creation", () => {
  beforeEach(() => requirePortalContext.mockReset());

  it("rejects a non-administrator without touching the database", async () => {
    const db = { from: vi.fn() };
    requirePortalContext.mockResolvedValue({ db, organizationId, userId, role: "member" });
    const response = await POST(new Request("https://costivra.ai/api/portal/locations", {
      method: "POST",
      body: JSON.stringify({ name: "Austin" }),
    }));
    expect(response.status).toBe(403);
    expect(db.from).not.toHaveBeenCalled();
  });

  it("forces the active organization and writes an audit record", async () => {
    const database = createDatabase();
    requirePortalContext.mockResolvedValue({
      db: database.db,
      organizationId,
      userId,
      role: "owner",
    });
    const response = await POST(new Request("https://costivra.ai/api/portal/locations", {
      method: "POST",
      body: JSON.stringify({
        name: "Austin Downtown",
        city: "Austin",
        state: "TX",
        organization_id: "foreign-organization",
      }),
    }));
    expect(response.status).toBe(201);
    expect(database.inserted[0]).toMatchObject({
      table: "locations",
      payload: { organization_id: organizationId, name: "Austin Downtown" },
    });
    expect(database.inserted[1]).toMatchObject({
      table: "audit_events",
      payload: {
        organization_id: organizationId,
        actor_id: userId,
        action: "location.created",
      },
    });
  });
});
