import { describe, expect, it, vi } from "vitest";
import {
  computeScannerConfigFingerprint,
  getLatestValidScannerProof,
  recordScannerReleaseProof,
  resolveReleaseSha,
} from "./scanner-proof";
import type { MalwareScannerConfig } from "./malware-scanner-core";

describe("Malware Scanner Release Proof & Fingerprinting", () => {
  it("computes deterministic fingerprints for identical configurations", () => {
    const config1: MalwareScannerConfig = {
      provider: "cloudmersive",
      monthlyLimit: 800,
      monthlyReserve: 20,
      minIntervalMs: 1100,
      maxFileBytes: 3_500_000,
      timeoutMs: 30_000,
    };

    const config2: MalwareScannerConfig = {
      provider: "cloudmersive",
      monthlyLimit: 800,
      monthlyReserve: 20,
      minIntervalMs: 1100,
      maxFileBytes: 3_500_000,
      timeoutMs: 30_000,
    };

    const fp1 = computeScannerConfigFingerprint(config1);
    const fp2 = computeScannerConfigFingerprint(config2);

    expect(fp1).toHaveLength(64);
    expect(fp1).toBe(fp2);
  });

  it("produces distinct fingerprints when configuration differs", () => {
    const baseConfig: MalwareScannerConfig = {
      provider: "cloudmersive",
      monthlyLimit: 800,
      monthlyReserve: 20,
      minIntervalMs: 1100,
      maxFileBytes: 3_500_000,
      timeoutMs: 30_000,
    };

    const changedLimit: MalwareScannerConfig = {
      ...baseConfig,
      monthlyLimit: 1000,
    };

    const changedInterval: MalwareScannerConfig = {
      ...baseConfig,
      minIntervalMs: 2000,
    };

    const fpBase = computeScannerConfigFingerprint(baseConfig);
    const fpLimit = computeScannerConfigFingerprint(changedLimit);
    const fpInterval = computeScannerConfigFingerprint(changedInterval);

    expect(fpBase).not.toBe(fpLimit);
    expect(fpBase).not.toBe(fpInterval);
  });

  it("handles unavailable scanner config gracefully", () => {
    const unavailableConfig: MalwareScannerConfig = {
      provider: "unavailable",
      code: "not_configured",
      detail: "No scanner configured",
    };

    const fp = computeScannerConfigFingerprint(unavailableConfig);
    expect(fp).toHaveLength(64);
  });

  it("resolves release SHA from environment or git", () => {
    const prev = process.env.COSTIVRA_RELEASE_SHA;
    try {
      process.env.COSTIVRA_RELEASE_SHA = "test-release-sha-123456789";
      expect(resolveReleaseSha()).toBe("test-release-sha-123456789");
    } finally {
      if (prev !== undefined) {
        process.env.COSTIVRA_RELEASE_SHA = prev;
      } else {
        delete process.env.COSTIVRA_RELEASE_SHA;
      }
    }
  });

  it("evaluates valid unexpired proof in database", async () => {
    const mockDb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: "proof-1",
                      release_sha: "rel-123",
                      provider: "cloudmersive",
                      config_fingerprint: "fp-456",
                      clean_probe_status: "clean",
                      inert_probe_status: "infected",
                      clean_safe_code: null,
                      inert_safe_code: null,
                      proven_at: new Date(Date.now() - 10000).toISOString(),
                      expires_at: new Date(Date.now() + 86400000).toISOString(),
                      created_by: null,
                      created_at: new Date().toISOString(),
                      safe_metadata: { probe: true },
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    } as unknown as Parameters<typeof getLatestValidScannerProof>[0];

    const result = await getLatestValidScannerProof(mockDb, "rel-123", "fp-456");
    expect(result.valid).toBe(true);
    expect(result.proof?.id).toBe("proof-1");
  });

  it("rejects expired proof", async () => {
    const mockDb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: "proof-expired",
                      release_sha: "rel-123",
                      provider: "cloudmersive",
                      config_fingerprint: "fp-456",
                      clean_probe_status: "clean",
                      inert_probe_status: "infected",
                      clean_safe_code: null,
                      inert_safe_code: null,
                      proven_at: "2026-08-01T00:00:00Z",
                      expires_at: "2026-08-08T00:00:00Z",
                      created_by: null,
                      created_at: "2026-08-01T00:00:00Z",
                      safe_metadata: {},
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    } as unknown as Parameters<typeof getLatestValidScannerProof>[0];

    const result = await getLatestValidScannerProof(mockDb, "rel-123", "fp-456");
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("expired");
  });

  it("records new scanner proof with expiration", async () => {
    const singleMock = vi.fn().mockResolvedValue({
      data: {
        id: "proof-new",
        release_sha: "rel-new",
        provider: "cloudmersive",
        config_fingerprint: "fp-new",
        clean_probe_status: "clean",
        inert_probe_status: "infected",
        clean_safe_code: null,
        inert_safe_code: null,
        proven_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        created_by: null,
        created_at: new Date().toISOString(),
        safe_metadata: { durationMs: 120 },
      },
      error: null,
    });

    const mockDb = {
      from: vi.fn().mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: singleMock,
          }),
        }),
      }),
    } as unknown as Parameters<typeof recordScannerReleaseProof>[0];

    const recorded = await recordScannerReleaseProof(mockDb, {
      releaseSha: "rel-new",
      provider: "cloudmersive",
      configFingerprint: "fp-new",
      cleanProbeStatus: "clean",
      inertProbeStatus: "infected",
      safeMetadata: { durationMs: 120 },
    });

    expect(recorded.id).toBe("proof-new");
    expect(recorded.releaseSha).toBe("rel-new");
    expect(recorded.cleanProbeStatus).toBe("clean");
    expect(recorded.inertProbeStatus).toBe("infected");
  });
});
