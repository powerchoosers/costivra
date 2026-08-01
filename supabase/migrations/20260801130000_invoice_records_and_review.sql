alter table public.vendors
  add column if not exists search_aliases text[] not null default '{}'::text[],
  add column if not exists is_suggested boolean not null default false;

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  organization_vendor_id uuid references public.organization_vendors(id) on delete restrict,
  expense_account_id uuid references public.expense_accounts(id) on delete set null,
  document_id uuid not null references public.documents(id) on delete cascade,
  extraction_version_id uuid references public.document_extraction_versions(id) on delete set null,
  invoice_number text,
  invoice_date date,
  due_date date,
  service_period_start date,
  service_period_end date,
  account_number_last4 text,
  purchase_order_number text,
  currency text,
  subtotal numeric(18,2),
  tax_total numeric(18,2),
  fee_total numeric(18,2),
  credit_total numeric(18,2),
  total_amount numeric(18,2),
  amount_due numeric(18,2),
  extraction_confidence numeric(5,4),
  vendor_match_status text not null default 'unmatched'
    check (vendor_match_status in ('provided','exact','ambiguous','unmatched')),
  reconciliation_status text not null default 'not_run'
    check (reconciliation_status in ('not_run','reconciled','mismatch','incomplete')),
  reconciliation_difference numeric(18,2),
  review_status text not null default 'needs_review'
    check (review_status in ('needs_review','ready','approved','rejected')),
  source_type text not null
    check (source_type in ('manual_upload','email_forwarding','provider_integration')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_id),
  unique (id, organization_id),
  check (currency is null or currency ~ '^[A-Z]{3}$'),
  check (account_number_last4 is null or account_number_last4 ~ '^[A-Za-z0-9]{2,4}$'),
  check (extraction_confidence is null or (extraction_confidence >= 0 and extraction_confidence <= 1)),
  check (subtotal is null or subtotal >= 0),
  check (tax_total is null or tax_total >= 0),
  check (fee_total is null or fee_total >= 0),
  check (credit_total is null or credit_total >= 0),
  check (total_amount is null or total_amount >= 0),
  check (amount_due is null or amount_due >= 0),
  check (due_date is null or invoice_date is null or due_date >= invoice_date),
  check (service_period_end is null or service_period_start is null or service_period_end >= service_period_start)
);

create table if not exists public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid not null,
  line_number integer not null check (line_number > 0 and line_number <= 1000),
  description text not null check (char_length(btrim(description)) between 1 and 1000),
  quantity numeric(18,6),
  unit_price numeric(18,6),
  amount numeric(18,2) not null,
  category text,
  service_period_start date,
  service_period_end date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (invoice_id, line_number),
  foreign key (invoice_id, organization_id)
    references public.invoices(id, organization_id) on delete cascade,
  check (quantity is null or quantity > 0),
  check (service_period_end is null or service_period_start is null or service_period_end >= service_period_start)
);

create table if not exists public.invoice_field_corrections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid not null,
  extraction_version_id uuid references public.document_extraction_versions(id) on delete set null,
  field_path text not null check (char_length(btrim(field_path)) between 1 and 200),
  original_value jsonb,
  corrected_value jsonb not null,
  reason text not null check (char_length(btrim(reason)) between 3 and 1000),
  corrected_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key (invoice_id, organization_id)
    references public.invoices(id, organization_id) on delete cascade
);

create index if not exists invoices_org_date_idx
  on public.invoices (organization_id, invoice_date desc, created_at desc);
create index if not exists invoices_org_review_idx
  on public.invoices (organization_id, review_status, created_at desc);
create index if not exists invoices_vendor_date_idx
  on public.invoices (organization_vendor_id, invoice_date desc)
  where organization_vendor_id is not null;
create index if not exists invoices_expense_account_idx
  on public.invoices (expense_account_id)
  where expense_account_id is not null;
create index if not exists invoices_extraction_version_idx
  on public.invoices (extraction_version_id)
  where extraction_version_id is not null;
create index if not exists invoice_line_items_org_invoice_idx
  on public.invoice_line_items (organization_id, invoice_id, line_number);
create index if not exists invoice_corrections_org_invoice_idx
  on public.invoice_field_corrections (organization_id, invoice_id, created_at desc);
create index if not exists invoice_corrections_extraction_idx
  on public.invoice_field_corrections (extraction_version_id)
  where extraction_version_id is not null;
create index if not exists invoice_corrections_user_idx
  on public.invoice_field_corrections (corrected_by);

alter table public.invoices enable row level security;
alter table public.invoice_line_items enable row level security;
alter table public.invoice_field_corrections enable row level security;

grant select on public.invoices, public.invoice_line_items, public.invoice_field_corrections to authenticated;
revoke all on public.invoices, public.invoice_line_items, public.invoice_field_corrections from anon;

create policy "Members read invoices" on public.invoices
  for select to authenticated
  using (exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = invoices.organization_id
      and membership.user_id = (select auth.uid())
  ));

create policy "Members read invoice line items" on public.invoice_line_items
  for select to authenticated
  using (exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = invoice_line_items.organization_id
      and membership.user_id = (select auth.uid())
  ));

create policy "Members read invoice corrections" on public.invoice_field_corrections
  for select to authenticated
  using (exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = invoice_field_corrections.organization_id
      and membership.user_id = (select auth.uid())
  ));

comment on table public.invoices is
  'Authoritative invoice candidates created from source documents. AI-extracted values remain reviewable until approved.';
comment on table public.invoice_line_items is
  'Normalized invoice line items preserving signed amounts for charges and credits.';
comment on table public.invoice_field_corrections is
  'Append-only human correction history for extracted invoice fields.';
