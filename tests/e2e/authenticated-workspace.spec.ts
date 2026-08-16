import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const enabled = process.env.RUN_AUTHENTICATED_E2E === "1";

type WorkspaceFixture = {
  admin: SupabaseClient;
  email: string;
  password: string;
  userId: string;
  organizationId: string;
  organizationName: string;
  vendorId: string;
  relationshipId: string;
  documentId: string;
  invoiceId: string;
  opportunityId: string;
  reportId: string;
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
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3100";
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
  let relationshipId = "";

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
    relationshipId = String(relationship.data.id);

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

    const documentAudit = await admin.from("audit_events").insert({
      organization_id: organizationId,
      actor_type: "user",
      actor_id: userId,
      action: "document.uploaded_and_extracted",
      resource_type: "document",
      resource_id: document.data.id,
    });
    if (documentAudit.error) throw documentAudit.error;

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

    const analysisRun = await admin.from("category_analysis_runs").insert({
      organization_id: organizationId,
      document_id: document.data.id,
      invoice_id: invoice.data.id,
      pack_version: "authenticated-e2e",
      findings: [],
      missing_dimensions: [],
      calculations: { benchmarkStatus: "insufficient_data" },
      confidence: "0.98",
    });
    if (analysisRun.error) throw analysisRun.error;

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

    const report = await admin
      .from("report_definitions")
      .insert({
        organization_id: organizationId,
        name: "E2E coverage report",
        description: "Disposable authenticated browser regression report.",
        report_type: "executive_value",
        status: "ready",
        configuration: {},
      })
      .select("id")
      .single();
    if (report.error || !report.data) throw report.error;

    return {
      admin,
      email,
      password,
      userId,
      organizationId,
      organizationName,
      vendorId,
      relationshipId,
      documentId: String(document.data.id),
      invoiceId: String(invoice.data.id),
      opportunityId: String(opportunity.data.id),
      reportId: String(report.data.id),
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
  const documents = await fixture.admin
    .from("documents")
    .select("storage_path")
    .eq("organization_id", fixture.organizationId);
  if (documents.error) throw documents.error;
  const storagePaths = (documents.data ?? [])
    .map((document) => typeof document.storage_path === "string" ? document.storage_path : null)
    .filter((path): path is string => Boolean(path));
  if (storagePaths.length) {
    const removedStorage = await fixture.admin.storage
      .from("costivra-documents")
      .remove(storagePaths);
    if (removedStorage.error) throw removedStorage.error;
  }
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
  test.setTimeout(600_000);

  test("completes the customer approval workflow through the rendered UI", async ({ page, browser }) => {
    const startedAt = Date.now();
    const checkpoint = (label: string) => console.log(`[authenticated-e2e +${Math.round((Date.now() - startedAt) / 1000)}s] ${label}`);
    checkpoint("starting primary fixture creation");
    const fixture = await createWorkspaceFixture();
    let isolationFixture: WorkspaceFixture | null = null;
    let isolationContext: BrowserContext | null = null;
    const failures = collectRuntimeFailures(page);
    try {
      checkpoint("fixtures created");
      isolationFixture = await createWorkspaceFixture();
      const viewerMembership = await isolationFixture.admin
        .from("organization_memberships")
        .update({ role: "viewer" })
        .eq("organization_id", isolationFixture.organizationId)
        .eq("user_id", isolationFixture.userId)
        .select("role")
        .single();
      if (viewerMembership.error) throw viewerMembership.error;
      expect(viewerMembership.data?.role).toBe("viewer");
      checkpoint("isolation fixture created");
      await page.goto("/login?next=/app/findings");
      await page.getByRole("textbox", { name: "Work email" }).fill(fixture.email);
      await page.getByRole("textbox", { name: "Password" }).fill(fixture.password);
      await page.getByRole("button", { name: "Sign in", exact: true }).click();

      await expect(page).toHaveURL(/\/app\/findings$/, { timeout: 30_000 });
      await expect(page.getByRole("navigation", { name: "Finding views" })).toBeVisible({
        timeout: 120_000,
      });
      checkpoint("primary workspace ready");

      await page.goto("/app");
      await expect(page.getByRole("heading", { name: "Activation Checklist", exact: true })).toBeVisible();
      await expect(page.getByRole("progressbar", { name: "Activation progress" })).toHaveAttribute("aria-valuetext", "1 of 5 completed");
      await expect
        .poll(async () => {
          const onboardingState = await fixture.admin
            .from("organization_onboarding")
            .select("status,current_step")
            .eq("organization_id", fixture.organizationId)
            .maybeSingle();
          if (onboardingState.error) throw onboardingState.error;
          return onboardingState.data?.status ?? null;
        }, { timeout: 30_000 })
        .toBe("not_started");
      checkpoint("activation checklist and durable state verified");

      const uploadFixtures: Array<{ name: string; mimeType: string; body?: string; buffer?: Buffer }> = [
        {
          name: "e2e-native-text-invoice.txt",
          mimeType: "text/plain",
          body: "COSTIVRA SYNTHETIC INVOICE\nVendor: E2E Telecom\nInvoice number: E2E-TXT-001\nInvoice date: 2026-08-01\nService period: 2026-07-01 through 2026-07-31\nMonthly internet service: $1250.00\nTotal due: $1250.00\n",
        },
        ...(process.env.RUN_AUTHENTICATED_E2E_PDF === "1"
          ? [{
              name: "public-image-heavy-utility-bill.pdf",
              mimeType: "application/pdf",
              buffer: readFileSync(resolve(process.cwd(), "tests/fixtures/invoices/sample-utility-bill-crwwd.pdf")),
            }]
          : [{
              name: "e2e-review-invoice.txt",
              mimeType: "text/plain",
              body: "COSTIVRA SYNTHETIC REVIEW INVOICE\nVendor: E2E Telecom\nInvoice number: E2E-TXT-002\nInvoice date: 2026-08-02\nService period: 2026-07-01 through 2026-07-31\nService charge: $1100.00\nUnexpected fee: $175.00\nPrinted total: $1200.00\n",
            }]),
        {
          name: "e2e-follow-up-invoice.txt",
          mimeType: "text/plain",
          body: "COSTIVRA SYNTHETIC FOLLOW-UP INVOICE\nVendor: E2E Telecom\nInvoice number: E2E-TXT-003\nInvoice date: 2026-08-03\nService period: 2026-08-01 through 2026-08-31\nManaged internet service: $980.00\nTotal due: $980.00\n",
        },
      ];
      for (const uploadFixture of uploadFixtures) {
        checkpoint(`starting upload ${uploadFixture.name}`);
        await page.goto("/app/bills?view=files");
        await page.getByRole("button", { name: "Add to workspace" }).click();
        await page.getByRole("menuitem", { name: /Upload document/ }).click();
        const uploadDialog = page.getByRole("dialog", { name: "Upload source document" });
        await expect(uploadDialog).toBeVisible();
        const uploadResponsePromise = page.waitForResponse(
          (response) =>
            response.url().endsWith("/api/portal/documents") &&
            response.request().method() === "POST",
        );
        await uploadDialog.locator('input[type="file"]').setInputFiles({
          name: uploadFixture.name,
          mimeType: uploadFixture.mimeType,
          buffer: uploadFixture.buffer ?? Buffer.from(uploadFixture.body ?? "", "utf8"),
        });
        await uploadDialog.getByRole("button", { name: "Upload bill", exact: true }).click();
        const uploadResponse = await uploadResponsePromise;
        const uploadPayload = await uploadResponse.json();
        if (uploadResponse.status() !== 201) {
          throw new Error(`Synthetic upload failed (${uploadResponse.status()}): ${String(uploadPayload.error ?? uploadPayload.code ?? uploadPayload.outcome ?? "unknown error")}`);
        }
        expect(uploadPayload).toEqual(expect.objectContaining({
          outcome: "processed",
          documentId: expect.any(String),
        }));
        const uploadedDocument = await fixture.admin
          .from("documents")
          .select("original_filename,status,security_scan_status")
          .eq("id", uploadPayload.documentId)
          .single();
        expect(uploadedDocument.error).toBeNull();
        expect(uploadedDocument.data).toMatchObject({
          original_filename: uploadFixture.name,
          security_scan_status: "clean",
        });
        await expect(uploadDialog).toBeHidden({ timeout: 60_000 });
        checkpoint(`completed upload ${uploadFixture.name} documentId=${uploadPayload.documentId}`);
      }

      checkpoint("starting vendor and monitoring workflow");
      await page.goto(`/app/vendors/${fixture.vendorId}?tab=bills`);
      await expect(page.getByRole("heading", { name: "Bills and recorded expenses" })).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText("Reconciliation: Reconciled", { exact: false })).toBeVisible();
      await page.goto(`/app/vendors/${fixture.vendorId}?tab=overview`);
      await expect(page.getByRole("heading", { name: "Continuous Bill Monitoring" })).toBeVisible();
      await page.getByRole("button", { name: "Monitor this vendor" }).click();
      const monitoringDialog = page.getByRole("dialog", { name: /Monitor E2E Telecom/ });
      await expect(monitoringDialog).toBeVisible();
      await monitoringDialog.getByRole("button", { name: "Select an option..." }).click();
      await page.getByRole("option", { name: "Manual Forwarding per Invoice" }).click();
      await expect(monitoringDialog.locator('input[name="sourceMethod"]')).toHaveValue("manual_forwarding");
      const monitoringResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/portal/vendors/") &&
          response.url().endsWith("/monitoring") &&
          response.request().method() === "POST",
      );
      await monitoringDialog.getByRole("button", { name: "Save monitoring rule" }).click();
      const monitoringResponse = await monitoringResponsePromise;
      expect(monitoringResponse.status()).toBe(200);
      await expect(page.getByText("Vendor monitoring updated.", { exact: true })).toBeVisible({ timeout: 30_000 });
      const monitoringConfig = await fixture.admin
        .from("vendor_monitoring_configs")
        .select("source_method,state,expected_cadence_days")
        .eq("organization_vendor_id", fixture.relationshipId)
        .single();
      expect(monitoringConfig.error).toBeNull();
      expect(monitoringConfig.data).toMatchObject({
        source_method: "manual_forwarding",
        state: "manual_tracking",
        expected_cadence_days: 30,
      });

      const breakdownResponse = await page.request.get(
        `/api/portal/documents/${fixture.documentId}/breakdown`,
      );
      expect(breakdownResponse.status()).toBe(200);
      const breakdown = await breakdownResponse.json();
      expect(breakdown).toEqual(expect.objectContaining({
        analysisReady: true,
        document: expect.objectContaining({
          securityScanStatus: "clean",
          sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
        invoice: expect.objectContaining({ totalAmount: 1250 }),
      }));
      checkpoint("monitoring and breakdown verified");

      await page.goto("/app/settings");
      await page.getByRole("button", { name: "Team & approvals", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Approval policies", exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Add policy" }).click();
      const policyDialog = page.getByRole("dialog", { name: "Add approval policy" });
      await expect(policyDialog).toBeVisible();
      await expect(policyDialog).toBeInViewport();
      await policyDialog.getByLabel("Policy name").fill("E2E consequential work approval");
      await policyDialog.getByLabel("Explicit consent").check();
      await policyDialog.getByRole("button", { name: "Add policy", exact: true }).click();
      await expect(page.getByText("Approval policy added.", { exact: true })).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText("E2E consequential work approval", { exact: true })).toBeVisible({ timeout: 30_000 });
      checkpoint("approval policy created");

      await page.goto(`/app/documents/${fixture.invoiceId}`);
      await expect(page.getByRole("heading", { name: "Invoice INV-E2E-001" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Invoice line items" })).toBeVisible();
      await expect(page.getByText("Monthly internet service", { exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Data quality" })).toBeVisible();
      await expect(page.locator(".record-quality", { hasText: "Vendor match" })).toContainText("exact");
      await expect(page.locator(".record-quality", { hasText: "Reconciliation" })).toContainText("reconciled");
      const reviewNotes = `Customer review note ${fixture.organizationId.slice(0, 8)}`;
      await page.getByRole("button", { name: "Edit Reviewer notes" }).click();
      await page.locator("textarea").last().fill(reviewNotes);
      const correctionResponsePromise = page.waitForResponse(
        response => response.url().endsWith(`/api/portal/records/invoice/${fixture.invoiceId}`) && response.request().method() === "PATCH",
      );
      await page.getByRole("button", { name: "Save Reviewer notes" }).click();
      const correctionResponse = await correctionResponsePromise;
      expect(correctionResponse.status()).toBe(200);
      await expect(page.getByText("Reviewer notes updated.", { exact: true })).toBeVisible({ timeout: 30_000 });
      await expect
        .poll(async () => {
          const result = await fixture.admin
            .from("audit_events")
            .select("id,action,resource_id")
            .eq("organization_id", fixture.organizationId)
            .eq("resource_id", fixture.invoiceId)
            .eq("action", "invoice.field_updated.reviewNotes")
            .limit(1)
            .maybeSingle();
          if (result.error) throw result.error;
          return result.data?.id ?? null;
        }, { timeout: 30_000 })
        .not.toBeNull();
      checkpoint("invoice review verified");

      await page.goto("/app/findings");
      const opportunityCard = page.locator(".workspace-work-item", {
        hasText: fixture.opportunityTitle,
      });
      await expect(opportunityCard).toBeVisible();
      await expect(opportunityCard.getByText("Needs evidence", { exact: true })).toBeVisible();
      await expect(opportunityCard).toContainText("Not shown");
      await expect(opportunityCard).not.toContainText("$3,000");
      await opportunityCard
        .getByRole("button", { name: `Update ${fixture.opportunityTitle} status` })
        .click();
      const findingUpdateResponsePromise = page.waitForResponse(
        response => response.url().endsWith(`/api/portal/opportunities/${fixture.opportunityId}`) && response.request().method() === "PATCH",
      );
      await opportunityCard.getByRole("option", { name: "Approve plan" }).click();
      const findingUpdateResponse = await findingUpdateResponsePromise;
      if (findingUpdateResponse.status() !== 200) {
        const payload = await findingUpdateResponse.json();
        throw new Error(`Finding update failed (${findingUpdateResponse.status()}): ${String(payload.error ?? "unknown error")}`);
      }
      await expect
        .poll(async () => {
          const result = await fixture.admin
            .from("opportunities")
            .select("status")
            .eq("id", fixture.opportunityId)
            .single();
          if (result.error) throw result.error;
          return result.data?.status ?? null;
        }, { timeout: 60_000 })
        .toBe("approved");
      await expect
        .poll(async () => {
          const result = await fixture.admin
            .from("action_plans")
            .select("id")
            .eq("opportunity_id", fixture.opportunityId)
            .maybeSingle();
          if (result.error) throw result.error;
          return result.data?.id ?? null;
        }, { timeout: 60_000 })
        .not.toBeNull();
      checkpoint("finding approved and action created");

      await page.goto("/app/actions?view=assigned");
      const actionCard = page.locator("article.portal-card", {
        hasText: `Review and act on: ${fixture.opportunityTitle}`,
      });
      await expect(actionCard).toBeVisible({ timeout: 30_000 });
      await actionCard.getByRole("button", { name: "Approve", exact: true }).click();
      await expect(page.getByText("Action approved.", { exact: true })).toBeVisible({ timeout: 30_000 });

      await page.goto("/app/savings?view=in_progress");
      const savingsRow = page.locator(".savings-workflow-row", {
        hasText: fixture.opportunityTitle,
      });
      await expect(savingsRow).toBeVisible();
      const resultLink = savingsRow.getByRole("link", { name: fixture.opportunityTitle });
      const resultHref = await resultLink.getAttribute("href");
      expect(resultHref).toMatch(/^\/app\/results\/[^/]+$/);
      await page.goto(resultHref!);
      await expect(page).toHaveURL(/\/app\/results\/[^/]+$/, { timeout: 30_000 });
      await expect(page.getByText("Verification review", { exact: true })).toBeVisible({ timeout: 30_000 });
      await page.getByRole("checkbox", { name: /reviewed the supporting records and method/i }).check();
      await page.getByRole("button", { name: "Accept reviewed baseline" }).click();
      await expect(page.getByText("Baseline accepted.", { exact: true })).toBeVisible({ timeout: 30_000 });
      checkpoint("baseline accepted");

      const savingsForIsolation = await fixture.admin
        .from("savings_outcomes")
        .select("id")
        .eq("opportunity_id", fixture.opportunityId)
        .single();
      expect(savingsForIsolation.error).toBeNull();
      const savingsId = String(savingsForIsolation.data?.id);

      await page.goto("/app/results?view=reports");
      await expect(page.getByRole("heading", { name: "Reports", exact: true })).toBeVisible({ timeout: 30_000 });
      const reportCard = page.locator("article.portal-card", { hasText: "E2E coverage report" });
      await expect(reportCard).toBeVisible();
      const reportResponsePromise = page.waitForResponse(
        response => response.url().endsWith(`/api/portal/reports/${fixture.reportId}`) && response.request().method() === "GET",
      );
      await reportCard.getByRole("link", { name: "Download" }).click();
      const reportResponse = await reportResponsePromise;
      expect(reportResponse.status()).toBe(200);
      expect(reportResponse.headers()["content-type"]).toContain("text/csv");
      checkpoint("report downloaded");

      await page.goto("/app/actions?view=assigned");
      await expect(actionCard).toBeVisible();
      await actionCard.getByRole("button", { name: "Start work" }).click();
      await expect(page.getByText("Action started.", { exact: true })).toBeVisible({ timeout: 30_000 });
      await page.getByRole("button", { name: "In Progress", exact: true }).click();
      const inProgressActionCard = page.locator("article.portal-card", {
        hasText: `Review and act on: ${fixture.opportunityTitle}`,
      });
      await expect(inProgressActionCard).toBeVisible({ timeout: 30_000 });
      await inProgressActionCard.getByRole("button", { name: "Mark complete" }).click();
      await expect(page.getByText("Action completed.", { exact: true })).toBeVisible({ timeout: 30_000 });
      checkpoint("action completed");

      await page.goto("/app");
      await expect(page.getByRole("heading", { name: "Activation Checklist", exact: true })).toBeVisible();
      await expect(page.getByRole("progressbar", { name: "Activation progress" })).toHaveAttribute("aria-valuetext", "2 of 5 completed");
      await page.getByRole("button", { name: /Authenticated E2E owner account menu/ }).click();
      await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
      await expect(page).toHaveURL(/\/login(?:\?.*)?$/, { timeout: 30_000 });
      await page.goto("/app/findings");
      await expect(page).toHaveURL(/\/login(?:\?.*)?$/, { timeout: 30_000 });
      await page.getByRole("textbox", { name: "Work email" }).fill(fixture.email);
      await page.getByRole("textbox", { name: "Password" }).fill(fixture.password);
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(page).toHaveURL(/\/app\/findings$/, { timeout: 30_000 });
      await expect(page.getByRole("navigation", { name: "Finding views" })).toBeVisible({ timeout: 120_000 });
      checkpoint("sign-out and activation resume verified");

      isolationContext = await browser.newContext({
        baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3100",
      });
      const isolationPage = await isolationContext.newPage();
      await isolationPage.goto("/login?next=/app/findings");
      await isolationPage.getByRole("textbox", { name: "Work email" }).fill(isolationFixture.email);
      await isolationPage.getByRole("textbox", { name: "Password" }).fill(isolationFixture.password);
      await isolationPage.getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(isolationPage).toHaveURL(/\/app\/findings$/, { timeout: 30_000 });
      await expect(isolationPage.getByRole("navigation", { name: "Finding views" })).toBeVisible({ timeout: 120_000 });
      await expect(isolationPage.locator("body")).not.toContainText(fixture.opportunityTitle);

      const viewerOpportunityResponse = await isolationPage.request.patch(
        `/api/portal/opportunities/${isolationFixture.opportunityId}`,
        { data: { status: "approved" } },
      );
      expect(viewerOpportunityResponse.status()).toBe(403);
      const viewerActionResponse = await isolationPage.request.patch(
        "/api/portal/actions/00000000-0000-4000-8000-000000000000",
        { data: { operation: "approve" } },
      );
      expect(viewerActionResponse.status()).toBe(403);

      const foreignBreakdownResponse = await isolationPage.request.get(
        `/api/portal/documents/${fixture.documentId}/breakdown`,
      );
      const foreignBreakdownStatus = foreignBreakdownResponse.status();
      expect([401, 403, 404]).toContain(foreignBreakdownStatus);
      const foreignInvoiceResponse = await isolationPage.request.get(`/app/bills/${fixture.invoiceId}`);
      const foreignInvoiceStatus = foreignInvoiceResponse.status();
      expect([200, 403, 404]).toContain(foreignInvoiceStatus);
      if (foreignInvoiceStatus === 200) {
        const foreignInvoiceHtml = await foreignInvoiceResponse.text();
        expect(foreignInvoiceHtml).not.toContain("INV-E2E-001");
      }
      const foreignDownloadResponse = await isolationPage.request.get(
        `/api/portal/documents/${fixture.documentId}/download`,
        { maxRedirects: 0 },
      );
      expect([401, 403, 404]).toContain(foreignDownloadResponse.status());
      const foreignMonitoringResponse = await isolationPage.request.get(
        `/api/portal/vendors/${fixture.relationshipId}/monitoring`,
      );
      expect([401, 403, 404]).toContain(foreignMonitoringResponse.status());
      const foreignMonitoringWriteResponse = await isolationPage.request.post(
        `/api/portal/vendors/${fixture.relationshipId}/monitoring`,
        { data: { sourceMethod: "manual_forwarding", expectedCadenceDays: 30 } },
      );
      expect([401, 403, 404]).toContain(foreignMonitoringWriteResponse.status());
      const foreignReportResponse = await isolationPage.request.get(
        `/api/portal/reports/${fixture.reportId}`,
      );
      expect([401, 403, 404]).toContain(foreignReportResponse.status());
      const foreignReportEmailResponse = await isolationPage.request.post(
        `/api/portal/reports/${fixture.reportId}/email`,
        { data: { recipient: isolationFixture.email } },
      );
      expect([401, 403, 404]).toContain(foreignReportEmailResponse.status());
      const manageResponse = await isolationPage.request.get("/api/manage/system-readiness");
      expect([401, 403, 404]).toContain(manageResponse.status());
      const actionForIsolation = await fixture.admin
        .from("action_plans")
        .select("id")
        .eq("opportunity_id", fixture.opportunityId)
        .single();
      expect(actionForIsolation.error).toBeNull();
      const foreignActionResponse = await isolationPage.request.patch(
        `/api/portal/actions/${actionForIsolation.data?.id}`,
        { data: { operation: "invalid_probe_operation" } },
      );
      expect([400, 403, 404, 409]).toContain(foreignActionResponse.status());
      const foreignOpportunityResponse = await isolationPage.request.patch(
        `/api/portal/opportunities/${fixture.opportunityId}`,
        { data: { status: "invalid_probe_status" } },
      );
      expect([400, 403, 404, 409]).toContain(foreignOpportunityResponse.status());
      const foreignSavingsResponse = await isolationPage.request.patch(
        `/api/portal/savings/${savingsId}`,
        { data: { operation: "invalid_probe_operation", reason: "cross-tenant probe" } },
      );
      expect([400, 403, 404, 409]).toContain(foreignSavingsResponse.status());

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
      try { await isolationContext?.close(); } catch { /* test timeout may already close the context */ }
      await removeWorkspaceFixture(fixture);
      if (isolationFixture) await removeWorkspaceFixture(isolationFixture);
    }
  });
});
