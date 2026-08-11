-- Durable, internal-only history for the Manage assistant.
-- This must never share the customer-facing chat_sessions tables because the
-- Manage assistant can work across customer organizations.

create table if not exists public.internal_assistant_sessions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.internal_staff_users(user_id) on delete cascade,
  title text not null default 'New conversation' check (char_length(title) between 1 and 100),
  section text,
  detail_id text,
  last_message_preview text,
  last_message_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.internal_assistant_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.internal_assistant_sessions(id) on delete cascade,
  actor_id uuid not null references public.internal_staff_users(user_id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 4000),
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists internal_assistant_sessions_actor_recent_idx
  on public.internal_assistant_sessions (actor_id, archived_at, last_message_at desc nulls last, id);
create index if not exists internal_assistant_messages_session_created_idx
  on public.internal_assistant_messages (session_id, created_at, id);

alter table public.internal_assistant_sessions enable row level security;
alter table public.internal_assistant_messages enable row level security;

revoke all on public.internal_assistant_sessions, public.internal_assistant_messages from anon, authenticated;
grant all on public.internal_assistant_sessions, public.internal_assistant_messages to service_role;

create policy "No browser access to internal assistant sessions"
  on public.internal_assistant_sessions for all to anon, authenticated
  using (false) with check (false);
create policy "No browser access to internal assistant messages"
  on public.internal_assistant_messages for all to anon, authenticated
  using (false) with check (false);

comment on table public.internal_assistant_sessions is
  'Server-only personal history for the Costivra internal operations assistant.';
comment on table public.internal_assistant_messages is
  'Server-only internal assistant messages and source summaries; never exposed through browser database roles.';
