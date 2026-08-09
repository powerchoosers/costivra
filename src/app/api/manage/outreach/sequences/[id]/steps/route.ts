import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { cleanText, cleanUuid } from "@/lib/portal/http";
import { sanitizeSequenceStep } from "@/lib/manage/sequences/validation";
import type { SequenceDelayUnit, SequenceStepType } from "@/lib/manage/sequences/types";

type Context = { params: Promise<{ id: string }> };
const types = new Set(["manual_email", "automatic_email", "call_task", "general_task"]);
const units = new Set(["minutes", "hours", "business_days", "calendar_days"]);

export async function POST(request: Request, { params }: Context) {
  try {
    const { db, userId } = await requireInternalOperator();
    const sequenceId = cleanUuid((await params).id); if (!sequenceId) return NextResponse.json({ error: "Invalid sequence." }, { status: 400 });
    const body = await request.json() as Record<string, unknown>;
    const { data: sequence } = await db.from("crm_sequences").select("id,status").eq("id", sequenceId).maybeSingle();
    if (!sequence) return NextResponse.json({ error: "Sequence not found." }, { status: 404 });
    if (sequence.status !== "draft") return NextResponse.json({ error: "Only draft sequences can be edited." }, { status: 409 });
    const { data: last } = await db.from("crm_sequence_steps").select("position").eq("sequence_id", sequenceId).order("position", { ascending: false }).limit(1).maybeSingle();
    const stepType = cleanText(body.stepType, 30); if (!types.has(stepType)) return NextResponse.json({ error: "Unsupported sequence step." }, { status: 400 });
    const delayValue = typeof body.delayValue === "number" && body.delayValue >= 0 ? Math.trunc(body.delayValue) : 0;
    const delayUnit = cleanText(body.delayUnit, 30) || "business_days"; if (!units.has(delayUnit)) return NextResponse.json({ error: "Unsupported delay unit." }, { status: 400 });
    const position = (last?.position ?? 0) + 1;
    const sanitized = sanitizeSequenceStep({ stepType: stepType as SequenceStepType, position, delayValue: position === 1 ? 0 : delayValue, delayUnit: delayUnit as SequenceDelayUnit, threadMode: body.threadMode === "reply_to_previous" ? "reply_to_previous" : body.threadMode === "new_thread" ? "new_thread" : null, subjectTemplate: typeof body.subjectTemplate === "string" ? body.subjectTemplate : null, bodyHtml: typeof body.bodyHtml === "string" ? body.bodyHtml : null, bodyText: typeof body.bodyText === "string" ? body.bodyText : null, taskTitleTemplate: typeof body.taskTitleTemplate === "string" ? body.taskTitleTemplate : null, taskNotesTemplate: typeof body.taskNotesTemplate === "string" ? body.taskNotesTemplate : null, taskPriority: ["low", "normal", "high"].includes(String(body.taskPriority)) ? String(body.taskPriority) as "low" | "normal" | "high" : "normal", pauseUntilTaskComplete: body.pauseUntilTaskComplete !== false });
    const { data, error } = await db.from("crm_sequence_steps").insert({ sequence_id: sequenceId, position, step_type: sanitized.stepType, delay_value: sanitized.delayValue, delay_unit: sanitized.delayUnit, thread_mode: sanitized.threadMode, subject_template: sanitized.subjectTemplate, body_html: sanitized.bodyHtml, body_text: sanitized.bodyText, task_title_template: sanitized.taskTitleTemplate, task_notes_template: sanitized.taskNotesTemplate, task_priority: sanitized.taskPriority, pause_until_task_complete: sanitized.pauseUntilTaskComplete }).select("id").single();
    if (error) throw error;
    await db.from("internal_audit_events").insert({ actor_id: userId, action: "crm.sequence_step_created", resource_type: "crm_sequence_step", resource_id: data.id, safe_metadata: { sequence_id: sequenceId, position } });
    return NextResponse.json({ id: data.id, position }, { status: 201 });
  } catch (error) { const result = manageApiError(error); return NextResponse.json({ error: result.error }, { status: result.status }); }
}
