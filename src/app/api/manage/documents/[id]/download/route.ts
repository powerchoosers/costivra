import { NextResponse } from "next/server";
import { isDocumentDownloadableStatus } from "@/lib/documents/access";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { cleanUuid } from "@/lib/portal/http";

export const runtime = "nodejs";

function safeDownloadName(value: unknown) {
  if (typeof value !== "string") return "costivra-document";
  const normalized = value
    .replace(/[\\/:*?"<>|\u0000-\u001F]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
  return normalized || "costivra-document";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const operator = await requireInternalOperator();
    const id = cleanUuid((await params).id);
    if (!id)
      return NextResponse.json({ error: "Choose a valid document." }, { status: 400 });
    const { data: document, error: documentError } = await operator.db
      .from("documents")
      .select("id,organization_id,storage_path,original_filename,status,mime_type,byte_size,document_type,source_purged_at")
      .eq("id", id)
      .maybeSingle();
    if (documentError) throw documentError;
    if (!document?.storage_path)
      return NextResponse.json({ error: "That document is not available." }, { status: 404 });
    if (document.source_purged_at)
      return NextResponse.json(
        { error: "The original file reached its retention limit. Extracted records and evidence remain available." },
        { status: 410 },
      );
    if (!isDocumentDownloadableStatus(document.status)) {
      return NextResponse.json(
        { error: "This source file is not available until its security and processing checks finish." },
        { status: 423 },
      );
    }
    const { data: signed, error: signedError } = await operator.db.storage
      .from("costivra-documents")
      .createSignedUrl(document.storage_path, 60, {
        download: safeDownloadName(document.original_filename),
      });
    if (signedError || !signed?.signedUrl)
      throw signedError || new Error("DOCUMENT_URL_UNAVAILABLE");
    const { error: auditError } = await operator.db.from("internal_audit_events").insert({
      actor_id: operator.userId,
      organization_id: document.organization_id,
      action: "crm.document_signed_url_issued",
      resource_type: "document",
      resource_id: document.id,
      safe_metadata: {
        mime_type: document.mime_type,
        byte_size: document.byte_size,
        document_type: document.document_type,
      },
    });
    if (auditError) throw auditError;
    const response = NextResponse.redirect(signed.signedUrl);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("X-Content-Type-Options", "nosniff");
    return response;
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
