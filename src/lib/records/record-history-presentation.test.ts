import { describe, expect, it } from "vitest";
import {
  formatRecordHistoryTimestamp,
  getRecordHistoryDisplayState,
} from "@/lib/records/record-history-presentation";

describe("record history presentation", () => {
  it("keeps a loading history distinct from an empty history", () => {
    expect(getRecordHistoryDisplayState(true, 0)).toBe("loading");
    expect(getRecordHistoryDisplayState(false, 0, "History unavailable")).toBe("error");
    expect(getRecordHistoryDisplayState(false, 0)).toBe("empty");
    expect(getRecordHistoryDisplayState(false, 1)).toBe("ready");
  });

  it("uses an explicit fallback for malformed audit timestamps", () => {
    expect(formatRecordHistoryTimestamp("not-a-date")).toBe("Date not recorded");
  });
});
