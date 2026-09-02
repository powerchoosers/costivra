import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator, requireInternalOwner } from "@/lib/manage/auth";
import { listOwnedVoiceNumbers, purchaseVoiceNumber, searchAvailableVoiceNumbers } from "@/lib/manage/voice-numbers";
import { isTwilioTrialRestriction, VOICE_NUMBER_INVENTORY_UNAVAILABLE } from "@/lib/manage/voice-number";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  try {
    const operator = await requireInternalOperator();
    const url = new URL(request.url);
    if (url.searchParams.get("available") === "1") {
      return NextResponse.json({ numbers: await searchAvailableVoiceNumbers({ areaCode: url.searchParams.get("areaCode") ?? undefined, contains: url.searchParams.get("contains") ?? undefined, region: url.searchParams.get("region") ?? undefined }) }, { headers });
    }
    const numbers = await listOwnedVoiceNumbers(operator.db);
    const { data: staff, error } = await operator.db.from("internal_staff_users").select("user_id,role,status").eq("status", "active");
    if (error) throw error;
    const ids = (staff ?? []).map((row) => row.user_id as string);
    const profiles = ids.length ? await operator.db.from("profiles").select("id,email,full_name").in("id", ids) : { data: [], error: null };
    if (profiles.error) throw profiles.error;
    return NextResponse.json({ numbers, staff: (profiles.data ?? []).map((profile) => ({ id: profile.id, email: profile.email, fullName: profile.full_name ?? profile.email })) }, { headers });
  } catch (error) {
    if (isTwilioTrialRestriction(error)) {
      return NextResponse.json({ error: "Upgrade the Twilio account before searching or purchasing Costivra phone numbers." }, { status: 402, headers });
    }
    if (error instanceof Error && error.message === VOICE_NUMBER_INVENTORY_UNAVAILABLE) {
      return NextResponse.json({ error: "Phone number purchases are waiting for the Costivra voice database migration." }, { status: 503, headers });
    }
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status, headers });
  }
}

export async function POST(request: Request) {
  try {
    const owner = await requireInternalOwner();
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body.phoneNumber !== "string" || typeof body.confirmNumber !== "string") return NextResponse.json({ error: "Select a number and confirm the exact number before purchasing." }, { status: 400, headers });
    const result = await purchaseVoiceNumber({ phoneNumber: body.phoneNumber, confirmNumber: body.confirmNumber, actorId: owner.userId });
    return NextResponse.json({ number: result }, { status: 201, headers });
  } catch (error) {
    if (isTwilioTrialRestriction(error)) {
      return NextResponse.json({ error: "Upgrade the Twilio account before searching or purchasing Costivra phone numbers." }, { status: 402, headers });
    }
    if (error instanceof Error && error.message === VOICE_NUMBER_INVENTORY_UNAVAILABLE) {
      return NextResponse.json({ error: "Phone number purchases are waiting for the Costivra voice database migration." }, { status: 503, headers });
    }
    const result = manageApiError(error);
    const status = error instanceof Error && /Confirm|already|Twilio did|purchased the number/.test(error.message) ? 400 : result.status;
    return NextResponse.json({ error: error instanceof Error && status === 400 ? error.message : result.error }, { status, headers });
  }
}
