-- Direct Gmail/Outlook authorization foundation.
-- Tokens are encrypted application-side and never exposed through the browser API.

create table if not exists public.mailbox_oauth_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connected_by uuid not null references public.profiles(id),
  provider text not null check (provider in ('google_gmail', 'microsoft_graph')),
  provider_account_id text not null,
  provider_email text not null,
  access_token_ciphertext text not null,
  refresh_token_ciphertext text not null,
  token_expires_at timestamptz not null,
  granted_scopes text[] not null default '{}',
  sync_cursor text,
  status text not null default 'connected' check (status in ('pending', 'connected', 'reauthorization_required', 'paused', 'revoked', 'error')),
  last_synced_at timestamptz,
  last_error_code text,
  last_error_at timestamptz,
  connected_at timestamptz not null default now(),
  disconnected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider, provider_account_id)
);

create index if not exists mailbox_oauth_connections_org_status_idx
  on public.mailbox_oauth_connections (organization_id, status);

create index if not exists mailbox_oauth_connections_sync_idx
  on public.mailbox_oauth_connections (status, last_synced_at)
  where status = 'connected';

alter table public.mailbox_oauth_connections enable row level security;

revoke all on public.mailbox_oauth_connections from anon;
revoke all on public.mailbox_oauth_connections from authenticated;

comment on table public.mailbox_oauth_connections is
  'Tenant-scoped Gmail/Microsoft OAuth connections. Token ciphertext is application-encrypted and service-only.';
