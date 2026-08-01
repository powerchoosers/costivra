import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { evaluateApprovedExpense } from "@/lib/workflows/value-engine";

const allowedFields = new Set([
  "organization_vendor_id", "expense_account_id", "invoice_number", "invoice_date", "due_date",
  "service_period_start", "service_period_end", "account_number_last4", "purchase_order_number",
  "currency", "subtotal", "tax_total", "fee_total", "credit_total", "total_amount", "amount_due",
  "expense_category", "review_notes", "review_priority", "review_due_at",
]);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const operator = await requireInternalOperator();
    const { id } = await context.params;
    const body = await request.json() as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "update";
    const { data: invoice, error: invoiceError } = await operator.db.from("invoices")
      .select("*").eq("id", id).maybeSingle();
    if (invoiceError) throw invoiceError;
    if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });

    if (action === "approve") {
      const { data: expenseId, error } = await operator.db.rpc("internal_approve_invoice", {
        p_invoice_id: id,
        p_actor_id: operator.userId,
      });
      if (error) return NextResponse.json({ error: friendlyReviewError(error.message) }, { status: 400 });
      try {
        const evaluation = await evaluateApprovedExpense({
          db: operator.db,
          organizationId: invoice.organization_id as string,
          expenseId: expenseId as string,
          actorId: operator.userId,
        });
        await operator.db.from("invoices").update({
          metadata: { ...(invoice.metadata as Record<string, unknown> ?? {}), valueEngineStatus: "complete" },
        }).eq("id", id);
        return NextResponse.json({ expenseId, evaluation });
      } catch (evaluationError) {
        console.error("Invoice value evaluation failed", evaluationError instanceof Error ? evaluationError.message : "Unknown error");
        await operator.db.from("invoices").update({
          metadata: { ...(invoice.metadata as Record<string, unknown> ?? {}), valueEngineStatus: "retry_required" },
        }).eq("id", id);
        return NextResponse.json({ expenseId, warning: "The invoice was approved, but opportunity evaluation needs to be retried." });
      }
    }

    if (action === "follow_up") {
      const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 4000) : "";
      if (notes.length < 3) return NextResponse.json({ error: "Add a short note explaining the follow-up." }, { status: 400 });
      const { error } = await operator.db.from("invoices").update({
        review_status: "needs_review", review_notes: notes, updated_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
      const { error: auditError } = await operator.db.from("internal_audit_events").insert({
        actor_id: operator.userId, organization_id: invoice.organization_id,
        action: "invoice_follow_up_requested", resource_type: "invoice", resource_id: id,
        safe_metadata: { note_length: notes.length },
      });
      if (auditError) throw auditError;
      return NextResponse.json({ status: "needs_review" });
    }

    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 1000) : "";
    const rawChanges = body.changes && typeof body.changes === "object" && !Array.isArray(body.changes)
      ? body.changes as Record<string, unknown>
      : {};
    const changes = Object.fromEntries(Object.entries(rawChanges).filter(([key, value]) => {
      if (!allowedFields.has(key) || (typeof value !== "string" && value !== null)) return false;
      return String(invoice[key] ?? "") !== String(value ?? "");
    }));
    if (!Object.keys(changes).length) return NextResponse.json({ updated: false });
    if (reason.length < 3) return NextResponse.json({ error: "Explain why the extracted value is being corrected." }, { status: 400 });

    if (typeof changes.organization_vendor_id === "string" && changes.organization_vendor_id) {
      const { data } = await operator.db.from("organization_vendors").select("id")
        .eq("id", changes.organization_vendor_id).eq("organization_id", invoice.organization_id).maybeSingle();
      if (!data) return NextResponse.json({ error: "That vendor does not belong to this client." }, { status: 400 });
    }
    if (typeof changes.expense_account_id === "string" && changes.expense_account_id) {
      const { data } = await operator.db.from("expense_accounts").select("id")
        .eq("id", changes.expense_account_id).eq("organization_id", invoice.organization_id).maybeSingle();
      if (!data) return NextResponse.json({ error: "That expense account does not belong to this client." }, { status: 400 });
    }

    const { error } = await operator.db.rpc("internal_update_invoice_review", {
      p_invoice_id: id,
      p_actor_id: operator.userId,
      p_changes: changes,
      p_reason: reason,
    });
    if (error) return NextResponse.json({ error: friendlyReviewError(error.message) }, { status: 400 });
    if ("organization_vendor_id" in changes) {
      const relationshipId = typeof changes.organization_vendor_id === "string" && changes.organization_vendor_id
        ? changes.organization_vendor_id
        : null;
      const { error: matchError } = await operator.db.from("invoices").update({
        vendor_match_status: relationshipId ? "provided" : "unmatched",
      }).eq("id", id);
      if (matchError) throw matchError;
      const { error: documentError } = await operator.db.from("documents").update({
        organization_vendor_id: relationshipId,
      }).eq("id", invoice.document_id).eq("organization_id", invoice.organization_id);
      if (documentError) throw documentError;
    }
    return NextResponse.json({ updated: true });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}

function friendlyReviewError(message: string) {
  if (message.includes("VENDOR_REQUIRED")) return "Match this invoice to a client vendor before approval.";
  if (message.includes("REQUIRED_FIELDS_MISSING")) return "Complete the invoice number, dates, category, currency, and total before approval.";
  if (message.includes("RECONCILIATION_REQUIRED")) return "The invoice arithmetic must reconcile before approval.";
  if (message.includes("CORRECTION_REASON_REQUIRED")) return "Add a reason for the correction.";
  if (message.includes("INVOICE_NOT_FOUND")) return "Invoice not found.";
  return "The invoice could not be updated. Check the fields and try again.";
}
