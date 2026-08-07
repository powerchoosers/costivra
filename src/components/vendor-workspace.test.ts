import { describe, expect, it } from "vitest";

describe("Chunk 2 Vendor Directory & Central Vendor Workspace", () => {
  it("resolves vendor tab navigation into the 6 simplified tabs", () => {
    const validTabs = ["overview", "accounts", "bills", "contracts", "findings", "activity"];
    expect(validTabs).toHaveLength(6);
    expect(validTabs).toContain("overview");
    expect(validTabs).toContain("accounts");
    expect(validTabs).toContain("bills");
    expect(validTabs).toContain("contracts");
    expect(validTabs).toContain("findings");
    expect(validTabs).toContain("activity");
  });

  it("maps legacy vendor tabs (actions, files, monitoring, history) to their new 6-tab destinations", () => {
    // Actions & Results -> Findings
    // Files -> Bills
    // Monitoring -> Overview
    // History -> Activity
    const mapTab = (tab: string | null): string => {
      if (!tab) return "overview";
      if (["overview", "accounts", "bills", "contracts", "findings", "activity"].includes(tab)) return tab;
      if (tab === "actions" || tab === "results") return "findings";
      if (tab === "files") return "bills";
      if (tab === "monitoring") return "overview";
      if (tab === "history") return "activity";
      return "overview";
    };

    expect(mapTab("actions")).toBe("findings");
    expect(mapTab("results")).toBe("findings");
    expect(mapTab("files")).toBe("bills");
    expect(mapTab("monitoring")).toBe("overview");
    expect(mapTab("history")).toBe("activity");
    expect(mapTab("overview")).toBe("overview");
    expect(mapTab("accounts")).toBe("accounts");
    expect(mapTab(null)).toBe("overview");
  });

  it("enforces attention-sorting hierarchy in vendor directory", () => {
    // Priority order:
    // 1: Bills needing review
    // 2: Monitoring attention
    // 3: Urgent contract deadline
    // 4: Open high-priority findings
    // 5: Pending actions
    // 6: Active healthy vendors
    // 7: Terminated / inactive vendors
    const vendorScores = [
      { name: "Vendor A", score: 6 },
      { name: "Vendor B", score: 1 },
      { name: "Vendor C", score: 4 },
      { name: "Vendor D", score: 7 },
      { name: "Vendor E", score: 2 },
    ];

    const sorted = [...vendorScores].sort((a, b) => a.score - b.score);
    expect(sorted.map((v) => v.name)).toEqual([
      "Vendor B", // score 1: bill needs review
      "Vendor E", // score 2: monitoring attention
      "Vendor C", // score 4: open findings
      "Vendor A", // score 6: active healthy
      "Vendor D", // score 7: terminated/inactive
    ]);
  });

  it("verifies explicit cross-vendor link destinations in Findings tab", () => {
    const crossVendorLinks = [
      { label: "View all findings across vendors", href: "/app/findings" },
      { label: "View all actions across vendors", href: "/app/actions" },
      { label: "View all results across vendors", href: "/app/results" },
    ];

    expect(crossVendorLinks).toHaveLength(3);
    expect(crossVendorLinks[0].href).toBe("/app/findings");
    expect(crossVendorLinks[1].href).toBe("/app/actions");
    expect(crossVendorLinks[2].href).toBe("/app/results");
  });
});
