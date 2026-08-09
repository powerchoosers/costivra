-- Packet 04: preserve delivery truth per report recipient.
-- A report run can target several authorized people. The run remains a
-- summary, while this table records the idempotency key, provider reference,
-- and retry state for each individual address.

create table if not exists public.report_delivery_recipients (
  id uuid primary key default gen_random_uuid(),
  delivery_run_id uuid not null references public.report_delivery_runs(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recipient_email text not null check (recipient_email = lower(recipient_email)),
  idempotency_key text not null unique,
  external_side_effect_id uuid references public.external_side_effects(id) on delete set null,
  provider_message_id text,
  status text not null default 'pending' check (status in (
    'pending','claimed','accepted','delivered','failed','bounced',
    'complained','suppressed','skipped'
  )),
  safe_error text,
  sent_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (delivery_run_id, recipient_email)
);

create or replace function public.enforce_report_delivery_recipient_organization()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_run_organization_id uuid;
begin
  select organization_id into v_run_organization_id
  from public.report_delivery_runs
  where id = new.delivery_run_id;
  if v_run_organization_id is null or v_run_organization_id <> new.organization_id then
    raise exception 'Report delivery recipient organization does not match its delivery run';
  end if;
  return new;
end;
$$;

drop trigger if exists report_delivery_recipients_organization on public.report_delivery_recipients;
create trigger report_delivery_recipients_organization
before insert or update of delivery_run_id, organization_id
on public.report_delivery_recipients
for each row execute function public.enforce_report_delivery_recipient_organization();

create index if not exists report_delivery_recipients_run_idx
  on public.report_delivery_recipients (delivery_run_id, status);
create index if not exists report_delivery_recipients_org_idx
  on public.report_delivery_recipients (organization_id, created_at desc);
create index if not exists report_delivery_recipients_provider_idx
  on public.report_delivery_recipients (provider_message_id)
  where provider_message_id is not null;
create index if not exists report_delivery_recipients_side_effect_idx
  on public.report_delivery_recipients (external_side_effect_id)
  where external_side_effect_id is not null;

alter table public.report_delivery_recipients enable row level security;
revoke all on public.report_delivery_recipients from anon, authenticated;
grant all on public.report_delivery_recipients to service_role;

comment on table public.report_delivery_recipients is
  'Per-recipient report delivery state; service-role only and reconciled from Resend webhooks.';
