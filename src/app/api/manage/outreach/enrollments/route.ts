import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { listEnrollments, findOutreachBlock } from "@/lib/manage/sequences/repository";
import { validateSequenceDraft, sanitizeSequencePersonalizationMap } from "@/lib/manage/sequences/validation";
import { canUseSequenceMailbox } from "@/lib/manage/sequences/mailbox-policy";
import { getSequence } from "@/lib/manage/sequences/repository";
import { cleanUuid } from "@/lib/portal/http";

const privateHeaders = { "Cache-Control": "private, no-store" };

export async function GET() {
  try { const { db } = await requireInternalOperator(); return NextResponse.json({ enrollments: await listEnrollments(db) }, { headers: privateHeaders }); }
  catch (error) { const result = manageApiError(error); return NextResponse.json({ error: result.error }, { status: result.status }); }
}

export async function POST(request: Request) {
  try {
    const { db, userId } = await requireInternalOperator();
    const body = await request.json() as Record<string, unknown>;
    const sequenceId = cleanUuid(body.sequenceId); const mailboxId = cleanUuid(body.mailboxId);
    const contactIds = Array.isArray(body.contactIds) ? [...new Set(body.contactIds.map((id) => cleanUuid(id)).filter((id): id is string => Boolean(id)))] : [];
    const personalizationByContact = sanitizeSequencePersonalizationMap(body.personalization);
    if (!sequenceId || !mailboxId || !contactIds.length) return NextResponse.json({ error: "Choose a sequence, sender mailbox, and at least one contact." }, { status: 400 });
    const sequence = await getSequence(db, sequenceId);
    if (!sequence) return NextResponse.json({ error: "Sequence not found." }, { status: 404 });
    const validation = validateSequenceDraft(sequence, { forActivation: true });
    if (!validation.valid) return NextResponse.json({ error: "This sequence needs attention before enrollment.", details: validation.errors }, { status: 409 });
    if (sequence.status !== "draft") return NextResponse.json({ error: "Only draft sequences may create pending enrollments in this packet." }, { status: 409 });
    const { data: mailbox } = await db.from("crm_mailboxes").select("id,address,status,can_send,assigned_to,mailbox_type").eq("id", mailboxId).maybeSingle();
    const mailboxAvailable = mailbox && canUseSequenceMailbox(userId, {
      status: mailbox.status,
      canSend: mailbox.can_send,
      mailboxType: mailbox.mailbox_type,
      assignedTo: mailbox.assigned_to,
    });
    if (!mailboxAvailable) return NextResponse.json({ error: "That sender mailbox is not available to you." }, { status: 403 });
    const { data: contacts } = await db.from("crm_contacts").select("id,organization_id,email,status").in("id", contactIds).eq("organization_id", sequence.organizationId);
    const eligible: string[] = []; const blocked: Array<{ id: string; reason: string }> = [];
    const foundContactIds = new Set((contacts ?? []).map((contact) => contact.id));
    for (const contactId of contactIds) if (!foundContactIds.has(contactId)) blocked.push({ id: contactId, reason: "Contact was not found in this account." });
    for (const contact of contacts ?? []) {
      if (contact.status !== "active") blocked.push({ id: contact.id, reason: `Contact status is ${contact.status}.` });
      else {
        const block = await findOutreachBlock(db, { contactId: contact.id, email: contact.email });
        if (block) blocked.push({ id: contact.id, reason: block.reason });
        else eligible.push(contact.id);
      }
    }
    if (!eligible.length) return NextResponse.json({ error: "No selected contacts are eligible.", blocked }, { status: 409 });
    const rows = eligible.map((contactId) => ({ sequence_id: sequenceId, organization_id: sequence.organizationId, contact_id: contactId, mailbox_id: mailboxId, enrolled_by: userId, state: "pending", current_step_position: 0, personalization: personalizationByContact[contactId] ?? {} }));
    const { data, error } = await db.from("crm_sequence_enrollments").insert(rows).select("id,contact_id");
    if (error?.code === "23505") return NextResponse.json({ error: "At least one contact already has an active enrollment in another sequence.", blocked }, { status: 409 });
    if (error) throw error;
    if (data?.length) await db.from("crm_sequence_events").insert(data.map((row) => ({ sequence_id: sequenceId, enrollment_id: row.id, event_type: "enrolled", safe_metadata: { state: "pending" } })));
    return NextResponse.json({ created: data?.length ?? 0, blocked }, { status: 201 });
  } catch (error) { const result = manageApiError(error); return NextResponse.json({ error: result.error }, { status: result.status }); }
}
