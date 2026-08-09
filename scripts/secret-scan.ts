import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

type Rule = { id: string; pattern: RegExp };
type Allowlist = { entries?: Array<{ rule: string; path: string }> };

const rules: Rule[] = [
  { id: "private-key", pattern: /-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/ },
  { id: "stripe-secret", pattern: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/ },
  { id: "supabase-secret-key", pattern: /\bsb_secret_[A-Za-z0-9_-]{16,}\b/ },
  { id: "supabase-service-role-jwt", pattern: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*(?!\$|<|your_|replace_)[^\s]+/i },
  { id: "resend-api-key", pattern: /\bre_[A-Za-z0-9]{20,}\b/ },
  { id: "openrouter-api-key", pattern: /\bsk-or-v1-[A-Za-z0-9_-]{20,}\b/ },
  { id: "github-token", pattern: /\b(?:ghp|gho|ghs|ghr)_[A-Za-z0-9]{20,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
  { id: "aws-access-key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
];

function workspacePath(relativePath: string) {
  return path.resolve(process.cwd(), relativePath);
}

function loadAllowlist(): Allowlist {
  try {
    return JSON.parse(readFileSync(workspacePath(".secret-scan-allowlist.json"), "utf8")) as Allowlist;
  } catch {
    return { entries: [] };
  }
}

function trackedAndUntrackedFiles() {
  const output = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    encoding: "utf8",
  });
  return [...new Set(output.split(/\r?\n/).map((file) => file.trim()).filter(Boolean))];
}

function isAllowed(rule: string, file: string, allowlist: Allowlist) {
  return (allowlist.entries ?? []).some((entry) => entry.rule === rule && entry.path === file);
}

function main() {
  const allowlist = loadAllowlist();
  const findings: Array<{ rule: string; file: string; line: number }> = [];
  for (const file of trackedAndUntrackedFiles()) {
    if (file === ".secret-scan-allowlist.json" || file.startsWith(".git/")) continue;
    const absolute = workspacePath(file);
    let text: string;
    try {
      const bytes = readFileSync(absolute);
      if (bytes.includes(0) || bytes.length > 10 * 1024 * 1024) continue;
      text = bytes.toString("utf8");
    } catch {
      continue;
    }
    const lines = text.split(/\r?\n/);
    for (const [index, line] of lines.entries()) {
      for (const rule of rules) {
        if (rule.pattern.test(line) && !isAllowed(rule.id, file, allowlist)) {
          findings.push({ rule: rule.id, file, line: index + 1 });
        }
        rule.pattern.lastIndex = 0;
      }
    }
  }
  if (findings.length) {
    console.error(`Secret scan failed: ${findings.length} finding(s). Values are intentionally redacted.`);
    for (const finding of findings) console.error(`  ${finding.rule} at ${finding.file}:${finding.line}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Secret scan passed: ${trackedAndUntrackedFiles().length} files checked; no unallowlisted provider credentials or private keys found.`);
}

main();
