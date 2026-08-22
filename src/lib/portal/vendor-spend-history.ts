import type { PortalExpense, PortalInvoice } from "@/lib/portal/types";

export type VendorSpendHistoryPoint = {
  amount: number;
  currency: string;
  date: string;
  dateSource: "invoice_date" | "service_period" | "expense_period";
  id: string;
  label: string;
  href: string;
  source: "invoice" | "expense";
};

export type VendorSpendHistory = {
  excludedCurrencyCount: number;
  missingDateCount: number;
  missingAmountCount: number;
  points: VendorSpendHistoryPoint[];
  source: "invoice" | "expense" | "none";
};

type BuildOptions = {
  currency: string;
  limit?: number | null;
};

function validDate(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const [year, month, day] = normalized.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(parsed.getTime())
    || parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== month - 1
    || parsed.getUTCDate() !== day
    ? null
    : normalized;
}

function validAmount(value: number | null | undefined) {
  return value != null && Number.isFinite(value) ? value : null;
}

function invoicePoint(invoice: PortalInvoice, currency: string): VendorSpendHistoryPoint | "currency" | "date" | "amount" | null {
  const invoiceCurrency = (invoice.currency || currency).trim().toUpperCase();
  if (invoiceCurrency !== currency) return "currency";

  const dateCandidates: Array<["invoice_date" | "service_period", string | null]> = [
    ["invoice_date", invoice.invoiceDate],
    ["service_period", invoice.servicePeriodEnd],
    ["service_period", invoice.servicePeriodStart],
  ];
  const datedCandidate = dateCandidates
    .map(([source, value]) => ({ source, date: validDate(value) }))
    .find((candidate): candidate is { source: "invoice_date" | "service_period"; date: string } => Boolean(candidate.date));
  if (!datedCandidate) return "date";

  // Current charges are preferred because amount due can include a carried
  // balance. Fall back to the invoice total when current charges were not
  // extracted; neither value represents a confirmed settlement event.
  const amount = validAmount(invoice.currentCharges ?? invoice.totalAmount);
  if (amount == null) return "amount";

  return {
    amount,
    currency,
    date: datedCandidate.date,
    dateSource: datedCandidate.source,
    id: invoice.id,
    label: invoice.invoiceNumber ? `Invoice ${invoice.invoiceNumber}` : "Invoice",
    href: `/app/bills/${invoice.id}`,
    source: "invoice",
  };
}

function expensePoint(expense: PortalExpense, currency: string): VendorSpendHistoryPoint | null {
  const date = validDate(expense.periodEnd ?? expense.periodStart);
  const amount = validAmount(expense.amount);
  if (!date || amount == null) return null;

  return {
    amount,
    currency,
    date,
    dateSource: "expense_period",
    id: expense.id,
    label: `${expense.category || "Recorded expense"}`,
    href: `/app/expenses/${expense.id}`,
    source: "expense",
  };
}

/**
 * Builds a chronological, tenant-scoped vendor history without combining
 * currencies. Invoice records are authoritative for this view when usable;
 * normalized expenses are a clearly labeled fallback for vendors that do not
 * yet have dated invoice records.
 */
export function buildVendorSpendHistory(
  invoices: readonly PortalInvoice[],
  expenses: readonly PortalExpense[],
  { currency, limit = 12 }: BuildOptions,
): VendorSpendHistory {
  const normalizedCurrency = currency.trim().toUpperCase();
  let excludedCurrencyCount = 0;
  let missingDateCount = 0;
  let missingAmountCount = 0;
  const invoicePoints: VendorSpendHistoryPoint[] = [];

  for (const invoice of invoices) {
    const point = invoicePoint(invoice, normalizedCurrency);
    if (point === "currency") excludedCurrencyCount += 1;
    else if (point === "date") missingDateCount += 1;
    else if (point === "amount") missingAmountCount += 1;
    else if (point) invoicePoints.push(point);
  }

  const sortPoints = (points: VendorSpendHistoryPoint[]) => points
    .sort((left, right) => left.date.localeCompare(right.date) || left.id.localeCompare(right.id));
  const limited = (points: VendorSpendHistoryPoint[]) => limit == null ? points : points.slice(-Math.max(1, limit));

  if (invoicePoints.length) {
    return {
      excludedCurrencyCount,
      missingDateCount,
      missingAmountCount,
      points: limited(sortPoints(invoicePoints)),
      source: "invoice",
    };
  }

  const expensePoints = expenses.map((expense) => expensePoint(expense, normalizedCurrency)).filter((point): point is VendorSpendHistoryPoint => Boolean(point));
  return {
    excludedCurrencyCount,
    missingDateCount: missingDateCount + expenses.filter((expense) => !validDate(expense.periodEnd ?? expense.periodStart)).length,
    missingAmountCount: missingAmountCount + expenses.filter((expense) => validDate(expense.periodEnd ?? expense.periodStart) && validAmount(expense.amount) == null).length,
    points: limited(sortPoints(expensePoints)),
    source: expensePoints.length ? "expense" : "none",
  };
}
