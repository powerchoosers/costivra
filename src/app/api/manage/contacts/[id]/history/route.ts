import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { cleanUuid } from "@/lib/portal/http";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db } = await requireInternalOperator();
    const contactId = cleanUuid((await params).id);
    if (!contactId) {
      return NextResponse.json({ error: "Invalid contact ID." }, { status: 400 });
    }

    const { data: events, error } = await db
      .from("internal_audit_events")
      .select("id, action, actor_id, created_at, safe_metadata")
      .eq("resource_id", contactId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    const history = (events ?? []).map((e) => ({
      id: e.id,
      action: e.action,
      actorName: e.actor_id ? "Internal Operator" : "System",
      timestamp: e.created_at,
      summary: (e.safe_metadata as Record<string, string>)?.summary || `Action: ${e.action}`,
      source: "internal" as const,
    }));

    return NextResponse.json({ history });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
