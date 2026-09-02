-- Internal Twilio number inventory and browser-phone routing.
-- This is intentionally service-role only. The public site reads only the
-- active main number through a server-side route after a purchase succeeds.
create table if not exists public.internal_voice_numbers (
  id uuid primary key default gen_random_uuid(),
  twilio_phone_sid text not null unique,
  phone_number text not null unique,
  friendly_name text,
  number_type text not null default 'local',
  capabilities jsonb not null default '{}'::jsonb,
  monthly_price_cents integer,
  currency text not null default 'USD',
  status text not null default 'active' check (status in ('active','retiring','released')),
  is_main boolean not null default false,
  purchased_at timestamptz not null default now(),
  released_at timestamptz,
  created_by uuid references public.internal_staff_users(user_id) on delete set null,
  updated_by uuid references public.internal_staff_users(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists internal_voice_numbers_main_idx
  on public.internal_voice_numbers (is_main) where is_main = true and status = 'active';

create table if not exists public.internal_voice_number_routes (
  id uuid primary key default gen_random_uuid(),
  number_id uuid not null references public.internal_voice_numbers(id) on delete cascade,
  operator_id uuid not null references public.internal_staff_users(user_id) on delete cascade,
  priority integer not null default 0 check (priority >= 0),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (number_id, operator_id)
);

alter table public.internal_voice_numbers enable row level security;
alter table public.internal_voice_number_routes enable row level security;
revoke all on public.internal_voice_numbers, public.internal_voice_number_routes from anon, authenticated;
grant all on public.internal_voice_numbers, public.internal_voice_number_routes to service_role;
create policy "No browser access to internal voice numbers"
  on public.internal_voice_numbers for all to anon, authenticated using (false) with check (false);
create policy "No browser access to internal voice number routes"
  on public.internal_voice_number_routes for all to anon, authenticated using (false) with check (false);

comment on table public.internal_voice_numbers is
  'Server-only Twilio number inventory. Public presentation is allowed only for the active main row.';
comment on table public.internal_voice_number_routes is
  'Server-only browser-phone routing allowlist for the selected Costivra operators.';
