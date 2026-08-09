# Dependency security review

Date: 2026-08-08

## Result

Both required audits are clean after safe, compatible override updates:

```text
npm audit --omit=dev  0 vulnerabilities
npm audit             0 vulnerabilities
```

## Remediations

| Package | Scope | Finding | Reachability | Remediation | Remaining risk |
|---|---|---|---|---|---|
| `nanoid` | production dependency tree through `@tailwindcss/postcss` → `postcss` | `<3.3.17` high-severity zero-size custom-generator loop | Build tooling dependency; not imported by application runtime | Pinned override to `3.3.17` | None reported by current audit |
| `js-yaml` | development dependency tree through ESLint | `4.0.0–4.3.0` high-severity quadratic `!!omap` processing | Lint configuration tooling; not production runtime | Pinned override to `4.3.1` | None reported by current audit |

No force upgrade was used. The overrides are lockfile-backed and must be rechecked after dependency changes.

The audit does not replace review of future advisories or human-controlled credential rotation. The previously exposed provider credential remains a Lewis-controlled revocation and Git-history-cleanup item; it is not allowlisted by this repository.
