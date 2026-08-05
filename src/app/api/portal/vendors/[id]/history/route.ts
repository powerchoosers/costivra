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

    const { data: events, error } = await db
      .from("audit_events")
      .select("id, action, actor_id, created_at, safe_metadata")
      .eq("organization_id", organizationId)
      .eq("resource_id", relationshipId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    const history = (events ?? []).map((e) => ({
      id: e.id,
      action: e.action,
      actorName: e.actor_id ? "Team Member" : "System",
      timestamp: e.created_at,
      summary: (e.safe_metadata as Record<string, string>)?.summary || `Action: ${e.action}`,
      source: "customer" as const,
    }));

    return NextResponse.json({ history });
  } catch (error) {
    return apiError(error, "Failed to load vendor history.");
  }
}
