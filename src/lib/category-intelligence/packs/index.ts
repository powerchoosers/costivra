import { CategoryExpertPackV1 } from "../types";
import { energyElectricityPack } from "./energy-electricity";
import { saasPack } from "./saas";
import { insurancePropertyLiabilityPack } from "./insurance-property-liability";
import { telecomBroadbandPack } from "./telecom-broadband";
import { merchantProcessingPack } from "./merchant-processing";
import { solidWastePack } from "./solid-waste";

export const EXPERT_PACKS_REGISTRY: Record<string, CategoryExpertPackV1> = {
  // Energy & Utilities
  "commercial-electricity-supply": energyElectricityPack,
  "electric-delivery-demand": energyElectricityPack,

  // Technology & SaaS
  "saas-subscriptions": saasPack,
  "cloud-iaas-paas": { ...saasPack, categoryKey: "cloud-iaas-paas", displayName: "Cloud Infrastructure (IaaS/PaaS)" },
  "ai-api-consumption": { ...saasPack, categoryKey: "ai-api-consumption", displayName: "AI API Consumption" },
  "cybersecurity": { ...saasPack, categoryKey: "cybersecurity", displayName: "Cybersecurity Services" },

  // Insurance
  "commercial-property": insurancePropertyLiabilityPack,
  "general-liability-bop": insurancePropertyLiabilityPack,
  "workers-compensation": insurancePropertyLiabilityPack,
  "group-health": insurancePropertyLiabilityPack,

  // Telecom & Connectivity
  "business-broadband-dia": telecomBroadbandPack,
  "wan-sdwan-mpls": telecomBroadbandPack,
  "wireless-mobility": { ...telecomBroadbandPack, categoryKey: "wireless-mobility", displayName: "Wireless & Mobility" },
  "voice-sip-ucaas-ccaas": { ...telecomBroadbandPack, categoryKey: "voice-sip-ucaas-ccaas", displayName: "Voice, SIP & UCaaS" },

  // Payments & Merchant Processing
  "merchant-processing": merchantProcessingPack,
  "payment-gateways": { ...merchantProcessingPack, categoryKey: "payment-gateways", displayName: "Payment Gateways & Processing Platforms" },

  // Waste & Environmental
  "solid-waste-recycling": solidWastePack,
  "hazardous-industrial-waste": { ...solidWastePack, categoryKey: "hazardous-industrial-waste", displayName: "Hazardous & Industrial Waste" },
  "shredding-records-destruction": { ...solidWastePack, categoryKey: "shredding-records-destruction", displayName: "Shredding & Records Destruction" },
};

/**
 * Returns the best available expert pack for a category key.
 * Falls back to parent category packs when an exact leaf match is not found.
 * Uses a generic SaaS-shaped pack structure for unknown categories.
 */
export function getExpertPack(categoryKey: string): CategoryExpertPackV1 {
  const key = (categoryKey || "").toLowerCase();

  // Exact match
  if (EXPERT_PACKS_REGISTRY[key]) {
    return EXPERT_PACKS_REGISTRY[key];
  }

  // Parent-category heuristic fallbacks
  if (key.includes("energy") || key.includes("electric") || key.includes("gas") || key.includes("utility") || key.includes("water")) {
    return { ...energyElectricityPack, categoryKey: key, displayName: key.replace(/-/g, " ") };
  }
  if (key.includes("telecom") || key.includes("broadband") || key.includes("wireless") || key.includes("voice") || key.includes("wan")) {
    return { ...telecomBroadbandPack, categoryKey: key, displayName: key.replace(/-/g, " ") };
  }
  if (key.includes("insurance") || key.includes("workers") || key.includes("health") || key.includes("benefits")) {
    return { ...insurancePropertyLiabilityPack, categoryKey: key, displayName: key.replace(/-/g, " ") };
  }
  if (key.includes("merchant") || key.includes("payment") || key.includes("interchange") || key.includes("processing")) {
    return { ...merchantProcessingPack, categoryKey: key, displayName: key.replace(/-/g, " ") };
  }
  if (key.includes("waste") || key.includes("recycling") || key.includes("hauler") || key.includes("environmental")) {
    return { ...solidWastePack, categoryKey: key, displayName: key.replace(/-/g, " ") };
  }

  // Generic fallback — SaaS structure with unknown-category overrides
  return {
    ...saasPack,
    categoryKey: key || "general-operating-expenses",
    displayName: key ? key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "General Operating Expenses",
    version: "2026.08.1",
    status: "draft",
    benchmarkPolicy: {
      ...saasPack.benchmarkPolicy,
      prohibitedClaims: [
        "Providing specific market pricing without current comparable quotes for this category.",
        "Claiming a benchmark without the required service dimensions.",
      ],
    },
    outputPolicy: {
      requiredCaveats: [
        "This category does not have a verified expert pack. Analysis is based on general operating expense principles.",
        "A category-specific expert review is recommended before acting on any findings.",
      ],
      confidenceThresholds: { extraction: 0.80, classification: 0.75 },
      humanReviewTriggers: ["any_material_finding_in_unverified_category"],
    },
  };
}

