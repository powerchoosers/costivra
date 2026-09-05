-- Authorized repair: same calculation used by the intake trigger.
-- Repeatable; unchanged estimates create no extra audit event.
begin;
do $$
declare relationship record;
begin
  for relationship in
    select distinct organization_id, organization_vendor_id
    from public.invoices where organization_vendor_id is not null
    order by organization_id, organization_vendor_id
  loop
    perform public.refresh_vendor_annual_spend(relationship.organization_id, relationship.organization_vendor_id);
  end loop;
end;
$$;
commit;
select ov.id, v.canonical_name, ov.annualized_spend,
  ov.annualized_spend_basis->>'status' as status,
  jsonb_array_length(ov.annualized_spend_basis->'sources') as source_accounts
from public.organization_vendors ov join public.vendors v on v.id=ov.vendor_id
where ov.annualized_spend_basis is not null;
