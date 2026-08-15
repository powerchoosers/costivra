import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const COSTIVRA_PROJECT_REF = "skfocjrykyvsaviyhdea";
const COSTIVRA_URLS = new Set([
  `https://${COSTIVRA_PROJECT_REF}.supabase.co`,
  "https://auth.costivra.ai",
]);

function workspacePath(relativePath: string) {
  return path.resolve(process.cwd(), relativePath);
}

function readIfPresent(relativePath: string) {
  try {
    return readFileSync(workspacePath(relativePath), "utf8");
  } catch {
    return "";
  }
}

function normalizeUrl(value: string | undefined) {
  return value?.trim().replace(/\/$/, "") ?? "";
}

function assertCostivraUrl(label: string, value: string | undefined, required: boolean, failures: string[]) {
  const normalized = normalizeUrl(value);
  if (!normalized) {
    if (required) failures.push(`${label} is missing.`);
    else console.log(`${label}: not supplied; strict Vercel environment verification was not requested.`);
    return;
  }
  if (!COSTIVRA_URLS.has(normalized)) failures.push(`${label} does not identify the Costivra Supabase project.`);
  else console.log(`${label}: aligned with Costivra project ${COSTIVRA_PROJECT_REF}.`);
}

function clientFiles(relativePath: string): string[] {
  try {
    return readdirSync(workspacePath(relativePath), { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => path.join(entry.parentPath, entry.name));
  } catch {
    return [];
  }
}

function main() {
  const failures: string[] = [];
  const strictVercel = process.argv.includes("--require-vercel");
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  assertCostivraUrl("NEXT_PUBLIC_SUPABASE_URL", publicUrl, true, failures);
  assertCostivraUrl("COSTIVRA_VERCEL_PRODUCTION_SUPABASE_URL", process.env.COSTIVRA_VERCEL_PRODUCTION_SUPABASE_URL, strictVercel, failures);
  assertCostivraUrl("COSTIVRA_VERCEL_PREVIEW_SUPABASE_URL", process.env.COSTIVRA_VERCEL_PREVIEW_SUPABASE_URL, strictVercel, failures);

  const workflow = readIfPresent(".github/workflows/authenticated-e2e.yml");
  if (!workflow.includes(`https://${COSTIVRA_PROJECT_REF}.supabase.co`)) {
    failures.push("Authenticated GitHub workflow does not point to the Costivra project URL.");
  } else {
    console.log("Authenticated GitHub workflow: aligned with Costivra project.");
  }

  for (const key of Object.keys(process.env)) {
    if (/^NEXT_PUBLIC_.*(?:SECRET|SERVICE_ROLE|PRIVATE|TOKEN)/i.test(key)) {
      failures.push(`${key} is a secret-looking variable exposed through NEXT_PUBLIC_.`);
    }
  }

  const secretValues = [process.env.SUPABASE_SECRET_KEY, process.env.SUPABASE_SERVICE_ROLE_KEY]
    .filter((value): value is string => Boolean(value));
  const staticFiles = clientFiles(".next/static");
  let scanned = 0;
  for (const file of staticFiles) {
    try {
      const stats = statSync(file);
      if (stats.size > 10 * 1024 * 1024) continue;
      const contents = readFileSync(file, "utf8");
      scanned += 1;
      if (secretValues.some((secret) => secret.length > 12 && contents.includes(secret))) {
        failures.push(`A configured Supabase server secret appears in the client bundle: ${path.relative(process.cwd(), file)}.`);
      }
    } catch {
      // A transient or binary asset is not evidence of exposure.
    }
  }
  console.log(`Client bundle scan: ${scanned} static text assets checked; secret values are not printed.`);

  if (failures.length) {
    console.error(`Supabase environment check failed: ${failures.length} issue(s).`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Supabase environment check passed for Costivra project ${COSTIVRA_PROJECT_REF}.`);
}

main();
