import { NextResponse } from "next/server";
import { apiError, cleanText } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";

export async function POST(request: Request) {
  try {
    const { db, organizationId, role } = await requirePortalContext();
    if (!['owner','admin'].includes(role)) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
    const body = await request.json() as Record<string, unknown>;
    const email = cleanText(body.email, 254).toLowerCase();
    const fullName = cleanText(body.fullName, 120);
    const memberRole = cleanText(body.role, 20) || "member";
    if (!/^\S+@\S+\.\S+$/.test(email) || !['admin','member','viewer'].includes(memberRole)) return NextResponse.json({ error: "Enter a valid email and role." }, { status: 400 });
    const { data: invited, error: inviteError } = await db.auth.admin.inviteUserByEmail(email, { data: { full_name: fullName } });
    if (inviteError) throw inviteError;
    const user = invited.user;
    const { error: profileError } = await db.from("profiles").upsert({ id: user.id, email, full_name: fullName || email }, { onConflict: "id" });
    if (profileError) throw profileError;
    const { error: membershipError } = await db.from("organization_memberships").insert({ organization_id: organizationId, user_id: user.id, role: memberRole, permissions: [] });
    if (membershipError) throw membershipError;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) { return apiError(error); }
}
