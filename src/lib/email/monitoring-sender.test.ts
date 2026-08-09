import { describe, expect, it } from "vitest";
import { isApprovedMonitoringSender, normalizeMonitoringSender } from "./monitoring-sender";

describe("monitoring sender authorization", () => {
  it("normalizes display-name email addresses", () => {
    expect(normalizeMonitoringSender("Vendor Billing <Billing@Vendor.com>")).toBe("billing@vendor.com");
  });

  it("requires an exact approved address", () => {
    expect(isApprovedMonitoringSender("billing@vendor.com", "BILLING@VENDOR.COM")).toBe(true);
    expect(isApprovedMonitoringSender("spoof-billing@vendor.com", "billing@vendor.com")).toBe(false);
    expect(isApprovedMonitoringSender("billing@vendor.com.evil.invalid", "billing@vendor.com")).toBe(false);
  });

  it("does not authorize a missing sender or missing approval", () => {
    expect(isApprovedMonitoringSender(null, "billing@vendor.com")).toBe(false);
    expect(isApprovedMonitoringSender("billing@vendor.com", null)).toBe(false);
  });
});
