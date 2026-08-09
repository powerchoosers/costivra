import { afterEach, describe, expect, it, vi } from "vitest";
import { assertStripeBillingMode, getStripeBillingMode, stripeBillingEnabled } from "./stripe";

describe("Stripe billing mode guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("blocks live keys unless the explicit live flag is enabled", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_dummy-stripe-secret-for-unit-tests");
    vi.stubEnv("STRIPE_BILLING_LIVEMODE_ENABLED", "0");
    expect(() => assertStripeBillingMode()).toThrow("STRIPE_LIVE_BILLING_DISABLED");
  });

  it("allows the Costivra test account by default", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dummy-stripe-secret-for-unit-tests");
    vi.stubEnv("STRIPE_BILLING_LIVEMODE_ENABLED", "0");
    expect(() => assertStripeBillingMode()).not.toThrow();
  });

  it("allows live mode only after the explicit launch flag", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_dummy-stripe-secret-for-unit-tests");
    vi.stubEnv("STRIPE_BILLING_LIVEMODE_ENABLED", "1");
    expect(() => assertStripeBillingMode()).not.toThrow();
  });

  it("rejects a webhook event whose mode does not match the configured key", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dummy-stripe-secret-for-unit-tests");
    expect(() => assertStripeBillingMode(true)).toThrow("STRIPE_EVENT_MODE_MISMATCH");
  });

  it("rejects an unrecognized key mode instead of guessing", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "dummy-stripe-secret-for-unit-tests");
    expect(() => assertStripeBillingMode()).toThrow("STRIPE_KEY_MODE_UNKNOWN");
  });

  it("reports live mode as disabled until the launch flag is explicit", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_dummy-stripe-secret-for-unit-tests");
    vi.stubEnv("STRIPE_BILLING_LIVEMODE_ENABLED", "0");
    expect(getStripeBillingMode()).toBe("live");
    expect(stripeBillingEnabled()).toBe(false);
  });
});
