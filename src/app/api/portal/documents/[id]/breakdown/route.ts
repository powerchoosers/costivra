import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { cleanUuid } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";

const PROCESSING_STATUSES = new Set([
  "pending_upload",
  "uploaded",
  "processing",
]);

const SCAN_STATUSES = new Set([
  "pending",
  "scanning",
  "clean",
  "infected",
  "unavailable",
  "failed",
]);

type AnyRecord = Record<string, unknown>;

function asRecord(value: unknown): AnyRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as AnyRecord)
    : {};
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function response<T>(payload: T, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}

function logDatabaseFailure(input: {
  traceId: string;
  documentId: string;
  organizationId: string;
  error: unknown;
}) {
  const record = asRecord(input.error);
  console.error("Document breakdown database failure", {
    traceId: input.traceId,
    route: "/api/portal/documents/[id]/breakdown",
    documentId: input.documentId,
    organizationId: input.organizationId,
    code: stringValue(record.code, "UNKNOWN_DATABASE_ERROR"),
  });
  return response(
    {
      error: "Document analysis could not be loaded.",
      code: "DOCUMENT_BREAKDOWN_QUERY_FAILED",
      traceId: input.traceId,
    },
    500,
  );
}

function documentPayload(document: AnyRecord, securityScanStatus: string) {
  const status = stringValue(document.status, "unknown");
  const canDownload =
    securityScanStatus === "clean" &&
    (status === "ready" || status === "needs_review");

  return {
    id: stringValue(document.id),
    filename: stringValue(document.original_filename, "Source document"),
    mimeType: stringValue(document.mime_type),
    byteSize: Number(document.byte_size ?? 0),
    status,
    extractionSummary:
      typeof document.extraction_summary === "string"
        ? document.extraction_summary
        : null,
    createdAt: stringValue(document.created_at),
    securityScanStatus,
    securityScannedAt:
      typeof document.security_scanned_at === "string"
        ? document.security_scanned_at
        : null,
    sha256: stringValue(document.sha256) || null,
    downloadUrl: canDownload
      ? `/api/portal/documents/${stringValue(document.id)}/download`
      : null,
  };
}

function processingMessage(status: string, securityScanStatus: string) {
  if (securityScanStatus === "infected" || status === "rejected") {
    return "This file was blocked by the security review and cannot be opened.";
  }
  if (securityScanStatus !== "clean") {
    return "Costivra is waiting for the file security check to finish.";
  }
  if (status === "failed") {
    return "Costivra could not finish reading this bill. It needs review.";
  }
  return "Costivra is still reading this bill.";
}

const LEGACY_CLEAN_INGESTION_ACTIONS = [
  "document.uploaded_and_extracted",
  "document.quarantine_released_and_extracted",
  "document.inbound_attachment_processed",
];

async function resolveSecurityScan(
  db: ReturnType<typeof requirePortalContext> extends Promise<infer Context>
    ? Context extends { db: infer Database }
      ? Database
      : never
    : never,
  document: AnyRecord,
  organizationId: string,
  documentId: string,
  traceId: string,
) {
  const storedStatus = stringValue(document.security_scan_status);
  if (storedStatus) {
    return {
      status: SCAN_STATUSES.has(storedStatus) ? storedStatus : "failed",
      scannedAt: typeof document.security_scanned_at === "string" ? document.security_scanned_at : null,
    };
  }

  const documentStatus = stringValue(document.status);
  if (PROCESSING_STATUSES.has(documentStatus)) {
    return { status: "pending", scannedAt: null };
  }

  const { data: legacyCleanEvent, error: legacyCleanEventError } = await db
    .from("audit_events")
    .select("created_at")
    .eq("organization_id", organizationId)
    .eq("resource_type", "document")
    .eq("resource_id", documentId)
    .in("action", LEGACY_CLEAN_INGESTION_ACTIONS)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (legacyCleanEventError) {
    return logDatabaseFailure({
      traceId,
      documentId,
      organizationId,
      error: legacyCleanEventError,
    });
  }

  if (legacyCleanEvent) {
    return {
      status: "clean",
      scannedAt: stringValue(asRecord(legacyCleanEvent).created_at) || null,
    };
  }

  return { status: "unavailable", scannedAt: null };
}

function normalizeFinding(value: unknown) {
  const finding = asRecord(value);
  const severity = stringValue(finding.severity, "info");
  const evidenceReferenceIds = stringArray(finding.evidenceReferenceIds);
  return {
    type:
      severity === "critical" || severity === "high"
        ? ("alert" as const)
        : severity === "medium"
          ? ("warning" as const)
          : ("info" as const),
    title: stringValue(finding.title, "Review item"),
    message: stringValue(finding.message, "This item needs review."),
    evidenceBacked: evidenceReferenceIds.length > 0,
    state: evidenceReferenceIds.length > 0 ? "evidence_backed" as const : "needs_evidence" as const,
    evidenceReferenceIds,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const traceId = randomUUID();
  const id = cleanUuid((await params).id);
  if (!id) return response({ error: "Document ID required." }, 400);

  try {
    const requestUrl = new URL(request.url);
    const requestedPage = Number(requestUrl.searchParams.get("evidencePage") ?? "1");
    const requestedPageSize = Number(requestUrl.searchParams.get("evidencePageSize") ?? "50");
    const evidencePage = Number.isInteger(requestedPage) && requestedPage >= 1 ? requestedPage : 1;
    const evidencePageSize = Number.isInteger(requestedPageSize)
      ? Math.min(100, Math.max(10, requestedPageSize))
      : 50;
    const { db, organizationId } = await requirePortalContext();
    const { data: document, error: documentError } = await db
      .from("documents")
      .select(
        "id, original_filename, mime_type, byte_size, status, extraction_summary, created_at, sha256",
      )
      .eq("id", id)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (documentError) {
      return logDatabaseFailure({
        traceId,
        documentId: id,
        organizationId,
        error: documentError,
      });
    }
    if (!document) return response({ error: "Document not found or access denied." }, 404);

    const securityScan = await resolveSecurityScan(
      db,
      asRecord(document),
      organizationId,
      id,
      traceId,
    );
    if (securityScan instanceof NextResponse) return securityScan;
    const securityScanStatus = securityScan.status;
    const currentDocument = documentPayload(
      { ...asRecord(document), security_scanned_at: securityScan.scannedAt },
      securityScanStatus,
    );

    const { data: invoice, error: invoiceError } = await db
      .from("invoices")
      .select(
        "id, invoice_number, invoice_date, due_date, total_amount, subtotal, tax_total, currency, review_status, vendor_match_status, vendor_match_confidence, reconciliation_status, organization_vendor_id, review_issue_codes, metadata, expense_category, category_confidence",
      )
      .eq("document_id", id)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (invoiceError) {
      return logDatabaseFailure({ traceId, documentId: id, organizationId, error: invoiceError });
    }

    if (securityScanStatus !== "clean" || PROCESSING_STATUSES.has(currentDocument.status) || !invoice) {
      return response(
        {
          analysisReady: false,
          documentId: id,
          status: currentDocument.status,
          message: processingMessage(currentDocument.status, securityScanStatus),
          document: currentDocument,
        },
        securityScanStatus === "infected" || currentDocument.status === "rejected"
          ? 409
          : 202,
      );
    }

    const { data: analysisRun, error: analysisError } = await db
      .from("category_analysis_runs")
      .select(
        "id, pack_version, findings, missing_dimensions, calculations, confidence, created_at",
      )
      .eq("organization_id", organizationId)
      .eq("invoice_id", invoice.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (analysisError) {
      return logDatabaseFailure({ traceId, documentId: id, organizationId, error: analysisError });
    }
    if (!analysisRun) {
      return response(
        {
          analysisReady: false,
          documentId: id,
          status: currentDocument.status,
          message: "Costivra has saved this bill and is still preparing its breakdown.",
          document: currentDocument,
        },
        202,
      );
    }

    let vendor: {
      id: string;
      name: string;
      category: string;
      website: string | null;
      catalogStatus: string;
      logoUrl: string | null;
      annualizedSpend: number;
    } | null = null;

    if (invoice.organization_vendor_id) {
      const { data: relationship, error: relationshipError } = await db
        .from("organization_vendors")
        .select(
          "id, annualized_spend, display_name_override, category_override, website_override, vendors(id, canonical_name, category, website, catalog_status, logo_url)",
        )
        .eq("id", invoice.organization_vendor_id)
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (relationshipError) {
        return logDatabaseFailure({ traceId, documentId: id, organizationId, error: relationshipError });
      }
      if (relationship?.vendors) {
        const catalogVendor = relationship.vendors as unknown as AnyRecord;
        vendor = {
          id: stringValue(catalogVendor.id),
          name:
            stringValue(relationship.display_name_override) ||
            stringValue(catalogVendor.canonical_name, "Unassigned"),
          category:
            stringValue(relationship.category_override) ||
            stringValue(catalogVendor.category, "General"),
          website:
            stringValue(relationship.website_override) ||
            stringValue(catalogVendor.website) ||
            null,
          catalogStatus: stringValue(catalogVendor.catalog_status),
          logoUrl: stringValue(catalogVendor.logo_url) || null,
          annualizedSpend: Number(relationship.annualized_spend ?? 0),
        };
      }
    }

    const { data: lineItemRows, error: lineItemsError } = await db
      .from("invoice_line_items")
      .select("id, line_number, description, amount, quantity, unit_price")
      .eq("invoice_id", invoice.id)
      .eq("organization_id", organizationId)
      .order("line_number", { ascending: true });
    if (lineItemsError) {
      return logDatabaseFailure({ traceId, documentId: id, organizationId, error: lineItemsError });
    }

    const lineItems = (lineItemRows ?? []).map((item) => ({
      id: item.id,
      lineNumber: item.line_number ?? 1,
      description: item.description ?? "Line item",
      amount: Number(item.amount ?? 0),
      quantity: item.quantity != null ? Number(item.quantity) : undefined,
      unitPrice: item.unit_price != null ? Number(item.unit_price) : undefined,
    }));

    const classifications = lineItems.length
      ? await db
          .from("invoice_line_item_classifications")
          .select(
            "invoice_line_item_id, canonical_code, confidence, expert_pack_version, evidence_reference_ids, review_status",
          )
          .in(
            "invoice_line_item_id",
            lineItems.map((item) => item.id),
          )
      : { data: [], error: null };
    if (classifications.error) {
      return logDatabaseFailure({ traceId, documentId: id, organizationId, error: classifications.error });
    }
    const classificationByLine = new Map(
      (classifications.data ?? []).map((item) => [item.invoice_line_item_id, item]),
    );
    const lineItemExplanations = lineItems.map((item) => {
      const classification = classificationByLine.get(item.id);
      const canonicalCode = stringValue(classification?.canonical_code) || null;
      return {
        lineItemId: item.id,
        canonicalCode,
        originalDescription: item.description,
        explanation: canonicalCode
          ? "Stored category classification from the invoice analysis."
          : "No stored category classification is available for this line item.",
        chargeClass: "unknown",
        confidence: Number(classification?.confidence ?? 0),
        reviewRequired: classification?.review_status !== "auto_approved",
        matchedAlias: null,
        evidenceIds: stringArray(classification?.evidence_reference_ids),
        expertPackVersion: stringValue(classification?.expert_pack_version) || null,
      };
    });

    const makeEvidenceQuery = (includeSourceKey: boolean) => {
      let query = db
        .from("evidence_references")
        .select(includeSourceKey
          ? "id, page_number, text_excerpt, field_path, source_key"
          : "id, page_number, text_excerpt, field_path")
        .eq("document_id", id)
        .order("page_number", { ascending: true, nullsFirst: false })
        .order("field_path", { ascending: true, nullsFirst: true });
      if (includeSourceKey) {
        query = query.order("source_key", { ascending: true, nullsFirst: true });
      }
      return query.order("created_at", { ascending: true });
    };
    let evidenceQuery = makeEvidenceQuery(true);
    let evidenceResult = typeof evidenceQuery.range === "function"
      ? await evidenceQuery.range((evidencePage - 1) * evidencePageSize, evidencePage * evidencePageSize)
      : await evidenceQuery.limit(100);
    if (evidenceResult.error && stringValue(asRecord(evidenceResult.error).code) === "42703") {
      evidenceQuery = makeEvidenceQuery(false);
      evidenceResult = typeof evidenceQuery.range === "function"
        ? await evidenceQuery.range((evidencePage - 1) * evidencePageSize, evidencePage * evidencePageSize)
        : await evidenceQuery.limit(100);
    }
    const evidenceError = evidenceResult.error;
    const evidenceRows = evidenceResult.data ?? [];
    const hasNextEvidencePage = typeof evidenceQuery.range === "function"
      ? evidenceRows.length > evidencePageSize
      : false;
    if (evidenceError) {
      return logDatabaseFailure({ traceId, documentId: id, organizationId, error: evidenceError });
    }
    const evidence = evidenceRows.slice(0, evidencePageSize).map((item) => {
      const row = asRecord(item);
      return {
        id: stringValue(row.id),
        pageNumber: row.page_number == null ? null : Number(row.page_number),
        textExcerpt: typeof row.text_excerpt === "string" ? row.text_excerpt : "",
        fieldPath: typeof row.field_path === "string" ? row.field_path : null,
        sourceKey: typeof row.source_key === "string" ? row.source_key : null,
      };
    });

    const lineItemEvidenceIds = new Set(
      lineItemExplanations.flatMap((item) => item.evidenceIds),
    );

    const calculations = asRecord(analysisRun.calculations);
    const findings = Array.isArray(analysisRun.findings)
      ? analysisRun.findings
      : [];
    const missingDimensions = stringArray(analysisRun.missing_dimensions);
    const benchmarkStatus = stringValue(
      calculations.benchmarkStatus,
      "insufficient_data",
    ) as "comparable" | "directional" | "quote_required" | "insufficient_data" | "unsupported";
    const metadata = asRecord(invoice.metadata);
    const storedCategory = asRecord(metadata.categoryIntelligence);
    const categoryName = stringValue(
      invoice.expense_category,
      vendor?.category ?? "Uncategorized",
    );
    const categoryKey = stringValue(storedCategory.categoryKey, "stored-invoice-category");
    const totalAmount = invoice.total_amount == null ? null : Number(invoice.total_amount);
    const tariffReview = asRecord(calculations.tariffReview);

    const anomalies = findings.map(normalizeFinding);
    const guidance = [
      ...(invoice.vendor_match_status !== "exact"
        ? [{
            title: "Verify Vendor Identity",
            action: "Confirm the vendor relationship before accepting category-specific findings.",
            priority: "high",
          }]
        : []),
      ...(invoice.reconciliation_status !== "reconciled"
        ? [{
            title: "Complete Bill Reconciliation",
            action: "Review credits, taxes, fees, and line items against the source bill before treating this record as final.",
            priority: "high",
          }]
        : []),
      {
        title: "Market Comparison",
        action: benchmarkStatus === "unsupported"
          ? "No reviewed benchmark method is stored for this category. A specialist must review the bill before any market conclusion is made."
          : "No source-backed comparable benchmark is stored for this invoice.",
        priority: "medium",
      },
      ...(tariffReview.state === "needs_evidence"
        ? [{
            title: stringValue(tariffReview.title, "Tariff review may be worthwhile"),
            action: stringValue(tariffReview.message, "Current bill does not identify the assigned delivery rate schedule. Obtain the official rate code and current tariff before drawing a conclusion."),
            priority: "medium",
          }]
        : []),
      {
        title: "Audit Line Items",
        action: lineItemExplanations.some((item) => item.reviewRequired)
          ? "Review unclassified or draft line items against the source bill and active contract."
          : "Review stored line-item classifications against the source bill.",
        priority: "medium",
      },
    ];

    return response({
      analysisReady: true,
      document: currentDocument,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        invoiceDate: invoice.invoice_date,
        dueDate: invoice.due_date,
        totalAmount,
        subtotalAmount: invoice.subtotal != null ? Number(invoice.subtotal) : null,
        taxAmount: invoice.tax_total != null ? Number(invoice.tax_total) : null,
        currency: invoice.currency ?? "USD",
        reviewStatus: invoice.review_status,
        vendorMatchStatus: invoice.vendor_match_status,
        reconciliationStatus: invoice.reconciliation_status,
      },
      vendor,
      category: {
        key: categoryKey,
        displayName: categoryName,
        confidence: Number(invoice.category_confidence ?? storedCategory.confidence ?? analysisRun.confidence ?? 0),
        expertPackVersion: stringValue(storedCategory.packVersion) || stringValue(analysisRun.pack_version) || null,
      },
      lineItems,
      lineItemExplanations,
      evidence,
      evidenceCounts: {
        invoiceField: evidence.length - lineItemEvidenceIds.size,
        lineItem: lineItemEvidenceIds.size,
        opportunity: 0,
      },
      evidencePagination: {
        page: evidencePage,
        pageSize: evidencePageSize,
        hasNextPage: hasNextEvidencePage,
        nextPage: hasNextEvidencePage ? evidencePage + 1 : null,
      },
      anomalies,
      billQuality: {
        status: invoice.review_status === "needs_review" ? "review" : "good",
        score: null,
        missingFields: missingDimensions,
      },
      marketBenchmark: {
        category: categoryName,
        billedAmount: totalAmount ?? 0,
        estimatedMarketRate: null,
        variancePercentage: null,
        potentialAnnualSavings: null,
        benchmarkSource: "No source-backed comparable benchmark is stored for this invoice.",
        benchmarkStatus,
        comparisonRange: null,
        missingDimensions: stringArray(calculations.benchmarkMissingDimensions),
        caveats: ["Opening a breakdown does not run a new market analysis."],
        asOf: null,
      },
      tariffReview: Object.keys(tariffReview).length ? tariffReview : null,
      guidance,
    });
  } catch (error) {
    // Preserve the normal auth/membership contract for expected portal errors,
    // but never expose database messages or turn them into a 404.
    const record = asRecord(error);
    if (error instanceof Error && ["AUTH_REQUIRED", "NO_ORGANIZATION_MEMBERSHIP", "PORTAL_READ_ONLY"].includes(error.message)) {
      const status = error.message === "AUTH_REQUIRED" ? 401 : error.message === "NO_ORGANIZATION_MEMBERSHIP" ? 403 : 403;
      return response({ error: error.message === "AUTH_REQUIRED" ? "Please sign in again." : "This account cannot access a Costivra workspace." }, status);
    }
    console.error("Document breakdown unexpected failure", {
      traceId,
      route: "/api/portal/documents/[id]/breakdown",
      code: stringValue(record.code, "DOCUMENT_BREAKDOWN_FAILED"),
    });
    return response({ error: "Document analysis could not be loaded.", code: "DOCUMENT_BREAKDOWN_FAILED", traceId }, 500);
  }
}
