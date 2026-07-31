import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSessionSupabaseClient } from "@/lib/supabase/session";

type ClaimRecord = Record<string, unknown>;

function adminEmails() {
  return new Set(
    (process.env.COSTIVRA_INTERNAL_ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function requireInternalOperator() {
  const session = await createSessionSupabaseClient();
  const { data, error } = await session.auth.getClaims();
  const claims = data?.claims as ClaimRecord | undefined;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;
  const email =
    typeof claims?.email === "string"
      ? claims.email.trim().toLowerCase()
      : null;
  if (error || !userId || !email) throw new Error("AUTH_REQUIRED");

  const db = createServerSupabaseClient();
  const { data: staff, error: staffError } = await db
    .from("internal_staff_users")
    .select("role,status")
    .eq("user_id", userId)
    .maybeSingle();
  if (staffError) throw staffError;

  let role =
    staff?.status === "active" &&
    (staff.role === "owner" || staff.role === "operator")
      ? (staff.role as "owner" | "operator")
      : null;

  if (!role && adminEmails().has(email)) {
    const metadata =
      claims?.user_metadata && typeof claims.user_metadata === "object"
        ? (claims.user_metadata as ClaimRecord)
        : {};
    const fullName =
      typeof metadata.full_name === "string" ? metadata.full_name.trim() : null;
    await db
      .from("profiles")
      .upsert(
        { id: userId, email, full_name: fullName || email },
        { onConflict: "id" },
      );
    const { error: allowError } = await db
      .from("internal_staff_users")
      .upsert(
        { user_id: userId, role: "owner", status: "active" },
        { onConflict: "user_id" },
      );
    if (allowError) throw allowError;
    role = "owner";
  }

  if (!role) throw new Error("INTERNAL_ACCESS_REQUIRED");
  const { data: profile } = await db
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();
  if (role === "owner") {
    const { error: mailboxClaimError } = await db
      .from("crm_mailboxes")
      .update({
        assigned_to: userId,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq("address", email)
      .is("assigned_to", null);
    if (mailboxClaimError) throw mailboxClaimError;
  }
  return {
    db,
    userId,
    email,
    fullName:
      typeof profile?.full_name === "string" && profile.full_name
        ? profile.full_name
        : email,
    role,
  };
}

export async function requireInternalOwner() {
  const operator = await requireInternalOperator();
  if (operator.role !== "owner") throw new Error("OWNER_ACCESS_REQUIRED");
  return operator;
}

export function manageApiError(error: unknown) {
  const message = error instanceof Error ? error.message : "INTERNAL_ERROR";
  if (message === "AUTH_REQUIRED")
    return { status: 401, error: "Please sign in again." };
  if (message === "INTERNAL_ACCESS_REQUIRED")
    return {
      status: 403,
      error: "This account is not authorized for the Costivra owner portal.",
    };
  if (message === "OWNER_ACCESS_REQUIRED")
    return {
      status: 403,
      error: "Only a Costivra owner can manage mailbox seats.",
    };
  if (message === "MAILBOX_ACCESS_REQUIRED")
    return {
      status: 403,
      error: "You do not have access to that mailbox.",
    };
  console.error("Owner portal API error:", message);
  return {
    status: 500,
    error: "The owner portal could not complete that request.",
  };
}
