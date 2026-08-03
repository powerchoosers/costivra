-- These tables are intentionally server-only. Explicit false policies document
-- that boundary for reviewers and database advisors; revoked table privileges
-- remain the first layer of enforcement.

drop policy if exists "deny browser access to retention runs"
  on public.retention_runs;
create policy "deny browser access to retention runs"
  on public.retention_runs
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "deny browser access to account enrichments"
  on public.crm_account_enrichments;
create policy "deny browser access to account enrichments"
  on public.crm_account_enrichments
  for all
  to anon, authenticated
  using (false)
  with check (false);
