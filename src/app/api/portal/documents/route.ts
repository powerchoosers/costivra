import { NextResponse } from "next/server";
import { DOCUMENT_MIME_TYPES, MAX_DOCUMENT_SIZE } from "@/lib/documents/intake";
import { ingestManualUpload } from "@/lib/documents/manual-upload";
import { apiError, cleanUuid } from "@/lib/portal/http";
import { requirePortalEditor } from "@/lib/portal/repository";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { db, organizationId, userId } = await requirePortalEditor();
    const form = await request.formData();
    const file = form.get("file");
    const organizationVendorId = cleanUuid(form.get("organizationVendorId"));
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
    if (!DOCUMENT_MIME_TYPES.has(file.type)) return NextResponse.json({ error: "Upload a PDF, text file, or DOCX document." }, { status: 415 });
    if (file.size <= 0 || file.size > MAX_DOCUMENT_SIZE) return NextResponse.json({ error: "Files must be between 1 byte and 20 MB." }, { status: 413 });
    if (organizationVendorId) {
      const { data: relationship } = await db.from("organization_vendors").select("id").eq("id", organizationVendorId).eq("organization_id", organizationId).maybeSingle();
      if (!relationship) return NextResponse.json({ error: "The selected vendor is not available." }, { status: 404 });
    }

    const result = await ingestManualUpload({
      db,
      organizationId,
      actorId: userId,
      filename: file.name,
      mimeType: file.type,
      buffer: Buffer.from(await file.arrayBuffer()),
      organizationVendorId: organizationVendorId || null,
    });
    if (result.outcome === "duplicate") return NextResponse.json({ error: `This file already exists as ${result.originalFilename}.`, documentId: result.documentId }, { status: 409 });
    if (result.outcome === "rejected") return NextResponse.json({ error: result.error }, { status: 422 });
    return NextResponse.json({ ok: true, ...result }, { status: result.outcome === "quarantined" ? 202 : 201 });
  } catch (error) { return apiError(error); }
}
