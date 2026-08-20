import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WorkspaceDecisionSummary, WorkspaceViewTabs } from "@/components/ui/workspace-primitives";

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

describe("WorkspaceDecisionSummary", () => {
  it("keeps a record decision, supporting facts, and its next action together", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceDecisionSummary, {
      ariaLabel: "Vendor relationship next step",
      description: "Review the monitoring alert before taking the next action.",
      eyebrow: "Relationship attention",
      facts: [
        { label: "Monitoring", value: "Needs attention" },
        { label: "Open work", value: "1 task" },
      ],
      heading: "Monitoring needs attention",
      actions: createElement("button", { type: "button" }, "Review alert"),
    }));

    expect(html).toContain('aria-label="Vendor relationship next step"');
    expect(html).toContain("Relationship attention");
    expect(html).toContain("Monitoring needs attention");
    expect(html).toContain("Monitoring");
    expect(html).toContain("Review alert");
  });
});
