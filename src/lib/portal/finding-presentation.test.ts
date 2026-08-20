import { describe, expect, it } from "vitest";
import { describeFindingReadiness, hasFindingCalculation, presentFindingEvidence } from "@/lib/portal/finding-presentation";

describe("finding presentation", () => {
  it("does not present an inaccessible recorded reference as ready evidence", () => {
    expect(presentFindingEvidence({ recordedEvidenceCount: 1, accessibleEvidenceCount: 0 })).toEqual({
      compactLabel: "Source unavailable",
      label: "1 recorded reference; source unavailable in this workspace",
      status: "review",
    });
  });

  it("keeps sample and internal notes out of approval-ready language", () => {
    const noEvidence = presentFindingEvidence({ recordedEvidenceCount: 0, accessibleEvidenceCount: 0 });

    expect(describeFindingReadiness({ trustState: "demo_example", evidence: noEvidence, hasCalculation: false }).heading)
      .toBe("Sample record");
    expect(describeFindingReadiness({ trustState: "manual_note", evidence: noEvidence, hasCalculation: false }).heading)
      .toBe("Evidence required");
  });

  it("only describes a finding as review-ready with usable evidence and a calculation", () => {
    const evidence = presentFindingEvidence({ recordedEvidenceCount: 2, accessibleEvidenceCount: 2 });

    expect(describeFindingReadiness({ trustState: "evidence_backed", evidence, hasCalculation: true }).heading)
      .toBe("Ready for human review");
  });

  it("does not treat a calculation rule label as a completed calculation", () => {
    expect(hasFindingCalculation("rate-increase-v1", {})).toBe(false);
    expect(hasFindingCalculation("rate-increase-v1", { currentRate: 0.15 })).toBe(true);
  });
});
