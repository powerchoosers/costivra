-- Packet 04: Explicit deny policies for server-only operational tables.
-- These tables are manipulated exclusively by backend server services.
-- Adding explicit deny policies clears Supabase RLS security advisors
-- and enforces defense-in-depth across anon and authenticated roles.

-- 1. billing_checkout_intents
drop policy if exists "deny browser access to billing_checkout_intents" on public.billing_checkout_intents;
create policy "deny browser access to billing_checkout_intents"
  on public.billing_checkout_intents for all to anon, authenticated using (false) with check (false);
revoke all on table public.billing_checkout_intents from anon, authenticated;

-- 2. billing_customers
drop policy if exists "deny browser access to billing_customers" on public.billing_customers;
create policy "deny browser access to billing_customers"
  on public.billing_customers for all to anon, authenticated using (false) with check (false);
revoke all on table public.billing_customers from anon, authenticated;

-- 3. billing_entitlements
drop policy if exists "deny browser access to billing_entitlements" on public.billing_entitlements;
create policy "deny browser access to billing_entitlements"
  on public.billing_entitlements for all to anon, authenticated using (false) with check (false);
revoke all on table public.billing_entitlements from anon, authenticated;

-- 4. billing_events
drop policy if exists "deny browser access to billing_events" on public.billing_events;
create policy "deny browser access to billing_events"
  on public.billing_events for all to anon, authenticated using (false) with check (false);
revoke all on table public.billing_events from anon, authenticated;

-- 5. billing_plan_catalog
drop policy if exists "deny browser access to billing_plan_catalog" on public.billing_plan_catalog;
create policy "deny browser access to billing_plan_catalog"
  on public.billing_plan_catalog for all to anon, authenticated using (false) with check (false);
revoke all on table public.billing_plan_catalog from anon, authenticated;

-- 6. billing_subscriptions
drop policy if exists "deny browser access to billing_subscriptions" on public.billing_subscriptions;
create policy "deny browser access to billing_subscriptions"
  on public.billing_subscriptions for all to anon, authenticated using (false) with check (false);
revoke all on table public.billing_subscriptions from anon, authenticated;

-- 7. category_eval_cases
drop policy if exists "deny browser access to category_eval_cases" on public.category_eval_cases;
create policy "deny browser access to category_eval_cases"
  on public.category_eval_cases for all to anon, authenticated using (false) with check (false);
revoke all on table public.category_eval_cases from anon, authenticated;

-- 8. category_evaluation_runs
drop policy if exists "deny browser access to category_evaluation_runs" on public.category_evaluation_runs;
create policy "deny browser access to category_evaluation_runs"
  on public.category_evaluation_runs for all to anon, authenticated using (false) with check (false);
revoke all on table public.category_evaluation_runs from anon, authenticated;

-- 9. category_research_runs
drop policy if exists "deny browser access to category_research_runs" on public.category_research_runs;
create policy "deny browser access to category_research_runs"
  on public.category_research_runs for all to anon, authenticated using (false) with check (false);
revoke all on table public.category_research_runs from anon, authenticated;

-- 10. crm_outreach_suppressions
drop policy if exists "deny browser access to crm_outreach_suppressions" on public.crm_outreach_suppressions;
create policy "deny browser access to crm_outreach_suppressions"
  on public.crm_outreach_suppressions for all to anon, authenticated using (false) with check (false);
revoke all on table public.crm_outreach_suppressions from anon, authenticated;

-- 11. crm_outreach_unsubscribe_tokens
drop policy if exists "deny browser access to crm_outreach_unsubscribe_tokens" on public.crm_outreach_unsubscribe_tokens;
create policy "deny browser access to crm_outreach_unsubscribe_tokens"
  on public.crm_outreach_unsubscribe_tokens for all to anon, authenticated using (false) with check (false);
revoke all on table public.crm_outreach_unsubscribe_tokens from anon, authenticated;

-- 12. crm_sequence_enrollments
drop policy if exists "deny browser access to crm_sequence_enrollments" on public.crm_sequence_enrollments;
create policy "deny browser access to crm_sequence_enrollments"
  on public.crm_sequence_enrollments for all to anon, authenticated using (false) with check (false);
revoke all on table public.crm_sequence_enrollments from anon, authenticated;

-- 13. crm_sequence_events
drop policy if exists "deny browser access to crm_sequence_events" on public.crm_sequence_events;
create policy "deny browser access to crm_sequence_events"
  on public.crm_sequence_events for all to anon, authenticated using (false) with check (false);
revoke all on table public.crm_sequence_events from anon, authenticated;

-- 14. crm_sequence_steps
drop policy if exists "deny browser access to crm_sequence_steps" on public.crm_sequence_steps;
create policy "deny browser access to crm_sequence_steps"
  on public.crm_sequence_steps for all to anon, authenticated using (false) with check (false);
revoke all on table public.crm_sequence_steps from anon, authenticated;

-- 15. crm_sequence_worker_runs
drop policy if exists "deny browser access to crm_sequence_worker_runs" on public.crm_sequence_worker_runs;
create policy "deny browser access to crm_sequence_worker_runs"
  on public.crm_sequence_worker_runs for all to anon, authenticated using (false) with check (false);
revoke all on table public.crm_sequence_worker_runs from anon, authenticated;

-- 16. crm_sequences
drop policy if exists "deny browser access to crm_sequences" on public.crm_sequences;
create policy "deny browser access to crm_sequences"
  on public.crm_sequences for all to anon, authenticated using (false) with check (false);
revoke all on table public.crm_sequences from anon, authenticated;

-- 17. document_security_scan_attempts
drop policy if exists "deny browser access to document_security_scan_attempts" on public.document_security_scan_attempts;
create policy "deny browser access to document_security_scan_attempts"
  on public.document_security_scan_attempts for all to anon, authenticated using (false) with check (false);
revoke all on table public.document_security_scan_attempts from anon, authenticated;

-- 18. organization_onboarding
drop policy if exists "deny browser access to organization_onboarding" on public.organization_onboarding;
create policy "deny browser access to organization_onboarding"
  on public.organization_onboarding for all to anon, authenticated using (false) with check (false);
revoke all on table public.organization_onboarding from anon, authenticated;

-- 19. report_communication_preferences
drop policy if exists "deny browser access to report_communication_preferences" on public.report_communication_preferences;
create policy "deny browser access to report_communication_preferences"
  on public.report_communication_preferences for all to anon, authenticated using (false) with check (false);
revoke all on table public.report_communication_preferences from anon, authenticated;

-- 20. report_delivery_recipients
drop policy if exists "deny browser access to report_delivery_recipients" on public.report_delivery_recipients;
create policy "deny browser access to report_delivery_recipients"
  on public.report_delivery_recipients for all to anon, authenticated using (false) with check (false);
revoke all on table public.report_delivery_recipients from anon, authenticated;

-- 21. report_delivery_runs
drop policy if exists "deny browser access to report_delivery_runs" on public.report_delivery_runs;
create policy "deny browser access to report_delivery_runs"
  on public.report_delivery_runs for all to anon, authenticated using (false) with check (false);
revoke all on table public.report_delivery_runs from anon, authenticated;

-- 22. report_schedules
drop policy if exists "deny browser access to report_schedules" on public.report_schedules;
create policy "deny browser access to report_schedules"
  on public.report_schedules for all to anon, authenticated using (false) with check (false);
revoke all on table public.report_schedules from anon, authenticated;
