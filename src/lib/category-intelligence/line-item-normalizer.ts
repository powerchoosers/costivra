import { ChargeClass, NormalizedLineItem } from "./types";

export type RawLineItem = {
  id?: string;
  description: string;
  amount: number;
  quantity?: number;
  unitPrice?: number;
};

/**
 * Normalizes raw invoice line items into structured ontology mappings.
 * @param items Raw line items from invoice extraction
 * @param categoryKey Optional resolved category key for category-specific classification
 */
export function normalizeLineItems(
  items: RawLineItem[],
  categoryKey?: string
): NormalizedLineItem[] {
  // categoryKey is available for future category-specific classification logic
  void categoryKey;

  return items.map((item) => {
    const desc = (item.description || "").trim();
    const lower = desc.toLowerCase();

    let canonicalCode: string | null = null;
    let label = desc;
    let chargeClass: ChargeClass = "fixed";
    let explanation = "Standard fixed line item charge.";
    let confidence = 0.85;

    if (lower.includes("tax") || lower.includes("sales tax") || lower.includes("vat") || lower.includes("gst")) {
      canonicalCode = "TAX-ST-01";
      label = "Sales & Local Tax";
      chargeClass = "tax";
      explanation = "Government-mandated sales or local tax pass-through.";
      confidence = 0.98;
    } else if (lower.includes("kwh") || lower.includes("energy charge") || lower.includes("generation charge")) {
      canonicalCode = "ELEC-ENG-01";
      label = "Electricity Generation / Supply Charge";
      chargeClass = "usage";
      explanation = "Volumetric energy supply charge billed per kilowatt-hour (kWh).";
      confidence = 0.95;
    } else if (lower.includes("kw demand") || lower.includes("peak demand") || lower.includes("demand charge")) {
      canonicalCode = "ELEC-DEM-01";
      label = "Peak Demand Charge";
      chargeClass = "demand";
      explanation = "Peak capacity demand fee measured in kilowatts (kW) during billing cycle peak.";
      confidence = 0.95;
    } else if (lower.includes("therm") || lower.includes("mcf") || lower.includes("gas supply")) {
      canonicalCode = "GAS-VOL-01";
      label = "Natural Gas Volumetric Supply";
      chargeClass = "usage";
      explanation = "Volumetric natural gas supply charge billed per Therm or MCF.";
      confidence = 0.95;
    } else if (lower.includes("circuit") || lower.includes("local loop") || lower.includes("access fee")) {
      canonicalCode = "TEL-ACC-01";
      label = "Broadband / Circuit Access Loop";
      chargeClass = "fixed";
      explanation = "Dedicated physical transport access circuit fee from local carrier.";
      confidence = 0.92;
    } else if (lower.includes("usf") || lower.includes("universal service") || lower.includes("regulatory recovery")) {
      canonicalCode = "TEL-REG-01";
      label = "Universal Service Fund / Regulatory Surcharge";
      chargeClass = "surcharge";
      explanation = "Regulatory recovery surcharge assessed on interstate telecom services.";
      confidence = 0.95;
    } else if (lower.includes("seat") || lower.includes("user license") || lower.includes("per user")) {
      canonicalCode = "SAAS-LIC-01";
      label = "SaaS User License Subscription";
      chargeClass = "fixed";
      explanation = "Per-user active software subscription seat tier.";
      confidence = 0.94;
    } else if (lower.includes("compute") || lower.includes("ec2") || lower.includes("instance hour")) {
      canonicalCode = "CLOUD-CMP-01";
      label = "Cloud Compute Virtual Instance Hours";
      chargeClass = "usage";
      explanation = "On-demand or committed cloud compute instance utilization.";
      confidence = 0.94;
    } else if (lower.includes("workers comp") || lower.includes("class code")) {
      canonicalCode = "INS-WC-01";
      label = "Workers Compensation Payroll Premium";
      chargeClass = "fixed";
      explanation = "State-governed payroll premium rate based on assigned class code.";
      confidence = 0.96;
    } else if (lower.includes("discount") || lower.includes("credit") || lower.includes("rebate")) {
      canonicalCode = "ADJ-CRD-01";
      label = "Contract Discount / Promotional Credit";
      chargeClass = "credit";
      explanation = "Contractual rate adjustment or promotional bill credit.";
      confidence = 0.95;
    } else if (item.amount < 0) {
      canonicalCode = "ADJ-CRD-01";
      label = "Bill Adjustment Credit";
      chargeClass = "credit";
      explanation = "Negative adjustment or account balance credit.";
      confidence = 0.90;
    }

    return {
      lineItemId: item.id,
      originalDescription: desc,
      canonicalCode,
      label,
      chargeClass,
      explanation,
      confidence,
      amount: item.amount,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      evidenceIds: [],
    };
  });
}
