import type { CategoryResolution, ResolveCategoryInput } from "./types";
import { getExpertPack, hasDedicatedExpertPack } from "./packs";

type CategoryCandidate = {
  key: string;
  name: string;
  parentKey: string;
  confidence: number;
};

const ALIAS_MAP: Record<string, CategoryCandidate> = {
  // Energy & utilities
  "commercial energy": {
    key: "commercial-electricity-supply",
    name: "Commercial Electricity Supply",
    parentKey: "energy-utilities",
    confidence: 0.9,
  },
  "commercial electricity supply": {
    key: "commercial-electricity-supply",
    name: "Commercial Electricity Supply",
    parentKey: "energy-utilities",
    confidence: 0.98,
  },
  electricity: {
    key: "commercial-electricity-supply",
    name: "Commercial Electricity Supply",
    parentKey: "energy-utilities",
    confidence: 0.85,
  },
  energy: {
    key: "energy-utilities",
    name: "Energy & Utilities",
    parentKey: "energy-utilities",
    confidence: 0.55,
  },
  "commercial natural gas": {
    key: "commercial-natural-gas",
    name: "Commercial Natural Gas",
    parentKey: "energy-utilities",
    confidence: 0.98,
  },
  "natural gas": {
    key: "commercial-natural-gas",
    name: "Commercial Natural Gas",
    parentKey: "energy-utilities",
    confidence: 0.9,
  },
  water: {
    key: "water-sewer-stormwater",
    name: "Water, Sewer & Stormwater",
    parentKey: "energy-utilities",
    confidence: 0.8,
  },
  "water & sewer": {
    key: "water-sewer-stormwater",
    name: "Water, Sewer & Stormwater",
    parentKey: "energy-utilities",
    confidence: 0.95,
  },

  // Telecom. Broad labels intentionally remain at parent level.
  "telecom & internet": {
    key: "telecom-connectivity",
    name: "Telecom & Connectivity",
    parentKey: "telecom-connectivity",
    confidence: 0.6,
  },
  telecom: {
    key: "telecom-connectivity",
    name: "Telecom & Connectivity",
    parentKey: "telecom-connectivity",
    confidence: 0.5,
  },
  "business broadband": {
    key: "business-broadband-dia",
    name: "Business Broadband & DIA",
    parentKey: "telecom-connectivity",
    confidence: 0.9,
  },
  dia: {
    key: "business-broadband-dia",
    name: "Business Broadband & DIA",
    parentKey: "telecom-connectivity",
    confidence: 0.92,
  },
  wireless: {
    key: "wireless-mobility",
    name: "Wireless & Mobility",
    parentKey: "telecom-connectivity",
    confidence: 0.8,
  },
  cellular: {
    key: "wireless-mobility",
    name: "Wireless & Mobility",
    parentKey: "telecom-connectivity",
    confidence: 0.8,
  },

  // Technology
  software: {
    key: "saas-subscriptions",
    name: "SaaS Subscriptions",
    parentKey: "technology",
    confidence: 0.75,
  },
  software_subscription: {
    key: "saas-subscriptions",
    name: "SaaS Subscriptions",
    parentKey: "technology",
    confidence: 0.95,
  },
  saas: {
    key: "saas-subscriptions",
    name: "SaaS Subscriptions",
    parentKey: "technology",
    confidence: 0.9,
  },
  cloud: {
    key: "cloud-iaas-paas",
    name: "Cloud Infrastructure (IaaS/PaaS)",
    parentKey: "technology",
    confidence: 0.75,
  },
  cloud_infrastructure: {
    key: "cloud-iaas-paas",
    name: "Cloud Infrastructure (IaaS/PaaS)",
    parentKey: "technology",
    confidence: 0.95,
  },

  // Insurance. Broad labels intentionally remain at parent level.
  insurance: {
    key: "insurance-benefits",
    name: "Insurance & Employee Benefits",
    parentKey: "insurance-benefits",
    confidence: 0.45,
  },
  "insurance & employee benefits": {
    key: "insurance-benefits",
    name: "Insurance & Employee Benefits",
    parentKey: "insurance-benefits",
    confidence: 0.6,
  },
  "commercial property": {
    key: "commercial-property",
    name: "Commercial Property Insurance",
    parentKey: "insurance-benefits",
    confidence: 0.95,
  },
  "general liability": {
    key: "general-liability-bop",
    name: "General Liability & BOP",
    parentKey: "insurance-benefits",
    confidence: 0.95,
  },
  "workers compensation": {
    key: "workers-compensation",
    name: "Workers Compensation",
    parentKey: "insurance-benefits",
    confidence: 0.95,
  },
  "workers comp": {
    key: "workers-compensation",
    name: "Workers Compensation",
    parentKey: "insurance-benefits",
    confidence: 0.9,
  },
  "health insurance": {
    key: "group-health",
    name: "Group Health Benefits",
    parentKey: "insurance-benefits",
    confidence: 0.9,
  },
  "group health": {
    key: "group-health",
    name: "Group Health Benefits",
    parentKey: "insurance-benefits",
    confidence: 0.95,
  },

  // Waste & environmental
  waste: {
    key: "solid-waste-recycling",
    name: "Solid Waste & Recycling",
    parentKey: "waste-environmental",
    confidence: 0.8,
  },
  waste_management: {
    key: "solid-waste-recycling",
    name: "Solid Waste & Recycling",
    parentKey: "waste-environmental",
    confidence: 0.95,
  },
  trash: {
    key: "solid-waste-recycling",
    name: "Solid Waste & Recycling",
    parentKey: "waste-environmental",
    confidence: 0.85,
  },
  "hazardous waste": {
    key: "hazardous-industrial-waste",
    name: "Hazardous & Industrial Waste",
    parentKey: "waste-environmental",
    confidence: 0.95,
  },

  // Other broad categories remain neutral until dedicated packs exist.
  facilities: {
    key: "facilities-property-services",
    name: "Facilities & Property Services",
    parentKey: "facilities-property-services",
    confidence: 0.5,
  },
  cleaning: {
    key: "janitorial",
    name: "Janitorial & Commercial Cleaning",
    parentKey: "facilities-property-services",
    confidence: 0.8,
  },
  hvac: {
    key: "hvac-mechanical",
    name: "HVAC & Mechanical Services",
    parentKey: "facilities-property-services",
    confidence: 0.9,
  },
  uniforms: {
    key: "uniforms-linen-mats",
    name: "Uniforms, Linen & Facility Mats",
    parentKey: "facilities-property-services",
    confidence: 0.9,
  },
  rent: {
    key: "base-rent",
    name: "Base Rent & Lease",
    parentKey: "real-estate-occupancy",
    confidence: 0.8,
  },
  cam: {
    key: "cam-nnn-operating-expenses",
    name: "CAM & NNN Operating Expenses",
    parentKey: "real-estate-occupancy",
    confidence: 0.9,
  },
  "merchant processing": {
    key: "merchant-processing",
    name: "Merchant Processing & Gateway Fees",
    parentKey: "payments-finance",
    confidence: 0.95,
  },
  "payment processing": {
    key: "merchant-processing",
    name: "Merchant Processing & Gateway Fees",
    parentKey: "payments-finance",
    confidence: 0.85,
  },
  payroll: {
    key: "payroll-processing",
    name: "Payroll & Tax Processing",
    parentKey: "workforce-hr",
    confidence: 0.8,
  },
  staffing: {
    key: "temporary-staffing",
    name: "Temporary Staffing & Recruiting",
    parentKey: "workforce-hr",
    confidence: 0.8,
  },
  shipping: {
    key: "logistics-fleet",
    name: "Logistics, Shipping & Fleet",
    parentKey: "logistics-fleet",
    confidence: 0.45,
  },
  parcel: {
    key: "parcel-shipping",
    name: "Parcel Shipping",
    parentKey: "logistics-fleet",
    confidence: 0.85,
  },
  freight: {
    key: "logistics-fleet",
    name: "Freight & Logistics",
    parentKey: "logistics-fleet",
    confidence: 0.5,
  },
  foodservice: {
    key: "foodservice-distribution",
    name: "Foodservice & Wholesale Distribution",
    parentKey: "food-hospitality",
    confidence: 0.9,
  },
  "food service": {
    key: "foodservice-distribution",
    name: "Foodservice & Wholesale Distribution",
    parentKey: "food-hospitality",
    confidence: 0.9,
  },
};

function resolution(
  candidate: CategoryCandidate,
  source: CategoryResolution["source"],
): CategoryResolution {
  const dedicated = hasDedicatedExpertPack(candidate.key);
  return {
    id: null,
    key: candidate.key,
    displayName: candidate.name,
    parentKey: candidate.parentKey,
    confidence: candidate.confidence,
    source,
    expertPackVersion: dedicated ? getExpertPack(candidate.key).version : null,
  };
}

function vendorCandidate(vendorName: string): CategoryCandidate | null {
  const name = vendorName.toLowerCase();
  if (/\b(aws|amazon web services|microsoft azure|google cloud)\b/.test(name)) {
    return {
      key: "cloud-iaas-paas",
      name: "Cloud Infrastructure (IaaS/PaaS)",
      parentKey: "technology",
      confidence: 0.98,
    };
  }
  if (/\b(microsoft 365|salesforce|slack|zoom|docusign|hubspot)\b/.test(name)) {
    return {
      key: "saas-subscriptions",
      name: "SaaS Subscriptions",
      parentKey: "technology",
      confidence: 0.98,
    };
  }
  if (/\b(republic services|waste management|wm)\b/.test(name)) {
    return {
      key: "solid-waste-recycling",
      name: "Solid Waste & Recycling",
      parentKey: "waste-environmental",
      confidence: 0.98,
    };
  }
  if (name.includes("cintas")) {
    return {
      key: "uniforms-linen-mats",
      name: "Uniforms, Linen & Facility Mats",
      parentKey: "facilities-property-services",
      confidence: 0.98,
    };
  }
  if (/\b(sysco|us foods)\b/.test(name)) {
    return {
      key: "foodservice-distribution",
      name: "Foodservice & Wholesale Distribution",
      parentKey: "food-hospitality",
      confidence: 0.98,
    };
  }
  if (/\b(txu|reliant|engie|constellation|apg&e|shell energy)\b/.test(name)) {
    return {
      key: "commercial-electricity-supply",
      name: "Commercial Electricity Supply",
      parentKey: "energy-utilities",
      confidence: 0.92,
    };
  }
  return null;
}

function textCandidate(text: string): CategoryCandidate | null {
  if (/\b(kwh|kw demand|peak demand|tdsp|esi id)\b/.test(text)) {
    return {
      key: "commercial-electricity-supply",
      name: "Commercial Electricity Supply",
      parentKey: "energy-utilities",
      confidence: 0.92,
    };
  }
  if (/\b(therm|mcf|mmbtu|natural gas)\b/.test(text)) {
    return {
      key: "commercial-natural-gas",
      name: "Commercial Natural Gas",
      parentKey: "energy-utilities",
      confidence: 0.92,
    };
  }
  if (/\b(circuit id|local loop|dia bandwidth|committed information rate)\b/.test(text)) {
    return {
      key: "business-broadband-dia",
      name: "Business Broadband & DIA",
      parentKey: "telecom-connectivity",
      confidence: 0.9,
    };
  }
  if (/\b(imei|mobile line|cellular line|device installment)\b/.test(text)) {
    return {
      key: "wireless-mobility",
      name: "Wireless & Mobility",
      parentKey: "telecom-connectivity",
      confidence: 0.9,
    };
  }
  if (/\b(user seat|named license|active seats|subscription tier)\b/.test(text)) {
    return {
      key: "saas-subscriptions",
      name: "SaaS Subscriptions",
      parentKey: "technology",
      confidence: 0.9,
    };
  }
  if (/\b(ec2|virtual machine|compute hours|data egress|cloud storage)\b/.test(text)) {
    return {
      key: "cloud-iaas-paas",
      name: "Cloud Infrastructure (IaaS/PaaS)",
      parentKey: "technology",
      confidence: 0.9,
    };
  }
  if (/\b(workers comp|class code|experience mod)\b/.test(text)) {
    return {
      key: "workers-compensation",
      name: "Workers Compensation",
      parentKey: "insurance-benefits",
      confidence: 0.94,
    };
  }
  if (/\b(interchange|merchant id|processor markup|chargeback fee)\b/.test(text)) {
    return {
      key: "merchant-processing",
      name: "Merchant Processing & Gateway Fees",
      parentKey: "payments-finance",
      confidence: 0.93,
    };
  }
  if (/\b(container size|pickup frequency|fuel surcharge|contamination fee)\b/.test(text)) {
    return {
      key: "solid-waste-recycling",
      name: "Solid Waste & Recycling",
      parentKey: "waste-environmental",
      confidence: 0.9,
    };
  }
  return null;
}

/**
 * Resolves a category without forcing broad labels into a narrower market.
 * Unsupported categories may still resolve to an honest key, but they receive
 * no expert-pack version until a dedicated pack exists.
 */
export async function resolveCategory(
  input: ResolveCategoryInput,
): Promise<CategoryResolution> {
  const rawCategory = (input.rawCategory || "").trim().toLowerCase();
  if (rawCategory && ALIAS_MAP[rawCategory]) {
    return resolution(ALIAS_MAP[rawCategory], "catalog");
  }

  const vendor = (input.vendorName || "").trim();
  const vendorMatch = vendor ? vendorCandidate(vendor) : null;
  if (vendorMatch) return resolution(vendorMatch, "verified_vendor");

  const combinedText = [
    ...(input.lineItemDescriptions || []),
    input.extractedText || "",
  ]
    .join(" ")
    .toLowerCase();
  const textMatch = textCandidate(combinedText);
  if (textMatch) return resolution(textMatch, "line_item_evidence");

  return {
    id: null,
    key: "general-operating-expenses",
    displayName: "General Operating Expenses",
    parentKey: "office-professional",
    confidence: 0,
    source: "fallback",
    expertPackVersion: null,
  };
}
