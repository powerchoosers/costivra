import process from "node:process";
import { getMalwareScannerConfig, scanFileForMalware } from "../src/lib/security/malware-scanner-core";

const EICAR_TEST_STRING = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

async function main() {
  const args = process.argv.slice(2);
  const isEicar = args.includes("--eicar");

  console.log("\n=======================================================");
  console.log(` Cloudmersive Virus Scanner Verification (${isEicar ? "EICAR INFECTED PROBE" : "CLEAN TEXT PROBE"})`);
  console.log("=======================================================\n");

  const config = getMalwareScannerConfig();

  if (config.provider !== "cloudmersive") {
    console.error("❌ CLOUDMERSIVE_API_KEY is not configured or ambiguous in this environment.");
    if (config.provider === "unavailable") {
      console.error(`Reason: ${config.detail}`);
    }
    process.exit(1);
  }

  console.log("Provider Config:");
  console.log(`  Provider:                 ${config.provider}`);
  console.log(`  Monthly Limit:            ${config.monthlyLimit} calls / month`);
  console.log(`  Monthly Reserve:          ${config.monthlyReserve} calls`);
  console.log(`  Min Interval:             ${config.minIntervalMs} ms`);
  console.log(`  Max File Size:            ${(config.maxFileBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Timeout:                  ${config.timeoutMs} ms`);
  console.log("-------------------------------------------------------\n");

  if (isEicar) {
    console.log("Sending official inert EICAR antivirus test file payload...");
    const buffer = Buffer.from(EICAR_TEST_STRING, "utf-8");
    const startTime = Date.now();
    const result = await scanFileForMalware({
      buffer,
      filename: "eicar-test-file.com",
      mimeType: "text/plain",
    });
    const duration = Date.now() - startTime;

    console.log(`Scan completed in ${duration}ms.`);
    console.log(`Result Status:             ${result.status}`);
    console.log(`Result Code:               ${result.code || "none"}`);
    console.log(`Signature:                 ${result.signature || "none"}`);

    if (result.status === "infected") {
      console.log("\n✅ PASS: Cloudmersive correctly identified and flagged the EICAR test virus payload.");
      process.exit(0);
    } else {
      console.error(`\n❌ FAIL: Expected status 'infected', but scanner returned '${result.status}'.`);
      process.exit(1);
    }
  } else {
    console.log("Sending clean synthetic document probe payload...");
    const buffer = Buffer.from("Costivra Clean Probe Document - " + new Date().toISOString(), "utf-8");
    const startTime = Date.now();
    const result = await scanFileForMalware({
      buffer,
      filename: "costivra-clean-probe.txt",
      mimeType: "text/plain",
    });
    const duration = Date.now() - startTime;

    console.log(`Scan completed in ${duration}ms.`);
    console.log(`Result Status:             ${result.status}`);
    console.log(`Result Code:               ${result.code || "none"}`);

    if (result.status === "clean") {
      console.log("\n✅ PASS: Cloudmersive successfully scanned the document and returned a clean result.");
      process.exit(0);
    } else {
      console.error(`\n❌ FAIL: Expected status 'clean', but scanner returned '${result.status}' (code: ${result.code}, detail: ${result.detail}).`);
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error("Unhandled error during Cloudmersive verification:", err);
  process.exit(1);
});
