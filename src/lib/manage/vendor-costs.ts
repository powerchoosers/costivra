import type { ManageExpense } from "@/lib/manage/types";

export type SpendInterval = "weekly" | "monthly" | "yearly";

export type SpendBucket = {
  key: string;
  label: string;
  total: number;
  recordCount: number;
};

const intervalLimit: Record<SpendInterval, number> = {
  weekly: 8,
  monthly: 12,
  yearly: 5,
};

function dateFromExpense(expense: ManageExpense) {
  const source = expense.periodEnd || expense.periodStart;
  if (!source) return null;

  const parsed = new Date(`${source.slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function mondayOf(date: Date) {
  const monday = new Date(date);
  const day = monday.getUTCDay();
  monday.setUTCDate(monday.getUTCDate() - (day === 0 ? 6 : day - 1));
  return monday;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function bucketFor(date: Date, interval: SpendInterval) {
  if (interval === "weekly") {
    const start = mondayOf(date);
    return {
      key: isoDate(start),
      label: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(start),
    };
  }
  if (interval === "monthly") {
    return {
      key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
      label: new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit", timeZone: "UTC" }).format(date),
    };
  }
  return { key: String(date.getUTCFullYear()), label: String(date.getUTCFullYear()) };
}

/** Groups recorded expense records for visual reporting. It intentionally excludes
 * different currencies rather than presenting an invalid combined money total. */
export function groupRecordedSpend(
  expenses: ManageExpense[],
  interval: SpendInterval,
  currency: string,
) {
  const buckets = new Map<string, SpendBucket>();

  for (const expense of expenses) {
    if (expense.currency !== currency) continue;
    const expenseDate = dateFromExpense(expense);
    if (!expenseDate) continue;
    const { key, label } = bucketFor(expenseDate, interval);
    const existing = buckets.get(key);
    buckets.set(key, {
      key,
      label,
      total: (existing?.total ?? 0) + expense.amount,
      recordCount: (existing?.recordCount ?? 0) + 1,
    });
  }

  return [...buckets.values()].sort((left, right) => left.key.localeCompare(right.key)).slice(-intervalLimit[interval]);
}

/** Returns only spend recorded in the account's display currency. Mixing money
 * values from different currencies would present a financially invalid total. */
export function recordedSpendTotal(expenses: ManageExpense[], currency: string) {
  return expenses.reduce(
    (total, expense) => expense.currency === currency ? total + expense.amount : total,
    0,
  );
}
