# Supabase Environment and Migration Parity

## Current identity

| Item | Evidence | Result |
|---|---|---|
| Costivra production project | `skfocjrykyvsaviyhdea` | `ACTIVE_HEALTHY`, `us-east-2`, PostgreSQL 17 |
| Costivra project URL | `https://skfocjrykyvsaviyhdea.supabase.co` | Matches `.env.example` and authenticated GitHub workflow |
| Costivra custom auth URL | `https://auth.costivra.ai` | Accepted by the repository environment check |
| Separate Luxor project | `ofjvbzdwijjnajgjotmx` | Not used for Costivra |
| Vercel project | `costivra`, project `prj_pMAnjcRnNPD35PyXwNiUVz99N8Zc` | Repository linkage confirmed |

The Supabase project list contained exactly the Costivra and Luxor projects. No Costivra environment was changed to the Luxor ref.

## Deterministic checks

`npm run security:supabase-env` passed under Node 24.19.0. It verifies the local public URL, the authenticated GitHub workflow URL, rejects secret-looking `NEXT_PUBLIC_` variables, and scans `.next/static` for the actual configured server secret values without printing them.

The check inspected 48 static text assets. The only Supabase-related client-bundle match was a generic key-format detector; no configured secret value was present.

Vercel Production and Preview environment values could not be independently listed from this checkout because the Vercel CLI is not installed. The strict check therefore remains available through `--require-vercel` but was not claimed as passed. The repository contains the required environment names and the Vercel project identity; an owner must run the strict check against the actual scoped Vercel values.

## Migration parity

Supabase migration history contains 115 applied versions and ends at:

`20260815195430 packet_03_fix_account_delete_action_plan_scope`

The repository contains 96 migration files. 89 migration names match production exactly. The remaining differences are classified rather than silently renamed:

- **Repository-only names:** `portal_product_core`, `realtime_mail_notifications_and_attachments`, `durable_vendor_monitoring`, `ask_costivra_final_remediation`, `record_pages_completion`, `category_intelligence_taxonomy`, and `seed_canonical_taxonomy_and_insurance`.
- **Production-only names:** the original foundation/index migrations, the split `portal_product_core_*`, `durable_vendor_monitoring_*`, `realtime_mail_notifications_and_attachments_*`, `smoke_test_probe`, `cleanup_smoke_probe`, and timestamp-prefixed versions of several named migrations.
- **Interpretation:** production contains renamed, split, probe, and manually applied history that cannot be mapped safely by filename alone. No migration was deleted, rewritten, or falsely marked equivalent.

The three Packet 03 migrations are present locally and applied remotely:

- `20260815194625_packet_03_harden_vendor_monitoring_trigger`
- `20260815195314_packet_03_harden_privileged_function_references`
- `20260815195430_packet_03_fix_account_delete_action_plan_scope`

## Limitations and next action

Migration parity is structurally reconciled for the current head, but the historical rename/split differences need a human-reviewed mapping if a fully one-to-one history is required. No production migration was applied except the three narrowly scoped Packet 03 security/function fixes documented here.
