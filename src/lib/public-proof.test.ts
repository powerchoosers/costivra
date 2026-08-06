import { describe, expect, it } from "vitest";
import { METHODOLOGY_PROOF, hasPublicProofPermission, resolvePublicProof, type PublicProof } from "./public-proof";

const syntheticApprovedCase: PublicProof = {
  kind: "approved_case",
  title: "A permitted example",
  summary: "Synthetic content used to exercise the approved-case path.",
  stage: "verified",
  sourceLabel: "Synthetic test content",
  permissionReference: "TEST-PERMISSION-001",
  evidence: [{ label: "Later evidence", detail: "Synthetic later bill" }],
};

describe("public proof safety", () => {
  it("uses the methodology fallback when no approved case exists", () => {
    expect(resolvePublicProof()).toEqual(METHODOLOGY_PROOF);
    expect(resolvePublicProof(null)).toEqual(METHODOLOGY_PROOF);
  });

  it("refuses to render an approved case without a permission reference", () => {
    const missingPermission = { ...syntheticApprovedCase, permissionReference: "   " };
    expect(hasPublicProofPermission(missingPermission)).toBe(false);
    expect(resolvePublicProof(missingPermission)).toEqual(METHODOLOGY_PROOF);
  });

  it("accepts synthetic approved-case content only with explicit permission", () => {
    expect(hasPublicProofPermission(syntheticApprovedCase)).toBe(true);
    expect(resolvePublicProof(syntheticApprovedCase)).toEqual(syntheticApprovedCase);
  });

  it("keeps methodology potential value separate from verified value", () => {
    expect(METHODOLOGY_PROOF.stage).toBe("potential");
    expect(METHODOLOGY_PROOF.metrics).toBeUndefined();
    expect(METHODOLOGY_PROOF.summary).toContain("becomes verified only after");
  });
});
