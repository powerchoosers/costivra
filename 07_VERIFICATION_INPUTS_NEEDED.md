# What I Need From Lewis for Final Verification

## Current state

The complete code change is committed and pushed to `main`.

The commit to verify is:

```text
76521844f462d3545b21c282c0b931703e807417
```

Automated checks already pass: TypeScript, lint with two existing warnings, unit tests, production build, and whitespace validation.

The remaining work is live verification: proving that the deployed application, Supabase schema, private document flow, evidence links, and cleanup behavior all work together.

> Update: Lewis authorized the verification work after this checklist was created. The local/live-Supabase verification has now been performed and is recorded in [08_LIVE_VERIFICATION_REPORT.md](08_LIVE_VERIFICATION_REPORT.md). This file remains the reusable input checklist for the remaining production-release gates.

## What I need from you

### 1. Permission to apply the pending Supabase migrations

The code includes these migrations, but the last read-only schema check showed that the corresponding live columns were not yet present:

```text
supabase/migrations/20260806171657_bill_upload_security_provenance.sql
supabase/migrations/20260806195000_add_operator_account_phone.sql
supabase/migrations/20260806210000_txu_invoice_semantics_and_identity.sql
supabase/migrations/20260806213000_evidence_source_keys.sql
supabase/migrations/20260806220000_finding_trust_and_sample_workspaces.sql
```

Please explicitly tell me:

```text
Apply the five pending Costivra migrations: YES
```

I will apply them only to the Costivra Supabase project, verify the resulting schema, and check the Supabase security/performance advisors afterward.

### 2. A disposable test workspace

Please provide one of these:

- permission to create a temporary test organization and test records; or
- the ID/name of an existing disposable organization that may be used and cleaned up.

The test workspace should not contain important customer data. The verification creates temporary documents, invoices, locations, notifications, audit events, and related records.

Please also confirm whether I may delete the temporary records after testing:

```text
Create/use disposable test workspace: ____________________
Cleanup temporary records afterward: YES / NO
```

### 3. A test login with the right role

I need an authenticated user who can use the portal upload flow and, if we verify the operator screens, an operator/owner account as well.

Use a disposable test account if possible. Do not paste a password, session cookie, API key, or secret into chat. You can sign in through the browser when prompted or configure the existing local/Vercel secret store.

```text
Portal test account ready: YES / NO
Operator test account ready: YES / NO / NOT NEEDED
```

### 4. The two private TXU test PDFs, if real-document verification is desired

For a realistic extraction check, place the two private PDFs in an ignored local folder and tell me their local paths:

```text
Dallas-layout PDF: ____________________
Carried-balance PDF: __________________
```

These files must stay private and must not be committed. If you do not want to use real PDFs, the committed de-identified text fixtures are enough for automated verification, but they do not prove the complete browser upload and PDF-rendering experience.

### 5. The environment to verify

Tell me which environment is the release target:

```text
Target: LOCAL / VERCEL PREVIEW / PRODUCTION
URL: ____________________
```

For a deployed verification, the deployment must use commit `76521844f462d3545b21c282c0b931703e807417` or a later deployment that contains it.

### 6. Confirmation that required server settings are configured

I only need confirmation that the settings exist in the appropriate environment. Do not send their values in chat.

```text
NEXT_PUBLIC_SUPABASE_URL: configured
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: configured
SUPABASE_SECRET_KEY: configured server-side
OPEN_ROUTER_API_KEY: configured server-side if live AI extraction is required
```

If a setting is missing, tell me its name only. I can then explain where it belongs and what behavior will be unavailable.

## What I will verify after receiving the above

1. Apply and verify the five Supabase migrations.
2. Confirm tenant isolation and authenticated access for the test workspace.
3. Upload each test document and verify file validation, scan status, extraction status, and deduplication behavior.
4. Confirm the upload modal closes cleanly and produces one useful notification.
5. Open the bill breakdown from the notification and verify current charges, amount due, prior-balance treatment, and exact-cent reconciliation.
6. Verify account, meter, service address, utility, usage, demand, and location matching behavior.
7. Verify page-aware source evidence and line-item provenance.
8. Confirm unsupported or incomplete tariff information is clearly marked instead of presented as fact.
9. Confirm cross-tenant access is rejected.
10. Test desktop and mobile layouts, including the main upload and breakdown states.
11. Review application errors, Supabase records, audit events, and deployment logs.
12. Clean up disposable records and report the final verdict with the tested commit and deployment identity.

## Copy and send this reply

```text
Apply the five pending Costivra migrations: YES / NO
Test workspace or permission to create one: ____________________
Cleanup temporary records: YES / NO
Portal test account ready: YES / NO
Operator test account ready: YES / NO / NOT NEEDED
Target environment and URL: ____________________
Real TXU PDFs available locally: YES / NO
Required server settings configured: YES / NO / UNKNOWN
```

## Security reminders

- Never paste passwords, API keys, service-role keys, session cookies, private PDFs, or production customer data into chat.
- Use a disposable workspace and disposable test accounts whenever possible.
- Keep real documents in an ignored local/private location.
- If production verification is not necessary, use a Vercel preview or local environment instead.
