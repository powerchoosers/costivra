export type ReportScheduleInput = {
  cadence: "weekly" | "monthly";
  timezone: string;
  weekday?: number | null;
  dayOfMonth?: number | null;
  sendTimeLocal: string;
};

export function isValidTimeZone(timezone: string) {
  try { new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(); return true; }
  catch { return false; }
}

function parts(date: Date, timezone: string) {
  const values = new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(date);
  const get = (type: string) => Number(values.find((value) => value.type === type)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour") % 24, minute: get("minute") };
}

function localDateToUtc(year: number, month: number, day: number, hour: number, minute: number, timezone: string) {
  let guess = Date.UTC(year, month - 1, day, hour, minute);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const local = parts(new Date(guess), timezone);
    const representedAsUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
    const requestedAsUtc = Date.UTC(year, month - 1, day, hour, minute);
    guess += requestedAsUtc - representedAsUtc;
  }
  return new Date(guess);
}

export function nextReportRun(input: ReportScheduleInput, from = new Date()) {
  if (!isValidTimeZone(input.timezone)) throw new Error("Invalid report timezone.");
  const match = /^(\d{2}):(\d{2})$/.exec(input.sendTimeLocal);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) throw new Error("Invalid report send time.");
  const localNow = parts(from, input.timezone);
  let year = localNow.year; let month = localNow.month; let day = localNow.day;
  if (input.cadence === "monthly") {
    const target = Math.max(1, Math.min(28, input.dayOfMonth ?? 1));
    day = target;
    let candidate = localDateToUtc(year, month, day, Number(match[1]), Number(match[2]), input.timezone);
    if (candidate <= from) { month += 1; if (month > 12) { month = 1; year += 1; } candidate = localDateToUtc(year, month, day, Number(match[1]), Number(match[2]), input.timezone); }
    return candidate.toISOString();
  }
  const targetWeekday = Math.max(0, Math.min(6, input.weekday ?? 1));
  const localDate = new Date(Date.UTC(year, month - 1, day));
  const delta = (targetWeekday - localDate.getUTCDay() + 7) % 7;
  localDate.setUTCDate(localDate.getUTCDate() + delta);
  let candidate = localDateToUtc(localDate.getUTCFullYear(), localDate.getUTCMonth() + 1, localDate.getUTCDate(), Number(match[1]), Number(match[2]), input.timezone);
  if (candidate <= from) { localDate.setUTCDate(localDate.getUTCDate() + 7); candidate = localDateToUtc(localDate.getUTCFullYear(), localDate.getUTCMonth() + 1, localDate.getUTCDate(), Number(match[1]), Number(match[2]), input.timezone); }
  return candidate.toISOString();
}
