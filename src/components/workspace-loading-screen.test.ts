import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WorkspaceInitialLoad } from "@/components/workspace-initial-load";
import { WorkspaceLoadingScreen } from "@/components/workspace-loading-screen";

describe("WorkspaceLoadingScreen", () => {
  it.each([
    ["app", "Opening your workspace", "customer-loading"],
    ["manage", "Opening operations", "manage-loading"],
  ] as const)("renders an accessible %s loading state", (workspace, title, shell) => {
    const html = renderToStaticMarkup(
      createElement(WorkspaceLoadingScreen, { workspace }),
    );

    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('role="status"');
    expect(html).toContain(`data-workspace-shell="${shell}"`);
    expect(html).toContain(title);
    expect(html).toContain("costivra-circuit-mark-cropped.png");
    expect(html).not.toContain("workspace-loading-screen__rail");
  });

  it("places the opening screen in the persistent workspace overlay", () => {
    const html = renderToStaticMarkup(
      createElement(WorkspaceInitialLoad, { workspace: "app" }),
    );

    expect(html).toContain('class="workspace-initial-load"');
    expect(html).toContain("Opening your workspace");
  });
});
