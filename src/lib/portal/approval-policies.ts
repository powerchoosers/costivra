import { PortalInputError } from "@/lib/portal/http";

export const approvalActionTypes = [
  "all",
  "review_vendor_cost",
  "external_email",
  "account_change",
  "contract_cancellation",
  "prepare_energy_review",
  "expert_handoff",
] as const;

export type ApprovalActionType = (typeof approvalActionTypes)[number];

export type ApprovalPolicyRule = {
  action_type?: Exclude<ApprovalActionType, "all">;
  minimum_approvers: number;
  annual_value_gte?: number;
  category?: string;
  explicit_consent?: boolean;
};

export type ApprovalPolicyInput = {
  name: string;
  rule: ApprovalPolicyRule;
  isActive: boolean;
};

const text = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

export function approvalPolicyInput(
  body: Record<string, unknown>,
): ApprovalPolicyInput {
  const name = text(body.name, 120);
  if (name.length < 3)
    throw new PortalInputError("Give this approval policy a clear name.");

  const actionType = text(body.actionType, 40) as ApprovalActionType;
  if (!approvalActionTypes.includes(actionType))
    throw new PortalInputError("Choose a valid action type.");

  const parsedApprovers = Number(body.minimumApprovers);
  if (!Number.isInteger(parsedApprovers) || parsedApprovers < 1 || parsedApprovers > 5)
    throw new PortalInputError("Choose between one and five approvers.");
  const minimumApprovers =
    actionType === "contract_cancellation"
      ? Math.max(2, parsedApprovers)
      : parsedApprovers;

  const thresholdText = text(body.annualValueThreshold, 30);
  const annualValueThreshold = thresholdText ? Number(thresholdText) : null;
  if (
    annualValueThreshold !== null &&
    (!Number.isFinite(annualValueThreshold) || annualValueThreshold < 0)
  )
    throw new PortalInputError("Enter a valid non-negative value threshold.");

  const category = text(body.category, 100);
  const rule: ApprovalPolicyRule = { minimum_approvers: minimumApprovers };
  if (actionType !== "all") rule.action_type = actionType;
  if (annualValueThreshold !== null)
    rule.annual_value_gte = Math.round(annualValueThreshold * 100) / 100;
  if (category) rule.category = category;
  if (body.explicitConsent === true) rule.explicit_consent = true;

  return {
    name,
    rule,
    isActive: body.isActive !== false,
  };
}

export function approvalActionLabel(actionType: ApprovalActionType) {
  return {
    all: "All consequential actions",
    review_vendor_cost: "Vendor cost review",
    external_email: "External email",
    account_change: "Vendor account change",
    contract_cancellation: "Contract cancellation",
    prepare_energy_review: "Energy review preparation",
    expert_handoff: "Expert handoff",
  }[actionType];
}
