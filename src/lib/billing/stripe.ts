import "server-only";

import Stripe from "stripe";
import { isConfiguredSecret } from "@/lib/env/secrets";

let stripeClient: Stripe | null = null;

export type StripeBillingMode = "test" | "live" | "unknown";

export type StripeAccountReadiness = {
  reachable: boolean;
  chargesEnabled: boolean | null;
  payoutsEnabled: boolean | null;
  detailsSubmitted: boolean | null;
  currentlyDue: string[];
  pastDue: string[];
  disabledReason: string | null;
};

export function stripeAccountReadyForLiveCheckout(readiness: StripeAccountReadiness | null | undefined) {
  return readiness?.reachable === true
    && readiness.chargesEnabled === true
    && readiness.payoutsEnabled === true;
}

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

/**
 * Read the account's provider-side onboarding state without exposing account
 * details or requirements to the browser. A connected key is not enough to
 * prove that Stripe can actually accept and settle live charges.
 */
export async function getStripeAccountReadiness(): Promise<StripeAccountReadiness> {
  if (!stripeIsConfigured()) {
    return {
      reachable: false,
      chargesEnabled: null,
      payoutsEnabled: null,
      detailsSubmitted: null,
      currentlyDue: [],
      pastDue: [],
      disabledReason: null,
    };
  }
  try {
    // Stripe's Accounts API uses a null id for the authenticated platform
    // account (`GET /v1/account`).
    const account = await getStripeClient().accounts.retrieve(null);
    const requirements = account.requirements;
    return {
      reachable: true,
      chargesEnabled: account.charges_enabled === true,
      payoutsEnabled: account.payouts_enabled === true,
      detailsSubmitted: account.details_submitted === true,
      currentlyDue: Array.isArray(requirements?.currently_due) ? requirements.currently_due : [],
      pastDue: Array.isArray(requirements?.past_due) ? requirements.past_due : [],
      disabledReason: typeof requirements?.disabled_reason === "string" ? requirements.disabled_reason : null,
    };
  } catch {
    return {
      reachable: false,
      chargesEnabled: null,
      payoutsEnabled: null,
      detailsSubmitted: null,
      currentlyDue: [],
      pastDue: [],
      disabledReason: "STRIPE_ACCOUNT_STATUS_UNAVAILABLE",
    };
  }
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
