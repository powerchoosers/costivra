import { NextResponse } from "next/server";
import { apiError, cleanText, cleanUuid } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { db, organizationId } = await requirePortalContext();
    const id = cleanUuid((await params).id);
    if (!id) return NextResponse.json({ error: "Invalid opportunity." }, { status: 400 });
    const body = await request.json() as Record<string, unknown>;
    const allowedStatuses = new Set(["open","under_review","approved","declined","in_progress","verified","closed"]);
    const allowedPriorities = new Set(["high","medium","low"]);
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const status = cleanText(body.status, 30);
    const priority = cleanText(body.priority, 20);
    if (status && allowedStatuses.has(status)) update.status = status;
    if (priority && allowedPriorities.has(priority)) update.priority = priority;
    if (Object.prototype.hasOwnProperty.call(body, "deadlineAt")) update.deadline_at = cleanText(body.deadlineAt, 40) || null;
    const { data, error } = await db.from("opportunities").update(update).eq("id", id).eq("organization_id", organizationId).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
