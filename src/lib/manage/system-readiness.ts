import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getMalwareScannerConfig,
  scanFileForMalware,
} from "@/lib/security/malware-scanner";
import { getConfiguredEnv, isConfiguredSecret } from "@/lib/env/secrets";
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

function extractResendMessage(payload: unknown) {
  const record = payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as JsonRecord)
    : null;
  if (!record) return null;
  if (typeof record.name === "string" && typeof record.message === "string") {
    return `${record.name}: ${record.message}`;
  }
  if (typeof record.message === "string") return record.message;
  if (typeof record.error === "string") return record.error;
  return null;
}

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
  const key = getConfiguredEnv("RESEND_API_KEY");
  const webhookSecret = getConfiguredEnv("RESEND_WEBHOOK_SECRET");
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
  if (!domainsResult.ok || !webhooksResult.ok) {
    const domainsError = !domainsResult.ok
      ? `domains endpoint blocked (HTTP ${domainsResult.status}${extractResendMessage(domainsResult.payload) ? `: ${extractResendMessage(domainsResult.payload)}` : ""})`
      : null;
    const webhooksError = !webhooksResult.ok
      ? `webhooks endpoint blocked (HTTP ${webhooksResult.status}${extractResendMessage(webhooksResult.payload) ? `: ${extractResendMessage(webhooksResult.payload)}` : ""})`
      : null;
    const blocked = [domainsError, webhooksError].filter(Boolean).join(" ");
    return {
      id: "resend",
      name: "Resend",
      status: "blocked",
      message: `Resend is not ready: ${blocked || "rejected the key or could not be reached."}`,
    };
  }
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

async function workerReadiness(db: SupabaseClient): Promise<ReadinessService> {
  if (!isConfiguredSecret(process.env.CRON_SECRET))
    return {
      id: "worker",
      name: "Intake worker",
      status: "blocked",
      message: "CRON_SECRET is missing, so queued email attachments cannot run safely.",
    };
  try {
    const latest = await db
      .from("inbound_worker_runs")
      .select("status,started_at,completed_at,error_code")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest.error)
      return {
        id: "worker",
        name: "Intake worker",
        status: "blocked",
        message: "The worker health ledger is unavailable.",
      };
    if (!latest.data)
      return {
        id: "worker",
        name: "Intake worker",
        status: "warning",
        message: "The worker is configured, but no completed production run has been recorded yet.",
      };
    const startedAt = Date.parse(String(latest.data.started_at));
    const recent = Number.isFinite(startedAt) && Date.now() - startedAt < 5 * 60 * 1_000;
    if (!recent)
      return {
        id: "worker",
        name: "Intake worker",
        status: "blocked",
        message: "The one-minute intake worker has not checked in during the last five minutes.",
      };
    if (latest.data.status === "failed")
      return {
        id: "worker",
        name: "Intake worker",
        status: "blocked",
        message: "The latest intake worker run failed before it could safely claim queued work.",
      };
    if (latest.data.status === "running")
      return {
        id: "worker",
        name: "Intake worker",
        status: "warning",
        message: "The latest intake worker run is still in progress.",
      };
    if (latest.data.status === "completed_with_warnings")
      return {
        id: "worker",
        name: "Intake worker",
        status: "warning",
        message: "The worker completed, but its operator-alert monitoring needs attention.",
      };
    return {
      id: "worker",
      name: "Intake worker",
      status: "ready",
      message: "The protected one-minute intake worker completed a recent production run.",
    };
  } catch {
    return {
      id: "worker",
      name: "Intake worker",
      status: "blocked",
      message: "The worker health ledger could not be reached.",
    };
  }
}

async function openRouterReadiness(): Promise<ReadinessService> {
  const key = getConfiguredEnv("OPEN_ROUTER_API_KEY") ?? getConfiguredEnv("OPENROUTER_API_KEY");
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

async function malwareReadiness(runLiveProbe: boolean): Promise<ReadinessService> {
  const config = getMalwareScannerConfig();
  if (config.provider === "unavailable") {
    const message = config.code === "ambiguous_configuration"
      ? "Both malware scanner providers are configured. Remove one before processing files."
      : config.code === "invalid_configuration"
        ? "Malware scanner configuration is invalid. Files remain safely quarantined."
        : "No scanner is configured; source files remain safely quarantined.";
    return {
      id: "malware",
      name: "Malware scanning",
      status: "blocked",
      message,
    };
  }
  if (!runLiveProbe)
    return {
      id: "malware",
      name: "Malware scanning",
      status: "warning",
      message: config.provider === "cloudmersive"
        ? `Cloudmersive is configured (${config.monthlyLimit} monthly calls, ${config.minIntervalMs}ms minimum interval, ${(config.maxFileBytes / 1024 / 1024).toFixed(2)} MB provider limit); an owner must run the live clean and inert-file probes.`
        : "A scanner is configured; an owner can run the live readiness probe.",
    };

  const probe = await scanFileForMalware({
    buffer: Buffer.from("Costivra malware-scanner readiness probe. This harmless file contains no executable content.", "utf8"),
    filename: "costivra-readiness-probe.txt",
    mimeType: "text/plain",
  });
  if (probe.status === "clean")
    return {
      id: "malware",
      name: "Malware scanning",
      status: "warning",
      message: "The scanner accepted a live clean-file probe. Run the documented infected-file exercise before launch.",
    };
  if (probe.status === "infected")
    return {
      id: "malware",
      name: "Malware scanning",
      status: "blocked",
      message: "The scanner incorrectly classified the harmless readiness file as infected.",
    };
  return {
    id: "malware",
    name: "Malware scanning",
    status: "blocked",
    message: "The configured scanner rejected the live probe or could not be reached.",
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
  const key = getConfiguredEnv("APOLLO_API_KEY");
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
  const [database, resend, worker, openrouter, malware, retention, apollo] = await Promise.all([
    databaseReadiness(db),
    resendReadiness(),
    workerReadiness(db),
    openRouterReadiness(),
    malwareReadiness(includeOperatorServices),
    includeOperatorServices ? retentionReadiness(db) : Promise.resolve(null),
    includeOptionalServices ? apolloReadiness() : Promise.resolve(null),
  ]);
  const services = [
    database,
    resend,
    worker,
    openrouter,
    malware,
  ];
  if (retention) services.push(retention);
  if (apollo) services.push(apollo);
  return {
    checkedAt: new Date().toISOString(),
    overall: overallStatus(services),
    services,
  };
}
