import { describe, it, expect } from "vitest";
import { getExpertPackWithResolution, hasDedicatedExpertPack } from "./packs";
import type { CategoryLineItemDefinition } from "./types";

/**
 * Packet 07: Distinct Core Market Expert Packs
 *
 * Verifies that each of the 8 required packs in Packet 07 exists as a
 * materially distinct expert pack with proper schema, line items, and
 * category boundary isolation (no leakage).
 */
describe("Packet 07 – Distinct Core Market Expert Packs", () => {
  const requiredPacks = [
    "commercial-electricity-supply",
    "business-broadband-dia",
    "wireless-mobility",
    "saas-subscriptions",
    "cloud-iaas-paas",
    "ai-api-consumption",
    "merchant-processing",
    "solid-waste-recycling",
  ] as const;

  // ─── Schema validity and exact match for all 8 packs ───────────────────────

  it.each(requiredPacks)("pack '%s' resolves with exactMatch=true", (key) => {
    const resolution = getExpertPackWithResolution(key);
    expect(resolution.exactMatch).toBe(true);
    expect(resolution.pack.categoryKey).toBe(key);
    expect(resolution.pack.schemaVersion).toBe("category-expert-pack-v1");
  });

  it.each(requiredPacks)("pack '%s' has 8 or more line item definitions", (key) => {
    const { pack } = getExpertPackWithResolution(key);
    expect(pack.lineItems.length).toBeGreaterThanOrEqual(8);
  });

  it.each(requiredPacks)("pack '%s' has at least one pricing model", (key) => {
    const { pack } = getExpertPackWithResolution(key);
    expect(pack.pricingModels.length).toBeGreaterThanOrEqual(1);
  });

  it.each(requiredPacks)("pack '%s' has 10 or more eval case IDs", (key) => {
    const { pack } = getExpertPackWithResolution(key);
    expect(pack.evalCaseIds.length).toBeGreaterThanOrEqual(10);
    expect(new Set(pack.evalCaseIds).size).toBe(pack.evalCaseIds.length);
  });

  it.each(requiredPacks)("pack '%s' has prohibited claims defined", (key) => {
    const { pack } = getExpertPackWithResolution(key);
    expect(pack.benchmarkPolicy.prohibitedClaims.length).toBeGreaterThanOrEqual(1);
  });

  it.each(requiredPacks)("pack '%s' has required caveats defined", (key) => {
    const { pack } = getExpertPackWithResolution(key);
    expect(pack.outputPolicy.requiredCaveats.length).toBeGreaterThanOrEqual(1);
  });

  it.each(requiredPacks)("pack '%s' has status=draft (Packet 10 promotes to verified)", (key) => {
    const { pack } = getExpertPackWithResolution(key);
    expect(pack.status).toBe("draft");
  });

  // ─── No relabeling / no cross-category leakage ─────────────────────────────

  it("wireless-mobility is distinct from business-broadband-dia", () => {
    const wireless = getExpertPackWithResolution("wireless-mobility").pack;
    const broadband = getExpertPackWithResolution("business-broadband-dia").pack;
    expect(wireless.categoryKey).not.toBe(broadband.categoryKey);
    expect(wireless.displayName).not.toBe(broadband.displayName);
    // wireless must not use broadband-specific line item codes
    const wirelessCodes = wireless.lineItems.map((li: CategoryLineItemDefinition) => li.canonicalCode);
    const broadbandCodes = broadband.lineItems.map((li: CategoryLineItemDefinition) => li.canonicalCode);
    const overlap = wirelessCodes.filter((c: string) => broadbandCodes.includes(c));
    expect(overlap).toHaveLength(0);
  });

  it("saas-subscriptions is distinct from cloud-iaas-paas", () => {
    const saas = getExpertPackWithResolution("saas-subscriptions").pack;
    const cloud = getExpertPackWithResolution("cloud-iaas-paas").pack;
    expect(saas.categoryKey).not.toBe(cloud.categoryKey);
    const saasCodes = saas.lineItems.map((li: CategoryLineItemDefinition) => li.canonicalCode);
    const cloudCodes = cloud.lineItems.map((li: CategoryLineItemDefinition) => li.canonicalCode);
    const overlap = saasCodes.filter((c: string) => cloudCodes.includes(c));
    expect(overlap).toHaveLength(0);
  });

  it("cloud-iaas-paas is distinct from ai-api-consumption", () => {
    const cloud = getExpertPackWithResolution("cloud-iaas-paas").pack;
    const aiapi = getExpertPackWithResolution("ai-api-consumption").pack;
    expect(cloud.categoryKey).not.toBe(aiapi.categoryKey);
    const cloudCodes = cloud.lineItems.map((li: CategoryLineItemDefinition) => li.canonicalCode);
    const aiapiCodes = aiapi.lineItems.map((li: CategoryLineItemDefinition) => li.canonicalCode);
    const overlap = cloudCodes.filter((c: string) => aiapiCodes.includes(c));
    expect(overlap).toHaveLength(0);
  });

  // ─── Alias resolution ────────────────────────────────────────────────────────

  it("'wireless' alias resolves to wireless-mobility (dedicated pack)", () => {
    expect(hasDedicatedExpertPack("wireless")).toBe(true);
    const { pack } = getExpertPackWithResolution("wireless");
    expect(pack.categoryKey).toBe("wireless-mobility");
  });

  it("'cloud' alias resolves to cloud-iaas-paas (dedicated pack)", () => {
    expect(hasDedicatedExpertPack("cloud")).toBe(true);
    const { pack } = getExpertPackWithResolution("cloud");
    expect(pack.categoryKey).toBe("cloud-iaas-paas");
  });

  it("'ai api' alias resolves to ai-api-consumption (dedicated pack)", () => {
    expect(hasDedicatedExpertPack("ai api")).toBe(true);
    const { pack } = getExpertPackWithResolution("ai api");
    expect(pack.categoryKey).toBe("ai-api-consumption");
  });

  // ─── Prohibited claims enforcement ─────────────────────────────────────────

  it("wireless-mobility prohibits comparing consumer pricing to corporate rates", () => {
    const { pack } = getExpertPackWithResolution("wireless-mobility");
    const prohibited = pack.benchmarkPolicy.prohibitedClaims.join(" ");
    expect(prohibited.toLowerCase()).toMatch(/consumer/i);
  });

  it("ai-api-consumption prohibits citing token costs without model name and version", () => {
    const { pack } = getExpertPackWithResolution("ai-api-consumption");
    const prohibited = pack.benchmarkPolicy.prohibitedClaims.join(" ");
    expect(prohibited.toLowerCase()).toMatch(/model name|model version/i);
  });

  it("cloud-iaas-paas prohibits claiming savings without provider, region, and instance family", () => {
    const { pack } = getExpertPackWithResolution("cloud-iaas-paas");
    const prohibited = pack.benchmarkPolicy.prohibitedClaims.join(" ");
    expect(prohibited.toLowerCase()).toMatch(/provider|region|instance family/i);
  });

  // ─── Good-bill signals and anomaly rules ────────────────────────────────────

  it("wireless-mobility has at least 1 good-bill signal and 4 anomaly rules", () => {
    const { pack } = getExpertPackWithResolution("wireless-mobility");
    expect(pack.billQuality.goodSignals.length).toBeGreaterThanOrEqual(1);
    expect(pack.billQuality.anomalyRules.length).toBeGreaterThanOrEqual(4);
  });

  it("cloud-iaas-paas has at least 1 good-bill signal and 4 anomaly rules", () => {
    const { pack } = getExpertPackWithResolution("cloud-iaas-paas");
    expect(pack.billQuality.goodSignals.length).toBeGreaterThanOrEqual(1);
    expect(pack.billQuality.anomalyRules.length).toBeGreaterThanOrEqual(4);
  });

  it("ai-api-consumption has at least 1 good-bill signal and 4 anomaly rules", () => {
    const { pack } = getExpertPackWithResolution("ai-api-consumption");
    expect(pack.billQuality.goodSignals.length).toBeGreaterThanOrEqual(1);
    expect(pack.billQuality.anomalyRules.length).toBeGreaterThanOrEqual(4);
  });

  // ─── Scope exclusion consistency ─────────────────────────────────────────────

  it("wireless-mobility excludes fixed-line broadband", () => {
    const { pack } = getExpertPackWithResolution("wireless-mobility");
    const excludes = pack.scope.excludes.join(" ").toLowerCase();
    expect(excludes).toMatch(/broadband|fixed.line|dia/i);
  });

  it("cloud-iaas-paas excludes SaaS per-seat subscriptions", () => {
    const { pack } = getExpertPackWithResolution("cloud-iaas-paas");
    const excludes = pack.scope.excludes.join(" ").toLowerCase();
    expect(excludes).toMatch(/saas|per.seat|application/i);
  });

  it("ai-api-consumption excludes self-hosted model compute (use cloud-iaas-paas)", () => {
    const { pack } = getExpertPackWithResolution("ai-api-consumption");
    const excludes = pack.scope.excludes.join(" ").toLowerCase();
    expect(excludes).toMatch(/self.host|compute instance|cloud/i);
  });
});
