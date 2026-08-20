import { describe, expect, it } from "vitest";
import { APP_SIDEBAR_PREFERENCE_COOKIE, MANAGE_SIDEBAR_PREFERENCE_COOKIE, appSidebarPreferenceCookie, manageSidebarPreferenceCookie, parseAppSidebarPreference, resolveManageRailOpen, shouldPersistManageRailPreference } from "@/lib/ui/workspace-preferences";

describe("workspace preferences", () => {
  it("parses only explicit App sidebar preferences", () => {
    expect(parseAppSidebarPreference("true")).toBe(true);
    expect(parseAppSidebarPreference("false")).toBe(false);
    expect(parseAppSidebarPreference(undefined)).toBeNull();
    expect(parseAppSidebarPreference("collapsed")).toBeNull();
  });

  it("writes a path-scoped, same-site App sidebar preference cookie", () => {
    expect(appSidebarPreferenceCookie(true)).toBe(`${APP_SIDEBAR_PREFERENCE_COOKIE}=true; Path=/; Max-Age=31536000; SameSite=Lax`);
    expect(manageSidebarPreferenceCookie(false)).toBe(`${MANAGE_SIDEBAR_PREFERENCE_COOKIE}=false; Path=/; Max-Age=31536000; SameSite=Lax`);
  });

  it("keeps Manage open by default on desktop while compact and mobile remain calm", () => {
    expect(resolveManageRailOpen("desktop", null)).toBe(true);
    expect(resolveManageRailOpen("desktop", true)).toBe(false);
    expect(resolveManageRailOpen("compact", null)).toBe(false);
    expect(resolveManageRailOpen("compact", false)).toBe(true);
    expect(resolveManageRailOpen("mobile", false)).toBe(false);
  });

  it("persists a person’s Manage rail choice but never writes a responsive default as one", () => {
    expect(shouldPersistManageRailPreference("desktop", null, false)).toBe(false);
    expect(shouldPersistManageRailPreference("compact", null, false)).toBe(false);
    expect(shouldPersistManageRailPreference("desktop", null, true)).toBe(true);
    expect(shouldPersistManageRailPreference("compact", false, false)).toBe(true);
    expect(shouldPersistManageRailPreference("mobile", false, true)).toBe(false);
  });
});
