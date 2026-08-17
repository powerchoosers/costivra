import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

type GateStatus = "passed" | "failed" | "skipped";
type Gate = { name: string; status: GateStatus; detail?: string };
type SourceState = { commitSha: string; workingTree: string[] };

const gates = [
  { name: "typecheck", command: "npx", args: ["tsc", "--noEmit"] },
  { name: "lint", command: "npx", args: ["eslint", "."] },
  { name: "dependency-audit-production", command: "npm", args: ["audit", "--omit=dev"] },
  { name: "dependency-audit-all", command: "npm", args: ["audit"] },
  { name: "secret-scan", command: "npx", args: ["tsx", "scripts/secret-scan.ts"] },
  { name: "private-evaluation-staging", command: "npx", args: ["tsx", "scripts/check-private-evaluation-staged.ts"] },
  { name: "unit", command: "npx", args: ["vitest", "run"] },
  {
    name: "invoice-evaluation-smoke",
    command: "npx",
    args: [
      "tsx",
      "--env-file-if-exists=.env.local",
      "scripts/evaluate-invoice-extraction.ts",
      "--manifest",
      "tests/fixtures/invoices/golden-manifest.smoke.json",
      "--predictions",
      "tests/fixtures/invoices/golden-predictions.smoke.json",
    ],
  },
  { name: "integration", command: "npx", args: ["vitest", "run", "--config", "vitest.integration.config.mts"] },
  { name: "build", command: "npx", args: ["next", "build"] },
  { name: "full-playwright", command: "npx", args: ["playwright", "test"] },
] as const;

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function outputPaths() {
  const directory = path.join(process.cwd(), "artifacts", "release");
  mkdirSync(directory, { recursive: true });
  const stamp = timestamp();
  return {
    json: path.join(directory, `${stamp}-gates.json`),
    markdown: path.join(directory, `${stamp}-verdict.md`),
    rootReport: path.join(process.cwd(), "PILOT_RELEASE_REPORT.md"),
  };
}

function sourceState(): SourceState {
  const gitCommand = process.platform === "win32" ? "git.exe" : "git";
  const runGit = (args: string[]) => {
    const res = spawnSync(gitCommand, args, {
      cwd: process.cwd(),
      encoding: "utf8",
      shell: false,
    });
    return (res.stdout || "").trim();
  };
  try {
    return {
      commitSha: runGit(["rev-parse", "HEAD"]) || "local",
      workingTree: (runGit(["status", "--porcelain=v1", "--untracked-files=all"]) || "").split(/\r?\n/).filter(Boolean),
    };
  } catch {
    return {
      commitSha: "uncommitted-local",
      workingTree: [],
    };
  }
}

function readResultFile(file: string, expectedCommitSha: string): Gate[] {
  const parsed = JSON.parse(readFileSync(path.resolve(process.cwd(), file), "utf8")) as {
    commitSha?: string;
    gates?: Gate[];
  };
  if (parsed.commitSha !== expectedCommitSha) {
    throw new Error(
      `Release result commit ${parsed.commitSha ?? "<missing>"} does not match HEAD ${expectedCommitSha}.`,
    );
  }
  if (!Array.isArray(parsed.gates)) throw new Error("Release result file must contain a gates array.");
  return parsed.gates.map((gate) => {
    if (
      !gate ||
      typeof gate.name !== "string" ||
      !["passed", "failed", "skipped"].includes(gate.status)
    ) {
      throw new Error("Release result file contains an invalid gate.");
    }
    return gate;
  });
}

function runLocalGates(): Gate[] {
  return gates.map((gate) => {
    console.log(`\n▶ Running release gate: ${gate.name}...`);
    const bin = process.platform === "win32" ? `${gate.command}.cmd` : gate.command;
    const res = spawnSync(bin, gate.args, {
      cwd: process.cwd(),
      stdio: "inherit",
      shell: process.platform === "win32",
      windowsHide: true,
      timeout: 300_000,
    });

    if (res.status === 0) {
      console.log(`  ✅ ${gate.name} passed.`);
      return { name: gate.name, status: "passed" as const };
    }

    console.error(`  ❌ ${gate.name} failed (exit ${res.status}): ${res.error?.message ?? ""}`);
    return {
      name: gate.name,
      status: "failed" as const,
      detail: res.error?.message ?? `exit ${res.status ?? "unknown"}`,
    };
  });
}

function main() {
  const initialSource = sourceState();
  if (initialSource.workingTree.length > 0) {
    throw new Error("Release verification requires a clean tracked working tree at start.");
  }
  const args = process.argv.slice(2);
  const resultsIndex = args.indexOf("--results");
  const resultPath = resultsIndex >= 0 ? args[resultsIndex + 1] : undefined;
  if (resultsIndex >= 0 && !resultPath) throw new Error("--results requires a JSON path.");
  const result = resultPath ? readResultFile(resultPath, initialSource.commitSha) : runLocalGates();
  const allGates = [...result];
  const endingSource = sourceState();
  if (endingSource.commitSha !== initialSource.commitSha || endingSource.workingTree.length > 0) {
    allGates.push({
      name: "source-control-stability",
      status: "failed",
      detail: "HEAD or tracked working-tree state changed during verification.",
    });
  } else {
    allGates.push({ name: "source-control-stability", status: "passed" });
  }
  const output = outputPaths();
  const passed = allGates.length > 0 && allGates.every((gate) => gate.status === "passed");

  const report = {
    schemaVersion: "costivra-release-verdict-v1",
    generatedAt: new Date().toISOString(),
    commitSha: initialSource.commitSha,
    workingTree: initialSource.workingTree,
    productionDeploymentAloneIsNotEvidence: true,
    passed,
    gates: allGates,
  };

  writeFileSync(output.json, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const reportContent = [
    "# Costivra Pilot Engineering Release Report",
    "",
    `**Generated:** ${report.generatedAt}`,
    `**Verdict:** **${passed ? "ENGINEERING_READY_FOR_SUPERVISED_DESIGN_PARTNER_PILOT" : "BLOCKED"}**`,
    `**Commit SHA:** \`${report.commitSha}\``,
    "",
    "## 1. Release Quality Gates",
    "",
    "| Gate | Status | Detail |",
    "|---|---|---|",
    ...allGates.map((gate) => `| **${gate.name}** | \`${gate.status.toUpperCase()}\` | ${gate.detail ?? "Verified clean"} |`),
    "",
    "## 2. Evidence boundary",
    "",
    "This local report only summarizes the gates executed by this process. It does not certify production deployment, scanner proof, migration parity, public status, human alert delivery, real-corpus evaluation, or authenticated production behavior.",
    "",
    "## 3. Security & Operational boundary",
    "",
    "- The repository's tenant isolation, secret scanning, financial calculation, malware scanning, and email-capture behavior must be established by their named gates or protected production evidence; this report does not infer those facts from source inspection.",
    "",
    "---",
    `*Generated by Costivra Release Verification Engine at ${report.generatedAt}*`,
    "",
  ].join("\n");

  writeFileSync(output.markdown, reportContent, "utf8");
  writeFileSync(output.rootReport, "# Costivra release evidence\n\nAuthoritative release certificates are generated only as protected GitHub workflow artifacts. This file is not release proof.\n\nThe strongest permitted final verdict is `ENGINEERING_READY_FOR_SUPERVISED_DESIGN_PARTNER_PILOT`; missing, skipped, stale, or SHA-mismatched evidence is `BLOCKED`.\n", "utf8");

  console.log("\n=======================================================");
  console.log(`Costivra Release Verdict: ${passed ? "ENGINEERING_READY_FOR_SUPERVISED_DESIGN_PARTNER_PILOT" : "BLOCKED"}`);
  console.log(`Commit: ${report.commitSha}`);
  for (const gate of allGates) {
    console.log(`  [${gate.status.toUpperCase()}] ${gate.name}${gate.detail ? ` (${gate.detail})` : ""}`);
  }
  console.log(`\nSaved Reports:`);
  console.log(`  - ${path.relative(process.cwd(), output.json)}`);
  console.log(`  - ${path.relative(process.cwd(), output.markdown)}`);
  console.log(`  - ${path.relative(process.cwd(), output.rootReport)}`);

  if (!passed) process.exitCode = 1;
}

main();
