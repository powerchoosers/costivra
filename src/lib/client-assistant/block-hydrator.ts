import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AssistantBlockRequest, AssistantBlockV1 } from "./types";
import { parseMoneyToCents, annualizeSpendCents } from "@/lib/vendors/spend";

/**
 * Hydrates block requests into authoritative versioned AssistantBlockV1 payloads.
 * Strictly verifies that all requested record IDs belong to the authenticated organization.
 */
export async function hydrateAssistantBlocks(
  db: SupabaseClient,
  organizationId: string,
  requests: AssistantBlockRequest[],
): Promise<AssistantBlockV1[]> {
  const blocks: AssistantBlockV1[] = [];

  for (const req of requests) {
    try {
      switch (req.type) {
        case "invoice_summary": {
          const { data: inv } = await db
            .from("invoices")
            .select("*, documents(original_filename, mime_type, byte_size)")
            .eq("id", req.invoiceId)
            .eq("organization_id", organizationId)
            .maybeSingle();

          if (inv) {
            blocks.push({
              id: `inv-${inv.id}`,
              type: "invoice_summary",
              payload: {
                invoiceId: inv.id,
                vendorName: inv.vendor_name,
                invoiceNumber: inv.invoice_number,
                invoiceDate: inv.invoice_date,
                dueDate: inv.due_date,
                totalAmount: inv.total_amount,
                reviewStatus: inv.review_status,
                vendorMatchStatus: inv.vendor_match_status,
                reconciliationState: inv.reconciliation_status,
                documentId: inv.document_id,
                filename: (inv.documents as unknown as { original_filename?: string })?.original_filename ?? "Invoice Document",
              },
            });
          }
          break;
        }

        case "invoice_comparison": {
          const [id1, id2] = req.invoiceIds;
          const { data: invs } = await db
            .from("invoices")
            .select("*")
            .in("id", [id1, id2])
            .eq("organization_id", organizationId);

          if (invs && invs.length === 2) {
            const sorted = invs.sort((x, y) => String(x.invoice_date).localeCompare(String(y.invoice_date)));
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

              blocks.push({
                id: `comp-${first.id}-${second.id}`,
                type: "invoice_comparison",
                payload: {
                  periodA: { id: first.id, date: first.invoice_date, amount: first.total_amount, number: first.invoice_number },
                  periodB: { id: second.id, date: second.invoice_date, amount: second.total_amount, number: second.invoice_number },
                  differenceAmount: diffCents != null ? diffCents / 100 : null,
                  percentageChange: pctChange != null ? Math.round(pctChange * 10) / 10 : null,
                  vendorName: first.vendor_name,
                },
              });
            }
          }
          break;
        }

        case "vendor_summary": {
          const { data: rel } = await db
            .from("organization_vendors")
            .select("*, vendors(id, name, category, website, catalog_status, logo_url)")
            .eq("id", req.vendorRelationshipId)
            .eq("organization_id", organizationId)
            .maybeSingle();

          if (rel && rel.vendors) {
            const v = rel.vendors as unknown as { id: string; name: string; category?: string; website?: string; catalog_status: string; logo_url?: string };
            blocks.push({
              id: `vsum-${rel.id}`,
              type: "vendor_summary",
              payload: {
                vendorRelationshipId: rel.id,
                vendorId: v.id,
                name: v.name,
                category: v.category ?? "General",
                website: v.website,
                relationshipStatus: rel.relationship_status,
                annualizedSpend: rel.annualized_spend ?? 0,
                catalogStatus: v.catalog_status,
                logoUrl: v.logo_url,
              },
            });
          }
          break;
        }

        case "opportunity": {
          const { data: opp } = await db
            .from("opportunities")
            .select("*")
            .eq("id", req.opportunityId)
            .eq("organization_id", organizationId)
            .maybeSingle();

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
                estimatedAnnualSavings: opp.estimated_annual_savings,
                evidenceCount: opp.evidence_count ?? 0,
                category: opp.category,
              },
            });
          }
          break;
        }

        case "document_ingestion": {
          const { data: doc } = await db
            .from("documents")
            .select("*")
            .eq("id", req.documentId)
            .eq("organization_id", organizationId)
            .maybeSingle();

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
                confidence: doc.confidence,
                summary: doc.summary,
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
    } catch {
      // Discard invalid blocks gracefully
    }
  }

  return blocks;
}
