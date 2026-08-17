import { NextResponse } from "next/server";
import { apiError, cleanText } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";
import { ingestManualUpload } from "@/lib/documents/manual-upload";
import { finalizeFreeReviewSlot, prepareFreeReviewBufferClaim } from "@/lib/billing/free-review";

export async function POST(request: Request) {
  try {
    const { db, organizationId, userId, role } = await requirePortalContext();

    if (!["owner", "admin", "member"].includes(role)) {
      return NextResponse.json(
        { error: "Viewers cannot upload chat attachments." },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing or invalid file field." },
        { status: 400 },
      );
    }

    const clientUploadId = cleanText(formData.get("clientUploadId"), 100) || crypto.randomUUID();
    const vendorRelationshipId = cleanText(formData.get("vendorRelationshipId"), 100) || undefined;

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

    let result: Awaited<ReturnType<typeof ingestManualUpload>>;
    try {
      result = await ingestManualUpload({
        db,
        organizationId,
        actorId: userId,
        filename: file.name,
        mimeType: file.type || "application/pdf",
        buffer,
        organizationVendorId: vendorRelationshipId,
      });
      if (freeReviewClaim?.isNewClaim) {
        await finalizeFreeReviewSlot(
          db,
          freeReviewClaim.claimId,
          result.outcome === "processed" || result.outcome === "quarantined" ? "consumed" : "released",
        );
      }
    } catch (error) {
      if (freeReviewClaim?.isNewClaim) await finalizeFreeReviewSlot(db, freeReviewClaim.claimId, "released");
      throw error;
    }

    const invoiceId = "invoiceId" in result ? result.invoiceId : null;
    const vendorMatchStatus = "vendorMatchStatus" in result ? result.vendorMatchStatus : null;
    const reviewStatus = "reviewStatus" in result ? result.reviewStatus : null;

    return NextResponse.json({
      clientUploadId,
      documentId: result.documentId ?? null,
      outcome: result.outcome,
      status: result.status ?? null,
      warning: result.warning ?? null,
      invoiceId: invoiceId ?? null,
      vendorMatchStatus: vendorMatchStatus ?? null,
      reviewStatus: reviewStatus ?? null,
    });
  } catch (error) {
    return apiError(error);
  }
}
