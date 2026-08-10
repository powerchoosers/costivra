import "server-only";

import type Stripe from "stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type BillingDb = ReturnType<typeof createServerSupabaseClient>;

type CheckoutIntent = {
  id: string;
  email: string;
  full_name: string;
  company_name: string;
  plan_key: "starter" | "growth" | "enterprise";
  status: string;
  stripe_customer_id: string | null;
  stripe_checkout_session_id: string | null;
  stripe_subscription_id: string | null;
  user_id: string | null;
  organization_id: string | null;
};

export type PaidCheckoutProvisioning = {
  organizationId: string | null;
  userId: string | null;
  nextAction: "activate_password" | "sign_in" | "contact_support";
  manualReview: boolean;
};

function safeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://costivra.ai").replace(/\/$/, "");
}

function permissionsForOwner() {
  return ["documents:write", "opportunities:approve", "settings:write", "reports:export"];
}

async function markManualReview(db: BillingDb, intent: CheckoutIntent, safeError: string, userId: string | null) {
  const { error } = await db.from("billing_checkout_intents").update({
    status: "manual_review",
    next_action: "contact_support",
    safe_error: safeError,
    user_id: userId,
    updated_at: new Date().toISOString(),
  }).eq("id", intent.id);
  if (error) throw error;
  return { organizationId: null, userId, nextAction: "contact_support", manualReview: true } satisfies PaidCheckoutProvisioning;
}

async function findExistingUser(db: BillingDb, email: string): Promise<{ id: string; full_name: string | null } | null> {
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("id,full_name")
    .eq("email", email)
    .limit(1)
    .maybeSingle();
  if (profileError) throw profileError;
  if (typeof profile?.id === "string") return { id: profile.id, full_name: typeof profile.full_name === "string" ? profile.full_name : null };

  // Profiles are normally created by the auth trigger. This fallback handles
  // an older user whose profile row was not backfilled, without exposing the
  // account lookup to the browser.
  const { data: users, error: usersError } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersError) throw usersError;
  const user = users.users.find((candidate) => safeEmail(candidate.email) === email);
  return user ? { id: user.id, full_name: typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null } : null;
}

async function ensureProfile(db: BillingDb, userId: string, email: string, fullName: string) {
  const { error } = await db.from("profiles").upsert({
    id: userId,
    email,
    full_name: fullName || email,
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });
  if (error) throw error;
}

async function createOrganization(db: BillingDb, intent: CheckoutIntent, userId: string): Promise<string> {
  const { data: organization, error: organizationError } = await db.from("organizations").insert({
    name: intent.company_name,
    primary_contact_name: intent.full_name,
  }).select("id").single();
  if (organizationError || typeof organization?.id !== "string") throw organizationError ?? new Error("PAID_WORKSPACE_CREATE_FAILED");

  const { error: membershipError } = await db.from("organization_memberships").insert({
    organization_id: organization.id,
    user_id: userId,
    role: "owner",
    permissions: permissionsForOwner(),
  });
  if (membershipError) throw membershipError;
  return organization.id;
}

async function ensureOnboarding(db: BillingDb, organizationId: string) {
  const { data: onboarding, error: readError } = await db
    .from("organization_onboarding")
    .select("source")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (readError && readError.code !== "42P01") throw readError;
  if (!onboarding || onboarding.source === "internal") {
    const { error } = await db.from("organization_onboarding").upsert({
      organization_id: organizationId,
      source: "paid_checkout",
      status: "not_started",
      current_step: "account_confirmed",
      updated_at: new Date().toISOString(),
    }, { onConflict: "organization_id" });
    if (error && error.code !== "42P01") throw error;
  }
}

/**
 * Provision one paid Checkout intent after Stripe has signed the event.
 * It is safe to call repeatedly: the intent, auth user, membership, and
 * workspace are each looked up before creation.
 */
export async function provisionPaidCheckout(
  db: BillingDb,
  session: Stripe.Checkout.Session,
): Promise<PaidCheckoutProvisioning> {
  const intentId = typeof session.metadata?.checkout_intent_id === "string" ? session.metadata.checkout_intent_id : null;
  if (!intentId) return { organizationId: null, userId: null, nextAction: "contact_support", manualReview: false };

  const { data: intent, error: intentError } = await db
    .from("billing_checkout_intents")
    .select("id,email,full_name,company_name,plan_key,status,stripe_customer_id,stripe_checkout_session_id,stripe_subscription_id,user_id,organization_id")
    .eq("id", intentId)
    .maybeSingle();
  if (intentError) throw intentError;
  if (!intent) throw new Error("PAID_CHECKOUT_INTENT_NOT_FOUND");

  const typedIntent = intent as CheckoutIntent;
  if (typedIntent.status === "provisioned" && typedIntent.organization_id) {
    return { organizationId: typedIntent.organization_id, userId: typedIntent.user_id, nextAction: "sign_in", manualReview: false };
  }

  const email = safeEmail(typedIntent.email);
  const existing = await findExistingUser(db, email);
  let userId = existing?.id ?? typedIntent.user_id;
  let nextAction: PaidCheckoutProvisioning["nextAction"] = existing ? "sign_in" : "activate_password";

  if (!userId) {
    const { data: invited, error: inviteError } = await db.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: typedIntent.full_name,
        company_name: typedIntent.company_name,
        paid_checkout_intent_id: typedIntent.id,
      },
      redirectTo: `${appUrl()}/auth/invite`,
    });
    if (inviteError) {
      // An invite can race with a webhook retry. Re-read the profile before
      // treating the event as a failure.
      const raced = await findExistingUser(db, email);
      if (!raced) throw inviteError;
      userId = raced.id;
      nextAction = "sign_in";
    } else {
      userId = invited.user?.id ?? null;
      if (!userId) throw new Error("PAID_CHECKOUT_USER_CREATE_FAILED");
    }
  }

  await ensureProfile(db, userId, email, existing?.full_name ?? typedIntent.full_name);

  const { data: memberships, error: membershipsError } = await db
    .from("organization_memberships")
    .select("organization_id,role")
    .eq("user_id", userId);
  if (membershipsError) throw membershipsError;
  if (memberships && memberships.length > 1) return markManualReview(db, typedIntent, "EMAIL_HAS_MULTIPLE_WORKSPACES", userId);

  let organizationId = typeof memberships?.[0]?.organization_id === "string" ? memberships[0].organization_id : null;
  if (!organizationId) organizationId = await createOrganization(db, typedIntent, userId);
  await ensureOnboarding(db, organizationId);

  if (typeof session.customer === "string") {
    const { error: customerError } = await db.from("billing_customers").upsert({
      organization_id: organizationId,
      stripe_customer_id: session.customer,
      billing_email: email,
      updated_at: new Date().toISOString(),
    }, { onConflict: "organization_id" });
    if (customerError) throw customerError;
  }

  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;
  const { error: intentUpdateError } = await db.from("billing_checkout_intents").update({
    status: "provisioned",
    stripe_customer_id: typeof session.customer === "string" ? session.customer : typedIntent.stripe_customer_id,
    stripe_checkout_session_id: session.id,
    stripe_subscription_id: subscriptionId ?? typedIntent.stripe_subscription_id,
    user_id: userId,
    organization_id: organizationId,
    next_action: nextAction,
    safe_error: null,
    updated_at: new Date().toISOString(),
  }).eq("id", typedIntent.id);
  if (intentUpdateError) throw intentUpdateError;

  return { organizationId, userId, nextAction, manualReview: false };
}

export async function markCheckoutIntentPaymentConfirmed(db: BillingDb, intentId: string, session: Stripe.Checkout.Session) {
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;
  const { error } = await db.from("billing_checkout_intents").update({
    status: "payment_confirmed",
    stripe_checkout_session_id: session.id,
    stripe_subscription_id: subscriptionId,
    updated_at: new Date().toISOString(),
  }).eq("id", intentId).in("status", ["created", "checkout_open"]);
  if (error) throw error;
}
