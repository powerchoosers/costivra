import { describe, expect, it } from "vitest";
import {
  recentInternalNotificationCutoff,
  safeManageNotificationHref,
} from "@/lib/manage/notifications";

describe("manage notification helpers", () => {
  it("keeps notification actions inside Manage", () => {
    expect(safeManageNotificationHref("/manage/accounts/record-1")).toBe("/manage/accounts/record-1");
    expect(safeManageNotificationHref("/manage?section=mail")).toBe("/manage?section=mail");
    expect(safeManageNotificationHref("https://example.com/manage")).toBeNull();
    expect(safeManageNotificationHref("//example.com/manage")).toBeNull();
    expect(safeManageNotificationHref("/app/vendors")).toBeNull();
    expect(safeManageNotificationHref("/manage-everything")).toBeNull();
  });

  it("uses a 30-day notification window", () => {
    const now = Date.UTC(2026, 7, 12, 12, 0, 0);
    expect(recentInternalNotificationCutoff(now)).toBe("2026-07-13T12:00:00.000Z");
  });
});
