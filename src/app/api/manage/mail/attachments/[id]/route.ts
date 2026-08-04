import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { requireMailbox } from "@/lib/manage/mailbox-access";
import { DOCUMENT_MIME_TYPES, ingestDocumentBuffer } from "@/lib/documents/intake";
import { cleanUuid } from "@/lib/portal/http";
import { scanFileForMalware } from "@/lib/security/malware-scanner";

export const runtime = "nodejs";

function contentDisposition(filename: string, inline: boolean) {
  const fallback = filename.replace(/[^A-Za-z0-9._ -]/g, "_").slice(0, 180) || "attachment";
  return `${inline ? "inline" : "attachment"}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const operator = await requireInternalOperator();
    const id = cleanUuid((await context.params).id);
    if (!id)
      return NextResponse.json({ error: "Choose a valid attachment." }, { status: 400 });
    const { data: attachment, error } = await operator.db
      .from("crm_email_attachments")
      .select("id,message_id,mailbox_id,organization_id,filename,content_type,content_disposition,byte_size,scan_status,storage_path")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!attachment)
      return NextResponse.json({ error: "That attachment was not found." }, { status: 404 });
    await requireMailbox(operator, attachment.mailbox_id, "read");
    if (attachment.scan_status !== "clean" || !attachment.storage_path)
      return NextResponse.json(
        { error: "This attachment is not available until its security scan passes." },
        { status: 409 },
      );
    const stored = await operator.db.storage
      .from("costivra-mail-attachments")
      .download(attachment.storage_path);
    if (stored.error || !stored.data)
      return NextResponse.json({ error: "The stored attachment is unavailable." }, { status: 404 });
    const buffer = Buffer.from(await stored.data.arrayBuffer());
    if (buffer.length !== Number(attachment.byte_size))
      return NextResponse.json({ error: "The stored attachment did not pass its integrity check." }, { status: 409 });
    const inline = attachment.content_disposition === "inline" ||
      attachment.content_type.startsWith("image/") ||
      attachment.content_type === "application/pdf";
    await operator.db.from("internal_audit_events").insert({
      actor_id: operator.userId,
      organization_id: attachment.organization_id,
      action: "crm.email_attachment_opened",
      resource_type: "crm_email_message",
      resource_id: attachment.message_id,
      safe_metadata: {
        attachment_id: attachment.id,
        content_type: attachment.content_type,
        byte_size: attachment.byte_size,
      },
    });
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": attachment.content_type,
        "Content-Length": String(buffer.length),
        "Content-Disposition": contentDisposition(attachment.filename, inline),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const failure = manageApiError(error);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const operator = await requireInternalOperator();
    const id = cleanUuid((await context.params).id);
    if (!id) return NextResponse.json({ error: "Choose a valid attachment." }, { status: 400 });
    const { data: attachment, error } = await operator.db.from("crm_email_attachments")
      .select("id,message_id,mailbox_id,organization_id,filename,content_type,byte_size,scan_status,storage_path,document_id")
      .eq("id", id).maybeSingle();
    if (error) throw error;
    if (!attachment) return NextResponse.json({ error: "That attachment was not found." }, { status: 404 });
    await requireMailbox(operator, attachment.mailbox_id, "read");
    if (attachment.scan_status === "clean") return NextResponse.json({ status: "clean", documentId: attachment.document_id });
    if (attachment.scan_status === "infected") return NextResponse.json({ error: "This attachment was blocked by malware scanning." }, { status: 409 });
    if (!attachment.storage_path) return NextResponse.json({ error: "The attachment has not finished arriving yet." }, { status: 409 });
    const now = new Date().toISOString();
    await operator.db.from("crm_email_attachments").update({ scan_status: "scanning", scan_started_at: now, updated_at: now }).eq("id", id).in("scan_status", ["pending", "unavailable", "failed"]);
    const stored = await operator.db.storage.from("costivra-mail-attachments").download(attachment.storage_path);
    if (stored.error || !stored.data) throw new Error("The stored attachment is unavailable.");
    const buffer = Buffer.from(await stored.data.arrayBuffer());
    if (buffer.length !== Number(attachment.byte_size)) throw new Error("The stored attachment did not pass its integrity check.");
    const scan = await scanFileForMalware({ buffer, filename: attachment.filename, mimeType: attachment.content_type });
    if (scan.status !== "clean") {
      await operator.db.from("crm_email_attachments").update({ scan_status: scan.status, scanned_at: new Date().toISOString(), error_message: scan.status === "infected" ? "Malware scanning blocked this attachment." : scan.detail || "The security scan could not complete.", updated_at: new Date().toISOString() }).eq("id", id);
      return NextResponse.json({ error: scan.status === "infected" ? "This attachment was blocked by malware scanning." : "The security scan could not complete. Try again later." }, { status: 409 });
    }
    let documentId: string | null = null;
    if (attachment.organization_id && DOCUMENT_MIME_TYPES.has(attachment.content_type)) {
      const document = await ingestDocumentBuffer({ db: operator.db, organizationId: attachment.organization_id, actorType: "service", filename: attachment.filename, mimeType: attachment.content_type, buffer, sourceType: "email_forwarding", auditAction: "document.received_by_owner_mail", malwareScan: scan });
      documentId = document.documentId;
    }
    await operator.db.from("crm_email_attachments").update({ scan_status: "clean", scanned_at: new Date().toISOString(), document_id: documentId, error_message: null, updated_at: new Date().toISOString() }).eq("id", id);
    await operator.db.from("internal_audit_events").insert({ actor_id: operator.userId, organization_id: attachment.organization_id, action: "crm.email_attachment_scanned", resource_type: "crm_email_message", resource_id: attachment.message_id, safe_metadata: { attachment_id: id, document_id: documentId } });
    return NextResponse.json({ status: "clean", documentId });
  } catch (error) {
    const failure = manageApiError(error);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
