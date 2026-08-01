import { describe, expect, it } from "vitest";
import { annualizeSpendCents, formatMoneyInput, parseMoneyToCents } from "./spend";

describe("vendor spend", () => {
  it("parses dollars into integer cents without floating-point arithmetic", () => {
    expect(parseMoneyToCents("$1,234.50")).toBe(123450);
    expect(parseMoneyToCents("18")).toBe(1800);
    expect(parseMoneyToCents("18.9")).toBe(1890);
  });

  it("rejects malformed and over-precise amounts", () => {
    expect(parseMoneyToCents("12.345")).toBeNull();
    expect(parseMoneyToCents("-1.00")).toBeNull();
    expect(parseMoneyToCents("unknown")).toBeNull();
  });

  it("annualizes monthly spend deterministically", () => {
    expect(annualizeSpendCents(1299, "monthly")).toBe(15588);
    expect(annualizeSpendCents(1299, "annual")).toBe(1299);
  });

  it("formats a currency input with a decimal point", () => {
    expect(formatMoneyInput("1234.5")).toBe("1,234.50");
  });
});
