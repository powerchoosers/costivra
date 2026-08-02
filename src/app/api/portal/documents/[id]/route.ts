import { NextResponse } from "next/server";
import { rescanManualUpload } from "@/lib/documents/manual-upload";
import { apiError, cleanUuid } from "@/lib/portal/http";
import { requirePortalEditor } from "@/lib/portal/repository";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { db, organizationId, userId } = await requirePortalEditor();
    const id = cleanUuid((await params).id);
    if (!id) return NextResponse.json({ error: "Document not found." }, { status: 404 });
    const result = await rescanManualUpload({ db, organizationId, actorId: userId, documentId: id });
    if (result.outcome === "not_found") return NextResponse.json({ error: "Document not found." }, { status: 404 });
    if (result.outcome === "not_quarantined") return NextResponse.json({ error: "Only quarantined uploads can be rescanned." }, { status: 409 });
    if (result.outcome === "rejected") return NextResponse.json({ error: result.error }, { status: 422 });
    if (result.outcome === "quarantined") return NextResponse.json({ ok: false, ...result }, { status: 503 });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) { return apiError(error); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { db, organizationId, userId } = await requirePortalEditor();
    const id = cleanUuid((await params).id);
    const { data: document } = await db.from("documents").select("id,storage_path").eq("id", id).eq("organization_id", organizationId).maybeSingle();
    if (!document) return NextResponse.json({ error: "Document not found." }, { status: 404 });
    const removed = await db.storage.from("costivra-documents").remove([document.storage_path]);
    if (removed.error) throw removed.error;
    const { error } = await db.from("documents").delete().eq("id", id).eq("organization_id", organizationId);
    if (error) throw error;
    await db.from("audit_events").insert({ organization_id: organizationId, actor_type: "user", actor_id: userId, action: "document.deleted", resource_type: "document", resource_id: id });
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
