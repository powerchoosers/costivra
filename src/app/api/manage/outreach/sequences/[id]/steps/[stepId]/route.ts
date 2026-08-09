import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { cleanText, cleanUuid } from "@/lib/portal/http";
import { sanitizeSequenceStep } from "@/lib/manage/sequences/validation";

type Context = { params: Promise<{ id: string; stepId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { db, userId } = await requireInternalOperator(); const { id, stepId } = await params;
    const sequenceId = cleanUuid(id); const stepIdValue = cleanUuid(stepId);
    if (!sequenceId || !stepIdValue) return NextResponse.json({ error: "Invalid sequence step." }, { status: 400 });
    const body = await request.json() as Record<string, unknown>;
    const { data: sequence } = await db.from("crm_sequences").select("status").eq("id", sequenceId).maybeSingle();
    if (!sequence) return NextResponse.json({ error: "Sequence not found." }, { status: 404 });
    if (sequence.status !== "draft") return NextResponse.json({ error: "Only draft sequences can be edited." }, { status: 409 });
    const { data: existing, error: existingError } = await db.from("crm_sequence_steps").select("*").eq("id", stepIdValue).eq("sequence_id", sequenceId).maybeSingle();
    if (existingError) throw existingError;
    if (!existing) return NextResponse.json({ error: "Step not found." }, { status: 404 });
    const value = (input: string, column: string) => Object.prototype.hasOwnProperty.call(body, input) ? body[input] : existing[column];
    const sanitized = sanitizeSequenceStep({
      stepType: existing.step_type,
      position: Number(existing.position),
      delayValue: Number(existing.delay_value),
      delayUnit: existing.delay_unit,
      subjectTemplate: typeof value("subjectTemplate", "subject_template") === "string" ? value("subjectTemplate", "subject_template") : null,
      bodyHtml: typeof value("bodyHtml", "body_html") === "string" ? value("bodyHtml", "body_html") : null,
      bodyText: typeof value("bodyText", "body_text") === "string" ? value("bodyText", "body_text") : null,
      taskTitleTemplate: typeof value("taskTitleTemplate", "task_title_template") === "string" ? value("taskTitleTemplate", "task_title_template") : null,
      taskNotesTemplate: typeof value("taskNotesTemplate", "task_notes_template") === "string" ? value("taskNotesTemplate", "task_notes_template") : null,
      threadMode: value("threadMode", "thread_mode") === "reply_to_previous" ? "reply_to_previous" : value("threadMode", "thread_mode") === "new_thread" ? "new_thread" : null,
      taskPriority: ["low", "normal", "high"].includes(String(value("taskPriority", "task_priority"))) ? String(value("taskPriority", "task_priority")) as "low" | "normal" | "high" : null,
      pauseUntilTaskComplete: typeof value("pauseUntilTaskComplete", "pause_until_task_complete") === "boolean" ? value("pauseUntilTaskComplete", "pause_until_task_complete") : Boolean(existing.pause_until_task_complete),
    });
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const [key, value] of Object.entries({ subject_template: sanitized.subjectTemplate, body_html: sanitized.bodyHtml, body_text: sanitized.bodyText, task_title_template: sanitized.taskTitleTemplate, task_notes_template: sanitized.taskNotesTemplate, thread_mode: sanitized.threadMode, task_priority: sanitized.taskPriority, pause_until_task_complete: sanitized.pauseUntilTaskComplete })) if (value !== undefined) patch[key] = value;
    if (typeof body.delayValue === "number") {
      if (!Number.isFinite(body.delayValue) || body.delayValue < 0) return NextResponse.json({ error: "Delay must be a non-negative number." }, { status: 400 });
      patch.delay_value = Number(existing.position) === 1 ? 0 : Math.trunc(body.delayValue);
    }
    if (typeof body.delayUnit === "string") {
      const delayUnit = cleanText(body.delayUnit, 30);
      if (!["minutes", "hours", "business_days", "calendar_days"].includes(delayUnit)) return NextResponse.json({ error: "Unsupported delay unit." }, { status: 400 });
      patch.delay_unit = delayUnit;
    }
    const { data, error } = await db.from("crm_sequence_steps").update(patch).eq("id", stepIdValue).eq("sequence_id", sequenceId).select("id").maybeSingle();
    if (error) throw error; if (!data) return NextResponse.json({ error: "Step not found." }, { status: 404 });
    await db.from("internal_audit_events").insert({ actor_id: userId, action: "crm.sequence_step_updated", resource_type: "crm_sequence_step", resource_id: stepIdValue, safe_metadata: { sequence_id: sequenceId } });
    return NextResponse.json({ ok: true });
  } catch (error) { const result = manageApiError(error); return NextResponse.json({ error: result.error }, { status: result.status }); }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { db, userId } = await requireInternalOperator(); const { id, stepId } = await params;
    const sequenceId = cleanUuid(id); const stepIdValue = cleanUuid(stepId);
    if (!sequenceId || !stepIdValue) return NextResponse.json({ error: "Invalid sequence step." }, { status: 400 });
    const { data: sequence } = await db.from("crm_sequences").select("status").eq("id", sequenceId).maybeSingle();
    if (!sequence || sequence.status !== "draft") return NextResponse.json({ error: "Only draft sequences can be edited." }, { status: 409 });
    const { data: steps, error: stepsError } = await db.from("crm_sequence_steps").select("id,position,delay_value,step_type,thread_mode").eq("sequence_id", sequenceId).order("position", { ascending: true });
    if (stepsError) throw stepsError;
    const remaining = (steps ?? []).filter((step) => step.id !== stepIdValue);
    if (!(steps ?? []).some((step) => step.id === stepIdValue)) return NextResponse.json({ error: "Step not found." }, { status: 404 });
    let priorEmail = false;
    for (const step of remaining) {
      if (step.thread_mode === "reply_to_previous" && !priorEmail) return NextResponse.json({ error: "That deletion would leave a reply step without an earlier email. Change its thread mode first." }, { status: 409 });
      if (["manual_email", "automatic_email"].includes(step.step_type)) priorEmail = true;
    }
    const { error } = await db.from("crm_sequence_steps").delete().eq("id", stepIdValue).eq("sequence_id", sequenceId); if (error) throw error;
    for (const [index, step] of remaining.entries()) {
      const { error: temporaryError } = await db.from("crm_sequence_steps").update({ position: (index + 1) * 1000, updated_at: new Date().toISOString() }).eq("id", step.id).eq("sequence_id", sequenceId);
      if (temporaryError) throw temporaryError;
    }
    for (const [index, step] of remaining.entries()) {
      const { error: finalError } = await db.from("crm_sequence_steps").update({ position: index + 1, delay_value: index === 0 ? 0 : step.delay_value, updated_at: new Date().toISOString() }).eq("id", step.id).eq("sequence_id", sequenceId);
      if (finalError) throw finalError;
    }
    await db.from("internal_audit_events").insert({ actor_id: userId, action: "crm.sequence_step_deleted", resource_type: "crm_sequence_step", resource_id: stepIdValue, safe_metadata: { sequence_id: sequenceId } });
    return NextResponse.json({ ok: true });
  } catch (error) { const result = manageApiError(error); return NextResponse.json({ error: result.error }, { status: result.status }); }
}
