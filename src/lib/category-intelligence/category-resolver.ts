import { CategoryResolution, ResolveCategoryInput } from "./types";

/**
 * Normalized Taxonomy Map
 * Maps legacy/duplicate strings to canonical leaf keys.
 */
const ALIAS_MAP: Record<string, { key: string; name: string; parentKey: string }> = {
  // Energy & Utilities
  "commercial energy": { key: "commercial-electricity-supply", name: "Commercial Electricity Supply", parentKey: "energy-utilities" },
  "commercial electricity supply": { key: "commercial-electricity-supply", name: "Commercial Electricity Supply", parentKey: "energy-utilities" },
  "energy": { key: "commercial-electricity-supply", name: "Commercial Electricity Supply", parentKey: "energy-utilities" },
  "electricity": { key: "commercial-electricity-supply", name: "Commercial Electricity Supply", parentKey: "energy-utilities" },
  "commercial natural gas": { key: "commercial-natural-gas", name: "Commercial Natural Gas", parentKey: "energy-utilities" },
  "natural gas": { key: "commercial-natural-gas", name: "Commercial Natural Gas", parentKey: "energy-utilities" },
  "gas": { key: "commercial-natural-gas", name: "Commercial Natural Gas", parentKey: "energy-utilities" },
  "water": { key: "water-sewer-stormwater", name: "Water, Sewer & Stormwater", parentKey: "energy-utilities" },
  "water & sewer": { key: "water-sewer-stormwater", name: "Water, Sewer & Stormwater", parentKey: "energy-utilities" },
  "water-sewer-stormwater": { key: "water-sewer-stormwater", name: "Water, Sewer & Stormwater", parentKey: "energy-utilities" },

  // Telecom & Connectivity
  "telecom & internet": { key: "business-broadband-dia", name: "Business Broadband & DIA", parentKey: "telecom-connectivity" },
  "telecom": { key: "wireless-mobility", name: "Wireless & Mobility", parentKey: "telecom-connectivity" },
  "business broadband": { key: "business-broadband-dia", name: "Business Broadband & DIA", parentKey: "telecom-connectivity" },
  "wireless": { key: "wireless-mobility", name: "Wireless & Mobility", parentKey: "telecom-connectivity" },
  "cellular": { key: "wireless-mobility", name: "Wireless & Mobility", parentKey: "telecom-connectivity" },

  // Software & Cloud
  "software": { key: "saas-subscriptions", name: "SaaS Subscriptions", parentKey: "technology" },
  "software_subscription": { key: "saas-subscriptions", name: "SaaS Subscriptions", parentKey: "technology" },
  "saas": { key: "saas-subscriptions", name: "SaaS Subscriptions", parentKey: "technology" },
  "cloud": { key: "cloud-iaas-paas", name: "Cloud Infrastructure (IaaS/PaaS)", parentKey: "technology" },
  "cloud_infrastructure": { key: "cloud-iaas-paas", name: "Cloud Infrastructure (IaaS/PaaS)", parentKey: "technology" },

  // Insurance & Employee Benefits
  "insurance": { key: "commercial-property", name: "Commercial Property Insurance", parentKey: "insurance-benefits" },
  "insurance & employee benefits": { key: "commercial-property", name: "Commercial Property Insurance", parentKey: "insurance-benefits" },
  "commercial property": { key: "commercial-property", name: "Commercial Property Insurance", parentKey: "insurance-benefits" },
  "general liability": { key: "general-liability-bop", name: "General Liability & BOP", parentKey: "insurance-benefits" },
  "workers compensation": { key: "workers-compensation", name: "Workers Compensation", parentKey: "insurance-benefits" },
  "workers comp": { key: "workers-compensation", name: "Workers Compensation", parentKey: "insurance-benefits" },
  "health insurance": { key: "group-health", name: "Group Health Benefits", parentKey: "insurance-benefits" },
  "group health": { key: "group-health", name: "Group Health Benefits", parentKey: "insurance-benefits" },

  // Waste & Environmental
  "waste": { key: "solid-waste-recycling", name: "Solid Waste & Recycling", parentKey: "waste-environmental" },
  "waste_management": { key: "solid-waste-recycling", name: "Solid Waste & Recycling", parentKey: "waste-environmental" },
  "trash": { key: "solid-waste-recycling", name: "Solid Waste & Recycling", parentKey: "waste-environmental" },
  "hazardous waste": { key: "hazardous-industrial-waste", name: "Hazardous & Industrial Waste", parentKey: "waste-environmental" },

  // Facilities
  "facilities": { key: "janitorial", name: "Janitorial & Commercial Cleaning", parentKey: "facilities-property-services" },
  "cleaning": { key: "janitorial", name: "Janitorial & Commercial Cleaning", parentKey: "facilities-property-services" },
  "hvac": { key: "hvac-mechanical", name: "HVAC & Mechanical Services", parentKey: "facilities-property-services" },
  "uniforms": { key: "uniforms-linen-mats", name: "Uniforms, Linen & Facility Mats", parentKey: "facilities-property-services" },

  // Real Estate & Occupancy
  "rent": { key: "base-rent", name: "Base Rent & Lease", parentKey: "real-estate-occupancy" },
  "cam": { key: "cam-nnn-operating-expenses", name: "CAM & NNN Operating Expenses", parentKey: "real-estate-occupancy" },
  "lease": { key: "base-rent", name: "Base Rent & Lease", parentKey: "real-estate-occupancy" },

  // Payments & Merchant Processing
  "merchant processing": { key: "merchant-processing", name: "Merchant Processing & Gateway Fees", parentKey: "payments-finance" },
  "payment processing": { key: "merchant-processing", name: "Merchant Processing & Gateway Fees", parentKey: "payments-finance" },

  // Workforce & HR
  "payroll": { key: "payroll-processing", name: "Payroll & Tax Processing", parentKey: "workforce-hr" },
  "staffing": { key: "temporary-staffing", name: "Temporary Staffing & Recruiting", parentKey: "workforce-hr" },

  // Logistics & Fleet
  "shipping": { key: "parcel-shipping", name: "Parcel Shipping & Freight", parentKey: "logistics-fleet" },
  "parcel": { key: "parcel-shipping", name: "Parcel Shipping & Freight", parentKey: "logistics-fleet" },
  "freight": { key: "ltl-freight", name: "LTL & Freight Transit", parentKey: "logistics-fleet" },
  "fleet fuel": { key: "fuel-fleet-cards", name: "Fuel & Fleet Card Operations", parentKey: "logistics-fleet" },

  // Food & Hospitality
  "foodservice": { key: "foodservice-distribution", name: "Foodservice & Wholesale Distribution", parentKey: "food-hospitality" },
  "food service": { key: "foodservice-distribution", name: "Foodservice & Wholesale Distribution", parentKey: "food-hospitality" },
};

/**
 * Resolves a category from inputs following Section 7.1 priority order.
 */
export async function resolveCategory(input: ResolveCategoryInput): Promise<CategoryResolution> {
  const rawCat = (input.rawCategory || "").trim().toLowerCase();
  if (rawCat && ALIAS_MAP[rawCat]) {
    const matched = ALIAS_MAP[rawCat];
    return {
      id: null,
      key: matched.key,
      displayName: matched.name,
      parentKey: matched.parentKey,
      confidence: 0.95,
      source: "catalog",
      expertPackVersion: "2026.08.1",
    };
  }

  // Check vendor name hints
  const vendorName = (input.vendorName || "").trim().toLowerCase();
  if (vendorName) {
    if (vendorName.includes("aws") || vendorName.includes("azure") || vendorName.includes("google cloud")) {
      return {
        id: null,
        key: "cloud-iaas-paas",
        displayName: "Cloud Infrastructure (IaaS/PaaS)",
        parentKey: "technology",
        confidence: 0.98,
        source: "verified_vendor",
        expertPackVersion: "2026.08.1",
      };
    }
    if (vendorName.includes("microsoft 365") || vendorName.includes("salesforce") || vendorName.includes("slack") || vendorName.includes("zoom")) {
      return {
        id: null,
        key: "saas-subscriptions",
        displayName: "SaaS Subscriptions",
        parentKey: "technology",
        confidence: 0.98,
        source: "verified_vendor",
        expertPackVersion: "2026.08.1",
      };
    }
    if (vendorName.includes("republic services") || vendorName.includes("waste management")) {
      return {
        id: null,
        key: "solid-waste-recycling",
        displayName: "Solid Waste & Recycling",
        parentKey: "waste-environmental",
        confidence: 0.98,
        source: "verified_vendor",
        expertPackVersion: "2026.08.1",
      };
    }
    if (vendorName.includes("cintas")) {
      return {
        id: null,
        key: "uniforms-linen-mats",
        displayName: "Uniforms, Linen & Facility Mats",
        parentKey: "facilities-property-services",
        confidence: 0.98,
        source: "verified_vendor",
        expertPackVersion: "2026.08.1",
      };
    }
    if (vendorName.includes("sysco") || vendorName.includes("us foods")) {
      return {
        id: null,
        key: "foodservice-distribution",
        displayName: "Foodservice & Wholesale Distribution",
        parentKey: "food-hospitality",
        confidence: 0.98,
        source: "verified_vendor",
        expertPackVersion: "2026.08.1",
      };
    }
  }

  // Check line items text
  const lineItemStr = (input.lineItemDescriptions || []).join(" ").toLowerCase();
  const extractedStr = (input.extractedText || "").toLowerCase();
  const combinedText = `${lineItemStr} ${extractedStr}`;

  if (combinedText.includes("kwh") || combinedText.includes("kw demand") || combinedText.includes("peak demand")) {
    return {
      id: null,
      key: "commercial-electricity-supply",
      displayName: "Commercial Electricity Supply",
      parentKey: "energy-utilities",
      confidence: 0.92,
      source: "line_item_evidence",
      expertPackVersion: "2026.08.1",
    };
  }

  if (combinedText.includes("therm") || combinedText.includes("mcf") || combinedText.includes("natural gas")) {
    return {
      id: null,
      key: "commercial-natural-gas",
      displayName: "Commercial Natural Gas",
      parentKey: "energy-utilities",
      confidence: 0.92,
      source: "line_item_evidence",
      expertPackVersion: "2026.08.1",
    };
  }

  if (combinedText.includes("circuit") || combinedText.includes("local loop") || combinedText.includes("dia bandwidth")) {
    return {
      id: null,
      key: "business-broadband-dia",
      displayName: "Business Broadband & DIA",
      parentKey: "telecom-connectivity",
      confidence: 0.90,
      source: "line_item_evidence",
      expertPackVersion: "2026.08.1",
    };
  }

  if (combinedText.includes("workers comp") || combinedText.includes("class code") || combinedText.includes("experience mod")) {
    return {
      id: null,
      key: "workers-compensation",
      displayName: "Workers Compensation",
      parentKey: "insurance-benefits",
      confidence: 0.94,
      source: "line_item_evidence",
      expertPackVersion: "2026.08.1",
    };
  }

  // Fallback default
  return {
    id: null,
    key: "general-operating-expenses",
    displayName: "General Operating Expenses",
    parentKey: "office-professional",
    confidence: 0.60,
    source: "fallback",
    expertPackVersion: "2026.08.1",
  };
}
