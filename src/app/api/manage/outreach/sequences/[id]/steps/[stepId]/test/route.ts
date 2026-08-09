import { NextResponse } from "next/server";
import { manageApiError, requireVerifiedInternalOperator } from "@/lib/manage/auth";
import { emailHtmlToText, isValidEmail, sanitizeEmailHtml } from "@/lib/manage/mail";
import { sendOutboundEmail } from "@/lib/manage/outbound-email";
import { appendEmailSignatureHtml } from "@/lib/manage/email-signature";
import { cleanUuid } from "@/lib/portal/http";
import { renderTemplate } from "@/lib/manage/sequences/validation";

type Context = { params: Promise<{ id: string; stepId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const { db, userId, email, fullName } = await requireVerifiedInternalOperator();
    const { id, stepId } = await params;
    const sequenceId = cleanUuid(id);
    const sequenceStepId = cleanUuid(stepId);
    if (!sequenceId || !sequenceStepId) return NextResponse.json({ error: "Invalid sequence step." }, { status: 400 });
    if (!isValidEmail(email)) return NextResponse.json({ error: "Your operator email is not valid for a test send." }, { status: 403 });
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const requestId = typeof body.testRequestId === "string" ? body.testRequestId.trim().slice(0, 100) : "";
    if (!requestId) return NextResponse.json({ error: "A unique test request ID is required." }, { status: 400 });

    const [{ data: sequence, error: sequenceError }, { data: step, error: stepError }, { data: mailbox, error: mailboxError }, { data: ownerProfile, error: ownerError }] = await Promise.all([
      db.from("crm_sequences").select("id,organization_id,status").eq("id", sequenceId).maybeSingle(),
      db.from("crm_sequence_steps").select("id,sequence_id,step_type,thread_mode,subject_template,body_html,body_text,task_title_template,task_notes_template").eq("id", sequenceStepId).eq("sequence_id", sequenceId).maybeSingle(),
      db.from("crm_mailboxes").select("id,address,display_name,status,can_send,mailbox_type,assigned_to").eq("address", email).maybeSingle(),
      db.from("profiles").select("full_name,job_title,phone,linkedin_url").eq("id", userId).maybeSingle(),
    ]);
    if (sequenceError) throw sequenceError;
    if (stepError) throw stepError;
    if (mailboxError) throw mailboxError;
    if (ownerError) throw ownerError;
    if (!sequence) return NextResponse.json({ error: "Sequence not found." }, { status: 404 });
    if (sequence.status !== "draft") return NextResponse.json({ error: "Test sends are available only while editing a draft." }, { status: 409 });
    if (!step) return NextResponse.json({ error: "Sequence step not found." }, { status: 404 });
    if (!mailbox || mailbox.status !== "active" || mailbox.can_send !== true || mailbox.mailbox_type !== "personal" || mailbox.assigned_to !== userId) return NextResponse.json({ error: "Your verified operator mailbox is not available for test sends." }, { status: 403 });
    if (step.step_type !== "manual_email" && step.step_type !== "automatic_email") return NextResponse.json({ error: "Only email steps can send a test." }, { status: 400 });

    const ownerName = ownerProfile?.full_name || fullName || "Costivra";
    const variables = { first_name: "Jordan", full_name: "Jordan Lee", company_name: "Northstar Foods", job_title: "Controller", industry: "Food distribution", website: "northstar.example", sender_name: ownerName, sender_title: ownerProfile?.job_title || "" };
    const subject = renderTemplate(typeof step.subject_template === "string" ? step.subject_template : "", variables).trim().slice(0, 500);
    const renderedHtml = typeof step.body_html === "string" ? sanitizeEmailHtml(renderTemplate(step.body_html, variables)) : null;
    const renderedText = typeof step.body_text === "string" ? renderTemplate(step.body_text, variables).trim() : emailHtmlToText(renderedHtml ?? "");
    if (!subject || !renderedText) return NextResponse.json({ error: "Add a subject and message before sending a test." }, { status: 400 });
    const html = renderedHtml && ownerProfile ? appendEmailSignatureHtml(renderedHtml, { fullName: ownerName, jobTitle: ownerProfile.job_title ?? null, phone: ownerProfile.phone ?? null, linkedinUrl: ownerProfile.linkedin_url ?? null }) : renderedHtml;
    const result = await sendOutboundEmail({
      db,
      organizationId: sequence.organization_id,
      actorId: userId,
      mailbox: { id: mailbox.id, address: mailbox.address, sender: mailbox.display_name ? `${mailbox.display_name} <${mailbox.address}>` : mailbox.address },
      contactId: null,
      to: [email],
      subject: `[Test] ${subject}`.slice(0, 500),
      textBody: renderedText,
      htmlBody: html,
      idempotencyKey: `sequence-test:${userId}:${sequenceStepId}:${requestId}`,
      authorizationMethod: "sequence_test_send_current_operator",
      origin: "manual",
    });
    return NextResponse.json({ ok: true, providerId: result.providerId, messageId: result.messageId, duplicate: Boolean(result.duplicate), sample: { fullName: "Jordan Lee", companyName: "Northstar Foods" } });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
