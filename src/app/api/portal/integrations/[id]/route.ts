import { NextResponse } from "next/server";
import { apiError, cleanUuid } from "@/lib/portal/http";
import { requirePortalEditor } from "@/lib/portal/repository";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { db, organizationId, userId } = await requirePortalEditor();
    const id = cleanUuid((await params).id);
    const { data: integration } = await db.from("integrations").select("id,provider,status").eq("id", id).eq("organization_id", organizationId).maybeSingle();
    if (!integration) return NextResponse.json({ error: "Integration not found." }, { status: 404 });
    const provider = integration.provider === "gmail" ? "google_gmail" : integration.provider === "microsoft-365" ? "microsoft_graph" : null;
    if (provider) {
      const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || new URL(request.url).origin;
      return NextResponse.json({ authorizationUrl: `${origin}/api/portal/integrations/mailbox/${provider}/start` });
    }
    await db.from("audit_events").insert({
      organization_id: organizationId,
      actor_type: "user",
      actor_id: userId,
      action: "integration.setup_requested",
      resource_type: "integration",
      resource_id: id,
    });
    return NextResponse.json(
      { error: `${integration.provider} setup is not available in-product yet.` },
      { status: 501 },
    );
  } catch (error) { return apiError(error); }
}
