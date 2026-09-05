import { NextResponse } from "next/server";
import {
  readTwilioForm,
  validateManageTwilioWebhook,
} from "@/lib/manage/voice-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Receives Trust Hub compliance-profile status changes. The endpoint stores
 * only a small, non-sensitive status snapshot so Manage can show progress.
 */
export async function POST(request: Request) {
  const params = await readTwilioForm(request);
  if (!validateManageTwilioWebhook(request, params)) {
    return NextResponse.json({ error: "Invalid Twilio signature." }, { status: 403 });
  }

  const organizationId = process.env.COSTIVRA_TWILIO_ORGANIZATION_ID?.trim();
  if (!organizationId) {
    return NextResponse.json({ error: "Trust Hub callback is not configured." }, { status: 503 });
  }

  const status = (params.Status || params.ProfileStatus || params.ComplianceProfileStatus || "unknown")
    .trim()
    .slice(0, 40);
  const profileSid = (params.ComplianceProfileSid || params.ProfileSid || "").trim().slice(0, 64);
  const now = new Date().toISOString();
  const db = createServerSupabaseClient();
  const { error } = await db.from("integrations").upsert(
    {
      organization_id: organizationId,
      provider: "twilio_trusthub",
      display_name: "Twilio Trust Hub",
      description: "Primary compliance profile status and verification updates.",
      status,
      last_synced_at: now,
      configuration: { profile_sid: profileSid || null, last_status: status, last_event_at: now },
      updated_at: now,
    },
    { onConflict: "organization_id,provider" },
  );
  if (error) {
    console.error("Trust Hub callback persistence failed.", { reason: error.message });
    return NextResponse.json({ error: "Unable to record Trust Hub status." }, { status: 500 });
  }
  await db.from("internal_notifications").insert({
    organization_id: organizationId,
    kind: "twilio_trusthub_status",
    title: "Twilio Trust Hub updated",
    body: `The primary compliance profile is now ${status}.`,
    resource_type: "integration",
    resource_id: organizationId,
    action_href: "/manage/settings?tab=enrichment",
  });
  return NextResponse.json({ ok: true });
}
