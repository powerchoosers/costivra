import type { EnergyService } from "@/lib/domain/energy-service";

export type InvoiceChargeSummary = {
  sourceKey: string;
  label: string;
  amount: string;
  servicePeriodStart: string | null;
  servicePeriodEnd: string | null;
};

export type InvoiceLineCandidate = {
  sourceKey?: string | null;
  description: string;
  quantity: string | null;
  /** Source-visible unit only; never infer a unit from the description. */
  unit?: string | null;
  unitPrice: string | null;
  /** Source-visible tax rate, expressed as a decimal percentage when shown. */
  taxRate?: string | null;
  amount: string;
  category: string | null;
  servicePeriodStart: string | null;
  servicePeriodEnd: string | null;
};

/**
 * Cross-category service facts that do not belong in the generic money/line
 * item fields. Values are source-backed candidates and may remain null when a
 * bill does not show them. Arrays retain distinct identifiers instead of
 * collapsing several phone lines, circuits, subscriptions, or resources.
 */
export type InvoiceServiceDetails = {
  planName: string | null;
  productFamily: string | null;
  serviceAddresses: string[];
  serviceIdentifiers: string[];
  phoneNumbers: string[];
  circuitIds: string[];
  subscriptionIdentifiers: string[];
  resourceIdentifiers: string[];
  cloudAccountIdentifiers: string[];
  region: string | null;
  bandwidthQuantity: string | null;
  bandwidthUnit: string | null;
  lineCount: number | null;
  deviceCount: number | null;
  seatCount: number | null;
  usageQuantity: string | null;
  usageUnit: string | null;
  includedUsageQuantity: string | null;
  includedUsageUnit: string | null;
  commitmentType: string | null;
  commitmentTermMonths: number | null;
};

export type InvoiceCandidate = {
  invoiceNumber: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  servicePeriodStart: string | null;
  servicePeriodEnd: string | null;
  accountNumberLast4: string | null;
  purchaseOrderNumber: string | null;
  subtotal: string | null;
  taxTotal: string | null;
  feeTotal: string | null;
  creditTotal: string | null;
  previousBalance: string | null;
  paymentsAndCredits: string | null;
  balanceForward: string | null;
  currentCharges: string | null;
  currentPeriodCredits: string | null;
  totalAmount: string | null;
  amountDue: string | null;
  energyService: EnergyService | null;
  /**
   * Some commercial bills contain one row per meter/service point. Keep the
   * legacy singular field for compatibility, but use this array for new
   * extraction and persistence paths.
   */
  energyServices?: EnergyService[];
  /** Source-labelled subtotals such as recurring, usage, delivery, or taxes. */
  chargeSummaries?: InvoiceChargeSummary[];
  /** Typed service facts for telecom, wireless, SaaS, cloud, and similar bills. */
  serviceDetails?: InvoiceServiceDetails | null;
  lineItems: InvoiceLineCandidate[];
};

export type InvoiceReconciliation = {
  status: "reconciled" | "mismatch" | "incomplete";
  difference: string | null;
  checks: Array<{
    name:
      | "line_items_to_subtotal"
      | "line_items_to_current_charges"
      | "components_to_total"
      | "balance_forward_plus_current_charges_to_amount_due"
      | "previous_balance_minus_payments_to_balance_forward";
    status: "passed" | "failed";
    difference: string;
  }>;
};

const moneyPattern = /^-?\d{1,16}(?:\.\d{1,2})?$/;
const decimalPattern = /^-?\d{1,16}(?:\.\d{1,6})?$/;

const nonSubtotalLinePattern = /\b(?:tax(?:es)?|vat|gst|hst|pst|sales tax|use tax|fee|fees|surcharge|recovery|assessment|fusf|usf|e[- ]?911|regulatory|gross receipts|discount|credit|credits|adjustment|previous balance|balance forward|payment|amount due|total current|current charges)\b/i;

function isSubtotalExcludedLine(line: InvoiceLineCandidate): boolean {
  return nonSubtotalLinePattern.test(`${line.category ?? ""} ${line.description}`);
}

function subtotalLineItems(lineItems: InvoiceLineCandidate[]): InvoiceLineCandidate[] | null {
  const chargeLines = lineItems.filter((line) => !isSubtotalExcludedLine(line));
  // If every row is a tax/fee/summary row, there is no safe subtotal check.
  return chargeLines.length > 0 ? chargeLines : null;
}

export function normalizeMoney(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replaceAll(",", "");
  if (!moneyPattern.test(normalized)) return null;
  const negative = normalized.startsWith("-");
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [whole, fraction = ""] = unsigned.split(".");
  const result = `${whole}.${fraction.padEnd(2, "0")}`;
  return negative ? `-${result}` : result;
}

export function normalizeDecimal(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replaceAll(",", "");
  return decimalPattern.test(normalized) ? normalized : null;
}

function toMinorUnits(value: string): bigint {
  const normalized = normalizeMoney(value);
  if (normalized === null) throw new Error(`Invalid money value: ${value}`);
  const negative = normalized.startsWith("-");
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [whole, fraction] = unsigned.split(".");
  const cents = BigInt(whole) * BigInt(100) + BigInt(fraction);
  return negative ? -cents : cents;
}

function fromMinorUnits(value: bigint): string {
  const negative = value < BigInt(0);
  const absolute = negative ? -value : value;
  const result = `${absolute / BigInt(100)}.${String(absolute % BigInt(100)).padStart(2, "0")}`;
  return negative ? `-${result}` : result;
}

export function reconcileInvoice(candidate: InvoiceCandidate): InvoiceReconciliation {
  const checks: InvoiceReconciliation["checks"] = [];

  if (candidate.lineItems.length > 0 && candidate.subtotal !== null) {
    const chargeLines = subtotalLineItems(candidate.lineItems);
    const lineTotal = chargeLines?.reduce(
      (sum, line) => sum + toMinorUnits(line.amount),
      BigInt(0),
    );
    if (lineTotal !== undefined) {
      const difference = lineTotal - toMinorUnits(candidate.subtotal);
      checks.push({
        name: "line_items_to_subtotal",
        status: difference === BigInt(0) ? "passed" : "failed",
        difference: fromMinorUnits(difference),
      });
    }
  }

  if (candidate.lineItems.length > 0 && candidate.currentCharges !== null) {
    const lineTotal = candidate.lineItems.reduce(
      (sum, line) => sum + toMinorUnits(line.amount),
      BigInt(0),
    );
    const difference = lineTotal - toMinorUnits(candidate.currentCharges);
    checks.push({
      name: "line_items_to_current_charges",
      status: difference === BigInt(0) ? "passed" : "failed",
      difference: fromMinorUnits(difference),
    });
  }

  if (
    candidate.subtotal !== null &&
    candidate.taxTotal !== null &&
    candidate.feeTotal !== null &&
    candidate.creditTotal !== null &&
    candidate.totalAmount !== null
  ) {
    const expected =
      toMinorUnits(candidate.subtotal) +
      toMinorUnits(candidate.taxTotal) +
      toMinorUnits(candidate.feeTotal) -
      toMinorUnits(candidate.creditTotal);
    const difference = expected - toMinorUnits(candidate.totalAmount);
    checks.push({
      name: "components_to_total",
      status: difference === BigInt(0) ? "passed" : "failed",
      difference: fromMinorUnits(difference),
    });
  }

  if (candidate.balanceForward !== null && candidate.currentCharges !== null && candidate.amountDue !== null) {
    const difference =
      toMinorUnits(candidate.balanceForward) +
      toMinorUnits(candidate.currentCharges) -
      toMinorUnits(candidate.amountDue);
    checks.push({
      name: "balance_forward_plus_current_charges_to_amount_due",
      status: difference === BigInt(0) ? "passed" : "failed",
      difference: fromMinorUnits(difference),
    });
  }

  if (candidate.previousBalance !== null && candidate.paymentsAndCredits !== null && candidate.balanceForward !== null) {
    const difference =
      toMinorUnits(candidate.previousBalance) -
      toMinorUnits(candidate.paymentsAndCredits) -
      toMinorUnits(candidate.balanceForward);
    checks.push({
      name: "previous_balance_minus_payments_to_balance_forward",
      status: difference === BigInt(0) ? "passed" : "failed",
      difference: fromMinorUnits(difference),
    });
  }

  if (!checks.length) return { status: "incomplete", difference: null, checks };
  const failed = checks.find((check) => check.status === "failed");
  return {
    status: failed ? "mismatch" : "reconciled",
    difference: failed?.difference ?? "0.00",
    checks,
  };
}

export function normalizeVendorName(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(incorporated|inc|limited|ltd|llc|corporation|corp|company|co)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function findExactVendorMatches(
  candidateName: string,
  vendors: Array<{ relationshipId: string; canonicalName: string; aliases: string[] }>,
): string[] {
  const candidate = normalizeVendorName(candidateName);
  if (!candidate) return [];
  return vendors
    .filter((vendor) =>
      [vendor.canonicalName, ...vendor.aliases].some(
        (name) => normalizeVendorName(name) === candidate,
      ),
    )
    .map((vendor) => vendor.relationshipId);
}
