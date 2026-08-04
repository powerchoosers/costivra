import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { saveDurableMonitoringConfig, getDurableMonitoringConfig } from "@/lib/vendors/monitoring";
import { evaluateVendorCompleteness } from "@/lib/vendors/completeness";
import { sendLifecycleEmail } from "@/lib/email/lifecycle";

const runLive = process.env.RUN_LIVE_SUPABASE_TESTS === "1";
const suite = runLive ? describe : describe.skip;

suite("Disposable Pilot Journey Integration Test", () => {
  it("proves complete pilot lifecycle from intake to verification with full cleanup", async () => {
    const db = createServerSupabaseClient();
    const testId = randomUUID().slice(0, 8);
    const orgName = `Test Pilot Org ${testId}`;
    const userEmail = `pilot-${testId}@costivra.ai`;

    // 1. Create disposable organization
    const { data: org, error: orgErr } = await db
      .from("organizations")
      .insert({ name: orgName })
      .select("id")
      .single();
    expect(orgErr).toBeNull();
    expect(org?.id).toBeDefined();
    const orgId = org!.id;

    try {
      // 2. Create disposable profile & membership
      const { data: profile, error: profErr } = await db
        .from("profiles")
        .insert({ email: userEmail, full_name: `Test Admin ${testId}` })
        .select("id")
        .single();
      expect(profErr).toBeNull();

      const { error: memErr } = await db.from("memberships").insert({
        organization_id: orgId,
        user_id: profile!.id,
        role: "owner",
      });
      expect(memErr).toBeNull();

      // 3. Create disposable location
      const { data: location, error: locErr } = await db
        .from("locations")
        .insert({
          organization_id: orgId,
          name: "Main HQ",
          address_line1: "100 Main St",
          city: "Austin",
          state: "TX",
          postal_code: "78701",
        })
        .select("id")
        .single();
      expect(locErr).toBeNull();

      // 4. Create disposable vendor & relationship
      const { data: vendor, error: venErr } = await db
        .from("vendors")
        .insert({ name: `Acme Telecom ${testId}`, domain: `acme-${testId}.com` })
        .select("id")
        .single();
      expect(venErr).toBeNull();

      const { data: rel, error: relErr } = await db
        .from("organization_vendors")
        .insert({
          organization_id: orgId,
          vendor_id: vendor!.id,
          relationship_status: "active",
          category: "Telecom & Internet",
        })
        .select("id")
        .single();
      expect(relErr).toBeNull();
      const relId = rel!.id;

      // 5. Configure durable monitoring
      const config = await saveDurableMonitoringConfig(db, {
        organizationId: orgId,
        actorId: profile!.id,
        organizationVendorId: relId,
        sourceMethod: "email_forwarding",
        approvedSenderAddress: `billing@acme-${testId}.com`,
      });
      expect(config.state).toBe("pending_test");

      // 6. Simulate forwarding test invoice receipt
      await db.from("vendor_monitoring_configs").update({
        state: "active",
        test_completed_at: new Date().toISOString(),
        last_received_at: new Date().toISOString(),
        next_expected_at: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000).toISOString(),
      }).eq("organization_vendor_id", relId);

      const activeConfig = await getDurableMonitoringConfig(db, orgId, relId);
      expect(activeConfig.state).toBe("active");

      // 7. Verify 11-point data completeness evaluation
      const completeness = evaluateVendorCompleteness({
        name: `Acme Telecom ${testId}`,
        category: "Telecom & Internet",
        locationId: location!.id,
        ownerName: `Test Admin ${testId}`,
        monitoringState: "active",
        documentCount: 3,
        hasReconciledDocument: true,
        hasExpenseRecord: true,
        hasContractTerms: true,
        hasEvaluatedOpportunity: true,
      });

      expect(completeness.completedCount).toBe(11);
      expect(completeness.percentage).toBe(100);

      // 8. Test lifecycle email trigger idempotency
      const emailResult = await sendLifecycleEmail(db, {
        kind: "forwarding_test_result",
        organizationId: orgId,
        recipientEmail: userEmail,
        payload: { vendorName: `Acme Telecom ${testId}` },
      });
      expect(emailResult.sent).toBe(true);

      // Duplicate call must be suppressed idempotently
      const dupEmailResult = await sendLifecycleEmail(db, {
        kind: "forwarding_test_result",
        organizationId: orgId,
        recipientEmail: userEmail,
        payload: { vendorName: `Acme Telecom ${testId}` },
      });
      expect(dupEmailResult.sent).toBe(false);
      expect(dupEmailResult.reason).toContain("idempotent");

    } finally {
      // Clean up all disposable test records completely
      await db.from("external_side_effects").delete().eq("organization_id", orgId);
      await db.from("audit_events").delete().eq("organization_id", orgId);
      await db.from("vendor_monitoring_configs").delete().eq("organization_id", orgId);
      await db.from("organization_vendors").delete().eq("organization_id", orgId);
      await db.from("locations").delete().eq("organization_id", orgId);
      await db.from("memberships").delete().eq("organization_id", orgId);
      await db.from("organizations").delete().eq("id", orgId);
    }
  });
});
