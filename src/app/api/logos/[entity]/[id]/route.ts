import { NextResponse } from "next/server";
import { fetchLogoDevImage, logoDevReference } from "@/lib/brand/logo-dev";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSessionSupabaseClient } from "@/lib/supabase/session";

type Entity = "organization" | "vendor";

async function actorId() {
  const session = await createSessionSupabaseClient();
  const { data, error } = await session.auth.getClaims();
  const userId = data?.claims?.sub;
  return !error && typeof userId === "string" ? userId : null;
}

async function isInternalOperator(db: ReturnType<typeof createServerSupabaseClient>, userId: string) {
  const { data } = await db.from("internal_staff_users").select("role,status").eq("user_id", userId).maybeSingle();
  return data?.status === "active" && (data.role === "owner" || data.role === "operator");
}

export async function GET(_: Request, { params }: { params: Promise<{ entity: string; id: string }> }) {
  const { entity, id } = await params;
  if (entity !== "organization" && entity !== "vendor") return new NextResponse(null, { status: 404 });
  const userId = await actorId();
  if (!userId) return new NextResponse(null, { status: 401 });
  const db = createServerSupabaseClient();
  const internal = await isInternalOperator(db, userId);
  const table: Entity = entity;

  if (!internal) {
    if (table === "organization") {
      const { data: membership } = await db.from("organization_memberships").select("organization_id").eq("organization_id", id).eq("user_id", userId).maybeSingle();
      if (!membership) return new NextResponse(null, { status: 403 });
    } else {
      const { data: memberships } = await db.from("organization_memberships").select("organization_id").eq("user_id", userId);
      const organizationIds = (memberships ?? []).map((membership) => membership.organization_id);
      if (!organizationIds.length) return new NextResponse(null, { status: 403 });
      const { data: relationship } = await db.from("organization_vendors").select("id").eq("vendor_id", id).in("organization_id", organizationIds).limit(1).maybeSingle();
      if (!relationship) return new NextResponse(null, { status: 403 });
    }
  }

  const select = table === "organization" ? "id,name,logo_url" : "id,canonical_name,website,logo_url";
  const { data: record } = await db.from(table === "organization" ? "organizations" : "vendors").select(select).eq("id", id).maybeSingle();
  if (!record) return new NextResponse(null, { status: 404 });
  const name = table === "organization" ? record.name : record.canonical_name;
  if (typeof name !== "string" || !name.trim()) return new NextResponse(null, { status: 404 });
  const existing = typeof record.logo_url === "string" ? record.logo_url : null;
  const reference = existing ?? logoDevReference(name, table === "vendor" && typeof record.website === "string" ? record.website : null);
  const image = await fetchLogoDevImage(reference);
  if (!image) return new NextResponse(null, { status: 404 });

  if (!existing) {
    await db.from(table === "organization" ? "organizations" : "vendors").update({ logo_url: reference, logo_provider: "logo.dev", logo_resolved_at: new Date().toISOString() }).eq("id", id);
  }
  return new NextResponse(image.body, { headers: { "content-type": image.contentType, "cache-control": "private, max-age=604800, stale-while-revalidate=86400", "x-content-type-options": "nosniff" } });
}
