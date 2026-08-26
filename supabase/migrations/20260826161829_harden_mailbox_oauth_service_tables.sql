-- Applied migration version: 20260826161829.
-- The OAuth connection and state tables are service-only. Explicit deny
-- policies keep that boundary visible to both PostgreSQL and Supabase's
-- security advisor in addition to the existing browser-role revokes.

drop policy if exists "deny browser access to mailbox oauth connections"
  on public.mailbox_oauth_connections;

create policy "deny browser access to mailbox oauth connections"
  on public.mailbox_oauth_connections
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "deny browser access to mailbox oauth states"
  on public.mailbox_oauth_states;

create policy "deny browser access to mailbox oauth states"
  on public.mailbox_oauth_states
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on table public.mailbox_oauth_connections from anon, authenticated;
revoke all on table public.mailbox_oauth_states from anon, authenticated;
