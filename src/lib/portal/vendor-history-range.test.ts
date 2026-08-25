import { describe, expect, it } from "vitest";
import {
  formatDateEntry,
  parseDateEntry,
  subtractCalendarMonths,
  vendorHistoryPresetRange,
} from "@/lib/portal/vendor-history-range";

describe("vendor history ranges", () => {
  it("creates calendar-month presets through the latest dated record", () => {
    expect(vendorHistoryPresetRange("6m", "2026-07-31")).toEqual({
      preset: "6m",
      startDate: "2026-01-31",
      endDate: "2026-07-31",
    });
    expect(subtractCalendarMonths("2026-03-31", 1)).toBe("2026-02-28");
  });

  it("accepts typed US or ISO dates and rejects invalid calendar dates", () => {
    expect(parseDateEntry("7/1/2026")).toBe("2026-07-01");
    expect(parseDateEntry("2026-07-01")).toBe("2026-07-01");
    expect(parseDateEntry("02/31/2026")).toBeNull();
    expect(formatDateEntry("2026-07-01")).toBe("07/01/2026");
  });
});
