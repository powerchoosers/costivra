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

The live suite does not replace malware-provider, OpenRouter accuracy, backup/restore, or full browser workflow testing.
