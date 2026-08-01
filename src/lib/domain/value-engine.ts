export const EXPENSE_CHANGE_RULE_VERSION = "expense-change-v1";
export const SAVINGS_METHOD_VERSION = "annualized-period-comparison-v1";

type ExpensePeriod = {
  id: string;
  amount: string;
  currency: string;
  category: string;
  periodStart: string;
  periodEnd: string;
};

export type ExpenseChangeFinding = {
  ruleKey: "software_price_increase" | "telecom_price_increase" | "energy_cost_variance";
  type: "price_increase" | "energy_review";
  title: string;
  summary: string;
  priority: "high" | "medium";
  confidence: string;
  estimatedAnnualValue: string | null;
  calculationInputs: Record<string, string>;
  calculationResult: Record<string, string>;
  assumptions: string[];
};

export type SavingsCalculation = {
  amount: string;
  calculationInputs: Record<string, string>;
  calculationResult: Record<string, string>;
  assumptions: string[];
};

const moneyPattern = /^\d{1,16}(?:\.\d{1,2})?$/;

function cents(value: string): bigint {
  const normalized = value.trim().replaceAll(",", "");
  if (!moneyPattern.test(normalized)) throw new Error("INVALID_MONEY");
  const [whole, fraction = ""] = normalized.split(".");
  return BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
}

function money(value: bigint): string {
  const negative = value < BigInt(0);
  const absolute = negative ? -value : value;
  const rendered = `${absolute / BigInt(100)}.${String(absolute % BigInt(100)).padStart(2, "0")}`;
  return negative ? `-${rendered}` : rendered;
}

function roundDivide(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= BigInt(0)) throw new Error("INVALID_PERIOD");
  const negative = numerator < BigInt(0);
  const absolute = negative ? -numerator : numerator;
  const rounded = (absolute + denominator / BigInt(2)) / denominator;
  return negative ? -rounded : rounded;
}

export function inclusivePeriodDays(start: string, end: string): number {
  const startAt = Date.parse(`${start}T00:00:00Z`);
  const endAt = Date.parse(`${end}T00:00:00Z`);
  if (!Number.isFinite(startAt) || !Number.isFinite(endAt) || endAt < startAt) {
    throw new Error("INVALID_PERIOD");
  }
  return Math.floor((endAt - startAt) / 86_400_000) + 1;
}

function annualizedDelta(current: ExpensePeriod, prior: ExpensePeriod): bigint {
  const currentDays = BigInt(inclusivePeriodDays(current.periodStart, current.periodEnd));
  const priorDays = BigInt(inclusivePeriodDays(prior.periodStart, prior.periodEnd));
  return roundDivide(
    (cents(current.amount) * priorDays - cents(prior.amount) * currentDays) * BigInt(365),
    currentDays * priorDays,
  );
}

function changeBasisPoints(current: ExpensePeriod, prior: ExpensePeriod): bigint {
  const currentDays = BigInt(inclusivePeriodDays(current.periodStart, current.periodEnd));
  const priorDays = BigInt(inclusivePeriodDays(prior.periodStart, prior.periodEnd));
  const priorRateNumerator = cents(prior.amount) * currentDays;
  if (priorRateNumerator <= BigInt(0)) throw new Error("INVALID_BASELINE");
  const deltaNumerator = cents(current.amount) * priorDays - priorRateNumerator;
  return roundDivide(deltaNumerator * BigInt(10_000), priorRateNumerator);
}

function categoryRule(category: string) {
  const normalized = category.toLowerCase();
  if (normalized.includes("software") || normalized.includes("saas")) {
    return { ruleKey: "software_price_increase" as const, type: "price_increase" as const, thresholdBps: BigInt(1_000), label: "Software" };
  }
  if (normalized.includes("telecom") || normalized.includes("internet")) {
    return { ruleKey: "telecom_price_increase" as const, type: "price_increase" as const, thresholdBps: BigInt(1_000), label: "Telecom" };
  }
  if (normalized.includes("energy") || normalized.includes("electric") || normalized.includes("natural gas")) {
    return { ruleKey: "energy_cost_variance" as const, type: "energy_review" as const, thresholdBps: BigInt(1_500), label: "Energy" };
  }
  return null;
}

export function evaluateExpenseChange(current: ExpensePeriod, prior: ExpensePeriod): ExpenseChangeFinding | null {
  if (current.currency !== prior.currency || current.category.toLowerCase() !== prior.category.toLowerCase()) return null;
  const currentDays = inclusivePeriodDays(current.periodStart, current.periodEnd);
  const priorDays = inclusivePeriodDays(prior.periodStart, prior.periodEnd);
  if (currentDays > 400 || priorDays > 400 || Date.parse(current.periodStart) <= Date.parse(prior.periodStart)) return null;
  const rule = categoryRule(current.category);
  if (!rule) return null;

  const basisPoints = changeBasisPoints(current, prior);
  if (basisPoints < rule.thresholdBps) return null;
  const annualDelta = annualizedDelta(current, prior);
  if (annualDelta <= BigInt(0)) return null;
  const percentage = `${basisPoints / BigInt(100)}.${String(basisPoints % BigInt(100)).padStart(2, "0")}`;
  const inputs = {
    currentExpenseId: current.id,
    priorExpenseId: prior.id,
    currentAmount: current.amount,
    priorAmount: prior.amount,
    currentPeriodDays: String(currentDays),
    priorPeriodDays: String(priorDays),
    currency: current.currency,
  };
  const result = { increasePercent: percentage, annualizedIncrease: money(annualDelta) };

  if (rule.type === "energy_review") {
    return {
      ruleKey: rule.ruleKey,
      type: rule.type,
      title: "Energy cost increase requires review",
      summary: `The normalized cost increased ${percentage}% from the prior period. Usage, weather, taxes, and rate changes must be reviewed before assigning a savings value.`,
      priority: basisPoints >= BigInt(2_500) ? "high" : "medium",
      confidence: "0.90",
      estimatedAnnualValue: null,
      calculationInputs: inputs,
      calculationResult: result,
      assumptions: ["The two invoices belong to the same expense account.", "No savings value is assigned without usage and rate evidence."],
    };
  }

  return {
    ruleKey: rule.ruleKey,
    type: rule.type,
    title: `${rule.label} cost increased ${percentage}%`,
    summary: `The current period's normalized daily cost is ${percentage}% higher than the prior comparable period.`,
    priority: basisPoints >= BigInt(2_000) ? "high" : "medium",
    confidence: "0.95",
    estimatedAnnualValue: money(annualDelta),
    calculationInputs: inputs,
    calculationResult: result,
    assumptions: ["The two invoices belong to the same expense account.", "Service scope and usage are assumed comparable until a reviewer confirms otherwise."],
  };
}

export function calculateVerifiedAnnualSavings(baseline: ExpensePeriod, comparison: ExpensePeriod): SavingsCalculation | null {
  if (baseline.currency !== comparison.currency || baseline.category.toLowerCase() !== comparison.category.toLowerCase()) return null;
  if (Date.parse(comparison.periodStart) <= Date.parse(baseline.periodStart)) return null;
  if (categoryRule(baseline.category)?.type === "energy_review") return null;
  const baselineDays = inclusivePeriodDays(baseline.periodStart, baseline.periodEnd);
  const comparisonDays = inclusivePeriodDays(comparison.periodStart, comparison.periodEnd);
  const annualSavings = -annualizedDelta(comparison, baseline);
  if (annualSavings <= BigInt(0)) return null;
  return {
    amount: money(annualSavings),
    calculationInputs: {
      baselineExpenseId: baseline.id,
      comparisonExpenseId: comparison.id,
      baselineAmount: baseline.amount,
      comparisonAmount: comparison.amount,
      baselinePeriodDays: String(baselineDays),
      comparisonPeriodDays: String(comparisonDays),
      currency: baseline.currency,
    },
    calculationResult: { annualizedRecurringSavings: money(annualSavings) },
    assumptions: ["The service scope is materially unchanged.", "The comparison period is representative of the post-action recurring cost."],
  };
}
