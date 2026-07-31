import { NextRequest, NextResponse } from "next/server";
import { resolveAccessDestination } from "@/lib/auth/access";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSessionSupabaseClient } from "@/lib/supabase/session";

type ClaimRecord = Record<string, unknown>;

function configuredAdminEmails() {
  return new Set(
    (process.env.COSTIVRA_INTERNAL_ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function GET(request: NextRequest) {
  const session = await createSessionSupabaseClient();
  const { data, error } = await session.auth.getClaims();
  const claims = data?.claims as ClaimRecord | undefined;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;
  const email = typeof claims?.email === "string" ? claims.email.trim().toLowerCase() : null;

  if (error || !userId || !email) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const db = createServerSupabaseClient();
  const [staffResult, membershipResult] = await Promise.all([
    db
      .from("internal_staff_users")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle(),
    db
      .from("organization_memberships")
      .select("organization_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle(),
  ]);

  if (staffResult.error) throw staffResult.error;
  if (membershipResult.error) throw membershipResult.error;

  const destination = resolveAccessDestination({
    internal:
      staffResult.data?.status === "active" || configuredAdminEmails().has(email),
    hasMembership: Boolean(membershipResult.data),
    requested: request.nextUrl.searchParams.get("next"),
  });

  return NextResponse.redirect(new URL(destination, request.url));
}
