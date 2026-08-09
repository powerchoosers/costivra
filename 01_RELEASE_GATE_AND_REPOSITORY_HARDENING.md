# Packet 01: Release Gate and Repository Hardening

## Mission

Restore a truthful, green release gate on the exact code that will be used for the pilot. Repair the current failing safety assertion, align CI with production, add secret and dependency checks, and prevent status documents from claiming readiness when the release commit is red.

This packet does not build product features.

## Current evidence to re-check

At preparation time:

- GitHub Actions passed `npm ci`, typecheck, and lint.
- Unit tests had one failing assertion in `src/lib/public-proof.test.ts`.
- The public copy said a saving becomes real only when evidence proves it.
- The test still expected the older phrase `becomes verified only after`.
- The failure caused invoice evaluation, integration tests, build, and Playwright to be skipped.
- Vercel production used Node 24.x.
- GitHub Actions selected Node 22.
- `npm ci` reported high-severity dependency findings.
- The repository was public.
- A provider credential had previously appeared in Git history and must be treated as compromised until rotation is confirmed.

Re-check all of these. Do not assume they are still true.

## Required files to inspect

```text
.github/workflows/quality.yml
package.json
package-lock.json
src/lib/public-proof.ts
src/lib/public-proof.test.ts
src/components/home-page.tsx
STATUS.md
DECISIONS.md
docs/PRODUCTION_LAUNCH_CHECKLIST.md
.env.example
.gitignore
```

Also inspect any existing secret-scanning, dependency, or release-verdict scripts before adding new ones.

## Workstream A: Repair the public-proof test correctly

The test and production copy must express the same product invariant:

- A potential charge or opportunity is not verified savings.
- Verification occurs only after a lower bill, credit, refund, executed vendor record, or another approved source proves the result.
- Do not restore awkward copy merely to satisfy an outdated string assertion.
- Prefer semantic assertions over exact full-sentence assertions.

Update the test to verify the invariant without tying it to one fragile marketing sentence.

Examples of acceptable assertions:

- stage is `potential`
- verified-value metrics are absent
- copy includes a proof condition
- copy does not claim an estimate is saved money

Add a regression test that rejects copy equating estimated value with verified savings.

## Workstream B: Align CI and production runtimes

- Confirm the Node version used by Vercel.
- Update GitHub Actions to the same supported major version.
- Keep the package lockfile authoritative.
- Do not introduce an unpinned runtime matrix.
- Add workflow concurrency so stale runs on the same ref cancel safely.
- Keep a reasonable timeout.

The quality workflow must run, in order:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run eval:invoices -- --manifest tests/fixtures/invoices/golden-manifest.smoke.json --predictions tests/fixtures/invoices/golden-predictions.smoke.json
npm run test:integration
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

Do not add `continue-on-error` to required gates.

## Workstream C: Add a release-verdict script

Create a small deterministic script such as:

```text
scripts/release-verdict.ts
```

It should:

- read a machine-readable result file produced by the release command, or orchestrate the required local checks;
- report which required gates passed, failed, or were skipped;
- return non-zero when any required gate fails or is skipped;
- never claim production readiness based only on Vercel deployment state;
- avoid printing secrets.

Add a package command such as:

```json
"release:verify": "..."
```

Do not duplicate every test implementation. This is an orchestrator and verdict layer.

## Workstream D: Secret scanning

Add a lightweight secret-scanning check suitable for CI.

Requirements:

- Scan the working tree and committed content available to the CI checkout.
- Fail on likely live provider keys, private keys, or Supabase server credentials.
- Allow reviewed dummy fixtures through an explicit configuration file.
- Never print a matched secret value in CI output.
- Do not add the previously exposed key to an allowlist.
- Document that Git-history cleanup and credential revocation are human-controlled actions.

A tool such as Gitleaks is acceptable. Pin the action or tool version.

## Workstream E: Dependency audit

Run:

```bash
npm audit --omit=dev
npm audit
```

Classify findings by:

- production reachable
- development only
- transitive and not reachable
- fixed by safe patch/minor upgrade
- blocked by breaking upgrade

Do not run a blind force upgrade. Apply safe compatible updates, then re-run typecheck, tests, build, and Playwright.

Create:

```text
docs/DEPENDENCY_SECURITY_REVIEW.md
```

Record package, severity, reachability, remediation, and remaining risk.

## Workstream F: Status-document truth

Update `STATUS.md` so its latest section contains:

- exact commit
- exact gate status
- current production deployment status
- current known blockers
- no contradictory older headline treated as current truth

Do not erase useful history. Clearly mark historical verdicts as historical.

Update `docs/PRODUCTION_LAUNCH_CHECKLIST.md` only where the current evidence has changed.

## Human-only checklist

Report, but do not perform without explicit access and authorization:

- Make the GitHub repository private unless public source is intentional.
- Revoke the previously exposed provider credential.
- Confirm the replacement credential is active only in intended environments.
- Enable repository protection or required checks if Lewis later chooses that workflow.

The user has explicitly chosen to commit and push manually. Do not redesign this packet around pull requests or branches.

## Tests

At minimum:

```bash
npm run typecheck
npm run lint
npm test
npm run eval:invoices -- --manifest tests/fixtures/invoices/golden-manifest.smoke.json --predictions tests/fixtures/invoices/golden-predictions.smoke.json
npm run test:integration
npm run build
npm run test:e2e
npm run release:verify
```

## Acceptance criteria

- The exact working tree passes every required quality command.
- No required command is skipped because an earlier command failed.
- The public proof test verifies meaning rather than obsolete wording.
- Production and CI use the same Node major version.
- Secret scanning is active and redacts findings.
- Dependency findings are reviewed and documented.
- `STATUS.md` has one unambiguous current verdict.
- No branch, commit, push, merge, or deployment was performed.

## Completion report

Return the common completion report from Packet 00 and include the final GitHub-quality command output summary.
