import { randomBytes, randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const runLive = process.env.RUN_LIVE_SUPABASE_TESTS === "1";
const suite = runLive ? describe : describe.skip;

function requiredEnvironmentVariable(name: string) {
  const value = process.env[name];
  if (!value || value === "Encrypted" || value.includes("[SENSITIVE]")) {
    throw new Error(`${name} must contain a real value to run live Supabase tests.`);
  }
  return value;
}

function sha256Fixture() {
  return randomBytes(32).toString("hex");
}

suite.sequential("live Supabase invoice review workflow", () => {
  let admin: SupabaseClient;
  let organizationId = "";
  let vendorId = "";
  let relationshipId = "";
  let actorId = "";
  let missingVendorInvoiceId = "";
  let reviewInvoiceId = "";

  beforeAll(async () => {
    admin = createClient(
      requiredEnvironmentVariable("NEXT_PUBLIC_SUPABASE_URL"),
      requiredEnvironmentVariable("SUPABASE_SECRET_KEY"),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data: staff, error: staffError } = await admin
      .from("internal_staff_users")
      .select("user_id")
      .eq("status", "active")
      .order("created_at")
      .limit(1)
      .maybeSingle();
    if (staffError || !staff) {
      throw staffError ?? new Error("An active internal staff fixture is required.");
    }
    actorId = staff.user_id as string;

    const nonce = randomUUID();
    const { data: organization, error: organizationError } = await admin
      .from("organizations")
      .insert({ name: `Costivra workflow regression ${nonce}` })
      .select("id")
      .single();
    if (organizationError || !organization) throw organizationError;
    organizationId = organization.id as string;

    const { data: vendor, error: vendorError } = await admin
      .from("vendors")
      .insert({ canonical_name: `Regression Telecom ${nonce}`, category: "Telecom" })
      .select("id")
      .single();
    if (vendorError || !vendor) throw vendorError;
    vendorId = vendor.id as string;

    const { data: relationship, error: relationshipError } = await admin
      .from("organization_vendors")
      .insert({ organization_id: organizationId, vendor_id: vendorId })
      .select("id")
      .single();
    if (relationshipError || !relationship) throw relationshipError;
    relationshipId = relationship.id as string;

    const { data: documents, error: documentError } = await admin
      .from("documents")
      .insert([
        {
          organization_id: organizationId,
          storage_path: `${organizationId}/regression/missing.pdf`,
          original_filename: "missing.pdf",
          mime_type: "application/pdf",
          byte_size: 10,
          sha256: sha256Fixture(),
          status: "ready",
          document_type: "invoice",
        },
        {
          organization_id: organizationId,
          organization_vendor_id: relationshipId,
          storage_path: `${organizationId}/regression/review.pdf`,
          original_filename: "review.pdf",
          mime_type: "application/pdf",
          byte_size: 10,
          sha256: sha256Fixture(),
          status: "ready",
          document_type: "invoice",
        },
      ])
      .select("id,original_filename");
    if (documentError || !documents) throw documentError;
    const missingDocument = documents.find(
      (document) => document.original_filename === "missing.pdf",
    );
    const reviewDocument = documents.find(
      (document) => document.original_filename === "review.pdf",
    );
    if (!missingDocument || !reviewDocument) {
      throw new Error("Document fixtures were not created.");
    }

    const sharedInvoice = {
      organization_id: organizationId,
      invoice_date: "2026-06-01",
      service_period_start: "2026-05-01",
      service_period_end: "2026-05-31",
      currency: "USD",
      subtotal: "100.00",
      tax_total: "8.00",
      fee_total: "0.00",
      credit_total: "0.00",
      expense_category: "Telecom",
      source_type: "manual_upload",
    };
    const { data: invoices, error: invoiceError } = await admin
      .from("invoices")
      .insert([
        {
          ...sharedInvoice,
          document_id: missingDocument.id,
          invoice_number: "MISSING-VENDOR",
          total_amount: "108.00",
          amount_due: "108.00",
          reconciliation_status: "reconciled",
          reconciliation_difference: "0.00",
        },
        {
          ...sharedInvoice,
          organization_vendor_id: relationshipId,
          document_id: reviewDocument.id,
          invoice_number: "REVIEW-1",
          total_amount: "999.00",
          amount_due: "999.00",
          reconciliation_status: "mismatch",
          reconciliation_difference: "-891.00",
        },
      ])
      .select("id,invoice_number");
    if (invoiceError || !invoices) throw invoiceError;
    missingVendorInvoiceId = invoices.find(
      (invoice) => invoice.invoice_number === "MISSING-VENDOR",
    )?.id as string;
    reviewInvoiceId = invoices.find(
      (invoice) => invoice.invoice_number === "REVIEW-1",
    )?.id as string;
    if (!missingVendorInvoiceId || !reviewInvoiceId) {
      throw new Error("Invoice fixtures were not created.");
    }
  }, 30_000);

  afterAll(async () => {
    if (!admin) return;
    if (organizationId) {
      const { error } = await admin
        .from("organizations")
        .delete()
        .eq("id", organizationId);
      if (error) throw error;
    }
    if (vendorId) {
      const { error } = await admin.from("vendors").delete().eq("id", vendorId);
      if (error) throw error;
    }
  }, 30_000);

  it("rejects approval until a client vendor is matched", async () => {
    const { data, error } = await admin.rpc("internal_approve_invoice", {
      p_invoice_id: missingVendorInvoiceId,
      p_actor_id: actorId,
    });
    expect(data).toBeNull();
    expect(error?.message).toContain("VENDOR_REQUIRED");
    const { count } = await admin
      .from("expenses")
      .select("id", { count: "exact", head: true })
      .eq("invoice_id", missingVendorInvoiceId);
    expect(count).toBe(0);
  });

  it("records corrections, reconciles, and approves idempotently", async () => {
    const rejected = await admin.rpc("internal_approve_invoice", {
      p_invoice_id: reviewInvoiceId,
      p_actor_id: actorId,
    });
    expect(rejected.error?.message).toContain("RECONCILIATION_REQUIRED");

    const corrected = await admin.rpc("internal_update_invoice_review", {
      p_invoice_id: reviewInvoiceId,
      p_actor_id: actorId,
      p_changes: { total_amount: "108.00", amount_due: "108.00" },
      p_reason: "Corrected against source invoice",
    });
    expect(corrected.error).toBeNull();

    const [{ data: invoice }, { count: correctionCount }] = await Promise.all([
      admin
        .from("invoices")
        .select("reconciliation_status,reconciliation_difference")
        .eq("id", reviewInvoiceId)
        .single(),
      admin
        .from("invoice_field_corrections")
        .select("id", { count: "exact", head: true })
        .eq("invoice_id", reviewInvoiceId),
    ]);
    expect(invoice).toMatchObject({
      reconciliation_status: "reconciled",
      reconciliation_difference: 0,
    });
    expect(correctionCount).toBe(2);

    const first = await admin.rpc("internal_approve_invoice", {
      p_invoice_id: reviewInvoiceId,
      p_actor_id: actorId,
    });
    const second = await admin.rpc("internal_approve_invoice", {
      p_invoice_id: reviewInvoiceId,
      p_actor_id: actorId,
    });
    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    expect(first.data).toBe(second.data);

    const [expenseResult, invoiceResult, auditResult] = await Promise.all([
      admin
        .from("expenses")
        .select("id,organization_id,organization_vendor_id,amount,currency,status")
        .eq("invoice_id", reviewInvoiceId),
      admin
        .from("invoices")
        .select("review_status,reviewed_by,reviewed_at")
        .eq("id", reviewInvoiceId)
        .single(),
      admin
        .from("internal_audit_events")
        .select("id", { count: "exact", head: true })
        .eq("resource_id", reviewInvoiceId)
        .eq("action", "invoice_approved"),
    ]);
    expect(expenseResult.error).toBeNull();
    expect(expenseResult.data).toHaveLength(1);
    expect(expenseResult.data?.[0]).toMatchObject({
      id: first.data,
      organization_id: organizationId,
      organization_vendor_id: relationshipId,
      amount: 108,
      currency: "USD",
      status: "reviewed",
    });
    expect(invoiceResult.data).toMatchObject({
      review_status: "approved",
      reviewed_by: actorId,
    });
    expect(invoiceResult.data?.reviewed_at).toBeTruthy();
    expect(auditResult.count).toBe(2);
  });
});
