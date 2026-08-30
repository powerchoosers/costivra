import { NextResponse } from "next/server";
import { fetchApolloImage, fetchLogoDevImage, logoDevReference } from "@/lib/brand/logo-dev";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSessionSupabaseClient } from "@/lib/supabase/session";

type Entity = "organization" | "vendor";
type LogoRecord = {
  name?: unknown;
  canonical_name?: unknown;
  website?: unknown;
  logo_url?: unknown;
  logo_provider?: unknown;
};

function fallbackLogo(name: string) {
  const candidate = name.trim().slice(0, 1).toUpperCase();
  const initial = /^[A-Z0-9]$/.test(candidate) ? candidate : "?";
  // Keep the image itself transparent so the authenticated workspace tile can
  // supply the correct Light or Dark surface without recoloring real logos.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="${initial}"><text x="32" y="40" text-anchor="middle" font-family="Arial,sans-serif" font-size="27" font-weight="700" fill="#6f93e8">${initial}</text></svg>`;
  return new NextResponse(svg, {
    status: 200,
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "private, max-age=86400, stale-while-revalidate=604800",
      "content-security-policy": "default-src 'none'; style-src 'none'; sandbox",
      "x-content-type-options": "nosniff",
      "x-logo-source": "fallback",
    },
  });
}

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

  let name: string | null = null;
  let website: string | null = null;
  let existing: string | null = null;
  let provider: string | null = null;
  if (table === "organization") {
    const { data } = await db.from("organizations").select("id,name,logo_url,logo_provider").eq("id", id).maybeSingle();
    const record = data as LogoRecord | null;
    name = typeof record?.name === "string" ? record.name : null;
    existing = typeof record?.logo_url === "string" ? record.logo_url : null;
    provider = typeof record?.logo_provider === "string" ? record.logo_provider : null;
  } else {
    const { data } = await db.from("vendors").select("id,canonical_name,website,logo_url,logo_provider").eq("id", id).maybeSingle();
    const record = data as LogoRecord | null;
    name = typeof record?.canonical_name === "string" ? record.canonical_name : null;
    website = typeof record?.website === "string" ? record.website : null;
    existing = typeof record?.logo_url === "string" ? record.logo_url : null;
    provider = typeof record?.logo_provider === "string" ? record.logo_provider : null;
  }
  if (typeof name !== "string" || !name.trim()) return new NextResponse(null, { status: 404 });
  const reference = existing ?? logoDevReference(name, website);
  const image = provider === "apollo" && existing
    ? await fetchApolloImage(existing) ?? await fetchLogoDevImage(logoDevReference(name, website))
    : await fetchLogoDevImage(reference);
  if (!image) return fallbackLogo(name);

  if (!existing) {
    await db.from(table === "organization" ? "organizations" : "vendors").update({ logo_url: reference, logo_provider: "logo.dev", logo_resolved_at: new Date().toISOString() }).eq("id", id);
  }
  return new NextResponse(image.body, { headers: { "content-type": image.contentType, "cache-control": "private, max-age=604800, stale-while-revalidate=86400", "x-content-type-options": "nosniff" } });
}
