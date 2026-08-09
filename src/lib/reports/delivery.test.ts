import { describe, expect, it } from "vitest";
import {
  aggregateReportDeliveryStatus,
  reportRecipientStatusForProviderEvent,
} from "./delivery";

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
});
