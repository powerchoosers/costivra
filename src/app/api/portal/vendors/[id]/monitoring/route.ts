import { NextResponse } from "next/server";
import { apiError, cleanText } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";
import { saveDurableMonitoringConfig, MonitoringSourceMethod } from "@/lib/vendors/monitoring";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: relationshipId } = await params;
    const { db, organizationId, userId, role } = await requirePortalContext();
    if (!["owner", "admin", "member"].includes(role)) {
      return NextResponse.json(
        { error: "You do not have permission to update vendor monitoring." },
        { status: 403 },
      );
    }
    const body = (await request.json()) as Record<string, unknown>;
    const forwardingEmail = cleanText(body.approvedForwardingEmail, 255);
    const sourceMethod = (cleanText(body.sourceMethod, 50) || "email_forwarding") as MonitoringSourceMethod;

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

    // Update relationship status to active
    await db
      .from("organization_vendors")
      .update({ relationship_status: "active" })
      .eq("id", relationshipId);

    // Save durable monitoring configuration in DB with audit event
    const record = await saveDurableMonitoringConfig(db, {
      organizationId,
      actorId: userId,
      organizationVendorId: relationshipId,
      sourceMethod,
      approvedSenderAddress: forwardingEmail,
      expectedCadenceDays: 30,
    });

    return NextResponse.json({
      ok: true,
      relationshipId,
      state: record.state,
      sourceMethod: record.sourceMethod,
      approvedForwardingEmail: record.approvedSenderAddress,
      privateIntakeAddress: record.privateIntakeAddress,
    });
  } catch (error) {
    return apiError(error);
  }
}
