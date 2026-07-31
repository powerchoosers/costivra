import { NextResponse } from "next/server";
import { apiError, cleanUuid } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { db, organizationId, userId } = await requirePortalContext();
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
