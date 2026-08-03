import { NextResponse } from "next/server";
import { apiError, cleanUuid } from "@/lib/portal/http";
import { requirePortalEditor } from "@/lib/portal/repository";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { db, organizationId, userId } = await requirePortalEditor();
    const id = cleanUuid((await params).id);
    const { data: integration } = await db.from("integrations").select("id,provider,status").eq("id", id).eq("organization_id", organizationId).maybeSingle();
    if (!integration) return NextResponse.json({ error: "Integration not found." }, { status: 404 });
    // These catalog records describe planned provider adapters. A status label
    // must never impersonate OAuth authorization or a successful data sync.
    // When a provider adapter is implemented, it needs its own OAuth callback,
    // encrypted token storage, revocation, sync worker, and verification tests.
    await db.from("audit_events").insert({
      organization_id: organizationId,
      actor_type: "user",
      actor_id: userId,
      action: "integration.setup_requested",
      resource_type: "integration",
      resource_id: id,
    });
    return NextResponse.json(
      { error: `${integration.provider} setup is not available in-product yet. Email forwarding is the live automated intake path.` },
      { status: 501 },
    );
  } catch (error) { return apiError(error); }
}
