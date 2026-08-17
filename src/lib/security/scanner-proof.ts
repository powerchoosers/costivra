import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getMalwareScannerConfig, type MalwareScannerConfig } from "@/lib/security/malware-scanner-core";

export type MalwareScannerReleaseProof = {
  id: string;
  releaseSha: string;
  provider: string;
  configFingerprint: string;
  cleanProbeStatus: "clean" | "infected" | "error";
  inertProbeStatus: "clean" | "infected" | "error";
  cleanSafeCode: string | null;
  inertSafeCode: string | null;
  provenAt: string;
  expiresAt: string;
  createdBy: string | null;
  createdAt: string;
  safeMetadata: Record<string, unknown>;
};

export const PROOF_EXPIRATION_DAYS = 7;

export function computeScannerConfigFingerprint(config?: MalwareScannerConfig): string {
  const currentConfig = config ?? getMalwareScannerConfig();
  if (currentConfig.provider === "unavailable") {
    return createHash("sha256")
      .update(JSON.stringify({ provider: "unavailable", code: currentConfig.code }))
      .digest("hex");
  }
  if (currentConfig.provider === "cloudmersive") {
    return createHash("sha256")
      .update(
        JSON.stringify({
          provider: "cloudmersive",
          monthlyLimit: currentConfig.monthlyLimit,
          monthlyReserve: currentConfig.monthlyReserve,
          minIntervalMs: currentConfig.minIntervalMs,
          maxFileBytes: currentConfig.maxFileBytes,
          timeoutMs: currentConfig.timeoutMs,
          schemaVersion: "2026.08.1",
        }),
      )
      .digest("hex");
  }
  return createHash("sha256")
    .update(
      JSON.stringify({
        provider: "generic",
        endpoint: currentConfig.endpoint,
        timeoutMs: currentConfig.timeoutMs,
        schemaVersion: "2026.08.1",
      }),
    )
    .digest("hex");
}

export function resolveReleaseSha(): string {
  const envSha =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    process.env.COSTIVRA_RELEASE_SHA ||
    process.env.GIT_COMMIT_SHA;
  if (envSha && envSha.trim()) {
    return envSha.trim();
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { execSync } = require("node:child_process");
    const localSha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
    if (localSha) return localSha;
  } catch {}
  return "development";
}

export async function getLatestValidScannerProof(
  db: SupabaseClient,
  releaseSha?: string,
  configFingerprint?: string,
): Promise<{
  valid: boolean;
  proof: MalwareScannerReleaseProof | null;
  reason?: string;
}> {
  const targetSha = releaseSha || resolveReleaseSha();
  const targetFingerprint = configFingerprint || computeScannerConfigFingerprint();

  try {
    const { data, error } = await db
      .from("malware_scanner_release_proofs")
      .select(
        "id, release_sha, provider, config_fingerprint, clean_probe_status, inert_probe_status, clean_safe_code, inert_safe_code, proven_at, expires_at, created_by, created_at, safe_metadata",
      )
      .eq("release_sha", targetSha)
      .eq("config_fingerprint", targetFingerprint)
      .order("proven_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return {
        valid: false,
        proof: null,
        reason: "Scanner proof database check failed.",
      };
    }

    if (!data) {
      return {
        valid: false,
        proof: null,
        reason: "No release proof recorded for the current release and scanner configuration.",
      };
    }

    const proof: MalwareScannerReleaseProof = {
      id: data.id,
      releaseSha: data.release_sha,
      provider: data.provider,
      configFingerprint: data.config_fingerprint,
      cleanProbeStatus: data.clean_probe_status,
      inertProbeStatus: data.inert_probe_status,
      cleanSafeCode: data.clean_safe_code,
      inertSafeCode: data.inert_safe_code,
      provenAt: data.proven_at,
      expiresAt: data.expires_at,
      createdBy: data.created_by,
      createdAt: data.created_at,
      safeMetadata: (data.safe_metadata as Record<string, unknown>) || {},
    };

    const isBothProbesPassed =
      proof.cleanProbeStatus === "clean" && proof.inertProbeStatus === "infected";
    if (!isBothProbesPassed) {
      return {
        valid: false,
        proof,
        reason: "The latest scanner proof did not verify both clean and inert probes successfully.",
      };
    }

    const expiresAtTime = Date.parse(proof.expiresAt);
    if (Number.isFinite(expiresAtTime) && expiresAtTime <= Date.now()) {
      return {
        valid: false,
        proof,
        reason: `Scanner release proof expired at ${proof.expiresAt}.`,
      };
    }

    return {
      valid: true,
      proof,
    };
  } catch (caught: unknown) {
    return {
      valid: false,
      proof: null,
      reason: caught instanceof Error ? caught.message : "Scanner proof check failed.",
    };
  }
}

export async function recordScannerReleaseProof(
  db: SupabaseClient,
  proof: {
    releaseSha: string;
    provider: string;
    configFingerprint: string;
    cleanProbeStatus: "clean" | "infected" | "error";
    inertProbeStatus: "clean" | "infected" | "error";
    cleanSafeCode?: string | null;
    inertSafeCode?: string | null;
    createdBy?: string | null;
    safeMetadata?: Record<string, unknown>;
    expirationDays?: number;
  },
): Promise<MalwareScannerReleaseProof> {
  const provenAt = new Date().toISOString();
  const expiresAt = new Date(
    Date.now() + (proof.expirationDays ?? PROOF_EXPIRATION_DAYS) * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await db
    .from("malware_scanner_release_proofs")
    .upsert(
      {
        release_sha: proof.releaseSha,
        provider: proof.provider,
        config_fingerprint: proof.configFingerprint,
        clean_probe_status: proof.cleanProbeStatus,
        inert_probe_status: proof.inertProbeStatus,
        clean_safe_code: proof.cleanSafeCode ?? null,
        inert_safe_code: proof.inertSafeCode ?? null,
        proven_at: provenAt,
        expires_at: expiresAt,
        created_by: proof.createdBy ?? null,
        safe_metadata: proof.safeMetadata ?? {},
      },
      {
        onConflict: "release_sha,provider,config_fingerprint",
      },
    )
    .select(
      "id, release_sha, provider, config_fingerprint, clean_probe_status, inert_probe_status, clean_safe_code, inert_safe_code, proven_at, expires_at, created_by, created_at, safe_metadata",
    )
    .single();

  if (error || !data) {
    throw new Error(`Failed to record malware scanner release proof: ${error?.message}`);
  }

  return {
    id: data.id,
    releaseSha: data.release_sha,
    provider: data.provider,
    configFingerprint: data.config_fingerprint,
    cleanProbeStatus: data.clean_probe_status,
    inertProbeStatus: data.inert_probe_status,
    cleanSafeCode: data.clean_safe_code,
    inertSafeCode: data.inert_safe_code,
    provenAt: data.proven_at,
    expiresAt: data.expires_at,
    createdBy: data.created_by,
    createdAt: data.created_at,
    safeMetadata: (data.safe_metadata as Record<string, unknown>) || {},
  };
}
