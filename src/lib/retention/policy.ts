export type RetentionPolicy = {
  enforce: boolean;
  quarantineDays: number;
  originalDays: number | null;
  batchSize: number;
};

function positiveInteger(value: string | undefined, fallback: number | null, maximum: number) {
  if (!value?.trim()) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) return fallback;
  return parsed;
}

export function retentionPolicyFromEnvironment(): RetentionPolicy {
  return {
    enforce: process.env.RETENTION_ENFORCEMENT_ENABLED === "1",
    quarantineDays: positiveInteger(
      process.env.RETENTION_QUARANTINE_DAYS,
      30,
      365,
    ) as number,
    originalDays: positiveInteger(
      process.env.RETENTION_ORIGINAL_DAYS,
      null,
      3650,
    ),
    batchSize: positiveInteger(
      process.env.RETENTION_BATCH_SIZE,
      100,
      500,
    ) as number,
  };
}

export function retentionCutoff(days: number, now: Date) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}
