create table if not exists public.mailbox_oauth_states (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('google_gmail', 'microsoft_graph')),
  state_hash text not null unique,
  code_verifier_ciphertext text not null,
  redirect_uri text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists mailbox_oauth_states_expiry_idx
  on public.mailbox_oauth_states (expires_at)
  where used_at is null;

alter table public.mailbox_oauth_states enable row level security;
revoke all on public.mailbox_oauth_states from anon;
revoke all on public.mailbox_oauth_states from authenticated;

comment on table public.mailbox_oauth_states is
  'Short-lived, service-only OAuth state and PKCE records; browser clients never read this table.';
