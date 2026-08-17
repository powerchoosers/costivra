-- Per-member first-run workspace tour state. Organization activation remains
-- separate; this table only records whether this person has seen the tour.
create table if not exists public.member_workspace_tutorials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  version integer not null default 1 check (version >= 1),
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed', 'skipped')),
  current_step integer not null default 0 check (current_step >= 0),
  completed_at timestamptz,
  skipped_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id, version)
);

alter table public.member_workspace_tutorials enable row level security;
revoke all on public.member_workspace_tutorials from anon, authenticated;
grant all on public.member_workspace_tutorials to service_role;
drop policy if exists "deny browser access to member workspace tutorials" on public.member_workspace_tutorials;
create policy "deny browser access to member workspace tutorials"
  on public.member_workspace_tutorials for all to anon, authenticated using (false) with check (false);

comment on table public.member_workspace_tutorials is 'Per-member first-run guided tour state for the authenticated Costivra workspace.';
