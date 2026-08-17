import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

/** Creates a non-authoritative local pointer; protected workflow artifacts are release proof. */
function main() {
  const directory = path.join(process.cwd(), "artifacts", "release");
  mkdirSync(directory, { recursive: true });
  const generatedAt = new Date().toISOString();
  const report = {
    schemaVersion: "costivra-release-evidence-pointer-v1",
    generatedAt,
    authoritative: false,
    verdict: "BLOCKED",
    message: "Run the protected pilot release certification workflow to produce an authoritative certificate.",
  };
  writeFileSync(path.join(directory, "local-release-pointer.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(
    path.join(process.cwd(), "PILOT_RELEASE_REPORT.md"),
    "# Costivra release evidence\n\nAuthoritative release certificates are generated only as protected workflow artifacts. This file is not release proof.\n",
    "utf8",
  );
  console.log("Wrote non-authoritative release evidence pointer; protected certification is still required.");
}

main();
