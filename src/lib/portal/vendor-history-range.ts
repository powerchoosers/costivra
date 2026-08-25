export type VendorHistoryPreset = "1m" | "3m" | "6m" | "12m" | "24m" | "all" | "custom";

export type VendorHistoryRange = {
  endDate: string | null;
  preset: VendorHistoryPreset;
  startDate: string | null;
};

export const vendorHistoryPresetOptions: ReadonlyArray<{
  description: string;
  label: string;
  months: number | null;
  preset: Exclude<VendorHistoryPreset, "custom">;
}> = [
  { preset: "1m", label: "Last month", description: "One month through the latest record", months: 1 },
  { preset: "3m", label: "Last 3 months", description: "Quarterly operating view", months: 3 },
  { preset: "6m", label: "Last 6 months", description: "Recent cost movement", months: 6 },
  { preset: "12m", label: "Last 12 months", description: "Full-year comparison window", months: 12 },
  { preset: "24m", label: "Last 2 years", description: "Longer-term vendor history", months: 24 },
  { preset: "all", label: "All history", description: "Every dated record", months: null },
];

function parseIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
    ? { day, month, year }
    : null;
}

function isoDate(year: number, monthIndex: number, day: number) {
  return `${String(year).padStart(4, "0")}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function subtractCalendarMonths(value: string, months: number) {
  const parsed = parseIsoDate(value);
  if (!parsed) return null;
  const targetIndex = parsed.year * 12 + (parsed.month - 1) - months;
  const year = Math.floor(targetIndex / 12);
  const monthIndex = ((targetIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return isoDate(year, monthIndex, Math.min(parsed.day, lastDay));
}

export function vendorHistoryPresetRange(
  preset: Exclude<VendorHistoryPreset, "custom">,
  latestRecordDate: string | null,
): VendorHistoryRange {
  const option = vendorHistoryPresetOptions.find((item) => item.preset === preset);
  if (!option || option.months == null || !latestRecordDate) {
    return { preset, startDate: null, endDate: latestRecordDate };
  }
  return {
    preset,
    startDate: subtractCalendarMonths(latestRecordDate, option.months),
    endDate: latestRecordDate,
  };
}

export function vendorHistoryRangeLabel(range: VendorHistoryRange) {
  if (range.preset === "custom") return "Custom range";
  return vendorHistoryPresetOptions.find((item) => item.preset === range.preset)?.label ?? "History range";
}

export function parseDateEntry(value: string) {
  const trimmed = value.trim();
  const iso = parseIsoDate(trimmed);
  if (iso) return isoDate(iso.year, iso.month - 1, iso.day);

  const match = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/.exec(trimmed);
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  const normalized = isoDate(year, month - 1, day);
  return parseIsoDate(normalized) ? normalized : null;
}

export function formatDateEntry(value: string | null) {
  const parsed = value ? parseIsoDate(value) : null;
  return parsed ? `${String(parsed.month).padStart(2, "0")}/${String(parsed.day).padStart(2, "0")}/${parsed.year}` : "";
}
