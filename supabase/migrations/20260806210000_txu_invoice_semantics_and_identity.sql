alter table public.invoices
  add column if not exists previous_balance numeric(18,2),
  add column if not exists payments_and_credits numeric(18,2),
  add column if not exists balance_forward numeric(18,2),
  add column if not exists current_charges numeric(18,2),
  add column if not exists current_period_credits numeric(18,2),
  add column if not exists energy_service jsonb,
  add column if not exists location_id uuid references public.locations(id) on delete set null,
  add column if not exists workspace_customer_match_status text not null default 'unknown',
  add column if not exists expense_account_match_status text not null default 'unknown',
  add column if not exists service_location_match_status text not null default 'unknown';

alter table public.invoices
  drop constraint if exists invoices_identity_match_status_check;

alter table public.invoices
  add constraint invoices_identity_match_status_check check (
    workspace_customer_match_status in ('matched','unmatched','ambiguous','unknown')
    and expense_account_match_status in ('matched','unmatched','ambiguous','unknown')
    and service_location_match_status in ('matched','unmatched','ambiguous','unknown')
  );

alter table public.invoices
  add constraint invoices_energy_amounts_nonnegative_check check (
    (previous_balance is null or previous_balance >= 0)
    and (payments_and_credits is null or payments_and_credits >= 0)
    and (balance_forward is null or balance_forward >= 0)
    and (current_charges is null or current_charges >= 0)
    and (current_period_credits is null or current_period_credits >= 0)
  );

create index if not exists invoices_location_idx
  on public.invoices (location_id)
  where location_id is not null;

create index if not exists invoices_identity_review_idx
  on public.invoices (organization_id, expense_account_match_status, service_location_match_status);

comment on column public.invoices.previous_balance is
  'Prior account balance shown on the source statement; never a current-period credit.';
comment on column public.invoices.payments_and_credits is
  'Payments or account-history credits applied before the current billing period.';
comment on column public.invoices.balance_forward is
  'Prior balance remaining after payments, when explicitly shown by the source.';
comment on column public.invoices.current_charges is
  'Current-period charges explicitly shown by the source.';
comment on column public.invoices.current_period_credits is
  'Credits that reduce current-period charges only.';
comment on column public.invoices.energy_service is
  'Validated source-backed energy service details; full identifiers remain server-side.';
