-- Customer-controlled partner routing. This records a request and its consent
-- boundary; it does not send customer data or create an external side effect.
create table if not exists public.partner_destinations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  category text not null,
  description text not null,
  disclosure_version text not null,
  disclosure_text text not null,
  status text not null default 'available'
    check (status in ('available', 'restricted', 'disabled')),
  external_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.partner_destinations (
  slug, display_name, category, description, disclosure_version, disclosure_text, status, external_enabled
)
values (
  'ucep-energy-review',
  'United Commercial Energy Partners',
  'Commercial energy review',
  'Optional disclosed energy-review destination. The customer chooses whether to request a review and what records may be shared.',
  'ucep-energy-review-v1',
  'Costivra has a business relationship with United Commercial Energy Partners. Costivra or its affiliates may receive compensation or another business benefit if you request this review. You are not required to use UCEP. Costivra does not select a supplier or guarantee savings.',
  'available',
  false
)
on conflict (slug) do update set
  display_name = excluded.display_name,
  description = excluded.description,
  disclosure_version = excluded.disclosure_version,
  disclosure_text = excluded.disclosure_text,
  status = excluded.status,
  external_enabled = excluded.external_enabled,
  updated_at = now();

create table if not exists public.partner_referral_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  destination_id uuid not null references public.partner_destinations(id),
  requested_by uuid not null references public.profiles(id),
  status text not null default 'consent_required'
    check (status in ('consent_required', 'consented', 'awaiting_approval', 'queued', 'sent', 'declined', 'cancelled', 'blocked')),
  purpose text not null,
  requested_scope jsonb not null default '{}'::jsonb,
  source_context jsonb not null default '{}'::jsonb,
  consent_id uuid,
  approval_id uuid references public.approvals(id) on delete set null,
  external_side_effect_id uuid references public.external_side_effects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.partner_referral_consents (
  id uuid primary key default gen_random_uuid(),
  referral_request_id uuid not null references public.partner_referral_requests(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  destination_id uuid not null references public.partner_destinations(id),
  actor_id uuid not null references public.profiles(id),
  disclosure_version text not null,
  disclosure_text text not null,
  purpose text not null,
  approved_scope jsonb not null default '{}'::jsonb,
  granted boolean not null,
  granted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check ((granted = false and granted_at is null) or (granted = true and granted_at is not null))
);

alter table public.partner_referral_requests
  add constraint partner_referral_requests_consent_fk
  foreign key (consent_id) references public.partner_referral_consents(id) on delete set null;

create index if not exists partner_referral_requests_org_created_idx
  on public.partner_referral_requests (organization_id, created_at desc);
create index if not exists partner_referral_requests_status_idx
  on public.partner_referral_requests (status, updated_at desc);
create index if not exists partner_referral_consents_request_idx
  on public.partner_referral_consents (referral_request_id, created_at desc);

alter table public.partner_destinations enable row level security;
alter table public.partner_referral_requests enable row level security;
alter table public.partner_referral_consents enable row level security;

revoke all on public.partner_destinations, public.partner_referral_requests, public.partner_referral_consents from anon, authenticated;
grant select on public.partner_destinations to authenticated;
grant select, insert, update on public.partner_referral_requests, public.partner_referral_consents to authenticated;

create policy "Authenticated users can view available partner destinations"
  on public.partner_destinations for select to authenticated
  using (status = 'available');

create policy "Members can view own organization referral requests"
  on public.partner_referral_requests for select to authenticated
  using (exists (select 1 from public.organization_memberships m where m.organization_id = partner_referral_requests.organization_id and m.user_id = (select auth.uid())));

create policy "Members can create own organization referral requests"
  on public.partner_referral_requests for insert to authenticated
  with check (exists (select 1 from public.organization_memberships m where m.organization_id = partner_referral_requests.organization_id and m.user_id = (select auth.uid())) and requested_by = (select auth.uid()));

create policy "Members can update own organization referral requests"
  on public.partner_referral_requests for update to authenticated
  using (exists (select 1 from public.organization_memberships m where m.organization_id = partner_referral_requests.organization_id and m.user_id = (select auth.uid())))
  with check (exists (select 1 from public.organization_memberships m where m.organization_id = partner_referral_requests.organization_id and m.user_id = (select auth.uid())));

create policy "Members can view own organization referral consents"
  on public.partner_referral_consents for select to authenticated
  using (exists (select 1 from public.organization_memberships m where m.organization_id = partner_referral_consents.organization_id and m.user_id = (select auth.uid())));

create policy "Members can create own organization referral consents"
  on public.partner_referral_consents for insert to authenticated
  with check (exists (select 1 from public.organization_memberships m where m.organization_id = partner_referral_consents.organization_id and m.user_id = (select auth.uid())) and actor_id = (select auth.uid()));

comment on table public.partner_referral_requests is
  'Customer-controlled partner routing requests. A request is not an external referral until consent, configured approval, and a separate idempotent side effect are all recorded.';
comment on table public.partner_referral_consents is
  'Append-only disclosure and purpose-specific consent evidence for partner routing.';
