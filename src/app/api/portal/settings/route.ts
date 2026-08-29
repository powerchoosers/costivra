import { NextResponse } from "next/server";
import { apiError, cleanText, PortalInputError } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";

export async function PATCH(request: Request) {
  try {
    const { db, organizationId, role } = await requirePortalContext();
    if (!['owner','admin'].includes(role)) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
    const body = await request.json() as Record<string, unknown>;
    const current = await db.from("organizations").select("settings").eq("id", organizationId).single();
    if (current.error) throw current.error;
    const requestedSettings = body.settings && typeof body.settings === "object" && !Array.isArray(body.settings)
      ? body.settings as Record<string, unknown>
      : {};
    const permittedSettings = ["weeklyDigest", "renewalAlerts"] as const;
    const settings = body.settings && typeof body.settings === "object" && !Array.isArray(body.settings)
      ? {
        ...((current.data.settings as Record<string, boolean>) ?? {}),
        ...Object.fromEntries(permittedSettings
          .filter((key) => key in requestedSettings)
          .map((key) => {
            if (typeof requestedSettings[key] !== "boolean") throw new PortalInputError(`${key} must be true or false.`);
            return [key, requestedSettings[key]];
          })),
      }
      : current.data.settings;
    const timezone = cleanText(body.timezone, 80) || "America/Chicago";
    try { new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(); }
    catch { throw new PortalInputError("Choose a valid timezone."); }
    const currency = cleanText(body.currency, 3).toUpperCase() || "USD";
    if (!/^[A-Z]{3}$/.test(currency)) throw new PortalInputError("Choose a valid three-letter currency code.");
    const reviewThreshold = Number(body.reviewThreshold);
    if (!Number.isFinite(reviewThreshold) || reviewThreshold < 0 || reviewThreshold > 100_000_000) {
      throw new PortalInputError("Review threshold must be a number between 0 and 100,000,000.");
    }
    const update = {
      name: cleanText(body.name, 120),
      industry: cleanText(body.industry, 120) || null,
      timezone,
      currency,
      primary_contact_name: cleanText(body.primaryContactName, 120) || null,
      review_threshold: reviewThreshold,
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
