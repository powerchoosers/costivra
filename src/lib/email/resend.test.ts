import { vi } from "vitest";

vi.mock("server-only", () => ({}));

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { verifyInboundEmailProviderReadiness } from "@/lib/email/resend";

function response(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("verifyInboundEmailProviderReadiness", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "resend-test-key");
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "resend-webhook-secret");
    vi.stubEnv("RESEND_INBOUND_DOMAIN", "costivra.ai");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns ok when domain and webhook are valid", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url === "https://api.resend.com/domains") {
        return response({ data: [{ name: "costivra.ai", status: "verified" }] });
      }
      if (url === "https://api.resend.com/webhooks") {
        return response({ data: [{ endpoint: "https://costivra.ai/api/webhooks/resend", status: "enabled" }] });
      }
      return response({}, 404);
    }));

    const result = await verifyInboundEmailProviderReadiness();

    expect(result).toEqual({
      ok: true,
      blocked: [],
      details: {
        verifiedDomain: true,
        liveWebhook: true,
      },
    });
  });

  it("blocks when the webhook key is not valid", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url === "https://api.resend.com/domains") {
        return response({ name: "restricted_api_key", message: "This API key is restricted to only send emails" }, 401);
      }
      if (url === "https://api.resend.com/webhooks") {
        return response({ name: "restricted_api_key", message: "This API key is restricted to only send emails" }, 401);
      }
      return response({}, 404);
    }));

    const result = await verifyInboundEmailProviderReadiness();

    expect(result.ok).toBe(false);
    expect(result.blocked.join("\n")).toContain("domains endpoint blocked (HTTP 401");
    expect(result.blocked.join("\n")).toContain("restricted to only send emails");
    expect(result.blocked.join("\n")).toContain("webhooks endpoint blocked (HTTP 401");
    expect(result.details).toEqual({ verifiedDomain: false, liveWebhook: false });
  });

  it("returns provider-rejection reasons from API payloads", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url === "https://api.resend.com/domains") {
        return response({ name: "restricted_api_key", message: "This API key is restricted to only send emails" }, 401);
      }
      if (url === "https://api.resend.com/webhooks") {
        return response({ name: "restricted_api_key", message: "This API key is restricted to only send emails" }, 401);
      }
      return response({}, 404);
    }));

    const result = await verifyInboundEmailProviderReadiness();

    expect(result.blocked[0]).toContain("This API key is restricted to only send emails");
    expect(result.blocked[1]).toContain("This API key is restricted to only send emails");
  });

  it("returns blocked when keys are missing", async () => {
    vi.stubEnv("RESEND_API_KEY", "");

    const result = await verifyInboundEmailProviderReadiness();

    expect(result.ok).toBe(false);
    expect(result.blocked).toEqual(["Missing or placeholder RESEND_API_KEY and/or RESEND_WEBHOOK_SECRET."]); 
    expect(result.details).toEqual({ verifiedDomain: false, liveWebhook: false });
  });

  it("returns blocked when keys are placeholders", async () => {
    vi.stubEnv("RESEND_API_KEY", "[SENSITIVE]");
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "[redacted]");
    const result = await verifyInboundEmailProviderReadiness();

    expect(result.ok).toBe(false);
    expect(result.blocked).toEqual(["Missing or placeholder RESEND_API_KEY and/or RESEND_WEBHOOK_SECRET."]);
    expect(result.details).toEqual({ verifiedDomain: false, liveWebhook: false });
  });
});
