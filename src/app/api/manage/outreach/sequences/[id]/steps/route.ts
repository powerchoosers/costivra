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

    const afterStepWasProvided = Object.prototype.hasOwnProperty.call(body, "afterStepId") && body.afterStepId !== null;
    const afterStepId = afterStepWasProvided ? cleanUuid(body.afterStepId) : null;
    if (afterStepWasProvided && !afterStepId) return NextResponse.json({ error: "Choose a valid step to insert after." }, { status: 400 });

    const stepType = cleanText(body.stepType, 30); if (!types.has(stepType)) return NextResponse.json({ error: "Unsupported sequence step." }, { status: 400 });
    const delayValue = typeof body.delayValue === "number" && body.delayValue >= 0 ? Math.trunc(body.delayValue) : 0;
    const delayUnit = cleanText(body.delayUnit, 30) || "business_days"; if (!units.has(delayUnit)) return NextResponse.json({ error: "Unsupported delay unit." }, { status: 400 });

    const { data: stepRows, error: stepsError } = await db
      .from("crm_sequence_steps")
      .select("id,position")
      .eq("sequence_id", sequenceId)
      .order("position", { ascending: true });
    if (stepsError) throw stepsError;

    const orderedSteps = [...(stepRows ?? [])].sort((left, right) => Number(left.position) - Number(right.position));
    const afterIndex = afterStepId ? orderedSteps.findIndex((step) => step.id === afterStepId) : orderedSteps.length - 1;
    if (afterStepId && afterIndex < 0) return NextResponse.json({ error: "That step is not part of this sequence." }, { status: 404 });
    const insertionIndex = afterIndex + 1;
    const position = insertionIndex + 1;

    // A sequence has a unique (sequence_id, position) constraint. Move the
    // existing rows into a high, ordered temporary range before inserting,
    // then normalize from first to last. This temporary range avoids duplicate
    // positions while the chronological order is being normalized.
    const largestPosition = orderedSteps.reduce((largest, step) => Math.max(largest, Number(step.position) || 0), 0);
    const temporaryBase = largestPosition + (orderedSteps.length + 2) * 2;
    const temporaryCeiling = temporaryBase + (orderedSteps.length + 1) * 2 + 1;
    if (temporaryCeiling > 2_147_483_647) return NextResponse.json({ error: "This sequence order needs repair before another step can be added." }, { status: 409 });
    const now = new Date().toISOString();
    for (let index = orderedSteps.length - 1; index >= 0; index -= 1) {
      const step = orderedSteps[index];
      if (!step) continue;
      const { error } = await db
        .from("crm_sequence_steps")
        .update({ position: temporaryBase + (index + 1) * 2, updated_at: now })
        .eq("id", step.id)
        .eq("sequence_id", sequenceId);
      if (error) throw error;
    }

    const sanitized = sanitizeSequenceStep({ stepType: stepType as SequenceStepType, position, delayValue: position === 1 ? 0 : delayValue, delayUnit: delayUnit as SequenceDelayUnit, threadMode: body.threadMode === "reply_to_previous" ? "reply_to_previous" : body.threadMode === "new_thread" ? "new_thread" : null, subjectTemplate: typeof body.subjectTemplate === "string" ? body.subjectTemplate : null, bodyHtml: typeof body.bodyHtml === "string" ? body.bodyHtml : null, bodyText: typeof body.bodyText === "string" ? body.bodyText : null, taskTitleTemplate: typeof body.taskTitleTemplate === "string" ? body.taskTitleTemplate : null, taskNotesTemplate: typeof body.taskNotesTemplate === "string" ? body.taskNotesTemplate : null, taskPriority: ["low", "normal", "high"].includes(String(body.taskPriority)) ? String(body.taskPriority) as "low" | "normal" | "high" : "normal", pauseUntilTaskComplete: body.pauseUntilTaskComplete !== false });
    const { data, error } = await db.from("crm_sequence_steps").insert({ sequence_id: sequenceId, position: temporaryBase + insertionIndex * 2 + 1, step_type: sanitized.stepType, delay_value: sanitized.delayValue, delay_unit: sanitized.delayUnit, thread_mode: sanitized.threadMode, subject_template: sanitized.subjectTemplate, body_html: sanitized.bodyHtml, body_text: sanitized.bodyText, task_title_template: sanitized.taskTitleTemplate, task_notes_template: sanitized.taskNotesTemplate, task_priority: sanitized.taskPriority, pause_until_task_complete: sanitized.pauseUntilTaskComplete }).select("id").single();
    if (error) throw error;
    const finalOrder = [...orderedSteps.slice(0, insertionIndex).map((step) => step.id), data.id, ...orderedSteps.slice(insertionIndex).map((step) => step.id)];
    for (const [index, stepId] of finalOrder.entries()) {
      const { error: normalizeError } = await db
        .from("crm_sequence_steps")
        .update({ position: index + 1, updated_at: now })
        .eq("id", stepId)
        .eq("sequence_id", sequenceId);
      if (normalizeError) throw normalizeError;
    }
    await db.from("internal_audit_events").insert({ actor_id: userId, action: "crm.sequence_step_created", resource_type: "crm_sequence_step", resource_id: data.id, safe_metadata: { sequence_id: sequenceId, position, after_step_id: afterStepId } });
    return NextResponse.json({ id: data.id, position }, { status: 201 });
  } catch (error) { const result = manageApiError(error); return NextResponse.json({ error: result.error }, { status: result.status }); }
}
