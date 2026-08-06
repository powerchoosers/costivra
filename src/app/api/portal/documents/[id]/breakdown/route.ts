import { NextResponse } from "next/server";
import { apiError, cleanUuid } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";
import { categoryIntelligence } from "@/lib/category-intelligence/service";

const CLEAN_SCAN_AUDIT_ACTIONS = [
  "document.uploaded_and_extracted",
  "document.quarantine_released_and_extracted",
  "document.inbound_attachment_processed",
] as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db, organizationId } = await requirePortalContext();
    const id = cleanUuid((await params).id);
    if (!id) {
      return NextResponse.json(
        { error: "Document ID required." },
        { status: 400 },
      );
    }

    const { data: document, error: documentError } = await db
      .from("documents")
      .select(
        "id, original_filename, mime_type, byte_size, status, extraction_summary, created_at, storage_path, sha256",
      )
      .eq("id", id)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (documentError) {
      console.error("Document breakdown lookup failed", {
        documentId: id,
        code: documentError.code,
      });
      return NextResponse.json(
        { error: "Document analysis could not be loaded." },
        { status: 500 },
      );
    }

    if (!document) {
      return NextResponse.json(
        { error: "Document not found or access denied." },
        { status: 404 },
      );
    }

    const { data: scanAudit } = await db
      .from("audit_events")
      .select("action, created_at")
      .eq("organization_id", organizationId)
      .eq("resource_type", "document")
      .eq("resource_id", document.id)
      .in("action", [...CLEAN_SCAN_AUDIT_ACTIONS])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: invoice } = await db
      .from("invoices")
      .select(
        "id, invoice_number, invoice_date, due_date, total_amount, subtotal, tax_total, currency, review_status, vendor_match_status, vendor_match_confidence, reconciliation_status, organization_vendor_id, review_issue_codes, metadata",
      )
      .eq("document_id", id)
      .eq("organization_id", organizationId)
      .maybeSingle();

    let vendor: {
      id: string;
      name: string;
      category: string;
      website: string | null;
      catalogStatus: string;
      logoUrl: string | null;
      annualizedSpend: number;
    } | null = null;

    if (invoice?.organization_vendor_id) {
      const { data: relationship } = await db
        .from("organization_vendors")
        .select(
          "id, annualized_spend, display_name_override, category_override, website_override, vendors(id, canonical_name, category, website, catalog_status, logo_url)",
        )
        .eq("id", invoice.organization_vendor_id)
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (relationship?.vendors) {
        const catalogVendor = relationship.vendors as unknown as {
          id: string;
          canonical_name: string;
          category?: string | null;
          website?: string | null;
          catalog_status: string;
          logo_url?: string | null;
        };
        vendor = {
          id: catalogVendor.id,
          name:
            relationship.display_name_override || catalogVendor.canonical_name,
          category:
            relationship.category_override ||
            catalogVendor.category ||
            "General",
          website:
            relationship.website_override || catalogVendor.website || null,
          catalogStatus: catalogVendor.catalog_status,
          logoUrl: catalogVendor.logo_url ?? null,
          annualizedSpend: relationship.annualized_spend ?? 0,
        };
      }
    }

    let lineItems: Array<{
      id: string;
      lineNumber: number;
      description: string;
      amount: number;
      quantity?: number;
      unitPrice?: number;
    }> = [];

    if (invoice) {
      const { data: rows } = await db
        .from("invoice_line_items")
        .select("id, line_number, description, amount, quantity, unit_price")
        .eq("invoice_id", invoice.id)
        .eq("organization_id", organizationId)
        .order("line_number", { ascending: true });

      lineItems = (rows ?? []).map((item) => ({
        id: item.id,
        lineNumber: item.line_number ?? 1,
        description: item.description ?? "Line item",
        amount: Number(item.amount ?? 0),
        quantity:
          item.quantity != null ? Number(item.quantity) : undefined,
        unitPrice:
          item.unit_price != null ? Number(item.unit_price) : undefined,
      }));
    }

    // The document was already validated against the authenticated organization.
    // evidence_references has no organization_id column and is safely scoped by
    // its foreign key to this validated document ID.
    const { data: evidenceRows } = await db
      .from("evidence_references")
      .select("id, page_number, text_excerpt, field_path")
      .eq("document_id", document.id)
      .order("page_number", { ascending: true })
      .limit(25);

    const evidence = (evidenceRows ?? []).map((item) => ({
      id: item.id,
      pageNumber: item.page_number ?? 1,
      textExcerpt: item.text_excerpt ?? "",
      fieldPath: item.field_path ?? null,
    }));

    const categoryResolution = await categoryIntelligence.resolveCategory({
      vendorName: vendor?.name,
      rawCategory: vendor?.category,
      lineItemDescriptions: lineItems.map((item) => item.description),
      extractedText: document.extraction_summary,
    });

    const totalAmount = Number(invoice?.total_amount ?? 0);
    const billQuality = await categoryIntelligence.analyzeBill({
      invoiceId: invoice?.id,
      totalAmount,
      subtotalAmount:
        invoice?.subtotal != null ? Number(invoice.subtotal) : null,
      taxAmount:
        invoice?.tax_total != null ? Number(invoice.tax_total) : null,
      currency: invoice?.currency ?? "USD",
      invoiceNumber: invoice?.invoice_number,
      invoiceDate: invoice?.invoice_date,
      dueDate: invoice?.due_date,
      vendorMatchStatus: invoice?.vendor_match_status,
      reconciliationStatus: invoice?.reconciliation_status,
      lineItems: lineItems.map((item) => ({
        description: item.description,
        amount: item.amount,
      })),
      categoryKey: categoryResolution.key,
    });

    const benchmark = await categoryIntelligence.benchmark({
      categoryKey: categoryResolution.key,
      metric: "effective_rate",
      billedAmount: totalAmount,
      serviceDate: invoice?.invoice_date,
      unit: invoice?.currency ?? "USD",
    });

    const normalizedLineItems = await categoryIntelligence.normalizeLineItems(
      lineItems,
      categoryResolution.key,
    );
    const lineItemExplanations = normalizedLineItems.map((item, index) => ({
      lineItemId: item.lineItemId || `li-${index}`,
      canonicalCode: item.canonicalCode,
      originalDescription: item.originalDescription,
      explanation: item.explanation,
      chargeClass: item.chargeClass,
      confidence: item.confidence,
      reviewRequired: item.reviewRequired,
      matchedAlias: item.matchedAlias,
      evidenceIds: item.evidenceIds,
    }));

    const anomalies = billQuality.findings.map((finding) => ({
      type:
        finding.severity === "critical" || finding.severity === "high"
          ? ("alert" as const)
          : finding.severity === "medium"
            ? ("warning" as const)
            : ("info" as const),
      title: finding.title,
      message: finding.message,
    }));

    const marketBenchmark = {
      category: categoryResolution.displayName,
      billedAmount: totalAmount,
      estimatedMarketRate: benchmark.estimatedMarketRate,
      variancePercentage: benchmark.variancePercentage,
      potentialAnnualSavings: benchmark.potentialAnnualSavings,
      benchmarkSource: benchmark.benchmarkSource,
      benchmarkStatus: benchmark.status,
      comparisonRange: benchmark.comparisonRange,
      missingDimensions: benchmark.missingDimensions,
      caveats: benchmark.caveats,
      asOf: benchmark.asOf,
    };

    const marketGuidance =
      benchmark.status === "unsupported"
        ? "Costivra does not yet have a reviewed benchmark method for this category. A category specialist should review the bill before any market conclusion is made."
        : benchmark.status === "insufficient_data"
          ? `A comparable market review requires: ${benchmark.missingDimensions.join(", ")}.`
          : "The bill has enough descriptive dimensions for research, but a dated source-backed quote or comparable dataset is still required.";

    const guidance = [
      ...(invoice?.vendor_match_status !== "exact"
        ? [
            {
              title: "Verify Vendor Identity",
              action:
                "Confirm the canonical vendor and service category before approving category-specific findings.",
              priority: "high",
            },
          ]
        : []),
      ...(invoice?.reconciliation_status !== "reconciled"
        ? [
            {
              title: "Complete Bill Reconciliation",
              action:
                "Review the extracted credits, taxes, fees, and line items before accepting the invoice as a normalized expense.",
              priority: "high",
            },
          ]
        : []),
      {
        title: "Market Comparison",
        action: marketGuidance,
        priority: benchmark.status === "unsupported" ? "high" : "medium",
      },
      {
        title: "Audit Line Items",
        action:
          lineItemExplanations.some((item) => item.reviewRequired)
            ? "Review unclassified or draft-pack line items against the source bill and active contract."
            : "Review line items against the active contract for unexpected recurring fees.",
        priority: "medium",
      },
    ];

    const securityScanStatus = scanAudit
      ? "passed"
      : document.status === "quarantined"
        ? "quarantined"
        : "not_recorded";

    return NextResponse.json(
      {
        document: {
          id: document.id,
          filename: document.original_filename,
          mimeType: document.mime_type,
          byteSize: document.byte_size,
          status: document.status,
          extractionSummary: document.extraction_summary,
          createdAt: document.created_at,
          securityScanStatus,
          securityScannedAt: scanAudit?.created_at ?? null,
          sha256Digest: document.sha256 ?? null,
          downloadUrl: `/api/portal/documents/${document.id}/download`,
        },
        invoice: invoice
          ? {
              id: invoice.id,
              invoiceNumber: invoice.invoice_number,
              invoiceDate: invoice.invoice_date,
              dueDate: invoice.due_date,
              totalAmount:
                invoice.total_amount != null
                  ? Number(invoice.total_amount)
                  : null,
              subtotalAmount:
                invoice.subtotal != null ? Number(invoice.subtotal) : null,
              taxAmount:
                invoice.tax_total != null ? Number(invoice.tax_total) : null,
              currency: invoice.currency ?? "USD",
              reviewStatus: invoice.review_status,
              vendorMatchStatus: invoice.vendor_match_status,
              reconciliationStatus: invoice.reconciliation_status,
            }
          : null,
        vendor,
        category: categoryResolution,
        lineItems,
        lineItemExplanations,
        evidence,
        anomalies,
        billQuality,
        marketBenchmark,
        guidance,
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    return apiError(error);
  }
}
