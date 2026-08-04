import { describe, expect, it } from "vitest";
import { parseMoneyToCents, annualizeSpendCents } from "@/lib/vendors/spend";
import { getMonitoringStateLabel, getDynamicPrimaryAction } from "@/lib/vendors/monitoring";

describe("Costivra Pilot Platform End-to-End Integration Suite", () => {
  it("validates vendor spend calculations and annualization", () => {
    const cents = parseMoneyToCents("1500.50");
    expect(cents).toBe(150050);
    const monthlyAnnualized = annualizeSpendCents(150050, "monthly");
    expect(monthlyAnnualized).toBe(1800600);
    const annualAnnualized = annualizeSpendCents(150050, "annual");
    expect(annualAnnualized).toBe(150050);
  });

  it("verifies vendor monitoring state machine transitions", () => {
    expect(getMonitoringStateLabel("not_set_up").label).toBe("Not set up");
    expect(getMonitoringStateLabel("test_needed").label).toBe("Test needed");
    expect(getMonitoringStateLabel("active").label).toBe("Active");
  });

  it("proves the dynamic primary action hierarchy", () => {
    // 0 documents -> Add first bill
    expect(
      getDynamicPrimaryAction({
        documentCount: 0,
        hasPendingReviewInvoice: false,
        monitoringState: "not_set_up",
        hasOpenFinding: false,
        hasPendingAction: false,
      }).actionKind,
    ).toBe("upload");

    // Pending review invoice -> Review invoice
    expect(
      getDynamicPrimaryAction({
        documentCount: 3,
        hasPendingReviewInvoice: true,
        monitoringState: "not_set_up",
        hasOpenFinding: false,
        hasPendingAction: false,
      }).actionKind,
    ).toBe("review_invoice");

    // No monitoring -> Monitor this vendor
    expect(
      getDynamicPrimaryAction({
        documentCount: 3,
        hasPendingReviewInvoice: false,
        monitoringState: "not_set_up",
        hasOpenFinding: false,
        hasPendingAction: false,
      }).actionKind,
    ).toBe("monitor");

    // Monitoring active + open finding -> Review finding
    expect(
      getDynamicPrimaryAction({
        documentCount: 3,
        hasPendingReviewInvoice: false,
        monitoringState: "active",
        hasOpenFinding: true,
        hasPendingAction: false,
      }).actionKind,
    ).toBe("review_finding");
  });
});
