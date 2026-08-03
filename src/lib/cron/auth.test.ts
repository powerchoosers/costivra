import { describe, expect, it, vi } from "vitest";

import { extractCronToken, extractCronTokenWithSource } from "@/lib/cron/auth";

describe("cron auth token extraction", () => {
  it("extracts bearer token from Authorization", () => {
    const token = extractCronToken(new Request("https://costivra.ai/api/cron/inbound-email", {
      headers: { authorization: "Bearer abc123" },
    }));
    expect(token).toBe("abc123");
    expect(extractCronTokenWithSource(new Request("https://costivra.ai/api/cron/inbound-email", {
      headers: { authorization: "Bearer abc123" },
    }))).toMatchObject({ token: "abc123", source: "authorization" });
  });

  it("falls back to query token for debug invocation", () => {
    const token = extractCronToken(new Request("https://costivra.ai/api/cron/inbound-email?token=xyz987"));
    expect(token).toBe("xyz987");
    expect(extractCronTokenWithSource(new Request("https://costivra.ai/api/cron/inbound-email?cron_secret=abc-key")))
      .toMatchObject({ token: "abc-key", source: "query:cron_secret" });
  });

  it("rejects placeholder secret values", () => {
    vi.stubEnv("CRON_SECRET", "placeholder");
    expect(extractCronTokenWithSource(new Request("https://costivra.ai/api/cron/inbound-email", { headers: { authorization: "Bearer placeholder" } })))
      .toMatchObject({ token: "placeholder", source: "authorization" });
  });
});

