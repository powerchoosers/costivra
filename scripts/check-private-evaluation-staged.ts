import { execFileSync } from "node:child_process";

const staged = execFileSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMR"], {
  encoding: "utf8",
}).split(/\r?\n/).map((item) => item.trim()).filter(Boolean);

const prohibited = staged.filter((file) => {
  const normalized = file.replaceAll("\\", "/").toLowerCase();
  return normalized.startsWith("private-evaluation/")
    || normalized.startsWith("tests/golden-private/")
    || normalized.includes("/private-evaluation/")
    || normalized.includes("/golden-private/");
});

if (prohibited.length) {
  console.error("Private evaluation files must never be staged or committed:");
  for (const file of prohibited) console.error(`  ${file}`);
  process.exitCode = 1;
} else {
  console.log(`Private evaluation staging check passed: ${staged.length} staged file(s) inspected.`);
}
