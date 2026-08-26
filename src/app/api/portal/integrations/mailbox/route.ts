import { NextResponse } from "next/server";
import { requirePortalEditor, requirePortalContext } from "@/lib/portal/repository";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/portal/http";

export async function GET() {
  try {
    const { organizationId } = await requirePortalContext();
    const db = createServerSupabaseClient();
    const { data, error } = await db.from("mailbox_oauth_connections").select("id,provider,provider_email,status,granted_scopes,last_synced_at,last_error_code,connected_at,disconnected_at").eq("organization_id", organizationId).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return NextResponse.json({ connections: data ?? [] });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request) {
  try {
    const { organizationId, userId } = await requirePortalEditor();
    const db = createServerSupabaseClient();
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Connection id is required." }, { status: 400 });
    const { data: connection, error: lookupError } = await db.from("mailbox_oauth_connections").select("id,provider").eq("id", id).eq("organization_id", organizationId).maybeSingle();
    if (lookupError) throw new Error(lookupError.message);
    if (!connection) return NextResponse.json({ error: "Mailbox connection was not found." }, { status: 404 });
    const { error } = await db.from("mailbox_oauth_connections").delete().eq("id", id).eq("organization_id", organizationId);
    if (error) throw new Error(error.message);
    await db.from("audit_events").insert({ organization_id: organizationId, actor_type: "user", actor_id: userId, action: "mailbox.disconnected", resource_type: "mailbox_oauth_connection", resource_id: id, metadata: { provider: connection.provider, stored_tokens_deleted: true } });
    return NextResponse.json({ disconnected: true });
  } catch (error) { return apiError(error); }
}
