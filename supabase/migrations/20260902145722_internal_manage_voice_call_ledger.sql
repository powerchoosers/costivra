-- Service-only ledger for browser calls made or received in the internal
-- Manage workspace. It is separate from tenant-scoped customer effects.

create table public.internal_voice_calls (
  id uuid primary key default gen_random_uuid(),
  twilio_call_sid text not null unique check (twilio_call_sid ~ '^CA[0-9A-Fa-f]{32}$'),
  child_call_sid text check (child_call_sid is null or child_call_sid ~ '^CA[0-9A-Fa-f]{32}$'),
  idempotency_key text not null unique,
  provider text not null default 'twilio' check (provider = 'twilio'),
  provider_reference text,
  direction text not null check (direction in ('inbound', 'outbound')),
  status text not null default 'initiated' check (status in (
    'queued', 'initiated', 'ringing', 'in-progress', 'completed',
    'busy', 'failed', 'no-answer', 'canceled'
  )),
  from_number text not null,
  to_number text not null,
  caller_number text not null,
  callee_number text not null,
  operator_id uuid references public.internal_staff_users(user_id) on delete set null,
  display_name text check (display_name is null or char_length(display_name) <= 160),
  authorized_at timestamptz,
  authorization_method text not null check (authorization_method in ('operator_call_click', 'inbound_webhook')),
  started_at timestamptz not null default timezone('utc'::text, now()),
  answered_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  recording_sid text check (recording_sid is null or recording_sid ~ '^RE[0-9A-Fa-f]{32}$'),
  recording_duration_seconds integer check (recording_duration_seconds is null or recording_duration_seconds >= 0),
  is_voicemail boolean not null default false,
  is_read boolean not null default false,
  last_sequence_number integer not null default 0 check (last_sequence_number >= 0),
  safe_metadata jsonb not null default '{}'::jsonb,
  trace_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  check (
    (direction = 'outbound' and operator_id is not null and authorized_at is not null and authorization_method = 'operator_call_click')
    or
    (direction = 'inbound' and authorized_at is null and authorization_method = 'inbound_webhook')
  )
);

create index internal_voice_calls_operator_started_idx
  on public.internal_voice_calls (operator_id, started_at desc)
  where operator_id is not null;

create index internal_voice_calls_status_started_idx
  on public.internal_voice_calls (status, started_at desc);

create index internal_voice_calls_voicemail_idx
  on public.internal_voice_calls (created_at desc)
  where is_voicemail = true;

alter table public.internal_voice_calls enable row level security;

create policy "deny browser access to internal voice calls"
  on public.internal_voice_calls
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on table public.internal_voice_calls from anon, authenticated;
grant all on table public.internal_voice_calls to service_role;

comment on table public.internal_voice_calls is
  'Service-only, append-attributed ledger for internal Manage browser calls and Twilio lifecycle reconciliation.';
