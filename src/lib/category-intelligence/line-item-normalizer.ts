import type {
  CategoryLineItemDefinition,
  ChargeClass,
  NormalizedLineItem,
} from "./types";
import { getExpertPack, hasDedicatedExpertPack } from "./packs";

export type RawLineItem = {
  id?: string;
  description: string;
  amount: number;
  quantity?: number;
  unitPrice?: number;
};

type DefinitionMatch = {
  definition: CategoryLineItemDefinition;
  alias: string;
  score: number;
};

const GENERIC_ALIASES = new Set([
  "charge",
  "fee",
  "service",
  "monthly charge",
  "monthly fee",
  "tax",
  "credit",
  "adjustment",
]);

function normalizePhrase(value: string): string {
  return (value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9%+./\s-]/g, " ")
    .replace(/[_/\s-]+/g, " ")
    .trim();
}

function scoreAlias(description: string, alias: string): number {
  if (!alias || GENERIC_ALIASES.has(alias)) return 0;
  if (description === alias) return 0.99;
  if (description.startsWith(`${alias} `) || description.endsWith(` ${alias}`)) {
    return 0.95;
  }
  if (alias.length >= 5 && description.includes(alias)) return 0.9;
  return 0;
}

function findPackMatch(
  description: string,
  definitions: CategoryLineItemDefinition[],
): DefinitionMatch | null {
  const normalizedDescription = normalizePhrase(description);
  if (!normalizedDescription) return null;

  const matches: DefinitionMatch[] = [];
  for (const definition of definitions) {
    const candidates = [definition.label, ...definition.aliases];
    for (const candidate of candidates) {
      const normalizedAlias = normalizePhrase(candidate);
      const score = scoreAlias(normalizedDescription, normalizedAlias);
      if (score > 0) {
        matches.push({ definition, alias: candidate, score });
      }
    }
  }

  matches.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    return normalizePhrase(right.alias).length - normalizePhrase(left.alias).length;
  });

  return matches[0] ?? null;
}

function explicitGeneralClassification(item: RawLineItem): {
  canonicalCode: string;
  label: string;
  chargeClass: ChargeClass;
  explanation: string;
  confidence: number;
  matchedAlias: string;
} | null {
  const description = normalizePhrase(item.description);

  if (
    /\b(sales tax|state tax|local tax|vat|gst)\b/.test(description) ||
    description === "tax"
  ) {
    return {
      canonicalCode: "GEN-TAX-01",
      label: "Tax",
      chargeClass: "tax",
      explanation:
        "A tax line explicitly identified on the source document. The applicable tax base and exemption still require jurisdiction and contract review.",
      confidence: 0.96,
      matchedAlias: "explicit tax label",
    };
  }

  if (
    item.amount < 0 ||
    /\b(refund|bill credit|service credit|promotional credit|rebate)\b/.test(
      description,
    )
  ) {
    return {
      canonicalCode: "GEN-CREDIT-01",
      label: "Credit or Refund",
      chargeClass: "credit",
      explanation:
        "A negative amount or explicitly labeled credit. Confirm the covered period and whether the credit fully resolves the underlying issue.",
      confidence: item.amount < 0 ? 0.98 : 0.92,
      matchedAlias: item.amount < 0 ? "negative amount" : "explicit credit label",
    };
  }

  return null;
}

/**
 * Normalizes invoice line items using only the selected category pack.
 *
 * Cross-market keyword rules are intentionally prohibited. An "access fee" is
 * not automatically telecom, and a "class code" is not automatically workers
 * compensation unless the selected, supported category pack defines it.
 */
export function normalizeLineItems(
  items: RawLineItem[],
  categoryKey?: string,
): NormalizedLineItem[] {
  const pack = getExpertPack(categoryKey || "general-operating-expenses");
  const hasDedicatedPack = hasDedicatedExpertPack(pack.categoryKey);

  return items.map((item) => {
    const description = (item.description || "").trim();
    const general = explicitGeneralClassification(item);
    const packMatch = hasDedicatedPack
      ? findPackMatch(description, pack.lineItems)
      : null;

    if (packMatch) {
      const confidence =
        pack.status === "verified"
          ? packMatch.score
          : Math.min(packMatch.score, 0.79);

      return {
        lineItemId: item.id,
        originalDescription: description,
        canonicalCode: packMatch.definition.canonicalCode,
        label: packMatch.definition.label,
        chargeClass: packMatch.definition.chargeClass,
        explanation: packMatch.definition.meaning,
        confidence,
        unit: packMatch.definition.units[0],
        amount: item.amount,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        evidenceIds: [],
        reviewRequired: pack.status !== "verified" || confidence < 0.9,
        matchedAlias: packMatch.alias,
      };
    }

    if (general) {
      return {
        lineItemId: item.id,
        originalDescription: description,
        canonicalCode: general.canonicalCode,
        label: general.label,
        chargeClass: general.chargeClass,
        explanation: general.explanation,
        confidence: general.confidence,
        amount: item.amount,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        evidenceIds: [],
        reviewRequired: general.chargeClass === "tax",
        matchedAlias: general.matchedAlias,
      };
    }

    return {
      lineItemId: item.id,
      originalDescription: description,
      canonicalCode: null,
      label: description || "Unclassified line item",
      chargeClass: "unknown",
      explanation: hasDedicatedPack
        ? `This line item did not match the ${pack.displayName} ontology with enough confidence.`
        : `Costivra does not yet have a reviewed ontology for ${pack.displayName}.`,
      confidence: 0,
      amount: item.amount,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      evidenceIds: [],
      reviewRequired: true,
      matchedAlias: null,
    };
  });
}
