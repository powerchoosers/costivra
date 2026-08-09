import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { cleanText, cleanUuid } from "@/lib/portal/http";
import { cancelSequenceTask, completeSequenceTask } from "@/lib/manage/sequences/worker";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db, userId } = await requireInternalOperator();
    const id = cleanUuid((await params).id);
    const body = (await request.json()) as Record<string, unknown>;
    const status = cleanText(body.status, 30);
    const cancellationReason = cleanText(body.reason, 240);
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
      .select("id,origin,task_type,status")
      .eq("id", id)
      .maybeSingle();
    if (currentTaskError) throw currentTaskError;
    if (!currentTask) return NextResponse.json({ error: "Task not found." }, { status: 404 });
    const isSequenceTask = currentTask.origin === "sequence";
    if (isSequenceTask && currentTask.status === "completed" && status !== "completed") {
      return NextResponse.json({ error: "A completed sequence task cannot be reopened; update the enrollment instead." }, { status: 409 });
    }
    if (isSequenceTask && currentTask.status === "cancelled" && status !== "cancelled") {
      return NextResponse.json({ error: "A cancelled sequence task cannot be reopened; stop or restart the enrollment explicitly." }, { status: 409 });
    }
    if (isSequenceTask && status === "cancelled" && currentTask.task_type === "email") {
      return NextResponse.json({ error: "Stop the enrollment from Sequence Mail instead of cancelling its email task." }, { status: 409 });
    }
    if (isSequenceTask && status === "cancelled" && !cancellationReason) {
      return NextResponse.json({ error: "A reason is required when cancelling a sequence task." }, { status: 400 });
    }
    if (status === "completed" && isSequenceTask && currentTask.status === "completed") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    if (status === "completed" && isSequenceTask && currentTask.task_type === "email") {
      return NextResponse.json({ error: "Send the suggested sequence email from the composer before completing this task." }, { status: 409 });
    }
    const previousStatus = cleanText(currentTask.status, 30);
    const { data: task, error } = await db
      .from("crm_tasks")
      .update({
        status,
        completed_at: status === "completed" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("status", previousStatus)
      .select("organization_id,contact_id,title")
      .maybeSingle();
    if (error) throw error;
    if (!task) return NextResponse.json({ error: "The task changed before it could be updated. Refresh and try again." }, { status: 409 });
    if (status === "completed" && isSequenceTask) {
      let advanced = false;
      try {
        advanced = await completeSequenceTask(db, { taskId: id, actorId: userId });
      } catch (error) {
        await db.from("crm_tasks").update({ status: previousStatus, completed_at: null, updated_at: new Date().toISOString() }).eq("id", id).eq("status", "completed");
        throw error;
      }
      if (!advanced) {
        await db.from("crm_tasks").update({ status: previousStatus, completed_at: null, updated_at: new Date().toISOString() }).eq("id", id).eq("status", "completed");
        return NextResponse.json({ error: "The sequence task is no longer waiting for completion. Refresh the task list." }, { status: 409 });
      }
    }
    if (status === "cancelled" && isSequenceTask) {
      let stopped = false;
      try {
        stopped = await cancelSequenceTask(db, { taskId: id, actorId: userId, reason: cancellationReason });
      } catch (error) {
        await db.from("crm_tasks").update({ status: previousStatus, completed_at: null, updated_at: new Date().toISOString() }).eq("id", id).eq("status", "cancelled");
        throw error;
      }
      if (!stopped) {
        await db.from("crm_tasks").update({ status: previousStatus, completed_at: null, updated_at: new Date().toISOString() }).eq("id", id).eq("status", "cancelled");
        return NextResponse.json({ error: "The sequence enrollment is no longer waiting for this task. Refresh the task list." }, { status: 409 });
      }
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
        safe_metadata: { status, ...(cancellationReason ? { reason: cancellationReason } : {}) },
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
