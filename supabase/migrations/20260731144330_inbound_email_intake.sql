create table if not exists public.inbound_email_addresses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  local_part text not null check (local_part ~ '^[a-z0-9][a-z0-9-]{2,62}$'),
  domain text not null default 'inbound.costivra.ai',
  status text not null default 'pending' check (status in ('pending','active','paused','error')),
  trusted_senders jsonb not null default '[]'::jsonb check (jsonb_typeof(trusted_senders) = 'array'),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id),
  unique (domain, local_part)
);

create table if not exists public.inbound_email_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  intake_address_id uuid not null references public.inbound_email_addresses(id) on delete cascade,
  resend_email_id text not null unique,
  message_id text,
  sender_address text not null,
  recipient_addresses jsonb not null default '[]'::jsonb check (jsonb_typeof(recipient_addresses) = 'array'),
  subject text not null default '(no subject)',
  status text not null default 'received' check (status in ('received','processing','quarantined','processed','needs_review','rejected','failed','duplicate')),
  attachment_count integer not null default 0 check (attachment_count >= 0),
  processed_attachment_count integer not null default 0 check (processed_attachment_count >= 0),
  body_preview text,
  error_message text,
  received_at timestamptz not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inbound_email_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.inbound_email_events(id) on delete cascade,
  resend_attachment_id text not null,
  filename text not null,
  content_type text not null,
  byte_size bigint not null default 0 check (byte_size >= 0),
  sha256 text,
  quarantine_storage_path text,
  document_id uuid references public.documents(id) on delete set null,
  scan_status text not null default 'pending' check (scan_status in ('pending','clean','infected','unavailable','failed')),
  processing_status text not null default 'pending' check (processing_status in ('pending','quarantined','processed','duplicate','unsupported','failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, resend_attachment_id)
);

create index if not exists inbound_email_events_org_received_idx on public.inbound_email_events (organization_id, received_at desc);
create index if not exists inbound_email_events_status_idx on public.inbound_email_events (status, received_at);
create index if not exists inbound_email_attachments_event_idx on public.inbound_email_attachments (event_id);
create index if not exists inbound_email_attachments_document_idx on public.inbound_email_attachments (document_id) where document_id is not null;

alter table public.inbound_email_addresses enable row level security;
alter table public.inbound_email_events enable row level security;
alter table public.inbound_email_attachments enable row level security;

grant select on public.inbound_email_addresses, public.inbound_email_events, public.inbound_email_attachments to authenticated;
revoke all on public.inbound_email_addresses, public.inbound_email_events, public.inbound_email_attachments from anon;

create policy "Members read inbound addresses" on public.inbound_email_addresses for select to authenticated
  using (exists (select 1 from public.organization_memberships m where m.organization_id = inbound_email_addresses.organization_id and m.user_id = (select auth.uid())));
create policy "Members read inbound events" on public.inbound_email_events for select to authenticated
  using (exists (select 1 from public.organization_memberships m where m.organization_id = inbound_email_events.organization_id and m.user_id = (select auth.uid())));
create policy "Members read inbound attachments" on public.inbound_email_attachments for select to authenticated
  using (exists (select 1 from public.organization_memberships m where m.organization_id = inbound_email_attachments.organization_id and m.user_id = (select auth.uid())));

insert into public.inbound_email_addresses (organization_id, local_part, domain)
select o.id,
  trim(both '-' from left(regexp_replace(lower(o.name), '[^a-z0-9]+', '-', 'g'), 48)) || '-' || left(replace(o.id::text, '-', ''), 6),
  'inbound.costivra.ai'
from public.organizations o
on conflict (organization_id) do nothing;

insert into public.integrations (organization_id, provider, display_name, description, status, configuration)
select o.id, 'resend_inbound', 'Email document intake',
  'Forward invoices and contracts to a private organization-specific address.',
  'available', '{}'::jsonb
from public.organizations o
on conflict (organization_id, provider) do update
set display_name = excluded.display_name,
    description = excluded.description,
    updated_at = now();
