import { NextResponse } from "next/server";
import { apiError, cleanText, PortalInputError } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";

const TOUR_VERSION = 1;
const statuses = new Set(["in_progress", "completed", "skipped"]);

export async function GET() {
  try {
    const { db, organizationId, userId } = await requirePortalContext();
    const { data, error } = await db
      .from("member_workspace_tutorials")
      .select("version,status,current_step,completed_at,skipped_at")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .eq("version", TOUR_VERSION)
      .maybeSingle();
    if (error && error.code !== "42P01") throw error;
    return NextResponse.json({
      tutorial: data ?? { version: TOUR_VERSION, status: "not_started", current_step: 0, completed_at: null, skipped_at: null },
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { db, organizationId, userId } = await requirePortalContext();
    const body = await request.json() as Record<string, unknown>;
    const status = cleanText(body.status, 24);
    const currentStep = Number(body.currentStep ?? 0);
    if (!statuses.has(status) || !Number.isInteger(currentStep) || currentStep < 0 || currentStep > 4) {
      throw new PortalInputError("A valid tutorial state is required.");
    }
    const now = new Date().toISOString();
    const { data, error } = await db
      .from("member_workspace_tutorials")
      .upsert({
        organization_id: organizationId,
        user_id: userId,
        version: TOUR_VERSION,
        status,
        current_step: currentStep,
        completed_at: status === "completed" ? now : null,
        skipped_at: status === "skipped" ? now : null,
        updated_at: now,
      }, { onConflict: "organization_id,user_id,version" })
      .select("version,status,current_step,completed_at,skipped_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ tutorial: data });
  } catch (error) {
    return apiError(error);
  }
}
