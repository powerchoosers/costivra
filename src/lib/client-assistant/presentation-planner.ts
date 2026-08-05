import type { AssistantBoundedContext } from "./context-builder";
import type { AssistantBlockRequest, AssistantContextRef } from "./types";

export interface PlanBlocksInput {
  prompt: string;
  context: AssistantBoundedContext;
  contextRef?: AssistantContextRef | null;
  attachmentIds?: string[];
}

/**
 * Deterministically plans visual cards for common financial intelligence queries.
 * Enforces rule §8: AI interprets, code calculates, deterministic rules plan authoritative cards.
 */
export function planDeterministicBlocks(input: PlanBlocksInput): AssistantBlockRequest[] {
  const { prompt, context, contextRef, attachmentIds = [] } = input;
  const p = prompt.toLowerCase();
  const blocks: AssistantBlockRequest[] = [];

  // 1. Attached documents (Intake / Attachment review)
  if (attachmentIds.length > 0) {
    for (const docId of attachmentIds) {
      blocks.push({ type: "document_ingestion", documentId: docId });
    }
  }

  // 2. High-level Spend Overview / Top Vendors
  const isSpendOverviewPrompt =
    p.includes("recurring expens") ||
    p.includes("where are we spending") ||
    p.includes("cost overview") ||
    p.includes("top spend") ||
    p.includes("largest vendor") ||
    p.includes("summarize spend") ||
    p.includes("spend breakdown") ||
    p.includes("spending breakdown");

  if (isSpendOverviewPrompt && context.recentVendors.length > 0) {
    blocks.push({
      type: "spend_overview",
      vendorRelationshipIds: context.recentVendors.map((v) => v.id),
    });
  }

  // 3. Latest Invoice / Bill
  const isLatestInvoicePrompt =
    p.includes("latest invoice") ||
    p.includes("latest bill") ||
    p.includes("recent bill") ||
    p.includes("most recent invoice") ||
    p.includes("last bill");

  if (isLatestInvoicePrompt && context.recentInvoices.length > 0) {
    blocks.push({
      type: "invoice_summary",
      invoiceId: context.recentInvoices[0].id,
    });
  }

  // 4. Invoice Comparison
  const isComparisonPrompt =
    p.includes("compare") ||
    p.includes("change") ||
    p.includes("increase") ||
    p.includes("decrease") ||
    p.includes("last two bill") ||
    p.includes("month over month") ||
    p.includes("mom");

  if (isComparisonPrompt && context.recentInvoices.length >= 2) {
    blocks.push({
      type: "invoice_comparison",
      invoiceIds: [context.recentInvoices[1].id, context.recentInvoices[0].id],
    });
  }

  // 5. Spend Trend
  const isTrendPrompt =
    p.includes("spend trend") ||
    p.includes("spending trend") ||
    p.includes("cost history") ||
    p.includes("six month") ||
    p.includes("6 month");

  if (isTrendPrompt && context.recentVendors.length > 0) {
    blocks.push({
      type: "spend_trend",
      vendorRelationshipId: context.recentVendors[0].id,
    });
  }

  // 6. Contract Renewal Deadlines
  const isContractPrompt =
    p.includes("contract") ||
    p.includes("renewal") ||
    p.includes("notice deadline") ||
    p.includes("auto renew") ||
    p.includes("expiration") ||
    p.includes("expire");

  if (isContractPrompt && context.upcomingContracts.length > 0) {
    blocks.push({
      type: "renewal_timeline",
      contractIds: context.upcomingContracts.map((c) => c.id),
    });
  }

  // 7. Opportunity / Savings
  const isOpportunityPrompt =
    p.includes("opportunity") ||
    p.includes("finding") ||
    p.includes("recommendation") ||
    p.includes("reduce cost") ||
    p.includes("saving");

  if (isOpportunityPrompt && context.openOpportunities.length > 0) {
    blocks.push({
      type: "opportunity",
      opportunityId: context.openOpportunities[0].id,
    });
  }

  // 8. Specific Vendor match
  const isVendorPrompt =
    p.includes("vendor") ||
    p.includes("supplier") ||
    p.includes("relationship");

  if (isVendorPrompt && !isSpendOverviewPrompt) {
    const matchedVendor = context.recentVendors.find((v) =>
      p.includes(v.name.toLowerCase()),
    );
    if (matchedVendor) {
      blocks.push({
        type: "vendor_summary",
        vendorRelationshipId: matchedVendor.id,
      });
    } else if (context.recentVendors.length > 0) {
      blocks.push({
        type: "vendor_summary",
        vendorRelationshipId: context.recentVendors[0].id,
      });
    }
  }

  // 9. Active View Context Ref override
  if (contextRef && blocks.length === 0) {
    if (contextRef.kind === "invoice") {
      blocks.push({ type: "invoice_summary", invoiceId: contextRef.id });
    } else if (contextRef.kind === "vendor") {
      blocks.push({ type: "vendor_summary", vendorRelationshipId: contextRef.id });
    } else if (contextRef.kind === "opportunity") {
      blocks.push({ type: "opportunity", opportunityId: contextRef.id });
    } else if (contextRef.kind === "contract") {
      blocks.push({ type: "renewal_timeline", contractIds: [contextRef.id] });
    } else if (contextRef.kind === "document") {
      blocks.push({ type: "document_ingestion", documentId: contextRef.id });
    }
  }

  return blocks;
}

/**
 * Merges deterministic blocks with model-requested blocks, deduplicating keys and capping count.
 */
export function mergeAndDedupeBlockRequests(
  deterministic: AssistantBlockRequest[],
  modelRequested: AssistantBlockRequest[],
  maxBlocks: number = 5,
): AssistantBlockRequest[] {
  const merged: AssistantBlockRequest[] = [];
  const seenKeys = new Set<string>();

  const getBlockKey = (r: AssistantBlockRequest): string => {
    switch (r.type) {
      case "spend_overview": return "spend_overview";
      case "invoice_summary": return `invoice_summary:${r.invoiceId}`;
      case "invoice_comparison": return `invoice_comparison:${r.invoiceIds.join(",")}`;
      case "vendor_summary": return `vendor_summary:${r.vendorRelationshipId}`;
      case "spend_trend": return `spend_trend:${r.vendorRelationshipId ?? ""}`;
      case "renewal_timeline": return `renewal_timeline:${(r.contractIds ?? []).join(",")}`;
      case "opportunity": return `opportunity:${r.opportunityId}`;
      case "savings_summary": return `savings_summary:${(r.savingsIds ?? []).join(",")}`;
      case "approval_queue": return `approval_queue:${(r.actionIds ?? []).join(",")}`;
      case "document_ingestion": return `document_ingestion:${r.documentId}`;
      case "vendor_candidate": return `vendor_candidate:${r.organizationVendorId}`;
      case "evidence_list": return `evidence_list:${(r.evidenceIds ?? []).join(",")}`;
      case "notice": return `notice:${r.code}`;
    }
  };

  for (const r of [...deterministic, ...modelRequested]) {
    const key = getBlockKey(r);
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      merged.push(r);
    }
    if (merged.length >= maxBlocks) break;
  }

  return merged;
}
