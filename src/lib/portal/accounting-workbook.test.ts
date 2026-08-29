import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { createAccountingWorkbook } from "@/lib/portal/accounting-workbook";
import type { PortalData } from "@/lib/portal/types";

function data(): PortalData {
  return {
    organization: { id: "org-1", name: "Northstar", legalName: null, industry: null, timezone: "America/Chicago", currency: "USD", primaryContactName: null, reviewThreshold: 0, settings: {}, logoUrl: null, isSampleWorkspace: false },
    currentUser: { id: "user-1", email: "owner@example.com", fullName: "Owner", role: "owner", avatarUrl: null },
    vendors: [{ id: "vendor-1", relationshipId: "relationship-1", name: "Northwind Energy", category: "Energy", website: null, canonicalName: "Northwind Energy", canonicalCategory: "Energy", canonicalWebsite: null, annualizedSpend: 12000, relationshipStatus: "active", spendCadence: "monthly", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", logoUrl: null }],
    invoices: [{ id: "invoice-1", documentId: "document-1", vendorName: "Northwind Energy", invoiceNumber: "INV-1", invoiceDate: "2026-01-01", dueDate: "2026-01-20", currency: "USD", totalAmount: 1000, reviewStatus: "ready", vendorMatchStatus: "matched", workspaceCustomerMatchStatus: "matched", expenseAccountMatchStatus: "matched", serviceLocationMatchStatus: "matched", reconciliationStatus: "reconciled", lineItemCount: 1, vendorId: "vendor-1", servicePeriodStart: "2026-01-01", servicePeriodEnd: "2026-01-31", accountNumberLast4: null, purchaseOrderNumber: null, subtotal: null, taxTotal: null, feeTotal: null, creditTotal: null, previousBalance: null, paymentsAndCredits: null, balanceForward: null, currentCharges: null, currentPeriodCredits: null, amountDue: 1000, extractionConfidence: 98, reconciliationDifference: 0, reviewPriority: "normal", reviewNotes: null, expenseCategory: "Energy", expenseAccountId: null, locationId: null, locationName: null, energyService: null, updatedAt: "2026-01-01T00:00:00.000Z" }],
    locations: [], energyMeters: [], vendorContacts: [], vendorCatalog: [], expenseAccounts: [], expenses: [], contracts: [], documents: [], invoiceLineItems: [], opportunities: [], actions: [], approvalPolicies: [], savings: [], integrations: [], emailIntake: null, inboundEmailEvents: [], reports: [], team: [], notifications: [], auditEvents: [], evidenceReferences: [],
  };
}

describe("accounting workbook export", () => {
  it("creates reporting and source sheets with formula-backed totals", async () => {
    const output = await createAccountingWorkbook(data(), new Date("2026-08-29T00:00:00.000Z"));
    expect(Array.from(output.slice(0, 2))).toEqual([0x50, 0x4b]);
    const workbook = new ExcelJS.Workbook();
    // ExcelJS's Node typings lag the Node 24 generic Buffer type; the runtime
    // accepts the same bytes as an ArrayBuffer, so keep this test type-safe
    // without changing the production export contract.
    await workbook.xlsx.load(output as unknown as ArrayBuffer);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toContain("Reporting");
    expect(workbook.getWorksheet("Vendors")?.getCell("A2").value).toBe("Northwind Energy");
    expect(workbook.getWorksheet("Reporting")?.getCell("B6").value).toMatchObject({ formula: "SUM('Vendors'!C2:C2)" });
    expect(workbook.getWorksheet("Reporting")?.getImages()).toHaveLength(1);
  });
});
