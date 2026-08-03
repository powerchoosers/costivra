import { NextResponse } from "next/server";
import { apiError } from "@/lib/portal/http";
import { locationInput } from "@/lib/portal/locations";
import { requirePortalContext } from "@/lib/portal/repository";

const canManage = (role: string) => role === "owner" || role === "admin";

export async function POST(request: Request) {
  try {
    const { db, organizationId, role, userId } = await requirePortalContext();
    if (!canManage(role)) {
      return NextResponse.json(
        { error: "Administrator access is required." },
        { status: 403 },
      );
    }
    const input = locationInput(await request.json() as Record<string, unknown>);
    if (!input) {
      return NextResponse.json(
        { error: "Location name is required." },
        { status: 400 },
      );
    }
    const duplicate = await db
      .from("locations")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("name", input.name)
      .maybeSingle();
    if (duplicate.error) throw duplicate.error;
    if (duplicate.data) {
      return NextResponse.json(
        { error: "A location with this name already exists." },
        { status: 409 },
      );
    }
    const created = await db
      .from("locations")
      .insert({ organization_id: organizationId, ...input })
      .select("id")
      .single();
    if (created.error) throw created.error;
    const audit = await db.from("audit_events").insert({
      organization_id: organizationId,
      actor_type: "user",
      actor_id: userId,
      action: "location.created",
      resource_type: "location",
      resource_id: created.data.id,
    });
    if (audit.error) throw audit.error;
    return NextResponse.json({ id: created.data.id }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
