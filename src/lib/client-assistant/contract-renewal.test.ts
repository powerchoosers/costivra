import { describe, expect, it } from "vitest";
import { describeNextContractExpiration, isNextContractExpirationQuestion } from "./contract-renewal";

describe("contract renewal assistant helpers", () => {
  it("recognizes a next-contract expiration question", () => {
    expect(isNextContractExpirationQuestion("When is my next contract expiring?")).toBe(true);
    expect(isNextContractExpirationQuestion("Show the upcoming agreement renewal date")).toBe(true);
    expect(isNextContractExpirationQuestion("What increased this month?")).toBe(false);
  });

  it("returns the earliest provided contract date without model reasoning", () => {
    expect(describeNextContractExpiration([{
      id: "contract-1",
      title: "Dedicated Fiber Agreement",
      vendorName: "AT&T Business",
      endDate: "2026-11-15",
      noticeDeadline: "2026-08-17",
      autoRenews: true,
    }])).toBe("Your next recorded contract expiration is AT&T Business — Dedicated Fiber Agreement on November 15, 2026. It is recorded as automatically renewing.");
  });
});
