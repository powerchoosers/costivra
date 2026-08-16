import { NextResponse } from "next/server";
import { apiError, cleanUuid } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";
import { generateReport } from "@/lib/reports/generate-report";
import { renderReportEmail } from "@/lib/reports/render-report-email";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { emailRequestHash } from "@/lib/email/resend";
import { claimExternalSideEffect } from "@/lib/email/side-effect-claim";
import { getRequestId } from "@/lib/observability/request-context";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request);
  try {
    const { db, organizationId, userId } = await requirePortalContext();
    const id = cleanUuid((await params).id);
    const { data: definition, error } = await db.from("report_definitions").select("id,name,description,report_type,organization_id").eq("id", id).eq("organization_id", organizationId).maybeSingle();
    if (error) throw error;
    if (!definition) return NextResponse.json({ error: "Report not found." }, { status: 404 });
    const { data: profile } = await db.from("profiles").select("email").eq("id", userId).maybeSingle();
    if (!profile?.email) return NextResponse.json({ error: "Your profile does not have an email address." }, { status: 409 });
    const report = await generateReport(db, definition); const rendered = renderReportEmail(report);
    const recipientEmail = profile.email.trim().toLowerCase();
    const idempotencyKey = `report-now/${organizationId}/${id}/${new Date().toISOString().slice(0, 10)}/${userId}`;
    const requestHash = emailRequestHash({ to: recipientEmail, subject: `${definition.name} is ready`, text: rendered.text, html: rendered.html });
    const now = new Date().toISOString();
    const { data: deliveryRun, error: deliveryRunError } = await db
      .from("report_delivery_runs")
      .upsert({
        organization_id: organizationId,
        report_definition_id: id,
        report_schedule_id: null,
        scheduled_for: now,
        status: "claimed",
        generated_at: report.generatedAt,
        delivery_key: idempotencyKey,
      }, { onConflict: "delivery_key" })
      .select("id,status,external_side_effect_id,provider_message_id")
      .single();
    if (deliveryRunError || !deliveryRun) throw deliveryRunError ?? new Error("REPORT_DELIVERY_RUN_CREATE_FAILED");
    const { data: deliveryRecipient, error: deliveryRecipientError } = await db
      .from("report_delivery_recipients")
      .upsert({
        delivery_run_id: deliveryRun.id,
        organization_id: organizationId,
        recipient_email: recipientEmail,
        idempotency_key: idempotencyKey,
        status: "pending",
      }, { onConflict: "idempotency_key" })
      .select("id,status,external_side_effect_id,provider_message_id")
      .single();
    if (deliveryRecipientError || !deliveryRecipient) throw deliveryRecipientError ?? new Error("REPORT_DELIVERY_RECIPIENT_CREATE_FAILED");
    const claim = await claimExternalSideEffect(db, {
      organizationId,
      type: "report_email",
      destination: recipientEmail,
      idempotencyKey,
      requestHash,
      actorId: userId,
      authorizationMethod: "portal_report_email_now_v1",
      sanitizedRequestMetadata: { report_definition_id: id, recipient_user_id: userId, request_id: requestId },
    });
    if (!claim.claimed) {
      if (claim.duplicate) {
        const status = claim.status === "delivered" ? "delivered" : claim.status === "sent" || claim.status === "accepted" ? "accepted" : "claimed";
        const completedAt = status === "claimed" ? null : now;
        await db.from("report_delivery_recipients").update({
          status,
          external_side_effect_id: claim.id ?? deliveryRecipient.external_side_effect_id,
          provider_message_id: claim.providerReference ?? deliveryRecipient.provider_message_id,
          completed_at: completedAt,
          updated_at: now,
        }).eq("id", deliveryRecipient.id);
        await db.from("report_delivery_runs").update({
          status,
          external_side_effect_id: claim.id ?? deliveryRun.external_side_effect_id,
          provider_message_id: claim.providerReference ?? deliveryRun.provider_message_id,
          completed_at: completedAt,
          updated_at: now,
        }).eq("id", deliveryRun.id);
        return NextResponse.json({ ok: true, duplicate: true, providerMessageId: claim.providerReference });
      }
      throw new Error(claim.error);
    }
    await db.from("report_delivery_recipients").update({ status: "claimed", external_side_effect_id: claim.id, updated_at: now }).eq("id", deliveryRecipient.id);
    await db.from("report_delivery_runs").update({ status: "claimed", external_side_effect_id: claim.id, updated_at: now }).eq("id", deliveryRun.id);
    const result = await sendTransactionalEmail({ to: recipientEmail, subject: `${definition.name} is ready`, text: rendered.text, html: rendered.html, idempotencyKey });
    await db.from("external_side_effects").update(result.ok ? { status: "sent", provider_reference: result.providerId, completed_at: now, updated_at: now } : { status: "failed", last_error: result.error, updated_at: now }).eq("id", claim.id);
    if (!result.ok) {
      await db.from("report_delivery_recipients").update({ status: "failed", safe_error: result.error, completed_at: now, updated_at: now }).eq("id", deliveryRecipient.id);
      await db.from("report_delivery_runs").update({ status: "failed", safe_error: "REPORT_EMAIL_SEND_FAILED", completed_at: now, updated_at: now }).eq("id", deliveryRun.id);
      return NextResponse.json({ error: "The report could not be sent." }, { status: 502 });
    }
    await db.from("report_delivery_recipients").update({ status: "accepted", provider_message_id: result.providerId, sent_at: now, completed_at: now, updated_at: now }).eq("id", deliveryRecipient.id);
    await db.from("report_delivery_runs").update({ status: "accepted", provider_message_id: result.providerId, completed_at: now, updated_at: now }).eq("id", deliveryRun.id);
    return NextResponse.json({ ok: true, providerMessageId: result.providerId });
  } catch (error) { return apiError(error); }
}
