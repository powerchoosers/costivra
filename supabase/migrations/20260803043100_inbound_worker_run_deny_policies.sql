-- Keep the operational ledger invisible even if browser-role grants drift in
-- a future migration. The server service role bypasses these deny policies.

drop policy if exists inbound_worker_runs_deny_browser_access
  on public.inbound_worker_runs;

create policy inbound_worker_runs_deny_browser_access
  on public.inbound_worker_runs
  for all
  to anon, authenticated
  using (false)
  with check (false);
