# Live database regression tests

Costivra keeps credential-gated integration tests separate from ordinary CI. They create uniquely named temporary tenants and records in Supabase, exercise real RLS and privileged database functions, and remove the fixtures afterward.

The suite currently proves:

- two authenticated tenants cannot read each other's organization or document rows;
- a browser client cannot write a document into another tenant;
- invoice approval rejects an unmatched vendor;
- invoice approval rejects unreconciled arithmetic;
- a human correction recalculates reconciliation and writes the correction ledger;
- repeated approval is idempotent and produces exactly one linked expense;
- approved invoice state, reviewer attribution, and internal audit entries persist.
- opportunity approval, action authorization, baseline acceptance, action start/completion, later
  evidence, and final savings verification execute through atomic database functions;
- a rejected premature action start leaves the action and opportunity unchanged;
- the complete financial workflow produces the required audit trail and cannot verify savings
  before a later comparison expense and active approved workflow exist.

## Required local environment

Use an ignored `.env.local` file containing real values for:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
```

`SUPABASE_SECRET_KEY` is server-only. Never prefix it with `NEXT_PUBLIC_`, commit it, paste it into documentation, or expose it to browser code.

Run:

```powershell
npm run test:integration:live
```

The command intentionally refuses redacted placeholders. The invoice workflow test also requires one active Costivra internal staff record because the production approval function rejects every other actor.

These tests are safe for a controlled production verification because fixture identifiers are random and cleanup runs in `afterAll`, but a non-production Supabase branch is preferable once the project plan supports routine branching. If a test process is forcibly terminated, search for organizations beginning with `Costivra workflow regression` or users beginning with `costivra-tenant-test-` and remove only those exact fixtures.

The live suite does not replace malware-provider, OpenRouter accuracy, or backup/restore testing.

## Authenticated browser regression

The credential-gated Playwright test creates one temporary customer owner and workspace, signs in through the real login page, approves an opportunity, approves its action, accepts the savings baseline, starts and completes the work, and verifies the final database states and audit events. Cleanup deletes the exact temporary organization, vendor, and Auth user even when an assertion fails.

Add these ignored local values:

```text
RUN_AUTHENTICATED_E2E=1
E2E_SUPABASE_SECRET_KEY=<Costivra server secret>
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100
```

For a deliberate test against `https://costivra.ai`, also set:

```text
E2E_ALLOW_PRODUCTION=1
PLAYWRIGHT_BASE_URL=https://costivra.ai
```

Then run:

```powershell
npm run test:e2e:authenticated
```

The remote safety flag is mandatory. The test refuses placeholders and build-only keys, never sends a confirmation email, uses only `@example.invalid`, checks the organization-name prefix before deletion, and runs the mutation sequence only once on desktop. If the process is forcibly terminated, remove only users beginning with `costivra-auth-e2e-` and organizations beginning with `Costivra authenticated E2E `.

GitHub also exposes the manual **Authenticated production regression** workflow. Lewis only needs to add `E2E_SUPABASE_SECRET_KEY` as a GitHub Actions secret before running it; the Costivra project URL is public and already fixed in the workflow. The server secret must belong to Costivra, never Luxor, and must not be added as a `NEXT_PUBLIC_` value.

`supabase/tests/atomic_financial_workflow.sql` is a second, rollback-only production probe. It uses
an existing owner identity only inside its transaction, creates an isolated temporary organization,
exercises every atomic workflow operation, asserts the final states and audit events, and rolls back
all rows. Run it with a trusted database administrator connection; do not paste it into a browser or
customer-facing SQL client.

`supabase/tests/browser_table_privileges.sql` verifies the database-level least-privilege boundary:
`anon` has no public-table grants, `authenticated` has tenant-scoped read access plus only the
allowlisted self-profile columns for updates, internal realtime notifications remain readable under
their recipient policy, and `service_role` retains the server operations used by Costivra APIs.

The retention migration adds only server-operated lifecycle fields and a server-only run ledger.
Run the worker in report mode first and follow `docs/DATA_RETENTION_OPERATIONS.md`; database
backups do not restore Storage objects removed by an enforcement pass.
