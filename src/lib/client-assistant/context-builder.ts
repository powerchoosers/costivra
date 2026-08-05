import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AssistantContextRef } from "./types";

export type AssistantBoundedContext = {
  organizationName: string;
  currentViewContext: string | null;
  attachedDocuments: Array<{
    id: string;
    filename: string;
    extractionSummary: string | null;
  }>;
  recentVendors: Array<{ id: string; name: string; category: string | null; spend: number }>;
  recentInvoices: Array<{
    id: string;
    vendorName: string | null;
    amount: number;
    date: string;
    status: string;
  }>;
  openOpportunities: Array<{
    id: string;
    title: string;
    estimatedAnnualValue: number;
    status: string;
  }>;
};

/**
 * Collects bounded, tenant-isolated record context for the assistant system prompt.
 * Uses correct live schema fields: vendors.canonical_name, documents.extraction_summary,
 * opportunities.estimated_annual_value. Invoice vendor resolved through join — no vendor_name column.
 * Zero cross-tenant data leaks.
 */
export async function buildAssistantContext(
  db: SupabaseClient,
  organizationId: string,
  contextRef?: AssistantContextRef | null,
  attachedDocumentIds?: string[],
): Promise<AssistantBoundedContext> {
  // Fetch Org name
  const { data: org } = await db
    .from("organizations")
    .select("name")
    .eq("id", organizationId)
    .single();

  const organizationName = org?.name ?? "Your Workspace";

  // Current View Context — resolve display label server-side
  let currentViewContext: string | null = null;
  if (contextRef) {
    if (contextRef.kind === "vendor") {
      const { data: rel } = await db
        .from("organization_vendors")
        .select("id, vendors(canonical_name)")
        .eq("id", contextRef.id)
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (rel?.vendors) {
        const vName = (rel.vendors as unknown as { canonical_name: string }).canonical_name;
        if (vName) currentViewContext = `Viewing Vendor: ${vName}`;
      }
    } else if (contextRef.kind === "invoice") {
      // invoices has no vendor_name column — resolve through organization_vendor_id join
      const { data: inv } = await db
        .from("invoices")
        .select(
          "invoice_number, total_amount, organization_vendor_id, organization_vendors(vendors(canonical_name))",
        )
        .eq("id", contextRef.id)
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (inv) {
        const vendorName =
          (
            inv.organization_vendors as unknown as {
              vendors?: { canonical_name?: string };
            } | null
          )?.vendors?.canonical_name ?? null;
        const label = vendorName ? `${vendorName} — ` : "";
        currentViewContext = `Reviewing Invoice: ${label}${inv.invoice_number ?? "Record"} ($${inv.total_amount ?? 0})`;
      }
    } else if (contextRef.kind === "document") {
      const { data: doc } = await db
        .from("documents")
        .select("original_filename")
        .eq("id", contextRef.id)
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (doc) currentViewContext = `Viewing Document: ${doc.original_filename}`;
    } else if (contextRef.kind === "opportunity") {
      const { data: opp } = await db
        .from("opportunities")
        .select("title")
        .eq("id", contextRef.id)
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (opp) currentViewContext = `Opportunity: ${opp.title}`;
    } else if (contextRef.kind === "contract") {
      const { data: contract } = await db
        .from("contracts")
        .select("title")
        .eq("id", contextRef.id)
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (contract) currentViewContext = `Contract Review: ${(contract as unknown as { title?: string }).title ?? "Contract"}`;
    }
  }

  // Attached Documents — use extraction_summary (live field), not summary
  let attachedDocuments: AssistantBoundedContext["attachedDocuments"] = [];
  if (attachedDocumentIds && attachedDocumentIds.length > 0) {
    const { data: docs } = await db
      .from("documents")
      .select("id, original_filename, extraction_summary")
      .in("id", attachedDocumentIds)
      .eq("organization_id", organizationId);

    if (docs) {
      attachedDocuments = docs.map((d) => ({
        id: d.id,
        filename: d.original_filename,
        extractionSummary: (d as unknown as { extraction_summary?: string | null }).extraction_summary ?? null,
      }));
    }
  }

  // Recent Vendors (top 10 by spend) — use canonical_name, no name column
  const { data: vendors } = await db
    .from("organization_vendors")
    .select("id, annualized_spend, vendors(canonical_name, category)")
    .eq("organization_id", organizationId)
    .order("annualized_spend", { ascending: false })
    .limit(10);

  const recentVendors = (vendors ?? []).map((v) => ({
    id: v.id,
    name: (v.vendors as unknown as { canonical_name?: string })?.canonical_name ?? "Unknown",
    category: (v.vendors as unknown as { category?: string | null })?.category ?? null,
    spend: v.annualized_spend ?? 0,
  }));

  // Recent Invoices (top 10) — resolve vendor through join, no vendor_name column
  const { data: invoices } = await db
    .from("invoices")
    .select(
      "id, total_amount, invoice_date, review_status, organization_vendor_id, organization_vendors(vendors(canonical_name))",
    )
    .eq("organization_id", organizationId)
    .order("invoice_date", { ascending: false })
    .limit(10);

  const recentInvoices = (invoices ?? []).map((i) => {
    const vendorName =
      (
        i.organization_vendors as unknown as {
          vendors?: { canonical_name?: string };
        } | null
      )?.vendors?.canonical_name ?? null;
    return {
      id: i.id,
      vendorName,
      amount: i.total_amount ?? 0,
      date: i.invoice_date ?? "Unknown",
      status: i.review_status ?? "recorded",
    };
  });

  // Open Opportunities (top 10) — use estimated_annual_value, not estimated_annual_savings
  const { data: opps } = await db
    .from("opportunities")
    .select("id, title, estimated_annual_value, status")
    .eq("organization_id", organizationId)
    .not("status", "in", '("closed","declined")')
    .order("estimated_annual_value", { ascending: false })
    .limit(10);

  const openOpportunities = (opps ?? []).map((o) => ({
    id: o.id,
    title: o.title,
    estimatedAnnualValue: o.estimated_annual_value ?? 0,
    status: o.status,
  }));

  return {
    organizationName,
    currentViewContext,
    attachedDocuments,
    recentVendors,
    recentInvoices,
    openOpportunities,
  };
}
