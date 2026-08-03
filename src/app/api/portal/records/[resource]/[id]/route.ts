import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { apiError, cleanText } from "@/lib/portal/http";
import { editableResources, normalizeRecordField, type EditableResource } from "@/lib/portal/record-editing";
import { requirePortalContext } from "@/lib/portal/repository";

const editors = new Set(["owner", "admin", "member"]);
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

export async function PATCH(request: Request, context: { params: Promise<{ resource: string; id: string }> }) {
  try {
    const { resource, id } = await context.params;
    const { db, userId, organizationId, role } = await requirePortalContext();
    if (!editors.has(role)) return NextResponse.json({ error: "Your role can view and copy fields, but cannot edit them." }, { status: 403 });
    const config = editableResources[resource as EditableResource];
    if (!config || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Record not found." }, { status: 404 });
    const body = await request.json() as Record<string, unknown>;
    const field = cleanText(body.field, 80);
    const normalized = normalizeRecordField(resource, field, body.value);

    if (field === "locationId" && normalized.value) {
      const { data: location, error: locationError } = await db
        .from("locations")
        .select("id")
        .eq("id", normalized.value)
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (locationError) throw locationError;
      if (!location)
        return NextResponse.json(
          { error: "That location is not part of this workspace." },
          { status: 404 },
        );
    }

    let query = db.from(config.table).select("*").eq("id", id);
    if (resource !== "action") query = query.eq("organization_id", organizationId);
    const { data: before, error: readError } = await query.maybeSingle();
    if (readError) throw readError;
    if (!before) return NextResponse.json({ error: "Record not found in your workspace." }, { status: 404 });
    if (resource === "action") {
      const { data: opportunity } = await db.from("opportunities").select("organization_id").eq("id", before.opportunity_id).eq("organization_id", organizationId).maybeSingle();
      if (!opportunity) return NextResponse.json({ error: "Record not found in your workspace." }, { status: 404 });
    }
    const expectedUpdatedAt = typeof body.expectedUpdatedAt === "string" ? body.expectedUpdatedAt : null;
    if (expectedUpdatedAt && "updated_at" in before && before.updated_at !== expectedUpdatedAt) return NextResponse.json({ error: "This record changed in another session. Refresh before saving." }, { status: 409 });

    let update = db.from(config.table).update({ [normalized.column]: normalized.value }).eq("id", id);
    if (resource !== "action") update = update.eq("organization_id", organizationId);
    if (expectedUpdatedAt && "updated_at" in before) update = update.eq("updated_at", expectedUpdatedAt);
    const { data: after, error: updateError } = await update.select("*").maybeSingle();
    if (updateError) throw updateError;
    if (!after) return NextResponse.json({ error: "This record changed before the update completed. Refresh and try again." }, { status: 409 });

    const traceId = randomUUID();
    const { error: auditError } = await db.from("audit_events").insert({ organization_id: organizationId, actor_type: "user", actor_id: userId, action: `${resource}.field_updated.${field}`, resource_type: resource, resource_id: id, before_hash: digest({ [normalized.column]: before[normalized.column] }), after_hash: digest({ [normalized.column]: normalized.value }), trace_id: traceId });
    if (auditError) throw auditError;
    return NextResponse.json({ ok: true, field, value: normalized.value, updatedAt: after.updated_at ?? null, traceId });
  } catch (error) {
    return apiError(error);
  }
}
