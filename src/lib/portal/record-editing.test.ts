import { describe, expect, it } from "vitest";
import { normalizeRecordField } from "@/lib/portal/record-editing";

describe("portal inline field validation", () => {
  it("normalizes an allowed field", () => expect(normalizeRecordField("contract", "noticePeriodDays", "30")).toEqual({ column: "notice_period_days", value: 30 }));
  it("rejects protected financial output", () => expect(() => normalizeRecordField("opportunity", "estimatedAnnualValue", 500)).toThrow(/protected/));
  it("rejects invalid enum values", () => expect(() => normalizeRecordField("vendor", "relationshipStatus", "deleted")).toThrow(/valid option/));
  it("accepts a location link and allows clearing it", () => {
    expect(normalizeRecordField("expense", "locationId", "11111111-1111-4111-8111-111111111111")).toEqual({ column: "location_id", value: "11111111-1111-4111-8111-111111111111" });
    expect(normalizeRecordField("contract", "locationId", "")).toEqual({ column: "location_id", value: null });
  });
});
