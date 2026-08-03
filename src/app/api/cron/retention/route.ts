import { NextResponse } from "next/server";
import { runRetention } from "@/lib/retention/runner";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isCronAuthorized } from "@/lib/cron/auth";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const result = await runRetention(createServerSupabaseClient());
    return NextResponse.json(result, {
      status: result.status === "completed" ? 200 : 207,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "The retention pass could not be completed." },
      { status: 500 },
    );
  }
}
