# Costivra production launch checklist

This is the short list of work that cannot be completed honestly with code alone. Costivra should begin with a controlled pilot, not broad self-serve availability.

## Lewis must provide or decide

- [ ] Choose and fund a malware scanner. The existing Cloudmersive adapter is the fastest path; a provider-neutral HTTP adapter is also supported. Until configured, inbound and uploaded source files remain safely quarantined and cannot be processed.
- [ ] Supply a de-identified evaluation set: at least 20 software invoices, 20 telecom/internet invoices, and 10 scanned examples, including clean, incomplete, contradictory, and arithmetic-error cases. Do not send real customer files without permission and de-identification.
- [ ] Ask qualified counsel to approve the Privacy Policy, Terms, UCEP relationship disclosure, consent wording, retention/deletion policy, and performance-fee method before charging customers or sharing an energy case.
- [ ] Upgrade Supabase if leaked-password protection is required for launch, then enable it in Authentication settings. The current plan does not expose that control.
- [ ] Name an incident owner and a support channel for security, failed intake, incorrect extraction, and provider outages.
- [ ] Decide the first pilot tenants and restrict onboarding to them until the evaluation and cross-tenant security gates pass.

## Configuration to complete

- [ ] Add the selected malware-scanner secret to local, Vercel Preview, and Vercel Production environments. Never use a `NEXT_PUBLIC_` name for it.
- [ ] Confirm Vercel has server-only OpenRouter, Supabase secret, Resend API, and Resend webhook secrets plus browser-safe Supabase URL/publishable key in each intended environment.
- [ ] Configure production SMTP/auth email branding, delivery monitoring, and redirect URLs for `https://costivra.ai`.
- [ ] Configure error monitoring and alerts for failed uploads, quarantined intake, extraction failures, webhook signature failures, value-engine retries, and ambiguous external effects.
- [ ] Set retention windows for originals, quarantined files, extracted data, audit events, and deleted organizations.

## Release evidence required

- [ ] Golden-set extraction evaluation passes agreed precision/recall and evidence-citation thresholds for critical invoice fields.
- [x] A real Resend production probe proves sending, receiving, signed webhook routing, tenant
  matching, durable queue claim, retry-worker execution, attachment retrieval, and fail-closed
  quarantine when malware scanning is unavailable.
- [x] Live Supabase RLS probing proves one tenant cannot read another tenant's organization,
  membership, document, or invoice records. The reusable two-tenant test at
  `src/lib/integration/tenant-isolation.live.integration.test.ts` also verifies authenticated
  API reads and denied cross-tenant writes; run it with `npm run test:integration:live` from an
  environment containing real Supabase server credentials. Private files remain server-only and
  still need an authenticated route-level cross-tenant regression test before broad launch.
- [ ] End-to-end tests cover upload, deduplication, malware outcomes, extraction versioning, correction, approval, opportunity creation, baseline acceptance, later-invoice comparison, and human verification.
- [ ] Prompt-injection fixtures prove document text cannot reveal secrets, change policy, expand tools, approve action, or create external side effects.
- [ ] A restore exercise proves database and private-document recovery; a deletion exercise proves the documented retention/deletion process.
- [ ] The full CI gate passes on the exact release commit and the deployed Preview is manually checked on desktop, iPhone-size, and tablet-size layouts.

## Safe pilot definition

A pilot may start after the scanner, secrets, tenant-isolation tests, evaluation fixtures, monitoring, and legal/customer agreements are ready. Vendor cancellation, payment changes, contract acceptance, supplier selection, automatic referral, and autonomous outbound communication remain out of scope until their specific adapters, consent, approvals, idempotency, and reconciliation tests exist.
