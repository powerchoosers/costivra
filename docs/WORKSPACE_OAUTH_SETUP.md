# Costivra workspace OAuth setup

Costivra's Google and Microsoft buttons use Supabase Auth. The application code and secure callback
already exist; the buttons remain disabled until the corresponding provider is configured.

## Shared Supabase configuration

1. In the Costivra Supabase project, open **Authentication → URL Configuration**.
2. Keep `https://costivra.ai` as the production site URL.
3. Add `https://costivra.ai/auth/callback` to the redirect allowlist.
4. For local testing, also allow `http://localhost:3000/auth/callback`.

The OAuth application callback supplied to Google or Microsoft is Supabase's callback, not the
Costivra application callback:

`https://skfocjrykyvsaviyhdea.supabase.co/auth/v1/callback`

## Google Workspace

1. Create or select a Google Cloud project.
2. Configure its OAuth consent screen with the verified `costivra.ai` domain.
3. Create a **Web application** OAuth client.
4. Add the Supabase callback URL above as an authorized redirect URI.
5. In **Supabase → Authentication → Providers → Google**, enable Google and save the client ID and
   client secret.
6. In Vercel, set `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=1` for Production and Preview, then redeploy.

## Microsoft / Outlook

1. In Microsoft Entra, register a web application.
2. Choose the supported account audience. For a B2B pilot, organizational accounts are the safer
   default; broaden it only if personal Microsoft accounts are a product requirement.
3. Add the Supabase callback URL above as the web redirect URI.
4. Create a client secret and record its value before leaving the Entra screen.
5. In **Supabase → Authentication → Providers → Azure**, enable Azure and save the application
   client ID, client secret, and tenant URL appropriate to the audience.
6. In Vercel, set `NEXT_PUBLIC_MICROSOFT_OAUTH_ENABLED=1` for Production and Preview, then redeploy.

## Verification

Test each provider with an account that does not already have a Costivra session:

1. Open an incognito browser at `https://costivra.ai/login`.
2. Choose the provider and confirm the real provider-hosted account chooser opens.
3. Complete authentication and confirm Costivra returns through `/auth/callback` to `/access`.
4. Confirm a new customer receives an organization membership, while an existing customer lands in
   the correct organization workspace.
5. Confirm a user without membership sees the no-access screen and cannot reach `/app` or `/manage`.

Do not enable a Vercel feature flag before the matching Supabase provider is active. Client secrets
belong only in Supabase's provider settings; never put them in `NEXT_PUBLIC_` variables or commit
them to the repository.
