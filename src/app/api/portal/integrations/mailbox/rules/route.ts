import { NextResponse } from "next/server";
import { requirePortalEditor, requirePortalContext } from "@/lib/portal/repository";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/portal/http";

function list(value: unknown) {
  return Array.isArray(value) ? Array.from(new Set(value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim().toLowerCase()))).slice(0, 50) : [];
}

export async function GET() {
  try {
    const { organizationId } = await requirePortalContext();
    const db = createServerSupabaseClient();
    const { data, error } = await db.from("mailbox_vendor_rules").select("id,mailbox_connection_id,organization_vendor_id,sender_domains,sender_addresses,subject_terms,enabled,created_at,updated_at").eq("organization_id", organizationId).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return NextResponse.json({ rules: data ?? [] });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const { organizationId, userId } = await requirePortalEditor();
    const body = await request.json() as Record<string, unknown>;
    const mailboxConnectionId = typeof body.mailboxConnectionId === "string" ? body.mailboxConnectionId : "";
    const organizationVendorId = typeof body.organizationVendorId === "string" ? body.organizationVendorId : "";
    const senderDomains = list(body.senderDomains);
    const senderAddresses = list(body.senderAddresses);
    const subjectTerms = list(body.subjectTerms);
    if (!mailboxConnectionId || !organizationVendorId || senderDomains.length + senderAddresses.length + subjectTerms.length === 0) return NextResponse.json({ error: "A mailbox, vendor, and at least one sender or subject matcher are required." }, { status: 400 });
    const db = createServerSupabaseClient();
    const { data: connection } = await db.from("mailbox_oauth_connections").select("id").eq("id", mailboxConnectionId).eq("organization_id", organizationId).eq("status", "connected").maybeSingle();
    const { data: vendor } = await db.from("organization_vendors").select("id").eq("id", organizationVendorId).eq("organization_id", organizationId).maybeSingle();
    if (!connection || !vendor) return NextResponse.json({ error: "Mailbox or vendor is not available in this organization." }, { status: 404 });
    const { data, error } = await db.from("mailbox_vendor_rules").upsert({ organization_id: organizationId, mailbox_connection_id: mailboxConnectionId, organization_vendor_id: organizationVendorId, sender_domains: senderDomains, sender_addresses: senderAddresses, subject_terms: subjectTerms, enabled: true, created_by: userId, updated_by: userId, updated_at: new Date().toISOString() }, { onConflict: "mailbox_connection_id,organization_vendor_id" }).select("id,mailbox_connection_id,organization_vendor_id,sender_domains,sender_addresses,subject_terms,enabled").single();
    if (error) throw new Error(error.message);
    await db.from("audit_events").insert({ organization_id: organizationId, actor_type: "user", actor_id: userId, action: "mailbox.vendor_rule_updated", resource_type: "mailbox_vendor_rule", resource_id: data.id, metadata: { senderDomains, senderAddresses, subjectTerms } });
    return NextResponse.json({ rule: data }, { status: 201 });
  } catch (error) { return apiError(error); }
}
