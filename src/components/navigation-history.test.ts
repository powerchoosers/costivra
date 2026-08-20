import { describe, expect, it } from "vitest";
import { navigationStorageKey, nextFloatingBackVisibility, previousNavigationEntry, upsertNavigationEntry } from "@/components/navigation-history";

describe("navigation history helpers", () => {
  it("keeps Customer App and Manage session storage separate", () => {
    expect(navigationStorageKey("app")).not.toBe(navigationStorageKey("manage"));
  });

  it("preserves exact URLs including query strings and anchors", () => {
    const entries = upsertNavigationEntry([], "/app/documents?status=review#files", "Documents", 0);
    expect(entries[0]).toMatchObject({ href: "/app/documents?status=review#files", label: "Documents" });
  });

  it("updates the current page label without duplicating the route", () => {
    const initial = upsertNavigationEntry([], "/app/vendors/a", "Vendors", 0);
    const updated = upsertNavigationEntry(initial, "/app/vendors/a", "Acme Telecom", 0);
    expect(updated).toHaveLength(1);
    expect(updated[0].label).toBe("Acme Telecom");
  });

  it("returns no previous entry after a direct visit and the immediate prior entry otherwise", () => {
    const first = upsertNavigationEntry([], "/manage/accounts", "Accounts", 0);
    expect(previousNavigationEntry(first)).toBeNull();
    const entries = upsertNavigationEntry(first, "/manage/accounts/123", "Acme Telecom", 1);
    expect(previousNavigationEntry(entries)).toMatchObject({ href: "/manage/accounts", label: "Accounts" });
  });

  it("keeps the floating Back control stable while its page-level control crosses the header boundary", () => {
    expect(nextFloatingBackVisibility({ wasFloating: true, hasUserScrolled: false, anchorTop: 70, anchorBottom: 106 })).toBe(true);
    expect(nextFloatingBackVisibility({ wasFloating: false, hasUserScrolled: false, anchorTop: 70, anchorBottom: 106 })).toBe(false);
  });

  it("only shows the floating Back control after user scroll and hides it once the page control is clearly visible", () => {
    expect(nextFloatingBackVisibility({ wasFloating: false, hasUserScrolled: false, anchorTop: 20, anchorBottom: 56 })).toBe(false);
    expect(nextFloatingBackVisibility({ wasFloating: false, hasUserScrolled: true, anchorTop: 20, anchorBottom: 56 })).toBe(true);
    expect(nextFloatingBackVisibility({ wasFloating: true, hasUserScrolled: true, anchorTop: 100, anchorBottom: 136 })).toBe(false);
  });
});
