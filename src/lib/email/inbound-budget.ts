export const INBOUND_ATTACHMENT_MINIMUM_BUDGET_MS = 60_000;

export function shouldYieldInboundEmailProcessing(
  deadlineAt: number | undefined,
  now = Date.now(),
) {
  return typeof deadlineAt === "number" && deadlineAt - now < INBOUND_ATTACHMENT_MINIMUM_BUDGET_MS;
}

export class InboundEmailBudgetYield extends Error {
  constructor() {
    super("INBOUND_EMAIL_BUDGET_YIELD");
    this.name = "InboundEmailBudgetYield";
  }
}
