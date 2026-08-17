import { NextResponse } from "next/server";
import { apiError } from "@/lib/portal/http";
import { getFreeReviewStatus } from "@/lib/billing/free-review";
import { requirePortalContext } from "@/lib/portal/repository";

export async function GET() {
  try {
    const { db, organizationId } = await requirePortalContext();
    const freeReview = await getFreeReviewStatus(db, organizationId);
    return NextResponse.json({ freeReview }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
