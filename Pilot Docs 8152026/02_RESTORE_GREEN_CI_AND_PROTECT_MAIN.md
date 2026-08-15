# Packet 02: Restore Green CI and Protect Main

**Snapshot date:** August 15, 2026  
**Priority:** Critical  
**Pilot requirement:** Mandatory  
**Primary system:** GitHub Actions and repository release controls

## Mission

Produce one exact Costivra commit that passes every required quality gate without skipped stages, hidden failures, or weakened safety checks. Then prepare or apply appropriate protection so a red commit cannot silently replace the proven release.

A Vercel deployment marked `READY` is useful operational evidence, but it is not a release verdict.

## Current evidence to re-check

At the latest audit:

- Vercel successfully deployed the latest production commit;
- the earlier missing `zod` dependency had been repaired;
- GitHub Actions passed install, typecheck, and lint;
- `npm audit --omit=dev` failed;
- all later stages were skipped because of the audit failure;
- the quality workflow used Node 24, matching `package.json`;
- the workflow already included dependency audits, secret scan, tests, invoice smoke evaluation, integration tests, build, and Playwright;
- `main` did not have required status checks protecting it.

Re-check the current workflow run, commit, branch rules, package lockfile, and Vercel deployment before changing anything.

## Required reading and inspection

```text
.github/workflows/quality.yml
.github/workflows/authenticated-e2e.yml
package.json
package-lock.json
scripts/release-verdict.ts
scripts/secret-scan.ts
docs/DEPENDENCY_SECURITY_REVIEW.md
STATUS.md
DECISIONS.md
docs/PRODUCTION_LAUNCH_CHECKLIST.md
AGENTS.md
```

Inspect:

- recent GitHub Actions runs on `main`;
- the failed job log and exact audit output;
- Vercel's current production commit;
- current branch protection or rulesets;
- Dependabot or equivalent configuration if present;
- current open dependency-related issues or pull requests.

## Release-gate invariant

The required release pipeline must not report success when any required stage:

- fails;
- is skipped because an earlier stage failed;
- silently continues after failure;
- ran against a different commit;
- used materially different runtime or dependency resolution;
- omitted authenticated or live proof that the final release report claims passed.

Do not add `continue-on-error` to a required gate.

## Workstream A: Reproduce and classify the dependency findings

From a clean install:

```bash
npm ci
npm audit --omit=dev --json
npm audit --json
```

Create a safe classification for each finding:

- direct or transitive;
- production or development;
- reachable or not known to be reachable;
- affected path in Costivra;
- fixed by patch, minor, major, override, or upstream release;
- compatible remediation;
- tests required after remediation;
- residual risk;
- exception expiry if an exception is truly unavoidable.

Do not paste tokens, private registry URLs, or other secrets into the review.

## Workstream B: Remediate without dependency roulette

Preferred order:

1. compatible patch update;
2. compatible minor update;
3. targeted, documented override when upstream compatibility is known;
4. replace an unnecessary package;
5. major upgrade only with migration review and full regression testing;
6. narrow, time-bounded exception only when no safe fix exists and Lewis explicitly accepts the residual risk.

Prohibited shortcuts:

- `npm audit fix --force` without reviewing the dependency graph;
- lowering the audit threshold merely to turn CI green;
- deleting the audit step;
- marking the step non-blocking;
- excluding production dependencies from review;
- broad overrides that affect unrelated packages;
- editing `package-lock.json` by hand.

Update `docs/DEPENDENCY_SECURITY_REVIEW.md` with the final classification and evidence.

## Workstream C: Run the complete local release sequence

Run in the same Node major version used by CI and Vercel:

```bash
npm ci
npm run typecheck
npm run lint
npm audit --omit=dev
npm audit
npm run security:secrets
npm test
npm run eval:invoices -- --manifest tests/fixtures/invoices/golden-manifest.smoke.json --predictions tests/fixtures/invoices/golden-predictions.smoke.json
npm run test:integration
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
npm run release:verify
```

Also run the authenticated suite when the required disposable credentials are available:

```bash
npm run test:e2e:authenticated
```

A required skip must be explained and remains a blocker for the claim it supports.

## Workstream D: Verify the release-verdict layer

Inspect `scripts/release-verdict.ts`.

It must:

- identify every required gate;
- distinguish pass, fail, and skipped;
- return non-zero if any required gate fails or is skipped;
- bind the verdict to an exact commit or explicit working-tree state;
- avoid treating Vercel deployment state as sufficient;
- avoid printing secrets;
- produce a machine-readable result and a readable summary;
- make it difficult for stale artifacts from a previous commit to satisfy the current run.

Repair only if current behavior does not meet these invariants.

## Workstream E: Obtain one green GitHub Actions run

After authorized changes are pushed:

- confirm the workflow runs on the intended commit;
- confirm every step executes;
- confirm no step is skipped;
- confirm the final job is green;
- record workflow run ID, job ID, commit, and timestamps;
- retain or upload test artifacts useful for the final launch gate;
- compare the GitHub commit to the intended Vercel Preview or Production candidate.

Do not claim this workstream passed from a local run alone.

If the agent is not authorized to push, prepare the exact commands and leave this workstream pending.

## Workstream F: Protect the release path

Inspect current repository rules.

Minimum intended protection for `main`:

- require the quality-gate status check;
- prevent force pushes;
- prevent branch deletion;
- require the branch to be up to date before merge, when compatible with the chosen workflow;
- restrict bypass authority to deliberate administrators;
- preserve the user's chosen manual-commit workflow where possible.

Optional but recommended:

- require the authenticated production regression before a pilot release tag rather than every ordinary commit;
- add a release-candidate tag or manual release workflow that records exact evidence.

Do not change repository rules or visibility without explicit authorization. When authorization is absent, return a precise GitHub settings checklist.

## Workstream G: Truthful project status

Update current status documentation only after evidence exists.

`STATUS.md` should have one clear latest section containing:

- exact commit;
- exact GitHub run;
- local gate result;
- Vercel deployment state;
- remaining live proof blockers;
- no stale headline presented as the current verdict.

Preserve useful history, but label it historical.

## Required evidence

- exact commit SHA;
- clean `npm ci`;
- dependency-review document;
- complete local command matrix;
- GitHub Actions run ID and green step list;
- release-verdict output;
- branch rules screenshot or API response, or a human-action checklist;
- Vercel candidate deployment mapped to the same commit;
- confirmation that no secret-scan match exposed the matched value.

## Acceptance criteria

- `npm audit --omit=dev` passes or an explicitly approved, package-specific exception is enforced and documented.
- Full `npm audit` passes or every remaining development-only exception is explicitly approved, bounded, and enforced.
- Typecheck, lint, secret scan, unit tests, invoice smoke evaluation, integration tests, build, and public Playwright all pass.
- Authenticated Playwright passes for the release claim that depends on it.
- `release:verify` returns success only when all required stages pass.
- One GitHub Actions run is green on the exact release candidate.
- No required job step was skipped.
- CI, local validation, and Vercel use compatible Node and lockfile resolution.
- `main` is protected, or an exact pending human action is documented.
- Status documentation matches the evidence.
- No gate was weakened to achieve green.

## Explicitly out of scope

- unrelated framework upgrades;
- broad refactors;
- changing the user's branching strategy without approval;
- making the repository private without approval;
- committing, pushing, merging, or deploying without explicit authorization;
- claiming production readiness before the other pilot packets pass.

## Completion report

Return the shared completion report from Packet 00. Add:

```markdown
## Release gate matrix
| Gate | Local | GitHub Actions | Required for final release |
|---|---|---|---|
| Install | ... | ... | Yes |
| Typecheck | ... | ... | Yes |
| Lint | ... | ... | Yes |
| Production audit | ... | ... | Yes |
| Full audit | ... | ... | Yes |
| Secret scan | ... | ... | Yes |
| Unit tests | ... | ... | Yes |
| Invoice smoke eval | ... | ... | Yes |
| Integration tests | ... | ... | Yes |
| Build | ... | ... | Yes |
| Public Playwright | ... | ... | Yes |
| Authenticated Playwright | ... | ... | Final pilot gate |
| Release verdict | ... | ... | Yes |
```
