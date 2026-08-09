-- Packet 10: durable, tenant-scoped onboarding progress.
-- Progress is a resumable projection of authoritative records. It is not a
-- replacement for those records and must never be used to bypass their checks.

create table if not exists public.organization_onboarding (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  source text not null default 'internal' check (source in ('pilot_invite', 'paid_checkout', 'internal')),
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'activated', 'blocked')),
  current_step text not null default 'account_confirmed' check (current_step in ('account_confirmed', 'company_profile', 'documents', 'review', 'monitoring', 'complete')),
  company_completed_at timestamptz,
  location_completed_at timestamptz,
  documents_completed_at timestamptz,
  review_completed_at timestamptz,
  monitoring_selected_at timestamptz,
  monitoring_completed_at timestamptz,
  activated_at timestamptz,
  blocked_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'blocked' and blocked_reason is not null and length(trim(blocked_reason)) > 0)
      or status <> 'blocked')
);

alter table public.organization_onboarding enable row level security;
revoke all on public.organization_onboarding from anon, authenticated;
grant all on public.organization_onboarding to service_role;

create index if not exists organization_onboarding_status_idx
  on public.organization_onboarding (status, updated_at desc);

comment on table public.organization_onboarding is 'Durable onboarding projection; authoritative records remain the source of truth for activation.';
