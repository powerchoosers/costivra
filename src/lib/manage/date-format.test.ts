import { describe, expect, it } from "vitest";
import { formatManageDate, formatManageDateTime } from "@/lib/manage/date-format";

describe("owner portal date formatting", () => {
  it("uses one explicit timezone on the server and in the browser", () => {
    expect(formatManageDateTime("2026-08-02T17:43:00.000Z")).toBe("Aug 2, 2026, 12:43 PM");
    expect(formatManageDate("2026-08-02T17:43:00.000Z", true)).toBe("Aug 2, 12:43 PM");
  });

  it("fails closed for missing or invalid values", () => {
    expect(formatManageDateTime(null)).toBe("—");
    expect(formatManageDate("not-a-date")).toBe("—");
  });
});
