import type { DocumentIntelligence } from "@/lib/ai/document-intelligence";
import { reconcileInvoice } from "@/lib/domain/invoices";
import { classifyInvoiceReview } from "@/lib/domain/invoice-review";
import { resolveVendorAndCategory } from "@/lib/vendors/resolve";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type DatabaseClient = ReturnType<typeof createServerSupabaseClient>;
type SourceType = "manual_upload" | "email_forwarding" | "provider_integration";

export async function createInvoiceRecordFromExtraction(input: {
  db: DatabaseClient;
  organizationId: string;
  documentId: string;
  extractionVersionId: string;
  providedRelationshipId?: string | null;
  sourceType: SourceType;
  intelligence: DocumentIntelligence;
}) {
  const candidate = input.intelligence.invoice;
  if (!candidate || !["invoice", "statement"].includes(input.intelligence.classification)) {
    return null;
  }

  // Call shared 8-step vendor and category resolver
  const vendorResult = await resolveVendorAndCategory({
    db: input.db,
    organizationId: input.organizationId,
    extractedName: input.intelligence.vendorName || "Unknown Vendor",
    providedRelationshipId: input.providedRelationshipId,
    documentId: input.documentId,
  });

  const reconciliation = reconcileInvoice(candidate);
  const review = classifyInvoiceReview({
    hasVendor: Boolean(vendorResult.organizationVendorId),
    invoiceNumber: candidate.invoiceNumber,
    invoiceDate: candidate.invoiceDate,
    servicePeriodStart: candidate.servicePeriodStart,
    servicePeriodEnd: candidate.servicePeriodEnd,
    currency: input.intelligence.currency,
    totalAmount: candidate.totalAmount,
    expenseCategory: vendorResult.categoryName,
    reconciliationStatus: reconciliation.status,
    confidence: input.intelligence.confidence,
  });
  const reviewStatus = review.reviewStatus;

  const { data: invoice, error: invoiceError } = await input.db
    .from("invoices")
    .insert({
      organization_id: input.organizationId,
      organization_vendor_id: vendorResult.organizationVendorId,
      document_id: input.documentId,
      extraction_version_id: input.extractionVersionId,
      invoice_number: candidate.invoiceNumber,
      invoice_date: candidate.invoiceDate,
      due_date: candidate.dueDate,
      service_period_start: candidate.servicePeriodStart,
      service_period_end: candidate.servicePeriodEnd,
      account_number_last4: candidate.accountNumberLast4,
      purchase_order_number: candidate.purchaseOrderNumber,
      currency: input.intelligence.currency,
      subtotal: candidate.subtotal,
      tax_total: candidate.taxTotal,
      fee_total: candidate.feeTotal,
      credit_total: candidate.creditTotal,
      total_amount: candidate.totalAmount,
      amount_due: candidate.amountDue,
      expense_category: vendorResult.categoryName,
      expense_category_id: vendorResult.categoryId,
      extraction_confidence: input.intelligence.confidence,
      vendor_match_confidence: vendorResult.confidence,
      vendor_resolution_method: vendorResult.resolutionMethod,
      vendor_match_status: vendorResult.matchStatus,
      reconciliation_status: reconciliation.status,
      reconciliation_difference: reconciliation.difference,
      review_status: reviewStatus,
      source_type: input.sourceType,
      review_issue_codes: review.issueCodes,
      metadata: {
        schemaVersion: "invoice-v1",
        reconciliationChecks: reconciliation.checks,
        extractedVendorName: input.intelligence.vendorName,
        isCandidateVendor: vendorResult.isCandidate,
      },
    })
    .select("id")
    .single();
  if (invoiceError) throw invoiceError;

  if (candidate.lineItems.length) {
    const { error: lineError } = await input.db.from("invoice_line_items").insert(
      candidate.lineItems.map((line, index) => ({
        organization_id: input.organizationId,
        invoice_id: invoice.id,
        line_number: index + 1,
        description: line.description,
        quantity: line.quantity,
        unit_price: line.unitPrice,
        amount: line.amount,
        category: line.category,
        service_period_start: line.servicePeriodStart,
        service_period_end: line.servicePeriodEnd,
      })),
    );
    if (lineError) {
      await input.db.from("invoices").delete().eq("id", invoice.id);
      throw lineError;
    }
  }

  if (vendorResult.organizationVendorId) {
    const { error: documentVendorError } = await input.db
      .from("documents")
      .update({ organization_vendor_id: vendorResult.organizationVendorId })
      .eq("id", input.documentId)
      .eq("organization_id", input.organizationId);
    if (documentVendorError) throw documentVendorError;
  }

  return {
    invoiceId: invoice.id as string,
    reviewStatus,
    vendorMatchStatus: vendorResult.matchStatus,
    reconciliationStatus: reconciliation.status,
  };
}
