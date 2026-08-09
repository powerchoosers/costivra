-- Packet 04: explicit customer communication preferences and noise control.
create table if not exists public.report_communication_preferences (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  immediate_finding_alerts boolean not null default true,
  review_alerts boolean not null default true,
  approval_requests boolean not null default true,
  missed_bill_alerts boolean not null default true,
  weekly_digest boolean not null default true,
  monthly_executive_report boolean not null default true,
  allow_empty_reports boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.report_communication_preferences enable row level security;
revoke all on public.report_communication_preferences from anon, authenticated;
grant all on public.report_communication_preferences to service_role;

comment on table public.report_communication_preferences is 'Tenant communication preferences; server routes enforce authorized recipients and empty-report policy.';
