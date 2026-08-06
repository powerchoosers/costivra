export type TariffReviewInput = {
  utilityTerritory: string | null;
  serviceIdentifier: string | null;
  assignedRateCode: string | null;
  serviceVoltage: string | null;
  meteringConfiguration: string | null;
  serviceClass: string | null;
  billedDemandKw: string | null;
  historicalDemandKw: string | null;
  ratchetApplies: boolean | null;
  officialSource: {
    sourceId: string;
    rateCode: string;
    asOf: string;
    expiresAt: string | null;
    isOfficial: boolean;
  } | null;
  comparison: {
    billedUnderAssignedRate: string;
    billedUnderEligibleRate: string;
    eligibleRateCode: string;
  } | null;
};

export type TariffReviewResult = {
  state: "needs_evidence" | "evidence_backed";
  title: string;
  message: string;
  missingDimensions: string[];
  sourceId: string | null;
  rateCode: string | null;
  estimatedMonthlyDifference: string | null;
  calculationResult: Record<string, string>;
};

const NEUTRAL_MESSAGE =
  "Current bill does not identify the assigned delivery rate schedule. Obtain the official rate code and current tariff before drawing a conclusion.";

function isPresent(value: string | null) {
  return Boolean(value && value.trim());
}

function cents(value: string): bigint | null {
  if (!/^-?\d{1,16}(?:\.\d{1,2})?$/.test(value.trim())) return null;
  const negative = value.trim().startsWith("-");
  const unsigned = negative ? value.trim().slice(1) : value.trim();
  const [whole, fraction = ""] = unsigned.split(".");
  const result = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  return negative ? -result : result;
}

function money(value: bigint): string {
  const negative = value < BigInt(0);
  const absolute = negative ? -value : value;
  return `${negative ? "-" : ""}${absolute / BigInt(100)}.${String(absolute % BigInt(100)).padStart(2, "0")}`;
}

function stale(source: NonNullable<TariffReviewInput["officialSource"]>, now = new Date()) {
  if (!source.isOfficial || !/^\d{4}-\d{2}-\d{2}$/.test(source.asOf)) return true;
  if (source.expiresAt && Date.parse(`${source.expiresAt}T23:59:59Z`) < now.valueOf()) return true;
  return false;
}

export function evaluateTariffReview(input: TariffReviewInput, now = new Date()): TariffReviewResult {
  const missingDimensions = [
    ["utility territory", input.utilityTerritory],
    ["service identifier", input.serviceIdentifier],
    ["assigned rate code", input.assignedRateCode],
    ["service voltage", input.serviceVoltage],
    ["metering configuration", input.meteringConfiguration],
    ["service class", input.serviceClass],
    ["billed demand", input.billedDemandKw],
  ].filter(([, value]) => !isPresent(value)).map(([label]) => label as string);
  if (input.ratchetApplies === true && !isPresent(input.historicalDemandKw)) {
    missingDimensions.push("historical demand for ratchet treatment");
  }
  if (!input.officialSource) missingDimensions.push("current official tariff");
  if (!input.comparison) missingDimensions.push("deterministic assigned-versus-eligible comparison");

  if (
    missingDimensions.length ||
    !input.officialSource ||
    stale(input.officialSource, now) ||
    !input.comparison ||
    input.officialSource.rateCode !== input.assignedRateCode ||
    input.comparison.eligibleRateCode === input.assignedRateCode
  ) {
    const staleSource = input.officialSource && stale(input.officialSource, now);
    return {
      state: "needs_evidence",
      title: "Tariff review may be worthwhile",
      message: staleSource
        ? "The tariff source is stale or not an official current schedule. Refresh the source and confirm the assigned rate code before drawing a conclusion."
        : NEUTRAL_MESSAGE,
      missingDimensions,
      sourceId: input.officialSource?.sourceId ?? null,
      rateCode: input.assignedRateCode,
      estimatedMonthlyDifference: null,
      calculationResult: {},
    };
  }

  const billed = cents(input.comparison.billedUnderAssignedRate);
  const eligible = cents(input.comparison.billedUnderEligibleRate);
  if (billed === null || eligible === null) {
    return {
      state: "needs_evidence",
      title: "Tariff review may be worthwhile",
      message: "The official rate-code comparison is missing a valid deterministic charge result.",
      missingDimensions: ["valid deterministic charge result"],
      sourceId: input.officialSource.sourceId,
      rateCode: input.assignedRateCode,
      estimatedMonthlyDifference: null,
      calculationResult: {},
    };
  }

  const difference = billed - eligible;
  return {
    state: "evidence_backed",
    title: difference > BigInt(0) ? "Tariff rate-code variance" : "Tariff comparison did not show an excess charge",
    message: difference > BigInt(0)
      ? "The current official rate code and deterministic bill comparison support a review of the assigned schedule."
      : "The current official rate code and deterministic comparison did not show a higher charge under the assigned schedule.",
    missingDimensions: [],
    sourceId: input.officialSource.sourceId,
    rateCode: input.assignedRateCode,
    estimatedMonthlyDifference: money(difference > BigInt(0) ? difference : BigInt(0)),
    calculationResult: {
      billedUnderAssignedRate: money(billed),
      billedUnderEligibleRate: money(eligible),
      difference: money(difference),
      sourceId: input.officialSource.sourceId,
      rateCode: input.assignedRateCode,
    },
  };
}
