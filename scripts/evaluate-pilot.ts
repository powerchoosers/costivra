import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseGoldenInvoiceManifest } from "@/lib/ai/invoice-evaluation";

const minimumCoverage = { software: 20, telecom_internet: 20, utility: 20, scanned: 10, adversarial: 10 } as const;

function resolveInsidePrivate(candidate: string) {
  const workspace = path.resolve(process.cwd());
  const privateRoot = path.join(workspace, "private-evaluation");
  const resolved = path.resolve(workspace, candidate);
  const relative = path.relative(privateRoot, resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Pilot evaluation files must remain inside private-evaluation/: ${candidate}`);
  }
  return resolved;
}

function loadManifest(manifestPath: string) {
  const manifest = parseGoldenInvoiceManifest(JSON.parse(readFileSync(manifestPath, "utf8")) as unknown);
  const counts = {
    software: manifest.cases.filter((item) => item.segment === "software").length,
    telecom_internet: manifest.cases.filter((item) => item.segment === "telecom_internet").length,
    utility: manifest.cases.filter((item) => item.segment === "utility").length,
    scanned: manifest.cases.filter((item) => item.scanned).length,
    adversarial: manifest.cases.filter((item) => item.dataClassification === "adversarial").length,
  };
  if (manifest.cases.some((item) => item.dataClassification === "synthetic_smoke")) {
    throw new Error("Pilot evaluation refuses synthetic_smoke cases. Use eval:invoices for the committed smoke fixture.");
  }
  for (const [key, minimum] of Object.entries(minimumCoverage) as Array<[keyof typeof minimumCoverage, number]>) {
    if (counts[key] < minimum) throw new Error(`Pilot coverage ${key}=${counts[key]} is below the required minimum ${minimum}.`);
  }
  for (const item of manifest.cases) resolveInsidePrivate(path.join(path.dirname(path.relative(process.cwd(), manifestPath)), item.file));
  return { manifest, counts };
}

function main() {
  const args = process.argv.slice(2);
  const index = args.indexOf("--manifest");
  const candidate = index >= 0 ? args[index + 1] : undefined;
  if (!candidate || candidate.startsWith("--")) throw new Error("Usage: npm run eval:pilot -- --manifest private-evaluation/manifests/<approved>.json");
  const manifestPath = resolveInsidePrivate(candidate);
  if (!existsSync(manifestPath)) {
    throw new Error(`Approved private manifest not found: ${candidate}. Supply the authorized de-identified or consented corpus before running the real pilot evaluation.`);
  }
  const { counts } = loadManifest(manifestPath);
  const reports = path.join(process.cwd(), "private-evaluation", "reports");
  mkdirSync(reports, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(reports, `${stamp}-pilot-report.json`);
  const predictionsPath = path.join(reports, `${stamp}-pilot-predictions.json`);
  try {
    execFileSync(process.platform === "win32" ? "npx.cmd" : "npx", ["tsx", "--env-file-if-exists=.env.local", "scripts/evaluate-invoice-extraction.ts", "--manifest", manifestPath, "--report", reportPath, "--predictions-out", predictionsPath], { stdio: "inherit", cwd: process.cwd(), windowsHide: true, shell: process.platform === "win32", timeout: 1_800_000 });
  } catch {
    // The JSON report, when produced, is still useful evidence; the wrapper exits below.
    process.exitCode = 1;
  }
  const markdownPath = reportPath.replace(/\.json$/, ".md");
  const report = JSON.parse(readFileSync(reportPath, "utf8")) as { passed: boolean; metrics: Record<string, number>; failedGates: string[] };
  writeFileSync(markdownPath, [
    "# Pilot invoice evaluation report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Classification counts: ${JSON.stringify(counts)}`,
    "",
    `Result: **${report.passed ? "PASS" : "FAIL"}**`,
    "",
    "| Metric | Value |",
    "|---|---:|",
    ...Object.entries(report.metrics).map(([name, value]) => `| ${name} | ${(value * 100).toFixed(2)}% |`),
    "",
    ...(report.failedGates.length ? ["Failed gates:", ...report.failedGates.map((failure) => `- ${failure}`)] : ["No failed gates."]),
    "",
  ].join("\n"), "utf8");
  if (!report.passed) process.exitCode = 1;
}

main();
