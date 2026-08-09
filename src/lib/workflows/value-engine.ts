import { calculateVerifiedAnnualSavings, evaluateExpenseChange, EXPENSE_CHANGE_RULE_VERSION, SAVINGS_METHOD_VERSION } from "@/lib/domain/value-engine";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveCategoryTrace, withCategoryTrace } from "./category-trace";
import { sendLifecycleEmailToWorkspace } from "@/lib/email/lifecycle-recipient";

type DatabaseClient = ReturnType<typeof createServerSupabaseClient>;
type Row = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

function expensePeriod(row: Row) {
  return {
    id: text(row.id),
    amount: text(row.amount),
    currency: text(row.currency),
    category: text(row.category),
    periodStart: text(row.period_start),
    periodEnd: text(row.period_end),
  };
}

export function shouldNotifyFindingReady(input: {
  hasEvidence: boolean;
  trustState: string | null;
  customerVisible: boolean;
}) {
  return input.hasEvidence
    && input.trustState === "evidence_backed"
    && input.customerVisible;
}

export async function evaluateApprovedExpense(input: {
  db: DatabaseClient;
  organizationId: string;
  expenseId: string;
  actorId?: string | null;
}) {
  const { data: current, error: currentError } = await input.db.from("expenses")
    .select("id,organization_id,organization_vendor_id,expense_account_id,document_id,category,period_start,period_end,amount,currency")
    .eq("id", input.expenseId).eq("organization_id", input.organizationId).maybeSingle();
  if (currentError) throw currentError;
  if (!current?.document_id || !current.expense_account_id) return { opportunityId: null, savingsReady: 0 };

  const { data: prior, error: priorError } = await input.db.from("expenses")
    .select("id,document_id,category,period_start,period_end,amount,currency")
    .eq("organization_id", input.organizationId)
    .eq("expense_account_id", current.expense_account_id)
    .eq("category", current.category)
    .eq("currency", current.currency)
    .lt("period_end", current.period_start)
    .order("period_end", { ascending: false })
    .limit(1).maybeSingle();
  if (priorError) throw priorError;

  let opportunityId: string | null = null;
  if (prior?.document_id) {
    const finding = evaluateExpenseChange(expensePeriod(current), expensePeriod(prior));
    if (finding) {
      const categoryTrace = await resolveCategoryTrace(text(current.category));
      const { data: opportunity, error: opportunityError } = await input.db.from("opportunities").upsert({
        organization_id: input.organizationId,
        expense_account_id: current.expense_account_id,
        type: finding.type,
        title: finding.title,
        summary: finding.summary,
        status: "under_review",
        confidence: finding.confidence,
        estimated_annual_value: finding.estimatedAnnualValue,
        currency: current.currency,
        calculation_version: EXPENSE_CHANGE_RULE_VERSION,
        priority: finding.priority,
        category: current.category,
        rule_key: finding.ruleKey,
        rule_version: EXPENSE_CHANGE_RULE_VERSION,
        source_expense_id: current.id,
        baseline_expense_id: prior.id,
        calculation_inputs: withCategoryTrace(finding.calculationInputs, categoryTrace),
        calculation_result: finding.calculationResult,
        assumptions: finding.assumptions,
        generated_by: "deterministic_rule",
        last_evaluated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "organization_id,rule_key,source_expense_id" }).select("id,trust_state,customer_visible").single();
      if (opportunityError) throw opportunityError;
      opportunityId = opportunity.id as string;

      const { data: evidence, error: evidenceError } = await input.db.from("evidence_references")
        .select("id").in("document_id", [current.document_id, prior.document_id])
        .eq("field_path", "invoice.totalAmount");
      if (evidenceError) throw evidenceError;
      if (evidence?.length) {
        const { error: linkError } = await input.db.from("opportunity_evidence").upsert(
          evidence.map((item) => ({ opportunity_id: opportunity.id, evidence_reference_id: item.id, role: "supporting" })),
          { onConflict: "opportunity_id,evidence_reference_id" },
        );
        if (linkError) throw linkError;

        // Deterministic, source-linked findings can be promoted to the
        // evidence-backed trust state. Preserve explicit operator labels and
        // customer hiding decisions instead of overwriting them.
        let trustState = typeof opportunity.trust_state === "string" ? opportunity.trust_state : null;
        if (trustState === "needs_evidence") {
          const { error: trustError } = await input.db.from("opportunities")
            .update({ trust_state: "evidence_backed", customer_visible: opportunity.customer_visible !== false, updated_at: new Date().toISOString() })
            .eq("id", opportunity.id)
            .eq("organization_id", input.organizationId)
            .eq("trust_state", "needs_evidence");
          if (trustError) throw trustError;
          trustState = "evidence_backed";
        }
        // Keep the in-memory state aligned with the successful promotion so
        // the lifecycle notification is emitted only for this evidence-backed
        // finding, not for a stale pre-promotion value.
        opportunity.trust_state = trustState;
      }
      await input.db.from("audit_events").insert({
        organization_id: input.organizationId,
        actor_type: input.actorId ? "user" : "service",
        actor_id: input.actorId ?? null,
        action: "opportunity.deterministic_rule_evaluated",
        resource_type: "opportunity",
        resource_id: opportunity.id,
      });

      // The opportunity is evidence-linked and deterministic at this point.
      // Email failure must not roll back the financial workflow; the durable
      // side-effect ledger makes retries safe.
      const trustState = typeof opportunity.trust_state === "string" ? opportunity.trust_state : null;
      const customerVisible = opportunity.customer_visible !== false;
      const canNotify = shouldNotifyFindingReady({
        hasEvidence: Boolean(evidence?.length),
        trustState,
        customerVisible,
      });
      if (canNotify) try {
        const { data: vendor } = current.organization_vendor_id
          ? await input.db.from("organization_vendors").select("display_name_override,vendors(canonical_name)").eq("id", current.organization_vendor_id).eq("organization_id", input.organizationId).maybeSingle()
          : { data: null };
        const vendorName = typeof vendor?.display_name_override === "string" && vendor.display_name_override.trim()
          ? vendor.display_name_override
          : typeof (vendor?.vendors as unknown as { canonical_name?: unknown } | null)?.canonical_name === "string"
            ? (vendor?.vendors as unknown as { canonical_name: string }).canonical_name
            : undefined;
        const amountCents = finding.estimatedAnnualValue == null ? undefined : Math.round(Number(finding.estimatedAnnualValue) * 100);
        await sendLifecycleEmailToWorkspace({
          db: input.db,
          kind: "finding_ready",
          organizationId: input.organizationId,
          payload: {
            vendorName,
            findingTitle: finding.title,
            amountCents: Number.isFinite(amountCents) ? amountCents : undefined,
            sourceRecordId: opportunity.id as string,
          },
        });
      } catch (emailError) {
        console.error("finding lifecycle email failed", emailError);
      }
    }
  }

  const savingsReady = await attachComparisonToSavings({ ...input, current });
  return { opportunityId, savingsReady };
}

async function attachComparisonToSavings(input: {
  db: DatabaseClient;
  organizationId: string;
  actorId?: string | null;
  current: Row;
}) {
  const { data: opportunities, error: opportunityError } = await input.db.from("opportunities")
    .select("id").eq("organization_id", input.organizationId)
    .eq("expense_account_id", input.current.expense_account_id);
  if (opportunityError) throw opportunityError;
  const opportunityIds = (opportunities ?? []).map((item) => item.id as string);
  if (!opportunityIds.length) return 0;

  const [{ data: outcomes, error: outcomeError }, { data: completedActions, error: actionError }] = await Promise.all([
    input.db.from("savings_outcomes").select("id,opportunity_id,baseline_expense_id")
      .eq("organization_id", input.organizationId).eq("status", "evidence_pending").in("opportunity_id", opportunityIds),
    input.db.from("action_plans").select("opportunity_id").eq("status", "complete").in("opportunity_id", opportunityIds),
  ]);
  if (outcomeError) throw outcomeError;
  if (actionError) throw actionError;
  const completed = new Set((completedActions ?? []).map((item) => item.opportunity_id as string));
  const eligible = (outcomes ?? []).filter((item) => completed.has(item.opportunity_id as string) && item.baseline_expense_id !== input.current.id);
  if (!eligible.length) return 0;

  const baselineIds = [...new Set(eligible.map((item) => item.baseline_expense_id as string).filter(Boolean))];
  const { data: baselines, error: baselineError } = await input.db.from("expenses")
    .select("id,category,period_start,period_end,amount,currency").in("id", baselineIds).eq("organization_id", input.organizationId);
  if (baselineError) throw baselineError;
  const baselineById = new Map((baselines ?? []).map((item) => [item.id as string, item as Row]));
  let ready = 0;
  for (const outcome of eligible) {
    const baseline = baselineById.get(outcome.baseline_expense_id as string);
    if (!baseline) continue;
    const calculation = calculateVerifiedAnnualSavings(expensePeriod(baseline), expensePeriod(input.current));
    if (!calculation) continue;
    const { error: updateError } = await input.db.from("savings_outcomes").update({
      comparison_expense_id: input.current.id,
      comparison_amount: input.current.amount,
      amount: calculation.amount,
      method: "Annualized comparison of accepted baseline and later approved invoice",
      method_version: SAVINGS_METHOD_VERSION,
      calculation_inputs: calculation.calculationInputs,
      calculation_result: calculation.calculationResult,
      assumptions: calculation.assumptions,
      status: "ready_for_review",
    }).eq("id", outcome.id).eq("organization_id", input.organizationId).eq("status", "evidence_pending");
    if (updateError) throw updateError;
    ready += 1;
  }
  return ready;
}
