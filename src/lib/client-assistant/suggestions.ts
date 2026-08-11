import type { AssistantBoundedContext } from "./context-builder";

export type ClientAssistantSuggestion = {
  id: string;
  kind: "contract" | "opportunity" | "invoice" | "vendor" | "review";
  label: string;
  detail: string;
  prompt: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function cleanVendorName(value: string | null) {
  return value?.trim() || "this vendor";
}

/**
 * Turns already-authorized, bounded workspace records into useful entry prompts.
 * This is deterministic on purpose: the model can interpret records after a
 * question is asked, but it should not invent what deserves the first review.
 */
export function buildClientAssistantSuggestions(
  context: AssistantBoundedContext,
  now = new Date(),
): ClientAssistantSuggestion[] {
  const nowAtStartOfDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const suggestions: ClientAssistantSuggestion[] = [];

  const contract = [...context.upcomingContracts]
    .filter((candidate) => candidate.noticeDeadline || candidate.endDate)
    .sort((left, right) => {
      const leftDate = left.noticeDeadline ?? left.endDate;
      const rightDate = right.noticeDeadline ?? right.endDate;
      return leftDate.localeCompare(rightDate);
    })
    .find((candidate) => {
      const date = candidate.noticeDeadline ?? candidate.endDate;
      return Date.parse(`${date}T00:00:00Z`) >= nowAtStartOfDay;
    });

  if (contract) {
    const importantDate = contract.noticeDeadline ?? contract.endDate;
    const timing = contract.noticeDeadline ? "Notice deadline" : "Ends";
    const vendor = cleanVendorName(contract.vendorName);
    suggestions.push({
      id: `contract-${contract.id}`,
      kind: "contract",
      label: `Review ${vendor}'s contract`,
      detail: `${timing} ${formatDate(importantDate)}`,
      prompt: contract.noticeDeadline
        ? `What should we review before the notice deadline for ${vendor}'s ${contract.title}?`
        : `What should we review before ${vendor}'s ${contract.title} ends?`,
    });
  }

  const opportunity = context.openOpportunities[0];
  if (opportunity) {
    suggestions.push({
      id: `opportunity-${opportunity.id}`,
      kind: "opportunity",
      label: `Review ${opportunity.title}`,
      detail: `Current status: ${titleCase(opportunity.status)}`,
      prompt: `What evidence and next decision are recorded for ${opportunity.title}?`,
    });
  }

  const needsReview = context.recentInvoices.find((invoice) =>
    /review|pending|exception|failed|incomplete/i.test(invoice.status),
  ) ?? context.recentInvoices[0];
  if (needsReview) {
    const vendor = cleanVendorName(needsReview.vendorName);
    suggestions.push({
      id: `invoice-${needsReview.id}`,
      kind: "invoice",
      label: `Review ${vendor}'s latest bill`,
      detail: `Invoice status: ${titleCase(needsReview.status)}`,
      prompt: `Summarize the recorded details and evidence for the latest bill from ${vendor}.`,
    });
  }

  const vendor = context.recentVendors.find((candidate) => candidate.name !== "Unknown");
  if (vendor) {
    suggestions.push({
      id: `vendor-${vendor.id}`,
      kind: "vendor",
      label: `Understand ${vendor.name}`,
      detail: vendor.category ? `${titleCase(vendor.category)} vendor` : "Monitored vendor",
      prompt: `What records, recent bills, and open items do we have for ${vendor.name}?`,
    });
  }

  if (!suggestions.length) {
    suggestions.push({
      id: "start-review",
      kind: "review",
      label: "Start a cost review",
      detail: "Use your uploaded records as they become available",
      prompt: "What is the best next step to start reviewing my operating costs?",
    });
  }

  return suggestions.slice(0, 3);
}
