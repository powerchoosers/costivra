import { NextResponse } from "next/server";
import { apiError, cleanText, cleanUuid } from "@/lib/portal/http";
import { requirePortalEditor } from "@/lib/portal/repository";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { db, organizationId, userId } = await requirePortalEditor();
    const id = cleanUuid((await params).id);
    const body = await request.json() as Record<string, unknown>;
    const operation = cleanText(body.operation, 30);
    const { data: integration } = await db.from("integrations").select("id,provider,status").eq("id", id).eq("organization_id", organizationId).maybeSingle();
    if (!integration) return NextResponse.json({ error: "Integration not found." }, { status: 404 });
    if (integration.status === "restricted") return NextResponse.json({ error: "This connection requires a reviewed consent workflow." }, { status: 409 });
    if (!['connect','pause','resume','disconnect'].includes(operation)) return NextResponse.json({ error: "Unsupported integration action." }, { status: 400 });
    const status = operation === 'pause' ? 'paused' : operation === 'disconnect' ? 'available' : 'connected';
    const { error } = await db.from("integrations").update({ status, last_synced_at: status === 'connected' ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
    await db.from("audit_events").insert({ organization_id: organizationId, actor_type: "user", actor_id: userId, action: `integration.${operation}`, resource_type: "integration", resource_id: id });
    return NextResponse.json({ ok: true, status });
  } catch (error) { return apiError(error); }
}
