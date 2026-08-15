import { describe, expect, it } from "vitest";
import { getRequestId, safeOperationalError, withRequestId } from "@/lib/observability/request-context";

describe("request correlation context", () => {
  it("prefers a sanitized caller correlation id", () => {
    const request = new Request("https://costivra.ai/api/cron/inbound-email", {
      headers: { "x-request-id": "pilot-123 unsafe value" },
    });
    expect(getRequestId(request)).toBe("pilot-123unsafevalue");
  });

  it("falls back to the Vercel id and then generates an id", () => {
    expect(getRequestId(new Request("https://costivra.ai", { headers: { "x-vercel-id": "iad1::abc" } }))).toBe("iad1::abc");
    expect(getRequestId(new Request("https://costivra.ai"))).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("keeps operational errors safe and attaches the id to responses", () => {
    const response = withRequestId(new Response(null, { status: 500 }), "request-1");
    expect(response.headers.get("x-costivra-request-id")).toBe("request-1");
    expect(safeOperationalError("queue_claim_failed", "request-1")).toEqual({ code: "queue_claim_failed", requestId: "request-1" });
  });
});
