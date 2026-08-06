import { describe, expect, it } from "vitest";
import { navigationStorageKey, previousNavigationEntry, upsertNavigationEntry } from "@/components/navigation-history";

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
});
