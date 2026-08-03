import { afterEach, describe, expect, it, vi } from "vitest";
import {
  retentionCutoff,
  retentionPolicyFromEnvironment,
} from "@/lib/retention/policy";

describe("retention policy", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("defaults to report-only and never assumes an original-file window", () => {
    const policy = retentionPolicyFromEnvironment();
    expect(policy).toEqual({
      enforce: false,
      quarantineDays: 30,
      originalDays: null,
      batchSize: 100,
    });
  });

  it("accepts bounded explicit settings and rejects dangerous values", () => {
    vi.stubEnv("RETENTION_ENFORCEMENT_ENABLED", "1");
    vi.stubEnv("RETENTION_QUARANTINE_DAYS", "14");
    vi.stubEnv("RETENTION_ORIGINAL_DAYS", "2555");
    vi.stubEnv("RETENTION_BATCH_SIZE", "250");
    expect(retentionPolicyFromEnvironment()).toEqual({
      enforce: true,
      quarantineDays: 14,
      originalDays: 2555,
      batchSize: 250,
    });

    vi.stubEnv("RETENTION_QUARANTINE_DAYS", "0");
    vi.stubEnv("RETENTION_ORIGINAL_DAYS", "999999");
    vi.stubEnv("RETENTION_BATCH_SIZE", "10000");
    expect(retentionPolicyFromEnvironment()).toEqual({
      enforce: true,
      quarantineDays: 30,
      originalDays: null,
      batchSize: 100,
    });
  });

  it("calculates UTC cutoffs deterministically", () => {
    expect(retentionCutoff(30, new Date("2026-08-03T00:00:00.000Z")))
      .toBe("2026-07-04T00:00:00.000Z");
  });
});
