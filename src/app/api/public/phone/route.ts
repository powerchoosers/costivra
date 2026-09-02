import { NextResponse } from "next/server";
import { getPublicMainVoiceNumber } from "@/lib/manage/voice-numbers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const phoneNumber = await getPublicMainVoiceNumber();
  return NextResponse.json({ phoneNumber }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
}
