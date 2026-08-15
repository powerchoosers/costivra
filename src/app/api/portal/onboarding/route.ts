import { NextResponse } from "next/server";
import { apiError, cleanText, PortalInputError } from "@/lib/portal/http";
import { getPortalData, requirePortalContext } from "@/lib/portal/repository";
import { deriveOnboardingProjection, getOnboardingProgress, type OnboardingStatus, type OnboardingStep } from "@/lib/portal/onboarding";
import { sendLifecycleEmailToWorkspace } from "@/lib/email/lifecycle-recipient";

const statuses = new Set<OnboardingStatus>(["not_started", "in_progress", "activated", "blocked"]);
const steps = new Set<OnboardingStep>(["account_confirmed", "company_profile", "documents", "review", "monitoring", "complete"]);

export async function GET() {
  try {
    const { db, organizationId } = await requirePortalContext();
    const { data, error } = await db.from("organization_onboarding").select("*").eq("organization_id", organizationId).maybeSingle();
    if (error) throw error;
    return NextResponse.json({ onboarding: data ?? null }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

/** Syncs durable state from the same authoritative records used by the checklist. */
export async function POST() {
  try {
    const { db, organizationId } = await requirePortalContext();
    const [{ data: current, error: currentError }, portal] = await Promise.all([
      db.from("organization_onboarding").select("*").eq("organization_id", organizationId).maybeSingle(),
      getPortalData(),
    ]);
    if (currentError) throw currentError;
    const projection = deriveOnboardingProjection(getOnboardingProgress(portal), current);
    const now = new Date().toISOString();
    const payload = {
      organization_id: organizationId,
      source: current?.source ?? "internal",
      ...projection,
      progress: undefined,
      updated_at: now,
    };
    delete (payload as Record<string, unknown>).progress;
    const { data, error } = await db.from("organization_onboarding").upsert(payload, { onConflict: "organization_id" }).select("*").single();
    if (error) throw error;
    if (current?.status !== "activated" && data.status === "activated") {
      try {
        await sendLifecycleEmailToWorkspace({
          db,
          kind: "activation_complete",
          organizationId,
          payload: {
            eventKey: `activation-complete:${organizationId}:${data.activated_at}`,
          },
        });
      } catch (emailError) {
        // Activation is durable and usable even if optional notification delivery fails.
        console.error("activation lifecycle email failed", emailError);
      }
    }
    return NextResponse.json({ onboarding: data, progress: projection.progress }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

/** Only an owner/admin may explicitly block or resume onboarding. */
export async function PATCH(request: Request) {
  try {
    const { db, organizationId, role } = await requirePortalContext();
    if (!["owner", "admin"].includes(role)) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
    const body = await request.json() as Record<string, unknown>;
    const status = cleanText(body.status, 24) as OnboardingStatus;
    const currentStep = cleanText(body.currentStep, 32) as OnboardingStep;
    if (!statuses.has(status) || !steps.has(currentStep)) throw new PortalInputError("A valid onboarding status and step are required.");
    const blockedReason = cleanText(body.blockedReason, 500);
    if (status === "blocked" && !blockedReason) throw new PortalInputError("A reason is required when blocking onboarding.");
    if (status === "activated") throw new PortalInputError("Activation is derived from completed records, not manually set.");
    const { data: current, error: currentError } = await db.from("organization_onboarding").select("status,source").eq("organization_id", organizationId).maybeSingle();
    if (currentError) throw currentError;
    if (current?.status === "activated") throw new PortalInputError("An activated workspace cannot be moved back by an operator.");
    const update = { status, current_step: currentStep, blocked_reason: status === "blocked" ? blockedReason : null, updated_at: new Date().toISOString() };
    const { data, error } = await db.from("organization_onboarding").upsert({ organization_id: organizationId, source: current?.source ?? "internal", ...update }, { onConflict: "organization_id" }).select("*").single();
    if (error) throw error;
    return NextResponse.json({ onboarding: data });
  } catch (error) { return apiError(error); }
}
