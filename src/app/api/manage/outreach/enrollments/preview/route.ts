import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { getSequence, findSuppression } from "@/lib/manage/sequences/repository";
import { validateSequenceDraft, renderTemplate } from "@/lib/manage/sequences/validation";
import { cleanUuid } from "@/lib/portal/http";

export async function POST(request: Request) {
  try {
    const { db } = await requireInternalOperator();
    const body = await request.json() as Record<string, unknown>;
    const sequenceId = cleanUuid(body.sequenceId); const contactIds = Array.isArray(body.contactIds) ? body.contactIds.map((id) => cleanUuid(id)).filter((id): id is string => Boolean(id)) : [];
    if (!sequenceId || !contactIds.length) return NextResponse.json({ error: "Choose a sequence and at least one contact." }, { status: 400 });
    const sequence = await getSequence(db, sequenceId); if (!sequence) return NextResponse.json({ error: "Sequence not found." }, { status: 404 });
    const validation = validateSequenceDraft(sequence, { forActivation: true }); if (!validation.valid) return NextResponse.json({ error: "This sequence needs attention before preview.", details: validation.errors }, { status: 409 });
    const { data: contacts } = await db.from("crm_contacts").select("id,organization_id,full_name,email,title").in("id", contactIds).eq("organization_id", sequence.organizationId);
    const firstStep = sequence.steps[0];
    const results = await Promise.all((contacts ?? []).map(async (contact) => {
      const suppression = await findSuppression(db, contact.email);
      const [firstName] = contact.full_name.trim().split(/\s+/);
      const variables = { first_name: firstName, full_name: contact.full_name, company_name: "", job_title: contact.title, sender_name: "Costivra team", sender_title: "" };
      return { id: contact.id, fullName: contact.full_name, email: contact.email, blockedReason: suppression ? `Suppressed: ${suppression.reason}.` : null, subject: firstStep?.subjectTemplate ? renderTemplate(firstStep.subjectTemplate, variables) : firstStep?.taskTitleTemplate ? renderTemplate(firstStep.taskTitleTemplate, variables) : "", body: firstStep?.bodyText ? renderTemplate(firstStep.bodyText, variables) : "" };
    }));
    return NextResponse.json({ sequenceId, results });
  } catch (error) { const result = manageApiError(error); return NextResponse.json({ error: result.error }, { status: result.status }); }
}
