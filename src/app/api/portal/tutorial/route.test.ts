import { beforeEach, describe, expect, it, vi } from "vitest";

const requirePortalContext = vi.hoisted(() => vi.fn());

vi.mock("@/lib/portal/repository", () => ({ requirePortalContext }));

import { GET, PATCH } from "./route";

function database(options: { existing?: unknown; patchResult?: unknown } = {}) {
  const upsert = vi.fn();
  const builder = {
    select: () => builder,
    eq: () => builder,
    maybeSingle: async () => ({ data: options.existing ?? null, error: null }),
    upsert: (value: unknown) => {
      upsert(value);
      return builder;
    },
    single: async () => ({ data: options.patchResult ?? null, error: null }),
  };
  return { from: vi.fn(() => builder), upsert };
}

describe("/api/portal/tutorial", () => {
  beforeEach(() => {
    requirePortalContext.mockReset();
  });

  it("returns a not-started state for a new member", async () => {
    requirePortalContext.mockResolvedValue({ db: database(), organizationId: "org-1", userId: "user-1" });

    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      tutorial: { version: 1, status: "not_started", current_step: 0, completed_at: null, skipped_at: null },
    });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("persists a member's current step and completion state", async () => {
    const db = database({ patchResult: { version: 1, status: "completed", current_step: 4, completed_at: "2026-08-16T00:00:00.000Z", skipped_at: null } });
    requirePortalContext.mockResolvedValue({ db, organizationId: "org-1", userId: "user-1" });

    const response = await PATCH(new Request("http://localhost/api/portal/tutorial", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "completed", currentStep: 4 }),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ tutorial: { status: "completed", current_step: 4 } });
    expect(db.upsert).toHaveBeenCalledWith(expect.objectContaining({ organization_id: "org-1", user_id: "user-1", version: 1, status: "completed", current_step: 4 }));
  });

  it("rejects a step outside the five-step tutorial", async () => {
    requirePortalContext.mockResolvedValue({ db: database(), organizationId: "org-1", userId: "user-1" });

    const response = await PATCH(new Request("http://localhost/api/portal/tutorial", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "in_progress", currentStep: 5 }),
    }));

    expect(response.status).toBe(400);
  });
});
