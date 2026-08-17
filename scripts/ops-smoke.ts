import { isConfiguredSecret } from "@/lib/env/secrets";

type SmokeCheck = {
  name: string;
  ok: boolean;
  status: number;
  details: string;
};

type SmokeResponse = {
  status: number;
  body: string;
};

const baseUrl = (process.env.COSTIVRA_BASE_URL || "https://costivra.ai").replace(/\/$/, "");

async function request(
  path: string,
  method = "GET",
  options: { headers?: Record<string, string> } = {},
): Promise<SmokeResponse> {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: options.headers,
    redirect: "error",
    signal: AbortSignal.timeout(12_000),
  });
  const body = await response.text();
  return { status: response.status, body };
}

async function main() {
  const checks: SmokeCheck[] = [];

  try {
    const home = await request("/");
    checks.push({
      name: "Public site renders",
      ok: home.status >= 200 && home.status < 400,
      status: home.status,
      details: home.body ? `content-length=${home.body.length}` : "empty-response",
    });

    const statusApi = await request("/api/status");
    let statusParsed = false;
    if (statusApi.status >= 200 && statusApi.status < 300) {
      try {
        const payload = JSON.parse(statusApi.body);
        statusParsed =
          typeof payload?.overall === "string" &&
          typeof payload?.headline === "string" &&
          Array.isArray(payload?.services);
      } catch {
        statusParsed = false;
      }
    }
    checks.push({
      name: "Operational /api/status endpoint",
      ok: statusApi.status === 200 && statusParsed,
      status: statusApi.status,
      details: statusParsed
        ? "JSON contains overall/headline/services"
        : statusApi.body.slice(0, 220),
    });

    const inboundCron = await request("/api/cron/inbound-email");
    checks.push({
      name: "Inbound cron requires auth",
      ok: inboundCron.status === 401,
      status: inboundCron.status,
      details: inboundCron.body || "no body",
    });

    const retentionCron = await request("/api/cron/retention");
    checks.push({
      name: "Retention cron requires auth",
      ok: retentionCron.status === 401,
      status: retentionCron.status,
      details: retentionCron.body || "no body",
    });

    const operationsAlertsCron = await request("/api/cron/operations-alerts");
    checks.push({
      name: "Operations alerts cron requires auth",
      ok: operationsAlertsCron.status === 401,
      status: operationsAlertsCron.status,
      details: operationsAlertsCron.body || "no body",
    });

    const webhookGet = await request("/api/webhooks/resend");
    checks.push({
      name: "Webhook endpoint rejects browser GET",
      ok: webhookGet.status === 404 || webhookGet.status === 405,
      status: webhookGet.status,
      details: webhookGet.body || "no body",
    });

    const webhookPostNoSignature = await request("/api/webhooks/resend", "POST", {
      headers: { "content-type": "application/json" },
    });
    checks.push({
      name: "Webhook endpoint rejects unauthenticated POST",
      ok: webhookPostNoSignature.status === 503 || webhookPostNoSignature.status === 400,
      status: webhookPostNoSignature.status,
      details: webhookPostNoSignature.body || "no body",
    });

    // Do not automatically send a developer's local CRON_SECRET to production.
    // Vercel invokes cron routes with the value configured in its own production
    // environment, and that value can deliberately differ from local development.
    // An explicit token is required for a manual protected-route probe.
    const cronSecret = process.env.COSTIVRA_VERIFY_CRON_TOKEN;
    if (isConfiguredSecret(cronSecret)) {
      const inboundCronAuth = await request("/api/cron/inbound-email", "GET", {
        headers: { Authorization: `Bearer ${cronSecret}` },
      });
      checks.push({
        name: "Inbound cron accepts explicit verification token",
        ok:
          inboundCronAuth.status === 200 ||
          inboundCronAuth.status === 207 ||
          inboundCronAuth.status === 500,
        status: inboundCronAuth.status,
        details: inboundCronAuth.body || "no body",
      });

      const retentionCronAuth = await request("/api/cron/retention", "GET", {
        headers: { Authorization: `Bearer ${cronSecret}` },
      });
      checks.push({
        name: "Retention cron accepts explicit verification token",
        ok:
          retentionCronAuth.status === 200 ||
          retentionCronAuth.status === 207 ||
          retentionCronAuth.status === 500,
        status: retentionCronAuth.status,
        details: retentionCronAuth.body || "no body",
      });
    } else {
      checks.push({
        name: "Manual cron token check skipped (set COSTIVRA_VERIFY_CRON_TOKEN to enable)",
        ok: true,
        status: 0,
        details: "Unauthenticated rejection is verified here; Vercel scheduler execution is verified from deployment runtime logs.",
      });
    }

    const failures = checks.filter((check) => !check.ok);

    console.log(`\nOps smoke checks (${baseUrl})`);
    for (const check of checks) {
      const prefix = check.ok ? "[PASS]" : "[WARN]";
      console.log(`${prefix} ${check.name} (${check.status}) — ${check.details}`);
    }

    if (failures.length > 0) {
      console.error(`\n${failures.length} hard check(s) failed.`);
      process.exitCode = 1;
      return;
    }

    console.log("\nSmoke check set passed.");
  } catch (error) {
    console.error("Ops smoke failed:", error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

main();
