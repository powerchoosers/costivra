import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createServerSupabaseClient } from "../src/lib/supabase/server";
import {
  getMalwareScannerConfig,
  scanFileForMalware,
} from "../src/lib/security/malware-scanner-core";
import {
  computeScannerConfigFingerprint,
  getLatestValidScannerProof,
  recordScannerReleaseProof,
  resolveReleaseSha,
} from "../src/lib/security/scanner-proof";

const EICAR_TEST_STRING =
  "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

const CLEAN_TEST_STRING =
  "Costivra malware-scanner release proof verification. Harmless text file for release verification.";

async function sleep(ms: number): Promise<void> {
  return new Promise((resolveTimeout) => setTimeout(resolveTimeout, ms));
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const jsonOutput = args.includes("--json");

  console.log("🔒 Costivra Malware Scanner Release Proof Runner");
  console.log("================================================");

  const db = createServerSupabaseClient();
  const config = getMalwareScannerConfig();

  if (config.provider === "unavailable") {
    console.error(`❌ Scanner is unavailable: ${config.code} - ${config.detail}`);
    process.exit(1);
  }

  const releaseSha = resolveReleaseSha();
  const fingerprint = computeScannerConfigFingerprint(config);

  console.log(`- Provider: ${config.provider}`);
  console.log(`- Release SHA: ${releaseSha}`);
  console.log(`- Config Fingerprint: ${fingerprint}`);

  if (!force) {
    const existingProof = await getLatestValidScannerProof(db, releaseSha, fingerprint);
    if (existingProof.valid && existingProof.proof) {
      console.log(`\n✅ Valid scanner proof already exists for this release:`);
      console.log(`  - Proof ID: ${existingProof.proof.id}`);
      console.log(`  - Proven At: ${existingProof.proof.provenAt}`);
      console.log(`  - Expires At: ${existingProof.proof.expiresAt}`);
      console.log(`\nUse --force to re-run probes if necessary.`);
      process.exit(0);
    }
  }

  console.log("\n1. Executing clean harmless probe...");
  const cleanStart = Date.now();
  const cleanResult = await scanFileForMalware({
    buffer: Buffer.from(CLEAN_TEST_STRING, "utf8"),
    filename: "costivra-proof-clean.txt",
    mimeType: "text/plain",
  });
  const cleanDurationMs = Date.now() - cleanStart;

  console.log(`   Result: ${cleanResult.status} (code: ${cleanResult.code ?? "none"}, ${cleanDurationMs}ms)`);
  if (cleanResult.status !== "clean") {
    console.error(`❌ Clean probe failed. Expected 'clean', got '${cleanResult.status}'.`);
    process.exit(1);
  }

  const waitInterval = config.provider === "cloudmersive" ? config.minIntervalMs + 300 : 1000;
  console.log(`\n2. Waiting ${waitInterval}ms for rate safety...`);
  await sleep(waitInterval);

  console.log("3. Executing inert EICAR probe...");
  const inertStart = Date.now();
  const inertResult = await scanFileForMalware({
    buffer: Buffer.from(EICAR_TEST_STRING, "utf8"),
    filename: "costivra-proof-eicar.txt",
    mimeType: "text/plain",
  });
  const inertDurationMs = Date.now() - inertStart;

  console.log(`   Result: ${inertResult.status} (code: ${inertResult.code ?? "none"}, ${inertDurationMs}ms)`);
  if (inertResult.status !== "infected") {
    console.error(`❌ Inert probe failed. Expected 'infected', got '${inertResult.status}'.`);
    process.exit(1);
  }

  console.log("\n4. Recording durable proof in Supabase...");
  const proofRecord = await recordScannerReleaseProof(db, {
    releaseSha,
    provider: config.provider,
    configFingerprint: fingerprint,
    cleanProbeStatus: cleanResult.status,
    inertProbeStatus: inertResult.status,
    cleanSafeCode: cleanResult.code ?? null,
    inertSafeCode: inertResult.code ?? null,
    safeMetadata: {
      cleanDurationMs,
      inertDurationMs,
      provenAtUtc: new Date().toISOString(),
    },
  });

  console.log(`   Recorded proof ID: ${proofRecord.id}`);
  console.log(`   Expires At: ${proofRecord.expiresAt}`);

  // Write sanitized artifact
  const artifactDir = resolve(process.cwd(), "artifacts/scanner-proof");
  await mkdir(artifactDir, { recursive: true });

  const shortSha = releaseSha.slice(0, 12);
  const jsonPath = resolve(artifactDir, `proof-${shortSha}.json`);
  const mdPath = resolve(artifactDir, `proof-${shortSha}.md`);

  const artifactData = {
    schemaVersion: "costivra-pilot-scanner-proof-v1",
    id: proofRecord.id,
    releaseSha,
    provider: config.provider,
    configFingerprint: fingerprint,
    cleanProbeStatus: proofRecord.cleanProbeStatus,
    inertProbeStatus: proofRecord.inertProbeStatus,
    provenAt: proofRecord.provenAt,
    expiresAt: proofRecord.expiresAt,
    safeMetadata: proofRecord.safeMetadata,
  };

  await writeFile(jsonPath, JSON.stringify(artifactData, null, 2), "utf8");

  const markdownSummary = `# Malware Scanner Release Proof

- **Release SHA**: \`${releaseSha}\`
- **Provider**: \`${config.provider}\`
- **Config Fingerprint**: \`${fingerprint}\`
- **Proof ID**: \`${proofRecord.id}\`
- **Clean Probe**: \`${proofRecord.cleanProbeStatus}\` (${cleanDurationMs}ms)
- **Inert Probe**: \`${proofRecord.inertProbeStatus}\` (${inertDurationMs}ms)
- **Proven At**: ${proofRecord.provenAt}
- **Expires At**: ${proofRecord.expiresAt}
- **Verdict**: PASS
`;

  await writeFile(mdPath, markdownSummary, "utf8");

  console.log(`\n📄 Saved sanitized proof artifacts:`);
  console.log(`  - ${jsonPath}`);
  console.log(`  - ${mdPath}`);
  console.log("\n✨ Scanner release proof verified successfully.");

  if (jsonOutput) {
    console.log(JSON.stringify(artifactData));
  }
}

main().catch((error) => {
  console.error("❌ Scanner proof failed with error:", error instanceof Error ? error.message : error);
  process.exit(1);
});
