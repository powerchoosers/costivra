import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { cleanText, cleanUuid } from "@/lib/portal/http";
import { completeSequenceTask } from "@/lib/manage/sequences/worker";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db, userId } = await requireInternalOperator();
    const id = cleanUuid((await params).id);
    const body = (await request.json()) as Record<string, unknown>;
    const status = cleanText(body.status, 30);
    if (
      !id ||
      !["open", "in_progress", "completed", "cancelled"].includes(status)
    )
      return NextResponse.json(
        { error: "Invalid task update." },
        { status: 400 },
      );
    const { data: currentTask, error: currentTaskError } = await db
      .from("crm_tasks")
      .select("id,origin,task_type")
      .eq("id", id)
      .maybeSingle();
    if (currentTaskError) throw currentTaskError;
    if (!currentTask) return NextResponse.json({ error: "Task not found." }, { status: 404 });
    if (status === "completed" && currentTask.origin === "sequence" && currentTask.task_type === "email") {
      return NextResponse.json({ error: "Send the suggested sequence email from the composer before completing this task." }, { status: 409 });
    }
    const { data: task, error } = await db
      .from("crm_tasks")
      .update({
        status,
        completed_at: status === "completed" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("organization_id,contact_id,title")
      .single();
    if (error) throw error;
    if (status === "completed" && currentTask.origin === "sequence") {
      await completeSequenceTask(db, { taskId: id, actorId: userId });
    }
    await db
      .from("crm_activities")
      .insert({
        organization_id: task.organization_id,
        contact_id: task.contact_id,
        actor_id: userId,
        kind: status === "completed" ? "task_completed" : "status_change",
        direction: "internal",
        subject: task.title,
        summary: `Task marked ${status.replaceAll("_", " ")}`,
      });
    await db
      .from("internal_audit_events")
      .insert({
        actor_id: userId,
        organization_id: task.organization_id,
        action: "crm.task_updated",
        resource_type: "crm_task",
        resource_id: id,
        safe_metadata: { status },
      });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }
}
