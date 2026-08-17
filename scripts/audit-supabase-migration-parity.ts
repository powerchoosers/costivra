import { mkdir, readdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

type Migration = { version: string; name: string; file?: string };

function parseLocal(files: string[]) {
  return files.filter((file) => file.endsWith(".sql")).map((file) => {
    const match = /^(\d+)_(.+)\.sql$/.exec(file);
    return match ? { version: match[1], name: match[2], file } : { version: "", name: "", file };
  });
}

function unique(values: string[]) { return [...new Set(values)]; }

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
    else if (remoteItem.name === item.name) matched.push(item);
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
  const duplicateLocalVersion = unique(local.map((m) => m.version).filter(Boolean)).filter((version) => local.filter((m) => m.version === version).length > 1);
  const unreadable = local.filter((m) => !m.version || !m.name).map((m) => m.file);
  let remote: Migration[] = [];
  let unreadableRemote: unknown = null;
  if (!structuralOnly) {
    const command = process.platform === "win32" ? "npx.cmd" : "npx";
    const result = spawnSync(command, ["supabase", "migration", "list", "--linked", "--output", "json"], { encoding: "utf8", shell: process.platform === "win32", timeout: 60_000 });
    if (result.status === 0) {
      try {
        const parsed = JSON.parse(result.stdout) as { migrations?: Array<{ version: string; name?: string }> };
        remote = (parsed.migrations ?? []).map((m) => ({ version: m.version, name: m.name ?? "" }));
      } catch { unreadableRemote = "linked migration output was not valid JSON"; }
    } else unreadableRemote = result.error?.message ?? result.stderr?.trim() ?? "linked migration command failed";
  }
  const comparison = classify(local, remote);
  const report = {
    generatedAt: new Date().toISOString(),
    structuralOnly,
    MATCHED: comparison.matched,
    LOCAL_ONLY: comparison.localOnly,
    REMOTE_ONLY: comparison.remoteOnly,
    VERSION_NAME_MISMATCH: comparison.mismatch,
    DUPLICATE_LOCAL_VERSION: duplicateLocalVersion,
    DUPLICATE_REMOTE_VERSION: unique(remote.map((m) => m.version)).filter((version) => remote.filter((m) => m.version === version).length > 1),
    UNREADABLE: [...unreadable, ...(unreadableRemote ? [unreadableRemote] : [])],
    CHECKSUM_MISMATCH: "unavailable: the linked migration endpoint does not expose checksums",
  };
  await mkdir(resolve(process.cwd(), "artifacts/migration-parity"), { recursive: true });
  await writeFile(resolve(process.cwd(), "artifacts/migration-parity/report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(resolve(process.cwd(), "artifacts/migration-parity/report.md"), `# Supabase migration parity\n\nGenerated: ${report.generatedAt}\n\n- MATCHED: ${report.MATCHED.length}\n- LOCAL_ONLY: ${report.LOCAL_ONLY.length}\n- REMOTE_ONLY: ${report.REMOTE_ONLY.length}\n- VERSION_NAME_MISMATCH: ${report.VERSION_NAME_MISMATCH.length}\n- DUPLICATE_LOCAL_VERSION: ${report.DUPLICATE_LOCAL_VERSION.length}\n- DUPLICATE_REMOTE_VERSION: ${report.DUPLICATE_REMOTE_VERSION.length}\n- UNREADABLE: ${report.UNREADABLE.length}\n- CHECKSUM_MISMATCH: unavailable (not exposed by linked endpoint)\n`, "utf8");
  const blocking = report.UNREADABLE.length > 0 || report.DUPLICATE_LOCAL_VERSION.length > 0 || report.DUPLICATE_REMOTE_VERSION.length > 0 || report.VERSION_NAME_MISMATCH.length > 0 || (!structuralOnly && (report.LOCAL_ONLY.length > 0 || report.REMOTE_ONLY.length > 0));
  if (blocking) process.exitCode = 1;
}

main().catch((error) => { console.error("Migration parity audit failed:", error); process.exitCode = 1; });
