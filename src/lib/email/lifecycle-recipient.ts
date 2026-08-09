import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendLifecycleEmail, type LifecycleEmailKind, type LifecycleEmailPayload } from "./lifecycle";

type WorkspaceEmailInput = {
  db: SupabaseClient;
  kind: LifecycleEmailKind;
  organizationId: string;
  payload: LifecycleEmailPayload;
  roles?: readonly string[];
};

/**
 * Resolve recipients from the current organization membership at send time.
 * The membership check prevents stale schedules or removed users from
 * receiving private workspace notifications.
 */
export async function sendLifecycleEmailToWorkspace(input: WorkspaceEmailInput) {
  const roles = input.roles ?? ["owner", "admin"];
  const { data: members, error } = await input.db
    .from("organization_memberships")
    .select("user_id,role,profiles(email,full_name)")
    .eq("organization_id", input.organizationId)
    .in("role", [...roles]);
  if (error) throw error;

  const seen = new Set<string>();
  const results = [];
  for (const member of members ?? []) {
    const profile = member.profiles as unknown as { email?: string; full_name?: string } | null;
    const email = profile?.email?.trim().toLowerCase();
    if (!email || !email.includes("@") || seen.has(email)) continue;
    seen.add(email);
    results.push(await sendLifecycleEmail(input.db, {
      kind: input.kind,
      organizationId: input.organizationId,
      recipientEmail: email,
      recipientName: profile?.full_name ?? undefined,
      payload: input.payload,
    }));
  }
  return results;
}
