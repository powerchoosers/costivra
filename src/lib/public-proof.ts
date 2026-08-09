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
  title: "We only count savings after they happen.",
  summary: "Costivra shows you charges worth checking. A saving becomes real only when a lower bill, credit, or vendor record proves the result. It becomes verified only after that later evidence supports the result.",
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
