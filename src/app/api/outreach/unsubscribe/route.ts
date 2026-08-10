import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { processSequenceUnsubscribe } from "@/lib/manage/sequences/unsubscribe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resultStatus(status: string) {
  return status === "invalid" || status === "expired" ? 410 : 200;
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  try {
    const result = await processSequenceUnsubscribe(createServerSupabaseClient(), token);
    const ok = result.status === "applied" || result.status === "idempotent";
    return new Response(`<!doctype html><title>${ok ? "Unsubscribed" : "Link expired"}</title><main style="font-family:system-ui;max-width:38rem;margin:5rem auto;padding:1.5rem"><h1>${ok ? "You’re unsubscribed" : "This link is no longer valid"}</h1><p>${ok ? "Future Costivra outreach to this address has been stopped." : "Please contact the sender if you still need help."}</p></main>`, { status: resultStatus(result.status), headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
  } catch {
    return new Response("Unable to process this request.", { status: 500 });
  }
}

export async function POST(request: Request) {
  let token = new URL(request.url).searchParams.get("token") ?? "";
  try {
    const body = await request.json().catch(() => null) as { token?: string } | null;
    token = body?.token || token;
  } catch { /* query token is still supported */ }
  try {
    const result = await processSequenceUnsubscribe(createServerSupabaseClient(), token);
    return NextResponse.json(result, { status: resultStatus(result.status), headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to process this request." }, { status: 500 });
  }
}
