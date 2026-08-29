# Authenticated browser test setup

Authenticated App/Manage browser tests use a disposable Supabase organization
and clean it up when the run finishes. Configure these values in an ignored
`.env.local` file or in your shell; never commit the secret key.

```dotenv
RUN_AUTHENTICATED_E2E=1
E2E_ALLOW_PRODUCTION=0
PLAYWRIGHT_BASE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://skfocjrykyvsaviyhdea.supabase.co
E2E_SUPABASE_SECRET_KEY=<Supabase Secret key for the test project>
```

Keep `E2E_ALLOW_PRODUCTION=0` for local runs. Only set it to `1` after
confirming that the target is a disposable test project. The secret key is
server-only and is used to create and remove the temporary test records; it is
never sent to the browser.

Run the authenticated matrix with:

```bash
pnpm exec playwright test tests/e2e/authenticated-workspace.spec.ts
```
