import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { getSequenceRecoverySnapshot } from "@/lib/manage/sequences/recovery";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { db } = await requireInternalOperator();
    return NextResponse.json(await getSequenceRecoverySnapshot(db), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const result = manageApiError(error);
    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "42P01") {
      return NextResponse.json({ error: "Sequence recovery is unavailable until the production safety migration is applied." }, { status: 503 });
    }
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
