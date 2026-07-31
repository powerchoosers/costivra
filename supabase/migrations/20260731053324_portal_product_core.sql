alter table public.organizations
  add column if not exists settings jsonb not null default '{"require_mfa":true,"mask_account_identifiers":true,"notify_external_actions":true,"allow_anonymized_benchmarks":false}'::jsonb,
  add column if not exists primary_contact_name text,
  add column if not exists review_threshold numeric(14,2) not null default 10000;

alter table public.documents
  add column if not exists document_type text,
  add column if not exists organization_vendor_id uuid references public.organization_vendors(id) on delete set null,
  add column if not exists extraction_summary text;

alter table public.opportunities
  add column if not exists priority text not null default 'medium' check (priority in ('high','medium','low')),
  add column if not exists deadline_at timestamptz,
  add column if not exists category text;

alter table public.action_plans
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists action_type text,
  add column if not exists priority text not null default 'medium' check (priority in ('high','medium','low')),
  add column if not exists due_at timestamptz,
  add column if not exists completed_at timestamptz;

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  organization_vendor_id uuid not null references public.organization_vendors(id) on delete cascade,
  expense_account_id uuid references public.expense_accounts(id) on delete set null,
  document_id uuid references public.documents(id) on delete set null,
  category text not null,
  period_start date not null,
  period_end date not null,
  amount numeric(14,2) not null check (amount >= 0),
  prior_period_amount numeric(14,2) check (prior_period_amount is null or prior_period_amount >= 0),
  currency text not null default 'USD',
  status text not null default 'reviewed' check (status in ('processing','needs_review','reviewed','archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end >= period_start)
);

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  organization_vendor_id uuid not null references public.organization_vendors(id) on delete cascade,
  expense_account_id uuid references public.expense_accounts(id) on delete set null,
  document_id uuid references public.documents(id) on delete set null,
  title text not null,
  category text not null,
  start_date date,
  end_date date,
  notice_period_days integer check (notice_period_days is null or notice_period_days >= 0),
  annual_value numeric(14,2) check (annual_value is null or annual_value >= 0),
  currency text not null default 'USD',
  status text not null default 'active' check (status in ('draft','active','renewal_review','expiring','expired','terminated')),
  auto_renews boolean not null default false,
  owner_name text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create table if not exists public.savings_outcomes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  title text not null,
  value_type text not null check (value_type in ('annual_savings','one_time_credit','avoided_cost')),
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null default 'USD',
  method text not null,
  status text not null default 'pending' check (status in ('pending','verified','rejected')),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null,
  display_name text not null,
  description text not null,
  status text not null default 'available' check (status in ('available','connected','paused','restricted','error')),
  last_synced_at timestamptz,
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider)
);

create table if not exists public.report_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text not null,
  report_type text not null,
  status text not null default 'ready' check (status in ('ready','generating','failed','disabled')),
  last_generated_at timestamptz,
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recipient_user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  resource_type text,
  resource_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  citations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists expenses_org_period_idx on public.expenses (organization_id, period_end desc);
create index if not exists expenses_vendor_idx on public.expenses (organization_vendor_id);
create index if not exists contracts_org_end_idx on public.contracts (organization_id, end_date);
create index if not exists savings_org_created_idx on public.savings_outcomes (organization_id, created_at desc);
create index if not exists notifications_org_unread_idx on public.notifications (organization_id, read_at, created_at desc);
create index if not exists chat_sessions_org_updated_idx on public.chat_sessions (organization_id, updated_at desc);
create index if not exists chat_messages_session_created_idx on public.chat_messages (session_id, created_at);

alter table public.expenses enable row level security;
alter table public.contracts enable row level security;
alter table public.savings_outcomes enable row level security;
alter table public.integrations enable row level security;
alter table public.report_definitions enable row level security;
alter table public.notifications enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

grant select on public.expenses, public.contracts, public.savings_outcomes,
  public.integrations, public.report_definitions, public.notifications,
  public.chat_sessions, public.chat_messages to authenticated;
revoke all on public.expenses, public.contracts, public.savings_outcomes,
  public.integrations, public.report_definitions, public.notifications,
  public.chat_sessions, public.chat_messages from anon;

create policy "Members read expenses" on public.expenses for select to authenticated
  using (exists (select 1 from public.organization_memberships m where m.organization_id = expenses.organization_id and m.user_id = (select auth.uid())));
create policy "Members read contracts" on public.contracts for select to authenticated
  using (exists (select 1 from public.organization_memberships m where m.organization_id = contracts.organization_id and m.user_id = (select auth.uid())));
create policy "Members read savings outcomes" on public.savings_outcomes for select to authenticated
  using (exists (select 1 from public.organization_memberships m where m.organization_id = savings_outcomes.organization_id and m.user_id = (select auth.uid())));
create policy "Members read integrations" on public.integrations for select to authenticated
  using (exists (select 1 from public.organization_memberships m where m.organization_id = integrations.organization_id and m.user_id = (select auth.uid())));
create policy "Members read reports" on public.report_definitions for select to authenticated
  using (exists (select 1 from public.organization_memberships m where m.organization_id = report_definitions.organization_id and m.user_id = (select auth.uid())));
create policy "Members read notifications" on public.notifications for select to authenticated
  using (exists (select 1 from public.organization_memberships m where m.organization_id = notifications.organization_id and m.user_id = (select auth.uid())) and (notifications.recipient_user_id is null or notifications.recipient_user_id = (select auth.uid())));
create policy "Members read chat sessions" on public.chat_sessions for select to authenticated
  using (exists (select 1 from public.organization_memberships m where m.organization_id = chat_sessions.organization_id and m.user_id = (select auth.uid())) and (chat_sessions.user_id is null or chat_sessions.user_id = (select auth.uid())));
create policy "Members read chat messages" on public.chat_messages for select to authenticated
  using (exists (select 1 from public.chat_sessions s join public.organization_memberships m on m.organization_id = s.organization_id where s.id = chat_messages.session_id and m.user_id = (select auth.uid()) and (s.user_id is null or s.user_id = (select auth.uid()))));
