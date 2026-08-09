import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type GateStatus = "passed" | "failed" | "skipped";
type Gate = { name: string; status: GateStatus; detail?: string };

const gates = [
  { name: "typecheck", command: "npm", args: ["run", "typecheck"] },
  { name: "lint", command: "npm", args: ["run", "lint"] },
  { name: "dependency-audit-production", command: "npm", args: ["audit", "--omit=dev"] },
  { name: "dependency-audit-all", command: "npm", args: ["audit"] },
  { name: "unit", command: "npm", args: ["test"] },
  {
    name: "invoice-evaluation-smoke",
    command: "npm",
    args: [
      "run",
      "eval:invoices",
      "--",
      "--manifest",
      "tests/fixtures/invoices/golden-manifest.smoke.json",
      "--predictions",
      "tests/fixtures/invoices/golden-predictions.smoke.json",
    ],
  },
  { name: "integration", command: "npm", args: ["run", "test:integration"] },
  { name: "build", command: "npm", args: ["run", "build"] },
  { name: "secret-scan", command: "npm", args: ["run", "security:secrets"] },
  { name: "browser-e2e", command: "npm", args: ["run", "test:e2e"] },
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
  };
}

function readResultFile(file: string): Gate[] {
  const parsed = JSON.parse(readFileSync(path.resolve(process.cwd(), file), "utf8")) as { gates?: Gate[] };
  if (!Array.isArray(parsed.gates)) throw new Error("Release result file must contain a gates array.");
  return parsed.gates.map((gate) => {
    if (!gate || typeof gate.name !== "string" || !["passed", "failed", "skipped"].includes(gate.status)) {
      throw new Error("Release result file contains an invalid gate.");
    }
    return gate;
  });
}

function runLocalGates(): Gate[] {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  return gates.map((gate) => {
    try {
      execFileSync(gate.command === "npm" ? npmCommand : gate.command, gate.args, {
        cwd: process.cwd(),
        stdio: "pipe",
        encoding: "utf8",
        windowsHide: true,
        shell: process.platform === "win32",
        timeout: gate.name === "browser-e2e" ? 300_000 : 240_000,
      });
      return { name: gate.name, status: "passed" as const };
    } catch (error) {
      const detail = error && typeof error === "object" && "status" in error
        ? `exit ${String(error.status)}`
        : "command failed";
      return { name: gate.name, status: "failed" as const, detail };
    }
  });
}

function main() {
  const args = process.argv.slice(2);
  const resultsIndex = args.indexOf("--results");
  const resultPath = resultsIndex >= 0 ? args[resultsIndex + 1] : undefined;
  if (resultsIndex >= 0 && !resultPath) throw new Error("--results requires a JSON path.");
  const result = resultPath ? readResultFile(resultPath) : runLocalGates();
  const output = outputPaths();
  const passed = result.length > 0 && result.every((gate) => gate.status === "passed");
  const report = {
    schemaVersion: "costivra-release-verdict-v1",
    generatedAt: new Date().toISOString(),
    productionDeploymentAloneIsNotEvidence: true,
    passed,
    gates: result,
  };
  writeFileSync(output.json, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(
    output.markdown,
    [
      "# Costivra release verdict",
      "",
      `Generated: ${report.generatedAt}`,
      "",
      `Verdict: **${passed ? "PASS" : "FAIL"}**`,
      "",
      "A successful hosting deployment is not treated as release evidence by this report.",
      "",
      "| Gate | Status | Detail |",
      "|---|---|---|",
      ...result.map((gate) => `| ${gate.name} | ${gate.status} | ${gate.detail ?? ""} |`),
      "",
    ].join("\n"),
    "utf8",
  );
  console.log(`Release verdict: ${passed ? "PASS" : "FAIL"}`);
  for (const gate of result) console.log(`  [${gate.status.toUpperCase()}] ${gate.name}${gate.detail ? ` (${gate.detail})` : ""}`);
  console.log(`JSON: ${path.relative(process.cwd(), output.json)}`);
  console.log(`Markdown: ${path.relative(process.cwd(), output.markdown)}`);
  if (!passed) process.exitCode = 1;
}

main();
