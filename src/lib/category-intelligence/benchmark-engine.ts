import type { BenchmarkInput, BenchmarkResult } from "./types";
import { getExpertPack, hasDedicatedExpertPack } from "./packs";

function comparableKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function recordContainsDimension(
  record: Record<string, unknown> | null | undefined,
  dimension: string,
): boolean {
  if (!record) return false;
  const normalizedDimension = comparableKey(dimension);
  return Object.entries(record).some(([key, value]) => {
    if (value == null || value === "" || value === false) return false;
    const normalizedKey = comparableKey(key);
    return (
      normalizedDimension.includes(normalizedKey) ||
      normalizedKey.includes(normalizedDimension)
    );
  });
}

function hasDimension(input: BenchmarkInput, dimension: string): boolean {
  const normalized = comparableKey(dimension);

  if (normalized.includes("state") || normalized.includes("jurisdiction")) {
    return Boolean(input.geography?.state || input.geography?.zip);
  }
  if (
    normalized.includes("address") ||
    normalized.includes("zip") ||
    normalized.includes("location") ||
    normalized.includes("territory")
  ) {
    return Boolean(
      input.geography?.zip || input.geography?.city || input.geography?.state,
    );
  }
  if (
    normalized.includes("volume") ||
    normalized.includes("usage") ||
    normalized.includes("seat") ||
    normalized.includes("transaction")
  ) {
    return Boolean(input.volume && input.volume > 0);
  }
  if (normalized.includes("term") || normalized.includes("contract")) {
    return Boolean(input.contractTermMonths && input.contractTermMonths > 0);
  }
  if (
    normalized.includes("tier") ||
    normalized.includes("speed") ||
    normalized.includes("bandwidth") ||
    normalized.includes("class") ||
    normalized.includes("mix") ||
    normalized.includes("container") ||
    normalized.includes("frequency") ||
    normalized.includes("value") ||
    normalized.includes("limit") ||
    normalized.includes("deductible")
  ) {
    return Boolean(
      input.serviceTier ||
        recordContainsDimension(input.specification, dimension) ||
        recordContainsDimension(input.usageShape, dimension),
    );
  }
  if (normalized.includes("unit")) return Boolean(input.unit);
  if (normalized.includes("date") || normalized.includes("period")) {
    return Boolean(input.serviceDate);
  }

  return (
    recordContainsDimension(input.specification, dimension) ||
    recordContainsDimension(input.usageShape, dimension)
  );
}

/**
 * Honest market benchmark gate.
 *
 * Costivra does not currently persist a verified comparable-price cohort in
 * this service, so this function never manufactures a range, percentile, or
 * savings value from the customer's billed amount. It reports what is missing
 * and requires a current quote or verified external comparable set.
 */
export function evaluateMarketBenchmark(input: BenchmarkInput): BenchmarkResult {
  const pack = getExpertPack(input.categoryKey || "general-operating-expenses");
  const billedAmount = Number(input.billedAmount || 0);
  const supported = hasDedicatedExpertPack(pack.categoryKey);
  const requiredDimensions = pack.benchmarkPolicy.requiredDimensions;
  const missingDimensions = requiredDimensions.filter(
    (dimension) => !hasDimension(input, dimension),
  );

  let status: BenchmarkResult["status"];
  if (!supported) {
    status = "unsupported";
  } else if (missingDimensions.length > 0) {
    status = "insufficient_data";
  } else {
    status = "quote_required";
  }

  const statusMessage =
    status === "unsupported"
      ? `Costivra does not yet have a reviewed benchmark method for ${pack.displayName}.`
      : status === "insufficient_data"
        ? `A comparable benchmark requires additional dimensions: ${missingDimensions.join(", ")}.`
        : "The comparison dimensions are present, but a current verified quote or comparable dataset is still required.";

  return {
    status,
    metric: input.metric || "effective_rate",
    currentValue: billedAmount > 0 ? billedAmount : null,
    comparisonRange: null,
    percentile: null,
    estimatedMarketRate: null,
    variancePercentage: null,
    potentialAnnualSavings: null,
    unit: input.unit || "USD",
    comparableDimensions: {
      categoryKey: pack.categoryKey,
      geography: input.geography ?? null,
      volume: input.volume ?? null,
      serviceTier: input.serviceTier ?? null,
      contractTermMonths: input.contractTermMonths ?? null,
      specification: input.specification ?? null,
    },
    missingDimensions,
    sourceIds: [],
    benchmarkSource: "No verified comparable dataset loaded",
    asOf: null,
    confidence: 1,
    caveats: [
      statusMessage,
      "Costivra does not apply a fixed percentage discount or synthetic peer range to an invoice total.",
      "Estimated market pricing and savings remain unavailable until supported by dated, source-backed comparables.",
      ...pack.benchmarkPolicy.prohibitedClaims,
    ],
  };
}
