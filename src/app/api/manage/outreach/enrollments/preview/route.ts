import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { getSequence, findOutreachBlock } from "@/lib/manage/sequences/repository";
import { validateSequenceDraft, renderTemplate, sanitizeSequencePersonalizationMap } from "@/lib/manage/sequences/validation";
import { cleanUuid } from "@/lib/portal/http";

export async function POST(request: Request) {
  try {
    const { db } = await requireInternalOperator();
    const body = await request.json() as Record<string, unknown>;
    const sequenceId = cleanUuid(body.sequenceId); const contactIds = Array.isArray(body.contactIds) ? body.contactIds.map((id) => cleanUuid(id)).filter((id): id is string => Boolean(id)) : [];
    const personalizationByContact = sanitizeSequencePersonalizationMap(body.personalization);
    if (!sequenceId || !contactIds.length) return NextResponse.json({ error: "Choose a sequence and at least one contact." }, { status: 400 });
    const sequence = await getSequence(db, sequenceId); if (!sequence) return NextResponse.json({ error: "Sequence not found." }, { status: 404 });
    if (sequence.status !== "draft") return NextResponse.json({ error: "Only draft sequences may be previewed in this packet." }, { status: 409 });
    const validation = validateSequenceDraft(sequence, { forActivation: true }); if (!validation.valid) return NextResponse.json({ error: "This sequence needs attention before preview.", details: validation.errors }, { status: 409 });
    const [{ data: contacts, error: contactsError }, { data: existingEnrollments, error: enrollmentError }] = await Promise.all([
      db.from("crm_contacts").select("id,organization_id,full_name,email,title,organization:organizations(name),status").in("id", contactIds).eq("organization_id", sequence.organizationId),
      db.from("crm_sequence_enrollments").select("contact_id,state").in("contact_id", contactIds).not("state", "in", "(replied,bounced,unsubscribed,stopped,completed,failed)"),
    ]);
    if (contactsError) throw contactsError;
    if (enrollmentError) throw enrollmentError;
    const contactsById = new Map((contacts ?? []).map((contact) => [contact.id, contact]));
    const existingByContact = new Map((existingEnrollments ?? []).map((enrollment) => [enrollment.contact_id, enrollment.state]));
    const firstStep = sequence.steps[0];
    const results = await Promise.all(contactIds.map(async (contactId) => {
      const contact = contactsById.get(contactId);
      if (!contact) return { id: contactId, fullName: "Unknown contact", email: "", blockedReason: "Contact was not found in this account.", subject: "", body: "" };
      const [firstName] = contact.full_name.trim().split(/\s+/);
      const organization = contact.organization as { name?: string } | null;
      const variables = { first_name: firstName, full_name: contact.full_name, company_name: organization?.name ?? "", job_title: contact.title, industry: "", website: "", sender_name: "Costivra team", sender_title: "", ...personalizationByContact[contact.id] };
      const outreachBlock = contact.status === "active"
        ? await findOutreachBlock(db, { contactId: contact.id, email: contact.email })
        : null;
      const blockedReason = contact.status !== "active"
        ? `Contact status is ${contact.status}.`
        : outreachBlock
          ? outreachBlock.reason
          : existingByContact.has(contact.id)
            ? `Already enrolled in another active sequence (${existingByContact.get(contact.id)}).`
            : null;
      return { id: contact.id, fullName: contact.full_name, email: contact.email, blockedReason, personalization: personalizationByContact[contact.id] ?? {}, subject: firstStep?.subjectTemplate ? renderTemplate(firstStep.subjectTemplate, variables) : firstStep?.taskTitleTemplate ? renderTemplate(firstStep.taskTitleTemplate, variables) : "", body: firstStep?.bodyText ? renderTemplate(firstStep.bodyText, variables) : "" };
    }));
    return NextResponse.json({ sequenceId, results });
  } catch (error) { const result = manageApiError(error); return NextResponse.json({ error: result.error }, { status: result.status }); }
}
