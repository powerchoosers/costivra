import "server-only";

import Stripe from "stripe";
import { isConfiguredSecret } from "@/lib/env/secrets";

let stripeClient: Stripe | null = null;

export type StripeBillingMode = "test" | "live" | "unknown";

function configuredStripeSecret() {
  return process.env.STRIPE_RESTRICTED_KEY ?? process.env.STRIPE_SECRET_KEY;
}

export function getStripeClient(): Stripe {
  if (stripeClient) return stripeClient;
  const secret = configuredStripeSecret();
  if (!isConfiguredSecret(secret)) {
    throw new Error("STRIPE_SECRET_KEY is not configured for this server environment.");
  }
  stripeClient = new Stripe(secret);
  return stripeClient;
}

export function stripeIsConfigured(): boolean {
  return isConfiguredSecret(process.env.STRIPE_RESTRICTED_KEY) || isConfiguredSecret(process.env.STRIPE_SECRET_KEY);
}

export function getStripeBillingMode(): StripeBillingMode {
  const secret = configuredStripeSecret();
  if (secret?.startsWith("sk_live_") || secret?.startsWith("rk_live_")) return "live";
  if (secret?.startsWith("sk_test_") || secret?.startsWith("rk_test_")) return "test";
  return "unknown";
}

export function stripeBillingEnabled(): boolean {
  const mode = getStripeBillingMode();
  return mode === "test" || (mode === "live" && process.env.STRIPE_BILLING_LIVEMODE_ENABLED === "1");
}

/** Keep the new integration in test mode until Lewis explicitly enables live billing. */
export function assertStripeBillingMode(eventLivemode?: boolean) {
  const mode = getStripeBillingMode();
  if (mode === "unknown") throw new Error("STRIPE_KEY_MODE_UNKNOWN");
  if (eventLivemode !== undefined && eventLivemode !== (mode === "live")) {
    throw new Error("STRIPE_EVENT_MODE_MISMATCH");
  }
  if (mode === "live" && process.env.STRIPE_BILLING_LIVEMODE_ENABLED !== "1") {
    throw new Error("STRIPE_LIVE_BILLING_DISABLED");
  }
}

export function resetStripeClientForTests() {
  stripeClient = null;
}
