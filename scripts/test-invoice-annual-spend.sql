-- Run against a migrated database. All synthetic rows roll back.
begin;
set local role service_role;
do $$
declare
  org uuid := gen_random_uuid(); other_org uuid := gen_random_uuid();
  vendor uuid := gen_random_uuid(); rel uuid := gen_random_uuid(); other_rel uuid := gen_random_uuid();
  doc uuid; bill uuid; first_bill uuid; second_bill uuid; moved_bill uuid;
  actual numeric; audit_count integer;
begin
  assert public.invoice_annual_estimate(100.01, '2026-01-01', '2026-02-01') = 1200.12, 'monthly cents';
  assert public.invoice_annual_estimate(100, '2026-01-01', '2026-01-11') = 3650, 'daily normalization';
  assert public.invoice_annual_estimate(100, '2026-01-01', '2027-01-01') = 100, 'annual';
  assert public.invoice_annual_estimate(0, '2026-01-01', '2026-02-01') = 0, 'real zero';
  assert public.invoice_annual_estimate(100, null, '2026-02-01') is null, 'missing period';
  assert public.invoice_annual_estimate(100, '2026-03-01', '2026-02-01') is null, 'reversed period';
  assert public.invoice_annual_estimate(-100, '2026-01-01', '2026-02-01') is null, 'credit is not recurring spend';
  assert not has_function_privilege('authenticated', 'public.refresh_vendor_annual_spend(uuid,uuid)', 'EXECUTE'), 'no public recalculation API';
  insert into public.organizations(id,name) values(org,'Synthetic annual spend test'),(other_org,'Synthetic isolation test');
  insert into public.vendors(id,canonical_name) values(vendor,'Synthetic annual spend ' || vendor);
  insert into public.organization_vendors(id,organization_id,vendor_id,annualized_spend)
    values(rel,org,vendor,77),(other_rel,other_org,vendor,88);
  for n in 1..3 loop
    doc := gen_random_uuid(); bill := gen_random_uuid();
    insert into public.documents(id,organization_id,storage_path,original_filename,mime_type,byte_size,sha256)
      values(doc,org,'synthetic/'||doc,'synthetic.pdf','application/pdf',1,encode(sha256(doc::text::bytea),'hex'));
    insert into public.invoices(id,organization_id,organization_vendor_id,document_id,source_type,
      service_period_start,service_period_end,currency,current_charges,total_amount,account_number_last4)
      values(bill,org,rel,doc,'manual_upload',
        case when n=2 then date '2026-02-01' else date '2026-01-01' end,
        case when n=2 then date '2026-03-01' else date '2026-02-01' end,
        'USD',case when n=1 then 100 when n=2 then 200 else 50 end,999,
        case when n=3 then '2222' else '1111' end);
    if n=1 then first_bill:=bill; elsif n=2 then second_bill:=bill; else moved_bill:=bill; end if;
  end loop;
  select annualized_spend into actual from public.organization_vendors where id=rel;
  assert actual=3000, 'latest bill replaces prior month, second account adds';
  select count(*) into audit_count from public.audit_events where organization_id=org;
  perform public.refresh_vendor_annual_spend(org,rel);
  assert (select count(*) from public.audit_events where organization_id=org)=audit_count, 'idempotent refresh';
  perform public.refresh_vendor_annual_spend(other_org,rel);
  assert (select annualized_spend from public.organization_vendors where id=other_rel)=88, 'tenant isolation';
  update public.invoices set current_charges=250 where id=second_bill;
  assert (select annualized_spend from public.organization_vendors where id=rel)=3600, 'correction';
  update public.invoices set currency='EUR' where id=second_bill;
  assert (select annualized_spend from public.organization_vendors where id=rel)=600, 'currency excluded without falling back to stale month';
  update public.invoices set currency='USD',current_charges=null,total_amount=275,balance_forward=25 where id=second_bill;
  assert (select annualized_spend from public.organization_vendors where id=rel)=3600, 'known carried balance excluded';
  update public.invoices set review_status='approved' where id=second_bill;
  assert (select annualized_spend from public.organization_vendors where id=rel)=3600, 'review does not double count';
  delete from public.invoices where id=second_bill;
  assert (select annualized_spend from public.organization_vendors where id=rel)=1800, 'delete returns to older account period';
  update public.invoices set organization_vendor_id=null where id=moved_bill;
  assert (select annualized_spend from public.organization_vendors where id=rel)=1200, 'unlink removes account';
  delete from public.invoices where id=first_bill;
  assert (select annualized_spend from public.organization_vendors where id=rel)=77, 'original manual amount preserved';
end;
$$;
rollback;
