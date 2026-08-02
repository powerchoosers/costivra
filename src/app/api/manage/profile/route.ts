import { NextResponse } from "next/server";
import { normalizeLinkedInUrl } from "@/lib/manage/email-signature";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { cleanText } from "@/lib/portal/http";

function optionalField(value: unknown, maxLength: number) {
  return cleanText(value, maxLength) || null;
}

export async function PATCH(request: Request) {
  try {
    const operator = await requireInternalOperator();
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body)
      return NextResponse.json({ error: "Add the profile setting to update." }, { status: 400 });
    const hasSignatureFields = ["jobTitle", "phone", "linkedinUrl"].some((field) =>
      Object.prototype.hasOwnProperty.call(body, field),
    );
    const hasSoundPreference = Object.prototype.hasOwnProperty.call(
      body,
      "notificationSoundEnabled",
    );
    if (!hasSignatureFields && !hasSoundPreference)
      return NextResponse.json({ error: "Add the profile setting to update." }, { status: 400 });
    const jobTitle = optionalField(body.jobTitle, 120);
    const phone = optionalField(body.phone, 48);
    const linkedinInput = optionalField(body.linkedinUrl, 320);
    const linkedinUrl = linkedinInput ? normalizeLinkedInUrl(linkedinInput) : null;
    if (linkedinInput && !linkedinUrl)
      return NextResponse.json(
        { error: "Use a full https://linkedin.com/... profile link." },
        { status: 400 },
      );

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (hasSignatureFields) {
      updates.job_title = jobTitle;
      updates.phone = phone;
      updates.linkedin_url = linkedinUrl;
    }
    if (hasSoundPreference) {
      if (typeof body.notificationSoundEnabled !== "boolean")
        return NextResponse.json(
          { error: "Choose whether notification sounds are on or off." },
          { status: 400 },
        );
      updates.notification_sound_enabled = body.notificationSoundEnabled;
    }
    const { error } = await operator.db
      .from("profiles")
      .update(updates)
      .eq("id", operator.userId);
    if (error) throw error;
    const { error: auditError } = await operator.db.from("internal_audit_events").insert({
      actor_id: operator.userId,
      organization_id: null,
      action: hasSoundPreference && !hasSignatureFields
        ? "profile.notification_preferences_updated"
        : "profile.email_signature_updated",
      resource_type: "profile",
      resource_id: operator.userId,
      safe_metadata: {
        job_title_present: Boolean(jobTitle),
        phone_present: Boolean(phone),
        linkedin_present: Boolean(linkedinUrl),
        notification_sound_enabled:
          hasSoundPreference ? body.notificationSoundEnabled : undefined,
      },
    });
    if (auditError) throw auditError;
    return NextResponse.json({ ok: true });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
