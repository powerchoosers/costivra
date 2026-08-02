drop index if exists public.savings_outcomes_opportunity_key;

create unique index savings_outcomes_opportunity_key
  on public.savings_outcomes (opportunity_id);

comment on index public.savings_outcomes_opportunity_key is
  'At most one savings outcome may belong to an opportunity. PostgreSQL still permits multiple rows with a null opportunity_id.';
