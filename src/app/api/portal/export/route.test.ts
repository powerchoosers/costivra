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

  it("returns a private, downloadable accounting workbook", async () => {
    requirePortalContext.mockResolvedValue({ role: "owner", organizationId: "org-1" });
    getPortalData.mockResolvedValue({
      organization: { id: "org-1", name: "Northstar" },
      documents: [{ id: "doc-1", originalFilename: "invoice.pdf" }],
      locations: [], energyMeters: [], vendors: [], vendorContacts: [], vendorCatalog: [], expenseAccounts: [], expenses: [], contracts: [], invoices: [], invoiceLineItems: [], opportunities: [], actions: [], approvalPolicies: [], savings: [], integrations: [], inboundEmailEvents: [], reports: [], team: [], notifications: [], auditEvents: [], evidenceReferences: [],
    });
    const response = await GET();
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toMatch(/^attachment; filename="costivra-accounting-workbook-\d{4}-\d{2}-\d{2}\.xlsx"$/);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("content-type")).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(Array.from(bytes.slice(0, 2))).toEqual([0x50, 0x4b]);
  });
});
