import { NextResponse } from "next/server";
import { apiError, cleanText } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";
import { ingestManualUpload } from "@/lib/documents/manual-upload";

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

    // Execute core document intake
    const result = await ingestManualUpload({
      db,
      organizationId,
      actorId: userId,
      filename: file.name,
      mimeType: file.type || "application/pdf",
      buffer,
      organizationVendorId: vendorRelationshipId,
    });

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
