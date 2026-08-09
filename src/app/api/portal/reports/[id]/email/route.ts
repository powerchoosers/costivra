import { NextResponse } from "next/server";
import { apiError, cleanUuid } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";
import { generateReport } from "@/lib/reports/generate-report";
import { renderReportEmail } from "@/lib/reports/render-report-email";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { emailRequestHash } from "@/lib/email/resend";

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
    const requestHash = emailRequestHash({ to: profile.email, subject: `${definition.name} is ready`, text: rendered.text });
    const { data: existing } = await db.from("external_side_effects").select("provider_reference,status").eq("organization_id", organizationId).eq("idempotency_key", idempotencyKey).maybeSingle();
    if (existing) return NextResponse.json({ ok: true, duplicate: true, providerMessageId: existing.provider_reference });
    const { error: ledgerError } = await db.from("external_side_effects").insert({ organization_id: organizationId, type: "report_email", destination: profile.email, idempotency_key: idempotencyKey, request_hash: requestHash, status: "approved", provider: "resend", actor_id: userId, authorized_at: new Date().toISOString(), authorization_method: "portal_report_email_now_v1", sanitized_request_metadata: { report_definition_id: id, recipient_user_id: userId } });
    if (ledgerError) throw ledgerError;
    const result = await sendTransactionalEmail({ to: profile.email, subject: `${definition.name} is ready`, text: rendered.text, html: rendered.html, idempotencyKey });
    await db.from("external_side_effects").update(result.ok ? { status: "sent", provider_reference: result.providerId, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() } : { status: "failed", last_error: result.error, updated_at: new Date().toISOString() }).eq("idempotency_key", idempotencyKey);
    if (!result.ok) return NextResponse.json({ error: "The report could not be sent." }, { status: 502 });
    return NextResponse.json({ ok: true, providerMessageId: result.providerId });
  } catch (error) { return apiError(error); }
}
