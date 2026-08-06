alter table public.organizations
  add column if not exists is_sample_workspace boolean not null default false;

alter table public.opportunities
  add column if not exists trust_state text not null default 'needs_evidence',
  add column if not exists customer_visible boolean not null default true,
  add column if not exists trust_reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists trust_reviewed_at timestamptz,
  add column if not exists trust_review_note text;

alter table public.opportunities drop constraint if exists opportunities_trust_state_check;
alter table public.opportunities add constraint opportunities_trust_state_check
  check (trust_state in ('evidence_backed','needs_evidence','manual_note','demo_example','deprecated'));

-- Derive the initial state from the existing provenance columns. This does not
-- delete or rewrite the underlying finding narrative or amount.
update public.opportunities opportunity
set trust_state = case
  when lower(coalesce(opportunity.title, '') || ' ' || coalesce(opportunity.summary, '')) like '%meter #4491%'
    or lower(coalesce(opportunity.title, '') || ' ' || coalesce(opportunity.summary, '')) like '%tariff misclassification%'
    then 'demo_example'
  when opportunity.generated_by = 'manual' then 'manual_note'
  when opportunity.generated_by = 'deterministic_rule'
    and opportunity.source_expense_id is not null
    and opportunity.rule_key is not null
    and opportunity.rule_version is not null
    and opportunity.calculation_inputs <> '{}'::jsonb
    and opportunity.calculation_result <> '{}'::jsonb
    and exists (
      select 1
      from public.opportunity_evidence link
      where link.opportunity_id = opportunity.id
    )
    then 'evidence_backed'
  else 'needs_evidence'
end;

update public.opportunities
set customer_visible = false
where trust_state = 'deprecated'
   or lower(coalesce(title, '') || ' ' || coalesce(summary, '')) like '%meter #4491%'
   or lower(coalesce(title, '') || ' ' || coalesce(summary, '')) like '%tariff misclassification%';

create index if not exists opportunities_customer_visibility_idx
  on public.opportunities (organization_id, customer_visible, trust_state, updated_at desc);

comment on column public.organizations.is_sample_workspace is
  'Marks seeded or demonstration workspaces so customer-facing screens can keep sample records visibly separate from uploaded records.';
comment on column public.opportunities.trust_state is
  'Customer-facing provenance state. It is not inferred from a title or amount alone.';
comment on column public.opportunities.customer_visible is
  'Owner-controlled visibility flag. False removes the opportunity from the customer portal without deleting audit history.';
