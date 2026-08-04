import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AssistantContextRef } from "./types";

export type AssistantBoundedContext = {
  organizationName: string;
  currentViewContext: string | null;
  attachedDocuments: Array<{
    id: string;
    filename: string;
    summary: string | null;
    vendorName?: string;
    amount?: number;
    reviewStatus?: string;
  }>;
  recentVendors: Array<{ id: string; name: string; category: string; spend: number }>;
  recentInvoices: Array<{ id: string; vendorName: string; amount: number; date: string; status: string }>;
  openOpportunities: Array<{ id: string; title: string; estimatedSavings: number; status: string }>;
};

/**
 * Collects bounded, tenant-isolated record context for the assistant system prompt.
 * Rechecks organization boundary for every query. Zero cross-tenant data leaks.
 */
export async function buildAssistantContext(
  db: SupabaseClient,
  organizationId: string,
  contextRef?: AssistantContextRef | null,
  attachedDocumentIds?: string[],
): Promise<AssistantBoundedContext> {
  // Fetch Org
  const { data: org } = await db
    .from("organizations")
    .select("name")
    .eq("id", organizationId)
    .single();

  const organizationName = org?.name ?? "Your Workspace";

  // Current View Context Resolution
  let currentViewContext: string | null = null;
  if (contextRef) {
    if (contextRef.kind === "vendor") {
      const { data: rel } = await db
        .from("organization_vendors")
        .select("id, vendors(name)")
        .eq("id", contextRef.id)
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (rel?.vendors) {
        currentViewContext = `Viewing Vendor: ${(rel.vendors as unknown as { name: string }).name}`;
      }
    } else if (contextRef.kind === "invoice") {
      const { data: inv } = await db
        .from("invoices")
        .select("invoice_number, vendor_name, total_amount")
        .eq("id", contextRef.id)
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (inv) {
        currentViewContext = `Viewing Invoice: ${inv.invoice_number ?? "Record"} (${inv.vendor_name} - $${inv.total_amount ?? 0})`;
      }
    }
  }

  // Attached Documents
  let attachedDocuments: AssistantBoundedContext["attachedDocuments"] = [];
  if (attachedDocumentIds && attachedDocumentIds.length > 0) {
    const { data: docs } = await db
      .from("documents")
      .select("id, original_filename, summary")
      .in("id", attachedDocumentIds)
      .eq("organization_id", organizationId);

    if (docs) {
      attachedDocuments = docs.map((d) => ({
        id: d.id,
        filename: d.original_filename,
        summary: d.summary,
      }));
    }
  }

  // Recent Vendors (top 5 by spend)
  const { data: vendors } = await db
    .from("organization_vendors")
    .select("id, annualized_spend, vendors(name, category)")
    .eq("organization_id", organizationId)
    .order("annualized_spend", { ascending: false })
    .limit(5);

  const recentVendors = (vendors ?? []).map((v) => ({
    id: v.id,
    name: (v.vendors as unknown as { name?: string })?.name ?? "Vendor",
    category: (v.vendors as unknown as { category?: string })?.category ?? "General",
    spend: v.annualized_spend ?? 0,
  }));

  // Recent Invoices (top 5)
  const { data: invoices } = await db
    .from("invoices")
    .select("id, vendor_name, total_amount, invoice_date, review_status")
    .eq("organization_id", organizationId)
    .order("invoice_date", { ascending: false })
    .limit(5);

  const recentInvoices = (invoices ?? []).map((i) => ({
    id: i.id,
    vendorName: i.vendor_name,
    amount: i.total_amount ?? 0,
    date: i.invoice_date ?? "Unknown",
    status: i.review_status ?? "recorded",
  }));

  // Open Opportunities (top 5)
  const { data: opps } = await db
    .from("opportunities")
    .select("id, title, estimated_annual_savings, status")
    .eq("organization_id", organizationId)
    .not("status", "in", '("closed","declined")')
    .order("estimated_annual_savings", { ascending: false })
    .limit(5);

  const openOpportunities = (opps ?? []).map((o) => ({
    id: o.id,
    title: o.title,
    estimatedSavings: o.estimated_annual_savings ?? 0,
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
