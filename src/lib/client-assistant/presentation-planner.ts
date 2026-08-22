import type { AssistantBoundedContext } from "./context-builder";
import type { AssistantBlockRequest, AssistantContextRef } from "./types";
import { supplierCategoryMatches } from "./supplier-matching";

export interface PlanBlocksInput {
  prompt: string;
  context: AssistantBoundedContext;
  contextRef?: AssistantContextRef | null;
  attachmentIds?: string[];
}

function supplierCategoryHint(prompt: string): string | null {
  const p = prompt.toLowerCase();
  if (p.includes("energy") || p.includes("electric") || p.includes("utility") || p.includes("power")) return "Commercial Energy";
  if (p.includes("telecom") || p.includes("internet") || p.includes("broadband") || p.includes("phone service")) return "Telecom";
  if (p.includes("software") || p.includes("saas") || p.includes("application subscription")) return "Software";
  if (p.includes("waste") || p.includes("trash") || p.includes("refuse")) return "Waste";
  return null;
}

function uniqueWorkspaceCategory(context: AssistantBoundedContext): string | null {
  const categories = Array.from(new Set(context.recentVendors.map((vendor) => vendor.category?.trim()).filter((value): value is string => Boolean(value))));
  return categories.length === 1 ? categories[0] : null;
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

  const isInvoiceRankingPrompt =
    (p.includes("bill") || p.includes("invoice")) &&
    (p.includes("most expensive") || p.includes("largest") || p.includes("biggest") || p.includes("highest") || p.includes("top "));
  if (isInvoiceRankingPrompt && context.recentInvoices.length > 0) {
    blocks.push({
      type: "invoice_ranking",
      invoiceIds: context.recentInvoices.map((invoice) => invoice.id),
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

  const isBreakdownPrompt =
    p.includes("line item") ||
    p.includes("bill breakdown") ||
    p.includes("invoice breakdown") ||
    p.includes("what was i charged") ||
    p.includes("charges on");
  if (isBreakdownPrompt && context.recentInvoices.length > 0) {
    blocks.push({ type: "invoice_breakdown", invoiceId: context.recentInvoices[0].id });
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
    p.includes("spend history") ||
    p.includes("over time") ||
    p.includes("month by month") ||
    p.includes("monthly") ||
    p.includes("quarterly") ||
    p.includes("past six months") ||
    p.includes("last six months") ||
    p.includes("past 6 months") ||
    p.includes("last 6 months") ||
    p.includes("increased most") ||
    p.includes("decreased most") ||
    p.includes("six month") ||
    p.includes("6 month");

  if (isTrendPrompt && (context.recentVendors.length > 0 || contextRef?.kind === "vendor")) {
    const namedVendor = context.recentVendors.find((vendor) =>
      p.includes(vendor.name.toLowerCase()),
    );
    const contextVendor = contextRef?.kind === "vendor"
      ? context.recentVendors.find((vendor) => vendor.id === contextRef.id)
      : null;
    const trendVendorId = contextRef?.kind === "vendor"
      ? contextRef.id
      : namedVendor?.id ?? contextVendor?.id;
    blocks.push(trendVendorId
      ? { type: "spend_trend", vendorRelationshipId: trendVendorId }
      : { type: "spend_trend" });
  }

  const isMonitoringPrompt =
    p.includes("monitoring") ||
    p.includes("monitored") ||
    p.includes("bill feed") ||
    p.includes("expected bill") ||
    p.includes("incoming bill");

  if (isMonitoringPrompt) {
    blocks.push({ type: "monitoring_overview" });
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

  const activeVendor = contextRef?.kind === "vendor"
    ? context.recentVendors.find((vendor) => vendor.id === contextRef.id) ?? null
    : null;
  const activeCategory = (
    context.currentContextCategory ?? activeVendor?.category ?? ""
  ).toLowerCase();
  const promptMentionsEnergyVendor = context.recentVendors.some((vendor) => {
    const vendorCategory = (vendor.category ?? "").toLowerCase();
    const vendorName = vendor.name.trim().toLowerCase();
    return vendorCategory.includes("energy") && vendorName.length >= 3 && p.includes(vendorName);
  });
  const asksAboutEnergy =
    p.includes("energy") ||
    p.includes("electric") ||
    p.includes("utility") ||
    p.includes("power bill") ||
    promptMentionsEnergyVendor;
  const isEnergyRenewalQuestion =
    (p.includes("renew") || p.includes("supplier") || p.includes("provider") || p.includes("alternative")) &&
    (activeCategory.includes("energy") || asksAboutEnergy);
  if (isEnergyRenewalQuestion) {
    blocks.push({
      type: "energy_review_path",
      vendorRelationshipId: contextRef?.kind === "vendor"
        ? contextRef.id
        : activeVendor?.id ?? context.recentVendors.find((vendor) => (vendor.category ?? "").toLowerCase().includes("energy"))?.id,
    });
  }

  const isSupplierOptionsQuestion =
    (p.includes("renew") || p.includes("supplier") || p.includes("provider") || p.includes("alternative")) &&
    !isEnergyRenewalQuestion &&
    context.supplierCatalog.length > 0;
  if (isSupplierOptionsQuestion) {
    const category = context.currentContextCategory ?? supplierCategoryHint(prompt) ?? uniqueWorkspaceCategory(context);
    if (category) {
      const categoryVendor = context.recentVendors.find((vendor) => supplierCategoryMatches(category, vendor.category));
      blocks.push({
        type: "supplier_options",
        category,
        currentVendorName: activeVendor?.name ?? categoryVendor?.name,
      });
    }
  }

  const isVerifiedSavingsPrompt =
    p.includes("verified savings") ||
    p.includes("verified value") ||
    p.includes("savings outcome") ||
    p.includes("what have we saved") ||
    p.includes("how much have we saved");
  if (isVerifiedSavingsPrompt && context.verifiedSavings.length > 0) {
    blocks.push({
      type: "savings_summary",
      savingsIds: context.verifiedSavings.map((saving) => saving.id),
    });
  }

  const isApprovalQueuePrompt =
    p.includes("pending approval") ||
    p.includes("awaiting approval") ||
    p.includes("needs approval") ||
    p.includes("needs a decision") ||
    p.includes("pending action") ||
    p.includes("what needs a decision");
  if (isApprovalQueuePrompt && context.pendingApprovals.length > 0) {
    blocks.push({
      type: "approval_queue",
      actionIds: context.pendingApprovals.map((approval) => approval.id),
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
 * Keeps model-requested cards inside the question's bounded evidence scope.
 * The model may suggest a useful card, but it cannot attach an unrelated
 * record merely because that record exists in the context snapshot.
 */
export function filterRelevantModelBlockRequests(
  prompt: string,
  context: AssistantBoundedContext,
  contextRef: AssistantContextRef | null | undefined,
  requests: AssistantBlockRequest[],
): AssistantBlockRequest[] {
  const p = prompt.toLowerCase();
  const hasAny = (...terms: string[]) => terms.some((term) => p.includes(term));
  const invoiceIds = new Set(context.recentInvoices.map((invoice) => invoice.id));
  const vendorIds = new Set(context.recentVendors.map((vendor) => vendor.id));
  const opportunityIds = new Set(context.openOpportunities.map((opportunity) => opportunity.id));
  const contractIds = new Set(context.upcomingContracts.map((contract) => contract.id));
  const documentIds = new Set(context.attachedDocuments.map((document) => document.id));
  const promptCategory = supplierCategoryHint(prompt) ?? context.currentContextCategory;
  const namedVendor = context.recentVendors.find((vendor) => p.includes(vendor.name.toLowerCase()));

  return requests.filter((request) => {
    switch (request.type) {
      case "spend_overview":
        return hasAny("spend", "expense", "cost", "most expensive", "biggest");
      case "invoice_ranking":
        return hasAny("bill", "invoice") &&
          hasAny("most expensive", "largest", "biggest", "highest", "top ") &&
          (!request.invoiceIds || request.invoiceIds.every((id) => invoiceIds.has(id)));
      case "spend_trend":
        return hasAny("trend", "over time", "month by month", "monthly", "quarterly", "six months", "6 months");
      case "vendor_summary":
        return vendorIds.has(request.vendorRelationshipId) &&
          ((contextRef?.kind === "vendor" && contextRef.id === request.vendorRelationshipId) || Boolean(namedVendor && namedVendor.id === request.vendorRelationshipId));
      case "invoice_summary":
      case "invoice_breakdown":
        return Boolean(request.invoiceId && invoiceIds.has(request.invoiceId)) &&
          hasAny("invoice", "bill", "charge", "document", "expense");
      case "invoice_comparison":
        return request.invoiceIds.every((id) => invoiceIds.has(id)) &&
          (!promptCategory || request.invoiceIds.every((id) => {
            const invoice = context.recentInvoices.find((candidate) => candidate.id === id);
            return Boolean(invoice?.category && supplierCategoryMatches(promptCategory, invoice.category));
          })) &&
          hasAny("compare", "comparison", "versus", " vs ", "variance", "changed", "increase", "decrease");
      case "energy_review_path":
        return (hasAny("energy", "electric", "utility", "power") || Boolean(context.currentContextCategory?.toLowerCase().includes("energy"))) &&
          hasAny("renew", "supplier", "provider", "alternative") &&
          (!request.vendorRelationshipId || vendorIds.has(request.vendorRelationshipId));
      case "supplier_options":
        return hasAny("supplier", "renew", "provider", "alternative") &&
          Boolean(request.category && promptCategory && supplierCategoryMatches(promptCategory, request.category));
      case "renewal_timeline":
        return hasAny("renew", "contract", "notice", "auto renew", "expiration", "expire") &&
          (request.contractIds ?? []).every((id) => contractIds.has(id));
      case "opportunity":
        return hasAny("opportunity", "finding", "recommendation", "saving", "reduce cost") &&
          opportunityIds.has(request.opportunityId);
      case "savings_summary":
        return hasAny("verified savings", "verified value", "savings outcome", "saved") &&
          (request.savingsIds ?? []).every((id) => context.verifiedSavings.some((saving) => saving.id === id));
      case "approval_queue":
        return hasAny("approval", "decision", "pending action") &&
          (request.actionIds ?? []).every((id) => context.pendingApprovals.some((approval) => approval.id === id));
      case "monitoring_overview":
        return hasAny("monitor", "monitored", "bill feed", "expected bill", "incoming bill");
      case "document_ingestion":
        return documentIds.has(request.documentId) && hasAny("upload", "document", "import", "file");
      case "vendor_candidate":
        return hasAny("supplier", "vendor", "alternative") && vendorIds.has(request.organizationVendorId);
      case "evidence_list":
        return hasAny("evidence", "source", "proof", "document");
      case "notice":
        return hasAny("notice", "alert", "warning");
    }
  });
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
      case "invoice_ranking": return "invoice_ranking";
      case "invoice_summary": return `invoice_summary:${r.invoiceId}`;
      case "invoice_breakdown": return `invoice_breakdown:${r.invoiceId}`;
      case "energy_review_path": return `energy_review_path:${r.vendorRelationshipId ?? "workspace"}`;
      case "supplier_options": return `supplier_options:${r.category ?? "workspace"}`;
      case "invoice_comparison": return `invoice_comparison:${r.invoiceIds.join(",")}`;
      case "vendor_summary": return `vendor_summary:${r.vendorRelationshipId}`;
      case "spend_trend": return `spend_trend:${r.vendorRelationshipId ?? ""}`;
      case "monitoring_overview": return "monitoring_overview";
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
