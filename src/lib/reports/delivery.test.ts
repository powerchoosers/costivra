import { describe, expect, it } from "vitest";
import {
  aggregateReportDeliveryStatus,
  isReportScheduleClaimCurrent,
  isReportDeliverySchemaSetupError,
  reportRecipientStatusForProviderEvent,
} from "./delivery";

import { authorizedReportRecipients } from "./recipients";

describe("report delivery aggregation", () => {
  it("does not call a partial multi-recipient send delivered", () => {
    expect(aggregateReportDeliveryStatus(["delivered", "accepted"])).toBe("accepted");
    expect(aggregateReportDeliveryStatus(["delivered", "claimed"])).toBe("claimed");
  });

  it("fails the run when any recipient has a terminal delivery failure", () => {
    expect(aggregateReportDeliveryStatus(["accepted", "bounced"])).toBe("failed");
  });

  it("recognizes an all-delivered run and provider status mapping", () => {
    expect(aggregateReportDeliveryStatus(["delivered", "delivered"])).toBe("delivered");
    expect(reportRecipientStatusForProviderEvent("sent")).toBe("accepted");
    expect(reportRecipientStatusForProviderEvent("delivery_delayed")).toBeNull();
  });

  it("keeps a changed schedule recipient list bounded to authorized members", () => {
    expect(authorizedReportRecipients(
      ["owner@example.com", "new-admin@example.com", "outside@example.com"],
      ["owner@example.com", "new-admin@example.com"],
    )).toEqual(["owner@example.com", "new-admin@example.com"]);
  });

  it("rejects a report claim after the schedule is paused or rescheduled", () => {
    expect(isReportScheduleClaimCurrent({ status: "active", next_run_at: "2026-08-10T08:00:00.000Z" }, "2026-08-10T08:00:00.000Z")).toBe(true);
    expect(isReportScheduleClaimCurrent({ status: "paused", next_run_at: "2026-08-10T08:00:00.000Z" }, "2026-08-10T08:00:00.000Z")).toBe(false);
    expect(isReportScheduleClaimCurrent({ status: "active", next_run_at: "2026-08-11T08:00:00.000Z" }, "2026-08-10T08:00:00.000Z")).toBe(false);
  });

  it("recognizes missing report delivery migrations as setup errors", () => {
    expect(isReportDeliverySchemaSetupError({ code: "42P01", message: "relation report_delivery_runs does not exist" })).toBe(true);
    expect(isReportDeliverySchemaSetupError({ code: "42703", message: 'column "attempt_count" does not exist' })).toBe(true);
    expect(isReportDeliverySchemaSetupError({ code: "42703", message: 'column "organization_id" does not exist' })).toBe(false);
    expect(isReportDeliverySchemaSetupError({ code: "PGRST116", message: "No rows found" })).toBe(false);
  });
});
