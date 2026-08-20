import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WorkspaceViewTabs } from "@/components/ui/workspace-primitives";

describe("WorkspaceViewTabs", () => {
  it("marks record navigation and exposes an in-page switcher as pressed controls", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceViewTabs, {
      activeId: "bills",
      ariaLabel: "Vendor bill records",
      onChange: () => undefined,
      recordNavigation: true,
      selectionMode: "pressed",
      tabs: [
        { id: "bills", label: "Bills & spend", count: 2 },
        { id: "files", label: "Source files", count: 1 },
      ],
    }));

    expect(html).toContain('data-record-navigation-tabs="true"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).not.toContain("aria-current");
  });
});
