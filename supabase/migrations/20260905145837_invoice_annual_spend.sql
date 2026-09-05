-- Invoice-derived annual run rate. Numeric arithmetic stays in PostgreSQL.
-- Version aligned with the applied Supabase migration history.
-- This is an estimate at the source service dates, never verified savings.
alter table public.organization_vendors
  add column if not exists annualized_spend_basis jsonb;

create or replace function public.invoice_annual_estimate(amount numeric, period_start date, period_end date)
returns numeric language sql immutable security invoker set search_path = '' as $$
  select case
    when amount is null or amount < 0 or period_start is null or period_end is null
      or period_end <= period_start or period_end - period_start > 366 then null
    when period_end - period_start between 27 and 35 then round(amount * 12, 2)
    when period_end - period_start between 350 and 366 then round(amount, 2)
    else round(amount * 365 / (period_end - period_start), 2)
  end;
$$;

create or replace function public.refresh_vendor_annual_spend(p_org uuid, p_vendor uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  prior public.organization_vendors%rowtype;
  sources jsonb;
  basis jsonb;
  estimate numeric;
  excluded integer;
  original_amount numeric;
begin
  -- Lock before reading bills: concurrent intake for one relationship serializes.
  select * into prior from public.organization_vendors
    where id = p_vendor and organization_id = p_org for update;
  if not found then return; end if;
  original_amount := case when prior.annualized_spend_basis is null
    then prior.annualized_spend else (prior.annualized_spend_basis->>'originalAmount')::numeric end;

  with identified as (
    select i.*,
      -- Prefer the stable extracted account suffix so resolving an account later
      -- does not temporarily count it twice. Location separates reused suffixes.
      coalesce('suffix:' || nullif(i.account_number_last4, ''),
        'account:' || i.expense_account_id::text, 'unresolved')
        || ':' || coalesce(i.location_id::text, '') as account_key,
      row_number() over (partition by coalesce(i.document_id, i.id) order by i.created_at desc, i.id desc) as document_rank
    from public.invoices i
    where i.organization_id = p_org and i.organization_vendor_id = p_vendor
      and i.review_status not in ('rejected', 'void', 'voided', 'duplicate')
  ), latest as (
    select distinct on (account_key) * from identified where document_rank = 1
    order by account_key, coalesce(service_period_end, invoice_date) desc nulls last,
      created_at desc, id desc
  ), calculated as (
    select i.*, public.invoice_annual_estimate(
      coalesce(i.current_charges, i.total_amount - coalesce(i.balance_forward, 0)),
      i.service_period_start, i.service_period_end) as annual_amount
    from latest i
    join public.organizations o on o.id = i.organization_id
    where i.currency = o.currency
  )
  select sum(annual_amount),
    coalesce(jsonb_agg(jsonb_build_object(
      'invoiceId', id, 'periodStart', service_period_start, 'periodEnd', service_period_end,
      'amount', coalesce(current_charges, total_amount - coalesce(balance_forward, 0)),
      'amountSource', case when current_charges is not null then 'current_charges' else 'invoice_total_less_known_balance' end,
      'annualAmount', annual_amount, 'reviewStatus', review_status,
      'reconciliationStatus', reconciliation_status,
      'accountIdentityUnresolved', account_key like 'unresolved:%'
    ) order by account_key) filter (where annual_amount is not null), '[]'::jsonb),
    (select count(*) from latest) - count(annual_amount)
  into estimate, sources, excluded from calculated;

  if estimate is null and prior.annualized_spend_basis is null then return; end if;
  basis := jsonb_build_object('method', 'latest-account-service-period-v1',
    'status', 'needs_verification', 'originalAmount', original_amount,
    'sources', sources, 'excludedAccountCount', excluded,
    'assumption', 'Latest bill per account repeated for one year; monthly periods multiplied by 12; other periods normalized by service days. Seasonal changes are not modeled.');
  if prior.annualized_spend is not distinct from coalesce(estimate, original_amount)
    and prior.annualized_spend_basis is not distinct from basis then return; end if;
  update public.organization_vendors set annualized_spend = coalesce(estimate, original_amount),
    annualized_spend_basis = basis, updated_at = now()
    where id = p_vendor and organization_id = p_org;
  insert into public.audit_events(organization_id, actor_type, action, resource_type, resource_id, safe_metadata)
    values (p_org, 'system', 'vendor.annual_spend_recalculated', 'vendor_relationship', p_vendor,
      jsonb_build_object('previousAmount', prior.annualized_spend, 'amount', coalesce(estimate, original_amount), 'basis', basis));
end;
$$;

create or replace function public.invoice_refresh_annual_spend()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op <> 'INSERT' then
    perform public.refresh_vendor_annual_spend(old.organization_id, old.organization_vendor_id);
  end if;
  if tg_op <> 'DELETE' and (tg_op = 'INSERT' or
    (new.organization_id, new.organization_vendor_id) is distinct from (old.organization_id, old.organization_vendor_id)) then
    perform public.refresh_vendor_annual_spend(new.organization_id, new.organization_vendor_id);
  end if;
  return null;
end;
$$;

create trigger invoice_annual_spend_after_write
after insert or update or delete on public.invoices
for each row execute function public.invoice_refresh_annual_spend();

revoke all on function public.invoice_annual_estimate(numeric,date,date) from public, anon, authenticated;
revoke all on function public.refresh_vendor_annual_spend(uuid,uuid) from public, anon, authenticated;
revoke all on function public.invoice_refresh_annual_spend() from public, anon, authenticated;
grant execute on function public.invoice_annual_estimate(numeric,date,date) to service_role;
grant execute on function public.refresh_vendor_annual_spend(uuid,uuid) to service_role;
grant execute on function public.invoice_refresh_annual_spend() to service_role;
