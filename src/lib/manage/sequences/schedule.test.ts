import { describe, expect, it } from "vitest";
import {
  addSequenceDelay,
  moveIntoSequenceSendWindow,
  nextSequenceActionAt,
  resolveRecipientTimezone,
} from "./schedule";

describe("sequence scheduling", () => {
  const weekdayWindow = {
    timezone: "America/Chicago",
    businessDays: [1, 2, 3, 4, 5],
    sendStartLocal: "09:00",
    sendEndLocal: "16:00",
  } as const;

  it("falls back to the sequence timezone when a recipient timezone is missing or invalid", () => {
    expect(resolveRecipientTimezone(null, "America/Chicago")).toBe("America/Chicago");
    expect(resolveRecipientTimezone("Not/A_Timezone", "UTC")).toBe("UTC");
  });

  it("adds calendar days in local time across daylight-saving time", () => {
    const result = addSequenceDelay(
      new Date("2026-03-06T15:00:00.000Z"),
      3,
      "calendar_days",
      "America/Chicago",
    );
    expect(result.toISOString()).toBe("2026-03-09T14:00:00.000Z");
  });

  it("skips weekends for business-day delays", () => {
    const result = nextSequenceActionAt({
      completedAt: new Date("2026-08-07T14:00:00.000Z"),
      delayValue: 1,
      delayUnit: "business_days",
      schedule: weekdayWindow,
    });
    expect(result).toBe("2026-08-10T14:00:00.000Z");
  });

  it("moves an after-hours action to the next permitted morning", () => {
    const result = moveIntoSequenceSendWindow(
      new Date("2026-08-07T22:30:00.000Z"),
      weekdayWindow,
    );
    expect(result.toISOString()).toBe("2026-08-10T14:00:00.000Z");
  });

  it("moves a weekend action to Monday without changing the local window", () => {
    const result = moveIntoSequenceSendWindow(
      new Date("2026-08-08T14:00:00.000Z"),
      weekdayWindow,
    );
    expect(result.toISOString()).toBe("2026-08-10T14:00:00.000Z");
  });

  it("rejects an invalid or overnight send window", () => {
    expect(() => moveIntoSequenceSendWindow(new Date(), { ...weekdayWindow, sendStartLocal: "18:00", sendEndLocal: "09:00" })).toThrow("INVALID_SEQUENCE_SEND_WINDOW");
  });
});
