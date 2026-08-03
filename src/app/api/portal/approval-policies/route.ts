import { NextResponse } from "next/server";
import { approvalPolicyInput } from "@/lib/portal/approval-policies";
import { apiError } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";

const canManage = (role: string) => role === "owner" || role === "admin";

export async function POST(request: Request) {
  try {
    const { db, organizationId, role, userId } = await requirePortalContext();
    if (!canManage(role))
      return NextResponse.json(
        { error: "Administrator access is required." },
        { status: 403 },
      );
    const input = approvalPolicyInput(
      (await request.json()) as Record<string, unknown>,
    );
    const duplicate = await db
      .from("approval_policies")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("name", input.name)
      .maybeSingle();
    if (duplicate.error) throw duplicate.error;
    if (duplicate.data)
      return NextResponse.json(
        { error: "An approval policy with this name already exists." },
        { status: 409 },
      );
    const created = await db
      .from("approval_policies")
      .insert({
        organization_id: organizationId,
        name: input.name,
        rule: input.rule,
        is_active: input.isActive,
      })
      .select("id")
      .single();
    if (created.error) throw created.error;
    const audit = await db.from("audit_events").insert({
      organization_id: organizationId,
      actor_type: "user",
      actor_id: userId,
      action: "approval_policy.created",
      resource_type: "approval_policy",
      resource_id: created.data.id,
    });
    if (audit.error) throw audit.error;
    return NextResponse.json({ id: created.data.id }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

