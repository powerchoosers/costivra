import { describe, expect, it } from "vitest";
import { groupRecordedSpend, recordedSpendTotal } from "@/lib/manage/vendor-costs";
import type { ManageExpense } from "@/lib/manage/types";

const expense = (id: string, amount: number, periodEnd: string, currency = "USD"): ManageExpense => ({
  id,
  organizationId: "account-1",
  vendorRelationshipId: "vendor-relationship-1",
  category: "software",
  periodStart: periodEnd,
  periodEnd,
  amount,
  currency,
  status: "reviewed",
});

describe("groupRecordedSpend", () => {
  it("groups actual expense records into deterministic monthly buckets", () => {
    const buckets = groupRecordedSpend([
      expense("one", 125, "2026-01-06"),
      expense("two", 75, "2026-01-24"),
      expense("three", 240, "2026-02-02"),
    ], "monthly", "USD");

    expect(buckets).toEqual([
      { key: "2026-01", label: "Jan 26", total: 200, recordCount: 2 },
      { key: "2026-02", label: "Feb 26", total: 240, recordCount: 1 },
    ]);
  });

  it("does not combine values with a different currency", () => {
    const expenses = [
      expense("usd", 100, "2026-01-06", "USD"),
      expense("cad", 100, "2026-01-06", "CAD"),
    ];
    const buckets = groupRecordedSpend(expenses, "weekly", "USD");

    expect(buckets).toHaveLength(1);
    expect(buckets[0]).toMatchObject({ total: 100, recordCount: 1 });
    expect(recordedSpendTotal(expenses, "USD")).toBe(100);
  });
});
