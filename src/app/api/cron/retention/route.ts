import { NextResponse } from "next/server";
import { runRetention } from "@/lib/retention/runner";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isCronAuthorized } from "@/lib/cron/auth";
import { getRequestId, withRequestId } from "@/lib/observability/request-context";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  if (!isCronAuthorized(request)) {
    return withRequestId(NextResponse.json({ error: "Unauthorized." }, { status: 401 }), requestId);
  }
  try {
    const result = await runRetention(createServerSupabaseClient());
    return withRequestId(NextResponse.json(result, {
      status: result.status === "completed" ? 200 : 207,
      headers: { "Cache-Control": "private, no-store" },
    }), requestId);
  } catch {
    return withRequestId(NextResponse.json(
      { error: "The retention pass could not be completed." },
      { status: 500 },
    ), requestId);
  }
}
