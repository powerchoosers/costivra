import { NextResponse } from "next/server";
import { manageApiError, requireInternalOwner } from "@/lib/manage/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privateHeaders = { "Cache-Control": "private, no-store" };
const actions = new Set(["mark_demo", "manual_note", "deprecate", "hide_customer", "attach_evidence"]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const owner = await requireInternalOwner();
    const { id } = await params;
    if (!/^[0-9a-f-]{20,}$/i.test(id)) return NextResponse.json({ error: "Opportunity not found." }, { status: 404, headers: privateHeaders });
    const body = await request.json().catch(() => ({})) as { action?: unknown; note?: unknown; evidenceIds?: unknown };
    const action = typeof body.action === "string" ? body.action : "";
    if (!actions.has(action)) return NextResponse.json({ error: "Choose a valid trust-review action." }, { status: 400, headers: privateHeaders });

    const { data: opportunity, error: opportunityError } = await owner.db
      .from("opportunities")
      .select("id,organization_id,expense_account_id,source_expense_id,generated_by")
      .eq("id", id)
      .maybeSingle();
    if (opportunityError) throw opportunityError;
    if (!opportunity) return NextResponse.json({ error: "Opportunity not found." }, { status: 404, headers: privateHeaders });

    if (action === "attach_evidence") {
      const evidenceIds = Array.isArray(body.evidenceIds)
        ? body.evidenceIds.filter((value): value is string => typeof value === "string" && /^[0-9a-f-]{20,}$/i.test(value))
        : [];
      const uniqueEvidenceIds = [...new Set(evidenceIds)];
      if (!uniqueEvidenceIds.length) return NextResponse.json({ error: "Select at least one evidence reference." }, { status: 400, headers: privateHeaders });
      const { data: references, error: evidenceError } = await owner.db
        .from("evidence_references")
        .select("id,document_id")
        .in("id", uniqueEvidenceIds);
      if (evidenceError) throw evidenceError;
      const documentIds = (references ?? []).map((reference) => String(reference.document_id));
      const sourceDocumentsResult = opportunity.source_expense_id
        ? await owner.db.from("expenses").select("document_id").eq("id", opportunity.source_expense_id).eq("organization_id", opportunity.organization_id).maybeSingle()
        : opportunity.expense_account_id
          ? await owner.db.from("expenses").select("document_id").eq("expense_account_id", opportunity.expense_account_id).eq("organization_id", opportunity.organization_id)
          : { data: [], error: null };
      if (sourceDocumentsResult.error) throw sourceDocumentsResult.error;
      const sourceDocumentIds = new Set(
        (Array.isArray(sourceDocumentsResult.data) ? sourceDocumentsResult.data : sourceDocumentsResult.data ? [sourceDocumentsResult.data] : [])
          .map((expense) => String(expense.document_id ?? ""))
          .filter(Boolean),
      );
      if (!sourceDocumentIds.size || documentIds.some((documentId) => !sourceDocumentIds.has(documentId))) {
        return NextResponse.json({ error: "Evidence must come from a source document linked to this expense account." }, { status: 400, headers: privateHeaders });
      }
      const { data: documents, error: documentsError } = documentIds.length
        ? await owner.db.from("documents").select("id").in("id", documentIds).eq("organization_id", opportunity.organization_id)
        : { data: [], error: null };
      if (documentsError) throw documentsError;
      if (!references || references.length !== uniqueEvidenceIds.length || (documents ?? []).length !== uniqueEvidenceIds.length) return NextResponse.json({ error: "Evidence must belong to the same customer workspace." }, { status: 400, headers: privateHeaders });
      const { error: linkError } = await owner.db.from("opportunity_evidence").upsert(
        uniqueEvidenceIds.map((evidenceReferenceId) => ({ opportunity_id: id, evidence_reference_id: evidenceReferenceId, role: "supporting" })),
        { onConflict: "opportunity_id,evidence_reference_id" },
      );
      if (linkError) throw linkError;
    }

    const update: Record<string, unknown> = {
      trust_reviewed_by: owner.userId,
      trust_reviewed_at: new Date().toISOString(),
      trust_review_note: typeof body.note === "string" ? body.note.slice(0, 1000) : null,
    };
    if (action === "mark_demo") update.trust_state = "demo_example";
    if (action === "manual_note") update.trust_state = "manual_note";
    if (action === "deprecate") {
      update.trust_state = "deprecated";
      update.customer_visible = false;
    }
    if (action === "hide_customer") update.customer_visible = false;
    if (action === "attach_evidence" && opportunity.generated_by === "manual") update.trust_state = "manual_note";
    const { error: updateError } = await owner.db.from("opportunities").update(update).eq("id", id).eq("organization_id", opportunity.organization_id);
    if (updateError) throw updateError;
    const { error: auditError } = await owner.db.from("audit_events").insert({
      organization_id: opportunity.organization_id,
      actor_type: "user",
      actor_id: owner.userId,
      action: `opportunity.trust_review.${action}`,
      resource_type: "opportunity",
      resource_id: id,
      safe_metadata: { note: typeof body.note === "string" ? body.note.slice(0, 1000) : null },
    });
    if (auditError) throw auditError;
    return NextResponse.json({ ok: true, action }, { headers: privateHeaders });
  } catch (error) {
    const databaseCode = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
    if (databaseCode === "42703") {
      return NextResponse.json({ error: "Apply the finding-trust migration before changing this record." }, { status: 409, headers: privateHeaders });
    }
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status, headers: privateHeaders });
  }
}
