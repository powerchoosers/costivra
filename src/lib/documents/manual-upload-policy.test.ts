import { describe, expect, it } from "vitest";
import { manualUploadScanDecision } from "@/lib/documents/manual-upload-policy";

describe("manualUploadScanDecision", () => {
  it("allows only a clean scanner result into extraction", () => {
    expect(manualUploadScanDecision({ status: "clean" })).toEqual({
      action: "process",
    });
  });

  it("rejects a confirmed infection without retaining the file", () => {
    expect(manualUploadScanDecision({ status: "infected" })).toMatchObject({
      action: "reject",
    });
  });

  it.each(["unavailable", "failed"] as const)(
    "quarantines a %s scan instead of invoking extraction",
    (status) => {
      expect(
        manualUploadScanDecision({ status, detail: "scanner unavailable" }),
      ).toEqual({ action: "quarantine", message: "scanner unavailable" });
    },
  );
});
