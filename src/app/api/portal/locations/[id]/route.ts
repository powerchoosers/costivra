import { NextResponse } from "next/server";
import { apiError, cleanUuid } from "@/lib/portal/http";
import { locationInput } from "@/lib/portal/locations";
import { requirePortalContext } from "@/lib/portal/repository";

type RouteContext = { params: Promise<{ id: string }> };
type PortalContext = Awaited<ReturnType<typeof requirePortalContext>>;
type ScopedLocation =
  | { portal: PortalContext; id: string; existing: { id: string; name: string; status: string } }
  | { error: "forbidden" | "invalid" | "missing" };
const canManage = (role: string) => role === "owner" || role === "admin";

async function contextWithLocation(route: RouteContext): Promise<ScopedLocation> {
  const portal = await requirePortalContext();
  if (!canManage(portal.role)) return { error: "forbidden" as const };
  const id = cleanUuid((await route.params).id);
  if (!id) return { error: "invalid" as const };
  const existing = await portal.db
    .from("locations")
    .select("id,name,status")
    .eq("id", id)
    .eq("organization_id", portal.organizationId)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (!existing.data) return { error: "missing" as const };
  return {
    portal,
    id,
    existing: existing.data as { id: string; name: string; status: string },
  };
}

function contextError(error: "forbidden" | "invalid" | "missing") {
  if (error === "forbidden") {
    return NextResponse.json(
      { error: "Administrator access is required." },
      { status: 403 },
    );
  }
  if (error === "invalid") {
    return NextResponse.json({ error: "Invalid location." }, { status: 400 });
  }
  return NextResponse.json({ error: "Location not found." }, { status: 404 });
}

export async function PATCH(request: Request, route: RouteContext) {
  try {
    const scoped = await contextWithLocation(route);
    if (!("portal" in scoped)) return contextError(scoped.error);
    const input = locationInput(await request.json() as Record<string, unknown>);
    if (!input) {
      return NextResponse.json(
        { error: "Location name is required." },
        { status: 400 },
      );
    }
    const duplicate = await scoped.portal.db
      .from("locations")
      .select("id")
      .eq("organization_id", scoped.portal.organizationId)
      .eq("name", input.name)
      .neq("id", scoped.id)
      .maybeSingle();
    if (duplicate.error) throw duplicate.error;
    if (duplicate.data) {
      return NextResponse.json(
        { error: "A location with this name already exists." },
        { status: 409 },
      );
    }
    const update = await scoped.portal.db
      .from("locations")
      .update(input)
      .eq("id", scoped.id)
      .eq("organization_id", scoped.portal.organizationId);
    if (update.error) throw update.error;
    const audit = await scoped.portal.db.from("audit_events").insert({
      organization_id: scoped.portal.organizationId,
      actor_type: "user",
      actor_id: scoped.portal.userId,
      action: input.status === "inactive" ? "location.archived" : "location.updated",
      resource_type: "location",
      resource_id: scoped.id,
    });
    if (audit.error) throw audit.error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: Request, route: RouteContext) {
  try {
    const scoped = await contextWithLocation(route);
    if (!("portal" in scoped)) return contextError(scoped.error);
    const update = await scoped.portal.db
      .from("locations")
      .update({ status: "inactive" })
      .eq("id", scoped.id)
      .eq("organization_id", scoped.portal.organizationId);
    if (update.error) throw update.error;
    const audit = await scoped.portal.db.from("audit_events").insert({
      organization_id: scoped.portal.organizationId,
      actor_type: "user",
      actor_id: scoped.portal.userId,
      action: "location.archived",
      resource_type: "location",
      resource_id: scoped.id,
    });
    if (audit.error) throw audit.error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
