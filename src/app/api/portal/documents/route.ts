import { NextResponse } from "next/server";
import { DOCUMENT_MIME_TYPES, MAX_DOCUMENT_SIZE } from "@/lib/documents/intake";
import { ingestManualUpload } from "@/lib/documents/manual-upload";
import { apiError, cleanUuid } from "@/lib/portal/http";
import { requirePortalEditor } from "@/lib/portal/repository";
import { finalizeFreeReviewSlot, prepareFreeReviewBufferClaim } from "@/lib/billing/free-review";
import { sendLifecycleEmailToWorkspace } from "@/lib/email/lifecycle-recipient";
import { getRequestId, safeOperationalError } from "@/lib/observability/request-context";

export const runtime = "nodejs";

function normalizedUploadMimeType(file: File) {
  if (file.type) return file.type.toLowerCase();
  const extension = file.name.toLowerCase().split(".").pop();
  if (extension === "png") return "image/png";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "pdf") return "application/pdf";
  if (extension === "txt") return "text/plain";
  if (extension === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return "application/octet-stream";
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    const { db, organizationId, userId } = await requirePortalEditor();
    const form = await request.formData();
    const file = form.get("file");
    const organizationVendorId = cleanUuid(form.get("organizationVendorId"));
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
    const mimeType = normalizedUploadMimeType(file);
    if (!DOCUMENT_MIME_TYPES.has(mimeType)) return NextResponse.json({ error: "Upload a PDF, DOCX, text, PNG, or JPG document." }, { status: 415 });
    if (file.size <= 0 || file.size > MAX_DOCUMENT_SIZE) return NextResponse.json({ error: "Files must be between 1 byte and 20 MB." }, { status: 413 });
    const buffer = Buffer.from(await file.arrayBuffer());
    const freeReviewBuffer = await prepareFreeReviewBufferClaim(db, organizationId, buffer);
    const freeReviewClaim = freeReviewBuffer.claim;
    if (freeReviewClaim && !freeReviewClaim.allowed) {
        return NextResponse.json({
          error: "Your free three-bill review is complete. Subscribe to keep analyzing bills and unlock ongoing monitoring.",
          code: "FREE_REVIEW_LIMIT_REACHED",
          usage: freeReviewClaim.currentUsage,
          limit: freeReviewClaim.limit,
          upgradeHref: "/pricing?from=free-review",
        }, { status: 409 });
    }
    if (organizationVendorId) {
      const { data: relationship } = await db.from("organization_vendors").select("id").eq("id", organizationVendorId).eq("organization_id", organizationId).maybeSingle();
      if (!relationship) {
        if (freeReviewClaim?.isNewClaim) await finalizeFreeReviewSlot(db, freeReviewClaim.claimId, "released");
        return NextResponse.json({ error: "The selected vendor is not available." }, { status: 404 });
      }
    }

    let result: Awaited<ReturnType<typeof ingestManualUpload>>;
    try {
      result = await ingestManualUpload({
        db,
        organizationId,
        actorId: userId,
        filename: file.name,
        mimeType,
        buffer,
        organizationVendorId: organizationVendorId || null,
        requestId,
      });
      if (freeReviewClaim?.isNewClaim) {
        await finalizeFreeReviewSlot(db, freeReviewClaim.claimId, result.outcome === "processed" || result.outcome === "quarantined" ? "consumed" : "released");
      }
    } catch (error) {
      if (freeReviewClaim?.isNewClaim) await finalizeFreeReviewSlot(db, freeReviewClaim.claimId, "released");
      throw error;
    }
    const scanStatus = result.outcome === "quarantined" ? "quarantined" : result.outcome === "duplicate" ? "duplicate" : result.outcome === "rejected" ? "rejected" : "processing";
    try {
      await sendLifecycleEmailToWorkspace({
        db,
        kind: "upload_received",
        organizationId,
        payload: { documentName: file.name, sourceRecordId: result.documentId ?? `upload:${result.sha256}`, scanStatus, requestId },
      });
      if ("status" in result && result.status === "needs_review") {
        await sendLifecycleEmailToWorkspace({
          db,
          kind: "review_needed",
          organizationId,
          payload: { documentName: file.name, sourceRecordId: `${result.documentId}:review-needed`, requestId },
        });
      }
    } catch {
      console.error(JSON.stringify(safeOperationalError("upload_lifecycle_email_failed", requestId)));
    }
    if (result.outcome === "duplicate") return NextResponse.json({ error: `This file already exists as ${result.originalFilename}.`, documentId: result.documentId }, { status: 409 });
    if (result.outcome === "rejected") return NextResponse.json({ error: result.error }, { status: 422 });
    return NextResponse.json({ ok: true, ...result }, { status: result.outcome === "quarantined" ? 202 : 201 });
  } catch (error) { return apiError(error); }
}
