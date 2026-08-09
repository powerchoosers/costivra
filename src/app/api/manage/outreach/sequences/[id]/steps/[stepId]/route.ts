import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { cleanText, cleanUuid } from "@/lib/portal/http";
import { sanitizeSequenceStep } from "@/lib/manage/sequences/validation";

type Context = { params: Promise<{ id: string; stepId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { db } = await requireInternalOperator(); const { id, stepId } = await params;
    const sequenceId = cleanUuid(id); const stepIdValue = cleanUuid(stepId);
    if (!sequenceId || !stepIdValue) return NextResponse.json({ error: "Invalid sequence step." }, { status: 400 });
    const body = await request.json() as Record<string, unknown>;
    const { data: existing, error: existingError } = await db.from("crm_sequence_steps").select("*").eq("id", stepIdValue).eq("sequence_id", sequenceId).maybeSingle();
    if (existingError) throw existingError;
    if (!existing) return NextResponse.json({ error: "Step not found." }, { status: 404 });
    const value = (input: string, column: string) => Object.prototype.hasOwnProperty.call(body, input) ? body[input] : existing[column];
    const sanitized = sanitizeSequenceStep({
      subjectTemplate: typeof value("subjectTemplate", "subject_template") === "string" ? value("subjectTemplate", "subject_template") : null,
      bodyHtml: typeof value("bodyHtml", "body_html") === "string" ? value("bodyHtml", "body_html") : null,
      bodyText: typeof value("bodyText", "body_text") === "string" ? value("bodyText", "body_text") : null,
      taskTitleTemplate: typeof value("taskTitleTemplate", "task_title_template") === "string" ? value("taskTitleTemplate", "task_title_template") : null,
      taskNotesTemplate: typeof value("taskNotesTemplate", "task_notes_template") === "string" ? value("taskNotesTemplate", "task_notes_template") : null,
      threadMode: value("threadMode", "thread_mode") === "reply_to_previous" ? "reply_to_previous" : value("threadMode", "thread_mode") === "new_thread" ? "new_thread" : null,
      taskPriority: ["low", "normal", "high"].includes(String(value("taskPriority", "task_priority"))) ? String(value("taskPriority", "task_priority")) as "low" | "normal" | "high" : null,
    });
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const [key, value] of Object.entries({ subject_template: sanitized.subjectTemplate, body_html: sanitized.bodyHtml, body_text: sanitized.bodyText, task_title_template: sanitized.taskTitleTemplate, task_notes_template: sanitized.taskNotesTemplate, thread_mode: sanitized.threadMode, task_priority: sanitized.taskPriority })) if (value !== undefined) patch[key] = value;
    if (typeof body.delayValue === "number" && body.delayValue >= 0) patch.delay_value = Math.trunc(body.delayValue);
    if (typeof body.delayUnit === "string") patch.delay_unit = cleanText(body.delayUnit, 30);
    const { data, error } = await db.from("crm_sequence_steps").update(patch).eq("id", stepIdValue).eq("sequence_id", sequenceId).select("id").maybeSingle();
    if (error) throw error; if (!data) return NextResponse.json({ error: "Step not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) { const result = manageApiError(error); return NextResponse.json({ error: result.error }, { status: result.status }); }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { db } = await requireInternalOperator(); const { id, stepId } = await params;
    const sequenceId = cleanUuid(id); const stepIdValue = cleanUuid(stepId);
    if (!sequenceId || !stepIdValue) return NextResponse.json({ error: "Invalid sequence step." }, { status: 400 });
    const { data: sequence } = await db.from("crm_sequences").select("status").eq("id", sequenceId).maybeSingle();
    if (!sequence || sequence.status !== "draft") return NextResponse.json({ error: "Only draft sequences can be edited." }, { status: 409 });
    const { error } = await db.from("crm_sequence_steps").delete().eq("id", stepIdValue).eq("sequence_id", sequenceId); if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) { const result = manageApiError(error); return NextResponse.json({ error: result.error }, { status: result.status }); }
}
