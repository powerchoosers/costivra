import { describe, expect, it } from "vitest";
import { formatFinancialDate, formatFinancialDateTime } from "./date-format";

describe("formatFinancialDate", () => {
  it("formats ISO YYYY-MM-DD date strings accurately into MM/DD/YYYY", () => {
    expect(formatFinancialDate("2026-03-11")).toBe("03/11/2026");
    expect(formatFinancialDate("2026-08-01")).toBe("08/01/2026");
    expect(formatFinancialDate("2025-12-31")).toBe("12/31/2025");
  });

  it("handles ISO timestamps without timezone day shift bugs", () => {
    expect(formatFinancialDate("2026-03-11T00:00:00.000Z")).toBe("03/11/2026");
    expect(formatFinancialDate("2026-03-11T18:45:00Z")).toBe("03/11/2026");
  });

  it("returns already formatted MM/DD/YYYY strings directly", () => {
    expect(formatFinancialDate("03/11/2026")).toBe("03/11/2026");
    expect(formatFinancialDate("3/11/2026")).toBe("3/11/2026");
  });

  it("handles null, undefined, empty strings with fallback", () => {
    expect(formatFinancialDate(null)).toBe("—");
    expect(formatFinancialDate(undefined)).toBe("—");
    expect(formatFinancialDate("")).toBe("—");
    expect(formatFinancialDate(null, "Not extracted")).toBe("Not extracted");
    expect(formatFinancialDate(undefined, "Not recorded")).toBe("Not recorded");
  });

  it("formats Date objects into MM/DD/YYYY", () => {
    const d = new Date("2026-03-11T00:00:00.000Z");
    expect(formatFinancialDate(d)).toBe("03/11/2026");
  });

  it("formats datetime values with time in specified timezone", () => {
    const formatted = formatFinancialDateTime("2026-03-11T15:30:00.000Z", "—", "UTC");
    expect(formatted).toContain("03/11/2026");
    expect(formatted).toContain("3:30 PM");
  });
});
