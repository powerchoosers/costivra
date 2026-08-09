# Packet 05: Outreach Sequence Data Model and APIs

## Mission

Create the durable server-side foundation for a small, controlled sales sequence system inside Costivra. This packet builds schema, types, validation, draft CRUD, suppression controls, and read APIs.

It does not send automated emails. It does not activate sequences. It does not add a new Manage page.

## Existing architecture to preserve

- `/manage/outreach` currently displays CRM tasks in a three-column board.
- `/manage/mail` currently displays Costivra mailboxes, folders, threads, and messages.
- `crm_tasks` holds internal follow-up work.
- `crm_email_threads` and `crm_email_messages` are the mailbox system of record.
- `external_side_effects` is the external-send ledger.
- `crm_email_events` stores provider events.
- `crm_marketing_consents` and contact status provide existing communication state.
- Mail sends already enforce mailbox authorization, contact/account linkage, request hashes, and idempotency.

## Required files to inspect

```text
src/components/manage-portal.tsx
src/lib/manage/types.ts
src/lib/manage/repository.ts
src/lib/manage/mail.ts
src/lib/manage/mailbox-access.ts
src/app/api/manage/tasks/
src/app/api/manage/mail/messages/route.ts
src/app/api/webhooks/resend/route.ts
supabase/migrations/
DECISIONS.md
STATUS.md
```

Inspect the live schema before writing a migration.

## Scope limits for v1

Supported step types:

- manual email task
- automatic email
- call task
- general task

Not supported:

- branching
- conditional subsequences
- SMS
- LinkedIn automation
- dialer automation
- attachments
- A/B testing
- spintax
- arbitrary AI content generation at send time
- automatic prospect sourcing
- automatic enrollment from Apollo
- bulk CSV import
- multiple simultaneous sequences per contact

## Data model

Use existing `crm_` naming.

### `crm_sequences`

Recommended fields:

- `id uuid primary key`
- `name text not null`
- `description text null`
- `status text not null`
  - draft
  - active
  - paused
  - archived
- `owner_id uuid not null`
- `timezone text not null`
- `business_days smallint[] not null`
- `send_start_local time not null`
- `send_end_local time not null`
- `daily_send_limit integer not null`
- `stop_on_reply boolean not null default true`
- `stop_on_bounce boolean not null default true`
- `stop_on_unsubscribe boolean not null default true`
- `stop_company_on_reply boolean not null default false`
- `execution_enabled boolean not null default false`
- `activated_at timestamptz null`
- `paused_at timestamptz null`
- `archived_at timestamptz null`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

Constraints:

- valid status
- at least one business day
- start time before end time
- daily limit within reviewed pilot bounds
- active requires `execution_enabled = true`
- archived cannot be active

### `crm_sequence_steps`

Recommended fields:

- `id uuid primary key`
- `sequence_id uuid not null`
- `position integer not null`
- `step_type text not null`
- `delay_value integer not null`
- `delay_unit text not null`
  - minutes
  - hours
  - business_days
  - calendar_days
- `thread_mode text null`
  - new_thread
  - reply_to_previous
- `subject_template text null`
- `body_html text null`
- `body_text text null`
- `task_title_template text null`
- `task_notes_template text null`
- `task_priority text null`
- `pause_until_task_complete boolean not null default true`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

Constraints:

- unique sequence and position
- valid type
- delay is non-negative
- email fields allowed only for email steps
- task fields allowed only for task steps
- step 1 delay must be zero
- reply threading is invalid when no prior email step exists

### `crm_sequence_enrollments`

Recommended fields:

- `id uuid primary key`
- `sequence_id uuid not null`
- `organization_id uuid not null`
- `contact_id uuid not null`
- `mailbox_id uuid not null`
- `enrolled_by uuid not null`
- `state text not null`
  - pending
  - active
  - paused
  - waiting_for_task
  - replied
  - bounced
  - unsubscribed
  - stopped
  - completed
  - failed
- `current_step_id uuid null`
- `current_step_position integer not null default 0`
- `next_action_at timestamptz null`
- `started_at timestamptz null`
- `paused_at timestamptz null`
- `stopped_at timestamptz null`
- `completed_at timestamptz null`
- `stop_reason text null`
- `reply_detected_at timestamptz null`
- `bounce_detected_at timestamptz null`
- `unsubscribed_at timestamptz null`
- `personalization jsonb not null default '{}'`
- `lock_token uuid null`
- `locked_at timestamptz null`
- `attempt_count integer not null default 0`
- `last_error_code text null`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

Constraints:

- one nonterminal enrollment per contact
- contact belongs to organization
- mailbox is active and send-capable
- no next action for terminal states
- no automatic activation in this packet

### `crm_sequence_events`

Recommended fields:

- `id uuid primary key`
- `sequence_id uuid not null`
- `enrollment_id uuid not null`
- `step_id uuid null`
- `event_type text not null`
- `email_message_id uuid null`
- `email_thread_id uuid null`
- `task_id uuid null`
- `external_side_effect_id uuid null`
- `provider_event_id text null`
- `safe_metadata jsonb not null default '{}'`
- `occurred_at timestamptz not null`
- `created_at timestamptz not null`

Events include:

- enrolled
- step_scheduled
- task_created
- task_completed
- email_queued
- email_sent
- email_delivered
- reply_received
- bounced
- unsubscribed
- paused
- resumed
- stopped
- completed
- failed

### `crm_outreach_suppressions`

Recommended fields:

- `id uuid primary key`
- `email_normalized text null`
- `domain_normalized text null`
- `reason text not null`
  - unsubscribed
  - bounced
  - complained
  - manual
  - legal
- `source text not null`
- `provider_reference text null`
- `created_by uuid null`
- `created_at timestamptz not null`
- `expires_at timestamptz null`

Require email or domain. Prevent duplicates for active suppressions.

## Extend existing tables

Add nullable sequence linkage to `crm_email_messages`:

- `origin text not null default 'manual'`
- `sequence_id uuid null`
- `sequence_enrollment_id uuid null`
- `sequence_step_id uuid null`
- `external_side_effect_id uuid null`

Add nullable sequence linkage to `crm_tasks`:

- `origin text not null default 'manual'`
- `sequence_id uuid null`
- `sequence_enrollment_id uuid null`
- `sequence_step_id uuid null`

Add covering indexes for:

- due enrollments
- sequence status
- enrollment contact/state
- sequence-origin messages
- sequence-origin tasks
- suppression lookup

Do not remove young or unused indexes merely because production traffic is low.

## RLS and privileges

These are internal CRM tables.

Requirements:

- RLS enabled.
- Customer portal users receive no access.
- `anon` receives no access.
- Normal authenticated customer users receive no access.
- Internal operator access remains server-authorized through `requireInternalOperator`.
- Do not grant broad browser writes.
- Operational claim functions must not be executable by browser roles.
- Keep organization consistency checks in database constraints or trigger functions.

## API design

Keep all APIs under the existing Manage namespace.

Suggested endpoints:

```text
GET    /api/manage/outreach/sequences
POST   /api/manage/outreach/sequences
GET    /api/manage/outreach/sequences/[id]
PATCH  /api/manage/outreach/sequences/[id]
POST   /api/manage/outreach/sequences/[id]/clone
POST   /api/manage/outreach/sequences/[id]/pause
POST   /api/manage/outreach/sequences/[id]/archive

POST   /api/manage/outreach/sequences/[id]/steps
PATCH  /api/manage/outreach/sequences/[id]/steps/[stepId]
DELETE /api/manage/outreach/sequences/[id]/steps/[stepId]
POST   /api/manage/outreach/sequences/[id]/steps/reorder

GET    /api/manage/outreach/enrollments
POST   /api/manage/outreach/enrollments/preview
POST   /api/manage/outreach/enrollments
POST   /api/manage/outreach/enrollments/[id]/pause
POST   /api/manage/outreach/enrollments/[id]/stop
```

Do not add a public activation endpoint in this packet.

## Draft validation

A sequence may save as draft with incomplete content.

Before it can later activate, validation will require:

- name
- at least one step
- valid schedule
- stop-on-reply enabled
- stop-on-bounce enabled
- stop-on-unsubscribe enabled
- no unresolved template tokens
- no empty automatic email
- no invalid step order
- no prohibited step type

Create a reusable validator:

```text
src/lib/manage/sequences/validation.ts
```

## Template variables

Pilot allowlist:

```text
{{first_name}}
{{full_name}}
{{company_name}}
{{job_title}}
{{industry}}
{{website}}
{{sender_name}}
{{sender_title}}
```

Rules:

- No arbitrary object access.
- No code evaluation.
- Unknown tokens block activation.
- HTML is sanitized.
- Preview uses explicit sample values.
- Final send-time values come from authoritative CRM/profile records.
- AI may help draft copy only through an explicit operator action. Store the approved final text. Do not generate copy during the worker send.

## Dedicated repository layer

Do not load every sequence, step, and enrollment in `getManageData()` on every Manage route.

Create a dedicated server layer such as:

```text
src/lib/manage/sequences/repository.ts
src/lib/manage/sequences/types.ts
src/lib/manage/sequences/service.ts
```

Load sequence data only when the Outreach sequence tab requests it.

## Tests

Add:

- schema constraint tests where supported
- RLS and privilege checks
- draft CRUD tests
- step reorder tests
- cross-record organization mismatch tests
- suppression lookup tests
- duplicate enrollment tests
- template-token validation tests
- authorization tests
- no customer access test

Run:

```bash
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run build
```

## Acceptance criteria

- The sequence schema is durable and tenant-consistent.
- Draft CRUD works.
- Sequence data is not loaded globally on every Manage route.
- Customer users cannot access sequence data.
- Suppression checks are represented in the model.
- Existing manual mail and tasks continue to work.
- No automatic sequence email can send yet.
- No new Manage page or sidebar item was added.
- No branch, commit, push, merge, or deployment was performed.
