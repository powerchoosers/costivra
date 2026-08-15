import { describe, expect, it } from "vitest";
import { ACTIVATION_REMINDER_MAX, shouldSendActivationReminder } from "./onboarding";

const now = new Date("2026-08-15T12:00:00.000Z");

describe("activation reminder policy", () => {
  it("waits three days and stops after the bounded reminder count", () => {
    expect(shouldSendActivationReminder({ status: "in_progress", createdAt: "2026-08-13T12:00:00.000Z", lastSentAt: null, reminderCount: 0, now })).toBe(false);
    expect(shouldSendActivationReminder({ status: "in_progress", createdAt: "2026-08-12T11:59:59.000Z", lastSentAt: null, reminderCount: 0, now })).toBe(true);
    expect(shouldSendActivationReminder({ status: "in_progress", createdAt: "2026-08-01T00:00:00.000Z", lastSentAt: "2026-08-14T12:00:00.000Z", reminderCount: 1, now })).toBe(false);
    expect(shouldSendActivationReminder({ status: "in_progress", createdAt: "2026-08-01T00:00:00.000Z", lastSentAt: "2026-08-12T11:59:59.000Z", reminderCount: ACTIVATION_REMINDER_MAX, now })).toBe(false);
  });

  it("never reminds activated or blocked workspaces", () => {
    for (const status of ["activated", "blocked"] as const) {
      expect(shouldSendActivationReminder({ status, createdAt: "2026-08-01T00:00:00.000Z", lastSentAt: null, reminderCount: 0, now })).toBe(false);
    }
  });
});
