-- Migration: Category Intelligence & Taxonomy Master
-- Description: Creates canonical taxonomy, knowledge tables, and RLS policies for Category Intelligence Layer

-- 1. Extend vendor_categories
alter table public.vendor_categories
  add column if not exists canonical_key text,
  add column if not exists description text,
  add column if not exists analysis_status text not null default 'draft',
  add column if not exists risk_level text not null default 'normal',
  add column if not exists benchmark_mode text not null default 'comparable_dimensions',
  add column if not exists default_freshness_days integer,
  add column if not exists expert_pack_version text,
  add column if not exists active boolean not null default true,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists idx_vendor_categories_canonical_key on public.vendor_categories(canonical_key) where canonical_key is not null;

-- 2. Create category_expert_packs table
create table if not exists public.category_expert_packs (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.vendor_categories(id) on delete cascade,
  version text not null,
  status text not null check (status in ('draft', 'verified', 'deprecated')),
  jurisdiction_scope text[] not null default array['US'],
  effective_from date,
  effective_to date,
  pack jsonb not null,
  source_snapshot_hash text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, version)
);

-- 3. Create category_line_item_definitions table
create table if not exists public.category_line_item_definitions (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.vendor_categories(id) on delete cascade,
  canonical_code text not null,
  canonical_label text not null,
  aliases text[] not null default array[]::text[],
  description text,
  charge_class text not null default 'fixed',
  units text[] not null default array[]::text[],
  calculation_method text,
  benchmarkable boolean not null default true,
  regulatory boolean not null default false,
  expected_evidence_fields text[] not null default array[]::text[],
  anomaly_rules text[] not null default array[]::text[],
  version text not null default 'v1',
  status text not null default 'verified',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, canonical_code)
);

-- 4. Create category_benchmark_definitions table
create table if not exists public.category_benchmark_definitions (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.vendor_categories(id) on delete cascade,
  benchmark_key text not null,
  metric text not null,
  required_dimensions text[] not null default array[]::text[],
  optional_dimensions text[] not null default array[]::text[],
  unit text,
  comparison_method text not null default 'percentile_range',
  minimum_comparables integer not null default 5,
  freshness_days integer not null default 90,
  source_requirements text[] not null default array[]::text[],
  output_policy jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  version text not null default 'v1',
  created_at timestamptz not null default now(),
  unique (category_id, benchmark_key)
);

-- 5. Create category_source_registry table
create table if not exists public.category_source_registry (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.vendor_categories(id) on delete cascade,
  source_name text not null,
  source_url text not null,
  source_type text not null,
  authority_level text not null default 'primary',
  access_type text not null default 'public_web',
  jurisdiction text not null default 'US',
  update_frequency text not null default 'monthly',
  last_verified_at timestamptz,
  next_review_at timestamptz,
  license_notes text,
  allowed_uses text[] not null default array['research', 'context']::text[],
  status text not null default 'active',
  created_at timestamptz not null default now()
);

-- 6. Create category_market_snapshots table
create table if not exists public.category_market_snapshots (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.vendor_categories(id) on delete cascade,
  jurisdiction text not null default 'US',
  effective_at timestamptz not null,
  expires_at timestamptz,
  metric_key text not null,
  dimensions jsonb not null default '{}'::jsonb,
  value numeric not null,
  unit text not null,
  source_id uuid references public.category_source_registry(id) on delete set null,
  source_url text,
  retrieved_at timestamptz not null default now(),
  confidence numeric not null default 1.0,
  raw_hash text
);

-- 7. Create invoice_line_item_classifications table
create table if not exists public.invoice_line_item_classifications (
  id uuid primary key default gen_random_uuid(),
  invoice_line_item_id uuid not null references public.invoice_line_items(id) on delete cascade,
  category_id uuid references public.vendor_categories(id) on delete set null,
  canonical_code text,
  confidence numeric not null default 1.0,
  source text not null default 'rule_match',
  expert_pack_version text,
  evidence_reference_ids uuid[] not null default array[]::uuid[],
  review_status text not null default 'auto_approved',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (invoice_line_item_id)
);

-- 8. Create category_analysis_runs table
create table if not exists public.category_analysis_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  category_id uuid references public.vendor_categories(id) on delete set null,
  pack_version text,
  rules_executed text[] not null default array[]::text[],
  live_sources_used jsonb not null default '[]'::jsonb,
  calculations jsonb not null default '{}'::jsonb,
  findings jsonb not null default '[]'::jsonb,
  missing_dimensions text[] not null default array[]::text[],
  confidence numeric not null default 1.0,
  trace_id text,
  created_at timestamptz not null default now()
);

-- 9. Create category_feedback table
create table if not exists public.category_feedback (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  category_id uuid references public.vendor_categories(id) on delete cascade,
  invoice_line_item_id uuid references public.invoice_line_items(id) on delete set null,
  target_type text not null,
  original_value text,
  corrected_value text not null,
  reason text,
  submitted_by uuid not null,
  reviewed_by uuid,
  reviewed_at timestamptz,
  status text not null default 'submitted',
  created_at timestamptz not null default now()
);

-- 10. Create category_eval_cases table
create table if not exists public.category_eval_cases (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.vendor_categories(id) on delete cascade,
  case_name text not null,
  description text,
  sample_input jsonb not null,
  expected_output jsonb not null,
  is_adversarial boolean not null default false,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

-- Enable RLS on new tables
alter table public.category_expert_packs enable row level security;
alter table public.category_line_item_definitions enable row level security;
alter table public.category_benchmark_definitions enable row level security;
alter table public.category_source_registry enable row level security;
alter table public.category_market_snapshots enable row level security;
alter table public.invoice_line_item_classifications enable row level security;
alter table public.category_analysis_runs enable row level security;
alter table public.category_feedback enable row level security;
alter table public.category_eval_cases enable row level security;

-- Public/Authenticated read policies for taxonomy knowledge
create policy "Authenticated users can read vendor categories"
  on public.vendor_categories for select to authenticated using (true);

create policy "Authenticated users can read category expert packs"
  on public.category_expert_packs for select to authenticated using (true);

create policy "Authenticated users can read line item definitions"
  on public.category_line_item_definitions for select to authenticated using (true);

create policy "Authenticated users can read benchmark definitions"
  on public.category_benchmark_definitions for select to authenticated using (true);

create policy "Authenticated users can read source registry"
  on public.category_source_registry for select to authenticated using (true);

create policy "Authenticated users can read market snapshots"
  on public.category_market_snapshots for select to authenticated using (true);

create policy "Users can read line item classifications for their org invoices"
  on public.invoice_line_item_classifications for select to authenticated using (
    exists (
      select 1 from public.invoice_line_items ili
      join public.invoices inv on inv.id = ili.invoice_id
      join public.organization_memberships m on m.organization_id = inv.organization_id
      where ili.id = invoice_line_item_classifications.invoice_line_item_id
        and m.user_id = auth.uid()
    )
  );

create policy "Users can read category analysis runs for their org"
  on public.category_analysis_runs for select to authenticated using (
    exists (
      select 1 from public.organization_memberships m
      where m.organization_id = category_analysis_runs.organization_id
        and m.user_id = auth.uid()
    )
  );

create policy "Users can submit category feedback for their org"
  on public.category_feedback for select to authenticated using (
    organization_id is null or exists (
      select 1 from public.organization_memberships m
      where m.organization_id = category_feedback.organization_id
        and m.user_id = auth.uid()
    )
  );

create policy "Users can insert category feedback for their org"
  on public.category_feedback for insert to authenticated with check (
    organization_id is null or exists (
      select 1 from public.organization_memberships m
      where m.organization_id = category_feedback.organization_id
        and m.user_id = auth.uid()
    )
  );
