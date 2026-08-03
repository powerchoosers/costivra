import { NextResponse } from "next/server";
import { apiError, cleanText, cleanUuid } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";

type RouteContext = { params: Promise<{ id: string }> };
const mutableRoles = new Set(["admin", "member", "viewer"]);

async function targetMembership(route: RouteContext) {
  const portal = await requirePortalContext();
  if (!['owner', 'admin'].includes(portal.role)) {
    return { response: NextResponse.json({ error: "Administrator access is required." }, { status: 403 }) };
  }
  const targetUserId = cleanUuid((await route.params).id);
  if (!targetUserId) {
    return { response: NextResponse.json({ error: "Invalid team member." }, { status: 400 }) };
  }
  const membership = await portal.db
    .from("organization_memberships")
    .select("user_id,role")
    .eq("organization_id", portal.organizationId)
    .eq("user_id", targetUserId)
    .maybeSingle();
  if (membership.error) throw membership.error;
  if (!membership.data) {
    return { response: NextResponse.json({ error: "Team member not found." }, { status: 404 }) };
  }
  return { portal, targetUserId, membership: membership.data };
}

export async function PATCH(request: Request, route: RouteContext) {
  try {
    const target = await targetMembership(route);
    if (target.response) return target.response;
    const role = cleanText((await request.json() as Record<string, unknown>).role, 20);
    if (!mutableRoles.has(role)) {
      return NextResponse.json({ error: "Choose a valid team role." }, { status: 400 });
    }
    if (target.membership.role === "owner") {
      return NextResponse.json(
        { error: "Workspace ownership cannot be changed from this control." },
        { status: 409 },
      );
    }
    const update = await target.portal.db
      .from("organization_memberships")
      .update({ role })
      .eq("organization_id", target.portal.organizationId)
      .eq("user_id", target.targetUserId);
    if (update.error) throw update.error;
    const audit = await target.portal.db.from("audit_events").insert({
      organization_id: target.portal.organizationId,
      actor_type: "user",
      actor_id: target.portal.userId,
      action: "team_member.role_updated",
      resource_type: "profile",
      resource_id: target.targetUserId,
      metadata: { previous_role: target.membership.role, role },
    });
    if (audit.error) throw audit.error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: Request, route: RouteContext) {
  try {
    const target = await targetMembership(route);
    if (target.response) return target.response;
    if (target.targetUserId === target.portal.userId) {
      return NextResponse.json(
        { error: "You cannot remove your own workspace access." },
        { status: 409 },
      );
    }
    if (target.membership.role === "owner") {
      return NextResponse.json(
        { error: "Transfer workspace ownership before removing this owner." },
        { status: 409 },
      );
    }
    const removal = await target.portal.db
      .from("organization_memberships")
      .delete()
      .eq("organization_id", target.portal.organizationId)
      .eq("user_id", target.targetUserId);
    if (removal.error) throw removal.error;
    const audit = await target.portal.db.from("audit_events").insert({
      organization_id: target.portal.organizationId,
      actor_type: "user",
      actor_id: target.portal.userId,
      action: "team_member.removed",
      resource_type: "profile",
      resource_id: target.targetUserId,
      metadata: { previous_role: target.membership.role },
    });
    if (audit.error) throw audit.error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
