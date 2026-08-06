import "server-only";

import { requireInternalOperator } from "@/lib/manage/auth";
import type {
  InvoiceReviewDetail,
  InvoiceReviewPriority,
  InvoiceReviewQueueItem,
  InvoiceReviewStatus,
  InvoiceReviewer,
  ManageInvoiceReviewData,
} from "@/lib/manage/invoice-review-types";

type Row = Record<string, unknown>;
const rows = (value: unknown): Row[] => Array.isArray(value) ? value as Row[] : [];
const text = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const nullable = (value: unknown) => typeof value === "string" && value ? value : null;
const decimal = (value: unknown) => value == null ? null : String(value);
const stringArray = (value: unknown) => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === "string")
  : [];

export function deriveInvoiceIssueCodes(invoice: Row): string[] {
  const standardCodes = new Set([
    "vendor_unmatched", "invoice_number_missing", "invoice_date_missing", "service_period_missing",
    "total_missing", "currency_missing", "category_missing", "arithmetic_mismatch",
    "reconciliation_incomplete", "low_confidence",
  ]);
  const codes = new Set(stringArray(invoice.review_issue_codes).filter((code) => !standardCodes.has(code)));
  if (!invoice.organization_vendor_id) codes.add("vendor_unmatched");
  if (!invoice.invoice_number) codes.add("invoice_number_missing");
  if (!invoice.invoice_date) codes.add("invoice_date_missing");
  if (!invoice.service_period_start || !invoice.service_period_end) codes.add("service_period_missing");
  if (!invoice.total_amount) codes.add("total_missing");
  if (!invoice.currency) codes.add("currency_missing");
  if (!invoice.expense_category) codes.add("category_missing");
  if (invoice.reconciliation_status === "mismatch") codes.add("arithmetic_mismatch");
  if (invoice.reconciliation_status === "incomplete") codes.add("reconciliation_incomplete");
  const confidence = Number(invoice.extraction_confidence);
  if (!Number.isFinite(confidence) || confidence < 0.85) codes.add("low_confidence");
  return [...codes];
}

export async function getManageInvoiceReviewData(invoiceId?: string | null): Promise<ManageInvoiceReviewData> {
  const { db } = await requireInternalOperator();
  const [
    invoicesResult, organizationsResult, relationshipsResult, vendorsResult,
    documentsResult, staffResult, profilesResult,
  ] = await Promise.all([
    db.from("invoices").select("*").order("created_at", { ascending: false }).limit(500),
    db.from("organizations").select("id,name"),
    db.from("organization_vendors").select("id,organization_id,vendor_id"),
    db.from("vendors").select("id,canonical_name,category"),
    db.from("documents").select("id,original_filename,mime_type"),
    db.from("internal_staff_users").select("user_id,role,status").eq("status", "active"),
    db.from("profiles").select("id,email,full_name"),
  ]);
  const baseResults = [invoicesResult, organizationsResult, relationshipsResult, vendorsResult, documentsResult, staffResult, profilesResult];
  const failed = baseResults.find((result) => result.error);
  if (failed?.error) throw failed.error;

  const organizations = new Map(rows(organizationsResult.data).map((row) => [text(row.id), row]));
  const relationships = new Map(rows(relationshipsResult.data).map((row) => [text(row.id), row]));
  const vendors = new Map(rows(vendorsResult.data).map((row) => [text(row.id), row]));
  const documents = new Map(rows(documentsResult.data).map((row) => [text(row.id), row]));
  const profiles = new Map(rows(profilesResult.data).map((row) => [text(row.id), row]));
  const reviewers: InvoiceReviewer[] = rows(staffResult.data).flatMap((staff) => {
    const profile = profiles.get(text(staff.user_id));
    if (!profile) return [];
    return [{
      id: text(staff.user_id),
      name: text(profile.full_name, text(profile.email)),
      email: text(profile.email),
      role: staff.role === "owner" ? "owner" as const : "operator" as const,
    }];
  });

  const invoiceRows = rows(invoicesResult.data);
  const queueItems: InvoiceReviewQueueItem[] = invoiceRows.map((invoice) => {
    const relationship = relationships.get(text(invoice.organization_vendor_id));
    const vendor = relationship ? vendors.get(text(relationship.vendor_id)) : null;
    const document = documents.get(text(invoice.document_id));
    const assignee = profiles.get(text(invoice.assigned_to));
    return {
      id: text(invoice.id),
      organizationId: text(invoice.organization_id),
      organizationName: text(organizations.get(text(invoice.organization_id))?.name, "Unknown client"),
      documentId: text(invoice.document_id),
      documentName: text(document?.original_filename, "Source document"),
      mimeType: text(document?.mime_type),
      vendorName: text(vendor?.canonical_name, "Unmatched vendor"),
      invoiceNumber: nullable(invoice.invoice_number),
      invoiceDate: nullable(invoice.invoice_date),
      dueDate: nullable(invoice.due_date),
      currency: nullable(invoice.currency),
      totalAmount: decimal(invoice.total_amount),
      confidence: invoice.extraction_confidence == null ? null : Number(invoice.extraction_confidence),
      vendorMatchStatus: text(invoice.vendor_match_status),
      reconciliationStatus: text(invoice.reconciliation_status),
      reviewStatus: text(invoice.review_status, "needs_review") as InvoiceReviewStatus,
      reviewPriority: text(invoice.review_priority, "normal") as InvoiceReviewPriority,
      reviewDueAt: nullable(invoice.review_due_at),
      issueCodes: deriveInvoiceIssueCodes(invoice),
      assignedTo: nullable(invoice.assigned_to),
      assignedToName: assignee ? text(assignee.full_name, text(assignee.email)) : null,
      createdAt: text(invoice.created_at),
    };
  });

  const selectedBase = invoiceId ? invoiceRows.find((invoice) => text(invoice.id) === invoiceId) : null;
  if (!selectedBase) return { invoices: queueItems, selectedInvoice: null, reviewers };

  const organizationId = text(selectedBase.organization_id);
  const documentId = text(selectedBase.document_id);
  const [lineItemsResult, evidenceResult, correctionsResult, accountsResult] = await Promise.all([
    db.from("invoice_line_items").select("*").eq("invoice_id", invoiceId).order("line_number"),
    db.from("evidence_references").select("id,field_path,page_number,text_excerpt").eq("document_id", documentId).order("page_number"),
    db.from("invoice_field_corrections").select("*").eq("invoice_id", invoiceId).order("created_at", { ascending: false }),
    db.from("expense_accounts").select("id,category,external_account_reference").eq("organization_id", organizationId).order("category"),
  ]);
  const detailFailed = [lineItemsResult, evidenceResult, correctionsResult, accountsResult].find((result) => result.error);
  if (detailFailed?.error) throw detailFailed.error;
  const base = queueItems.find((item) => item.id === invoiceId)!;
  const selectedInvoice: InvoiceReviewDetail = {
    ...base,
    expenseAccountId: nullable(selectedBase.expense_account_id),
    organizationVendorId: nullable(selectedBase.organization_vendor_id),
    servicePeriodStart: nullable(selectedBase.service_period_start),
    servicePeriodEnd: nullable(selectedBase.service_period_end),
    accountNumberLast4: nullable(selectedBase.account_number_last4),
    purchaseOrderNumber: nullable(selectedBase.purchase_order_number),
    subtotal: decimal(selectedBase.subtotal),
    taxTotal: decimal(selectedBase.tax_total),
    feeTotal: decimal(selectedBase.fee_total),
    creditTotal: decimal(selectedBase.credit_total),
    amountDue: decimal(selectedBase.amount_due),
    expenseCategory: nullable(selectedBase.expense_category),
    reviewNotes: nullable(selectedBase.review_notes),
    reconciliationDifference: decimal(selectedBase.reconciliation_difference),
    workspaceCustomerMatchStatus: text(selectedBase.workspace_customer_match_status, "unknown"),
    expenseAccountMatchStatus: text(selectedBase.expense_account_match_status, "unknown"),
    serviceLocationMatchStatus: text(selectedBase.service_location_match_status, "unknown"),
    previousBalance: decimal(selectedBase.previous_balance),
    paymentsAndCredits: decimal(selectedBase.payments_and_credits),
    balanceForward: decimal(selectedBase.balance_forward),
    currentCharges: decimal(selectedBase.current_charges),
    currentPeriodCredits: decimal(selectedBase.current_period_credits),
    lineItems: rows(lineItemsResult.data).map((line) => ({
      id: text(line.id), lineNumber: Number(line.line_number), description: text(line.description),
      quantity: decimal(line.quantity), unitPrice: decimal(line.unit_price), amount: text(line.amount), category: nullable(line.category),
    })),
    evidence: rows(evidenceResult.data).map((item) => ({
      id: text(item.id), fieldPath: text(item.field_path), pageNumber: item.page_number == null ? null : Number(item.page_number), excerpt: text(item.text_excerpt),
    })),
    corrections: rows(correctionsResult.data).map((item) => {
      const editor = profiles.get(text(item.corrected_by));
      return { id: text(item.id), fieldPath: text(item.field_path), originalValue: item.original_value, correctedValue: item.corrected_value, reason: text(item.reason), correctedByName: text(editor?.full_name, text(editor?.email, "Reviewer")), createdAt: text(item.created_at) };
    }),
    vendorOptions: rows(relationshipsResult.data)
      .filter((relationship) => text(relationship.organization_id) === organizationId)
      .map((relationship) => {
        const vendor = vendors.get(text(relationship.vendor_id));
        return { relationshipId: text(relationship.id), name: text(vendor?.canonical_name, "Vendor"), category: nullable(vendor?.category) };
      }),
    accountOptions: rows(accountsResult.data).map((account) => ({
      id: text(account.id),
      label: [text(account.category, "Expense account"), nullable(account.external_account_reference) ? `•••• ${text(account.external_account_reference).slice(-4)}` : ""].filter(Boolean).join(" · "),
    })),
  };
  return { invoices: queueItems, selectedInvoice, reviewers };
}
