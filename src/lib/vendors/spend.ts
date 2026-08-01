export type BillingCadence = "monthly" | "annual";

export function parseMoneyToCents(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).trim().replaceAll(",", "").replace(/^\$/, "");
  if (!/^\d+(?:\.\d{0,2})?$/.test(normalized)) return null;
  const [dollars, fractional = ""] = normalized.split(".");
  const cents = Number(dollars) * 100 + Number(fractional.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents >= 0 ? cents : null;
}

export function annualizeSpendCents(amountCents: number, cadence: BillingCadence): number {
  if (!Number.isSafeInteger(amountCents) || amountCents < 0) throw new Error("INVALID_SPEND_AMOUNT");
  return cadence === "monthly" ? amountCents * 12 : amountCents;
}

export function formatMoneyInput(value: string): string {
  const cents = parseMoneyToCents(value || "0");
  if (cents == null) return value;
  return (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
