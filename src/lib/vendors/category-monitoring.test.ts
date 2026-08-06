import { describe, expect, it } from "vitest";
import { getCategoryMonitoringGuidance } from "./category-monitoring";

describe("getCategoryMonitoringGuidance", () => {
  it("returns pack-specific review guidance for a supported category", async () => {
    const guidance = await getCategoryMonitoringGuidance("Software");

    expect(guidance.categoryTrace).toMatchObject({
      categoryKey: "saas-subscriptions",
      packStatus: "draft",
    });
    expect(guidance.hasDedicatedPack).toBe(true);
    expect(guidance.trackedFields.length).toBeGreaterThan(0);
    expect(guidance.reviewRequired).toBe(true);
  });

  it("keeps unsupported categories unknown and review-required", async () => {
    await expect(getCategoryMonitoringGuidance("Specialist laboratory services")).resolves.toMatchObject({
      categoryTrace: { categoryKey: null, packStatus: "unknown" },
      hasDedicatedPack: false,
      reviewRequired: true,
    });
  });
});
