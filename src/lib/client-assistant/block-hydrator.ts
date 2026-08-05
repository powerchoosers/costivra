import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AssistantBlockRequest, AssistantBlockV1 } from "./types";
import { parseMoneyToCents } from "@/lib/vendors/spend";

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
          const totalSpend = rels.reduce((acc, r) => acc + (r.annualized_spend ?? 0), 0);
          const topVendors = rels.map((r) => ({
            vendorRelationshipId: r.id,
            name: r.vendors?.canonical_name ?? "Vendor",
            category: r.vendors?.category ?? "General",
            annualizedSpend: r.annualized_spend ?? 0,
            href: `/app/vendors/${r.id}`,
          }));

          blocks.push({
            id: `soverview-${organizationId}`,
            type: "spend_overview",
            payload: {
              annualizedSpend: totalSpend,
              currency: "USD",
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
                currency: inv.currency ?? "USD",
                reviewStatus: inv.review_status,
                vendorMatchStatus: inv.vendor_match_status,
                reconciliationState: inv.reconciliation_status,
                documentId: inv.document_id,
                href: `/app/documents/${inv.id}`,
                filename: inv.documents?.original_filename ?? "Invoice Document",
              },
            });
          }
          break;
        }

        case "invoice_comparison": {
          const [id1, id2] = req.invoiceIds;
          const { data } = await db
            .from("invoices")
            .select("id, invoice_number, invoice_date, total_amount, organization_vendor_id, organization_vendors(vendors(canonical_name))")
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
                  vendorName,
                  href: `/app/documents/${second.id}`,
                },
              });
            }
          }
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
                annualizedSpend: rel.annualized_spend ?? 0,
                catalogStatus: v.catalog_status,
                logoUrl: v.logo_url ?? null,
                href: `/app/vendors/${rel.id}`,
              },
            });
          }
          break;
        }

        case "spend_trend": {
          const { data } = await db
            .from("invoices")
            .select("id, total_amount, invoice_date, organization_vendors(vendors(canonical_name))")
            .eq("organization_id", organizationId)
            .order("invoice_date", { ascending: false })
            .limit(6);

          const invoices = (data ?? []) as unknown as InvoiceRow[];
          const periods = invoices.map((inv) => ({
            label: inv.invoice_date ? inv.invoice_date.slice(0, 7) : "Period",
            amount: inv.total_amount ?? 0,
          })).reverse();

          const total = periods.reduce((sum, p) => sum + p.amount, 0);
          const average = periods.length > 0 ? Math.round(total / periods.length) : 0;

          blocks.push({
            id: `strend-${organizationId}`,
            type: "spend_trend",
            payload: {
              scopeLabel: "Recent Spend Trend",
              currency: "USD",
              total,
              average,
              changePercent: null,
              periods,
              href: "/app/vendors",
            },
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
          const { data } = await db
            .from("contracts")
            .select("id, title, end_date, notice_deadline, auto_renews, organization_vendors(vendors(canonical_name))")
            .eq("organization_id", organizationId)
            .order("end_date", { ascending: true })
            .limit(5);

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
            .from("opportunities")
            .select("id, title, estimated_annual_value, category")
            .eq("organization_id", organizationId)
            .eq("status", "implemented")
            .limit(5);

          const opps = (data ?? []) as unknown as OppRow[];
          const totalVerified = opps.reduce((sum, o) => sum + (o.estimated_annual_value ?? 0), 0);
          const outcomes = opps.map((o) => ({
            savingsId: o.id,
            title: o.title,
            category: o.category ?? "General",
            amount: o.estimated_annual_value ?? 0,
            href: `/app/opportunities/${o.id}`,
          }));

          blocks.push({
            id: `ssummary-${organizationId}`,
            type: "savings_summary",
            payload: {
              totalVerifiedValue: totalVerified,
              currency: "USD",
              outcomeCount: outcomes.length,
              outcomes,
              href: "/app/opportunities",
            },
          });
          break;
        }

        case "approval_queue": {
          const { data } = await db
            .from("opportunities")
            .select("id, title, estimated_annual_value, status")
            .eq("organization_id", organizationId)
            .eq("status", "pending_review")
            .limit(5);

          const opps = (data ?? []) as unknown as OppRow[];
          const actions = opps.map((o) => ({
            actionId: o.id,
            title: o.title,
            actionType: "Review Opportunity",
            annualValue: o.estimated_annual_value ?? 0,
            status: o.status,
            href: `/app/opportunities/${o.id}`,
          }));

          blocks.push({
            id: `aqueue-${organizationId}`,
            type: "approval_queue",
            payload: {
              actions,
              href: "/app/approvals",
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
