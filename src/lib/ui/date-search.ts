const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
] as const;

const MONTH_LOOKUP = new Map<string, number>(
  MONTHS.flatMap((month, index) => [
    [month, index + 1],
    [month.slice(0, 3), index + 1],
  ]),
);

export type SearchDateQuery = {
  exactDates: Set<string>;
  monthDays: Set<string>;
};

function validDateKey(year: number, month: number, day: number) {
  const value = new Date(Date.UTC(year, month - 1, day));
  if (value.getUTCFullYear() !== year || value.getUTCMonth() !== month - 1 || value.getUTCDate() !== day) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseSearchDateQuery(query: string): SearchDateQuery {
  const exactDates = new Set<string>();
  const monthDays = new Set<string>();
  const normalized = query.toLowerCase();

  for (const match of normalized.matchAll(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g)) {
    const key = validDateKey(Number(match[1]), Number(match[2]), Number(match[3]));
    if (key) exactDates.add(key);
  }

  for (const match of normalized.matchAll(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{2}|\d{4})\b/g)) {
    const rawYear = Number(match[3]);
    const year = rawYear < 100 ? 2000 + rawYear : rawYear;
    const key = validDateKey(year, Number(match[1]), Number(match[2]));
    if (key) exactDates.add(key);
  }

  const monthPattern = MONTHS.map((month) => `${month}|${month.slice(0, 3)}`).join("|");
  const namedDate = new RegExp(`\\b(${monthPattern})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`, "g");
  for (const match of normalized.matchAll(namedDate)) {
    const month = MONTH_LOOKUP.get(match[1]);
    const day = Number(match[2]);
    if (!month || day < 1 || day > 31) continue;
    if (match[3]) {
      const key = validDateKey(Number(match[3]), month, day);
      if (key) exactDates.add(key);
    } else {
      monthDays.add(`${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    }
  }

  return { exactDates, monthDays };
}

export function searchDateMatches(value: string | null | undefined, query: SearchDateQuery) {
  if (!value) return false;
  const dateKey = value.slice(0, 10);
  return query.exactDates.has(dateKey) || query.monthDays.has(dateKey.slice(5));
}
