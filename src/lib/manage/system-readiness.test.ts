import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const isMalwareScannerConfigured = vi.hoisted(() => vi.fn());
const scanFileForMalware = vi.hoisted(() => vi.fn());
vi.mock("@/lib/security/malware-scanner", () => ({
  isMalwareScannerConfigured,
  scanFileForMalware,
}));

import { checkSystemReadiness } from "@/lib/manage/system-readiness";

function response(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function database(options: {
  deadLetters?: number;
  failTable?: string;
  retentionRun?: Record<string, unknown> | null;
  workerRun?: Record<string, unknown> | null;
} = {}) {
  const result = (table: string) => ({
    data: null,
    count: table === "inbound_email_events" ? options.deadLetters ?? 0 : 1,
    error: options.failTable === table ? { message: "table unavailable" } : null,
  });
  return {
    from: vi.fn((table: string) => ({
      select: vi.fn(() => {
        if (table === "inbound_email_events")
          return { eq: vi.fn().mockResolvedValue(result(table)) };
        if (table === "retention_runs")
          return {
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: options.retentionRun ?? null,
                  error: options.failTable === table ? { message: "table unavailable" } : null,
                }),
              })),
            })),
          };
        if (table === "inbound_worker_runs")
          return {
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: options.workerRun === undefined
                    ? {
                        status: "completed",
                        started_at: new Date().toISOString(),
                        completed_at: new Date().toISOString(),
                        error_code: null,
                      }
                    : options.workerRun,
                  error: options.failTable === table ? { message: "table unavailable" } : null,
                }),
              })),
            })),
          };
        return Promise.resolve(result(table));
      }),
    })),
  };
}

describe("owner system readiness", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "resend-secret-for-test");
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "webhook-secret-for-test");
    vi.stubEnv("RESEND_INBOUND_DOMAIN", "costivra.ai");
    vi.stubEnv("CRON_SECRET", "cron-secret-for-test");
    vi.stubEnv("OPEN_ROUTER_API_KEY", "openrouter-secret-for-test");
    vi.stubEnv("APOLLO_API_KEY", "apollo-secret-for-test");
    vi.stubEnv("RETENTION_ENFORCEMENT_ENABLED", "0");
    isMalwareScannerConfigured.mockReset();
    isMalwareScannerConfigured.mockReturnValue(true);
    scanFileForMalware.mockReset();
    scanFileForMalware.mockResolvedValue({ status: "clean" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("checks fixed provider endpoints and never returns secret values", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url === "https://api.resend.com/domains")
        return response({ data: [{ name: "costivra.ai", status: "verified" }] });
      if (url === "https://api.resend.com/webhooks")
        return response({ data: [{ endpoint: "https://costivra.ai/api/webhooks/resend", status: "enabled" }] });
      if (url === "https://openrouter.ai/api/v1/key")
        return response({ data: { label: "Costivra" } });
      if (url === "https://api.apollo.io/api/v1/auth/health")
        return response({ healthy: true, is_logged_in: true });
      return response({}, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await checkSystemReadiness(database() as never);

    expect(result.services.map(({ id, status }) => ({ id, status }))).toEqual([
      { id: "database", status: "ready" },
      { id: "resend", status: "ready" },
      { id: "worker", status: "ready" },
      { id: "openrouter", status: "ready" },
      { id: "malware", status: "warning" },
      { id: "retention", status: "warning" },
      { id: "apollo", status: "ready" },
    ]);
    expect(result.overall).toBe("warning");
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual(expect.arrayContaining([
      "https://api.resend.com/domains",
      "https://api.resend.com/webhooks",
      "https://openrouter.ai/api/v1/key",
      "https://api.apollo.io/api/v1/auth/health",
    ]));
    expect(scanFileForMalware).toHaveBeenCalledWith(expect.objectContaining({
      filename: "costivra-readiness-probe.txt",
      mimeType: "text/plain",
    }));
    expect(scanFileForMalware.mock.calls[0][0].buffer.toString("utf8")).toMatch(/harmless/i);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("resend-secret-for-test");
    expect(serialized).not.toContain("webhook-secret-for-test");
    expect(serialized).not.toContain("cron-secret-for-test");
    expect(serialized).not.toContain("openrouter-secret-for-test");
    expect(serialized).not.toContain("apollo-secret-for-test");

    fetchMock.mockClear();
    const customerFacing = await checkSystemReadiness(database() as never, {
      includeOptionalServices: false,
      includeOperatorServices: false,
    });
    expect(customerFacing.services.some((item) => item.id === "apollo")).toBe(false);
    expect(scanFileForMalware).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls.map(([url]) => String(url))).not.toContain(
      "https://api.apollo.io/api/v1/auth/health",
    );
  });

  it.each([
    ["unavailable", /rejected.*or could not be reached/i],
    ["failed", /rejected.*or could not be reached/i],
    ["infected", /incorrectly classified/i],
  ] as const)("blocks launch when the live malware probe returns %s", async (status, message) => {
    scanFileForMalware.mockResolvedValue({ status });
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("resend.com/domains")) return response({ data: [{ name: "costivra.ai", status: "verified" }] });
      if (url.includes("resend.com/webhooks")) return response({ data: [{ endpoint: "https://costivra.ai/api/webhooks/resend", status: "enabled" }] });
      if (url.includes("openrouter.ai")) return response({ data: { label: "Costivra" } });
      return response({ healthy: true, is_logged_in: true });
    }));

    const result = await checkSystemReadiness(database() as never);

    expect(result.services).toContainEqual(expect.objectContaining({
      id: "malware",
      status: "blocked",
      message: expect.stringMatching(message),
    }));
    expect(result.overall).toBe("blocked");
  });

  it("fails closed when required configuration is missing", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "");
    vi.stubEnv("CRON_SECRET", "");
    vi.stubEnv("OPEN_ROUTER_API_KEY", "");
    vi.stubEnv("APOLLO_API_KEY", "");
    isMalwareScannerConfigured.mockReturnValue(false);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await checkSystemReadiness(database() as never);

    expect(result.overall).toBe("blocked");
    expect(result.services).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "resend", status: "blocked" }),
      expect.objectContaining({ id: "worker", status: "blocked" }),
      expect.objectContaining({ id: "openrouter", status: "blocked" }),
      expect.objectContaining({ id: "malware", status: "blocked" }),
      expect.objectContaining({ id: "apollo", status: "warning" }),
    ]));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports rejected credentials and a disabled production webhook", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url === "https://api.resend.com/domains")
        return response({ data: [{ name: "costivra.ai", status: "verified" }] });
      if (url === "https://api.resend.com/webhooks")
        return response({ data: [{ endpoint: "https://costivra.ai/api/webhooks/resend", status: "disabled" }] });
      if (url === "https://openrouter.ai/api/v1/key") return response({ message: "Unauthorized" }, 401);
      if (url === "https://api.apollo.io/api/v1/auth/health")
        return response({ healthy: true, is_logged_in: false });
      return response({}, 404);
    }));

    const result = await checkSystemReadiness(database() as never);

    expect(result.services).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "resend", status: "blocked", message: expect.stringMatching(/webhook/i) }),
      expect.objectContaining({ id: "openrouter", status: "blocked" }),
      expect.objectContaining({ id: "apollo", status: "warning" }),
    ]));
  });

  it("surfaces dead-letter work and required-table failures", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("resend.com/domains")) return response({ data: [{ name: "costivra.ai", status: "verified" }] });
      if (url.includes("resend.com/webhooks")) return response({ data: [{ endpoint: "https://costivra.ai/api/webhooks/resend", status: "enabled" }] });
      if (url.includes("openrouter.ai")) return response({ data: { label: "Costivra" } });
      return response({ healthy: true, is_logged_in: true });
    }));

    const attention = await checkSystemReadiness(database({ deadLetters: 2 }) as never);
    expect(attention.services).toContainEqual(expect.objectContaining({
      id: "database",
      status: "warning",
      message: expect.stringMatching(/2 inbound email jobs/i),
    }));

    const failed = await checkSystemReadiness(database({ failTable: "crm_account_enrichments" }) as never);
    expect(failed.services).toContainEqual(expect.objectContaining({ id: "database", status: "blocked" }));

    const unreachable = await checkSystemReadiness({
      from: vi.fn(() => {
        throw new Error("network unavailable");
      }),
    } as never);
    expect(unreachable.services).toContainEqual(expect.objectContaining({
      id: "database",
      status: "blocked",
      message: expect.stringMatching(/could not be reached/i),
    }));
  });

  it("proves the scheduled worker from its server-only run ledger", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("resend.com/domains")) return response({ data: [{ name: "costivra.ai", status: "verified" }] });
      if (url.includes("resend.com/webhooks")) return response({ data: [{ endpoint: "https://costivra.ai/api/webhooks/resend", status: "enabled" }] });
      if (url.includes("openrouter.ai")) return response({ data: { label: "Costivra" } });
      return response({ healthy: true, is_logged_in: true });
    }));

    const stale = await checkSystemReadiness(database({
      workerRun: {
        status: "completed",
        started_at: "2026-01-01T00:00:00.000Z",
        completed_at: "2026-01-01T00:00:01.000Z",
        error_code: null,
      },
    }) as never);
    expect(stale.services).toContainEqual(expect.objectContaining({
      id: "worker",
      status: "blocked",
      message: expect.stringMatching(/last five minutes/i),
    }));

    const degraded = await checkSystemReadiness(database({
      workerRun: {
        status: "completed_with_warnings",
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        error_code: null,
      },
    }) as never);
    expect(degraded.services).toContainEqual(expect.objectContaining({
      id: "worker",
      status: "warning",
      message: expect.stringMatching(/alert monitoring/i),
    }));
  });
});
