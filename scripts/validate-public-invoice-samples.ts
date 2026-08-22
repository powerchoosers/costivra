import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { extractDocumentText, hasMeaningfulExtractedText } from "@/lib/documents/text-extraction";

const roots = [
  path.join(process.cwd(), "tests", "fixtures", "invoices"),
  path.join(process.cwd(), "private-evaluation", "invoices", "public-samples"),
  path.join(process.cwd(), "private-evaluation", "invoices", "energy", "public-samples"),
];

const publicBillShapeSignals = [
  ["service_address", /service\s+(?:address|location|delivered\s+to)|premise/i],
  ["meter_identity", /\bmeter(?:\s*(?:id|number|#))?|\besi\b|service\s+identifier/i],
  ["energy_usage", /\b(?:kwh|kw|therm|generation|supply|delivery|tdsp|tdu)\b/i],
  ["demand_or_power_factor", /demand|power\s+factor|ratchet/i],
  ["telecom_identity", /telephone|phone\s+(?:number|no\.? )|circuit|local\s+loop|line\s+(?:number|user)/i],
  ["voice_usage_or_surcharge", /voip|minutes\s+usage|call\s+record|e[- ]?911|fusf|universal\s+service/i],
  ["wireless_line_detail", /wireless|device|equipment|roaming|hotspot|data\s+usage/i],
  ["software_or_cloud_identity", /subscription|license|seat|azure|amazon\s+web\s+services|compute|resource\s+id|cloud/i],
  ["tax_or_fee", /tax|fee|surcharge|assessment|regulatory|gross\s+receipts/i],
  ["balance_or_payment_history", /previous\s+balance|balance\s+forward|payments?|amount\s+due|payment\s+due/i],
  ["contract_terms", /effective\s+date|expiration|auto[- ]?renew|termination\s+fee|minimum\s+commitment/i],
] as const;

export function detectPublicBillShapeSignals(sourceText: string): string[] {
  return publicBillShapeSignals
    .filter(([, pattern]) => pattern.test(sourceText))
    .map(([signal]) => signal);
}

async function collectPdfs(directory: string): Promise<string[]> {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const candidate = path.join(directory, entry.name);
      if (entry.isDirectory()) files.push(...(await collectPdfs(candidate)));
      else if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) files.push(candidate);
    }
    return files;
  } catch {
    return [];
  }
}

async function main() {
  const files = (await Promise.all(roots.map(collectPdfs))).flat().sort();
  const results = [] as Array<{
    file: string;
    bytes: number;
    pages: number | null;
    textCharacters: number;
    nativeTextAvailable: boolean;
    requiresOcr: boolean;
    shapeSignals: string[];
    parsed: boolean;
  }>;

  for (const file of files) {
    const relativeFile = path.relative(process.cwd(), file);
    try {
      const buffer = await readFile(file);
      const extracted = await extractDocumentText(buffer, "application/pdf");
      results.push({
        file: relativeFile,
        bytes: buffer.length,
        pages: extracted.pageCount,
        textCharacters: extracted.text.length,
        nativeTextAvailable: hasMeaningfulExtractedText(extracted.text),
        requiresOcr: !hasMeaningfulExtractedText(extracted.text),
        shapeSignals: detectPublicBillShapeSignals(extracted.text),
        parsed: true,
      });
    } catch {
      results.push({ file: relativeFile, bytes: 0, pages: null, textCharacters: 0, nativeTextAvailable: false, requiresOcr: false, shapeSignals: [], parsed: false });
    }
  }

  const failed = results.filter((result) => !result.parsed);
  console.log(JSON.stringify({ total: results.length, parsed: results.length - failed.length, failed: failed.length, files: results }, null, 2));
  if (failed.length > 0 || results.length === 0) process.exitCode = 1;
}

void main();
