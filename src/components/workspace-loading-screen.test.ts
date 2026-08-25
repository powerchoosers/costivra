import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { WorkspaceInitialLoad } from "@/components/workspace-initial-load";
import { WorkspaceLoadingScreen } from "@/components/workspace-loading-screen";

const workspaceCss = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const StaticWorkspaceInitialLoad = WorkspaceInitialLoad as ComponentType<{
  workspace: "app" | "manage";
}>;

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
      createElement(
        StaticWorkspaceInitialLoad,
        { workspace: "app" },
        createElement("div", { className: "motion-page" }, "Dashboard"),
      ),
    );

    expect(html).toContain('class="workspace-initial-load"');
    expect(html).toContain('data-phase="open"');
    expect(html).toContain("Opening your workspace");
    expect(html).toContain('class="workspace-initial-load-content"');
    expect(html).toContain('data-workspace-entry="waiting"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("Dashboard");
  });

  it("holds route motion until the overlay exit animation completes", () => {
    expect(workspaceCss).toContain("animation: workspace-initial-load-out 420ms");
    expect(workspaceCss).toMatch(/\.workspace-initial-load-content:not\(\.is-ready\) \.motion-page[\s\S]*animation-play-state: paused/);
    expect(workspaceCss).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
