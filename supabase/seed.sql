-- Costivra starter organization used by the local product preview.
-- All product screens read this data through Supabase; no financial rows live in UI code.

insert into public.profiles (id, email, full_name)
select id, email, 'Alex Morgan'
from auth.users
where email = 'demo@costivra.com'
on conflict (id) do update set full_name = excluded.full_name, email = excluded.email, updated_at = now();

insert into public.organizations (name, legal_name, industry, employee_count_range, annual_revenue_range, timezone, currency, primary_contact_name, review_threshold, is_sample_workspace)
select 'Northstar Hospitality', 'Northstar Hospitality Group LLC', 'Hotels & hospitality', '250-499', '$25M-$50M', 'America/Chicago', 'USD', 'Alex Morgan', 10000, true
where not exists (select 1 from public.organizations where name = 'Northstar Hospitality');

update public.organizations
set is_sample_workspace = true
where name = 'Northstar Hospitality';

insert into public.organization_memberships (organization_id, user_id, role, permissions)
select o.id, p.id, 'owner', '["documents:write","opportunities:approve","settings:write","reports:export"]'::jsonb
from public.organizations o
join public.profiles p on p.email = 'demo@costivra.com'
where o.name = 'Northstar Hospitality'
on conflict (organization_id, user_id) do update set role = excluded.role, permissions = excluded.permissions;

insert into public.locations (organization_id, name, address, status)
select o.id, v.name, v.address, 'active'
from public.organizations o
cross join (values
  ('Austin Downtown', '{"city":"Austin","state":"TX","postal_code":"78701"}'::jsonb),
  ('Austin Domain', '{"city":"Austin","state":"TX","postal_code":"78758"}'::jsonb),
  ('Dallas Uptown', '{"city":"Dallas","state":"TX","postal_code":"75201"}'::jsonb),
  ('Houston Galleria', '{"city":"Houston","state":"TX","postal_code":"77056"}'::jsonb)
) as v(name, address)
where o.name = 'Northstar Hospitality'
  and not exists (select 1 from public.locations l where l.organization_id = o.id and l.name = v.name);

insert into public.vendors (canonical_name, category, website, support_channels)
values
  ('Verizon Wireless', 'Telecom', 'https://www.verizon.com/business', '["web","phone"]'::jsonb),
  ('Adobe', 'Software', 'https://www.adobe.com', '["web"]'::jsonb),
  ('Direct Energy', 'Energy', 'https://business.directenergy.com', '["web","phone"]'::jsonb),
  ('Comcast Business', 'Telecom', 'https://business.comcast.com', '["web","phone"]'::jsonb),
  ('Microsoft', 'Software', 'https://www.microsoft.com', '["web"]'::jsonb),
  ('Sysco Corporation', 'Food service', 'https://www.sysco.com', '["web","phone"]'::jsonb),
  ('Cintas Corporation', 'Facilities', 'https://www.cintas.com', '["web","phone"]'::jsonb),
  ('Republic Services', 'Waste', 'https://www.republicservices.com', '["web","phone"]'::jsonb)
on conflict (canonical_name) do update set category = excluded.category, website = excluded.website, support_channels = excluded.support_channels;

insert into public.organization_vendors (organization_id, vendor_id, relationship_status, annualized_spend)
select o.id, v.id, 'active', x.spend
from public.organizations o
join (values
  ('Verizon Wireless', 98450::numeric), ('Adobe', 62140::numeric), ('Direct Energy', 82610::numeric),
  ('Comcast Business', 55420::numeric), ('Microsoft', 51730::numeric), ('Sysco Corporation', 243210::numeric),
  ('Cintas Corporation', 186540::numeric), ('Republic Services', 142780::numeric)
) as x(name, spend) on true
join public.vendors v on v.canonical_name = x.name
where o.name = 'Northstar Hospitality'
  and not exists (select 1 from public.organization_vendors ov where ov.organization_id = o.id and ov.vendor_id = v.id);

insert into public.expense_accounts (organization_id, organization_vendor_id, category, external_account_reference, status, service_start_date)
select ov.organization_id, ov.id, v.category, concat('NS-', upper(left(regexp_replace(v.canonical_name, '[^A-Za-z]', '', 'g'), 4)), '-01'), 'active', date '2024-01-01'
from public.organization_vendors ov
join public.organizations o on o.id = ov.organization_id and o.name = 'Northstar Hospitality'
join public.vendors v on v.id = ov.vendor_id
where not exists (select 1 from public.expense_accounts ea where ea.organization_vendor_id = ov.id);

insert into public.expenses (organization_id, organization_vendor_id, expense_account_id, category, period_start, period_end, amount, prior_period_amount, status, metadata)
select ov.organization_id, ov.id, ea.id, v.category, x.period_start, x.period_end, x.amount, x.prior_amount, 'reviewed', jsonb_build_object('source','connected ledger')
from (values
  ('Verizon Wireless', date '2026-06-01', date '2026-06-30', 8202.50::numeric, 7182.20::numeric),
  ('Adobe', date '2026-06-01', date '2026-06-30', 5178.33::numeric, 4941.14::numeric),
  ('Direct Energy', date '2026-06-01', date '2026-06-30', 6884.17::numeric, 6368.33::numeric),
  ('Comcast Business', date '2026-06-01', date '2026-06-30', 4618.33::numeric, 4674.42::numeric),
  ('Microsoft', date '2026-06-01', date '2026-06-30', 4310.83::numeric, 4209.80::numeric),
  ('Sysco Corporation', date '2026-06-01', date '2026-06-30', 20267.50::numeric, 19782.21::numeric),
  ('Cintas Corporation', date '2026-06-01', date '2026-06-30', 15545.00::numeric, 15260.23::numeric),
  ('Republic Services', date '2026-06-01', date '2026-06-30', 11898.33::numeric, 11602.01::numeric)
) as x(vendor_name, period_start, period_end, amount, prior_amount)
join public.vendors v on v.canonical_name = x.vendor_name
join public.organization_vendors ov on ov.vendor_id = v.id
join public.organizations o on o.id = ov.organization_id and o.name = 'Northstar Hospitality'
join public.expense_accounts ea on ea.organization_vendor_id = ov.id
where not exists (select 1 from public.expenses e where e.organization_vendor_id = ov.id and e.period_end = x.period_end);

insert into public.contracts (organization_id, organization_vendor_id, expense_account_id, title, category, start_date, end_date, notice_period_days, annual_value, status, auto_renews, owner_name)
select ov.organization_id, ov.id, ea.id, x.title, v.category, x.start_date, x.end_date, x.notice_days, x.annual_value, x.status, x.auto_renews, x.owner_name
from (values
  ('Verizon Wireless', 'Verizon Wireless master services', date '2024-08-03', date '2026-08-03', 90, 98450::numeric, 'expiring', true, 'Alex Morgan'),
  ('Direct Energy', 'Direct Energy TX portfolio', date '2025-08-17', date '2026-08-17', 60, 82610::numeric, 'renewal_review', true, 'Jordan Singh'),
  ('Adobe', 'Adobe enterprise agreement', date '2025-10-31', date '2026-10-31', 30, 62140::numeric, 'renewal_review', true, 'Alex Morgan'),
  ('Comcast Business', 'Comcast Business DIA', date '2024-01-24', date '2027-01-24', 90, 55420::numeric, 'active', false, 'Riley Park')
) as x(vendor_name, title, start_date, end_date, notice_days, annual_value, status, auto_renews, owner_name)
join public.vendors v on v.canonical_name = x.vendor_name
join public.organization_vendors ov on ov.vendor_id = v.id
join public.organizations o on o.id = ov.organization_id and o.name = 'Northstar Hospitality'
join public.expense_accounts ea on ea.organization_vendor_id = ov.id
where not exists (select 1 from public.contracts c where c.organization_id = o.id and c.title = x.title);

insert into public.documents (organization_id, organization_vendor_id, storage_path, original_filename, mime_type, byte_size, sha256, status, uploaded_by, document_type, extraction_summary)
select o.id, ov.id, concat(o.id, '/seed/', x.filename), x.filename, 'text/plain', x.byte_size, encode(digest(x.filename, 'sha256'), 'hex'), 'ready', p.id, x.document_type, x.summary
from (values
  ('Verizon Wireless', 'verizon-june-2026.txt', 462::bigint, 'invoice', 'June invoice with a new access surcharge requiring contract review.'),
  ('Adobe', 'adobe-renewal-order.txt', 398::bigint, 'contract', 'Enterprise subscription renewal order with seat and notice terms.'),
  ('Direct Energy', 'direct-energy-june-2026.txt', 421::bigint, 'invoice', 'June electricity invoice for seven monitored meters.'),
  ('Comcast Business', 'comcast-location-05.txt', 356::bigint, 'invoice', 'Business internet invoice for the fifth Northstar location.')
) as x(vendor_name, filename, byte_size, document_type, summary)
join public.organizations o on o.name = 'Northstar Hospitality'
join public.vendors v on v.canonical_name = x.vendor_name
join public.organization_vendors ov on ov.organization_id = o.id and ov.vendor_id = v.id
join public.profiles p on p.email = 'demo@costivra.com'
on conflict (storage_path) do nothing;

insert into public.document_extraction_versions (document_id, extractor_version, provider, model_identifier, schema_version, status, structured_output, confidence, completed_at)
select d.id, 'costivra-text-v1', 'openrouter', 'openai/gpt-4.1-mini', 'cost-document-v1', 'completed',
  jsonb_build_object('classification', d.document_type, 'summary', d.extraction_summary, 'vendorName', v.canonical_name),
  case when v.canonical_name = 'Adobe' then .91 else .97 end, now()
from public.documents d
join public.organization_vendors ov on ov.id = d.organization_vendor_id
join public.vendors v on v.id = ov.vendor_id
join public.organizations o on o.id = d.organization_id and o.name = 'Northstar Hospitality'
where not exists (select 1 from public.document_extraction_versions ev where ev.document_id = d.id);

insert into public.evidence_references (document_id, page_number, text_excerpt, field_path)
select d.id, 1,
  case v.canonical_name
    when 'Verizon Wireless' then 'Access Tier 4 surcharge: $1,562.50 monthly, effective June 1, 2026.'
    when 'Adobe' then 'Enterprise agreement renews October 31, 2026 with a 30-day notice period.'
    when 'Direct Energy' then 'Seven active meters billed for the June 2026 service period.'
    else 'Business internet service remains active at Location 05.'
  end,
  case when v.canonical_name = 'Adobe' then 'renewalDate' else 'totalAmount' end
from public.documents d
join public.organization_vendors ov on ov.id = d.organization_vendor_id
join public.vendors v on v.id = ov.vendor_id
join public.organizations o on o.id = d.organization_id and o.name = 'Northstar Hospitality'
where not exists (select 1 from public.evidence_references er where er.document_id = d.id);

insert into public.opportunities (organization_id, expense_account_id, type, title, summary, status, confidence, estimated_annual_value, currency, priority, deadline_at, category, generated_by, trust_state, customer_visible)
select o.id, ea.id, x.type, x.title, x.summary, x.status::opportunity_status, x.confidence, x.value, 'USD', x.priority, x.deadline_at, v.category, 'manual', 'demo_example', true
from (values
  ('Verizon Wireless','price_increase','Telecom bill increase requires approval','A new recurring surcharge is not reflected in the current contract baseline.','under_review',.92::numeric,18750::numeric,'high',timestamptz '2026-08-03 17:00:00-05'),
  ('Adobe','unused_licenses','Software license cleanup ready to execute','Usage review indicates paid seats without an active owner.','approved',.88::numeric,12430::numeric,'medium',timestamptz '2026-08-09 17:00:00-05'),
  ('Direct Energy','expert_review','Energy account needs professional review','The account package is ready for a customer-selected advisor review.','open',.68::numeric,9680::numeric,'medium',timestamptz '2026-08-17 17:00:00-05')
) as x(vendor_name,type,title,summary,status,confidence,value,priority,deadline_at)
join public.organizations o on o.name = 'Northstar Hospitality'
join public.vendors v on v.canonical_name = x.vendor_name
join public.organization_vendors ov on ov.organization_id = o.id and ov.vendor_id = v.id
join public.expense_accounts ea on ea.organization_vendor_id = ov.id
where not exists (select 1 from public.opportunities op where op.organization_id = o.id and op.title = x.title);

insert into public.opportunity_evidence (opportunity_id, evidence_reference_id, role)
select op.id, er.id, 'primary'
from public.opportunities op
join public.expense_accounts ea on ea.id = op.expense_account_id
join public.documents d on d.organization_vendor_id = ea.organization_vendor_id
join public.evidence_references er on er.document_id = d.id
where not exists (select 1 from public.opportunity_evidence oe where oe.opportunity_id = op.id and oe.evidence_reference_id = er.id);

insert into public.approval_policies (organization_id, name, rule)
select o.id, x.name, x.rule
from public.organizations o
cross join (values
  ('External communication approval','{"action_type":"external_email","minimum_approvers":1}'::jsonb),
  ('High-value action approval','{"annual_value_gte":10000,"minimum_approvers":2}'::jsonb),
  ('Energy review consent','{"category":"Energy","explicit_consent":true}'::jsonb)
) as x(name,rule)
where o.name = 'Northstar Hospitality'
  and not exists (select 1 from public.approval_policies ap where ap.organization_id = o.id and ap.name = x.name);

insert into public.action_plans (opportunity_id, status, required_approval_policy_id, title, description, action_type, priority, due_at)
select op.id, x.status, ap.id, x.title, x.description, x.action_type, op.priority, op.deadline_at
from (values
  ('Telecom bill increase requires approval','pending_approval','External communication approval','Send correction request','Request removal and credit for the unsupported surcharge.','external_email'),
  ('Software license cleanup ready to execute','approved','High-value action approval','Remove unused licenses','Remove twelve confirmed inactive licenses at the next billing boundary.','account_change'),
  ('Energy account needs professional review','draft','Energy review consent','Prepare energy review package','Assemble the evidence package for the advisor selected by the customer.','expert_handoff')
) as x(opportunity_title,status,policy_name,title,description,action_type)
join public.opportunities op on op.title = x.opportunity_title
join public.approval_policies ap on ap.organization_id = op.organization_id and ap.name = x.policy_name
where not exists (select 1 from public.action_plans plan where plan.opportunity_id = op.id);

insert into public.approvals (organization_id, resource_type, resource_id, requested_from, decision, decided_at)
select op.organization_id, 'action_plan', plan.id, p.id,
  case when plan.status = 'approved' then 'approved'::approval_decision else 'pending'::approval_decision end,
  case when plan.status = 'approved' then now() else null end
from public.action_plans plan
join public.opportunities op on op.id = plan.opportunity_id
join public.profiles p on p.email = 'demo@costivra.com'
where not exists (select 1 from public.approvals a where a.resource_id = plan.id and a.requested_from = p.id);

insert into public.savings_outcomes (organization_id, opportunity_id, title, value_type, amount, method, status, verified_at)
select op.organization_id, op.id, x.title, x.value_type, x.amount, x.method, 'verified', timestamptz '2026-07-28 14:30:00-05'
from (values
  ('Telecom bill increase requires approval','Telecom surcharge credit','one_time_credit',8420::numeric,'Credit memo matched to approved baseline'),
  ('Software license cleanup ready to execute','Inactive license reduction','annual_savings',31840::numeric,'Post-change invoice compared with approved seat baseline')
) as x(opportunity_title,title,value_type,amount,method)
join public.opportunities op on op.title = x.opportunity_title
where not exists (select 1 from public.savings_outcomes so where so.opportunity_id = op.id and so.title = x.title);

insert into public.integrations (organization_id, provider, display_name, description, status, last_synced_at)
select o.id, x.provider, x.display_name, x.description, x.status, x.last_synced_at
from public.organizations o
cross join (values
  ('microsoft-365','Microsoft 365','Import approved bills and contracts from selected mailboxes.','available',null::timestamptz),
  ('gmail','Gmail','Monitor selected vendor mailboxes with scoped access.','available',null::timestamptz),
  ('quickbooks','QuickBooks','Reconcile bills and vendor records with the accounting ledger.','available',null::timestamptz),
  ('stripe','Stripe','Track subscription and payment-fee expense.','available',null::timestamptz),
  ('ucep','UCEP review adapter','Prepare a consented energy review handoff.','restricted',null::timestamptz)
) as x(provider,display_name,description,status,last_synced_at)
where o.name = 'Northstar Hospitality'
on conflict (organization_id,provider) do update set display_name = excluded.display_name, description = excluded.description, status = excluded.status;

insert into public.report_definitions (organization_id, name, description, report_type, status, last_generated_at)
select o.id, x.name, x.description, x.report_type, 'ready', x.generated_at
from public.organizations o
cross join (values
  ('Executive value report','Spend, findings, actions, and verified value','executive_value',timestamptz '2026-07-30 09:00:00-05'),
  ('Contract renewal calendar','30, 60, 90, and 180-day deadline view','renewal_calendar',timestamptz '2026-07-30 09:00:00-05'),
  ('Vendor concentration report','Annual spend and exposure by vendor','vendor_concentration',timestamptz '2026-07-29 09:00:00-05'),
  ('Data coverage report','Missing documents, dates, and low-confidence fields','data_coverage',timestamptz '2026-07-30 09:00:00-05')
) as x(name,description,report_type,generated_at)
where o.name = 'Northstar Hospitality'
  and not exists (select 1 from public.report_definitions r where r.organization_id = o.id and r.report_type = x.report_type);

insert into public.notifications (organization_id, recipient_user_id, title, body, resource_type, resource_id)
select op.organization_id, p.id, 'Approval needed', op.title, 'opportunity', op.id
from public.opportunities op
join public.profiles p on p.email = 'demo@costivra.com'
where op.status = 'under_review'
  and not exists (select 1 from public.notifications n where n.resource_id = op.id and n.title = 'Approval needed');

insert into public.audit_events (organization_id, actor_type, actor_id, action, resource_type, resource_id)
select o.id, 'user', p.id, x.action, x.resource_type, x.resource_id
from public.organizations o
join public.profiles p on p.email = 'demo@costivra.com'
cross join lateral (values
  ('seed.workspace_ready','organization',o.id),
  ('document.intake_ready','organization',o.id),
  ('approval.policy_configured','organization',o.id)
) as x(action,resource_type,resource_id)
where o.name = 'Northstar Hospitality'
  and not exists (select 1 from public.audit_events ae where ae.organization_id = o.id and ae.action = x.action);
