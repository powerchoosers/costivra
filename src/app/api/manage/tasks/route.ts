import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { cleanText, cleanUuid } from "@/lib/portal/http";

const taskTypes = new Set(["email", "call", "meeting", "follow_up", "review"]);
const priorities = new Set(["low", "normal", "high"]);

export async function POST(request: Request) {
  try {
    const { db, userId } = await requireInternalOperator();
    const body = (await request.json()) as Record<string, unknown>;
    const organizationId = cleanUuid(body.organizationId);
    const title = cleanText(body.title, 300);
    const taskType = cleanText(body.taskType, 30) || "follow_up";
    const priority = cleanText(body.priority, 20) || "normal";
    const dueAt = cleanText(body.dueAt, 40) || null;
    if (
      !organizationId ||
      !title ||
      !taskTypes.has(taskType) ||
      !priorities.has(priority) ||
      (dueAt && Number.isNaN(Date.parse(dueAt)))
    )
      return NextResponse.json(
        { error: "Complete the task details with a valid date." },
        { status: 400 },
      );
    const contactId = cleanUuid(body.contactId) || null;
    if (contactId) {
      const { data: contact } = await db
        .from("crm_contacts")
        .select("id")
        .eq("id", contactId)
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (!contact)
        return NextResponse.json(
          { error: "That contact does not belong to the selected account." },
          { status: 409 },
        );
    }
    const { data: task, error } = await db
      .from("crm_tasks")
      .insert({
        organization_id: organizationId,
        contact_id: contactId,
        assigned_to: userId,
        title,
        task_type: taskType,
        priority,
        due_at: dueAt,
        notes: cleanText(body.notes, 2_000) || null,
      })
      .select("id")
      .single();
    if (error) throw error;
    await db.from("crm_activities").insert({
      organization_id: organizationId,
      contact_id: contactId,
      actor_id: userId,
      kind: "task_created",
      direction: "internal",
      subject: title,
      metadata: { task_id: task.id },
    });
    await db.from("internal_audit_events").insert({
      actor_id: userId,
      organization_id: organizationId,
      action: "crm.task_created",
      resource_type: "crm_task",
      resource_id: task.id,
    });
    return NextResponse.json({ ok: true, id: task.id }, { status: 201 });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }
}
