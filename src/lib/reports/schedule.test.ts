import { describe, expect, it } from "vitest";
import { isValidTimeZone, nextReportRun } from "./schedule";

describe("report schedule timing", () => {
  it("rejects invalid timezones", () => expect(isValidTimeZone("Not/A_Timezone")).toBe(false));
  it("calculates a future weekly run in the requested timezone", () => {
    const from = new Date("2026-08-10T14:00:00.000Z");
    const next = nextReportRun({ cadence: "weekly", timezone: "America/Chicago", weekday: 1, sendTimeLocal: "08:00" }, from);
    expect(next).toBe("2026-08-17T13:00:00.000Z");
  });
  it("keeps monthly scheduling on a stable day", () => {
    const from = new Date("2026-08-10T12:00:00.000Z");
    const next = nextReportRun({ cadence: "monthly", timezone: "UTC", dayOfMonth: 15, sendTimeLocal: "08:00" }, from);
    expect(next).toBe("2026-08-15T08:00:00.000Z");
  });
});
