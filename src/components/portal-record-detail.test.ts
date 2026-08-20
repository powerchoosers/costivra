import { describe, expect, it } from "vitest";
import { formatRecordMoney, resolveRecordDetailCurrency, resolveRecordDetailSection, selectRecordFiles, shouldShowRecordFiles } from "@/components/portal-record-detail";

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
    expect(shouldShowRecordFiles("opportunity", 0)).toBe(false);
    expect(shouldShowRecordFiles("opportunity", 1)).toBe(true);
    expect(shouldShowRecordFiles("invoice", 0)).toBe(true);
  });

  it("limits a finding's files to its linked evidence instead of every vendor document", () => {
    const documents = [
      { id: "source", vendorId: "vendor-1" },
      { id: "other-vendor-file", vendorId: "vendor-1" },
      { id: "other-vendor", vendorId: "vendor-2" },
    ];

    expect(selectRecordFiles("opportunity", documents, new Set(["source"]), "vendor-1").map((item) => item.id))
      .toEqual(["source"]);
    expect(selectRecordFiles("invoice", documents, new Set(["source"]), "vendor-1").map((item) => item.id))
      .toEqual(["source", "other-vendor-file"]);
  });

  it("formats a detail amount using the record or workspace currency", () => {
    expect(resolveRecordDetailCurrency("CAD", "EUR")).toBe("EUR");
    expect(resolveRecordDetailCurrency("CAD", null)).toBe("CAD");
    expect(formatRecordMoney(1250, "EUR")).toBe("€1,250.00");
    expect(formatRecordMoney(1250, "CAD")).toBe("CA$1,250.00");
  });
});
