import { describe, expect, it } from "vitest";
import { parseSearchDateQuery, searchDateMatches } from "./date-search";

describe("date-aware search", () => {
  it.each([
    "1/1/2026",
    "01-01-2026",
    "1/1/26",
    "2026-01-01",
    "January 1st, 2026",
    "Jan 1 2026",
  ])("normalizes %s", (query) => {
    expect(searchDateMatches("2026-01-01", parseSearchDateQuery(query))).toBe(true);
  });

  it("matches a named month and day across years when no year is supplied", () => {
    const query = parseSearchDateQuery("bills from January 1st");
    expect(searchDateMatches("2025-01-01", query)).toBe(true);
    expect(searchDateMatches("2026-01-02", query)).toBe(false);
  });

  it("rejects impossible dates", () => {
    expect(parseSearchDateQuery("2/30/2026").exactDates.size).toBe(0);
  });
});
