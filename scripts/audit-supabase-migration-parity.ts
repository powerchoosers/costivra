import { mkdir, readdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

type Migration = { version: string; name: string; file?: string };
type Reconciliation = {
  historicalBefore?: string;
  groups?: Array<{ remote: string[]; local: string[]; reason: string }>;
};

function parseLocal(files: string[]) {
  return files.filter((file) => file.endsWith(".sql")).map((file) => {
    const match = /^(\d+)_(.+)\.sql$/.exec(file);
    return match ? { version: match[1], name: match[2], file } : { version: "", name: "", file };
  });
}

function unique(values: string[]) { return [...new Set(values)]; }

function parseRemoteOutput(stdout: string): Migration[] {
  const parsed = JSON.parse(stdout) as { migrations?: Array<{ local?: string; remote?: string }> };
  return (parsed.migrations ?? [])
    .flatMap((row) => row.remote ? [{ version: row.remote, name: "" }] : []);
}

function classify(local: Migration[], remote: Migration[]) {
  const localByVersion = new Map(local.filter((m) => m.version).map((m) => [m.version, m]));
  const remoteByVersion = new Map(remote.map((m) => [m.version, m]));
  const matched: Migration[] = [];
  const localOnly: Migration[] = [];
  const remoteOnly: Migration[] = [];
  const mismatch: Array<{ version: string; local: string; remote: string }> = [];
  for (const item of local) {
    const remoteItem = remoteByVersion.get(item.version);
    if (!remoteItem) localOnly.push(item);
    else if (!remoteItem.name || remoteItem.name === item.name) matched.push(item);
    else mismatch.push({ version: item.version, local: item.name, remote: remoteItem.name });
  }
  for (const item of remote) if (!localByVersion.has(item.version)) remoteOnly.push(item);
  return { matched, localOnly, remoteOnly, mismatch };
}

async function main() {
  const structuralOnly = process.argv.includes("--structural-only");
  const migrationDir = resolve(process.cwd(), "supabase/migrations");
  const files = await readdir(migrationDir);
  const local = parseLocal(files);
  const reconciliationPath = resolve(process.cwd(), "supabase/migrations/parity-reconciliation.json");
  let reconciliation: Reconciliation = {};
  try {
    reconciliation = JSON.parse(await (await import("node:fs/promises")).readFile(reconciliationPath, "utf8")) as Reconciliation;
  } catch { /* The manifest is optional for structural-only checks. */ }
  const duplicateLocalVersion = unique(local.map((m) => m.version).filter(Boolean)).filter((version) => local.filter((m) => m.version === version).length > 1);
  const unreadable = local.filter((m) => !m.version || !m.name).map((m) => m.file);
  let remote: Migration[] = [];
  let unreadableRemote: unknown = null;
  if (!structuralOnly) {
    const command = process.platform === "win32" ? "npx.cmd" : "npx";
    const result = spawnSync(command, ["supabase", "migration", "list", "--linked", "--output-format", "json"], { encoding: "utf8", shell: process.platform === "win32", timeout: 60_000 });
    if (result.status === 0) {
      try { remote = parseRemoteOutput(result.stdout.slice(result.stdout.indexOf("{"))); }
      catch { unreadableRemote = "linked migration output was not valid JSON"; }
    } else unreadableRemote = result.error?.message ?? result.stderr?.trim() ?? "linked migration command failed";
  }
  const comparison = classify(local, remote);
  const reconciledRemote = new Set((reconciliation.groups ?? []).flatMap((group) => group.remote));
  const reconciledLocal = new Set((reconciliation.groups ?? []).flatMap((group) => group.local));
  const historicalBefore = reconciliation.historicalBefore ?? "";
  const historicalDrift = historicalBefore
    ? {
        local: comparison.localOnly.filter((item) => item.version < historicalBefore && !reconciledLocal.has(item.version)),
        remote: comparison.remoteOnly.filter((item) => item.version < historicalBefore && !reconciledRemote.has(item.version)),
      }
    : { local: [], remote: [] };
  const unresolvedLocalOnly = comparison.localOnly.filter((item) => !reconciledLocal.has(item.version) && !historicalDrift.local.some((drift) => drift.version === item.version));
  const unresolvedRemoteOnly = comparison.remoteOnly.filter((item) => !reconciledRemote.has(item.version) && !historicalDrift.remote.some((drift) => drift.version === item.version));
  const unresolvedMismatch = comparison.mismatch.filter((item) => !reconciledLocal.has(item.version) && !reconciledRemote.has(item.version));
  const report = {
    generatedAt: new Date().toISOString(),
    structuralOnly,
    MATCHED: comparison.matched,
    LOCAL_ONLY: comparison.localOnly,
    REMOTE_ONLY: comparison.remoteOnly,
    VERSION_NAME_MISMATCH: comparison.mismatch,
    RECONCILED: reconciliation.groups ?? [],
    HISTORICAL_DRIFT: historicalDrift,
    UNRESOLVED_LOCAL_ONLY: unresolvedLocalOnly,
    UNRESOLVED_REMOTE_ONLY: unresolvedRemoteOnly,
    UNRESOLVED_VERSION_NAME_MISMATCH: unresolvedMismatch,
    DUPLICATE_LOCAL_VERSION: duplicateLocalVersion,
    DUPLICATE_REMOTE_VERSION: unique(remote.map((m) => m.version)).filter((version) => remote.filter((m) => m.version === version).length > 1),
    UNREADABLE: [...unreadable, ...(unreadableRemote ? [unreadableRemote] : [])],
    CHECKSUM_MISMATCH: "unavailable: the linked migration endpoint does not expose checksums",
  };
  await mkdir(resolve(process.cwd(), "artifacts/migration-parity"), { recursive: true });
  await writeFile(resolve(process.cwd(), "artifacts/migration-parity/report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(resolve(process.cwd(), "artifacts/migration-parity/report.md"), `# Supabase migration parity\n\nGenerated: ${report.generatedAt}\n\n- MATCHED: ${report.MATCHED.length}\n- LOCAL_ONLY: ${report.LOCAL_ONLY.length}\n- REMOTE_ONLY: ${report.REMOTE_ONLY.length}\n- VERSION_NAME_MISMATCH: ${report.VERSION_NAME_MISMATCH.length}\n- RECONCILED: ${report.RECONCILED.length}\n- HISTORICAL_DRIFT (documented): ${report.HISTORICAL_DRIFT.local.length + report.HISTORICAL_DRIFT.remote.length}\n- UNRESOLVED_LOCAL_ONLY: ${report.UNRESOLVED_LOCAL_ONLY.length}\n- UNRESOLVED_REMOTE_ONLY: ${report.UNRESOLVED_REMOTE_ONLY.length}\n- UNRESOLVED_VERSION_NAME_MISMATCH: ${report.UNRESOLVED_VERSION_NAME_MISMATCH.length}\n- DUPLICATE_LOCAL_VERSION: ${report.DUPLICATE_LOCAL_VERSION.length}\n- DUPLICATE_REMOTE_VERSION: ${report.DUPLICATE_REMOTE_VERSION.length}\n- UNREADABLE: ${report.UNREADABLE.length}\n- CHECKSUM_MISMATCH: unavailable (not exposed by linked endpoint)\n`, "utf8");
  const blocking = report.UNREADABLE.length > 0 || report.DUPLICATE_LOCAL_VERSION.length > 0 || report.DUPLICATE_REMOTE_VERSION.length > 0 || report.UNRESOLVED_VERSION_NAME_MISMATCH.length > 0 || (!structuralOnly && (report.UNRESOLVED_LOCAL_ONLY.length > 0 || report.UNRESOLVED_REMOTE_ONLY.length > 0));
  if (blocking) process.exitCode = 1;
}

main().catch((error) => { console.error("Migration parity audit failed:", error); process.exitCode = 1; });
