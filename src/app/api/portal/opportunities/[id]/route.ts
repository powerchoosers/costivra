import { NextResponse } from "next/server";
import { apiError, cleanText, cleanUuid } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";
import { workflowRpcError } from "@/lib/portal/workflow-rpc";
import { canAdvanceOpportunityToApproval } from "@/lib/domain/opportunity-trust";

const textValue = (value: unknown) => typeof value === "string" ? value : null;
const objectValue = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

async function findingCanAdvanceToApproval(
  db: Awaited<ReturnType<typeof requirePortalContext>>["db"],
  organizationId: string,
  opportunityId: string,
) {
  const { data: opportunity, error: opportunityError } = await db
    .from("opportunities")
    .select("generated_by,trust_state,source_expense_id,source_document_id,rule_key,rule_version,calculation_inputs,calculation_result")
    .eq("organization_id", organizationId)
    .eq("id", opportunityId)
    .maybeSingle();
  if (opportunityError) throw opportunityError;
  if (!opportunity) return null;

  const { count, error: evidenceError } = await db
    .from("opportunity_evidence")
    .select("opportunity_id", { count: "exact", head: true })
    .eq("opportunity_id", opportunityId);
  if (evidenceError) throw evidenceError;

  return canAdvanceOpportunityToApproval({
    generatedBy: textValue(opportunity.generated_by),
    explicitTrustState: textValue(opportunity.trust_state),
    sourceRecordId: textValue(opportunity.source_expense_id) ?? textValue(opportunity.source_document_id),
    evidenceCount: count ?? 0,
    ruleKey: textValue(opportunity.rule_key),
    ruleVersion: textValue(opportunity.rule_version),
    calculationInputs: objectValue(opportunity.calculation_inputs),
    calculationResult: objectValue(opportunity.calculation_result),
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { db, organizationId, userId, role } = await requirePortalContext();
    const id = cleanUuid((await params).id);
    if (!id) return NextResponse.json({ error: "Invalid opportunity." }, { status: 400 });
    if (!['owner', 'admin', 'member'].includes(role)) {
      return NextResponse.json({ error: "You do not have permission to update opportunities." }, { status: 403 });
    }
    const body = await request.json() as Record<string, unknown>;
    const status = cleanText(body.status, 30);
    const priority = cleanText(body.priority, 20);
    const deadlineSupplied = Object.prototype.hasOwnProperty.call(body, "deadlineAt");
    const deadlineText = deadlineSupplied ? cleanText(body.deadlineAt, 40) : "";
    if (deadlineText && !Number.isFinite(Date.parse(deadlineText))) {
      return NextResponse.json({ error: "Choose a valid opportunity deadline." }, { status: 400 });
    }
    if (priority && !["high", "medium", "low"].includes(priority)) {
      return NextResponse.json({ error: "Choose a valid opportunity priority." }, { status: 400 });
    }
    if (status === "approved") {
      const readyForApproval = await findingCanAdvanceToApproval(db, organizationId, id);
      if (readyForApproval === null) return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
      if (!readyForApproval) {
        return NextResponse.json({
          error: "This finding needs linked source evidence and a deterministic calculation before an approval plan can be created.",
        }, { status: 409 });
      }
    }
    const { data: actionId, error } = await db.rpc("internal_apply_opportunity_operation", {
      p_organization_id: organizationId,
      p_opportunity_id: id,
      p_actor_id: userId,
      p_status: status || null,
      p_priority: priority || null,
      p_deadline_at: deadlineText || null,
      p_update_deadline: deadlineSupplied,
    });
    if (error) {
      const known = workflowRpcError(error);
      if (known) return NextResponse.json({ error: known.message }, { status: known.status });
      throw error;
    }
    return NextResponse.json({ ok: true, actionId });
  } catch (error) { return apiError(error); }
}
