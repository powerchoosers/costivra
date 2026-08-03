import { NextResponse } from "next/server";
import { apiError, cleanText } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";

export async function POST(request: Request) {
  try {
    const { db, organizationId, role, userId } = await requirePortalContext();
    if (!['owner','admin'].includes(role)) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
    const body = await request.json() as Record<string, unknown>;
    const email = cleanText(body.email, 254).toLowerCase();
    const fullName = cleanText(body.fullName, 120);
    const memberRole = cleanText(body.role, 20) || "member";
    if (!/^\S+@\S+\.\S+$/.test(email) || !['admin','member','viewer'].includes(memberRole)) return NextResponse.json({ error: "Enter a valid email and role." }, { status: 400 });
    // Always make team invitations land on the deployed Costivra app. Supabase
    // otherwise falls back to the project's Site URL, which can accidentally
    // be a developer's localhost address.
    const appUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://costivra.ai";
    const { data: invited, error: inviteError } = await db.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
      redirectTo: `${appUrl.replace(/\/$/, "")}/set-password`,
    });
    if (inviteError) throw inviteError;
    const user = invited.user;
    const { error: profileError } = await db.from("profiles").upsert({ id: user.id, email, full_name: fullName || email }, { onConflict: "id" });
    if (profileError) throw profileError;
    const { error: membershipError } = await db.from("organization_memberships").insert({ organization_id: organizationId, user_id: user.id, role: memberRole, permissions: [] });
    if (membershipError) throw membershipError;
    const { error: auditError } = await db.from("audit_events").insert({
      organization_id: organizationId,
      actor_type: "user",
      actor_id: userId,
      action: "team_member.invited",
      resource_type: "profile",
      resource_id: user.id,
      metadata: { role: memberRole },
    });
    if (auditError) throw auditError;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) { return apiError(error); }
}
