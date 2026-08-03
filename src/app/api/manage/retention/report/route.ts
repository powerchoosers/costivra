import { NextResponse } from "next/server";
import { manageApiError, requireInternalOwner } from "@/lib/manage/auth";
import { retentionPolicyFromEnvironment } from "@/lib/retention/policy";
import { runRetention } from "@/lib/retention/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const privateHeaders = { "Cache-Control": "private, no-store" };

export async function POST() {
  try {
    const owner = await requireInternalOwner();
    const policy = retentionPolicyFromEnvironment();
    const result = await runRetention(owner.db, {
      policy: { ...policy, enforce: false },
    });
    return NextResponse.json(result, { headers: privateHeaders });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json(
      { error: result.error },
      { status: result.status, headers: privateHeaders },
    );
  }
}
