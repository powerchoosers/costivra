import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextCoreWebVitals,
  ...nextTypescript,
  globalIgnores([
    "node_modules/**",
    ".git/**",
    ".agents/**",
    ".next/**",
    ".next-*/**",
    "out/**",
    "coverage/**",
    "next-env.d.ts",
    "mobile-app/**",
    "artifacts/**",
    "test-results/**",
    "tmp/**",
    "output/**",
    "Pilot Docs 8152026/**",
    "private-evaluation/**",
    ".codex/**",
    ".codex-qa/**",
    ".codex-remote-attachments/**",
  ]),
]);
