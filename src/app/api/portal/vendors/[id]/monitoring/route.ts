import { NextResponse } from "next/server";
import { apiError, cleanText } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";
import { getDurableMonitoringConfig, isValidMonitoringEmailAddress, saveDurableMonitoringConfig, MonitoringSourceMethod } from "@/lib/vendors/monitoring";
import { sendLifecycleEmailToWorkspace } from "@/lib/email/lifecycle-recipient";

const sourceMethods = new Set<MonitoringSourceMethod>(["email_forwarding", "manual_forwarding", "manual_upload"]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: relationshipId } = await params;
    const { db, organizationId } = await requirePortalContext();
    const { data: relationship, error } = await db
      .from("organization_vendors")
      .select("id")
      .eq("id", relationshipId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (error) throw error;
    if (!relationship) return NextResponse.json({ error: "Vendor relationship not found." }, { status: 404 });
    return NextResponse.json({ monitoring: await getDurableMonitoringConfig(db, organizationId, relationshipId) });
  } catch (error) {
    return apiError(error, "Failed to load vendor monitoring.");
  }
}

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
    const sourceMethod = cleanText(body.sourceMethod, 50) as MonitoringSourceMethod;
    const expectedCadenceDays = Number(body.expectedCadenceDays);
    if (!sourceMethods.has(sourceMethod)) return NextResponse.json({ error: "Choose a valid monitoring method." }, { status: 400 });
    if (!Number.isInteger(expectedCadenceDays) || expectedCadenceDays < 1 || expectedCadenceDays > 366) return NextResponse.json({ error: "Choose an expected billing cadence between 1 and 366 days." }, { status: 400 });
    if (sourceMethod === "email_forwarding" && !isValidMonitoringEmailAddress(forwardingEmail)) {
      return NextResponse.json({ error: "Enter the approved forwarding email address that will send the monitoring test." }, { status: 400 });
    }
    if (forwardingEmail && !isValidMonitoringEmailAddress(forwardingEmail)) {
      return NextResponse.json({ error: "Enter a valid approved forwarding email address." }, { status: 400 });
    }

    // Verify vendor relationship belongs to organization
    const { data: relationship, error: relError } = await db
      .from("organization_vendors")
      .select("id, organization_id, vendor_id, relationship_status")
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
    if (relationship.relationship_status === "terminated") {
      return NextResponse.json({ error: "Reactivate the vendor relationship before resuming monitoring." }, { status: 409 });
    }

    // Save durable monitoring configuration in DB with audit event
    const record = await saveDurableMonitoringConfig(db, {
      organizationId,
      actorId: userId,
      organizationVendorId: relationshipId,
      sourceMethod,
      approvedSenderAddress: forwardingEmail,
      expectedCadenceDays,
    });

    if (record.privateIntakeAddress) {
      const { data: vendor } = await db.from("vendors").select("canonical_name").eq("id", relationship.vendor_id).maybeSingle();
      try {
        await sendLifecycleEmailToWorkspace({
          db,
          kind: "forwarding_instructions",
          organizationId,
          payload: {
            vendorName: typeof vendor?.canonical_name === "string" ? vendor.canonical_name : undefined,
            intakeAddress: record.privateIntakeAddress,
            eventKey: `monitoring-configured:${record.id ?? relationshipId}:${record.privateIntakeAddress}:${record.approvedSenderAddress ?? ""}`,
          },
        });
      } catch (emailError) {
        console.error("monitoring instructions lifecycle email failed", emailError);
      }
    }

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: relationshipId } = await params;
    const { db, organizationId, userId, role } = await requirePortalContext();
    if (!["owner", "admin", "member"].includes(role)) return NextResponse.json({ error: "You do not have permission to update vendor monitoring." }, { status: 403 });
    const body = (await request.json()) as Record<string, unknown>;
    const requestedState = cleanText(body.state, 30);
    if (requestedState !== "paused" && requestedState !== "resume") return NextResponse.json({ error: "Choose a valid monitoring action." }, { status: 400 });
    const { data: config, error } = await db.from("vendor_monitoring_configs").select("id,state,source_method,test_completed_at").eq("organization_id", organizationId).eq("organization_vendor_id", relationshipId).maybeSingle();
    if (error) throw error;
    if (!config) return NextResponse.json({ error: "Configure monitoring before pausing or resuming it." }, { status: 409 });
    if (requestedState === "resume" && config.state !== "paused") return NextResponse.json({ error: "Monitoring is not paused." }, { status: 409 });
    const nextState = requestedState === "paused" ? "paused" : config.source_method === "email_forwarding" ? (config.test_completed_at ? "active" : "pending_test") : "manual_tracking";
    const { error: updateError } = await db.from("vendor_monitoring_configs").update({ state: nextState, paused_at: requestedState === "paused" ? new Date().toISOString() : null, updated_by: userId, updated_at: new Date().toISOString() }).eq("id", config.id).eq("organization_id", organizationId);
    if (updateError) throw updateError;
    const { error: auditError } = await db.from("audit_events").insert({ organization_id: organizationId, actor_type: "user", actor_id: userId, action: requestedState === "paused" ? "vendor_monitoring.paused" : "vendor_monitoring.resumed", resource_type: "vendor_relationship", resource_id: relationshipId, safe_metadata: { state: nextState } });
    if (auditError) throw auditError;
    return NextResponse.json({ ok: true, monitoring: await getDurableMonitoringConfig(db, organizationId, relationshipId) });
  } catch (error) {
    return apiError(error, "Failed to update vendor monitoring.");
  }
}
