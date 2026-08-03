import { NextResponse } from "next/server";
import { approvalPolicyInput } from "@/lib/portal/approval-policies";
import { apiError, cleanUuid } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";

type RouteContext = { params: Promise<{ id: string }> };
const canManage = (role: string) => role === "owner" || role === "admin";

async function scopedPolicy(route: RouteContext) {
  const portal = await requirePortalContext();
  if (!canManage(portal.role))
    return { response: NextResponse.json({ error: "Administrator access is required." }, { status: 403 }) };
  const id = cleanUuid((await route.params).id);
  if (!id)
    return { response: NextResponse.json({ error: "Invalid approval policy." }, { status: 400 }) };
  const existing = await portal.db
    .from("approval_policies")
    .select("id,name,is_active")
    .eq("id", id)
    .eq("organization_id", portal.organizationId)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (!existing.data)
    return { response: NextResponse.json({ error: "Approval policy not found." }, { status: 404 }) };
  return { portal, id, existing: existing.data };
}

export async function PATCH(request: Request, route: RouteContext) {
  try {
    const scoped = await scopedPolicy(route);
    if ("response" in scoped) return scoped.response;
    const input = approvalPolicyInput(
      (await request.json()) as Record<string, unknown>,
    );
    const duplicate = await scoped.portal.db
      .from("approval_policies")
      .select("id")
      .eq("organization_id", scoped.portal.organizationId)
      .eq("name", input.name)
      .neq("id", scoped.id)
      .maybeSingle();
    if (duplicate.error) throw duplicate.error;
    if (duplicate.data)
      return NextResponse.json(
        { error: "An approval policy with this name already exists." },
        { status: 409 },
      );
    const updated = await scoped.portal.db
      .from("approval_policies")
      .update({
        name: input.name,
        rule: input.rule,
        is_active: input.isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", scoped.id)
      .eq("organization_id", scoped.portal.organizationId);
    if (updated.error) throw updated.error;
    const audit = await scoped.portal.db.from("audit_events").insert({
      organization_id: scoped.portal.organizationId,
      actor_type: "user",
      actor_id: scoped.portal.userId,
      action: input.isActive
        ? "approval_policy.updated"
        : "approval_policy.disabled",
      resource_type: "approval_policy",
      resource_id: scoped.id,
    });
    if (audit.error) throw audit.error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: Request, route: RouteContext) {
  try {
    const scoped = await scopedPolicy(route);
    if ("response" in scoped) return scoped.response;
    const updated = await scoped.portal.db
      .from("approval_policies")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", scoped.id)
      .eq("organization_id", scoped.portal.organizationId);
    if (updated.error) throw updated.error;
    const audit = await scoped.portal.db.from("audit_events").insert({
      organization_id: scoped.portal.organizationId,
      actor_type: "user",
      actor_id: scoped.portal.userId,
      action: "approval_policy.disabled",
      resource_type: "approval_policy",
      resource_id: scoped.id,
    });
    if (audit.error) throw audit.error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
