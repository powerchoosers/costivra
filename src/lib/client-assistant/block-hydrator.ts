import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AssistantBlockRequest, AssistantBlockV1 } from "./types";
import { parseMoneyToCents } from "@/lib/vendors/spend";
import { supplierCategoryMatches } from "./supplier-matching";

function numeric(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

// ---- Local row types (schema-accurate) ----

type InvoiceRow = {
  id: string;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  total_amount: number | null;
  currency: string | null;
  review_status: string;
  vendor_match_status: string;
  reconciliation_status: string;
  document_id: string;
  organization_vendor_id: string | null;
  organization_vendors: { vendors: { canonical_name: string } | null } | null;
  documents: { original_filename: string } | null;
};

type VendorRelRow = {
  id: string;
  relationship_status: string;
  annualized_spend: number | null;
  vendors: {
    id: string;
    canonical_name: string;
    category: string | null;
    website: string | null;
    catalog_status: string;
    logo_url: string | null;
  } | null;
};

type OppRow = {
  id: string;
  title: string;
  status: string;
  priority: string;
  confidence: number | null;
  estimated_annual_value: number | null;
  estimated_one_time_value: number | null;
  category: string | null;
};

type DocRow = {
  id: string;
  original_filename: string;
  mime_type: string;
  byte_size: number;
  status: string;
  extraction_summary: string | null;
};

type ContractRow = {
  id: string;
  title: string | null;
  end_date: string | null;
  notice_deadline: string | null;
  auto_renews: boolean | null;
  organization_vendors: { vendors: { canonical_name: string } | null } | null;
};

type LineItemRow = {
  id: string;
  description: string;
  amount: number | null;
  quantity: number | null;
  unit_price: number | null;
  category: string | null;
};

/**
 * Hydrates block requests into authoritative versioned AssistantBlockV1 payloads.
 * Strictly verifies that all requested record IDs belong to the authenticated organization.
 *
 * Schema contract (all verified against live DB):
 *   - vendors: canonical_name (no name column)
 *   - invoices: organization_vendor_id -> organization_vendors -> vendors.canonical_name (no vendor_name)
 *   - opportunities: estimated_annual_value (no estimated_annual_savings)
 *   - documents: extraction_summary (no summary or confidence column)
 */
export async function hydrateAssistantBlocks(
  db: SupabaseClient,
  organizationId: string,
  requests: AssistantBlockRequest[],
): Promise<AssistantBlockV1[]> {
  const blocks: AssistantBlockV1[] = [];
  const bounded = requests.slice(0, 5);
  const { data: organization } = await db
    .from("organizations")
    .select("currency")
    .eq("id", organizationId)
    .maybeSingle();
  const workspaceCurrency = typeof organization?.currency === "string" && organization.currency ? organization.currency : "USD";

  for (const req of bounded) {
    try {
      switch (req.type) {
        case "spend_overview": {
          const { data } = await db
            .from("organization_vendors")
            .select("id, annualized_spend, vendors(canonical_name, category)")
            .eq("organization_id", organizationId)
            .order("annualized_spend", { ascending: false })
            .limit(5);

          const rels = (data ?? []) as unknown as VendorRelRow[];
          const totalSpend = rels.reduce((acc, r) => acc + numeric(r.annualized_spend), 0);
          const topVendors = rels.map((r) => ({
            vendorRelationshipId: r.id,
            name: r.vendors?.canonical_name ?? "Vendor",
            category: r.vendors?.category ?? "General",
            annualizedSpend: numeric(r.annualized_spend),
            href: `/app/vendors/${r.id}`,
          }));

          blocks.push({
            id: `soverview-${organizationId}`,
            type: "spend_overview",
            payload: {
              annualizedSpend: totalSpend,
              currency: workspaceCurrency,
              vendorCount: rels.length,
              topVendors,
              href: "/app/vendors",
            },
          });
          break;
        }

        case "invoice_summary": {
          const { data } = await db
            .from("invoices")
            .select("id, invoice_number, invoice_date, due_date, total_amount, currency, review_status, vendor_match_status, reconciliation_status, document_id, organization_vendor_id, organization_vendors(vendors(canonical_name)), documents(original_filename)")
            .eq("id", req.invoiceId)
            .eq("organization_id", organizationId)
            .maybeSingle();

          const inv = data as unknown as InvoiceRow | null;
          if (inv) {
            const vendorName = inv.organization_vendors?.vendors?.canonical_name ?? null;

            blocks.push({
              id: `inv-${inv.id}`,
              type: "invoice_summary",
              payload: {
                invoiceId: inv.id,
                vendorName,
                invoiceNumber: inv.invoice_number,
                invoiceDate: inv.invoice_date,
                dueDate: inv.due_date,
                totalAmount: inv.total_amount,
                currency: inv.currency ?? workspaceCurrency,
                reviewStatus: inv.review_status,
                vendorMatchStatus: inv.vendor_match_status,
                reconciliationState: inv.reconciliation_status,
                documentId: inv.document_id,
                href: inv.document_id ? `/app/documents/${inv.document_id}` : "/app/documents",
                filename: inv.documents?.original_filename ?? "Invoice Document",
              },
            });
          }
          break;
        }

        case "invoice_ranking": {
          let query = db
            .from("invoices")
            .select("id, invoice_number, invoice_date, total_amount, currency, review_status, document_id, organization_vendor_id, organization_vendors(vendors(canonical_name))")
            .eq("organization_id", organizationId)
            .order("total_amount", { ascending: false })
            .limit(8);
          if (req.invoiceIds?.length) query = query.in("id", req.invoiceIds);
          const { data } = await query;
          const invoices = (data ?? []) as unknown as InvoiceRow[];
          const currency = invoices.find((invoice) => invoice.currency)?.currency ?? workspaceCurrency;
          blocks.push({
            id: `invoice-ranking-${organizationId}-${req.invoiceIds?.join("-") ?? "workspace"}`,
            type: "invoice_ranking",
            payload: {
              title: "Most expensive bills",
              subtitle: `${invoices.length} recorded invoice${invoices.length === 1 ? "" : "s"}, ranked by total amount`,
              currency,
              invoices: invoices.map((invoice) => ({
                invoiceId: invoice.id,
                vendorName: invoice.organization_vendors?.vendors?.canonical_name ?? "Vendor not matched",
                invoiceNumber: invoice.invoice_number,
                invoiceDate: invoice.invoice_date,
                amount: invoice.total_amount,
                reviewStatus: invoice.review_status,
                href: invoice.document_id ? `/app/documents/${invoice.document_id}` : "/app/documents",
              })),
              href: "/app/bills",
            },
          });
          break;
        }

        case "invoice_comparison": {
          const [id1, id2] = req.invoiceIds;
          const { data } = await db
            .from("invoices")
            .select("id, invoice_number, invoice_date, total_amount, currency, document_id, organization_vendor_id, organization_vendors(vendors(canonical_name))")
            .in("id", [id1, id2])
            .eq("organization_id", organizationId);

          const invs = data as unknown as InvoiceRow[] | null;
          if (invs && invs.length === 2) {
            const sorted = [...invs].sort((x, y) =>
              String(x.invoice_date).localeCompare(String(y.invoice_date)),
            );
            const first = sorted[0];
            const second = sorted[1];
            if (first && second) {
              const amountA = first.total_amount;
              const amountB = second.total_amount;
              let diffCents: number | null = null;
              let pctChange: number | null = null;

              if (amountA != null && amountB != null) {
                const centsA = parseMoneyToCents(String(amountA));
                const centsB = parseMoneyToCents(String(amountB));
                if (centsA != null && centsB != null) {
                  diffCents = centsB - centsA;
                  if (centsA > 0) {
                    pctChange = (diffCents / centsA) * 100;
                  }
                }
              }

              const vendorName = first.organization_vendors?.vendors?.canonical_name ?? null;

              blocks.push({
                id: `comp-${first.id}-${second.id}`,
                type: "invoice_comparison",
                payload: {
                  periodA: {
                    id: first.id,
                    date: first.invoice_date,
                    amount: first.total_amount,
                    number: first.invoice_number,
                  },
                  periodB: {
                    id: second.id,
                    date: second.invoice_date,
                    amount: second.total_amount,
                    number: second.invoice_number,
                  },
                  differenceAmount: diffCents != null ? diffCents / 100 : null,
                  percentageChange: pctChange != null ? Math.round(pctChange * 10) / 10 : null,
                  currency: first.currency ?? second.currency ?? workspaceCurrency,
                  vendorName,
                  href: second.document_id ? `/app/documents/${second.document_id}` : "/app/documents",
                },
              });
            }
          }
          break;
        }

        case "invoice_breakdown": {
          const { data: invoice } = await db
            .from("invoices")
            .select("id, document_id, invoice_number, invoice_date, total_amount, currency, organization_vendor_id, organization_vendors(vendors(canonical_name))")
            .eq("id", req.invoiceId)
            .eq("organization_id", organizationId)
            .maybeSingle();
          if (!invoice) break;
          const { data: lineItems } = await db
            .from("invoice_line_items")
            .select("id, description, amount, quantity, unit_price, category")
            .eq("invoice_id", req.invoiceId)
            .eq("organization_id", organizationId)
            .order("amount", { ascending: false })
            .limit(20);
          const rows = (lineItems ?? []) as LineItemRow[];
          const total = rows.reduce((sum, row) => sum + numeric(row.amount), 0);
          blocks.push({
            id: `ibreakdown-${invoice.id}`,
            type: "invoice_breakdown",
            payload: {
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoice_number,
              invoiceDate: invoice.invoice_date,
              vendorName: (invoice.organization_vendors as { vendors?: { canonical_name?: string } | null } | null)?.vendors?.canonical_name ?? null,
              currency: invoice.currency ?? workspaceCurrency,
              invoiceTotal: invoice.total_amount,
              lineItemTotal: total,
              lineItems: rows.map((row) => ({
                id: row.id,
                description: row.description,
                amount: numeric(row.amount),
                quantity: row.quantity,
                unitPrice: row.unit_price,
                category: row.category,
              })),
              href: invoice.document_id ? `/app/documents/${invoice.document_id}` : "/app/documents",
            },
          });
          break;
        }

        case "energy_review_path": {
          if (req.vendorRelationshipId) {
            const { data: relationship } = await db.from("organization_vendors").select("id, vendors(canonical_name, category)").eq("id", req.vendorRelationshipId).eq("organization_id", organizationId).maybeSingle();
            if (!relationship) break;
          }
          blocks.push({
            id: `energy-path-${req.vendorRelationshipId ?? organizationId}`,
            type: "energy_review_path",
            payload: {
              vendorRelationshipId: req.vendorRelationshipId ?? null,
              title: "Choose how to handle the energy review",
              message: "Costivra can organize the evidence and renewal timing, but it does not choose a supplier or guarantee a rate.",
              options: [
                { id: "keep", label: "Keep the review in Costivra", detail: "Save the evidence and decide later.", action: "save" },
                { id: "export", label: "Export for an advisor", detail: "Choose an advisor and share only the records you approve.", action: "export" },
                { id: "partner", label: "Request a partner review", detail: "Choose whether to request an introduction to one of Costivra’s available partners.", action: "partner_referral" },
              ],
            },
          });
          break;
        }

        case "supplier_options": {
          const { data: catalogRows } = await db
            .from("vendors")
            .select("id, canonical_name, category, website, catalog_status")
            .in("catalog_status", ["verified", "candidate"])
            .order("catalog_status", { ascending: true })
            .order("canonical_name", { ascending: true })
            .limit(40);
          const requestedCategory = req.category?.trim() || null;
          const options = (catalogRows ?? [])
            .filter((vendor) => !requestedCategory || supplierCategoryMatches(requestedCategory, vendor.category))
            .slice(0, 6)
            .map((vendor) => ({
              vendorId: vendor.id,
              name: vendor.canonical_name,
              category: vendor.category,
              website: vendor.website,
              status: vendor.catalog_status,
            }));
          blocks.push({
            id: `supplier-options-${organizationId}-${requestedCategory ?? "all"}`,
            type: "supplier_options",
            payload: {
              category: req.category ?? null,
              currentVendorName: req.currentVendorName ?? null,
              options,
              href: "/app/vendors",
            },
          });
          break;
        }

        case "vendor_summary": {
          const { data } = await db
            .from("organization_vendors")
            .select("id, relationship_status, annualized_spend, vendors(id, canonical_name, category, website, catalog_status, logo_url)")
            .eq("id", req.vendorRelationshipId)
            .eq("organization_id", organizationId)
            .maybeSingle();

          const rel = data as unknown as VendorRelRow | null;
          if (rel && rel.vendors) {
            const v = rel.vendors;
            blocks.push({
              id: `vsum-${rel.id}`,
              type: "vendor_summary",
              payload: {
                vendorRelationshipId: rel.id,
                vendorId: v.id,
                name: v.canonical_name,
                category: v.category ?? "General",
                website: v.website ?? null,
                relationshipStatus: rel.relationship_status,
                annualizedSpend: numeric(rel.annualized_spend),
                catalogStatus: v.catalog_status,
                logoUrl: v.logo_url ?? null,
                href: `/app/vendors/${rel.id}`,
              },
            });
          }
          break;
        }

        case "spend_trend": {
          let query = db
            .from("invoices")
            .select("id, total_amount, invoice_date, organization_vendors(vendors(canonical_name))")
            .eq("organization_id", organizationId)
            .order("invoice_date", { ascending: false })
            .limit(24);
          if (req.vendorRelationshipId) query = query.eq("organization_vendor_id", req.vendorRelationshipId);
          const { data } = await query;

          const invoices = (data ?? []) as unknown as InvoiceRow[];
          const byMonth = new Map<string, number>();
          for (const invoice of invoices) {
            const label = invoice.invoice_date ? invoice.invoice_date.slice(0, 7) : "Unknown";
            byMonth.set(label, (byMonth.get(label) ?? 0) + numeric(invoice.total_amount));
          }
          const periods = [...byMonth.entries()]
            .filter(([label]) => label !== "Unknown")
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-6)
            .map(([label, amount]) => ({ label, amount }));

          const total = periods.reduce((sum, p) => sum + p.amount, 0);
          const average = periods.length > 0 ? Math.round(total / periods.length) : 0;

          blocks.push({
            id: `strend-${organizationId}-${req.vendorRelationshipId ?? "workspace"}`,
            type: "spend_trend",
            payload: {
              scopeLabel: req.vendorRelationshipId
                ? `${invoices[0]?.organization_vendors?.vendors?.canonical_name ?? "Vendor"} Spend Trend`
                : "Recent Spend Trend",
              currency: workspaceCurrency,
              total,
              average,
              changePercent: null,
              periods,
              href: req.vendorRelationshipId ? `/app/vendors/${req.vendorRelationshipId}` : "/app/vendors",
            },
          });
          break;
        }

        case "monitoring_overview": {
          const { data } = await db
            .from("vendor_monitoring_configs")
            .select("id, organization_vendor_id, state, source_method, next_expected_at, last_received_at, organization_vendors(vendors(canonical_name))")
            .eq("organization_id", organizationId)
            .order("updated_at", { ascending: false })
            .limit(20);

          const configs = (data ?? []).map((monitoring) => ({
            id: monitoring.id,
            vendorRelationshipId: monitoring.organization_vendor_id,
            vendorName: (monitoring.organization_vendors as { vendors?: { canonical_name?: string } | null } | null)?.vendors?.canonical_name ?? "Vendor",
            state: monitoring.state,
            sourceMethod: monitoring.source_method,
            nextExpectedAt: monitoring.next_expected_at,
            lastReceivedAt: monitoring.last_received_at,
            href: `/app/vendors/${monitoring.organization_vendor_id}?tab=monitoring`,
          }));

          blocks.push({
            id: `monitoring-${organizationId}`,
            type: "monitoring_overview",
            payload: { configs, href: "/app/vendors" },
          });
          break;
        }

        case "vendor_candidate": {
          const { data } = await db
            .from("organization_vendors")
            .select("id, relationship_status, vendors(id, canonical_name, category, catalog_status)")
            .eq("id", req.organizationVendorId)
            .eq("organization_id", organizationId)
            .maybeSingle();

          const rel = data as unknown as VendorRelRow | null;
          if (rel && rel.vendors) {
            blocks.push({
              id: `vcand-${rel.id}`,
              type: "vendor_candidate",
              payload: {
                vendorId: rel.vendors.id,
                organizationVendorId: rel.id,
                canonicalName: rel.vendors.canonical_name,
                category: rel.vendors.category ?? "General",
                domain: null,
                confidence: 88,
                reviewRequired: true,
                href: `/app/vendors/${rel.id}`,
              },
            });
          }
          break;
        }

        case "renewal_timeline": {
          let query = db
            .from("contracts")
            .select("id, title, end_date, notice_deadline, auto_renews, organization_vendors(vendors(canonical_name))")
            .eq("organization_id", organizationId)
            .gte("end_date", new Date().toISOString().slice(0, 10))
            .order("end_date", { ascending: true })
            .limit(5);

          if (req.contractIds?.length) {
            query = query.in("id", req.contractIds.slice(0, 20));
          }

          const { data } = await query;

          const contracts = (data ?? []) as unknown as ContractRow[];
          const contractList = contracts.map((c) => ({
            contractId: c.id,
            vendorName: c.organization_vendors?.vendors?.canonical_name ?? null,
            contractName: c.title ?? "Contract",
            endDate: c.end_date ?? "Unknown",
            noticeDeadline: c.notice_deadline ?? null,
            autoRenewal: Boolean(c.auto_renews),
            href: `/app/contracts/${c.id}`,
          }));

          blocks.push({
            id: `rtimeline-${organizationId}`,
            type: "renewal_timeline",
            payload: {
              contracts: contractList,
              href: "/app/contracts",
            },
          });
          break;
        }

        case "opportunity": {
          const { data } = await db
            .from("opportunities")
            .select("id, title, status, priority, confidence, estimated_annual_value, estimated_one_time_value, category")
            .eq("id", req.opportunityId)
            .eq("organization_id", organizationId)
            .maybeSingle();

          const opp = data as unknown as OppRow | null;
          if (opp) {
            blocks.push({
              id: `opp-${opp.id}`,
              type: "opportunity",
              payload: {
                opportunityId: opp.id,
                title: opp.title,
                status: opp.status,
                priority: opp.priority,
                confidence: opp.confidence,
                estimatedAnnualValue: opp.estimated_annual_value,
                estimatedOneTimeValue: opp.estimated_one_time_value,
                category: opp.category,
                href: `/app/opportunities/${opp.id}`,
              },
            });
          }
          break;
        }

        case "savings_summary": {
          const { data } = await db
            .from("savings_outcomes")
            .select("id, title, amount, currency, status, opportunity_id")
            .eq("organization_id", organizationId)
            .eq("status", "verified")
            .limit(5);

          const outcomes = (data ?? []).map((saving) => ({
            savingsId: saving.id,
            title: saving.title,
            category: "Verified outcome",
            amount: numeric(saving.amount),
            href: saving.opportunity_id ? `/app/opportunities/${saving.opportunity_id}` : "/app/opportunities",
          }));
          const totalVerified = outcomes.reduce((sum, outcome) => sum + numeric(outcome.amount), 0);

          blocks.push({
            id: `ssummary-${organizationId}`,
            type: "savings_summary",
            payload: {
              totalVerifiedValue: totalVerified,
              currency: data?.[0]?.currency ?? "USD",
              outcomeCount: outcomes.length,
              outcomes,
              href: "/app/opportunities",
            },
          });
          break;
        }

        case "approval_queue": {
          const [{ data }, { data: referralRequests }] = await Promise.all([
            db
            .from("approvals")
            .select("id, resource_type, resource_id, decision, created_at")
            .eq("organization_id", organizationId)
            .eq("decision", "pending")
            .limit(5),
            db
              .from("partner_referral_requests")
              .select("id, purpose, status, created_at, partner_destinations(display_name)")
              .eq("organization_id", organizationId)
              .eq("status", "awaiting_approval")
              .order("created_at", { ascending: false })
              .limit(5),
          ]);

          const actions = (data ?? []).map((approval) => ({
            actionId: approval.id,
            title: `${approval.resource_type} requires a decision`,
            actionType: approval.resource_type,
            annualValue: null,
            status: approval.decision,
            href: "/app/actions",
          }));
          actions.push(...(referralRequests ?? []).map((request) => ({
            actionId: request.id,
            title: `${(request.partner_destinations as { display_name?: string } | null)?.display_name ?? "Partner review"} requires a decision`,
            actionType: "partner_referral",
            annualValue: null,
            status: request.status,
            href: "/app/settings",
          })));

          blocks.push({
            id: `aqueue-${organizationId}`,
            type: "approval_queue",
            payload: {
              actions,
              href: "/app/actions",
            },
          });
          break;
        }

        case "document_ingestion": {
          const { data } = await db
            .from("documents")
            .select("id, original_filename, mime_type, byte_size, status, extraction_summary")
            .eq("id", req.documentId)
            .eq("organization_id", organizationId)
            .maybeSingle();

          const doc = data as unknown as DocRow | null;
          if (doc) {
            blocks.push({
              id: `ingest-${doc.id}`,
              type: "document_ingestion",
              payload: {
                documentId: doc.id,
                filename: doc.original_filename,
                mimeType: doc.mime_type,
                byteSize: doc.byte_size,
                status: doc.status,
                extractionSummary: doc.extraction_summary ?? null,
                href: `/app/documents/${doc.id}`,
              },
            });
          }
          break;
        }

        case "evidence_list": {
          const { data } = await db
            .from("documents")
            .select("id, original_filename, extraction_summary")
            .eq("organization_id", organizationId)
            .not("extraction_summary", "is", null)
            .limit(5);

          const docs = (data ?? []) as unknown as DocRow[];
          const items = docs.map((d) => ({
            evidenceId: d.id,
            title: d.original_filename,
            sourceType: "Invoice Document",
            excerpt: d.extraction_summary ?? "Document excerpt",
            pageNumber: 1,
            href: `/app/documents/${d.id}`,
          }));

          blocks.push({
            id: `elist-${organizationId}`,
            type: "evidence_list",
            payload: {
              items,
              href: "/app/documents",
            },
          });
          break;
        }

        case "notice": {
          blocks.push({
            id: `notice-${req.code}`,
            type: "notice",
            payload: {
              severity: req.severity,
              code: req.code,
              title: req.title,
              message: req.message,
            },
          });
          break;
        }
      }
    } catch (err) {
      console.error("[block-hydrator] Failed to hydrate block:", req.type, err);
    }
  }

  return blocks;
}
