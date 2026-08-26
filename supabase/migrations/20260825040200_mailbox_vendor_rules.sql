create table if not exists public.mailbox_vendor_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  mailbox_connection_id uuid not null references public.mailbox_oauth_connections(id) on delete cascade,
  organization_vendor_id uuid not null references public.organization_vendors(id) on delete cascade,
  sender_domains text[] not null default '{}',
  sender_addresses text[] not null default '{}',
  subject_terms text[] not null default '{}',
  enabled boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mailbox_connection_id, organization_vendor_id),
  constraint mailbox_vendor_rules_matcher_check check (cardinality(sender_domains) + cardinality(sender_addresses) + cardinality(subject_terms) > 0)
);

create index if not exists mailbox_vendor_rules_connection_idx on public.mailbox_vendor_rules (mailbox_connection_id, enabled);
create index if not exists mailbox_vendor_rules_org_idx on public.mailbox_vendor_rules (organization_id, enabled);
alter table public.mailbox_vendor_rules enable row level security;
grant select on public.mailbox_vendor_rules to authenticated;
revoke insert, update, delete on public.mailbox_vendor_rules from anon, authenticated;
create policy "Members read mailbox vendor rules" on public.mailbox_vendor_rules for select to authenticated
  using (exists (select 1 from public.organization_memberships m where m.organization_id = mailbox_vendor_rules.organization_id and m.user_id = (select auth.uid())));
comment on table public.mailbox_vendor_rules is 'Explicit organization-approved vendor matchers for direct mailbox attachment intake.';
