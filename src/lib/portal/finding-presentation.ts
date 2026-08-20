import {
  opportunityTrustLabel,
  type OpportunityTrustState,
} from "@/lib/domain/opportunity-trust";

export type FindingEvidencePresentation = {
  compactLabel: string;
  label: string;
  status: "ready" | "review";
};

export function presentFindingEvidence({
  recordedEvidenceCount,
  accessibleEvidenceCount,
}: {
  recordedEvidenceCount: number;
  accessibleEvidenceCount: number;
}): FindingEvidencePresentation {
  const recorded = Math.max(0, recordedEvidenceCount);
  const accessible = Math.max(0, accessibleEvidenceCount);

  if (accessible > 0) {
    const label = `${accessible} source reference${accessible === 1 ? "" : "s"}`;
    return { compactLabel: label, label, status: "ready" };
  }

  if (recorded > 0) {
    return {
      compactLabel: "Source unavailable",
      label: `${recorded} recorded reference${recorded === 1 ? "" : "s"}; source unavailable in this workspace`,
      status: "review",
    };
  }

  return { compactLabel: "No source evidence", label: "No source evidence", status: "review" };
}

export function describeFindingReadiness({
  trustState,
  evidence,
  hasCalculation,
}: {
  trustState: OpportunityTrustState;
  evidence: FindingEvidencePresentation;
  hasCalculation: boolean;
}) {
  if (trustState === "demo_example") {
    return {
      heading: "Sample record",
      description: "This demonstration record is not based on your uploaded source files, so it cannot support a customer-facing amount or an approval plan.",
    };
  }

  if (trustState === "manual_note") {
    return {
      heading: "Evidence required",
      description: "This is an internal note, not a customer-facing finding. Link usable source evidence and a deterministic calculation before it can advance.",
    };
  }

  if (trustState === "evidence_backed" && evidence.status === "review") {
    return {
      heading: "Source evidence is unavailable",
      description: "This finding has recorded evidence, but the referenced source is not available in this workspace. Restore or relink the source before relying on it.",
    };
  }

  if (trustState === "evidence_backed" && hasCalculation) {
    return {
      heading: "Ready for human review",
      description: "The source evidence and deterministic calculation are available. Review the evidence before approving an internal action plan.",
    };
  }

  return {
    heading: "Evidence and calculation required",
    description: `This finding is marked ${opportunityTrustLabel(trustState).toLowerCase()}. Link usable source evidence and record a deterministic calculation before taking action.`,
  };
}
