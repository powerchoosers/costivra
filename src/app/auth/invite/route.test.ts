import { describe, expect, it, vi } from "vitest";

const verifyOtp = vi.hoisted(() => vi.fn());
const exchangeCodeForSession = vi.hoisted(() => vi.fn());

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { verifyOtp, exchangeCodeForSession } }),
}));

import { GET } from "./route";

describe("GET /auth/invite", () => {
  it("exchanges a Supabase invite token before showing password setup", async () => {
    verifyOtp.mockResolvedValue({ data: { session: {} }, error: null });
    const response = await GET(new Request("http://localhost:3000/auth/invite?token_hash=invite-token") as never);
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "invite-token", type: "invite" });
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/set-password");
    expect(response.headers.get("set-cookie")).toContain("costivra-recovery-setup=active");
  });

  it("supports Supabase code redirects", async () => {
    exchangeCodeForSession.mockResolvedValue({ data: { session: {} }, error: null });
    const response = await GET(new Request("http://localhost:3000/auth/invite?code=invite-code") as never);
    expect(exchangeCodeForSession).toHaveBeenCalledWith("invite-code");
    expect(response.status).toBe(307);
  });

  it("returns an expired or reused token to a recoverable login state", async () => {
    verifyOtp.mockResolvedValue({ data: { session: null }, error: new Error("Token has expired or has already been used") });
    const response = await GET(new Request("http://localhost:3000/auth/invite?token_hash=expired-token") as never);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login?error=oauth_failed");
    expect(response.headers.get("set-cookie") ?? "").not.toContain("costivra-recovery-setup=active");
  });

  it("does not create a setup session when the invite token is missing", async () => {
    const response = await GET(new Request("http://localhost:3000/auth/invite") as never);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login?error=oauth_failed");
    expect(response.headers.get("set-cookie") ?? "").not.toContain("costivra-recovery-setup=active");
  });
});
