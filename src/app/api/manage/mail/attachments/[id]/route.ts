import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { requireMailbox } from "@/lib/manage/mailbox-access";
import { cleanUuid } from "@/lib/portal/http";

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
