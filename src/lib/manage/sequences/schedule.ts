import type { SequenceDelayUnit } from "./types";

export type SequenceSchedule = {
  timezone: string;
  businessDays: readonly number[];
  sendStartLocal: string;
  sendEndLocal: string;
};

type LocalParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

export function isValidSequenceTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

export function resolveRecipientTimezone(
  recipientTimezone: string | null | undefined,
  sequenceTimezone: string,
) {
  if (recipientTimezone && isValidSequenceTimezone(recipientTimezone)) {
    return recipientTimezone;
  }
  if (isValidSequenceTimezone(sequenceTimezone)) return sequenceTimezone;
  throw new Error("INVALID_SEQUENCE_TIMEZONE");
}

function localParts(date: Date, timezone: string): LocalParts {
  const values = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(values.find((value) => value.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") % 24,
    minute: get("minute"),
  };
}

function localDateToUtc(
  local: LocalParts,
  timezone: string,
) {
  let guess = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const represented = localParts(new Date(guess), timezone);
    const representedAsUtc = Date.UTC(represented.year, represented.month - 1, represented.day, represented.hour, represented.minute);
    const requestedAsUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
    guess += requestedAsUtc - representedAsUtc;
  }
  return new Date(guess);
}

function parseLocalTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error("INVALID_SEQUENCE_SEND_WINDOW");
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) throw new Error("INVALID_SEQUENCE_SEND_WINDOW");
  return { hour, minute };
}

function localWeekday(local: LocalParts) {
  return new Date(Date.UTC(local.year, local.month - 1, local.day)).getUTCDay();
}

function addLocalDays(date: Date, days: number, timezone: string) {
  const local = localParts(date, timezone);
  const calendar = new Date(Date.UTC(local.year, local.month - 1, local.day));
  calendar.setUTCDate(calendar.getUTCDate() + days);
  return localDateToUtc({
    year: calendar.getUTCFullYear(),
    month: calendar.getUTCMonth() + 1,
    day: calendar.getUTCDate(),
    hour: local.hour,
    minute: local.minute,
  }, timezone);
}

function normalizedBusinessDays(days: readonly number[]) {
  const normalized = Array.from(new Set(days.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)));
  if (!normalized.length) throw new Error("INVALID_SEQUENCE_BUSINESS_DAYS");
  return normalized;
}

function validateSchedule(schedule: SequenceSchedule) {
  if (!isValidSequenceTimezone(schedule.timezone)) throw new Error("INVALID_SEQUENCE_TIMEZONE");
  const start = parseLocalTime(schedule.sendStartLocal);
  const end = parseLocalTime(schedule.sendEndLocal);
  if ((start.hour * 60) + start.minute >= (end.hour * 60) + end.minute) {
    throw new Error("INVALID_SEQUENCE_SEND_WINDOW");
  }
  return { start, end, businessDays: normalizedBusinessDays(schedule.businessDays) };
}

export function addSequenceDelay(
  from: Date,
  value: number,
  unit: SequenceDelayUnit,
  timezone: string,
  businessDays: readonly number[] = [1, 2, 3, 4, 5],
) {
  if (!Number.isFinite(value) || value < 0) throw new Error("INVALID_SEQUENCE_DELAY");
  if (!isValidSequenceTimezone(timezone)) throw new Error("INVALID_SEQUENCE_TIMEZONE");
  if (unit === "minutes") return new Date(from.getTime() + value * 60_000);
  if (unit === "hours") return new Date(from.getTime() + value * 3_600_000);
  if (unit === "calendar_days") return addLocalDays(from, Math.floor(value), timezone);
  if (unit !== "business_days") throw new Error("INVALID_SEQUENCE_DELAY_UNIT");

  const allowed = normalizedBusinessDays(businessDays);
  let result = from;
  let remaining = Math.floor(value);
  while (remaining > 0) {
    result = addLocalDays(result, 1, timezone);
    if (allowed.includes(localWeekday(localParts(result, timezone)))) remaining -= 1;
  }
  return result;
}

/** Move a due instant to the next permitted local send time. */
export function moveIntoSequenceSendWindow(date: Date, schedule: SequenceSchedule) {
  const { start, end, businessDays } = validateSchedule(schedule);
  let result = date;
  for (let attempt = 0; attempt < 370; attempt += 1) {
    const local = localParts(result, schedule.timezone);
    const weekday = localWeekday(local);
    const minutes = local.hour * 60 + local.minute;
    const startMinutes = start.hour * 60 + start.minute;
    const endMinutes = end.hour * 60 + end.minute;
    if (!businessDays.includes(weekday)) {
      result = addLocalDays(result, 1, schedule.timezone);
      continue;
    }
    if (minutes < startMinutes) {
      return localDateToUtc({ ...local, hour: start.hour, minute: start.minute }, schedule.timezone);
    }
    if (minutes >= endMinutes) {
      const next = addLocalDays(result, 1, schedule.timezone);
      const nextLocal = localParts(next, schedule.timezone);
      result = localDateToUtc({ ...nextLocal, hour: start.hour, minute: start.minute }, schedule.timezone);
      continue;
    }
    return result;
  }
  throw new Error("SEQUENCE_SEND_WINDOW_NOT_FOUND");
}

export function nextSequenceActionAt(input: {
  completedAt: Date;
  delayValue: number;
  delayUnit: SequenceDelayUnit;
  schedule: SequenceSchedule;
  recipientTimezone?: string | null;
}) {
  const timezone = resolveRecipientTimezone(input.recipientTimezone, input.schedule.timezone);
  const schedule = { ...input.schedule, timezone };
  const delayed = addSequenceDelay(
    input.completedAt,
    input.delayValue,
    input.delayUnit,
    timezone,
    schedule.businessDays,
  );
  return moveIntoSequenceSendWindow(delayed, schedule).toISOString();
}
