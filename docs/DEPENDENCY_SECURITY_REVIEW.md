# Dependency security review

Date: 2026-08-15

## Result

Both required audits are clean after a safe, compatible override update and a fresh npm lockfile regeneration:

```text
npm audit --omit=dev  0 vulnerabilities
npm audit             0 vulnerabilities
```

## Remediations

| Package | Scope | Finding | Reachability | Remediation | Remaining risk |
|---|---|---|---|---|---|
| `nanoid` | production dependency tree through `@tailwindcss/postcss` → `postcss` | `<3.3.18` high-severity zero-size custom-generator loop (`GHSA-2v37-7h3g-55p8`) | Transitive build-tool dependency; not imported by application runtime | Updated the existing targeted override from `3.3.17` to `3.3.18`; regenerated `package-lock.json` through npm | None reported by the clean-install audits |
| `js-yaml` | development dependency tree through ESLint | `4.0.0–4.3.0` high-severity quadratic `!!omap` processing | Lint configuration tooling; not production runtime | Pinned override to `4.3.1` | None reported by current audit |

No force upgrade was used. The override is targeted to `nanoid`, is lockfile-backed, and was verified after `npm ci` with Node 24.19.0. The npm lockfile regeneration also corrected the stale production/dev classification for the direct `zod` dependency.

## 2026-08-15 evidence

```text
Node                  v24.19.0
npm ci                passed (468 packages installed from package-lock.json)
npm audit --omit=dev  0 vulnerabilities
npm audit             0 vulnerabilities
```

The previous failing CI finding was remediated by a compatible patch update. No audit threshold was lowered, no audit step was removed, and no non-blocking exception was added.

The audit does not replace review of future advisories or human-controlled credential rotation. The previously exposed provider credential remains a Lewis-controlled revocation and Git-history-cleanup item; it is not allowlisted by this repository.
