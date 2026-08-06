export type PublicProofStage = "potential" | "approved" | "completed" | "verified";

export type PublicProofMetric = {
  label: string;
  value: string;
};

export type PublicProofEvidence = {
  label: string;
  detail: string;
};

type PublicProofBase = {
  title: string;
  summary: string;
  stage: PublicProofStage;
  metrics?: PublicProofMetric[];
  evidence?: PublicProofEvidence[];
  sourceLabel?: string;
};

export type ApprovedPublicProof = PublicProofBase & {
  kind: "approved_case";
  permissionReference?: string;
};

export type MethodologyPublicProof = PublicProofBase & {
  kind: "methodology";
};

export type PublicProof = ApprovedPublicProof | MethodologyPublicProof;

export const METHODOLOGY_PROOF: PublicProof = {
  kind: "methodology",
  title: "Value is not verified until later evidence proves it.",
  summary: "Costivra keeps potential value separate from confirmed results. A finding becomes verified only after the approved method and a later bill, credit, contract, or vendor record support the outcome.",
  stage: "potential",
};

/** Public case studies require an explicit, reviewable permission reference. */
export function hasPublicProofPermission(proof: PublicProof | null | undefined): boolean {
  return proof?.kind === "approved_case" && Boolean(proof.permissionReference?.trim());
}

/** Resolve only content that is safe to publish; everything else falls back to methodology. */
export function resolvePublicProof(proof?: PublicProof | null): PublicProof {
  if (proof?.kind === "approved_case" && !hasPublicProofPermission(proof)) return METHODOLOGY_PROOF;
  return proof ?? METHODOLOGY_PROOF;
}

export function publicProofStageLabel(stage: PublicProofStage): string {
  return {
    potential: "Potential",
    approved: "Approved",
    completed: "Completed",
    verified: "Verified",
  }[stage];
}
