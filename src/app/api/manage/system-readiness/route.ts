import { NextResponse } from "next/server";
import { manageApiError, requireInternalOwner } from "@/lib/manage/auth";
import { checkSystemReadiness } from "@/lib/manage/system-readiness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const privateHeaders = { "Cache-Control": "private, no-store" };

export async function GET() {
  try {
    const owner = await requireInternalOwner();
    // Dashboard reads must not consume a billable/provider-limited scanner
    // request. Explicit probes run through the dedicated ops verifier.
    const readiness = await checkSystemReadiness(owner.db, { runLiveMalwareProbe: false });
    return NextResponse.json(readiness, {
      headers: privateHeaders,
    });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json(
      { error: result.error },
      { status: result.status, headers: privateHeaders },
    );
  }
}
