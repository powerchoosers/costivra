import { randomBytes, randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

const enabled = process.env.RUN_AUTHENTICATED_E2E === "1";

type WorkspaceFixture = {
  admin: SupabaseClient;
  email: string;
  password: string;
  userId: string;
  organizationId: string;
  organizationName: string;
  vendorId: string;
  invoiceId: string;
  opportunityId: string;
  opportunityTitle: string;
};

function requiredEnvironmentVariable(name: string, fallback?: string) {
  const value = process.env[name] ?? (fallback ? process.env[fallback] : undefined);
  if (
    !value ||
    value === "Encrypted" ||
    value.includes("[SENSITIVE]") ||
    value.includes("build_only")
  ) {
    throw new Error(
      `${name}${fallback ? ` (or ${fallback})` : ""} must contain a real value to run authenticated E2E tests.`,
    );
  }
  return value;
}

function assertExplicitProductionPermission() {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100";
  const hostname = new URL(baseUrl).hostname;
  const local = hostname === "127.0.0.1" || hostname === "localhost";
  if (!local && process.env.E2E_ALLOW_PRODUCTION !== "1") {
    throw new Error(
      "Refusing to create disposable fixtures on a remote environment without E2E_ALLOW_PRODUCTION=1.",
    );
  }
}

async function waitForMembership(admin: SupabaseClient, userId: string) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const result = await admin
      .from("organization_memberships")
      .select("organization_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (result.error) throw result.error;
    if (result.data?.organization_id) return String(result.data.organization_id);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("The temporary user's organization membership was not provisioned.");
}

async function createWorkspaceFixture(): Promise<WorkspaceFixture> {
  assertExplicitProductionPermission();
  const url = requiredEnvironmentVariable("NEXT_PUBLIC_SUPABASE_URL");
  const secret = requiredEnvironmentVariable(
    "E2E_SUPABASE_SECRET_KEY",
    "SUPABASE_SECRET_KEY",
  );
  const admin = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const nonce = randomUUID();
  const organizationName = `Costivra authenticated E2E ${nonce}`;
  const opportunityTitle = `E2E telecom review ${nonce}`;
  const email = `costivra-auth-e2e-${nonce}@example.invalid`;
  const password = `${randomBytes(24).toString("base64url")}Aa1!`;
  let userId = "";
  let organizationId = "";
  let vendorId = "";

  try {
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: "Authenticated E2E owner",
        company_name: organizationName,
      },
    });
    if (created.error || !created.data.user) {
      throw created.error ?? new Error("The temporary E2E user was not created.");
    }
    userId = created.data.user.id;
    organizationId = await waitForMembership(admin, userId);

    const vendor = await admin
      .from("vendors")
      .insert({ canonical_name: `E2E Telecom ${nonce}`, category: "Telecom" })
      .select("id")
      .single();
    if (vendor.error || !vendor.data) throw vendor.error;
    vendorId = String(vendor.data.id);

    const relationship = await admin
      .from("organization_vendors")
      .insert({
        organization_id: organizationId,
        vendor_id: vendorId,
        spend_cadence: "monthly",
      })
      .select("id")
      .single();
    if (relationship.error || !relationship.data) throw relationship.error;

    const account = await admin
      .from("expense_accounts")
      .insert({
        organization_id: organizationId,
        organization_vendor_id: relationship.data.id,
        category: "Telecom",
        external_account_reference: `e2e-${nonce}`,
      })
      .select("id")
      .single();
    if (account.error || !account.data) throw account.error;

    const document = await admin
      .from("documents")
      .insert({
        organization_id: organizationId,
        organization_vendor_id: relationship.data.id,
        storage_path: `${organizationId}/authenticated-e2e/${nonce}.pdf`,
        original_filename: "authenticated-e2e-invoice.pdf",
        mime_type: "application/pdf",
        byte_size: 1,
        sha256: randomBytes(32).toString("hex"),
        status: "ready",
        uploaded_by: userId,
        document_type: "invoice",
      })
      .select("id")
      .single();
    if (document.error || !document.data) throw document.error;

    const expense = await admin
      .from("expenses")
      .insert({
        organization_id: organizationId,
        organization_vendor_id: relationship.data.id,
        expense_account_id: account.data.id,
        document_id: document.data.id,
        category: "Telecom",
        period_start: "2026-07-01",
        period_end: "2026-07-31",
        amount: "1250.00",
        currency: "USD",
        status: "reviewed",
      })
      .select("id")
      .single();
    if (expense.error || !expense.data) throw expense.error;

    const invoice = await admin
      .from("invoices")
      .insert({
        organization_id: organizationId,
        organization_vendor_id: relationship.data.id,
        expense_account_id: account.data.id,
        document_id: document.data.id,
        invoice_number: "INV-E2E-001",
        invoice_date: "2026-07-31",
        due_date: "2026-08-15",
        service_period_start: "2026-07-01",
        service_period_end: "2026-07-31",
        currency: "USD",
        subtotal: "1250.00",
        tax_total: "0.00",
        fee_total: "0.00",
        credit_total: "0.00",
        total_amount: "1250.00",
        amount_due: "1250.00",
        extraction_confidence: "0.98",
        vendor_match_status: "exact",
        reconciliation_status: "reconciled",
        reconciliation_difference: "0.00",
        review_status: "approved",
        source_type: "manual_upload",
      })
      .select("id")
      .single();
    if (invoice.error || !invoice.data) throw invoice.error;

    const lineItem = await admin.from("invoice_line_items").insert({
      organization_id: organizationId,
      invoice_id: invoice.data.id,
      line_number: 1,
      description: "Monthly internet service",
      quantity: "1",
      unit_price: "1250.00",
      amount: "1250.00",
      category: "Telecom",
      service_period_start: "2026-07-01",
      service_period_end: "2026-07-31",
    });
    if (lineItem.error) throw lineItem.error;
    const linkedExpense = await admin
      .from("expenses")
      .update({ invoice_id: invoice.data.id })
      .eq("id", expense.data.id);
    if (linkedExpense.error) throw linkedExpense.error;

    const opportunity = await admin
      .from("opportunities")
      .insert({
        organization_id: organizationId,
        expense_account_id: account.data.id,
        type: "price_increase",
        title: opportunityTitle,
        summary: "Disposable authenticated browser regression fixture.",
        status: "under_review",
        priority: "medium",
        category: "Telecom",
        currency: "USD",
        estimated_annual_value: "3000.00",
        confidence: "0.94",
        source_expense_id: expense.data.id,
        generated_by: "deterministic_rule",
      })
      .select("id")
      .single();
    if (opportunity.error || !opportunity.data) throw opportunity.error;

    return {
      admin,
      email,
      password,
      userId,
      organizationId,
      organizationName,
      vendorId,
      invoiceId: String(invoice.data.id),
      opportunityId: String(opportunity.data.id),
      opportunityTitle,
    };
  } catch (error) {
    if (organizationId) await admin.from("organizations").delete().eq("id", organizationId);
    if (vendorId) await admin.from("vendors").delete().eq("id", vendorId);
    if (userId) await admin.auth.admin.deleteUser(userId);
    throw error;
  }
}

async function removeWorkspaceFixture(fixture: WorkspaceFixture) {
  const organization = await fixture.admin
    .from("organizations")
    .select("name")
    .eq("id", fixture.organizationId)
    .maybeSingle();
  if (organization.error) throw organization.error;
  if (
    organization.data &&
    !String(organization.data.name).startsWith("Costivra authenticated E2E ")
  ) {
    throw new Error("Refusing to delete a fixture organization with an unexpected name.");
  }
  if (organization.data) {
    const removed = await fixture.admin
      .from("organizations")
      .delete()
      .eq("id", fixture.organizationId);
    if (removed.error) throw removed.error;
  }
  const vendor = await fixture.admin
    .from("vendors")
    .delete()
    .eq("id", fixture.vendorId);
  if (vendor.error) throw vendor.error;
  const user = await fixture.admin.auth.admin.deleteUser(fixture.userId);
  if (user.error) throw user.error;
}

function collectRuntimeFailures(page: Page) {
  const failures: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => failures.push(`page: ${error.message}`));
  page.on("response", (response) => {
    if (response.status() >= 500) {
      failures.push(`${response.status()} ${response.url()}`);
    }
  });
  return failures;
}

test.describe("authenticated customer workspace", () => {
  test.skip(
    !enabled,
    "Set RUN_AUTHENTICATED_E2E=1 and the explicit Supabase E2E credentials to run this destructive-but-cleaned-up test.",
  );
  test.setTimeout(120_000);

  test("completes the customer approval workflow through the rendered UI", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-chromium",
      "The authenticated mutation sequence runs once on desktop; mobile layout remains covered by public smoke tests.",
    );

    const fixture = await createWorkspaceFixture();
    const failures = collectRuntimeFailures(page);
    try {
      await page.goto("/login?next=/app/opportunities");
      await page.getByRole("textbox", { name: "Work email" }).fill(fixture.email);
      await page.getByLabel("Password").fill(fixture.password);
      await page.getByRole("button", { name: "Sign in", exact: true }).click();

      await expect(page).toHaveURL(/\/app\/opportunities$/, { timeout: 30_000 });
      await expect(page.getByText(fixture.organizationName, { exact: true })).toBeVisible();

      await page.goto("/app/settings");
      await page.getByRole("tab", { name: "Team & approvals" }).click();
      await expect(page.getByRole("heading", { name: "Approval policies" })).toBeVisible();
      await page.getByRole("button", { name: "Add policy" }).click();
      const policyDialog = page.getByRole("dialog", { name: "Add approval policy" });
      await expect(policyDialog).toBeVisible();
      await expect(policyDialog).toBeInViewport();
      await policyDialog.getByLabel("Policy name").fill("E2E consequential work approval");
      await policyDialog.getByLabel("Explicit consent").check();
      await policyDialog.getByRole("button", { name: "Add policy", exact: true }).click();
      await expect(page.getByText("Approval policy added.", { exact: true })).toBeVisible();
      await expect(page.getByText("E2E consequential work approval", { exact: true })).toBeVisible();

      await page.goto(`/app/documents/${fixture.invoiceId}`);
      await expect(page.getByRole("heading", { name: "Invoice INV-E2E-001" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Invoice line items" })).toBeVisible();
      await expect(page.getByText("Monthly internet service", { exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Data quality" })).toBeVisible();
      await expect(page.locator(".record-quality", { hasText: "Vendor match" })).toContainText("exact");
      await expect(page.locator(".record-quality", { hasText: "Reconciliation" })).toContainText("reconciled");

      await page.goto("/app/opportunities");
      const opportunityCard = page.locator("article.portal-card", {
        hasText: fixture.opportunityTitle,
      });
      await expect(opportunityCard).toBeVisible();
      await opportunityCard
        .getByRole("button", { name: `Update ${fixture.opportunityTitle} status` })
        .click();
      await opportunityCard.getByRole("option", { name: "Approve plan" }).click();
      await expect(page.getByText("Opportunity updated.", { exact: true })).toBeVisible();

      await page.goto("/app/actions");
      const actionCard = page.locator("article.portal-card", {
        hasText: `Review and act on: ${fixture.opportunityTitle}`,
      });
      await expect(actionCard).toBeVisible();
      await actionCard.getByRole("button", { name: "Approve", exact: true }).click();
      await expect(page.getByText("Action approved.", { exact: true })).toBeVisible();

      await page.goto("/app/savings");
      const savingsRow = page.locator(".savings-workflow-row", {
        hasText: `Verify outcome: ${fixture.opportunityTitle}`,
      });
      await expect(savingsRow).toBeVisible();
      await savingsRow.getByRole("link", { name: "Review baseline" }).click();
      await expect(page.getByRole("heading", { name: "Verification review" })).toBeVisible();
      await page.getByRole("checkbox", { name: /reviewed the supporting records and method/i }).check();
      await page.getByRole("button", { name: "Accept reviewed baseline" }).click();
      await expect(page.getByText("Baseline accepted.", { exact: true })).toBeVisible();

      await page.goto("/app/actions");
      await expect(actionCard).toBeVisible();
      await actionCard.getByRole("button", { name: "Start work" }).click();
      await expect(page.getByText("Action started.", { exact: true })).toBeVisible();
      await expect(actionCard.getByRole("button", { name: "Mark complete" })).toBeVisible();
      await actionCard.getByRole("button", { name: "Mark complete" }).click();
      await expect(page.getByText("Action completed.", { exact: true })).toBeVisible();

      const [opportunity, action, policy, savings, audit] = await Promise.all([
        fixture.admin
          .from("opportunities")
          .select("status")
          .eq("id", fixture.opportunityId)
          .single(),
        fixture.admin
          .from("action_plans")
          .select("status,required_approval_policy_id")
          .eq("opportunity_id", fixture.opportunityId)
          .single(),
        fixture.admin
          .from("approval_policies")
          .select("id,rule")
          .eq("organization_id", fixture.organizationId)
          .eq("name", "E2E consequential work approval")
          .single(),
        fixture.admin
          .from("savings_outcomes")
          .select("status,baseline_accepted_by")
          .eq("opportunity_id", fixture.opportunityId)
          .single(),
        fixture.admin
          .from("audit_events")
          .select("action")
          .eq("organization_id", fixture.organizationId),
      ]);
      expect(opportunity.error).toBeNull();
      expect(opportunity.data?.status).toBe("in_progress");
      expect(action.error).toBeNull();
      expect(action.data?.status).toBe("complete");
      expect(policy.error).toBeNull();
      expect(policy.data?.rule).toMatchObject({
        minimum_approvers: 1,
        explicit_consent: true,
      });
      expect(action.data?.required_approval_policy_id).toBe(policy.data?.id);
      expect(savings.error).toBeNull();
      expect(savings.data).toMatchObject({
        status: "evidence_pending",
        baseline_accepted_by: fixture.userId,
      });
      expect(audit.error).toBeNull();
      expect(audit.data?.map((entry) => entry.action)).toEqual(
        expect.arrayContaining([
          "opportunity.approved",
          "action_plan.approve",
          "savings.accept_baseline",
          "action_plan.start",
          "action_plan.complete",
        ]),
      );
      expect(failures).toEqual([]);
    } finally {
      await removeWorkspaceFixture(fixture);
    }
  });
});
