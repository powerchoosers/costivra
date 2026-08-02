import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPublicSystemStatus } from "@/lib/status/public-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const publicCacheHeaders = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  "X-Content-Type-Options": "nosniff",
};

export async function GET() {
  try {
    const status = await getPublicSystemStatus(createServerSupabaseClient());
    return NextResponse.json(status, { headers: publicCacheHeaders });
  } catch {
    return NextResponse.json(
      {
        error: "Live status is temporarily unavailable.",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  }
}
