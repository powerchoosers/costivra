import { NextResponse } from "next/server";
import { requirePortalContext } from "@/lib/portal/repository";
import { apiError, cleanUuid } from "@/lib/portal/http";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db, organizationId } = await requirePortalContext();
    const relationshipId = cleanUuid((await params).id);
    if (!relationshipId) {
      return NextResponse.json({ error: "Invalid vendor relationship ID." }, { status: 400 });
    }

    const url = new URL(request.url);
    const page = Math.max(0, Number.parseInt(url.searchParams.get("page") ?? "0", 10) || 0);
    const limit = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get("limit") ?? "25", 10) || 25));
    const { data: events, error } = await db
      .from("audit_events")
      .select("id, action, actor_id, created_at, safe_metadata")
      .eq("organization_id", organizationId)
      .eq("resource_id", relationshipId)
      .order("created_at", { ascending: false })
      .range(page * limit, page * limit + limit - 1);

    if (error) throw error;
    const actorIds = [...new Set((events ?? []).map((event) => event.actor_id).filter((id): id is string => typeof id === "string"))];
    const { data: actors, error: actorsError } = actorIds.length ? await db.from("profiles").select("id, full_name").in("id", actorIds) : { data: [], error: null };
    if (actorsError) throw actorsError;
    const actorNames = new Map((actors ?? []).map((actor) => [actor.id, actor.full_name || "Team member"]));

    const history = (events ?? []).map((e) => ({
      id: e.id,
      action: e.action,
      actorName: e.actor_id ? actorNames.get(e.actor_id) || "Team member" : "System",
      timestamp: e.created_at,
      summary: customerSummary(e.action, e.safe_metadata as Record<string, unknown>),
      source: "customer" as const,
    }));

    return NextResponse.json({ history, page, limit, source: "audit_events" });
  } catch (error) {
    return apiError(error, "Failed to load vendor history.");
  }
}

function customerSummary(action: string, metadata: Record<string, unknown>) {
  const changed = Array.isArray(metadata.fields_changed) ? metadata.fields_changed.filter((value): value is string => typeof value === "string").slice(0, 8) : [];
  if (changed.length) return `Updated ${changed.join(", ")}.`;
  const labels: Record<string, string> = {
    "vendor_relationship.created": "Vendor relationship added.",
    "vendor_relationship.updated": "Vendor relationship updated.",
    "vendor_monitoring.configured": "Monitoring configured.",
    "vendor_monitoring.paused": "Monitoring paused.",
    "vendor_monitoring.resumed": "Monitoring resumed.",
    "vendor_monitoring.test_passed": "Monitoring connection tested.",
    "vendor_relationship.terminated": "Vendor relationship ended.",
    "vendor_relationship.reactivated": "Vendor relationship reactivated.",
    "vendor_relationship.removed": "Vendor relationship removed.",
    "vendor_relationship.deleted": "Vendor relationship removed.",
  };
  return labels[action] ?? "Vendor relationship activity recorded.";
}
