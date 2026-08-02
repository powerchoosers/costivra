import { NextResponse } from "next/server";
import { isDocumentDownloadableStatus } from "@/lib/documents/access";
import { apiError, cleanUuid } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { db, organizationId } = await requirePortalContext();
    const id = cleanUuid((await params).id);
    const { data: document } = await db.from("documents").select("storage_path,status").eq("id", id).eq("organization_id", organizationId).maybeSingle();
    if (!document) return NextResponse.json({ error: "Document not found." }, { status: 404 });
    if (!isDocumentDownloadableStatus(document.status)) {
      return NextResponse.json({ error: "This source file is not available until its security and processing checks finish." }, { status: 423 });
    }
    const { data, error } = await db.storage.from("costivra-documents").createSignedUrl(document.storage_path, 60);
    if (error) throw error;
    return NextResponse.redirect(data.signedUrl);
  } catch (error) { return apiError(error); }
}
