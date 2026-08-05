import type { CategoryExpertPackV1 } from "../types";
import { energyElectricityPack } from "./energy-electricity";
import { saasPack } from "./saas";
import { insurancePropertyLiabilityPack } from "./insurance-property-liability";
import { telecomBroadbandPack } from "./telecom-broadband";
import { merchantProcessingPack } from "./merchant-processing";
import { solidWastePack } from "./solid-waste";
import { wirelessMobilityPack } from "./wireless-mobility";
import { cloudIaasPaasPack } from "./cloud-iaas-paas";
import { aiApiConsumptionPack } from "./ai-api-consumption";

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
 * Only register exact, materially valid expert packs.
 * Deliberately absent until dedicated packs exist:
 * cloud, AI APIs, cybersecurity, workers compensation, group health,
 * wireless, voice/UCaaS, WAN/SD-WAN, hazardous waste, shredding, electric delivery.
 * Those categories receive a neutral draft pack rather than borrowed rules.
 */
export const EXPERT_PACKS_REGISTRY: Record<string, CategoryExpertPackV1> = {
  "commercial-electricity-supply": asDraft(energyElectricityPack),
  "saas-subscriptions": asDraft(saasPack),
  "commercial-property": asDraft(insurancePropertyLiabilityPack),
  "business-broadband-dia": asDraft(telecomBroadbandPack),
  "merchant-processing": asDraft(merchantProcessingPack),
  "solid-waste-recycling": asDraft(solidWastePack),
  "wireless-mobility": asDraft(wirelessMobilityPack),
  "cloud-iaas-paas": asDraft(cloudIaasPaasPack),
  "ai-api-consumption": asDraft(aiApiConsumptionPack),
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
  // Wireless
  wireless: "wireless-mobility",
  "wireless mobility": "wireless-mobility",
  cellular: "wireless-mobility",
  mobile: "wireless-mobility",
  // Cloud IaaS/PaaS
  cloud: "cloud-iaas-paas",
  "cloud infrastructure": "cloud-iaas-paas",
  iaas: "cloud-iaas-paas",
  paas: "cloud-iaas-paas",
  aws: "cloud-iaas-paas",
  azure: "cloud-iaas-paas",
  gcp: "cloud-iaas-paas",
  // AI API
  "ai api": "ai-api-consumption",
  "ai apis": "ai-api-consumption",
  "openai": "ai-api-consumption",
  "anthropic": "ai-api-consumption",
  "llm api": "ai-api-consumption",
  "model api": "ai-api-consumption",
  "ai model": "ai-api-consumption",
  // Broad or materially distinct categories intentionally resolve to neutral packs.
  telecom: "telecom-connectivity",
  "telecom & internet": "telecom-connectivity",
  insurance: "insurance-benefits",
  "insurance & employee benefits": "insurance-benefits",
  cybersecurity: "cybersecurity",
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

export type ExpertPackResolution = {
  pack: CategoryExpertPackV1;
  exactMatch: boolean;
  status: CategoryExpertPackV1["status"];
};

export function getExpertPackWithResolution(categoryKey: string): ExpertPackResolution {
  const key = normalizeCategoryKey(categoryKey);
  const exact = EXPERT_PACKS_REGISTRY[key];
  if (exact) {
    return {
      pack: exact,
      exactMatch: true,
      status: exact.status,
    };
  }
  const neutral = createNeutralDraftPack(key);
  return {
    pack: neutral,
    exactMatch: false,
    status: neutral.status,
  };
}

export function getExpertPack(categoryKey: string): CategoryExpertPackV1 {
  return getExpertPackWithResolution(categoryKey).pack;
}

export function hasDedicatedExpertPack(categoryKey: string): boolean {
  return Boolean(EXPERT_PACKS_REGISTRY[normalizeCategoryKey(categoryKey)]);
}

export function getRegisteredExpertPacks(): CategoryExpertPackV1[] {
  return Object.values(EXPERT_PACKS_REGISTRY);
}
