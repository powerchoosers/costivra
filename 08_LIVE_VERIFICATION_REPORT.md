# Live Verification Report

## Date and release identity

- Date: August 6, 2026
- Repository: `powerchoosers/costivra`
- Branch: `main`
- Commit verified: `76521844f462d3545b21c282c0b931703e807417`
- Supabase project: `skfocjrykyvsaviyhdea` in `us-east-2`
- Environment verified: local Costivra app at `http://localhost:3000` using the connected Costivra Supabase project

## Database verification

The five pending migrations were applied successfully to the Costivra Supabase project. Supabase recorded them as:

```text
20260806220146  bill_upload_security_provenance
20260806220203  add_operator_account_phone
20260806220206  txu_invoice_semantics_and_identity
20260806220210  evidence_source_keys
20260806220213  finding_trust_and_sample_workspaces
```

Verified live afterward:

- Document security scan columns exist and the scan-attempt table has RLS enabled.
- The scan snapshot trigger exists and updates the document security state.
- Anonymous and authenticated browser roles cannot read or insert scan-attempt rows.
- Only `service_role` can read/insert scan-attempt rows or execute the scan trigger.
- Invoice balance, current-charge, credit, energy-service, location, and identity-match columns exist.
- Evidence source keys exist.
- Organization sample-workspace and opportunity trust fields exist.
- Existing opportunity records were classified into `demo_example`, `manual_note`, or `needs_evidence` without inventing evidence-backed claims.

Supabase advisors after the change show the existing leaked-password-protection warning, existing informational RLS/index findings, and the expected fail-closed notice that the server-only scan-attempt table has no browser policy. No new public browser access was introduced.

## Automated verification

Passed against the committed worktree:

```text
npm run typecheck
npm run lint                 # 0 errors; 2 existing app-shell warnings
npm test -- --run            # 117 files passed; 487 tests passed; 4 files and 6 tests skipped
npm run build
git diff --check
```

The authenticated end-to-end workflow also passed:

```text
RUN_AUTHENTICATED_E2E=1 PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:e2e:authenticated
1 passed; disposable workspace cleaned up
```

That workflow verified sign-in, stored invoice rendering, breakdown API `200`, opportunity approval, action approval, savings baseline acceptance, audit events, and the customer-facing trust guard for an unsupported dollar amount.

## Browser upload verification

Using a disposable account and workspace, the local browser flow uploaded the committed synthetic fixture:

```text
tests/fixtures/invoices/sample-utility-bill-crwwd.pdf
```

Observed results:

- Upload modal opened with the correct file type and 679.4 KB file size.
- The selected attachment card appeared with a remove/change control.
- The modal entered the secure upload, security check, and bill-reading state.
- Processing completed and the modal closed.
- The uploaded document appeared in the workspace with a `Needs Review` state.
- The stored document had `security_scan_status = clean`, safe code `clean`, and one scan attempt.
- The invoice stored `$76.00` total, `$76.00` amount due, `$76.00` current charges, and `reconciled` status.
- One extracted `SEWER SERVICE` line item stored `$76.00`.
- Two source-evidence references were stored on pages 1 and 2.
- Customer, account, and location matching remained appropriately unresolved/unmatched for this unassigned sample bill.
- Browser console error logs were empty during the verified flow.

The temporary organization, user, database records, and private storage object were removed after verification. The shared vendor record used by extraction was intentionally preserved.

## Remaining release limits

This report does not claim `BILL_UPLOAD_FLOW_READY` yet. The following evidence is still required for a production release verdict:

- Verify a Vercel deployment whose deployment SHA is the committed `main` SHA above.
- Run the two private TXU paired-balance PDFs through the same browser flow; keep them ignored/private and do not commit them.
- Capture the release screenshots at the required desktop and mobile viewports.
- Confirm the production upload notification is a single actionable toast and that the breakdown opens from that action.
- Repeat the primary flow on the intended production or preview URL after deployment.

Current verdict:

```text
INTERNAL_TESTING_ONLY
```
