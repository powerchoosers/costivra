const opportunityTransitions: Record<string, Set<string>> = {
  open: new Set(["under_review", "declined"]),
  under_review: new Set(["approved", "declined"]),
  approved: new Set(["in_progress", "declined"]),
  in_progress: new Set(["verified", "closed"]),
  verified: new Set(["closed"]),
  declined: new Set(),
  closed: new Set(),
};

const actionTransitions: Record<string, Set<string>> = {
  draft: new Set(["pending_approval", "cancelled"]),
  pending_approval: new Set(["approved", "cancelled"]),
  approved: new Set(["in_progress", "cancelled"]),
  in_progress: new Set(["complete", "cancelled"]),
  complete: new Set(),
  cancelled: new Set(),
};

export function canTransitionOpportunity(current: string, next: string) {
  return current === next || Boolean(opportunityTransitions[current]?.has(next));
}

export function canTransitionAction(current: string, next: string) {
  return current === next || Boolean(actionTransitions[current]?.has(next));
}

export function actionMayStart(input: { opportunityType: string; savingsStatus: string | null }) {
  return input.opportunityType === "energy_review" || input.savingsStatus === "evidence_pending" || input.savingsStatus === "ready_for_review";
}
