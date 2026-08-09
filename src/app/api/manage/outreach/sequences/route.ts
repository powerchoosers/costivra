import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { listSequences } from "@/lib/manage/sequences/repository";
import { cleanText, cleanUuid } from "@/lib/portal/http";

const privateHeaders = { "Cache-Control": "private, no-store" };

export async function GET() {
  try {
    const { db } = await requireInternalOperator();
    return NextResponse.json({
      sequences: await listSequences(db),
      executionEnabled: process.env.COSTIVRA_SEQUENCE_EXECUTION_ENABLED === "true",
    }, { headers: privateHeaders });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}

export async function POST(request: Request) {
  try {
    const { db, userId } = await requireInternalOperator();
    const body = await request.json() as Record<string, unknown>;
    const organizationId = cleanUuid(body.organizationId);
    const name = cleanText(body.name, 160) || "Untitled sequence";
    if (!organizationId) return NextResponse.json({ error: "Choose an account for this sequence." }, { status: 400 });
    const { data: membership } = await db.from("organization_memberships").select("organization_id").eq("organization_id", organizationId).limit(1).maybeSingle();
    if (!membership) return NextResponse.json({ error: "That account could not be found." }, { status: 404 });
    const { data, error } = await db.from("crm_sequences").insert({ organization_id: organizationId, name, description: cleanText(body.description, 2_000) || null, owner_id: userId }).select("id").single();
    if (error) throw error;
    await db.from("internal_audit_events").insert({ actor_id: userId, organization_id: organizationId, action: "crm.sequence_created", resource_type: "crm_sequence", resource_id: data.id });
    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
