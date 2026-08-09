import "server-only";

import Stripe from "stripe";
import { isConfiguredSecret } from "@/lib/env/secrets";

let stripeClient: Stripe | null = null;

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

/** Keep the new integration in test mode until Lewis explicitly enables live billing. */
export function assertStripeBillingMode() {
  if (process.env.STRIPE_BILLING_LIVEMODE_ENABLED === "1") return;
  const secret = configuredStripeSecret();
  if (!secret?.startsWith("sk_test_") && !secret?.startsWith("rk_test_")) {
    throw new Error("STRIPE_LIVE_BILLING_DISABLED");
  }
}

export function resetStripeClientForTests() {
  stripeClient = null;
}
