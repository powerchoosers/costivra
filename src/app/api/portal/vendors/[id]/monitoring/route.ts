import { NextResponse } from "next/server";
import { apiError, cleanText } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: relationshipId } = await params;
    const { db, organizationId, role } = await requirePortalContext();
    if (!["owner", "admin", "member"].includes(role)) {
      return NextResponse.json(
        { error: "You do not have permission to update vendor monitoring." },
        { status: 403 },
      );
    }
    const body = (await request.json()) as Record<string, unknown>;
    const forwardingEmail = cleanText(body.approvedForwardingEmail, 255);
    const sourceMethod = cleanText(body.sourceMethod, 50) || "email_forwarding";
    const action = cleanText(body.action, 50);

    // Verify vendor relationship belongs to organization
    const { data: relationship, error: relError } = await db
      .from("organization_vendors")
      .select("id, organization_id, vendor_id")
      .eq("id", relationshipId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (relError) throw relError;
    if (!relationship) {
      return NextResponse.json(
        { error: "Vendor relationship not found." },
        { status: 404 },
      );
    }

    // Determine target monitoring state
    const newState = action === "test_complete" ? "active" : "test_needed";

    // Update relationship metadata or monitoring state
    const { error: updateError } = await db
      .from("organization_vendors")
      .update({
        relationship_status: "active",
      })
      .eq("id", relationshipId);

    if (updateError) throw updateError;

    // Log audit event
    await db.from("audit_events").insert({
      organization_id: organizationId,
      actor_id: (await requirePortalContext()).userId,
      event_type: "vendor_monitoring_updated",
      target_id: relationshipId,
      target_type: "organization_vendors",
      metadata: {
        source_method: sourceMethod,
        approved_forwarding_email: forwardingEmail,
        state: newState,
      },
    });

    return NextResponse.json({
      ok: true,
      relationshipId,
      monitoringState: newState,
      approvedForwardingEmail: forwardingEmail,
      privateIntakeAddress: `inbox-${organizationId.slice(0, 8)}@costivra.ai`,
    });
  } catch (error) {
    return apiError(error);
  }
}
