import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MIN_PASSWORD_LENGTH,
  passwordMeetsMinimumLength,
} from "./password-policy";

describe("password update policy", () => {
  it("requires the same 12-character minimum used by the recovery form", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(12);
    expect(passwordMeetsMinimumLength("x".repeat(11))).toBe(false);
    expect(passwordMeetsMinimumLength("x".repeat(12))).toBe(true);
  });

  it("does not allow the password route to target users through the admin API", () => {
    const route = readFileSync(
      resolve(process.cwd(), "src/app/api/auth/set-password/route.ts"),
      "utf8",
    );

    expect(route).toContain("auth.getUser()");
    expect(route).toContain("auth.updateUser({");
    expect(route).not.toContain("auth.admin");
    expect(route).not.toContain("listUsers");
    expect(route).not.toContain("updateUserById");
    expect(route).not.toContain("l.patterson@");
  });
});
