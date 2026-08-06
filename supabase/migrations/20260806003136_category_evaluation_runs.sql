-- Category Intelligence evaluation results are operational release evidence.
-- They contain no customer records, source documents, prompts, or secrets.
create table if not exists public.category_evaluation_runs (
  id uuid primary key default gen_random_uuid(),
  suite text not null check (suite in ('categories', 'line_items', 'benchmarks', 'market_research')),
  suite_version text not null,
  runner_revision text not null,
  data_classification text not null check (data_classification in ('synthetic', 'deidentified', 'consented')),
  coverage_level text not null check (coverage_level in ('structural', 'representative')),
  case_count integer not null check (case_count >= 0),
  passed boolean not null,
  metrics jsonb not null default '{}'::jsonb,
  thresholds jsonb not null default '{}'::jsonb,
  pack_versions jsonb not null default '{}'::jsonb,
  source_registry_hash text,
  evaluated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists category_evaluation_runs_suite_evaluated_idx
  on public.category_evaluation_runs (suite, evaluated_at desc);

alter table public.category_evaluation_runs enable row level security;

-- Release evidence is server-only. Do not expose a generic browser policy.
revoke all on table public.category_evaluation_runs from anon, authenticated;
grant select, insert on table public.category_evaluation_runs to service_role;
