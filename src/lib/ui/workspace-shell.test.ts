import { describe, expect, it } from "vitest";
import {
  isWorkspaceRouteActive,
  WORKSPACE_FRAME_SLOTS,
} from "./workspace-shell";

describe("workspace shell contract", () => {
  it("defines the visual regions shared by both workspaces", () => {
    expect(WORKSPACE_FRAME_SLOTS).toEqual([
      "rail",
      "canvas",
      "topbar",
      "content",
      "utilities",
    ]);
  });

  it("matches nested routes while keeping a workspace root exact", () => {
    expect(
      isWorkspaceRouteActive({
        href: "/app",
        pathname: "/app/vendors",
        exact: true,
      }),
    ).toBe(false);

    expect(
      isWorkspaceRouteActive({
        href: "/manage/accounts",
        pathname: "/manage/accounts/account-1",
      }),
    ).toBe(true);
  });

  it("supports local aliases without making route maps global", () => {
    expect(
      isWorkspaceRouteActive({
        href: "/app/bills",
        pathname: "/app/documents/document-1",
        aliases: ["/app/documents", "/app/expenses"],
      }),
    ).toBe(true);
  });
});
