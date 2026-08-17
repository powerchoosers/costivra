import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  captureTransactionalEmail,
  getEmailDeliveryMode,
  isTestOrReservedDomain,
} from "./email-capture";
import { sendTransactionalEmail } from "./resend";

describe("Email Delivery Mode & Domain Guardrails", () => {
  beforeEach(() => {
    delete process.env.COSTIVRA_EMAIL_DELIVERY_MODE;
    delete process.env.RESEND_API_KEY;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("resolves email delivery mode correctly", () => {
    expect(getEmailDeliveryMode()).toBe("provider");

    vi.stubEnv("COSTIVRA_EMAIL_DELIVERY_MODE", "capture");
    expect(getEmailDeliveryMode()).toBe("capture");

    vi.stubEnv("COSTIVRA_EMAIL_DELIVERY_MODE", "disabled");
    expect(getEmailDeliveryMode()).toBe("disabled");

    vi.stubEnv("COSTIVRA_EMAIL_DELIVERY_MODE", "unknown_mode");
    expect(getEmailDeliveryMode()).toBe("provider");
  });

  it("identifies test and reserved domains correctly", () => {
    expect(isTestOrReservedDomain("user@test.invalid")).toBe(true);
    expect(isTestOrReservedDomain("owner@sub.test")).toBe(true);
    expect(isTestOrReservedDomain("lead@pilot.example")).toBe(true);
    expect(isTestOrReservedDomain("contact@example.com")).toBe(true);
    expect(isTestOrReservedDomain("admin@example.org")).toBe(true);
    expect(isTestOrReservedDomain("support@costivra.invalid")).toBe(true);
    expect(isTestOrReservedDomain("no-domain")).toBe(true);

    expect(isTestOrReservedDomain("cfo@acmeenterprise.com")).toBe(false);
    expect(isTestOrReservedDomain("lewis@powerchoosers.com")).toBe(false);
    expect(isTestOrReservedDomain("finance@costivra.ai")).toBe(false);
  });

  it("captures email in capture mode and returns synthetic mock ID", async () => {
    const result = await captureTransactionalEmail({
      to: "cfo@example.com",
      subject: "Pilot Finding Ready",
      text: "A new cost finding is ready for review.",
      html: "<p>A new cost finding is ready for review.</p>",
      idempotencyKey: "test-idem-key-123",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.providerId).toMatch(/^mock-msg-[0-9a-f-]+$/);
    }
  });

  it("routes sendTransactionalEmail to capture mode when configured", async () => {
    vi.stubEnv("COSTIVRA_EMAIL_DELIVERY_MODE", "capture");

    const result = await sendTransactionalEmail({
      to: "owner@costivra.invalid",
      subject: "Workspace Activated",
      text: "Your workspace is ready.",
      html: "<p>Your workspace is ready.</p>",
      idempotencyKey: "capture-test-key-456",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.providerId).toMatch(/^mock-msg-/);
    }
  });

  it("blocks live delivery to test domains when in provider mode", async () => {
    vi.stubEnv("COSTIVRA_EMAIL_DELIVERY_MODE", "provider");
    vi.stubEnv("RESEND_API_KEY", "re_123456789");

    const result = await sendTransactionalEmail({
      to: "tester@pilot.invalid",
      subject: "Test email",
      text: "Should not be sent live.",
      html: "<p>Should not be sent live.</p>",
      idempotencyKey: "blocked-test-key",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("TEST_DOMAIN_LIVE_DELIVERY_BLOCKED");
    }
  });

  it("returns error when delivery mode is disabled", async () => {
    vi.stubEnv("COSTIVRA_EMAIL_DELIVERY_MODE", "disabled");

    const result = await sendTransactionalEmail({
      to: "cfo@acme.com",
      subject: "Disabled mode test",
      text: "No email sent.",
      html: "<p>No email sent.</p>",
      idempotencyKey: "disabled-test-key",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("EMAIL_DELIVERY_DISABLED");
    }
  });
});
