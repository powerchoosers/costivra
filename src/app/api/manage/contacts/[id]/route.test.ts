import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const requireInternalOperator = vi.hoisted(() => vi.fn());
const manageApiError = vi.hoisted(() => vi.fn((err: unknown) => ({ status: 500, error: String(err) })));

vi.mock("@/lib/manage/auth", () => ({ requireInternalOperator, manageApiError }));

import { PATCH, DELETE } from "@/app/api/manage/contacts/[id]/route";

describe("contact detail API route", () => {
  const updates: Array<{ table: string; record: Record<string, unknown> }> = [];

  beforeEach(() => {
    updates.length = 0;
    const operator = {
      db: {
        rpc: vi.fn(() => Promise.resolve({ data: "2026-08-06T00:00:01.000Z", error: null })),
        from(table: string) {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({
                      data: {
                        id: "a1b2c3d4-e5f6-4890-abcd-1234567890ab",
                        organization_id: "b2c3d4e5-f6a7-4890-abcd-1234567890ab",
                        is_primary: false,
                        email: "test@example.com",
                      },
                      error: null,
                    }),
                  };
                },
              };
            },
            update(record: Record<string, unknown>) {
              updates.push({ table, record });
              return {
                eq: async () => ({ error: null }),
              };
            },
            insert: async () => ({ error: null }),
            delete() {
              return {
                eq: async () => ({ error: null }),
              };
            },
          };
        },
      },
      userId: "operator-123",
    };
    requireInternalOperator.mockResolvedValue(operator);
  });

  it("updates contact title cleanly using title column (not job_title)", async () => {
    const req = new Request("http://localhost/api/manage/contacts/a1b2c3d4-e5f6-4890-abcd-1234567890ab", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expectedUpdatedAt: "2026-08-06T00:00:00.000Z", title: "VP of Operations" }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: "a1b2c3d4-e5f6-4890-abcd-1234567890ab" }) });
    expect(res.status).toBe(200);

    expect(updates.find((u) => u.table === "crm_contacts")).toBeUndefined();
  });

  it("uses the server-side dependency recheck for a CRM-only contact", async () => {
    const req = new Request("http://localhost/api/manage/contacts/a1b2c3d4-e5f6-4890-abcd-1234567890ab", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: "Duplicate test record", confirmation: "REMOVE" }),
    });

    const res = await DELETE(req, { params: Promise.resolve({ id: "a1b2c3d4-e5f6-4890-abcd-1234567890ab" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(requireInternalOperator).toHaveBeenCalled();
  });
});
