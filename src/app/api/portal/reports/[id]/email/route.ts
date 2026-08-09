import { NextResponse } from "next/server";
import { apiError, cleanUuid } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";
import { generateReport } from "@/lib/reports/generate-report";
import { renderReportEmail } from "@/lib/reports/render-report-email";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { emailRequestHash } from "@/lib/email/resend";
import { claimExternalSideEffect } from "@/lib/email/side-effect-claim";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { db, organizationId, userId } = await requirePortalContext();
    const id = cleanUuid((await params).id);
    const { data: definition, error } = await db.from("report_definitions").select("id,name,description,report_type,organization_id").eq("id", id).eq("organization_id", organizationId).maybeSingle();
    if (error) throw error;
    if (!definition) return NextResponse.json({ error: "Report not found." }, { status: 404 });
    const { data: profile } = await db.from("profiles").select("email").eq("id", userId).maybeSingle();
    if (!profile?.email) return NextResponse.json({ error: "Your profile does not have an email address." }, { status: 409 });
    const report = await generateReport(db, definition); const rendered = renderReportEmail(report);
    const idempotencyKey = `report-now/${organizationId}/${id}/${new Date().toISOString().slice(0, 10)}/${userId}`;
    const requestHash = emailRequestHash({ to: profile.email, subject: `${definition.name} is ready`, text: rendered.text, html: rendered.html });
    const claim = await claimExternalSideEffect(db, {
      organizationId,
      type: "report_email",
      destination: profile.email,
      idempotencyKey,
      requestHash,
      actorId: userId,
      authorizationMethod: "portal_report_email_now_v1",
      sanitizedRequestMetadata: { report_definition_id: id, recipient_user_id: userId },
    });
    if (!claim.claimed) {
      if (claim.duplicate) return NextResponse.json({ ok: true, duplicate: true, providerMessageId: claim.providerReference });
      throw new Error(claim.error);
    }
    const result = await sendTransactionalEmail({ to: profile.email, subject: `${definition.name} is ready`, text: rendered.text, html: rendered.html, idempotencyKey });
    await db.from("external_side_effects").update(result.ok ? { status: "sent", provider_reference: result.providerId, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() } : { status: "failed", last_error: result.error, updated_at: new Date().toISOString() }).eq("id", claim.id);
    if (!result.ok) return NextResponse.json({ error: "The report could not be sent." }, { status: 502 });
    return NextResponse.json({ ok: true, providerMessageId: result.providerId });
  } catch (error) { return apiError(error); }
}
