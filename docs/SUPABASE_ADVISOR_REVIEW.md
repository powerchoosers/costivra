# Supabase Advisor Review

**Project:** `skfocjrykyvsaviyhdea` (`Costivra`)  
**Review date:** August 15, 2026

## Before Packet 03 changes

- Security advisors: 23 findings — 22 `rls_enabled_no_policy` notices and one leaked-password-protection warning.
- Performance advisors: 153 findings at the initial capture, primarily unindexed foreign keys and unused indexes.
- The mutable search-path warning was present on `public.update_vendor_monitoring_configs_updated_at`.
- The trigger function was executable by `PUBLIC`, `anon`, and `authenticated` even though it is not a browser API.
- Linked schema lint also found invalid/unqualified references in both `manage_delete_empty_account` overloads and an ambiguous `sequence_id` reference in `activate_crm_sequence`.

## Changes applied

The following production migrations were applied and committed:

1. `packet_03_harden_vendor_monitoring_trigger`
   - sets `search_path = ''`;
   - uses `pg_catalog.now()`;
   - keeps the function `SECURITY INVOKER`;
   - revokes execution from `PUBLIC`, `anon`, and `authenticated`;
   - grants execution to `postgres` and `service_role`.
2. `packet_03_harden_privileged_function_references`
   - qualifies table columns in the privileged deletion and sequence functions;
   - removes ambiguity under an empty search path.
3. `packet_03_fix_account_delete_action_plan_scope`
   - follows `action_plans` through `opportunities`, its actual organization boundary;
   - preserves the fail-closed dependency check.

## After-change evidence

- `supabase db lint --linked --level warning --fail-on none`: **No schema errors found**.
- Trigger verification: `search_path = ''`, `SECURITY DEFINER = false`, and browser execution privileges are false.
- Security advisors: 23 findings — 22 service-only RLS/no-policy notices and one leaked-password-protection warning. The mutable search-path warning is gone.
- Performance advisors: 144 findings — 49 unindexed foreign keys, 9 `auth_rls_initplan`, 84 unused-index notices, one multiple-permissive-policy notice, and one Auth connection-strategy notice.

## RLS/no-policy classification

The service-only tables are intentionally deny-all for browser roles. They are accessed through server-side routes or privileged workers, not direct browser reads. No broad `TO authenticated USING (true)` policies were added.

The advisor-listed billing, scan-attempt, worker, report-delivery, onboarding, and sequence tables have RLS enabled with zero policies. Direct grant inspection showed service-role access for the operational tables. `category_eval_cases` and `category_research_runs` retain broad table grants but have no policies, so RLS still denies browser rows; revoking those unused grants is a separate defense-in-depth improvement and was not guessed into this packet.

## Auth decision

Leaked-password protection remains disabled. This is an explicit Supabase Auth/settings decision and is not represented as fixed. The owner must confirm plan availability, enable it if appropriate, and rerun the security advisors. Until then it remains a pilot security blocker.

## Deferred performance work

Unused indexes were not removed merely to reduce advisor count. Foreign-key and RLS-initplan findings require query-volume and write-overhead evidence before remediation. `vendor_categories` multiple-permissive-policy cleanup is also deferred until the intended read policy is confirmed.
