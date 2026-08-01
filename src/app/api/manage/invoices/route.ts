import { NextResponse } from "next/server";
import { manageApiError, requireInternalOwner } from "@/lib/manage/auth";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const priorities = new Set(["low", "normal", "high", "urgent"]);

export async function PATCH(request: Request) {
  try {
    const operator = await requireInternalOwner();
    const body = await request.json() as Record<string, unknown>;
    const invoiceIds = Array.isArray(body.invoiceIds)
      ? [...new Set(body.invoiceIds.filter((id): id is string => typeof id === "string" && uuid.test(id)))].slice(0, 100)
      : [];
    const assignedTo = typeof body.assignedTo === "string" && uuid.test(body.assignedTo) ? body.assignedTo : null;
    const priority = typeof body.priority === "string" && priorities.has(body.priority) ? body.priority : "normal";
    const reviewDueAt = typeof body.reviewDueAt === "string" && !Number.isNaN(Date.parse(body.reviewDueAt))
      ? new Date(body.reviewDueAt).toISOString()
      : null;
    if (!invoiceIds.length) return NextResponse.json({ error: "Select at least one invoice." }, { status: 400 });
    if (body.assignedTo && !assignedTo) return NextResponse.json({ error: "Choose a valid reviewer." }, { status: 400 });
    if (assignedTo) {
      const { data: reviewer, error } = await operator.db.from("internal_staff_users")
        .select("user_id").eq("user_id", assignedTo).eq("status", "active").maybeSingle();
      if (error) throw error;
      if (!reviewer) return NextResponse.json({ error: "That reviewer is not active." }, { status: 400 });
    }
    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await operator.db.from("invoices")
      .update({
        assigned_to: assignedTo,
        assigned_by: operator.userId,
        assigned_at: now,
        review_priority: priority,
        review_due_at: reviewDueAt,
        updated_at: now,
      })
      .in("id", invoiceIds)
      .select("id,organization_id");
    if (updateError) throw updateError;
    const updatedRows = updated ?? [];
    if (updatedRows.length) {
      const { error: auditError } = await operator.db.from("internal_audit_events").insert(
        updatedRows.map((invoice) => ({
          actor_id: operator.userId,
          organization_id: invoice.organization_id,
          action: "invoice_review_assigned",
          resource_type: "invoice",
          resource_id: invoice.id,
          safe_metadata: { assigned_to: assignedTo, priority, review_due_at: reviewDueAt },
        })),
      );
      if (auditError) throw auditError;
    }
    return NextResponse.json({ updated: updatedRows.length });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
