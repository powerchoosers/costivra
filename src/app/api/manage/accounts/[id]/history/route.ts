import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { cleanUuid } from "@/lib/portal/http";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db } = await requireInternalOperator();
    const organizationId = cleanUuid((await params).id);
    if (!organizationId) {
      return NextResponse.json({ error: "Invalid account ID." }, { status: 400 });
    }

    const url = new URL(request.url);
    const page = Math.max(0, Number.parseInt(url.searchParams.get("page") ?? "0", 10) || 0);
    const limit = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get("limit") ?? "25", 10) || 25));
    const { data: events, error } = await db
      .from("internal_audit_events")
      .select("id, action, actor_id, created_at, safe_metadata")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .range(page * limit, page * limit + limit - 1);

    if (error) throw error;
    const actorIds = [...new Set((events ?? []).map((event) => event.actor_id).filter((id): id is string => typeof id === "string"))];
    const { data: actors, error: actorsError } = actorIds.length ? await db.from("profiles").select("id, full_name").in("id", actorIds) : { data: [], error: null };
    if (actorsError) throw actorsError;
    const actorNames = new Map((actors ?? []).map((actor) => [actor.id, actor.full_name || "Internal operator"]));

    const history = (events ?? []).map((e) => ({
      id: e.id,
      action: e.action,
      actorName: e.actor_id ? actorNames.get(e.actor_id) || "Internal operator" : "System",
      timestamp: e.created_at,
      summary: internalSummary(e.action, e.safe_metadata as Record<string, unknown>),
      source: "internal" as const,
    }));

    return NextResponse.json({ history, page, limit, source: "internal_audit_events" });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}

function internalSummary(action: string, metadata: Record<string, unknown>) {
  const changed = Array.isArray(metadata.fields_changed) ? metadata.fields_changed.filter((value): value is string => typeof value === "string").slice(0, 8) : [];
  if (changed.length) return `Changed: ${changed.join(", ")}.`;
  const reason = typeof metadata.reason === "string" ? metadata.reason : null;
  const label = action.replace(/^crm\./, "").replaceAll("_", " ");
  return reason ? `${label}: ${reason}` : `${label} recorded.`;
}
