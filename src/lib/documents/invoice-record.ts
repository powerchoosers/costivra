import type { DocumentIntelligence } from "@/lib/ai/document-intelligence";
import { findExactVendorMatches, reconcileInvoice } from "@/lib/domain/invoices";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type DatabaseClient = ReturnType<typeof createServerSupabaseClient>;
type SourceType = "manual_upload" | "email_forwarding" | "provider_integration";
type Row = Record<string, unknown>;

async function resolveVendor(input: {
  db: DatabaseClient;
  organizationId: string;
  providedRelationshipId?: string | null;
  vendorName: string | null;
}) {
  const { data: relationships, error: relationshipError } = await input.db
    .from("organization_vendors")
    .select("id,vendor_id")
    .eq("organization_id", input.organizationId);
  if (relationshipError) throw relationshipError;

  const relationshipRows = (relationships ?? []) as Row[];
  if (input.providedRelationshipId) {
    const provided = relationshipRows.find(
      (row) => row.id === input.providedRelationshipId,
    );
    if (!provided) throw new Error("The supplied vendor relationship is outside this organization.");
    return { relationshipId: input.providedRelationshipId, status: "provided" as const };
  }

  if (!input.vendorName || !relationshipRows.length) {
    return { relationshipId: null, status: "unmatched" as const };
  }

  const vendorIds = relationshipRows
    .map((row) => row.vendor_id)
    .filter((value): value is string => typeof value === "string");
  const { data: vendors, error: vendorError } = await input.db
    .from("vendors")
    .select("id,canonical_name,search_aliases")
    .in("id", vendorIds);
  if (vendorError) throw vendorError;

  const vendorById = new Map(
    ((vendors ?? []) as Row[]).map((vendor) => [vendor.id, vendor]),
  );
  const matches = findExactVendorMatches(
    input.vendorName,
    relationshipRows.flatMap((relationship) => {
      const vendor = vendorById.get(relationship.vendor_id);
      if (!vendor || typeof relationship.id !== "string") return [];
      return [{
        relationshipId: relationship.id,
        canonicalName: typeof vendor.canonical_name === "string" ? vendor.canonical_name : "",
        aliases: Array.isArray(vendor.search_aliases)
          ? vendor.search_aliases.filter((alias): alias is string => typeof alias === "string")
          : [],
      }];
    }),
  );

  if (matches.length === 1) return { relationshipId: matches[0], status: "exact" as const };
  if (matches.length > 1) return { relationshipId: null, status: "ambiguous" as const };
  return { relationshipId: null, status: "unmatched" as const };
}

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

  const vendor = await resolveVendor({
    db: input.db,
    organizationId: input.organizationId,
    providedRelationshipId: input.providedRelationshipId,
    vendorName: input.intelligence.vendorName,
  });
  const reconciliation = reconcileInvoice(candidate);
  const hasRequiredFields = Boolean(
    candidate.invoiceNumber &&
    candidate.invoiceDate &&
    candidate.totalAmount &&
    input.intelligence.currency,
  );
  const reviewStatus =
    vendor.relationshipId &&
    hasRequiredFields &&
    reconciliation.status === "reconciled" &&
    input.intelligence.confidence >= 0.85
      ? "ready"
      : "needs_review";

  const { data: invoice, error: invoiceError } = await input.db
    .from("invoices")
    .insert({
      organization_id: input.organizationId,
      organization_vendor_id: vendor.relationshipId,
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
      extraction_confidence: input.intelligence.confidence,
      vendor_match_status: vendor.status,
      reconciliation_status: reconciliation.status,
      reconciliation_difference: reconciliation.difference,
      review_status: reviewStatus,
      source_type: input.sourceType,
      metadata: {
        schemaVersion: "invoice-v1",
        reconciliationChecks: reconciliation.checks,
        extractedVendorName: input.intelligence.vendorName,
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

  if (vendor.relationshipId) {
    const { error: documentVendorError } = await input.db
      .from("documents")
      .update({ organization_vendor_id: vendor.relationshipId })
      .eq("id", input.documentId)
      .eq("organization_id", input.organizationId);
    if (documentVendorError) throw documentVendorError;
  }

  return {
    invoiceId: invoice.id as string,
    reviewStatus,
    vendorMatchStatus: vendor.status,
    reconciliationStatus: reconciliation.status,
  };
}
