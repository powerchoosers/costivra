# Costivra pilot closeout baseline

Generated: 2026-08-17

This file records the evidence available before production certification. It is a baseline, not a release certificate.

## Repository

- Local branch: `codex/finish-line-20260817`
- Local engineering HEAD at final local audit: `1fd14cd`
- The branch has not been pushed to `main`.
- The tracked worktree is clean. An existing untracked `tmp/` directory is preserved and is not release evidence.
- The intended final SHA must be a later, explicitly deployed SHA after the owner-controlled certification steps.

## GitHub

- Repository: `powerchoosers/costivra`
- Production `main` baseline observed through Vercel: `27d664e381fa9fe40f95d6d59eedb38628da311f`.
- The observed combined status for that SHA contained a successful Vercel check; it did not prove the complete Quality workflow.
- Earlier refreshed Quality evidence for that SHA had lint failure on the pricing anchor and an unused Open Graph suppression. Those local issues are fixed on this branch, but the branch has not been pushed, so GitHub has not re-run the final SHA.

## Vercel

- Project: `costivra` (`prj_pMAnjcRnNPD35PyXwNiUVz99N8Zc`), team `Nodal Point Network`.
- Latest observed production deployment: `dpl_4v9KBvVTZb1QQpzwV4GkLJ3xfkSk`.
- Deployment state: `READY`.
- Deployment Git SHA: `27d664e381fa9fe40f95d6d59eedb38628da311f`.
- Vercel readiness does not prove GitHub Quality, scanner proof, migration parity, or authenticated production behavior.
- Recent runtime error groups still include inbound worker ledger failures, null `page_number` evidence inserts, outreach reorder internal errors, and an authentication-required reports-delivery error. These require owner review against current production logs.
- Direct `https://costivra.ai/api/status` check at 2026-08-17T14:50:45Z returned `overall=limited`; website and workspace were operational, while intake and extraction were limited pending scanner proof.

## Supabase

- Costivra instructions identify project `skfocjrykyvsaviyhdea` in `us-east-2`.
- The currently available Supabase connector resolves to `https://gfitvnkaevozbcyostez.supabase.co`, a different project; its read-only migration/schema responses are Luxor-oriented. No migration or admin action was performed through that connector.
- A separate read-only REST probe using the repository's configured Costivra endpoint confirmed `documents`, `operational_alerts`, `inbound_worker_runs`, and `retention_runs` are reachable. `operational_alert_deliveries` is not present yet.
- The Costivra `operational_alerts` table currently has no active rows. A safe aggregate probe found at least one failed `external_side_effects` row.
- The latest reachable malware proof is for SHA `712284587cad40b250b633023a844393eac51624`, expiring 2026-08-24; it does not certify the eventual final SHA.
- No Supabase migration, SQL write, cleanup, auth change, or production data action was performed.
- The Costivra leaked-password protection warning therefore remains unverified and unresolved. The owner must reconnect the correct Costivra project before any parity or auth certification.

## Resend

- `costivra.ai` is verified with sending and receiving enabled.
- The enabled webhook is `https://costivra.ai/api/webhooks/resend`.
- No reserved-domain test email was sent during this continuation.
- The monitored operations recipient is intentionally not invented or configured locally.

## Local validation

- Node `v24.19.0`.
- Production build passed with build-only Supabase placeholders.
- Full TypeScript passed once after the delivery-code fix; later repeated processes exceeded the local OneDrive timeout without output and are not used as stronger evidence.
- Focused ESLint passed for changed files.
- Focused Vitest passed: 3 files, 15 tests.
- Billing and email-intake affected tests passed: 2 files, 5 tests.
- Public Playwright passed 26/30 in the combined desktop/mobile run; the only failure was a desktop browser-session closure during an anchor assertion. The exact test passed in isolation.
- The full unconstrained Vitest run is not certified: it first exposed and then cleared three failures, but the subsequent run hung; the single-worker retry ended with native exit code `-1073741819`.
- The fail-closed release verifier did not produce a current report because its typecheck process stalled in the local OneDrive workspace.

- Dependency audit passed with zero vulnerabilities for production and all dependencies.
- Secret scan passed across 1,108 files; private-evaluation staging found zero staged files.
- Invoice evaluation smoke passed with zero extraction errors.

## Production writes performed

None during this continuation. No push, deployment, migration, alert email, scanner probe, synthetic cleanup, or protected workflow dispatch was performed.

## Baseline verdict

`BLOCKED` for production certification. The local engineering changes are ready for owner-controlled review, but the exact final SHA, correct Supabase target, GitHub Quality result, migration parity, human alert receipt, scanner proof, authenticated production regression, and final protected certificate are not yet proven.
