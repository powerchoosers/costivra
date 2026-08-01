alter table public.opportunities
  add column if not exists rule_key text,
  add column if not exists rule_version text,
  add column if not exists source_expense_id uuid references public.expenses(id) on delete set null,
  add column if not exists baseline_expense_id uuid references public.expenses(id) on delete set null,
  add column if not exists calculation_inputs jsonb not null default '{}'::jsonb,
  add column if not exists calculation_result jsonb not null default '{}'::jsonb,
  add column if not exists assumptions jsonb not null default '[]'::jsonb,
  add column if not exists generated_by text not null default 'manual'
    check (generated_by in ('manual','deterministic_rule')),
  add column if not exists last_evaluated_at timestamptz;

create unique index if not exists opportunities_rule_source_key
  on public.opportunities (organization_id, rule_key, source_expense_id);
create index if not exists opportunities_source_expense_idx
  on public.opportunities (source_expense_id) where source_expense_id is not null;
create index if not exists opportunities_baseline_expense_idx
  on public.opportunities (baseline_expense_id) where baseline_expense_id is not null;

alter table public.savings_outcomes
  add column if not exists baseline_expense_id uuid references public.expenses(id) on delete set null,
  add column if not exists comparison_expense_id uuid references public.expenses(id) on delete set null,
  add column if not exists baseline_amount numeric(14,2) check (baseline_amount is null or baseline_amount >= 0),
  add column if not exists comparison_amount numeric(14,2) check (comparison_amount is null or comparison_amount >= 0),
  add column if not exists method_version text,
  add column if not exists calculation_inputs jsonb not null default '{}'::jsonb,
  add column if not exists calculation_result jsonb not null default '{}'::jsonb,
  add column if not exists assumptions jsonb not null default '[]'::jsonb,
  add column if not exists exclusions jsonb not null default '[]'::jsonb,
  add column if not exists baseline_accepted_by uuid references public.profiles(id) on delete set null,
  add column if not exists baseline_accepted_at timestamptz,
  add column if not exists verified_by uuid references public.profiles(id) on delete set null,
  add column if not exists rejected_by uuid references public.profiles(id) on delete set null,
  add column if not exists rejected_at timestamptz,
  add column if not exists rejection_reason text;

alter table public.savings_outcomes drop constraint if exists savings_outcomes_status_check;
alter table public.savings_outcomes add constraint savings_outcomes_status_check
  check (status in ('pending','baseline_review','evidence_pending','ready_for_review','verified','rejected'));

create unique index if not exists savings_outcomes_opportunity_key
  on public.savings_outcomes (opportunity_id) where opportunity_id is not null;
create index if not exists savings_outcomes_baseline_expense_idx
  on public.savings_outcomes (baseline_expense_id) where baseline_expense_id is not null;
create index if not exists savings_outcomes_comparison_expense_idx
  on public.savings_outcomes (comparison_expense_id) where comparison_expense_id is not null;

comment on column public.opportunities.calculation_inputs is
  'Exact rule inputs. Financial values are decimal strings and are never model-generated calculations.';
comment on column public.opportunities.calculation_result is
  'Versioned deterministic calculation output, separate from the model narrative.';
comment on column public.savings_outcomes.baseline_accepted_at is
  'Human acceptance of the pre-action baseline and method. Required before work can start.';
comment on column public.savings_outcomes.verified_at is
  'Human verification timestamp after a later source record and deterministic comparison are available.';

grant select on public.opportunities, public.savings_outcomes to authenticated;
grant all on public.opportunities, public.savings_outcomes to service_role;
