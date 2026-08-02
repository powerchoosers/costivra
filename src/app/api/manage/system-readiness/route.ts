import { NextResponse } from "next/server";
import { manageApiError, requireInternalOwner } from "@/lib/manage/auth";
import { checkSystemReadiness } from "@/lib/manage/system-readiness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    const owner = await requireInternalOwner();
    const readiness = await checkSystemReadiness(owner.db);
    return NextResponse.json(readiness, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
