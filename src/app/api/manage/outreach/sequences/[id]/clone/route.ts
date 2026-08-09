import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { getSequence } from "@/lib/manage/sequences/repository";
import { cleanText, cleanUuid } from "@/lib/portal/http";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const { db, userId } = await requireInternalOperator();
    const sourceId = cleanUuid((await params).id); if (!sourceId) return NextResponse.json({ error: "Invalid sequence." }, { status: 400 });
    const source = await getSequence(db, sourceId); if (!source) return NextResponse.json({ error: "Sequence not found." }, { status: 404 });
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const { data: created, error } = await db.from("crm_sequences").insert({ organization_id: source.organizationId, name: cleanText(body.name, 160) || `${source.name} copy`, description: source.description, owner_id: userId, timezone: source.timezone, business_days: source.businessDays, send_start_local: source.sendStartLocal, send_end_local: source.sendEndLocal, daily_send_limit: source.dailySendLimit, stop_on_reply: true, stop_on_bounce: true, stop_on_unsubscribe: true, stop_company_on_reply: source.stopCompanyOnReply, execution_enabled: false }).select("id").single();
    if (error) throw error;
    if (source.steps.length) {
      const { error: stepError } = await db.from("crm_sequence_steps").insert(source.steps.map((step) => ({ sequence_id: created.id, position: step.position, step_type: step.stepType, delay_value: step.delayValue, delay_unit: step.delayUnit, thread_mode: step.threadMode, subject_template: step.subjectTemplate, body_html: step.bodyHtml, body_text: step.bodyText, task_title_template: step.taskTitleTemplate, task_notes_template: step.taskNotesTemplate, task_priority: step.taskPriority, pause_until_task_complete: step.pauseUntilTaskComplete })));
      if (stepError) throw stepError;
    }
    await db.from("internal_audit_events").insert({ actor_id: userId, organization_id: source.organizationId, action: "crm.sequence_cloned", resource_type: "crm_sequence", resource_id: created.id, safe_metadata: { source_sequence_id: source.id } });
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) { const result = manageApiError(error); return NextResponse.json({ error: result.error }, { status: result.status }); }
}
