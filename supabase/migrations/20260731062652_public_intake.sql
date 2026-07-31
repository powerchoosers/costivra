create table if not exists public.contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text not null,
  locations text,
  message text not null,
  status text not null default 'new' check (status in ('new','in_progress','resolved','spam')),
  created_at timestamptz not null default now()
);

alter table public.contact_inquiries enable row level security;
revoke all on public.contact_inquiries from anon, authenticated;
