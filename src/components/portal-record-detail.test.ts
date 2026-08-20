import { describe, expect, it } from "vitest";
import { formatRecordMoney, resolveRecordDetailSection, shouldShowRecordFiles } from "@/components/portal-record-detail";

describe("record detail section navigation", () => {
  const sections = ["overview", "files", "quality", "history"];

  it("selects a supported hash section", () => {
    expect(resolveRecordDetailSection(sections, "#quality")).toBe("quality");
  });

  it("falls back to the first section for a missing or unsupported hash", () => {
    expect(resolveRecordDetailSection(sections, "")).toBe("overview");
    expect(resolveRecordDetailSection(sections, "#evidence")).toBe("overview");
  });

  it("hides an empty file workspace for a finding while preserving it for source records", () => {
    expect(shouldShowRecordFiles("opportunity", 0, 0)).toBe(false);
    expect(shouldShowRecordFiles("opportunity", 1, 0)).toBe(true);
    expect(shouldShowRecordFiles("invoice", 0, 0)).toBe(true);
  });

  it("formats a detail amount using the record or workspace currency", () => {
    expect(formatRecordMoney(1250, "EUR")).toBe("€1,250.00");
    expect(formatRecordMoney(1250, "CAD")).toBe("CA$1,250.00");
  });
});
