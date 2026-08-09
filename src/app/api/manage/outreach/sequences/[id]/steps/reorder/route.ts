import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { cleanUuid } from "@/lib/portal/http";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { db } = await requireInternalOperator(); const sequenceId = cleanUuid((await params).id);
    const body = await request.json() as Record<string, unknown>;
    const orderedIds = Array.isArray(body.stepIds) ? body.stepIds.map(cleanUuid).filter((value): value is string => Boolean(value)) : [];
    if (!sequenceId || !orderedIds.length) return NextResponse.json({ error: "Provide the ordered step IDs." }, { status: 400 });
    const { data: sequence } = await db.from("crm_sequences").select("status").eq("id", sequenceId).maybeSingle();
    if (!sequence || sequence.status !== "draft") return NextResponse.json({ error: "Only draft sequences can be edited." }, { status: 409 });
    if (new Set(orderedIds).size !== orderedIds.length) return NextResponse.json({ error: "Each step must appear once." }, { status: 400 });
    const { data: steps, error: stepsError } = await db.from("crm_sequence_steps").select("id").eq("sequence_id", sequenceId);
    if (stepsError) throw stepsError;
    const currentIds = (steps ?? []).map((step) => step.id).sort();
    const requestedIds = [...orderedIds].sort();
    if (currentIds.length !== requestedIds.length || currentIds.some((id, index) => id !== requestedIds[index])) return NextResponse.json({ error: "Include every step in the sequence order." }, { status: 400 });
    for (const [index, stepId] of orderedIds.entries()) {
      const { error } = await db.from("crm_sequence_steps").update({ position: (index + 1) * 1000, updated_at: new Date().toISOString() }).eq("id", stepId).eq("sequence_id", sequenceId); if (error) throw error;
    }
    for (const [index, stepId] of orderedIds.entries()) {
      const { error } = await db.from("crm_sequence_steps").update({ position: index + 1, updated_at: new Date().toISOString() }).eq("id", stepId).eq("sequence_id", sequenceId); if (error) throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (error) { const result = manageApiError(error); return NextResponse.json({ error: result.error }, { status: result.status }); }
}
