import { NextResponse } from "next/server";
import { apiError, cleanText } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";

export async function PATCH(request: Request) {
  try {
    const { db, organizationId, role } = await requirePortalContext();
    if (!['owner','admin'].includes(role)) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
    const body = await request.json() as Record<string, unknown>;
    const current = await db.from("organizations").select("settings").eq("id", organizationId).single();
    if (current.error) throw current.error;
    const settings = body.settings && typeof body.settings === "object" && !Array.isArray(body.settings)
      ? { ...((current.data.settings as Record<string, boolean>) ?? {}), ...(body.settings as Record<string, boolean>) }
      : current.data.settings;
    const update = {
      name: cleanText(body.name, 120),
      industry: cleanText(body.industry, 120) || null,
      timezone: cleanText(body.timezone, 80) || "America/Chicago",
      currency: cleanText(body.currency, 3).toUpperCase() || "USD",
      primary_contact_name: cleanText(body.primaryContactName, 120) || null,
      review_threshold: Number(body.reviewThreshold) || 0,
      settings,
      updated_at: new Date().toISOString(),
    };
    if (!update.name) return NextResponse.json({ error: "Organization name is required." }, { status: 400 });
    const { error } = await db.from("organizations").update(update).eq("id", organizationId);
    if (error) throw error;
    await db.from("audit_events").insert({ organization_id: organizationId, actor_type: "user", action: "organization.settings_updated", resource_type: "organization", resource_id: organizationId });
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
