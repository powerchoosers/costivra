import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { isMalwareScannerConfigured } from "@/lib/security/malware-scanner";
import { retentionPolicyFromEnvironment } from "@/lib/retention/policy";

export type ReadinessStatus = "ready" | "warning" | "blocked";

export type ReadinessService = {
  id: "database" | "resend" | "worker" | "openrouter" | "malware" | "retention" | "apollo";
  name: string;
  status: ReadinessStatus;
  message: string;
};

export type SystemReadiness = {
  checkedAt: string;
  overall: ReadinessStatus;
  services: ReadinessService[];
};

type JsonRecord = Record<string, unknown>;

const record = (value: unknown): JsonRecord | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;

async function requestJson(url: string, init: RequestInit) {
  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(6_000),
    });
    const payload = record(await response.json().catch(() => null));
    return { ok: response.ok, status: response.status, payload };
  } catch {
    return { ok: false, status: 0, payload: null };
  }
}

async function databaseReadiness(db: SupabaseClient): Promise<ReadinessService> {
  try {
    const [intake, enrichment, deadLetters] = await Promise.all([
      db.from("inbound_email_addresses").select("id", { count: "exact", head: true }),
      db.from("crm_account_enrichments").select("organization_id", { count: "exact", head: true }),
      db.from("inbound_email_events").select("id", { count: "exact", head: true }).eq("status", "dead_letter"),
    ]);
    if (intake.error || enrichment.error || deadLetters.error)
      return {
        id: "database",
        name: "Supabase",
        status: "blocked",
        message: "A required operational table is unavailable.",
      };
    const deadLetterCount = deadLetters.count ?? 0;
    return {
      id: "database",
      name: "Supabase",
      status: deadLetterCount ? "warning" : "ready",
      message: deadLetterCount
        ? `${deadLetterCount} inbound email ${deadLetterCount === 1 ? "job needs" : "jobs need"} operator recovery.`
        : "Operational tables and the intake queue are reachable.",
    };
  } catch {
    return {
      id: "database",
      name: "Supabase",
      status: "blocked",
      message: "Supabase could not be reached for an operational check.",
    };
  }
}

async function resendReadiness(): Promise<ReadinessService> {
  const key = process.env.RESEND_API_KEY?.trim();
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  const domain = (process.env.RESEND_INBOUND_DOMAIN || "costivra.ai").trim().toLowerCase();
  if (!key || !webhookSecret)
    return {
      id: "resend",
      name: "Resend",
      status: "blocked",
      message: "The sending key or signed-webhook secret is missing.",
    };
  const headers = { authorization: `Bearer ${key}` };
  const [domainsResult, webhooksResult] = await Promise.all([
    requestJson("https://api.resend.com/domains", { method: "GET", headers }),
    requestJson("https://api.resend.com/webhooks", { method: "GET", headers }),
  ]);
  if (!domainsResult.ok || !webhooksResult.ok)
    return {
      id: "resend",
      name: "Resend",
      status: "blocked",
      message: "Resend rejected the key or could not be reached.",
    };
  const domains = Array.isArray(domainsResult.payload?.data)
    ? domainsResult.payload.data
    : [];
  const webhooks = Array.isArray(webhooksResult.payload?.data)
    ? webhooksResult.payload.data
    : [];
  const verifiedDomain = domains.some((item) => {
    const value = record(item);
    return value?.name === domain && value.status === "verified";
  });
  const liveWebhook = webhooks.some((item) => {
    const value = record(item);
    if (value?.status !== "enabled" || typeof value.endpoint !== "string") return false;
    try {
      const endpoint = new URL(value.endpoint);
      return endpoint.protocol === "https:" && endpoint.hostname === "costivra.ai" && endpoint.pathname === "/api/webhooks/resend";
    } catch {
      return false;
    }
  });
  if (!verifiedDomain || !liveWebhook)
    return {
      id: "resend",
      name: "Resend",
      status: "blocked",
      message: !verifiedDomain
        ? `${domain} is not verified for email.`
        : "The signed production webhook is missing or disabled.",
    };
  return {
    id: "resend",
    name: "Resend",
    status: "ready",
    message: `${domain} and the signed production webhook are verified.`,
  };
}

function workerReadiness(): ReadinessService {
  return process.env.CRON_SECRET?.trim()
    ? {
        id: "worker",
        name: "Intake worker",
        status: "ready",
        message: "The protected one-minute queue worker is configured.",
      }
    : {
        id: "worker",
        name: "Intake worker",
        status: "blocked",
        message: "CRON_SECRET is missing, so queued email attachments cannot run safely.",
      };
}

async function openRouterReadiness(): Promise<ReadinessService> {
  const key = (process.env.OPEN_ROUTER_API_KEY ?? process.env.OPENROUTER_API_KEY)?.trim();
  if (!key)
    return {
      id: "openrouter",
      name: "AI extraction",
      status: "blocked",
      message: "The server-side OpenRouter key is missing.",
    };
  const result = await requestJson("https://openrouter.ai/api/v1/key", {
    method: "GET",
    headers: { authorization: `Bearer ${key}` },
  });
  return result.ok && record(result.payload?.data)
    ? {
        id: "openrouter",
        name: "AI extraction",
        status: "ready",
        message: "OpenRouter accepted the extraction key.",
      }
    : {
        id: "openrouter",
        name: "AI extraction",
        status: "blocked",
        message: "OpenRouter rejected the key or could not be reached.",
      };
}

function malwareReadiness(): ReadinessService {
  return isMalwareScannerConfigured()
    ? {
        id: "malware",
        name: "Malware scanning",
        status: "warning",
        message: "A scanner is configured. Run a clean/infected file exercise before launch.",
      }
    : {
        id: "malware",
        name: "Malware scanning",
        status: "blocked",
        message: "No scanner is configured; source files remain safely quarantined.",
      };
}

async function retentionReadiness(db: SupabaseClient): Promise<ReadinessService> {
  const policy = retentionPolicyFromEnvironment();
  let latest;
  try {
    latest = await db
      .from("retention_runs")
      .select("status,mode,started_at")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
  } catch {
    return {
      id: "retention",
      name: "Data retention",
      status: "blocked",
      message: "The server-only retention ledger is unavailable.",
    };
  }
  if (latest.error)
    return {
      id: "retention",
      name: "Data retention",
      status: "blocked",
      message: "The server-only retention ledger is unavailable.",
    };
  if (!policy.enforce)
    return {
      id: "retention",
      name: "Data retention",
      status: "warning",
      message: "Daily retention reporting is configured; file deletion remains disabled until the policy is approved.",
    };
  if (!policy.originalDays)
    return {
      id: "retention",
      name: "Data retention",
      status: "warning",
      message: `Quarantine cleanup is enforced after ${policy.quarantineDays} days; original-source retention still needs an approved window.`,
    };
  const lastStartedAt = latest.data?.started_at
    ? new Date(String(latest.data.started_at)).getTime()
    : 0;
  const recent = Number.isFinite(lastStartedAt) && Date.now() - lastStartedAt < 48 * 60 * 60 * 1000;
  const healthy = latest.data?.status === "completed" && recent;
  return healthy
    ? {
        id: "retention",
        name: "Data retention",
        status: "ready",
        message: `Daily enforcement is healthy: quarantine ${policy.quarantineDays} days, originals ${policy.originalDays} days.`,
      }
    : {
        id: "retention",
        name: "Data retention",
        status: "warning",
        message: "Retention enforcement is configured, but a recent clean run has not been recorded.",
      };
}

async function apolloReadiness(): Promise<ReadinessService> {
  const key = process.env.APOLLO_API_KEY?.trim();
  if (!key)
    return {
      id: "apollo",
      name: "Company enrichment",
      status: "warning",
      message: "Apollo is optional and is not configured.",
    };
  const result = await requestJson("https://api.apollo.io/api/v1/auth/health", {
    method: "GET",
    headers: {
      "x-api-key": key,
      "content-type": "application/json",
      "cache-control": "no-cache",
    },
  });
  const healthy = result.payload?.healthy === true;
  const loggedIn = result.payload?.is_logged_in === true;
  return result.ok && healthy && loggedIn
    ? {
        id: "apollo",
        name: "Company enrichment",
        status: "ready",
        message: "Apollo authenticated the internal company-enrichment key.",
      }
    : {
        id: "apollo",
        name: "Company enrichment",
        status: "warning",
        message: "Apollo did not authenticate the configured key.",
      };
}

function overallStatus(services: ReadinessService[]): ReadinessStatus {
  return services.some((service) => service.status === "blocked")
    ? "blocked"
    : services.some((service) => service.status === "warning")
      ? "warning"
      : "ready";
}

export async function checkSystemReadiness(
  db: SupabaseClient,
  options: { includeOptionalServices?: boolean; includeOperatorServices?: boolean } = {},
): Promise<SystemReadiness> {
  const includeOptionalServices = options.includeOptionalServices !== false;
  const includeOperatorServices = options.includeOperatorServices !== false;
  const [database, resend, openrouter, retention, apollo] = await Promise.all([
    databaseReadiness(db),
    resendReadiness(),
    openRouterReadiness(),
    includeOperatorServices ? retentionReadiness(db) : Promise.resolve(null),
    includeOptionalServices ? apolloReadiness() : Promise.resolve(null),
  ]);
  const services = [
    database,
    resend,
    workerReadiness(),
    openrouter,
    malwareReadiness(),
  ];
  if (retention) services.push(retention);
  if (apollo) services.push(apollo);
  return {
    checkedAt: new Date().toISOString(),
    overall: overallStatus(services),
    services,
  };
}
