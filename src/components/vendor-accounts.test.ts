import { describe, expect, it } from "vitest";

function formatVendorAccountLabel(
  account: { accountName?: string | null; category?: string; externalAccountReference?: string | null; accountNumberLast4?: string | null },
  locationName?: string | null
): string {
  if (account.accountName) return account.accountName;
  if (locationName) return locationName;
  const ref = account.accountNumberLast4 ?? account.externalAccountReference;
  if (ref) return `${account.category ?? "Vendor account"} · Ending ...${ref.slice(-4)}`;
  return "Vendor account";
}

function maskAccountReference(ref: string | null | undefined): string {
  if (!ref) return "Not recorded";
  const clean = ref.trim();
  if (clean.length <= 4) return `Ending ...${clean}`;
  return `Ending ...${clean.slice(-4)}`;
}

describe("Chunk 3 Vendor Accounts and Locations", () => {
  describe("formatVendorAccountLabel", () => {
    it("prioritizes customer-entered accountName over location or category", () => {
      const label = formatVendorAccountLabel(
        { accountName: "Corporate Tenant", category: "Software", accountNumberLast4: "9988" },
        "Dallas Office"
      );
      expect(label).toBe("Corporate Tenant");
    });

    it("uses locationName if accountName is absent", () => {
      const label = formatVendorAccountLabel(
        { accountName: null, category: "Telecom", accountNumberLast4: "5124" },
        "Dallas Office"
      );
      expect(label).toBe("Dallas Office");
    });

    it("uses category + masked reference if accountName and locationName are absent", () => {
      const label = formatVendorAccountLabel(
        { accountName: null, category: "Energy", accountNumberLast4: "8841" },
        null
      );
      expect(label).toBe("Energy · Ending ...8841");
    });

    it("falls back to 'Vendor account' when all attributes are null", () => {
      const label = formatVendorAccountLabel(
        { accountName: null, category: undefined, accountNumberLast4: null, externalAccountReference: null },
        null
      );
      expect(label).toBe("Vendor account");
    });
  });

  describe("maskAccountReference", () => {
    it("never exposes a full account number longer than 4 digits", () => {
      const masked = maskAccountReference("9876543210");
      expect(masked).toBe("Ending ...3210");
      expect(masked).not.toContain("987654");
    });

    it("handles 4-digit last4 values cleanly", () => {
      expect(maskAccountReference("4321")).toBe("Ending ...4321");
    });

    it("returns 'Not recorded' for empty or null references", () => {
      expect(maskAccountReference(null)).toBe("Not recorded");
      expect(maskAccountReference("")).toBe("Not recorded");
    });
  });

  describe("Unmatched bills separation", () => {
    it("filters invoices where expenseAccountId is null or expenseAccountMatchStatus is not matched", () => {
      const invoices = [
        { id: "inv-1", expenseAccountId: "acc-1", expenseAccountMatchStatus: "matched" },
        { id: "inv-2", expenseAccountId: null, expenseAccountMatchStatus: "unmatched" },
        { id: "inv-3", expenseAccountId: "acc-2", expenseAccountMatchStatus: "needs_review" },
      ];

      const unmatched = invoices.filter(
        (i) => !i.expenseAccountId || i.expenseAccountMatchStatus !== "matched"
      );

      expect(unmatched.map((i) => i.id)).toEqual(["inv-2", "inv-3"]);
    });
  });

  describe("Multi-account vendor summary metrics", () => {
    it("computes active accounts count, location count, and needs review count", () => {
      const accounts = [
        { id: "acc-1", status: "active", locationId: "loc-1" },
        { id: "acc-2", status: "active", locationId: "loc-2" },
        { id: "acc-3", status: "inactive", locationId: "loc-1" },
      ];
      const invoices = [
        { id: "inv-1", locationId: "loc-1", expenseAccountMatchStatus: "matched" },
        { id: "inv-2", locationId: "loc-3", expenseAccountMatchStatus: "needs_review" },
      ];

      const activeAccountsCount = accounts.filter((a) => a.status === "active").length;
      const locationIds = new Set([
        ...accounts.map((a) => a.locationId).filter(Boolean),
        ...invoices.map((i) => i.locationId).filter(Boolean),
      ]);
      const needsReviewCount = invoices.filter((i) => i.expenseAccountMatchStatus !== "matched").length;

      expect(activeAccountsCount).toBe(2);
      expect(locationIds.size).toBe(3); // loc-1, loc-2, loc-3
      expect(needsReviewCount).toBe(1);
    });
  });
});
