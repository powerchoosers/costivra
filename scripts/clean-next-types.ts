import { rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const targets = [
  path.resolve(process.cwd(), ".next/dev/types/validator.ts"),
  path.resolve(process.cwd(), ".next/dev/types/routes.js"),
  path.resolve(process.cwd(), ".next/types"),
];

for (const target of targets) {
  if (existsSync(target)) {
    try {
      await rm(target, { recursive: true, force: true });
      console.log(`Removed stale Next type cache: ${path.relative(process.cwd(), target)}`);
    } catch {
      console.warn(`Could not remove ${path.relative(process.cwd(), target)}. Continuing.`);
    }
  }
}
