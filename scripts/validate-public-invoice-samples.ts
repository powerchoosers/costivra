import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { extractDocumentText } from "@/lib/documents/text-extraction";

const roots = [
  path.join(process.cwd(), "tests", "fixtures", "invoices"),
  path.join(process.cwd(), "private-evaluation", "invoices", "public-samples"),
];

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
        parsed: true,
      });
    } catch {
      results.push({ file: relativeFile, bytes: 0, pages: null, textCharacters: 0, parsed: false });
    }
  }

  const failed = results.filter((result) => !result.parsed);
  console.log(JSON.stringify({ total: results.length, parsed: results.length - failed.length, failed: failed.length, files: results }, null, 2));
  if (failed.length > 0 || results.length === 0) process.exitCode = 1;
}

void main();
