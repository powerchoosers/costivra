import { beforeEach, describe, expect, it, vi } from "vitest";

const requirePortalContext = vi.hoisted(() => vi.fn());
const getPortalData = vi.hoisted(() => vi.fn());
vi.mock("@/lib/portal/repository", () => ({ requirePortalContext, getPortalData }));

import { GET } from "@/app/api/portal/export/route";

describe("workspace export", () => {
  beforeEach(() => {
    requirePortalContext.mockReset();
    getPortalData.mockReset();
  });

  it("rejects non-administrators before loading export data", async () => {
    requirePortalContext.mockResolvedValue({ role: "member", organizationId: "org-1" });
    const response = await GET();
    expect(response.status).toBe(403);
    expect(getPortalData).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("returns a private, downloadable structured export", async () => {
    requirePortalContext.mockResolvedValue({ role: "owner", organizationId: "org-1" });
    getPortalData.mockResolvedValue({
      organization: { id: "org-1", name: "Northstar" },
      documents: [{ id: "doc-1", originalFilename: "invoice.pdf" }],
    });
    const response = await GET();
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toMatch(/^attachment; filename="costivra-workspace-\d{4}-\d{2}-\d{2}\.json"$/);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(payload).toMatchObject({
      format: "costivra-workspace-export",
      version: 1,
      organizationId: "org-1",
      data: { organization: { id: "org-1" } },
    });
    expect(JSON.stringify(payload)).not.toContain("storage_path");
  });
});
