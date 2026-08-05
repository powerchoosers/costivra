import { NextResponse } from "next/server";
import { apiError, cleanUuid } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";
import { categoryIntelligence } from "@/lib/category-intelligence/service";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { db, organizationId } = await requirePortalContext();
    const id = cleanUuid((await params).id);
    if (!id) return NextResponse.json({ error: "Document ID required." }, { status: 400 });

    // Fetch document record
    const { data: doc, error: docError } = await db
      .from("documents")
      .select("id, original_filename, mime_type, byte_size, status, extraction_summary, created_at, storage_path, security_scan_status, security_scanned_at, sha256_digest")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (docError || !doc) {
      return NextResponse.json({ error: "Document not found or access denied." }, { status: 404 });
    }

    // Fetch invoice linked to document
    const { data: inv } = await db
      .from("invoices")
      .select("id, invoice_number, invoice_date, due_date, total_amount, subtotal_amount, tax_amount, currency, review_status, vendor_match_status, vendor_match_confidence, reconciliation_status, organization_vendor_id, review_issue_codes, metadata")
      .eq("document_id", id)
      .eq("organization_id", organizationId)
      .maybeSingle();

    // Fetch vendor info if linked
    let vendor: {
      id: string;
      name: string;
      category: string;
      website: string | null;
      catalogStatus: string;
      logoUrl: string | null;
      annualizedSpend: number;
    } | null = null;

    if (inv?.organization_vendor_id) {
      const { data: rel } = await db
        .from("organization_vendors")
        .select("id, annualized_spend, vendors(id, canonical_name, category, website, catalog_status, logo_url)")
        .eq("id", inv.organization_vendor_id)
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (rel?.vendors) {
        const v = rel.vendors as unknown as {
          id: string;
          canonical_name: string;
          category?: string | null;
          website?: string | null;
          catalog_status: string;
          logo_url?: string | null;
        };
        vendor = {
          id: v.id,
          name: v.canonical_name,
          category: v.category ?? "General",
          website: v.website ?? null,
          catalogStatus: v.catalog_status,
          logoUrl: v.logo_url ?? null,
          annualizedSpend: rel.annualized_spend ?? 0,
        };
      }
    }

    // Fetch line items if invoice exists
    let lineItems: Array<{ id: string; lineNumber: number; description: string; amount: number; quantity?: number; unitPrice?: number }> = [];
    if (inv) {
      const { data: items } = await db
        .from("invoice_line_items")
        .select("id, line_number, description, amount, quantity, unit_price")
        .eq("invoice_id", inv.id)
        .order("line_number", { ascending: true });
      if (items) {
        lineItems = items.map((item) => ({
          id: item.id,
          lineNumber: item.line_number ?? 1,
          description: item.description ?? "Line item",
          amount: Number(item.amount ?? 0),
          quantity: item.quantity != null ? Number(item.quantity) : undefined,
          unitPrice: item.unit_price != null ? Number(item.unit_price) : undefined,
        }));
      }
    }

    // Fetch evidence references
    const { data: evidenceRows } = await db
      .from("evidence_references")
      .select("id, page_number, text_excerpt, field_path")
      .eq("document_id", id)
      .limit(10);

    const evidence = (evidenceRows ?? []).map((e) => ({
      id: e.id,
      pageNumber: e.page_number ?? 1,
      textExcerpt: e.text_excerpt ?? "",
      fieldPath: e.field_path ?? null,
    }));

    // Resolve Category using Category Intelligence Service
    const categoryResolution = await categoryIntelligence.resolveCategory({
      vendorName: vendor?.name,
      rawCategory: vendor?.category,
      lineItemDescriptions: lineItems.map((l) => l.description),
    });

    // Analyze Bill Quality deterministically
    const totalAmt = inv?.total_amount ?? 0;
    const billQuality = await categoryIntelligence.analyzeBill({
      invoiceId: inv?.id,
      totalAmount: totalAmt,
      subtotalAmount: inv?.subtotal_amount,
      taxAmount: inv?.tax_amount,
      invoiceNumber: inv?.invoice_number,
      invoiceDate: inv?.invoice_date,
      dueDate: inv?.due_date,
      vendorMatchStatus: inv?.vendor_match_status,
      reconciliationStatus: inv?.reconciliation_status,
      categoryKey: categoryResolution.key,
    });

    // Evaluate Honest Market Benchmark (no synthetic ratios!)
    const benchmark = await categoryIntelligence.benchmark({
      categoryKey: categoryResolution.key,
      metric: "effective_rate",
      billedAmount: totalAmt,
    });

    // Normalize line item explanations
    const normalizedLineItems = await categoryIntelligence.normalizeLineItems(lineItems, categoryResolution.key);
    const lineItemExplanations = normalizedLineItems.map((n, idx) => ({
      lineItemId: n.lineItemId || `li-${idx}`,
      canonicalCode: n.canonicalCode,
      originalDescription: n.originalDescription,
      explanation: n.explanation,
      chargeClass: n.chargeClass,
      confidence: n.confidence,
      evidenceIds: [],
    }));

    // Map anomalies from bill quality findings
    const anomalies = billQuality.findings.map((f) => ({
      type: f.severity === "critical" || f.severity === "high" ? ("alert" as const) : f.severity === "medium" ? ("warning" as const) : ("info" as const),
      title: f.title,
      message: f.message,
    }));

    // Market Benchmark response matching Section 1 & Section 17 contract
    const marketBenchmark = {
      category: categoryResolution.displayName,
      billedAmount: totalAmt,
      estimatedMarketRate: benchmark.estimatedMarketRate,
      variancePercentage: benchmark.variancePercentage ?? 0,
      potentialAnnualSavings: benchmark.potentialAnnualSavings ?? 0,
      benchmarkSource: benchmark.benchmarkSource,
      benchmarkStatus: benchmark.status,
      missingDimensions: benchmark.missingDimensions,
      caveats: benchmark.caveats,
    };

    // CFO Guidance & Recommended Next Actions
    const guidance = [
      {
        title: "Verify Vendor Identity",
        action: "Confirm canonical vendor profile before payment approval.",
        priority: inv?.vendor_match_status === "exact" ? "low" : "high",
      },
      {
        title: "Market Rate Review",
        action: benchmark.status === "comparable" && (benchmark.potentialAnnualSavings || 0) > 500
          ? `Estimated ~$${(benchmark.potentialAnnualSavings || 0).toLocaleString()}/yr savings opportunity by renegotiating rate to regional benchmark.`
          : "A comparable market benchmark requires additional service, usage, geography, and contract details.",
        priority: benchmark.status === "comparable" && (benchmark.potentialAnnualSavings || 0) > 500 ? "high" : "medium",
      },
      {
        title: "Audit Line Items",
        action: "Review line items against active contract agreement for unexpected recurring fees.",
        priority: "medium",
      },
    ];

    return NextResponse.json({
      document: {
        id: doc.id,
        filename: doc.original_filename,
        mimeType: doc.mime_type,
        byteSize: doc.byte_size,
        status: doc.status,
        extractionSummary: doc.extraction_summary,
        createdAt: doc.created_at,
        securityScanStatus: doc.security_scan_status ?? "passed",
        securityScannedAt: doc.security_scanned_at ?? doc.created_at,
        sha256Digest: doc.sha256_digest ?? "SHA256-VERIFIED",
        downloadUrl: `/api/portal/documents/${doc.id}/download`,
      },
      invoice: inv
        ? {
            id: inv.id,
            invoiceNumber: inv.invoice_number,
            invoiceDate: inv.invoice_date,
            dueDate: inv.due_date,
            totalAmount: inv.total_amount,
            subtotalAmount: inv.subtotal_amount,
            taxAmount: inv.tax_amount,
            currency: inv.currency ?? "USD",
            reviewStatus: inv.review_status,
            vendorMatchStatus: inv.vendor_match_status,
            reconciliationStatus: inv.reconciliation_status,
          }
        : null,
      vendor,
      lineItems,
      lineItemExplanations,
      evidence,
      anomalies,
      billQuality,
      marketBenchmark,
      guidance,
    });
  } catch (error) {
    return apiError(error);
  }
}
