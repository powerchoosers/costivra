-- Durable, server-only cache for public category market research.
-- No customer identifiers, documents, service addresses, or financial amounts
-- may be written here. The cache key is a hash of public-safe dimensions only.

create table if not exists public.category_research_runs (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null unique,
  category_key text not null,
  jurisdiction text,
  vendor_name text,
  metric_key text,
  query_hash text not null,
  result jsonb not null,
  source_ids text[] not null default array[]::text[],
  retrieved_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists category_research_runs_fresh_cache_idx
  on public.category_research_runs (category_key, expires_at desc);

alter table public.category_research_runs enable row level security;

-- This cache is written and read only by trusted server code with the service
-- role. Do not add browser policies: research results are only returned through
-- tenant-scoped application flows after request validation.
