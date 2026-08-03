import { NextResponse } from "next/server";
import { retryFailedDocumentExtraction } from "@/lib/documents/retry-extraction";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { cleanUuid } from "@/lib/portal/http";

export const runtime = "nodejs";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const operator = await requireInternalOperator();
    const id = cleanUuid((await params).id);
    if (!id) return NextResponse.json({ error: "Choose a valid document." }, { status: 400 });
    const result = await retryFailedDocumentExtraction({ db: operator.db, documentId: id, actorId: operator.userId });
    if (result.outcome === "not_found")
      return NextResponse.json({ error: "That document no longer exists." }, { status: 404 });
    if (result.outcome === "source_unavailable")
      return NextResponse.json({ error: "The original file is no longer retained, so extraction cannot be retried." }, { status: 410 });
    if (result.outcome === "not_retryable")
      return NextResponse.json({ error: "This document belongs in human review or has already been processed." }, { status: 409 });
    if (result.outcome === "changed")
      return NextResponse.json({ error: "Another operator already started this retry." }, { status: 409 });
    return NextResponse.json({ ok: true, status: result.status, repaired: result.outcome === "reconciled", warning: "warning" in result ? result.warning : null });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
