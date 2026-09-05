import { describe, expect, it } from "vitest";
import {
  calculateNextExpectedInvoiceDate,
  getDynamicPrimaryAction,
  getMonitoringStateLabel,
  getVendorNextStep,
  isValidMonitoringEmailAddress,
} from "./monitoring";

describe("Vendor Monitoring Domain", () => {
  it("returns correct labels and copy for monitoring states", () => {
    expect(getMonitoringStateLabel("active").label).toBe("Active");
    expect(getMonitoringStateLabel("test_needed").label).toBe("Test needed");
    expect(getMonitoringStateLabel("not_set_up").label).toBe("Not set up");
    expect(getMonitoringStateLabel("attention_needed").label).toBe("Attention needed");
    expect(getMonitoringStateLabel("paused").label).toBe("Paused");
  });

  it("calculates next expected invoice date deterministically", () => {
    const nextDate = calculateNextExpectedInvoiceDate("2026-08-01", 30);
    expect(nextDate).toBe("2026-08-31");
    expect(calculateNextExpectedInvoiceDate(null)).toBeNull();
  });

  it("selects the dynamic primary action in priority order", () => {
    expect(
      getDynamicPrimaryAction({
        documentCount: 0,
        hasPendingReviewInvoice: false,
        monitoringState: "not_set_up",
        hasOpenFinding: false,
        hasPendingAction: false,
      }).label,
    ).toBe("Add first bill");

    expect(
      getDynamicPrimaryAction({
        documentCount: 2,
        hasPendingReviewInvoice: true,
        pendingReviewCount: 2,
        monitoringState: "not_set_up",
        hasOpenFinding: false,
        hasPendingAction: false,
      }).label,
    ).toBe("Review 2 bills");

    expect(
      getDynamicPrimaryAction({
        documentCount: 2,
        hasPendingReviewInvoice: false,
        monitoringState: "not_set_up",
        hasOpenFinding: false,
        hasPendingAction: false,
      }).label,
    ).toBe("Monitor this vendor");

    expect(
      getDynamicPrimaryAction({
        documentCount: 2,
        hasPendingReviewInvoice: false,
        monitoringState: "test_needed",
        hasOpenFinding: false,
        hasPendingAction: false,
      }).label,
    ).toBe("Finish monitoring test");

    expect(
      getDynamicPrimaryAction({
        documentCount: 2,
        hasPendingReviewInvoice: false,
        monitoringState: "active",
        hasOpenFinding: true,
        hasPendingAction: false,
      }).label,
    ).toBe("Review finding");

    expect(
      getDynamicPrimaryAction({
        documentCount: 2,
        hasPendingReviewInvoice: false,
        monitoringState: "attention_needed",
        hasOpenFinding: false,
        hasPendingAction: false,
      }).label,
    ).toBe("Resolve monitoring alert");
  });

  it("explains the next step without presenting an unsupported financial claim", () => {
    const attention = getVendorNextStep({
      documentCount: 2,
      hasPendingReviewInvoice: false,
      monitoringState: "attention_needed",
      hasOpenFinding: true,
      hasPendingAction: true,
    });
    const ready = getVendorNextStep({
      documentCount: 2,
      hasPendingReviewInvoice: false,
      monitoringState: "active",
      hasOpenFinding: false,
      hasPendingAction: false,
    });

    expect(attention).toMatchObject({
      heading: "Monitoring needs attention",
      state: "attention",
    });
    expect(attention.description).not.toMatch(/savings|\$/i);
    expect(ready).toMatchObject({
      heading: "No priority issue is recorded",
      state: "ready",
    });
  });
});

describe("monitoring sender validation", () => {
  it("accepts a normal email address and trims whitespace", () => {
    expect(isValidMonitoringEmailAddress("  invoices@example.com ")).toBe(true);
  });

  it("rejects missing or malformed addresses", () => {
    expect(isValidMonitoringEmailAddress(null)).toBe(false);
    expect(isValidMonitoringEmailAddress("invoices@example")).toBe(false);
    expect(isValidMonitoringEmailAddress("invoices example.com")).toBe(false);
  });
});
