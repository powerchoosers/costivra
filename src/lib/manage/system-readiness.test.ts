import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const isMalwareScannerConfigured = vi.hoisted(() => vi.fn());
vi.mock("@/lib/security/malware-scanner", () => ({ isMalwareScannerConfigured }));

import { checkSystemReadiness } from "@/lib/manage/system-readiness";

function response(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function database(options: { deadLetters?: number; failTable?: string } = {}) {
  const result = (table: string) => ({
    data: null,
    count: table === "inbound_email_events" ? options.deadLetters ?? 0 : 1,
    error: options.failTable === table ? { message: "table unavailable" } : null,
  });
  return {
    from: vi.fn((table: string) => ({
      select: vi.fn(() =>
        table === "inbound_email_events"
          ? { eq: vi.fn().mockResolvedValue(result(table)) }
          : Promise.resolve(result(table)),
      ),
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
    isMalwareScannerConfigured.mockReset();
    isMalwareScannerConfigured.mockReturnValue(true);
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
      { id: "apollo", status: "ready" },
    ]);
    expect(result.overall).toBe("warning");
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual(expect.arrayContaining([
      "https://api.resend.com/domains",
      "https://api.resend.com/webhooks",
      "https://openrouter.ai/api/v1/key",
      "https://api.apollo.io/api/v1/auth/health",
    ]));
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("resend-secret-for-test");
    expect(serialized).not.toContain("webhook-secret-for-test");
    expect(serialized).not.toContain("cron-secret-for-test");
    expect(serialized).not.toContain("openrouter-secret-for-test");
    expect(serialized).not.toContain("apollo-secret-for-test");
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
});
