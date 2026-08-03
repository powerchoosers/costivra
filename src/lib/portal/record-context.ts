import type {
  PortalData,
  PortalEvidenceReference,
  PortalInvoiceLineItem,
} from "@/lib/portal/types";

export type PortalRecordKind =
  | "vendor"
  | "expense"
  | "contract"
  | "document"
  | "invoice"
  | "opportunity"
  | "action"
  | "savings";

export type PortalRelatedRecord = {
  type: string;
  title: string;
  href: string;
  detail?: string;
};

export type PortalQualityCheck = {
  label: string;
  value: string;
  status: "ready" | "review";
};

const recorded = (value: unknown) =>
  value !== null && value !== undefined && value !== "";

export function portalRecordContext(
  data: PortalData,
  kind: PortalRecordKind,
  id: string,
) {
  const related = new Map<string, PortalRelatedRecord>();
  const evidenceDocumentIds = new Set<string>();
  let opportunityId: string | null = null;
  let vendorId: string | null = null;
  let lineItems: PortalInvoiceLineItem[] = [];
  const quality: PortalQualityCheck[] = [];

  const add = (item: PortalRelatedRecord | null | undefined) => {
    if (item && !related.has(item.href)) related.set(item.href, item);
  };
  const addDocument = (documentId: string | null | undefined) => {
    if (!documentId) return;
    evidenceDocumentIds.add(documentId);
    const document = data.documents.find((item) => item.id === documentId);
    if (document && !(kind === "document" && document.id === id))
      add({
        type: "Source document",
        title: document.originalFilename,
        href: `/app/documents/${document.id}`,
        detail: document.status,
      });
  };
  const addOpportunity = (targetId: string | null | undefined) => {
    if (!targetId) return;
    opportunityId = targetId;
    const opportunity = data.opportunities.find((item) => item.id === targetId);
    if (opportunity) {
      vendorId ??= opportunity.vendorId;
      add({
        type: "Opportunity",
        title: opportunity.title,
        href: `/app/opportunities/${opportunity.id}`,
        detail: opportunity.status,
      });
    }
  };
  const addExpense = (expenseId: string | null | undefined, type: string) => {
    if (!expenseId) return;
    const expense = data.expenses.find((item) => item.id === expenseId);
    if (!expense) return;
    vendorId ??= expense.vendorId;
    add({
      type,
      title: `${expense.vendorName} · ${expense.periodStart} to ${expense.periodEnd}`,
      href: `/app/expenses/${expense.id}`,
      detail: expense.status,
    });
    addDocument(expense.documentId);
    const invoice = data.invoices.find((item) => item.id === expense.invoiceId);
    if (invoice) addDocument(invoice.documentId);
  };

  if (kind === "vendor") {
    vendorId = id;
    const vendor = data.vendors.find((item) => item.id === id);
    quality.push(
      { label: "Website", value: vendor?.website ?? "Not recorded", status: vendor?.website ? "ready" : "review" },
      { label: "Spend baseline", value: vendor?.annualizedSpend ? "Recorded" : "Needs a baseline", status: vendor?.annualizedSpend ? "ready" : "review" },
    );
  } else if (kind === "expense") {
    const expense = data.expenses.find((item) => item.id === id);
    vendorId = expense?.vendorId ?? null;
    addDocument(expense?.documentId);
    const invoice = data.invoices.find((item) => item.id === expense?.invoiceId);
    if (invoice) {
      add({ type: "Invoice", title: invoice.invoiceNumber ? `Invoice ${invoice.invoiceNumber}` : "Invoice awaiting number", href: `/app/documents/${invoice.id}`, detail: invoice.reviewStatus });
      addDocument(invoice.documentId);
    }
    quality.push(
      { label: "Source", value: expense?.documentId || expense?.invoiceId ? "Linked" : "No source linked", status: expense?.documentId || expense?.invoiceId ? "ready" : "review" },
      { label: "Comparison", value: expense?.priorPeriodAmount == null ? "Prior period missing" : "Prior period recorded", status: expense?.priorPeriodAmount == null ? "review" : "ready" },
      { label: "Location", value: expense?.locationName ?? "Not assigned", status: expense?.locationId ? "ready" : "review" },
    );
  } else if (kind === "contract") {
    const contract = data.contracts.find((item) => item.id === id);
    vendorId = contract?.vendorId ?? null;
    addDocument(contract?.documentId);
    quality.push(
      { label: "Source", value: contract?.documentId ? "Linked" : "No contract file", status: contract?.documentId ? "ready" : "review" },
      { label: "Term", value: contract?.startDate && contract?.endDate ? "Dates recorded" : "Dates incomplete", status: contract?.startDate && contract?.endDate ? "ready" : "review" },
      { label: "Renewal notice", value: contract?.noticePeriodDays == null ? "Not recorded" : `${contract.noticePeriodDays} days`, status: contract?.noticePeriodDays == null ? "review" : "ready" },
      { label: "Owner", value: contract?.ownerName ?? "Not assigned", status: contract?.ownerName ? "ready" : "review" },
    );
  } else if (kind === "document") {
    const document = data.documents.find((item) => item.id === id);
    vendorId = document?.vendorId ?? null;
    addDocument(document?.id);
    quality.push(
      { label: "Processing", value: document?.status ?? "Unknown", status: document?.status === "ready" ? "ready" : "review" },
      { label: "Extraction", value: document?.confidence == null ? "Not extracted" : `${Math.round(document.confidence * 100)}% confidence`, status: document?.confidence != null && document.confidence >= .8 ? "ready" : "review" },
      { label: "Original", value: document?.sourcePurgedAt ? "Removed under retention" : "Available", status: document?.sourcePurgedAt ? "review" : "ready" },
    );
  } else if (kind === "invoice") {
    const invoice = data.invoices.find((item) => item.id === id);
    vendorId = invoice?.vendorId ?? null;
    addDocument(invoice?.documentId);
    lineItems = data.invoiceLineItems.filter((item) => item.invoiceId === id);
    quality.push(
      { label: "Vendor match", value: invoice?.vendorMatchStatus ?? "Unknown", status: invoice != null && ["exact", "provided"].includes(invoice.vendorMatchStatus) ? "ready" : "review" },
      { label: "Reconciliation", value: invoice?.reconciliationStatus ?? "Unknown", status: invoice?.reconciliationStatus === "reconciled" ? "ready" : "review" },
      { label: "Required fields", value: invoice && recorded(invoice.invoiceNumber) && recorded(invoice.invoiceDate) && invoice.totalAmount != null ? "Complete" : "Needs review", status: invoice && recorded(invoice.invoiceNumber) && recorded(invoice.invoiceDate) && invoice.totalAmount != null ? "ready" : "review" },
      { label: "Line items", value: lineItems.length ? `${lineItems.length} extracted` : "None extracted", status: lineItems.length ? "ready" : "review" },
    );
  } else if (kind === "opportunity") {
    const opportunity = data.opportunities.find((item) => item.id === id);
    vendorId = opportunity?.vendorId ?? null;
    opportunityId = id;
    quality.push(
      { label: "Evidence", value: opportunity?.evidenceCount ? `${opportunity.evidenceCount} references` : "No evidence", status: opportunity?.evidenceCount ? "ready" : "review" },
      { label: "Calculation", value: opportunity?.ruleVersion ?? "Rule not recorded", status: opportunity?.ruleVersion ? "ready" : "review" },
      { label: "Deadline", value: opportunity?.deadlineAt ? "Recorded" : "Not scheduled", status: opportunity?.deadlineAt ? "ready" : "review" },
    );
  } else if (kind === "action") {
    const action = data.actions.find((item) => item.id === id);
    vendorId = action?.vendorId ?? null;
    addOpportunity(action?.opportunityId);
    quality.push(
      { label: "Approval", value: action ? `${action.approvedCount} of ${action.requiredApprovals}` : "Unknown", status: action != null && action.approvedCount >= action.requiredApprovals ? "ready" : "review" },
      { label: "Policy", value: action?.approvalPolicyName ?? "Default one-person control", status: action?.approvalPolicyId ? "ready" : "review" },
      { label: "Due date", value: action?.dueAt ? "Recorded" : "Not scheduled", status: action?.dueAt ? "ready" : "review" },
    );
  } else {
    const savings = data.savings.find((item) => item.id === id);
    addOpportunity(savings?.opportunityId);
    addExpense(savings?.baselineExpenseId, "Accepted baseline");
    addExpense(savings?.comparisonExpenseId, "Later comparison");
    quality.push(
      { label: "Baseline", value: savings?.baselineAcceptedAt ? "Accepted" : "Awaiting acceptance", status: savings?.baselineAcceptedAt ? "ready" : "review" },
      { label: "Comparison", value: savings?.comparisonAmount == null ? "Not recorded" : "Recorded", status: savings?.comparisonAmount == null ? "review" : "ready" },
      { label: "Method", value: savings?.methodVersion ?? "Version not recorded", status: savings?.methodVersion ? "ready" : "review" },
    );
  }

  if (opportunityId) {
    for (const reference of data.evidenceReferences.filter((item) => item.opportunityId === opportunityId))
      evidenceDocumentIds.add(reference.documentId);
    for (const action of data.actions.filter((item) => item.opportunityId === opportunityId))
      add({ type: "Action", title: action.title, href: `/app/actions/${action.id}`, detail: action.status });
    for (const savings of data.savings.filter((item) => item.opportunityId === opportunityId))
      add({ type: "Savings outcome", title: savings.title, href: `/app/savings/${savings.id}`, detail: savings.status });
  }

  if (vendorId) {
    const vendor = data.vendors.find((item) => item.id === vendorId);
    if (kind !== "vendor" && vendor)
      add({ type: "Vendor", title: vendor.name, href: `/app/vendors/${vendor.id}`, detail: vendor.relationshipStatus });
    for (const contract of data.contracts.filter((item) => item.vendorId === vendorId).slice(0, 3))
      if (!(kind === "contract" && contract.id === id)) add({ type: "Contract", title: contract.title, href: `/app/contracts/${contract.id}`, detail: contract.status });
    for (const invoice of data.invoices.filter((item) => item.vendorId === vendorId).slice(0, 4))
      if (!(kind === "invoice" && invoice.id === id)) add({ type: "Invoice", title: invoice.invoiceNumber ? `Invoice ${invoice.invoiceNumber}` : "Invoice awaiting number", href: `/app/documents/${invoice.id}`, detail: invoice.reviewStatus });
    for (const opportunity of data.opportunities.filter((item) => item.vendorId === vendorId).slice(0, 4))
      if (!(kind === "opportunity" && opportunity.id === id)) add({ type: "Opportunity", title: opportunity.title, href: `/app/opportunities/${opportunity.id}`, detail: opportunity.status });
  }

  const evidence = data.evidenceReferences.filter((item) =>
    evidenceDocumentIds.has(item.documentId) || (opportunityId ? item.opportunityId === opportunityId : false),
  );

  return {
    related: [...related.values()].slice(0, 12),
    evidence,
    evidenceDocumentIds,
    lineItems,
    quality,
  } satisfies {
    related: PortalRelatedRecord[];
    evidence: PortalEvidenceReference[];
    evidenceDocumentIds: Set<string>;
    lineItems: PortalInvoiceLineItem[];
    quality: PortalQualityCheck[];
  };
}
