import { createClient } from "@supabase/supabase-js";
import { isConfiguredSecret } from "../src/lib/env/secrets";

type EnvStatus = "ok" | "missing" | "placeholder";
type JsonRecord = Record<string, unknown>;
type ResendProbeResult =
  | { ok: false; blocked: string[]; live: false; details?: never }
  | {
      ok: boolean;
      blocked: string[];
      live: true;
      details: { verifiedDomain: boolean; liveWebhook: boolean };
    };

function hasRealValue(value: string | undefined): EnvStatus {
  const normalized = value?.trim();
  if (!normalized) return "missing";
  if (normalized.includes("Encrypted")) return "placeholder";
  if (normalized.toLowerCase().includes("placeholder")) return "placeholder";
  if (!isConfiguredSecret(normalized)) return "placeholder";
  return "ok";
}

function readMessage(payload: unknown): string | null {
  const data = payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as JsonRecord)
    : null;
  if (!data) return null;
  if (typeof data.name === "string" && typeof data.message === "string") {
    return `${data.name}: ${data.message}`;
  }
  if (typeof data.message === "string") return data.message;
  if (typeof data.error === "string") return data.error;
  return null;
}

async function requestJson(url: string, bearer?: string) {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: bearer ? { authorization: `Bearer ${bearer}` } : undefined,
      signal: AbortSignal.timeout(8_000),
      redirect: "error",
    });
    const payload = await response.json().catch(() => null);
    return { ok: response.ok, status: response.status, payload };
  } catch {
    return { ok: false, status: 0, payload: null };
  }
}

async function resendReadiness(): Promise<ResendProbeResult> {
  const key = process.env.RESEND_API_KEY?.trim() || "";
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET?.trim() || "";
  const domain = (process.env.RESEND_INBOUND_DOMAIN || "costivra.ai").trim().toLowerCase();
  const from = process.env.RESEND_FROM_EMAIL?.trim() || "";

  console.log("\nResend provider checks:");
  console.log(`  RESEND_API_KEY: ${hasRealValue(key)}`);
  console.log(`  RESEND_WEBHOOK_SECRET: ${hasRealValue(webhookSecret)}`);
  console.log(`  RESEND_INBOUND_DOMAIN: ${domain}`);
  console.log(`  RESEND_FROM_EMAIL: ${from || "<missing>"}`);

  if (hasRealValue(key) !== "ok" || hasRealValue(webhookSecret) !== "ok") {
    return {
      ok: false,
      blocked: ["Missing or placeholder RESEND_API_KEY/RESEND_WEBHOOK_SECRET."],
      live: false,
    };
  }

  const [domainsResult, webhooksResult] = await Promise.all([
    requestJson("https://api.resend.com/domains", key),
    requestJson("https://api.resend.com/webhooks", key),
  ]);

  if (!domainsResult.ok || !webhooksResult.ok) {
    return {
      ok: false,
      blocked: [
        !domainsResult.ok
          ? `Resend domains endpoint blocked (HTTP ${domainsResult.status}${readMessage(domainsResult.payload) ? `: ${readMessage(domainsResult.payload)}` : ""}).`
          : null,
        !webhooksResult.ok
          ? `Resend webhooks endpoint blocked (HTTP ${webhooksResult.status}${readMessage(webhooksResult.payload) ? `: ${readMessage(webhooksResult.payload)}` : ""}).`
          : null,
      ].filter((line): line is string => typeof line === "string"),
      live: false,
    };
  }

  const domains = Array.isArray(domainsResult.payload?.data)
    ? domainsResult.payload.data
    : [];
  const webhooks = Array.isArray(webhooksResult.payload?.data)
    ? webhooksResult.payload.data
    : [];

  const record = (item: unknown) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? (item as Record<string, unknown>)
      : null;

  const verifiedDomain = domains.some((item: unknown) => {
    const value = record(item);
    return value?.name === domain && value.status === "verified";
  });

  const liveWebhook = webhooks.some((item: unknown) => {
    const value = record(item);
    if (value?.status !== "enabled" || typeof value.endpoint !== "string") return false;
    try {
      const endpoint = new URL(value.endpoint);
      return endpoint.protocol === "https:" && endpoint.hostname === "costivra.ai" && endpoint.pathname === "/api/webhooks/resend";
    } catch {
      return false;
    }
  });

  const notes: string[] = [];
  if (!verifiedDomain) notes.push(`Domain not verified in Resend: ${domain}`);
  if (!liveWebhook) notes.push("No enabled webhook to https://costivra.ai/api/webhooks/resend found in Resend.");

  return {
    ok: verifiedDomain && liveWebhook,
    blocked: notes,
    live: true,
    details: {
      verifiedDomain,
      liveWebhook,
    },
  };
}

async function openRouterReadiness() {
  const key = process.env.OPEN_ROUTER_API_KEY?.trim() || process.env.OPENROUTER_API_KEY?.trim() || "";

  if (hasRealValue(key) !== "ok") {
    console.log("\nOpenRouter AI checks:");
    console.log(`  OPEN_ROUTER_API_KEY: ${hasRealValue(key)}`);
    return { ok: false, status: "missing" as const };
  }

  const result = await requestJson("https://openrouter.ai/api/v1/key", key);
  if (!result.ok) {
    console.log("\nOpenRouter AI checks: blocked");
    console.log(`  - Endpoint returned HTTP ${result.status}`);
    return { ok: false, status: "invalid" as const };
  }
  console.log("\nOpenRouter AI checks: ready");
  return { ok: true, status: "ready" as const };
}

async function scannerReadiness() {
  const url = process.env.MALWARE_SCANNER_URL?.trim();
  const apiKey = process.env.CLOUDMERSIVE_API_KEY?.trim();
  console.log("\nMalware scanner checks:");
  console.log(`  MALWARE_SCANNER_URL: ${hasRealValue(url)}`);
  console.log(`  CLOUDMERSIVE_API_KEY: ${hasRealValue(apiKey)}`);

  if (hasRealValue(url) === "ok" || hasRealValue(apiKey) === "ok") {
    console.log("  - Malware scanner configured. Production intake will perform live virus scanning.");
  } else {
    console.log("  - Malware scanner unavailable. Private intake will quarantine files until scanning is active.");
  }
}

async function runSupabaseProbe(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  const requiredDb = hasRealValue(url);
  const requiredSecret = hasRealValue(secret);

  console.log("\nSupabase probe:");
  console.log(`  NEXT_PUBLIC_SUPABASE_URL: ${requiredDb}`);
  console.log(`  SUPABASE_SECRET_KEY: ${requiredSecret}`);

  if (!url || !secret || requiredDb !== "ok" || requiredSecret !== "ok") {
    console.log("  Full database checks skipped: missing runtime credentials.");
    return;
  }

  try {
    const db = createClient(url, secret, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const [inbound, workers] = await Promise.all([
      db.from("inbound_email_events").select("id", { count: "exact", head: true }),
      db.from("inbound_worker_runs").select("id,status", { count: "exact", head: true }),
    ]);

    if (inbound.error || workers.error) {
      console.log("  - blocked: one or more required operational tables are not reachable.");
      return;
    }

    const inboundCount = inbound.count ?? 0;
    console.log(`  - ready: Supabase operational tables are reachable (${inboundCount} inbound events in total so far).`);
    const latestWorker = workers.data?.[0];
    if (latestWorker?.status) {
      console.log(`  - latest inbound_worker_runs status: ${latestWorker.status}`);
    }
  } catch (error) {
    console.log("  - blocked: could not connect to Supabase with provided credentials.");
    console.log(`  - detail: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function run() {
  const configuredSecret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const required = {
    RESEND_API_KEY: hasRealValue(process.env.RESEND_API_KEY),
    RESEND_WEBHOOK_SECRET: hasRealValue(process.env.RESEND_WEBHOOK_SECRET),
    RESEND_INBOUND_DOMAIN: hasRealValue(process.env.RESEND_INBOUND_DOMAIN),
    NEXT_PUBLIC_SUPABASE_URL: hasRealValue(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: hasRealValue(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    SUPABASE_SECRET_KEY: hasRealValue(configuredSecret),
    CRON_SECRET: hasRealValue(process.env.CRON_SECRET),
    OPEN_ROUTER_API_KEY: hasRealValue(process.env.OPEN_ROUTER_API_KEY || process.env.OPENROUTER_API_KEY),
  } as const;

  console.log("Environment variable status:");
  for (const [name, status] of Object.entries(required)) {
    console.log(`  ${name}: ${status}`);
  }

  const resend = await resendReadiness();
  if (!resend.live) {
    console.log("\nResend probe result: blocked");
    for (const line of resend.blocked) {
      console.log(`  - ${line}`);
    }
  } else {
    console.log(`\nResend probe result: ${resend.ok ? "ready" : "blocked"}`);
    if (resend.ok) {
      console.log("  Key, verified domain, and webhook are live and aligned.");
    } else {
      console.log("  Blocking checks:");
      for (const line of resend.blocked) {
        console.log(`  - ${line}`);
      }
    }
  }
  const openRouter = await openRouterReadiness();
  await scannerReadiness();

  const ready = hasRealValue(process.env.RESEND_API_KEY) === "ok"
    && hasRealValue(process.env.RESEND_WEBHOOK_SECRET) === "ok"
    && hasRealValue(process.env.NEXT_PUBLIC_SUPABASE_URL) === "ok"
    && hasRealValue(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY) === "ok";

  if (ready) {
    await runSupabaseProbe();
  } else {
    console.log("\nNext actions before full system test:");
    if (hasRealValue(process.env.RESEND_API_KEY) !== "ok" || hasRealValue(process.env.RESEND_WEBHOOK_SECRET) !== "ok") {
      console.log("  - Add real Resend key/secret to local .env.local and Vercel envs.");
    }
    if (hasRealValue(process.env.NEXT_PUBLIC_SUPABASE_URL) !== "ok") {
      console.log("  - Add NEXT_PUBLIC_SUPABASE_URL from Costivra project.");
    }
    if (hasRealValue(configuredSecret) !== "ok") {
      console.log("  - Add SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) from Supabase project.");
    }
    if (hasRealValue(process.env.OPEN_ROUTER_API_KEY || process.env.OPENROUTER_API_KEY) !== "ok") {
      console.log("  - Add OPEN_ROUTER_API_KEY for invoice extraction + assistant features.");
    }
    if (openRouter && openRouter.status === "ready") {
      console.log("  - OPEN_ROUTER_API_KEY is valid despite the script running without full local readiness.");
    }
    if (hasRealValue(process.env.CRON_SECRET) !== "ok") {
      console.log("  - Add CRON_SECRET in local + Vercel for cron worker auth.");
    }
  }
}

run().catch((error) => {
  console.error("ops readiness command failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
