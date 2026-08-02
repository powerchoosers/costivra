type WorkflowError = { status: number; message: string };

const workflowErrors: Array<[string, WorkflowError]> = [
  ["WORKFLOW_FORBIDDEN", { status: 403, message: "You do not have permission to change this workflow." }],
  ["WORKFLOW_OWNER_REQUIRED", { status: 403, message: "An owner or administrator must make this decision." }],
  ["OPPORTUNITY_NOT_FOUND", { status: 404, message: "Opportunity not found." }],
  ["ACTION_NOT_FOUND", { status: 404, message: "Action not found." }],
  ["SAVINGS_NOT_FOUND", { status: 404, message: "Savings record not found." }],
  ["OPPORTUNITY_INVALID_TRANSITION", { status: 409, message: "That opportunity change is no longer available. Refresh and try again." }],
  ["ACTION_INVALID_TRANSITION", { status: 409, message: "That action has already changed. Refresh and try again." }],
  ["ACTION_APPROVAL_UNAVAILABLE", { status: 409, message: "This approval is not assigned to you or has already been decided." }],
  ["ACTION_BASELINE_NOT_FOUND", { status: 409, message: "The source expense for this action is no longer available." }],
  ["ACTION_BASELINE_ACCEPTANCE_REQUIRED", { status: 409, message: "Accept the savings baseline before starting this work." }],
  ["SAVINGS_BASELINE_NOT_READY", { status: 409, message: "This baseline is not awaiting acceptance." }],
  ["SAVINGS_EVIDENCE_REQUIRED", { status: 409, message: "A later approved invoice and complete calculation are required before verification." }],
  ["SAVINGS_ACTION_NOT_IN_PROGRESS", { status: 409, message: "Complete the approved action workflow before verifying savings." }],
  ["SAVINGS_DECISION_NOT_READY", { status: 409, message: "This savings record is not awaiting a decision." }],
  ["OPPORTUNITY_INVALID_PRIORITY", { status: 400, message: "Choose a valid opportunity priority." }],
  ["ACTION_UNSUPPORTED_OPERATION", { status: 400, message: "Unsupported action operation." }],
  ["SAVINGS_UNSUPPORTED_OPERATION", { status: 400, message: "Unsupported savings operation." }],
  ["SAVINGS_REJECTION_REASON_REQUIRED", { status: 400, message: "Explain why the baseline or result is being rejected." }],
];

export function workflowRpcError(error: unknown): WorkflowError | null {
  const message = error && typeof error === "object" && "message" in error
    ? String((error as { message?: unknown }).message ?? "")
    : error instanceof Error
      ? error.message
      : "";
  return workflowErrors.find(([code]) => message.includes(code))?.[1] ?? null;
}
