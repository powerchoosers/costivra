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

  // Enforce maximum blocks to prevent model abuse
  const bounded = requests.slice(0, 5);

  for (const req of bounded) {
    try {
      switch (req.type) {
        case "invoice_summary": {
          // Single literal select string required for Supabase TypeScript inference
          const { data } = await db
            .from("invoices")
            .select("id, invoice_number, invoice_date, due_date, total_amount, currency, review_status, vendor_match_status, reconciliation_status, document_id, organization_vendor_id, organization_vendors(vendors(canonical_name)), documents(original_filename)")
            .eq("id", req.invoiceId)
            .eq("organization_id", organizationId)
            .maybeSingle();

          const inv = data as unknown as InvoiceRow | null;
          if (inv) {
            const vendorName =
              inv.organization_vendors?.vendors?.canonical_name ?? null;

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

              const vendorName =
                first.organization_vendors?.vendors?.canonical_name ?? null;

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
                },
              });
            }
          }
          break;
        }

        case "vendor_summary": {
          // vendors has canonical_name, not name
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

        case "opportunity": {
          // Use estimated_annual_value — no estimated_annual_savings column
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

        case "document_ingestion": {
          // Use extraction_summary — no summary or confidence column on documents
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
      // Log server-side; do not surface internals to the client
      console.error("[block-hydrator] Failed to hydrate block:", req.type, err);
    }
  }

  return blocks;
}
