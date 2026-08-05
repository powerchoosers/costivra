import type { CategoryExpertPackV1 } from "../types";
import { energyElectricityPack } from "./energy-electricity";
import { saasPack } from "./saas";
import { insurancePropertyLiabilityPack } from "./insurance-property-liability";
import { telecomBroadbandPack } from "./telecom-broadband";
import { merchantProcessingPack } from "./merchant-processing";
import { solidWastePack } from "./solid-waste";

const DRAFT_CAVEAT =
  "This category pack is in draft review. Use it to explain bill structure and identify questions, not to certify market pricing or verified savings.";

function asDraft(
  pack: CategoryExpertPackV1,
  overrides: Partial<Pick<CategoryExpertPackV1, "categoryKey" | "displayName">> = {},
): CategoryExpertPackV1 {
  return {
    ...pack,
    ...overrides,
    status: "draft",
    outputPolicy: {
      ...pack.outputPolicy,
      requiredCaveats: Array.from(
        new Set([...pack.outputPolicy.requiredCaveats, DRAFT_CAVEAT]),
      ),
      humanReviewTriggers: Array.from(
        new Set([
          ...pack.outputPolicy.humanReviewTriggers,
          "material_finding_from_draft_pack",
        ]),
      ),
    },
  };
}

/**
 * Only register packs whose scope actually covers the category.
 *
 * Deliberately absent until dedicated packs exist:
 * cloud, AI APIs, cybersecurity, workers compensation, group health,
 * wireless, voice/UCaaS, WAN/SD-WAN, hazardous waste, and shredding.
 * Those categories receive a neutral draft pack rather than borrowed rules.
 */
export const EXPERT_PACKS_REGISTRY: Record<string, CategoryExpertPackV1> = {
  "commercial-electricity-supply": asDraft(energyElectricityPack),
  "electric-delivery-demand": asDraft(energyElectricityPack, {
    categoryKey: "electric-delivery-demand",
    displayName: "Electric Delivery, Demand & Utility Charges",
  }),
  "saas-subscriptions": asDraft(saasPack),
  "commercial-property": asDraft(insurancePropertyLiabilityPack),
  "general-liability-bop": asDraft(insurancePropertyLiabilityPack, {
    categoryKey: "general-liability-bop",
    displayName: "General Liability & Business Owners Policies",
  }),
  "business-broadband-dia": asDraft(telecomBroadbandPack),
  "merchant-processing": asDraft(merchantProcessingPack),
  "solid-waste-recycling": asDraft(solidWastePack),
};

const CATEGORY_ALIASES: Record<string, string> = {
  "commercial energy": "commercial-electricity-supply",
  energy: "commercial-electricity-supply",
  electricity: "commercial-electricity-supply",
  "software subscription": "saas-subscriptions",
  software_subscription: "saas-subscriptions",
  software: "saas-subscriptions",
  saas: "saas-subscriptions",
  waste: "solid-waste-recycling",
  waste_management: "solid-waste-recycling",
  trash: "solid-waste-recycling",
  "commercial property": "commercial-property",
  "general liability": "general-liability-bop",
  "merchant processing": "merchant-processing",
  "payment processing": "merchant-processing",
  "business broadband": "business-broadband-dia",
  dia: "business-broadband-dia",
  internet: "business-broadband-dia",

  // Broad or materially distinct categories intentionally resolve to neutral packs.
  telecom: "telecom-connectivity",
  "telecom & internet": "telecom-connectivity",
  insurance: "insurance-benefits",
  "insurance & employee benefits": "insurance-benefits",
  cloud: "cloud-iaas-paas",
  cybersecurity: "cybersecurity",
  wireless: "wireless-mobility",
  "workers comp": "workers-compensation",
  "workers compensation": "workers-compensation",
  "group health": "group-health",
  "hazardous waste": "hazardous-industrial-waste",
};

const PARENT_BY_KEY_PREFIX: Array<[string, string]> = [
  ["electric", "energy-utilities"],
  ["commercial-natural-gas", "energy-utilities"],
  ["water-", "energy-utilities"],
  ["telecom", "telecom-connectivity"],
  ["business-broadband", "telecom-connectivity"],
  ["wireless", "telecom-connectivity"],
  ["voice-", "telecom-connectivity"],
  ["wan-", "telecom-connectivity"],
  ["saas", "technology"],
  ["cloud", "technology"],
  ["ai-", "technology"],
  ["cyber", "technology"],
  ["insurance", "insurance-benefits"],
  ["commercial-property", "insurance-benefits"],
  ["general-liability", "insurance-benefits"],
  ["workers-", "insurance-benefits"],
  ["group-health", "insurance-benefits"],
  ["waste", "waste-environmental"],
  ["solid-waste", "waste-environmental"],
  ["hazardous", "waste-environmental"],
  ["merchant", "payments-finance"],
  ["payment", "payments-finance"],
];

function normalizeCategoryKey(value: string): string {
  const raw = (value || "").trim().toLowerCase();
  if (!raw) return "general-operating-expenses";
  if (CATEGORY_ALIASES[raw]) return CATEGORY_ALIASES[raw];
  return raw
    .replace(/&/g, " and ")
    .replace(/[_/\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function displayNameFromKey(key: string): string {
  return key
    .replace(/-/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function parentForKey(key: string): string {
  if (
    [
      "energy-utilities",
      "telecom-connectivity",
      "technology",
      "insurance-benefits",
      "waste-environmental",
      "payments-finance",
    ].includes(key)
  ) {
    return key;
  }
  return (
    PARENT_BY_KEY_PREFIX.find(([prefix]) => key.startsWith(prefix))?.[1] ??
    "office-professional"
  );
}

function createNeutralDraftPack(key: string): CategoryExpertPackV1 {
  const displayName = displayNameFromKey(key);
  return {
    schemaVersion: "category-expert-pack-v1",
    categoryKey: key,
    displayName,
    parentKey: parentForKey(key),
    version: "2026.08.2-draft",
    status: "draft",
    jurisdictions: ["US"],
    effectiveFrom: null,
    effectiveTo: null,
    defaultFreshnessDays: 0,
    scope: {
      includes: [],
      excludes: [],
      adjacentCategories: [],
    },
    documentTypes: [],
    billAnatomy: {
      identityFields: [],
      periodFields: [],
      quantityFields: [],
      pricingFields: [],
      taxFeeFields: [],
      contractFields: [],
    },
    lineItems: [],
    pricingModels: [],
    billQuality: {
      goodSignals: [],
      anomalyRules: [],
      contractChecks: [],
      arithmeticChecks: [],
    },
    benchmarkPolicy: {
      supportedMetrics: [],
      requiredDimensions: [],
      minimumComparableCount: null,
      sourceRequirements: [],
      quoteRequiredWhen: ["any_market_price_or_savings_claim"],
      prohibitedClaims: [
        "Claiming a market rate, percentile, savings amount, or category-specific anomaly from this neutral pack.",
        "Borrowing line-item definitions or pricing rules from an adjacent market.",
      ],
    },
    optimizationLevers: [],
    currentResearchPolicy: {
      mandatoryTriggers: [
        "current_price_question",
        "current_fee_question",
        "current_tariff_or_regulation_question",
      ],
      preferredSources: [],
      allowedDomains: [],
      freshnessDays: 0,
      cacheKeyDimensions: [],
    },
    outputPolicy: {
      requiredCaveats: [
        `Costivra does not yet have a reviewed expert pack for ${displayName}.`,
        "Explain only facts supported by the customer record. Market pricing and category-specific findings require research and human review.",
      ],
      confidenceThresholds: {
        extraction: 0.9,
        classification: 0.9,
      },
      humanReviewTriggers: ["any_material_finding_in_unsupported_category"],
    },
    evalCaseIds: [],
  };
}

export function getExpertPack(categoryKey: string): CategoryExpertPackV1 {
  const key = normalizeCategoryKey(categoryKey);
  return EXPERT_PACKS_REGISTRY[key] ?? createNeutralDraftPack(key);
}

export function hasDedicatedExpertPack(categoryKey: string): boolean {
  return Boolean(EXPERT_PACKS_REGISTRY[normalizeCategoryKey(categoryKey)]);
}

export function getRegisteredExpertPacks(): CategoryExpertPackV1[] {
  return Object.values(EXPERT_PACKS_REGISTRY);
}
