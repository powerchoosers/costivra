# Costivra data retention operations

Costivra runs a protected retention worker every day at 03:17 UTC. It is deliberately
**report-only by default**. Report mode records what would be removed but never deletes a file.

## What the worker handles

- Manual-upload quarantine files and inbound-email quarantine attachments default to a 30-day
  candidate window.
- Approved original documents have no default deletion window. They remain untouched until an
  approved `RETENTION_ORIGINAL_DAYS` value is configured.
- A future legal or operational hold can be applied with `retention_hold_until`; the worker skips
  that item until the hold expires.
- Every run records its mode, effective policy, candidate counts, purge counts, failures, and
  timestamps in the server-only `retention_runs` ledger.

When enforcement removes an original, it uses the Supabase Storage API first. Only after Storage
confirms removal does Costivra mark `source_purged_at`. Extracted invoice fields, evidence,
corrections, and immutable provenance metadata remain available. The portal shows that the
original reached its retention limit instead of offering a broken download.

## Configuration

Keep every setting server-side in local ignored environment files and Vercel:

```text
RETENTION_ENFORCEMENT_ENABLED=0
RETENTION_QUARANTINE_DAYS=30
RETENTION_ORIGINAL_DAYS=
RETENTION_BATCH_SIZE=100
```

`RETENTION_ENFORCEMENT_ENABLED=1` is the explicit deletion switch. Do not enable it until the
customer terms, legal holds, original-file window, incident owner, and backup procedure are
approved. Values are bounded in code: quarantine 1–365 days, originals 1–3650 days, and batch
size 1–500.

## Activation sequence

1. Leave enforcement off and let at least one scheduled report run complete.
2. Review candidate counts in **Manage → Settings → Production readiness**.
3. Approve and set the quarantine and original-source windows.
4. Confirm an off-platform backup of private Storage objects exists. Supabase database backups
   contain Storage metadata but do not restore deleted Storage objects.
5. Test a disposable held file and a disposable expired file in a non-production environment.
6. Set `RETENTION_ENFORCEMENT_ENABLED=1`, deploy, and verify the next run is `completed`.
7. Keep the exact policy decision and test evidence with the incident/operations records.

The worker does not yet delete extracted rows, financial records, approval records, or audit
events. Those require counsel-approved, category-specific windows because deleting them can
remove evidence needed to explain customer decisions and charges.

References: [Supabase Storage deletion](https://supabase.com/docs/guides/storage/management/delete-objects),
[Supabase database backups](https://supabase.com/docs/guides/platform/backups).
