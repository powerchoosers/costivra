import { describe, expect, it } from "vitest";
import { floatingBackControlClassName, floatingBackControlTop, isFloatingBackScrollKey, isManageRecordDetailPath, navigationStorageKey, nextFloatingBackControlState, nextFloatingBackVisibility, previousNavigationEntry, recordTabsAreVisibleInWorkspace, shouldShowFloatingBackControl, upsertNavigationEntry } from "@/components/navigation-history";

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

  it("treats every direct Manage record route as one detail destination", () => {
    expect(isManageRecordDetailPath("/manage/accounts/account-1")).toBe(true);
    expect(isManageRecordDetailPath("/manage/contacts/contact-1")).toBe(true);
    expect(isManageRecordDetailPath("/manage/mail/thread-1")).toBe(true);
    expect(isManageRecordDetailPath("/manage/invoice-review/invoice-1")).toBe(true);
    expect(isManageRecordDetailPath("/manage/intake/event-1")).toBe(true);
    expect(isManageRecordDetailPath("/manage/outreach/sequences/sequence-1")).toBe(true);
    expect(isManageRecordDetailPath("/manage/mail")).toBe(false);
  });

  it("treats only deliberate keyboard scrolling as Back-control scroll intent", () => {
    expect(isFloatingBackScrollKey("PageDown")).toBe(true);
    expect(isFloatingBackScrollKey("ArrowDown")).toBe(true);
    expect(isFloatingBackScrollKey(" ")).toBe(true);
    expect(isFloatingBackScrollKey("Tab")).toBe(false);
    expect(isFloatingBackScrollKey("Enter")).toBe(false);
  });

  it("keeps the floating Back control stable while its page-level control crosses the header boundary", () => {
    expect(nextFloatingBackVisibility({ wasFloating: true, hasUserScrolled: false, anchorTop: 70, anchorBottom: 106 })).toBe(true);
    expect(nextFloatingBackVisibility({ wasFloating: false, hasUserScrolled: false, anchorTop: 70, anchorBottom: 106 })).toBe(false);
  });

  it("marks the persistent floating control for its active workspace shell", () => {
    expect(floatingBackControlClassName("app", false)).toBe("global-back-control__floating global-back-control__floating--app");
    expect(floatingBackControlClassName("manage", true)).toBe("global-back-control__floating global-back-control__floating--manage is-visible");
  });

  it("places the App floating Back control below the measured workspace header", () => {
    expect(floatingBackControlTop("app", 182.4)).toBe(195);
    expect(floatingBackControlTop("manage", 182.4)).toBeNull();
    expect(floatingBackControlTop("app", null)).toBeNull();
  });

  it("only shows the floating Back control after user scroll and hides it once the page control is clearly visible", () => {
    expect(nextFloatingBackVisibility({ wasFloating: false, hasUserScrolled: false, anchorTop: 20, anchorBottom: 56 })).toBe(false);
    expect(nextFloatingBackVisibility({ wasFloating: false, hasUserScrolled: true, anchorTop: 20, anchorBottom: 56 })).toBe(true);
    expect(nextFloatingBackVisibility({ wasFloating: true, hasUserScrolled: false, anchorTop: 210, anchorBottom: 246 })).toBe(false);
    expect(nextFloatingBackVisibility({ wasFloating: true, hasUserScrolled: true, anchorTop: 100, anchorBottom: 136 })).toBe(false);
  });

  it("does not cover visible record tabs with the floating Back control", () => {
    expect(shouldShowFloatingBackControl(true, true)).toBe(false);
    expect(shouldShowFloatingBackControl(true, false)).toBe(true);
    expect(shouldShowFloatingBackControl(false, false)).toBe(false);
  });

  it("keeps the logical floating state while record tabs temporarily suppress the control", () => {
    const hiddenBehindTabs = nextFloatingBackControlState({
      wasFloating: false,
      hasUserScrolled: true,
      anchorTop: 20,
      anchorBottom: 56,
      recordTabsAreVisible: true,
    });
    expect(hiddenBehindTabs).toEqual({ isFloating: true, visible: false });

    expect(nextFloatingBackControlState({
      wasFloating: hiddenBehindTabs.isFloating,
      hasUserScrolled: true,
      anchorTop: 20,
      anchorBottom: 56,
      recordTabsAreVisible: false,
    })).toEqual({ isFloating: true, visible: true });
  });

  it("treats tabs hidden behind the workspace header as out of view", () => {
    expect(recordTabsAreVisibleInWorkspace({ tabsTop: 195, tabsBottom: 238, workspaceHeaderBottom: 182, viewportBottom: 742 })).toBe(true);
    expect(recordTabsAreVisibleInWorkspace({ tabsTop: -2, tabsBottom: 41, workspaceHeaderBottom: 182, viewportBottom: 742 })).toBe(false);
  });
});
