# Costivra final engineering handoff

## Scope

This handoff covers the supervised design-partner pilot engineering release: exact-SHA GitHub Quality, Vercel deployment identity, production build, live integration checks, authenticated production regression, Supabase migration parity, Cloudmersive clean/EICAR proof, public operational status, and the protected final certificate artifact.

## Release record

- Final SHA: `6effb11a350a8a92cdf266cfba0267222531762f`
- Production deployment: `dpl_CyRQiPFn9QXacnMdXdxw6XBUiT9y` (exact SHA-matched Vercel deployment)
- Scanner proof: exact-SHA Cloudmersive clean and inert EICAR proof
- Migration parity: linked comparison passed with documented historical reconciliation
- Certificate: uploaded as artifact `9307216240` by the protected `pilot-release-certify.yml` workflow

## What passed

- GitHub Quality: typecheck, lint, dependency audits, secrets checks, unit tests, invoice smoke evaluation, live integration tests, build, and public E2E.
- Protected certification: exact SHA checkout, deployment identity, live integration tests, authenticated production E2E with disposable cleanup, migration structure, linked migration parity, scanner proof, public status, and final artifact upload.
- Supabase: security warning resolved and migration ledger left unmodified by the reconciliation work.

## Remaining owner responsibilities

- Keep the Cloudmersive key current in GitHub Actions and Vercel environments.
- Perform founder acceptance testing with approved real or de-identified documents.
- Obtain legal/customer agreements and confirm pilot support owner, channel, hours, and response target.
- Treat this as a supervised pilot engineering handoff, not legal approval, real-invoice corpus accuracy validation, paid self-service readiness, or a guarantee of savings.
