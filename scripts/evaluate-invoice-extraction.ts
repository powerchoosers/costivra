import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  analyzeDocument,
  analyzeScannedPdf,
} from "@/lib/ai/document-intelligence";
import {
  evaluateGoldenInvoices,
  GOLDEN_PREDICTION_SCHEMA_VERSION,
  parseGoldenInvoiceManifest,
  parseGoldenPredictionSet,
  type GoldenPrediction,
  type GoldenPredictionSet,
} from "@/lib/ai/invoice-evaluation";
import { extractDocumentText } from "@/lib/documents/text-extraction";
import { getConfiguredEnv } from "../src/lib/env/secrets";

type Options = {
  manifestPath: string;
  predictionsPath?: string;
  reportPath?: string;
  predictionsOutPath?: string;
  validateOnly: boolean;
};

function usage() {
  return `Usage:
  npm run eval:invoices -- --manifest <golden-manifest.json>
  npm run eval:invoices -- --manifest <golden-manifest.json> --predictions <saved-predictions.json>

Options:
  --report <path>           JSON report path (default: artifacts/invoice-evaluation/<timestamp>-report.json)
  --predictions-out <path>  Live prediction path (default: next to the report)
  --validate-only           Validate the manifest and source files without calling the AI provider`;
}

function parseArgs(argv: string[]): Options {
  let manifestPath = "";
  let predictionsPath: string | undefined;
  let reportPath: string | undefined;
  let predictionsOutPath: string | undefined;
  let validateOnly = false;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--validate-only") {
      validateOnly = true;
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${argument}.\n\n${usage()}`);
    }
    if (argument === "--manifest") manifestPath = value;
    else if (argument === "--predictions") predictionsPath = value;
    else if (argument === "--report") reportPath = value;
    else if (argument === "--predictions-out") predictionsOutPath = value;
    else throw new Error(`Unknown option: ${argument}.\n\n${usage()}`);
    index += 1;
  }
  if (!manifestPath) throw new Error(`--manifest is required.\n\n${usage()}`);
  if (validateOnly && predictionsPath) {
    throw new Error("--validate-only cannot be combined with --predictions.");
  }
  return {
    manifestPath,
    predictionsPath,
    reportPath,
    predictionsOutPath,
    validateOnly,
  };
}

function resolveWorkspacePath(candidate: string, base = process.cwd()) {
  const workspace = path.resolve(process.cwd());
  const resolved = path.resolve(base, candidate);
  const relative = path.relative(workspace, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path must remain inside the Costivra workspace: ${candidate}`);
  }
  return resolved;
}

async function loadJson(filePath: string) {
  const text = await readFile(filePath, "utf8");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`${path.relative(process.cwd(), filePath)} is not valid JSON.`);
  }
}

function timestampForFile() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function percent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const manifestPath = resolveWorkspacePath(options.manifestPath);
  const manifest = parseGoldenInvoiceManifest(await loadJson(manifestPath));
  const manifestDirectory = path.dirname(manifestPath);
  const sourceTextByCaseId = new Map<string, string>();
  const buffers = new Map<string, Buffer>();

  for (const caseData of manifest.cases) {
    const filePath = resolveWorkspacePath(caseData.file, manifestDirectory);
    const buffer = await readFile(filePath);
    const extracted = await extractDocumentText(buffer, caseData.mimeType);
    buffers.set(caseData.id, buffer);
    sourceTextByCaseId.set(caseData.id, extracted.text);
  }

  const coverage = {
    software: manifest.cases.filter((item) => item.segment === "software").length,
    telecomInternet: manifest.cases.filter(
      (item) => item.segment === "telecom_internet",
    ).length,
    scanned: manifest.cases.filter((item) => item.scanned).length,
  };

  if (options.validateOnly) {
    console.log(`Validated ${manifest.cases.length} golden cases.`);
    console.log(
      `Coverage: software ${coverage.software}/${manifest.coverageRequirements.software}, ` +
        `telecom/internet ${coverage.telecomInternet}/${manifest.coverageRequirements.telecomInternet}, ` +
        `scanned ${coverage.scanned}/${manifest.coverageRequirements.scanned}.`,
    );
    return;
  }

  if (!options.predictionsPath) {
    const openRouterKey =
      getConfiguredEnv("OPEN_ROUTER_API_KEY") ?? getConfiguredEnv("OPENROUTER_API_KEY") ?? "";
    if (!openRouterKey.startsWith("sk-or-") || openRouterKey.length < 20) {
      throw new Error(
        "Live evaluation needs a real OPEN_ROUTER_API_KEY in .env.local. The current value is missing or a placeholder. Use --predictions to replay a saved run without calling the provider.",
      );
    }
  }

  let predictions: GoldenPrediction[];
  let predictionSet: GoldenPredictionSet | null = null;
  if (options.predictionsPath) {
    const predictionPath = resolveWorkspacePath(options.predictionsPath);
    predictionSet = parseGoldenPredictionSet(await loadJson(predictionPath));
    predictions = predictionSet.cases;
  } else {
    predictions = [];
    for (const [index, caseData] of manifest.cases.entries()) {
      const buffer = buffers.get(caseData.id);
      if (!buffer) throw new Error(`Missing loaded buffer for ${caseData.id}.`);
      const sourceText = sourceTextByCaseId.get(caseData.id) ?? "";
      process.stdout.write(
        `[${index + 1}/${manifest.cases.length}] Extracting ${caseData.id}... `,
      );
      try {
        const usePdfOcr =
          caseData.mimeType === "application/pdf" && !sourceText.trim();
        const result = usePdfOcr
          ? await analyzeScannedPdf({
              documentName: path.basename(caseData.file),
              buffer,
            })
          : await analyzeDocument({
              documentName: path.basename(caseData.file),
              mimeType: caseData.mimeType,
              extractedText: sourceText,
            });
        predictions.push({ id: caseData.id, result });
        console.log("done");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown extraction failure.";
        predictions.push({ id: caseData.id, error: message.slice(0, 1_000) });
        console.log(`failed: ${message}`);
      }
    }
    predictionSet = {
      schemaVersion: GOLDEN_PREDICTION_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      model: process.env.OPENROUTER_MODEL ?? "openai/gpt-4.1-mini",
      cases: predictions,
    };
  }

  const report = evaluateGoldenInvoices({
    manifest,
    predictions,
    sourceTextByCaseId,
  });
  const stamp = timestampForFile();
  const reportPath = resolveWorkspacePath(
    options.reportPath ??
      path.join("artifacts", "invoice-evaluation", `${stamp}-report.json`),
  );
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  if (!options.predictionsPath && predictionSet) {
    const predictionsPath = resolveWorkspacePath(
      options.predictionsOutPath ??
        path.join(
          path.dirname(path.relative(process.cwd(), reportPath)),
          `${stamp}-predictions.json`,
        ),
    );
    await mkdir(path.dirname(predictionsPath), { recursive: true });
    await writeFile(
      predictionsPath,
      `${JSON.stringify(predictionSet, null, 2)}\n`,
      "utf8",
    );
    console.log(`Predictions: ${path.relative(process.cwd(), predictionsPath)}`);
  }

  console.log(`Report: ${path.relative(process.cwd(), reportPath)}`);
  console.log(`Result: ${report.passed ? "PASS" : "FAIL"}`);
  for (const [name, value] of Object.entries(report.metrics)) {
    console.log(`  ${name}: ${percent(value)}`);
  }
  console.log(`  extractionErrors: ${report.extractionErrors}`);
  if (report.failedGates.length) {
    console.log("Failed gates:");
    for (const gate of report.failedGates) console.log(`  - ${gate}`);
  }
  if (!report.passed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
