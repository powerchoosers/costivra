import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { UpcomingContract } from "./contract-renewal";
import type { AssistantContextRef } from "./types";

export type AssistantBoundedContext = {
  organizationName: string;
  currentViewContext: string | null;
  currentContextCategory: string | null;
  attachedDocuments: Array<{
    id: string;
    filename: string;
    status: string;
    extractionSummary: string | null;
    category: string | null;
  }>;
  recentVendors: Array<{
    id: string;
    name: string;
    category: string | null;
    spend: number;
  }>;
  recentInvoices: Array<{
    id: string;
    vendorName: string | null;
    category: string | null;
    amount: number;
    date: string;
    status: string;
    documentId: string | null;
  }>;
  recentExpenses: Array<{
    id: string;
    vendorName: string | null;
    category: string;
    amount: number;
    currency: string;
    periodStart: string;
    periodEnd: string;
  }>;
  verifiedSavings: Array<{
    id: string;
    title: string;
    amount: number;
    currency: string;
    status: string;
    verifiedAt: string | null;
  }>;
  pendingApprovals: Array<{
    id: string;
    resourceType: string;
    resourceId: string;
    decision: string;
    createdAt: string;
  }>;
  supplierCatalog: Array<{
    id: string;
    name: string;
    category: string | null;
    website: string | null;
    status: string;
  }>;
  recentLineItems: Array<{
    invoiceId: string;
    description: string;
    amount: number;
    category: string | null;
  }>;
  openOpportunities: Array<{
    id: string;
    title: string;
    estimatedAnnualValue: number;
    status: string;
  }>;
  upcomingContracts: UpcomingContract[];
};

type VendorJoin = {
  canonical_name?: string;
  category?: string | null;
};

type OrganizationVendorJoin = {
  vendors?: VendorJoin | null;
};

function catalogVendor(value: unknown): VendorJoin | null {
  return (value as VendorJoin | null) ?? null;
}

function joinedVendor(
  value: unknown,
): { name: string | null; category: string | null } {
  const relationship = value as OrganizationVendorJoin | null;
  return {
    name: relationship?.vendors?.canonical_name ?? null,
    category: relationship?.vendors?.category ?? null,
  };
}

/**
 * Collects bounded, tenant-isolated record context for the assistant.
 * Category is resolved from the active record or attachment whenever possible,
 * preventing an unrelated top-spend vendor from selecting the expert pack.
 */
export async function buildAssistantContext(
  db: SupabaseClient,
  organizationId: string,
  contextRef?: AssistantContextRef | null,
  attachedDocumentIds?: string[],
): Promise<AssistantBoundedContext> {
  const { data: org } = await db
    .from("organizations")
    .select("name")
    .eq("id", organizationId)
    .single();

  const organizationName = org?.name ?? "Your Workspace";
  let currentViewContext: string | null = null;
  let currentContextCategory: string | null = null;

  if (contextRef?.kind === "vendor") {
    const { data: relationship } = await db
      .from("organization_vendors")
      .select("id, vendors(canonical_name, category)")
      .eq("id", contextRef.id)
      .eq("organization_id", organizationId)
      .maybeSingle();
    const vendor = catalogVendor(relationship?.vendors);
    if (vendor?.canonical_name) {
      currentViewContext = `Viewing Vendor: ${vendor.canonical_name}`;
    }
    currentContextCategory = vendor?.category ?? null;
  } else if (contextRef?.kind === "invoice") {
    const { data: invoice } = await db
      .from("invoices")
      .select(
        "invoice_number, total_amount, organization_vendor_id, organization_vendors(vendors(canonical_name, category))",
      )
      .eq("id", contextRef.id)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (invoice) {
      const vendor = joinedVendor(invoice.organization_vendors);
      const label = vendor.name ? `${vendor.name} — ` : "";
      currentViewContext = `Reviewing Invoice: ${label}${invoice.invoice_number ?? "Record"} ($${invoice.total_amount ?? 0})`;
      currentContextCategory = vendor.category;
    }
  } else if (contextRef?.kind === "document") {
    const { data: document } = await db
      .from("documents")
      .select("original_filename")
      .eq("id", contextRef.id)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (document) {
      currentViewContext = `Viewing Document: ${document.original_filename}`;
    }
    const { data: invoice } = await db
      .from("invoices")
      .select("organization_vendors(vendors(category))")
      .eq("document_id", contextRef.id)
      .eq("organization_id", organizationId)
      .maybeSingle();
    currentContextCategory = invoice
      ? joinedVendor(invoice.organization_vendors).category
      : null;
  } else if (contextRef?.kind === "opportunity") {
    const { data: opportunity } = await db
      .from("opportunities")
      .select("title, category")
      .eq("id", contextRef.id)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (opportunity) {
      currentViewContext = `Opportunity: ${opportunity.title}`;
      currentContextCategory = opportunity.category ?? null;
    }
  } else if (contextRef?.kind === "contract") {
    const { data: contract } = await db
      .from("contracts")
      .select("title, organization_vendors(vendors(category))")
      .eq("id", contextRef.id)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (contract) {
      currentViewContext = `Contract Review: ${contract.title ?? "Contract"}`;
      currentContextCategory = joinedVendor(
        contract.organization_vendors,
      ).category;
    }
  } else if (contextRef?.kind === "expense") {
    const { data: expense } = await db
      .from("expenses")
      .select(
        "amount, currency, period_start, period_end, category, organization_vendors(vendors(category))",
      )
      .eq("id", contextRef.id)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (expense) {
      const period =
        expense.period_start || expense.period_end
          ? ` · ${expense.period_start ?? "?"} to ${expense.period_end ?? "?"}`
          : "";
      currentViewContext = `Expense Review: ${expense.currency ?? "USD"} ${expense.amount ?? 0}${period}`;
      currentContextCategory =
        expense.category ?? joinedVendor(expense.organization_vendors).category;
    }
  } else if (contextRef?.kind === "action") {
    const { data: action } = await db
      .from("action_plans")
      .select("id, title, status, opportunity_id")
      .eq("id", contextRef.id)
      .maybeSingle();
    if (action) currentViewContext = `Action Plan: ${action.title ?? "Untitled action"} (${action.status})`;
  } else if (contextRef?.kind === "savings") {
    const { data: saving } = await db
      .from("savings_outcomes")
      .select("id, title, amount, currency, status, verified_at")
      .eq("id", contextRef.id)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (saving) currentViewContext = `Savings Outcome: ${saving.title} — ${saving.currency} ${saving.amount} (${saving.status})`;
  }

  let attachedDocuments: AssistantBoundedContext["attachedDocuments"] = [];
  if (attachedDocumentIds?.length) {
    const uniqueDocumentIds = Array.from(new Set(attachedDocumentIds));
    const [{ data: documents }, { data: linkedInvoices }] = await Promise.all([
      db
        .from("documents")
        .select("id, original_filename, status, extraction_summary")
        .in("id", uniqueDocumentIds)
        .eq("organization_id", organizationId),
      db
        .from("invoices")
        .select("document_id, organization_vendors(vendors(category))")
        .in("document_id", uniqueDocumentIds)
        .eq("organization_id", organizationId),
    ]);

    const categoriesByDocument = new Map<string, string | null>();
    for (const invoice of linkedInvoices ?? []) {
      categoriesByDocument.set(
        invoice.document_id,
        joinedVendor(invoice.organization_vendors).category,
      );
    }

    attachedDocuments = (documents ?? []).map((document) => ({
      id: document.id,
      filename: document.original_filename,
      status: document.status,
      extractionSummary: document.extraction_summary ?? null,
      category: categoriesByDocument.get(document.id) ?? null,
    }));
  }

  const { data: vendorRows } = await db
    .from("organization_vendors")
    .select("id, annualized_spend, vendors(canonical_name, category)")
    .eq("organization_id", organizationId)
    .order("annualized_spend", { ascending: false })
    .limit(10);

  const recentVendors = (vendorRows ?? []).map((row) => {
    const vendor = catalogVendor(row.vendors);
    return {
      id: row.id,
      name: vendor?.canonical_name ?? "Unknown",
      category: vendor?.category ?? null,
      spend: row.annualized_spend ?? 0,
    };
  });

  const { data: invoiceRows } = await db
    .from("invoices")
    .select(
      "id, total_amount, invoice_date, review_status, document_id, organization_vendor_id, organization_vendors(vendors(canonical_name, category))",
    )
    .eq("organization_id", organizationId)
    .order("invoice_date", { ascending: false })
    .limit(10);

  const recentInvoices = (invoiceRows ?? []).map((invoice) => {
    const vendor = joinedVendor(invoice.organization_vendors);
    return {
      id: invoice.id,
      vendorName: vendor.name,
      category: vendor.category,
      amount: invoice.total_amount ?? 0,
      date: invoice.invoice_date ?? "Unknown",
      status: invoice.review_status ?? "recorded",
      documentId: invoice.document_id ?? null,
    };
  });

  const invoiceIds = recentInvoices.map((invoice) => invoice.id);
  const [{ data: expenseRows }, { data: lineItemRows }, { data: savingsRows }, { data: approvalRows }] = await Promise.all([
    db
      .from("expenses")
      .select("id, amount, currency, category, period_start, period_end, organization_vendors(vendors(canonical_name))")
      .eq("organization_id", organizationId)
      .order("period_end", { ascending: false })
      .limit(12),
    invoiceIds.length
      ? db.from("invoice_line_items").select("invoice_id, description, amount, category").eq("organization_id", organizationId).in("invoice_id", invoiceIds).order("amount", { ascending: false }).limit(40)
      : Promise.resolve({ data: [], error: null }),
    db.from("savings_outcomes").select("id, title, amount, currency, status, verified_at").eq("organization_id", organizationId).eq("status", "verified").order("verified_at", { ascending: false }).limit(10),
    db.from("approvals").select("id, resource_type, resource_id, decision, created_at").eq("organization_id", organizationId).eq("decision", "pending").order("created_at", { ascending: false }).limit(10),
  ]);

  const { data: catalogRows } = await db
    .from("vendors")
    .select("id, canonical_name, category, website, catalog_status")
    .in("catalog_status", ["verified", "candidate"])
    .order("catalog_status", { ascending: true })
    .order("canonical_name", { ascending: true })
    .limit(40);
  const supplierCatalog = (catalogRows ?? []).map((vendor) => ({
    id: vendor.id,
    name: vendor.canonical_name,
    category: vendor.category,
    website: vendor.website,
    status: vendor.catalog_status,
  }));

  const recentExpenses = (expenseRows ?? []).map((expense) => ({
    id: expense.id,
    vendorName: joinedVendor(expense.organization_vendors).name,
    category: expense.category,
    amount: expense.amount,
    currency: expense.currency,
    periodStart: expense.period_start,
    periodEnd: expense.period_end,
  }));
  const verifiedSavings = (savingsRows ?? []).map((saving) => ({
    id: saving.id,
    title: saving.title,
    amount: saving.amount,
    currency: saving.currency,
    status: saving.status,
    verifiedAt: saving.verified_at,
  }));
  const pendingApprovals = (approvalRows ?? []).map((approval) => ({
    id: approval.id,
    resourceType: approval.resource_type,
    resourceId: approval.resource_id,
    decision: approval.decision,
    createdAt: approval.created_at,
  }));
  const recentLineItems = (lineItemRows ?? []).map((line) => ({
    invoiceId: line.invoice_id,
    description: line.description,
    amount: line.amount,
    category: line.category,
  }));

  const { data: opportunityRows } = await db
    .from("opportunities")
    .select("id, title, estimated_annual_value, status")
    .eq("organization_id", organizationId)
    .not("status", "in", '("closed","declined")')
    .order("estimated_annual_value", { ascending: false })
    .limit(10);

  const openOpportunities = (opportunityRows ?? []).map((opportunity) => ({
    id: opportunity.id,
    title: opportunity.title,
    estimatedAnnualValue: opportunity.estimated_annual_value ?? 0,
    status: opportunity.status,
  }));

  const today = new Date().toISOString().slice(0, 10);
  const { data: contractRows } = await db
    .from("contracts")
    .select(
      "id, title, end_date, notice_deadline, auto_renews, organization_vendors(vendors(canonical_name))",
    )
    .eq("organization_id", organizationId)
    .gte("end_date", today)
    .order("end_date", { ascending: true })
    .limit(10);

  const upcomingContracts = (contractRows ?? []).flatMap((contract) => {
    if (!contract.end_date) return [];
    const vendorName = joinedVendor(contract.organization_vendors).name;
    return [
      {
        id: contract.id,
        title: contract.title ?? "Untitled contract",
        vendorName,
        endDate: contract.end_date,
        noticeDeadline: contract.notice_deadline ?? null,
        autoRenews: Boolean(contract.auto_renews),
      },
    ];
  });

  return {
    organizationName,
    currentViewContext,
    currentContextCategory,
    attachedDocuments,
    recentVendors,
    recentInvoices,
    recentExpenses,
    verifiedSavings,
    pendingApprovals,
    supplierCatalog,
    recentLineItems,
    openOpportunities,
    upcomingContracts,
  };
}
