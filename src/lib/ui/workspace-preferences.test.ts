import { describe, expect, it } from "vitest";
import { APP_SIDEBAR_PREFERENCE_COOKIE, appSidebarPreferenceCookie, parseAppSidebarPreference } from "@/lib/ui/workspace-preferences";

describe("workspace preferences", () => {
  it("parses only explicit App sidebar preferences", () => {
    expect(parseAppSidebarPreference("true")).toBe(true);
    expect(parseAppSidebarPreference("false")).toBe(false);
    expect(parseAppSidebarPreference(undefined)).toBeNull();
    expect(parseAppSidebarPreference("collapsed")).toBeNull();
  });

  it("writes a path-scoped, same-site App sidebar preference cookie", () => {
    expect(appSidebarPreferenceCookie(true)).toBe(`${APP_SIDEBAR_PREFERENCE_COOKIE}=true; Path=/; Max-Age=31536000; SameSite=Lax`);
  });
});
