create index if not exists savings_outcomes_baseline_accepted_by_idx
  on public.savings_outcomes (baseline_accepted_by) where baseline_accepted_by is not null;
create index if not exists savings_outcomes_verified_by_idx
  on public.savings_outcomes (verified_by) where verified_by is not null;
create index if not exists savings_outcomes_rejected_by_idx
  on public.savings_outcomes (rejected_by) where rejected_by is not null;
