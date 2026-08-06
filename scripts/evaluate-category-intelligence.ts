import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import {
  runCategoryEvaluationSuite,
  type CategoryEvaluationSuite,
} from "@/lib/category-intelligence/eval/runner";

const suites = new Set<CategoryEvaluationSuite>([
  "categories",
  "line_items",
  "benchmarks",
  "market_research",
]);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function persist(report: Awaited<ReturnType<typeof runCategoryEvaluationSuite>>) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) throw new Error("--persist requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.");
  const client = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.from("category_evaluation_runs").insert({
    suite: report.suite,
    suite_version: report.suiteVersion,
    runner_revision: process.env.GITHUB_SHA ?? "local",
    data_classification: report.dataClassification,
    coverage_level: report.coverageLevel,
    case_count: report.caseCount,
    passed: report.passed,
    metrics: report.metrics,
    thresholds: report.thresholds,
    pack_versions: report.packVersions,
    source_registry_hash: report.sourceRegistryHash,
  });
  if (error) throw error;
}

async function main() {
  const suite = process.argv[2] as CategoryEvaluationSuite | undefined;
  if (!suite || !suites.has(suite)) {
    throw new Error("Usage: tsx scripts/evaluate-category-intelligence.ts <categories|line_items|benchmarks|market_research> [--persist]");
  }
  const report = await runCategoryEvaluationSuite(suite);
  const outDir = path.join(process.cwd(), "artifacts", "category-intelligence-evaluation");
  await mkdir(outDir, { recursive: true });
  const reportPath = path.join(outDir, `${timestamp()}-${suite}.json`);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  if (process.argv.includes("--persist")) await persist(report);
  console.log(`Report: ${path.relative(process.cwd(), reportPath)}`);
  console.log(`Result: ${report.passed ? "PASS" : "FAIL"}`);
  for (const [name, value] of Object.entries(report.metrics)) console.log(`  ${name}: ${value}`);
  for (const failure of report.failures) console.log(`  FAIL: ${failure}`);
  if (!report.passed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
