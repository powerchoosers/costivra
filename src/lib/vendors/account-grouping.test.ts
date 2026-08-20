import { describe, expect, it } from "vitest";
import { groupVendorInvoicesByAccount } from "./account-grouping";

describe("groupVendorInvoicesByAccount", () => {
  it("groups invoices by a saved expense-account id", () => {
    const groups = groupVendorInvoicesByAccount([
      { id: "invoice-1", expenseAccountId: "account-1", accountNumberLast4: "1234", locationId: "location-1", locationName: "Dallas", energyService: null },
      { id: "invoice-2", expenseAccountId: "account-1", accountNumberLast4: "1234", locationId: "location-1", locationName: "Dallas", energyService: null },
      { id: "invoice-3", expenseAccountId: "account-2", accountNumberLast4: "1234", locationId: "location-1", locationName: "Dallas", energyService: null },
    ]);

    expect(groups.map((group) => group.invoices.map((invoice) => invoice.id))).toEqual([
      ["invoice-1", "invoice-2"],
      ["invoice-3"],
    ]);
  });

  it("uses source identity and location when an expense account has not been matched", () => {
    const groups = groupVendorInvoicesByAccount([
      { id: "invoice-1", expenseAccountId: null, accountNumberLast4: "1234", locationId: "location-1", locationName: "Dallas", energyService: null },
      { id: "invoice-2", expenseAccountId: null, accountNumberLast4: "1234", locationId: "location-1", locationName: "Dallas", energyService: null },
      { id: "invoice-3", expenseAccountId: null, accountNumberLast4: "1234", locationId: "location-2", locationName: "Austin", energyService: null },
    ]);

    expect(groups.map((group) => group.invoices.map((invoice) => invoice.id))).toEqual([
      ["invoice-1", "invoice-2"],
      ["invoice-3"],
    ]);
  });

  it("uses a saved meter as the strongest unmatched account identity", () => {
    const groups = groupVendorInvoicesByAccount([
      { id: "invoice-1", expenseAccountId: null, accountNumberLast4: "1234", locationId: "location-1", locationName: "Dallas", energyService: { meterId: "meter-1" } },
      { id: "invoice-2", expenseAccountId: null, accountNumberLast4: "5678", locationId: "location-1", locationName: "Dallas", energyService: { meterId: "meter-1" } },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].invoices.map((invoice) => invoice.id)).toEqual(["invoice-1", "invoice-2"]);
  });

  it("does not merge bills with no recorded account or meter identifier", () => {
    const groups = groupVendorInvoicesByAccount([
      { id: "invoice-1", expenseAccountId: null, accountNumberLast4: null, locationId: "location-1", locationName: "Dallas", energyService: null },
      { id: "invoice-2", expenseAccountId: null, accountNumberLast4: null, locationId: "location-1", locationName: "Dallas", energyService: null },
    ]);

    expect(groups.map((group) => group.invoices.map((invoice) => invoice.id))).toEqual([
      ["invoice-1"],
      ["invoice-2"],
    ]);
  });
});
