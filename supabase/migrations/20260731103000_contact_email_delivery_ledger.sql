create table if not exists public.contact_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.contact_inquiries(id) on delete cascade,
  kind text not null check (kind in ('receipt', 'notification')),
  destination text not null,
  idempotency_key text not null unique,
  request_hash text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists contact_email_deliveries_inquiry_idx on public.contact_email_deliveries (inquiry_id, created_at desc);
alter table public.contact_email_deliveries enable row level security;
revoke all on public.contact_email_deliveries from anon, authenticated;

create policy "No browser access to contact email deliveries"
  on public.contact_email_deliveries for all to anon, authenticated
  using (false) with check (false);

comment on table public.contact_email_deliveries is 'Server-only idempotency and outcome ledger for public contact inquiry emails.';
