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
    const jobTitle = optionalField(body?.jobTitle, 120);
    const phone = optionalField(body?.phone, 48);
    const linkedinInput = optionalField(body?.linkedinUrl, 320);
    const linkedinUrl = linkedinInput ? normalizeLinkedInUrl(linkedinInput) : null;
    if (linkedinInput && !linkedinUrl)
      return NextResponse.json(
        { error: "Use a full https://linkedin.com/... profile link." },
        { status: 400 },
      );

    const { error } = await operator.db
      .from("profiles")
      .update({
        job_title: jobTitle,
        phone,
        linkedin_url: linkedinUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", operator.userId);
    if (error) throw error;
    const { error: auditError } = await operator.db.from("internal_audit_events").insert({
      actor_id: operator.userId,
      organization_id: null,
      action: "profile.email_signature_updated",
      resource_type: "profile",
      resource_id: operator.userId,
      safe_metadata: {
        job_title_present: Boolean(jobTitle),
        phone_present: Boolean(phone),
        linkedin_present: Boolean(linkedinUrl),
      },
    });
    if (auditError) throw auditError;
    return NextResponse.json({ ok: true });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
