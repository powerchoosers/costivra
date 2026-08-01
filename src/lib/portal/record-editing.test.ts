import { describe, expect, it } from "vitest";
import { normalizeRecordField } from "@/lib/portal/record-editing";

describe("portal inline field validation", () => {
  it("normalizes an allowed field", () => expect(normalizeRecordField("contract", "noticePeriodDays", "30")).toEqual({ column: "notice_period_days", value: 30 }));
  it("rejects protected financial output", () => expect(() => normalizeRecordField("opportunity", "estimatedAnnualValue", 500)).toThrow(/protected/));
  it("rejects invalid enum values", () => expect(() => normalizeRecordField("vendor", "relationshipStatus", "deleted")).toThrow(/valid option/));
});
