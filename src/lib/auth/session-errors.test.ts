import { describe, expect, it } from "vitest";
import { isStaleSessionError, isSupabaseAuthCookieName } from "./session-errors";

describe("Supabase session recovery", () => {
  it("recognizes an invalid rotated refresh token", () => {
    expect(isStaleSessionError({ code: "refresh_token_not_found" })).toBe(true);
    expect(isStaleSessionError({ message: "Invalid Refresh Token: Refresh Token Not Found" })).toBe(true);
    expect(isStaleSessionError({ code: "bad_password" })).toBe(false);
  });

  it("only targets Supabase auth cookies for cleanup", () => {
    expect(isSupabaseAuthCookieName("sb-project-auth-token")).toBe(true);
    expect(isSupabaseAuthCookieName("sb-project-auth-token.0")).toBe(true);
    expect(isSupabaseAuthCookieName("costivra-session")).toBe(false);
  });
});
