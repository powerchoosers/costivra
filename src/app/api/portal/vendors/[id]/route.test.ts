import { beforeEach, describe, expect, it, vi } from "vitest";

const requirePortalContext = vi.hoisted(() => vi.fn());
const requirePortalEditor = vi.hoisted(() => vi.fn());
const apiError = vi.hoisted(() => vi.fn((err: unknown) => ({ status: 500, error: String(err) })));

vi.mock("@/lib/portal/repository", () => ({ requirePortalContext, requirePortalEditor }));
vi.mock("@/lib/portal/http", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/portal/http")>()),
  apiError,
}));

import { DELETE, PATCH } from "@/app/api/portal/vendors/[id]/route";

describe("portal vendor DELETE API route", () => {
  let queriedTable = "";
  let queriedFilterKey = "";
  let queriedFilterVal = "";

  beforeEach(() => {
    queriedTable = "";
    queriedFilterKey = "";
    queriedFilterVal = "";

    const context = {
      db: {
        from(table: string) {
          if (table === "organization_vendors") {
            return {
              select() {
                return {
                  eq() {
                    return {
                      eq() {
                        return {
                          maybeSingle: async () => ({
                            data: { id: "a1b2c3d4-e5f6-4890-abcd-1234567890ab", vendor_id: "b2c3d4e5-f6a7-4890-abcd-1234567890ab" },
                          }),
                        };
                      },
                      maybeSingle: async () => ({
                        data: { id: "a1b2c3d4-e5f6-4890-abcd-1234567890ab", vendor_id: "b2c3d4e5-f6a7-4890-abcd-1234567890ab" },
                      }),
                    };
                  },
                };
              },
              insert: async () => ({ error: null }),
              delete() {
                return {
                  eq() {
                    return {
                      eq: async () => ({ error: null }),
                    };
                  },
                };
              },
            };
          }

          return {
            insert: async () => ({ error: null }),
            select() {
              return {
                eq() {
                  return {
                    eq(key2: string, val2: string) {
                      queriedTable = table;
                      queriedFilterKey = key2;
                      queriedFilterVal = val2;
                      return Promise.resolve({ count: 0, error: null });
                    },
                  };
                },
              };
            },
          };
        },
      },
      organizationId: "c3d4e5f6-a7b8-4890-abcd-1234567890ab",
      userId: "d4e5f6a7-b8c9-4890-abcd-1234567890ab",
      role: "owner",
    };
    requirePortalContext.mockResolvedValue(context);
    requirePortalEditor.mockResolvedValue(context);
  });

  it("does not allow a member to terminate a vendor relationship", async () => {
    requirePortalEditor.mockResolvedValueOnce({
      db: { from: vi.fn() },
      organizationId: "c3d4e5f6-a7b8-4890-abcd-1234567890ab",
      userId: "d4e5f6a7-b8c9-4890-abcd-1234567890ab",
      role: "member",
    });
    const req = new Request("http://localhost/api/portal/vendors/a1b2c3d4-e5f6-4890-abcd-1234567890ab", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expectedUpdatedAt: "2026-08-06T00:00:00.000Z", relationshipStatus: "terminated", reason: "No longer needed" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "a1b2c3d4-e5f6-4890-abcd-1234567890ab" }) });
    expect(res.status).toBe(403);
  });

  it("queries financial tables using organization_vendor_id (not canonical vendor_id)", async () => {
    const req = new Request("http://localhost/api/portal/vendors/a1b2c3d4-e5f6-4890-abcd-1234567890ab", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: "Duplicate test record", confirmation: "REMOVE" }),
    });

    const res = await DELETE(req, { params: Promise.resolve({ id: "a1b2c3d4-e5f6-4890-abcd-1234567890ab" }) });
    expect(res.status).toBe(200);

    expect(queriedTable).toBeTruthy();
    expect(queriedFilterKey).toBe("organization_vendor_id");
    expect(queriedFilterVal).toBe("a1b2c3d4-e5f6-4890-abcd-1234567890ab");
  });
});
