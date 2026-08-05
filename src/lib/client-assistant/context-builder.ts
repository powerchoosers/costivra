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
    const vendor = joinedVendor(
      (relationship as unknown as { vendors?: unknown } | null)?.vendors
        ? { vendors: (relationship as unknown as { vendors?: unknown }).vendors }
        : null,
    );
    if (vendor.name) currentViewContext = `Viewing Vendor: ${vendor.name}`;
    currentContextCategory = vendor.category;
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
      .select("title, organization_vendor_id, organization_vendors(vendors(category))")
      .eq("id", contextRef.id)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (opportunity) {
      currentViewContext = `Opportunity: ${opportunity.title}`;
      currentContextCategory = joinedVendor(
        opportunity.organization_vendors,
      ).category;
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
      .select("description, organization_vendors(vendors(category))")
      .eq("id", contextRef.id)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (expense) {
      currentViewContext = `Expense Review: ${expense.description ?? "Expense"}`;
      currentContextCategory = joinedVendor(
        expense.organization_vendors,
      ).category;
    }
  }

  let attachedDocuments: AssistantBoundedContext["attachedDocuments"] = [];
  if (attachedDocumentIds?.length) {
    const uniqueDocumentIds = Array.from(new Set(attachedDocumentIds));
    const [{ data: documents }, { data: linkedInvoices }] = await Promise.all([
      db
        .from("documents")
        .select("id, original_filename, extraction_summary")
        .in("id", uniqueDocumentIds)
        .eq("organization_id", organizationId),
      db
        .from("invoices")
        .select(
          "document_id, organization_vendors(vendors(category))",
        )
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
    const vendor = row.vendors as unknown as VendorJoin | null;
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
      "id, total_amount, invoice_date, review_status, organization_vendor_id, organization_vendors(vendors(canonical_name, category))",
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
    };
  });

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
    openOpportunities,
    upcomingContracts,
  };
}
