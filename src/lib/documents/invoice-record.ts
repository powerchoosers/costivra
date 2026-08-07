import type { DocumentIntelligence } from "@/lib/ai/document-intelligence";
import { reconcileInvoice } from "@/lib/domain/invoices";
import { classifyInvoiceReview } from "@/lib/domain/invoice-review";
import { resolveVendorAndCategory } from "@/lib/vendors/resolve";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { categoryIntelligence } from "@/lib/category-intelligence/service";
import { resolveInvoiceIdentity, type InvoiceIdentityResolution } from "@/lib/domain/invoice-matching";
import { lineItemEvidenceMap, type EvidenceReferenceForMapping } from "@/lib/documents/evidence-mapping";
import { evaluateTariffReview } from "@/lib/domain/tariff-review";
import { resolveKnownVendorIdentity } from "@/lib/vendors/normalize";

type DatabaseClient = ReturnType<typeof createServerSupabaseClient>;
type SourceType = "manual_upload" | "email_forwarding" | "provider_integration";

function toFiniteAmount(value: string | number | null | undefined): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function sourceFieldsForFinding(code: string): string[] {
  switch (code) {
    case "arithmetic_mismatch":
      return ["invoice.totalAmount", "invoice.subtotal", "invoice.taxTotal", "invoice.currentCharges"];
    case "tax_or_fee_question":
      return ["invoice.taxTotal", "invoice.totalAmount"];
    case "unverified_vendor":
      return ["vendorName"];
    default:
      return [];
  }
}

export async function createInvoiceRecordFromExtraction(input: {
  db: DatabaseClient;
  organizationId: string;
  documentId: string;
  extractionVersionId: string;
  providedRelationshipId?: string | null;
  sourceType: SourceType;
  intelligence: DocumentIntelligence;
  evidenceReferences?: EvidenceReferenceForMapping[];
}) {
  const candidate = input.intelligence.invoice;
  if (!candidate || !["invoice", "statement"].includes(input.intelligence.classification)) {
    return null;
  }

  // Call shared 8-step vendor and category resolver
  const knownVendor = resolveKnownVendorIdentity(input.intelligence.vendorName || "");
  const vendorResult = await resolveVendorAndCategory({
    db: input.db,
    organizationId: input.organizationId,
    extractedName: knownVendor?.canonicalName || input.intelligence.vendorName || "Unknown Vendor",
    providedRelationshipId: input.providedRelationshipId,
    categoryHint: knownVendor?.categoryName,
    documentId: input.documentId,
  });

  const categoryResolution = await categoryIntelligence.resolveCategory({
    rawCategory: vendorResult.categoryName,
    vendorName: input.intelligence.vendorName,
    lineItemDescriptions: candidate.lineItems.map((line) => line.description),
  });
  const { data: taxonomyCategory, error: taxonomyCategoryError } = await input.db
    .from("vendor_categories")
    .select("id")
    .eq("canonical_key", categoryResolution.key)
    .maybeSingle();
  if (taxonomyCategoryError) throw taxonomyCategoryError;

  const identity = await resolveIdentityForInvoice({
    db: input.db,
    organizationId: input.organizationId,
    candidate,
  });

  const lineItemEvidenceIds = lineItemEvidenceMap({
    evidence: input.evidenceReferences ?? [],
    lineItems: candidate.lineItems,
  });
  const lineItemEvidenceMissing = candidate.lineItems.some(
    (_line, index) => lineItemEvidenceIds[index]?.length === 0,
  );

  const reconciliation = reconcileInvoice(candidate);
  const review = classifyInvoiceReview({
    hasVendor: Boolean(vendorResult.organizationVendorId),
    invoiceNumber: candidate.invoiceNumber,
    invoiceDate: candidate.invoiceDate,
    servicePeriodStart: candidate.servicePeriodStart,
    servicePeriodEnd: candidate.servicePeriodEnd,
    currency: input.intelligence.currency,
    totalAmount: candidate.totalAmount,
    expenseCategory: categoryResolution.displayName,
    reconciliationStatus: reconciliation.status,
    confidence: input.intelligence.confidence,
    additionalIssueCodes: [
      ...identity.issueCodes,
      ...(lineItemEvidenceMissing ? ["line_item_evidence_missing"] : []),
    ],
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
      previous_balance: candidate.previousBalance,
      payments_and_credits: candidate.paymentsAndCredits,
      balance_forward: candidate.balanceForward,
      current_charges: candidate.currentCharges,
      current_period_credits: candidate.currentPeriodCredits,
      total_amount: candidate.totalAmount,
      amount_due: candidate.amountDue,
      energy_service: candidate.energyService,
      expense_account_id: identity.expenseAccountId,
      location_id: identity.locationId,
      workspace_customer_match_status: identity.workspaceCustomerMatchStatus,
      expense_account_match_status: identity.expenseAccountMatchStatus,
      service_location_match_status: identity.serviceLocationMatchStatus,
      expense_category: categoryResolution.displayName,
      expense_category_id: taxonomyCategory?.id ?? vendorResult.categoryId,
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
        identityMatch: identity,
        extractedVendorName: input.intelligence.vendorName,
        isCandidateVendor: vendorResult.isCandidate,
        categoryIntelligence: {
          categoryKey: categoryResolution.key,
          packVersion: categoryResolution.expertPackVersion,
          resolutionSource: categoryResolution.source,
          confidence: categoryResolution.confidence,
        },
      },
    })
    .select("id")
    .single();
  if (invoiceError) throw invoiceError;

  try {
    if (candidate.lineItems.length) {
      const { data: storedLines, error: lineError } = await input.db
        .from("invoice_line_items")
        .insert(
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
        metadata: {
          sourceKey: line.sourceKey ?? `line-${index + 1}`,
          evidenceReferenceIds: lineItemEvidenceIds[index] ?? [],
        },
      })),
        )
        .select("id, line_number, description, amount, quantity, unit_price");
      if (lineError) throw lineError;

      const normalizedLines = await categoryIntelligence.normalizeLineItems(
        (storedLines ?? []).map((line, storedIndex) => ({
          id: line.id,
          description: line.description,
          amount: Number(line.amount),
          quantity: line.quantity === null ? undefined : Number(line.quantity),
          unitPrice:
            line.unit_price === null ? undefined : Number(line.unit_price),
          evidenceIds: lineItemEvidenceIds[
            Number.isInteger(Number(line.line_number))
              ? Math.max(0, Number(line.line_number) - 1)
              : storedIndex
          ] ?? [],
        })),
        categoryResolution.key,
      );
      const { error: classificationError } = await input.db
        .from("invoice_line_item_classifications")
        .insert(
          normalizedLines.map((line) => ({
            invoice_line_item_id: line.lineItemId,
            category_id: taxonomyCategory?.id ?? null,
            canonical_code: line.canonicalCode,
            confidence: line.confidence,
            source: "pack_rule",
            expert_pack_version: line.packVersion ?? null,
            evidence_reference_ids: line.evidenceIds,
            review_status:
              line.reviewRequired || line.evidenceIds.length === 0
                ? "needs_review"
                : "auto_approved",
          })),
        );
      if (classificationError) throw classificationError;
    }

    const billAnalysis = await categoryIntelligence.analyzeBill({
      invoiceId: invoice.id,
      totalAmount: toFiniteAmount(candidate.totalAmount),
      subtotalAmount: candidate.subtotal === null ? null : toFiniteAmount(candidate.subtotal),
      taxAmount: candidate.taxTotal === null ? null : toFiniteAmount(candidate.taxTotal),
      currency: input.intelligence.currency ?? "USD",
      invoiceNumber: candidate.invoiceNumber,
      invoiceDate: candidate.invoiceDate,
      dueDate: candidate.dueDate,
      vendorMatchStatus: vendorResult.matchStatus,
      reconciliationStatus: reconciliation.status,
      lineItems: candidate.lineItems.map((line) => ({
        description: line.description,
        amount: toFiniteAmount(line.amount),
      })),
      categoryKey: categoryResolution.key,
    });
    const benchmark = await categoryIntelligence.benchmark({
      categoryKey: categoryResolution.key,
      metric: "effective_rate",
      billedAmount: toFiniteAmount(candidate.totalAmount),
      serviceDate: candidate.invoiceDate,
    });
    const tariffReview = categoryResolution.parentKey === "energy-utilities"
      ? evaluateTariffReview({
        utilityTerritory: candidate.energyService?.utilityTerritory ?? null,
        serviceIdentifier: candidate.energyService?.serviceIdentifier ?? null,
        assignedRateCode: candidate.energyService?.assignedRateCode ?? null,
        serviceVoltage: candidate.energyService?.serviceVoltage ?? null,
        meteringConfiguration: candidate.energyService?.meteringConfiguration ?? null,
        serviceClass: candidate.energyService?.serviceClass ?? null,
        billedDemandKw: candidate.energyService?.billedDemandKw ?? null,
        historicalDemandKw: candidate.energyService?.historicalDemandKw ?? null,
        ratchetApplies: candidate.energyService?.ratchetApplies ?? null,
        officialSource: null,
        comparison: null,
      })
      : null;
    const persistedFindings = billAnalysis.findings.map((finding) => {
      const allowedFields = new Set(sourceFieldsForFinding(finding.code));
      const evidenceReferenceIds = (input.evidenceReferences ?? [])
        .filter((reference) => reference.fieldPath && allowedFields.has(reference.fieldPath))
        .map((reference) => reference.id);
      return {
        ...finding,
        evidenceReferenceIds,
        evidenceStatus: evidenceReferenceIds.length > 0 ? "evidence_backed" : "needs_evidence",
      };
    });
    const { error: analysisError } = await input.db
      .from("category_analysis_runs")
      .insert({
        organization_id: input.organizationId,
        document_id: input.documentId,
        invoice_id: invoice.id,
        category_id: taxonomyCategory?.id ?? null,
        pack_version: billAnalysis.packVersion,
        rules_executed: billAnalysis.findings.map((finding) => finding.findingId),
        live_sources_used: [],
        calculations: {
          reconciliationStatus: reconciliation.status,
          reconciliationDifference: reconciliation.difference,
          benchmarkStatus: benchmark.status,
          benchmarkMissingDimensions: benchmark.missingDimensions,
          tariffReview,
        },
        findings: persistedFindings,
        missing_dimensions: [...billAnalysis.missingFields, ...benchmark.missingDimensions, ...(tariffReview?.missingDimensions ?? [])],
        confidence: categoryResolution.confidence,
        trace_id: crypto.randomUUID(),
      });
    if (analysisError) throw analysisError;
  } catch (error) {
    await input.db.from("invoices").delete().eq("id", invoice.id);
    throw error;
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

async function resolveIdentityForInvoice(input: {
  db: DatabaseClient;
  organizationId: string;
  candidate: NonNullable<DocumentIntelligence["invoice"]>;
}): Promise<InvoiceIdentityResolution> {
  const hasIdentityEvidence = Boolean(
    input.candidate.accountNumberLast4 || input.candidate.energyService,
  );
  const unknown: InvoiceIdentityResolution = {
    workspaceCustomerMatchStatus: "unknown",
    expenseAccountMatchStatus: "unknown",
    serviceLocationMatchStatus: "unknown",
    expenseAccountId: null,
    locationId: null,
    issueCodes: [],
  };
  if (!hasIdentityEvidence) return unknown;

  const [organizationResult, accountsResult, locationsResult] = await Promise.all([
    input.db.from("organizations").select("name,legal_name").eq("id", input.organizationId).maybeSingle(),
    input.db.from("expense_accounts").select("*").eq("organization_id", input.organizationId),
    input.db.from("locations").select("*").eq("organization_id", input.organizationId),
  ]);
  const failed = [organizationResult, accountsResult, locationsResult].find((result) => result.error);
  if (failed?.error) throw failed.error;

  const organization = (organizationResult.data ?? {}) as Record<string, unknown>;
  return resolveInvoiceIdentity({
    candidate: input.candidate,
    workspaceNames: [organization.name, organization.legal_name].filter((value): value is string => typeof value === "string"),
    accounts: Array.isArray(accountsResult.data) ? accountsResult.data as Record<string, unknown>[] : [],
    locations: Array.isArray(locationsResult.data) ? locationsResult.data as Record<string, unknown>[] : [],
  });
}
