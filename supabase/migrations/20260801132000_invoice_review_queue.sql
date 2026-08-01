alter table public.invoices
  add column if not exists assigned_to uuid references public.internal_staff_users(user_id) on delete set null,
  add column if not exists assigned_by uuid references public.internal_staff_users(user_id) on delete set null,
  add column if not exists assigned_at timestamptz,
  add column if not exists review_priority text not null default 'normal'
    check (review_priority in ('low', 'normal', 'high', 'urgent')),
  add column if not exists review_due_at timestamptz,
  add column if not exists review_issue_codes text[] not null default '{}'::text[],
  add column if not exists review_notes text,
  add column if not exists reviewed_by uuid references public.internal_staff_users(user_id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists expense_category text;

alter table public.expenses
  add column if not exists invoice_id uuid references public.invoices(id) on delete set null;

create unique index if not exists expenses_invoice_key
  on public.expenses (invoice_id)
  where invoice_id is not null;

create index if not exists invoices_review_queue_idx
  on public.invoices (review_status, review_priority, review_due_at, created_at desc);

create index if not exists invoices_assigned_review_idx
  on public.invoices (assigned_to, review_status, created_at desc)
  where assigned_to is not null;

create index if not exists invoices_assigned_by_idx
  on public.invoices (assigned_by)
  where assigned_by is not null;

create index if not exists invoices_reviewed_by_idx
  on public.invoices (reviewed_by)
  where reviewed_by is not null;

comment on column public.invoices.review_issue_codes is
  'Machine-readable reasons this invoice requires human review. Display labels are derived in application code.';
comment on column public.invoices.review_notes is
  'Internal reviewer notes. Never used as an authoritative financial value.';
comment on column public.expenses.invoice_id is
  'Approved source invoice. One expense may be created for each approved invoice.';

create or replace function public.internal_update_invoice_review(
  p_invoice_id uuid,
  p_actor_id uuid,
  p_changes jsonb,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invoice public.invoices%rowtype;
  v_original jsonb;
  v_key text;
  v_line_total numeric(18,2);
  v_components_total numeric(18,2);
  v_component_difference numeric(18,2);
  v_line_difference numeric(18,2);
begin
  if not exists (
    select 1 from public.internal_staff_users staff
    where staff.user_id = p_actor_id and staff.status = 'active'
  ) then raise exception 'INTERNAL_ACCESS_REQUIRED'; end if;
  if jsonb_typeof(p_changes) <> 'object' then raise exception 'INVALID_CHANGES'; end if;
  if char_length(btrim(p_reason)) < 3 then raise exception 'CORRECTION_REASON_REQUIRED'; end if;
  if exists (
    select 1 from jsonb_object_keys(p_changes) key
    where key <> all (array[
      'organization_vendor_id','expense_account_id','invoice_number','invoice_date','due_date',
      'service_period_start','service_period_end','account_number_last4','purchase_order_number',
      'currency','subtotal','tax_total','fee_total','credit_total','total_amount','amount_due',
      'expense_category','review_notes','review_priority','review_due_at'
    ])
  ) then raise exception 'UNSUPPORTED_INVOICE_FIELD'; end if;

  select * into v_invoice from public.invoices where id = p_invoice_id for update;
  if not found then raise exception 'INVOICE_NOT_FOUND'; end if;
  v_original := to_jsonb(v_invoice);

  update public.invoices set
    organization_vendor_id = case when p_changes ? 'organization_vendor_id' then nullif(p_changes->>'organization_vendor_id','')::uuid else organization_vendor_id end,
    vendor_match_status = case when p_changes ? 'organization_vendor_id' then case when nullif(p_changes->>'organization_vendor_id','') is null then 'unmatched' else 'provided' end else vendor_match_status end,
    expense_account_id = case when p_changes ? 'expense_account_id' then nullif(p_changes->>'expense_account_id','')::uuid else expense_account_id end,
    invoice_number = case when p_changes ? 'invoice_number' then nullif(btrim(p_changes->>'invoice_number'),'') else invoice_number end,
    invoice_date = case when p_changes ? 'invoice_date' then nullif(p_changes->>'invoice_date','')::date else invoice_date end,
    due_date = case when p_changes ? 'due_date' then nullif(p_changes->>'due_date','')::date else due_date end,
    service_period_start = case when p_changes ? 'service_period_start' then nullif(p_changes->>'service_period_start','')::date else service_period_start end,
    service_period_end = case when p_changes ? 'service_period_end' then nullif(p_changes->>'service_period_end','')::date else service_period_end end,
    account_number_last4 = case when p_changes ? 'account_number_last4' then nullif(btrim(p_changes->>'account_number_last4'),'') else account_number_last4 end,
    purchase_order_number = case when p_changes ? 'purchase_order_number' then nullif(btrim(p_changes->>'purchase_order_number'),'') else purchase_order_number end,
    currency = case when p_changes ? 'currency' then upper(nullif(btrim(p_changes->>'currency'),'')) else currency end,
    subtotal = case when p_changes ? 'subtotal' then nullif(p_changes->>'subtotal','')::numeric else subtotal end,
    tax_total = case when p_changes ? 'tax_total' then nullif(p_changes->>'tax_total','')::numeric else tax_total end,
    fee_total = case when p_changes ? 'fee_total' then nullif(p_changes->>'fee_total','')::numeric else fee_total end,
    credit_total = case when p_changes ? 'credit_total' then nullif(p_changes->>'credit_total','')::numeric else credit_total end,
    total_amount = case when p_changes ? 'total_amount' then nullif(p_changes->>'total_amount','')::numeric else total_amount end,
    amount_due = case when p_changes ? 'amount_due' then nullif(p_changes->>'amount_due','')::numeric else amount_due end,
    expense_category = case when p_changes ? 'expense_category' then nullif(btrim(p_changes->>'expense_category'),'') else expense_category end,
    review_notes = case when p_changes ? 'review_notes' then nullif(btrim(p_changes->>'review_notes'),'') else review_notes end,
    review_priority = case when p_changes ? 'review_priority' then p_changes->>'review_priority' else review_priority end,
    review_due_at = case when p_changes ? 'review_due_at' then nullif(p_changes->>'review_due_at','')::timestamptz else review_due_at end,
    updated_at = now()
  where id = p_invoice_id;

  for v_key in select jsonb_object_keys(p_changes)
  loop
    if (v_original -> v_key) is distinct from (p_changes -> v_key) then
      insert into public.invoice_field_corrections (
        organization_id, invoice_id, extraction_version_id, field_path,
        original_value, corrected_value, reason, corrected_by
      ) values (
        v_invoice.organization_id, v_invoice.id, v_invoice.extraction_version_id,
        v_key, v_original -> v_key, p_changes -> v_key, p_reason, p_actor_id
      );
    end if;
  end loop;

  select * into v_invoice from public.invoices where id = p_invoice_id;
  select sum(amount)::numeric(18,2) into v_line_total
    from public.invoice_line_items where invoice_id = p_invoice_id;
  if v_invoice.subtotal is not null and v_invoice.tax_total is not null
    and v_invoice.fee_total is not null and v_invoice.credit_total is not null
    and v_invoice.total_amount is not null then
    v_components_total := v_invoice.subtotal + v_invoice.tax_total + v_invoice.fee_total - v_invoice.credit_total;
    v_component_difference := v_components_total - v_invoice.total_amount;
  end if;
  if v_line_total is not null and v_invoice.subtotal is not null then
    v_line_difference := v_line_total - v_invoice.subtotal;
  end if;
  update public.invoices set
    reconciliation_status = case
      when v_component_difference is null and v_line_difference is null then 'incomplete'
      when coalesce(v_component_difference, 0) = 0 and coalesce(v_line_difference, 0) = 0 then 'reconciled'
      else 'mismatch' end,
    reconciliation_difference = case
      when coalesce(v_component_difference, 0) <> 0 then v_component_difference
      when coalesce(v_line_difference, 0) <> 0 then v_line_difference
      when v_component_difference is not null or v_line_difference is not null then 0
      else null end,
    updated_at = now()
  where id = p_invoice_id;

  insert into public.internal_audit_events (
    actor_id, organization_id, action, resource_type, resource_id, safe_metadata
  ) values (
    p_actor_id, v_invoice.organization_id, 'invoice_review_updated', 'invoice', p_invoice_id,
    jsonb_build_object('fields', (select jsonb_agg(key) from jsonb_object_keys(p_changes) key))
  );
end;
$$;

create or replace function public.internal_approve_invoice(
  p_invoice_id uuid,
  p_actor_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invoice public.invoices%rowtype;
  v_expense_id uuid;
begin
  if not exists (
    select 1 from public.internal_staff_users staff
    where staff.user_id = p_actor_id and staff.status = 'active'
  ) then raise exception 'INTERNAL_ACCESS_REQUIRED'; end if;

  select * into v_invoice from public.invoices where id = p_invoice_id for update;
  if not found then raise exception 'INVOICE_NOT_FOUND'; end if;
  if v_invoice.organization_vendor_id is null then raise exception 'VENDOR_REQUIRED'; end if;
  if v_invoice.invoice_number is null or v_invoice.invoice_date is null
    or v_invoice.service_period_start is null or v_invoice.service_period_end is null
    or v_invoice.total_amount is null or v_invoice.currency is null
    or v_invoice.expense_category is null then raise exception 'REQUIRED_FIELDS_MISSING'; end if;
  if v_invoice.reconciliation_status <> 'reconciled' then raise exception 'RECONCILIATION_REQUIRED'; end if;

  insert into public.expenses (
    organization_id, organization_vendor_id, expense_account_id, document_id, invoice_id,
    category, period_start, period_end, amount, currency, status, metadata
  ) values (
    v_invoice.organization_id, v_invoice.organization_vendor_id, v_invoice.expense_account_id,
    v_invoice.document_id, v_invoice.id, v_invoice.expense_category,
    v_invoice.service_period_start, v_invoice.service_period_end,
    v_invoice.total_amount, v_invoice.currency, 'reviewed',
    jsonb_build_object('source','approved_invoice','invoice_number',v_invoice.invoice_number)
  ) on conflict (invoice_id) where invoice_id is not null do update set
    organization_vendor_id = excluded.organization_vendor_id,
    expense_account_id = excluded.expense_account_id,
    document_id = excluded.document_id,
    category = excluded.category,
    period_start = excluded.period_start,
    period_end = excluded.period_end,
    amount = excluded.amount,
    currency = excluded.currency,
    status = 'reviewed',
    metadata = excluded.metadata,
    updated_at = now()
  returning id into v_expense_id;

  update public.invoices set
    review_status = 'approved', reviewed_by = p_actor_id, reviewed_at = now(), updated_at = now()
  where id = p_invoice_id;

  insert into public.internal_audit_events (
    actor_id, organization_id, action, resource_type, resource_id, safe_metadata
  ) values (
    p_actor_id, v_invoice.organization_id, 'invoice_approved', 'invoice', p_invoice_id,
    jsonb_build_object('expense_id',v_expense_id,'reconciliation_status',v_invoice.reconciliation_status)
  );
  return v_expense_id;
end;
$$;

revoke all on function public.internal_update_invoice_review(uuid,uuid,jsonb,text) from public, anon, authenticated;
revoke all on function public.internal_approve_invoice(uuid,uuid) from public, anon, authenticated;
grant execute on function public.internal_update_invoice_review(uuid,uuid,jsonb,text) to service_role;
grant execute on function public.internal_approve_invoice(uuid,uuid) to service_role;
