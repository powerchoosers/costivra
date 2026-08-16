import { randomBytes, randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { evaluateApprovedExpense } from "@/lib/workflows/value-engine";

const runLive = process.env.RUN_LIVE_SUPABASE_TESTS === "1";
const suite = runLive ? describe : describe.skip;

function requiredEnvironmentVariable(name: string) {
  const value = process.env[name];
  if (!value || value === "Encrypted" || value.includes("[SENSITIVE]")) {
    throw new Error(`${name} must contain a real value to run live Supabase tests.`);
  }
  return value;
}

suite.sequential("live atomic invoice-to-savings workflow", () => {
  let admin: SupabaseClient;
  let userId = "";
  let organizationId = "";
  let vendorId = "";
  let opportunityId = "";
  let laterExpenseId = "";
  let increaseExpenseId = "";

  beforeAll(async () => {
    admin = createClient(
      requiredEnvironmentVariable("NEXT_PUBLIC_SUPABASE_URL"),
      requiredEnvironmentVariable("SUPABASE_SECRET_KEY"),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const nonce = randomUUID();
    const created = await admin.auth.admin.createUser({
      email: `costivra-workflow-test-${nonce}@example.invalid`,
      password: `${randomBytes(24).toString("base64url")}Aa1!`,
      email_confirm: true,
      user_metadata: {
        full_name: "Workflow regression owner",
        company_name: `Costivra atomic workflow regression ${nonce}`,
      },
    });
    if (created.error || !created.data.user) throw created.error;
    userId = created.data.user.id;

    const membership = await admin.from("organization_memberships")
      .select("organization_id").eq("user_id", userId).single();
    if (membership.error || !membership.data) throw membership.error;
    organizationId = membership.data.organization_id as string;

    const vendor = await admin.from("vendors").insert({
      canonical_name: `Atomic Workflow Telecom ${nonce}`,
      category: "Telecom",
    }).select("id").single();
    if (vendor.error || !vendor.data) throw vendor.error;
    vendorId = vendor.data.id as string;

    const relationship = await admin.from("organization_vendors").insert({
      organization_id: organizationId,
      vendor_id: vendorId,
      spend_cadence: "monthly",
    }).select("id").single();
    if (relationship.error || !relationship.data) throw relationship.error;
    const relationshipId = relationship.data.id as string;

    const account = await admin.from("expense_accounts").insert({
      organization_id: organizationId,
      organization_vendor_id: relationshipId,
      category: "Telecom",
      external_account_reference: `workflow-${nonce}`,
    }).select("id").single();
    if (account.error || !account.data) throw account.error;
    const accountId = account.data.id as string;

    const documents = await admin.from("documents").insert([
      { organization_id: organizationId, organization_vendor_id: relationshipId, storage_path: `${organizationId}/workflow/prior-${nonce}.pdf`, original_filename: "prior.pdf", mime_type: "application/pdf", byte_size: 1, sha256: randomBytes(32).toString("hex"), status: "ready", uploaded_by: userId, document_type: "invoice" },
      { organization_id: organizationId, organization_vendor_id: relationshipId, storage_path: `${organizationId}/workflow/source-${nonce}.pdf`, original_filename: "source.pdf", mime_type: "application/pdf", byte_size: 1, sha256: randomBytes(32).toString("hex"), status: "ready", uploaded_by: userId, document_type: "invoice" },
      { organization_id: organizationId, organization_vendor_id: relationshipId, storage_path: `${organizationId}/workflow/increase-${nonce}.pdf`, original_filename: "increase.pdf", mime_type: "application/pdf", byte_size: 1, sha256: randomBytes(32).toString("hex"), status: "ready", uploaded_by: userId, document_type: "invoice" },
      { organization_id: organizationId, organization_vendor_id: relationshipId, storage_path: `${organizationId}/workflow/later-${nonce}.pdf`, original_filename: "later.pdf", mime_type: "application/pdf", byte_size: 1, sha256: randomBytes(32).toString("hex"), status: "ready", uploaded_by: userId, document_type: "invoice" },
    ]).select("id,original_filename");
    if (documents.error || !documents.data) throw documents.error;
    const documentId = (name: string) => documents.data?.find((item) => item.original_filename === name)?.id as string;

    const expenses = await admin.from("expenses").insert([
      { organization_id: organizationId, organization_vendor_id: relationshipId, expense_account_id: accountId, document_id: documentId("prior.pdf"), category: "Telecom", period_start: "2026-01-01", period_end: "2026-01-31", amount: "1000.00", currency: "USD", status: "reviewed" },
      { organization_id: organizationId, organization_vendor_id: relationshipId, expense_account_id: accountId, document_id: documentId("source.pdf"), category: "Telecom", period_start: "2026-02-01", period_end: "2026-02-28", amount: "1250.00", currency: "USD", status: "reviewed" },
      { organization_id: organizationId, organization_vendor_id: relationshipId, expense_account_id: accountId, document_id: documentId("increase.pdf"), category: "Telecom", period_start: "2026-03-01", period_end: "2026-03-31", amount: "1800.00", currency: "USD", status: "reviewed" },
      { organization_id: organizationId, organization_vendor_id: relationshipId, expense_account_id: accountId, document_id: documentId("later.pdf"), category: "Telecom", period_start: "2026-04-01", period_end: "2026-04-30", amount: "900.00", currency: "USD", status: "reviewed" },
    ]).select("id,document_id");
    if (expenses.error || !expenses.data) throw expenses.error;
    const sourceExpenseId = expenses.data.find((item) => item.document_id === documentId("source.pdf"))?.id as string;
    increaseExpenseId = expenses.data.find((item) => item.document_id === documentId("increase.pdf"))?.id as string;
    laterExpenseId = expenses.data.find((item) => item.document_id === documentId("later.pdf"))?.id as string;

    const evidence = await admin.from("evidence_references").insert([
      { document_id: documentId("source.pdf"), page_number: 1, field_path: "invoice.totalAmount", text_excerpt: "Synthetic source invoice total: $1,250.00" },
      { document_id: documentId("increase.pdf"), page_number: 1, field_path: "invoice.totalAmount", text_excerpt: "Synthetic increase invoice total: $1,500.00" },
    ]).select("id,document_id");
    if (evidence.error || !evidence.data || evidence.data.length !== 2) throw evidence.error ?? new Error("Synthetic evidence references were not created.");

    const opportunity = await admin.from("opportunities").insert({
      organization_id: organizationId,
      expense_account_id: accountId,
      type: "price_increase",
      title: "Atomic telecom workflow regression",
      summary: "Disposable workflow fixture",
      status: "under_review",
      priority: "medium",
      currency: "USD",
      source_expense_id: sourceExpenseId,
      generated_by: "deterministic_rule",
    }).select("id").single();
    if (opportunity.error || !opportunity.data) throw opportunity.error;
    opportunityId = opportunity.data.id as string;
  }, 30_000);

  afterAll(async () => {
    if (!admin) return;
    if (organizationId) await admin.from("organizations").delete().eq("id", organizationId);
    if (vendorId) await admin.from("vendors").delete().eq("id", vendorId);
    if (userId) await admin.auth.admin.deleteUser(userId);
  }, 30_000);

  it("moves one authorized decision atomically from opportunity to verified savings", async () => {
    const generated = await evaluateApprovedExpense({
      db: admin as Parameters<typeof evaluateApprovedExpense>[0]["db"],
      organizationId,
      expenseId: increaseExpenseId,
      actorId: userId,
    });
    expect(typeof generated.opportunityId).toBe("string");
    expect(generated.opportunityId).toMatch(/^[0-9a-f-]{36}$/i);
    const evidenceBackedFinding = await admin.from("opportunities")
      .select("trust_state,customer_visible,generated_by,rule_key,rule_version,calculation_inputs,calculation_result")
      .eq("id", generated.opportunityId)
      .single();
    expect(evidenceBackedFinding.error).toBeNull();
    expect(evidenceBackedFinding.data).toMatchObject({
      trust_state: "evidence_backed",
      customer_visible: true,
      generated_by: "deterministic_rule",
      rule_key: "telecom_price_increase",
      rule_version: "expense-change-v1",
    });
    const evidenceLinks = await admin.from("opportunity_evidence")
      .select("evidence_reference_id")
      .eq("opportunity_id", generated.opportunityId);
    expect(evidenceLinks.error).toBeNull();
    expect(evidenceLinks.data?.length).toBeGreaterThanOrEqual(2);

    const approvedOpportunity = await admin.rpc("internal_apply_opportunity_operation", {
      p_organization_id: organizationId,
      p_opportunity_id: opportunityId,
      p_actor_id: userId,
      p_status: "approved",
      p_priority: null,
      p_deadline_at: null,
      p_update_deadline: false,
    });
    expect(approvedOpportunity.error).toBeNull();
    const actionId = approvedOpportunity.data as string;
    expect(actionId).toMatch(/^[0-9a-f-]{36}$/i);

    const approvedAction = await admin.rpc("internal_apply_action_operation", {
      p_organization_id: organizationId,
      p_action_id: actionId,
      p_actor_id: userId,
      p_operation: "approve",
      p_reason: "Approved regression workflow",
    });
    expect(approvedAction.error).toBeNull();

    const prematureStart = await admin.rpc("internal_apply_action_operation", {
      p_organization_id: organizationId,
      p_action_id: actionId,
      p_actor_id: userId,
      p_operation: "start",
      p_reason: null,
    });
    expect(prematureStart.error?.message).toContain("ACTION_BASELINE_ACCEPTANCE_REQUIRED");
    const stateAfterRejectedStart = await admin.from("action_plans")
      .select("status").eq("id", actionId).single();
    expect(stateAfterRejectedStart.data?.status).toBe("approved");

    const savings = await admin.from("savings_outcomes")
      .select("id,status").eq("opportunity_id", opportunityId).single();
    expect(savings.data?.status).toBe("baseline_review");
    const savingsId = savings.data?.id as string;

    expect((await admin.rpc("internal_apply_savings_operation", {
      p_organization_id: organizationId,
      p_savings_id: savingsId,
      p_actor_id: userId,
      p_operation: "accept_baseline",
      p_reason: null,
    })).error).toBeNull();
    expect((await admin.rpc("internal_apply_action_operation", {
      p_organization_id: organizationId,
      p_action_id: actionId,
      p_actor_id: userId,
      p_operation: "start",
      p_reason: null,
    })).error).toBeNull();
    expect((await admin.rpc("internal_apply_action_operation", {
      p_organization_id: organizationId,
      p_action_id: actionId,
      p_actor_id: userId,
      p_operation: "complete",
      p_reason: null,
    })).error).toBeNull();

    const evaluated = await evaluateApprovedExpense({
      db: admin as Parameters<typeof evaluateApprovedExpense>[0]["db"],
      organizationId,
      expenseId: laterExpenseId,
      actorId: userId,
    });
    expect(evaluated.savingsReady).toBe(1);

    const verified = await admin.rpc("internal_apply_savings_operation", {
      p_organization_id: organizationId,
      p_savings_id: savingsId,
      p_actor_id: userId,
      p_operation: "verify",
      p_reason: null,
    });
    expect(verified.error).toBeNull();

    const [outcome, opportunity, audit] = await Promise.all([
      admin.from("savings_outcomes").select("status,amount,comparison_expense_id,verified_by").eq("id", savingsId).single(),
      admin.from("opportunities").select("status").eq("id", opportunityId).single(),
      admin.from("audit_events").select("action").eq("organization_id", organizationId),
    ]);
    expect(outcome.data?.status).toBe("verified");
    expect(Number(outcome.data?.amount)).toBeGreaterThan(0);
    expect(outcome.data?.comparison_expense_id).toBe(laterExpenseId);
    expect(outcome.data?.verified_by).toBe(userId);
    expect(opportunity.data?.status).toBe("verified");
    expect(audit.data?.map((item) => item.action)).toEqual(expect.arrayContaining([
      "opportunity.approved",
      "action_plan.approve",
      "savings.accept_baseline",
      "action_plan.start",
      "action_plan.complete",
      "savings.verify",
    ]));
  }, 30_000);
});
