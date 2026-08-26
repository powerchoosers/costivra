import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { generateJson } from "@/lib/ai/openrouter";

describe("generateJson OpenRouter key configuration", () => {
  beforeEach(() => {
    vi.stubEnv("OPEN_ROUTER_API_KEY", "sk-or-real-test-key");
    vi.stubEnv("OPENROUTER_API_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("rejects a placeholder OPEN_ROUTER_API_KEY before making a provider call", async () => {
    vi.stubEnv("OPEN_ROUTER_API_KEY", "[SENSITIVE]");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      generateJson({ messages: [{ role: "user", content: "ping" }] }),
    ).rejects.toThrow("OPEN_ROUTER_API_KEY is not configured for this server environment.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a missing OPEN_ROUTER_API_KEY before making a provider call", async () => {
    vi.stubEnv("OPEN_ROUTER_API_KEY", "");
    vi.stubEnv("OPENROUTER_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      generateJson({ messages: [{ role: "user", content: "ping" }] }),
    ).rejects.toThrow("OPEN_ROUTER_API_KEY is not configured for this server environment.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends OpenRouter requests with configured key", async () => {
    vi.stubEnv("OPEN_ROUTER_API_KEY", "sk-or-test-key");
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify({ ok: true }) } }],
        }),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateJson({ messages: [{ role: "user", content: "ping" }] });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const called = (fetchMock.mock.calls[0] as unknown as [RequestInfo, RequestInit] | undefined);
    expect(called).toBeDefined();
    const init = called?.[1];
    expect(init).toBeDefined();
    expect(init).toMatchObject({
      method: "POST",
      headers: expect.any(Object),
      body: expect.any(String),
    });
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer sk-or-test-key",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      provider: {
        data_collection: "deny",
        zdr: true,
      },
    });
  });
});
