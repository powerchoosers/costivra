# Manual pilot owner actions

These actions require owner access and are intentionally not automated by the finish-line coding work.

## Enable Supabase leaked-password protection

- Project: `skfocjrykyvsaviyhdea` (Supabase, `us-east-2`).
- Dashboard path: Authentication → Policies / Password security → enable leaked-password protection.
- Current warning: `auth_leaked_password_protection` — leaked password protection is disabled.
- Verification: rerun the Supabase security advisor for the project and confirm this warning is absent.
- Owner: Lewis.

## Configure operations alert recipient

Provide a monitored human mailbox as `COSTIVRA_OPERATIONS_ALERT_EMAIL` in the protected Vercel environments. Do not use a reserved, example, or `.invalid` address for live delivery.

## Protected production certification

After the final branch is reviewed, owner approval is required before deployment, live scanner probes, real alert email, historical synthetic-vendor deletion, or dispatching `.github/workflows/pilot-release-certify.yml` with the exact final SHA and Vercel deployment ID.
