import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const exchangeCodeForSession = vi.hoisted(() => vi.fn());
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({ auth: { exchangeCodeForSession } })),
}));

import { GET } from "@/app/auth/callback/route";

describe("OAuth callback", () => {
  beforeEach(() => exchangeCodeForSession.mockReset());

  it("exchanges the authorization code and preserves only a safe workspace destination", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    const response = await GET(new NextRequest(
      "https://costivra.ai/auth/callback?code=one-time-code&next=%2Fapp%2Fdocuments",
    ));

    expect(exchangeCodeForSession).toHaveBeenCalledWith("one-time-code");
    expect(response.headers.get("location")).toBe("https://costivra.ai/access?next=%2Fapp%2Fdocuments");
  });

  it("drops external redirects", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    const response = await GET(new NextRequest(
      "https://costivra.ai/auth/callback?code=one-time-code&next=https%3A%2F%2Fevil.example",
    ));

    expect(response.headers.get("location")).toBe("https://costivra.ai/access");
  });

  it("preserves a selected billing plan through the OAuth callback", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    const response = await GET(new NextRequest(
      "https://costivra.ai/auth/callback?code=one-time-code&next=%2Fapp%2Fsettings%3Ftab%3Dbilling%26plan%3Dgrowth",
    ));

    expect(response.headers.get("location")).toBe("https://costivra.ai/access?next=%2Fapp%2Fsettings%3Ftab%3Dbilling%26plan%3Dgrowth");
  });

  it.each([
    ["https://costivra.ai/auth/callback", false],
    ["https://costivra.ai/auth/callback?code=bad-code", true],
  ])("returns a generic login error when the provider callback fails", async (url, exchangeFails) => {
    exchangeCodeForSession.mockResolvedValue({
      error: exchangeFails ? new Error("provider secret") : null,
    });
    const response = await GET(new NextRequest(url));

    expect(response.headers.get("location")).toBe("https://costivra.ai/login?error=oauth_failed");
    expect(response.headers.get("location")).not.toContain("provider secret");
  });
});
