# Costivra production launch checklist

This is the short list of work that cannot be completed honestly with code alone. Costivra should begin with a controlled pilot, not broad self-serve availability.

## Lewis must provide or decide

- [ ] Choose and fund a malware scanner. The existing Cloudmersive adapter is the fastest path; a provider-neutral HTTP adapter is also supported. Until configured, inbound and uploaded source files remain safely quarantined and cannot be processed.
- [ ] Supply a de-identified evaluation set: at least 20 software invoices, 20 telecom/internet invoices, and 10 scanned examples, including clean, incomplete, contradictory, and arithmetic-error cases. Do not send real customer files without permission and de-identification. The evaluator, private ignored directory, strict manifest parser, and operator instructions are ready in `docs/INVOICE_EXTRACTION_EVALUATION.md`.
- [ ] Ask qualified counsel to approve the Privacy Policy, Terms, UCEP relationship disclosure, consent wording, retention/deletion policy, and performance-fee method before charging customers or sharing an energy case.
- [ ] Upgrade Supabase if leaked-password protection is required for launch, then enable it in Authentication settings. The current plan does not expose that control.
- [ ] Name an incident owner and a support channel for security, failed intake, incorrect extraction, and provider outages.
- [ ] Decide the first pilot tenants and restrict onboarding to them until the evaluation and cross-tenant security gates pass.
- [x] Costivra uses its own Supabase project. A fresh schema inventory confirmed that no Luxor or
  Nodal tables share the project. Browser table grants are now explicitly least-privilege in
  addition to tenant-scoped RLS.

## Configuration to complete

- [ ] Add the selected malware-scanner secret to local, Vercel Preview, and Vercel Production environments. Never use a `NEXT_PUBLIC_` name for it.
- [ ] Confirm Vercel has server-only OpenRouter, Supabase secret, Resend API, and Resend webhook secrets plus browser-safe Supabase URL/publishable key in each intended environment.
- [ ] Replace the redacted `SUPABASE_SECRET_KEY` placeholder in the ignored local `.env.local` file with the Costivra project secret, then run `npm run test:integration:live`. Vercel intentionally does not reveal shared sensitive values through `vercel env pull`, so this one local setup step must be completed from the Supabase dashboard; never paste the value into chat or commit it.
- [x] Owners have a manual production-readiness check in **Manage → Settings**. Run it after changing a key, domain, webhook, worker, or provider. It reports service state without returning secret values; it does not replace the live clean/infected scanner exercise or the golden invoice evaluation.
- [x] `/status` now reports a sanitized live customer-facing state for the website, workspace,
  intake, and extraction. It intentionally excludes secret values, internal queue details, tenant
  data, and optional Apollo enrichment. This is an in-product signal, not a substitute for external
  uptime and error monitoring.
- [ ] Configure production SMTP/auth email branding, delivery monitoring, and redirect URLs for `https://costivra.ai`.
- [ ] The built-in one-minute watchdog now alerts Costivra operators about dead-lettered, stuck,
  and aging-quarantine invoice emails without duplicate notification spam. Connect an external
  error-monitoring provider before broad launch for failed uploads, extraction exceptions, webhook
  signature failures, value-engine failures, and ambiguous external effects. Internal alerts now
  open the event-specific `/manage/intake/[id]` recovery view, where operators can inspect file
  states, retry terminal queue failures, and rescan quarantine only after the scanner is configured.
- [ ] Approve the retention windows, off-platform Storage backup, and legal-hold procedure. The
  protected daily worker, report-only default, bounded configuration, retention holds, Storage-first
  deletion, server-only ledger, expired-original UI, and operator readiness signal are implemented.
  Quarantine defaults to a 30-day report window; originals remain indefinitely until Lewis sets an
  approved window and explicitly enables enforcement. Extracted, audit, and deleted-organization
  windows remain counsel/operations decisions.

## Release evidence required

- [ ] Golden-set extraction evaluation passes agreed precision/recall and evidence-citation thresholds for critical invoice fields. `npm run eval:invoices` now runs the production parser/model path, verifies minimum segment/scan coverage, exact fields and line items, grounded evidence, reconciliation, review routing, and error budget, and exits non-zero on failure. CI replays a deterministic smoke prediction, but only Lewis's real de-identified set can satisfy this release gate.
- [x] A real Resend production probe proves sending, receiving, signed webhook routing, tenant
  matching, durable queue claim, retry-worker execution, attachment retrieval, and fail-closed
  quarantine when malware scanning is unavailable.
- [x] Live Supabase RLS probing proves one tenant cannot read another tenant's organization,
  membership, document, or invoice records. The reusable two-tenant test at
  `src/lib/integration/tenant-isolation.live.integration.test.ts` also verifies authenticated
  API reads and denied cross-tenant writes; run it with `npm run test:integration:live` from an
  environment containing real Supabase server credentials. The private document download route
  now has a regression test proving a foreign document produces `404` without requesting a signed
  storage URL.
- [ ] End-to-end tests cover upload, deduplication, malware outcomes, extraction versioning, correction, approval, opportunity creation, baseline acceptance, later-invoice comparison, and human verification. The reusable live Supabase suite now proves cross-tenant reads/writes, correction-ledger persistence, reconciliation, fail-closed approval, idempotent expense creation, reviewer attribution, and audit events. Rollback-only production probes passed for invoice approval and the complete atomic opportunity/action/baseline/comparison/verification database sequence. Authenticated browser coverage for the complete customer sequence and a live clean/infected scanner exercise remain open.
- [x] Manual portal uploads fail closed before AI extraction: clean files may process, infected files
  are rejected, unavailable scans are privately quarantined, quarantined downloads are blocked,
  and a digest-verified rescan can release the file. Policy, intake-boundary, authorization, and
  download-route regressions are automated. A live clean/infected scanner exercise remains part of
  the broader end-to-end gate above.
- [x] A synthetic prompt-injection invoice proves hostile instructions remain inside the bounded
  source-text payload. The parser discards secret/action/approval fields and non-allowlisted
  evidence; extraction has no tools or mutation authority. Continue expanding this adversarial set
  as real document formats are added.
- [ ] A restore exercise proves database and private-document recovery; a deletion exercise proves the documented retention/deletion process.
- [ ] The full CI gate passes on the exact release commit and the deployed Preview is manually checked on desktop, iPhone-size, and tablet-size layouts.

## Safe pilot definition

A pilot may start after the scanner, secrets, tenant-isolation tests, evaluation fixtures, monitoring, and legal/customer agreements are ready. Vendor cancellation, payment changes, contract acceptance, supplier selection, automatic referral, and autonomous outbound communication remain out of scope until their specific adapters, consent, approvals, idempotency, and reconciliation tests exist.
