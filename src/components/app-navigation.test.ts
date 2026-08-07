import { describe, expect, it } from "vitest";
import {
  isRouteActive,
  navigationGroups,
  primaryNavigationItems,
  searchCategoryLabels,
} from "./app-shell";

describe("Chunk 1 Navigation & Terminology", () => {
  it("defines exactly 8 primary sidebar destinations", () => {
    expect(primaryNavigationItems).toHaveLength(8);
    const labels = primaryNavigationItems.map((item) => item[0]);
    expect(labels).toEqual([
      "Command Center",
      "Vendors",
      "Bills & Spend",
      "Contracts",
      "Findings",
      "Actions",
      "Results",
      "Settings",
    ]);
  });

  it("organizes navigation into MONITOR, OPTIMIZE, and PROVE sections", () => {
    const sections = navigationGroups.map((g) => g.section).filter((s): s is string => Boolean(s));
    expect(sections).toEqual(["MONITOR", "OPTIMIZE", "PROVE"]);
  });

  it("does not expose legacy flat labels (Expenses, Documents, Opportunities, Savings, Reports) as primary sidebar items", () => {
    const labels = primaryNavigationItems.map((item) => item[0]);
    expect(labels).not.toContain("Expenses");
    expect(labels).not.toContain("Documents");
    expect(labels).not.toContain("Opportunities");
    expect(labels).not.toContain("Savings");
    expect(labels).not.toContain("Reports");
  });

  it("correctly maps active routes for primary destinations", () => {
    expect(isRouteActive("/app", "/app")).toBe(true);
    expect(isRouteActive("/app", "/app/vendors")).toBe(false);

    expect(isRouteActive("/app/vendors", "/app/vendors")).toBe(true);
    expect(isRouteActive("/app/vendors", "/app/vendors/v-123")).toBe(true);

    expect(isRouteActive("/app/bills", "/app/bills")).toBe(true);
    expect(isRouteActive("/app/bills", "/app/bills/inv-123")).toBe(true);

    expect(isRouteActive("/app/contracts", "/app/contracts")).toBe(true);
    expect(isRouteActive("/app/contracts", "/app/contracts/c-123")).toBe(true);

    expect(isRouteActive("/app/findings", "/app/findings")).toBe(true);
    expect(isRouteActive("/app/findings", "/app/findings/opp-123")).toBe(true);

    expect(isRouteActive("/app/actions", "/app/actions")).toBe(true);
    expect(isRouteActive("/app/actions", "/app/actions/act-123")).toBe(true);

    expect(isRouteActive("/app/results", "/app/results")).toBe(true);
    expect(isRouteActive("/app/results", "/app/results/sav-123")).toBe(true);

    expect(isRouteActive("/app/settings", "/app/settings")).toBe(true);
  });

  it("correctly maps active routes for legacy paths", () => {
    // /app/expenses & /app/documents -> Bills & Spend active
    expect(isRouteActive("/app/bills", "/app/expenses")).toBe(true);
    expect(isRouteActive("/app/bills", "/app/expenses/exp-123")).toBe(true);
    expect(isRouteActive("/app/bills", "/app/documents")).toBe(true);
    expect(isRouteActive("/app/bills", "/app/documents/doc-123")).toBe(true);

    // /app/opportunities -> Findings active
    expect(isRouteActive("/app/findings", "/app/opportunities")).toBe(true);
    expect(isRouteActive("/app/findings", "/app/opportunities/opp-123")).toBe(true);

    // /app/savings & /app/reports -> Results active
    expect(isRouteActive("/app/results", "/app/savings")).toBe(true);
    expect(isRouteActive("/app/results", "/app/savings/sav-123")).toBe(true);
    expect(isRouteActive("/app/results", "/app/reports")).toBe(true);
  });

  it("uses the updated customer-facing search category labels", () => {
    expect(searchCategoryLabels.vendors).toBe("Vendors");
    expect(searchCategoryLabels.bills).toBe("Bills");
    expect(searchCategoryLabels.contracts).toBe("Contracts");
    expect(searchCategoryLabels.findings).toBe("Findings");
    expect(searchCategoryLabels.actions).toBe("Actions");
    expect(searchCategoryLabels.documents).toBe("Source files");
    expect(searchCategoryLabels.expenses).toBe("Spend records");
  });
});
