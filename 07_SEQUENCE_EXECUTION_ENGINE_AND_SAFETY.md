# Packet 07: Sequence Execution Engine and Safety

## Mission

Enable approved Costivra sequences to execute safely. Build the deterministic scheduler, atomic claim path, reusable outbound-email service, task advancement, stop rules, unsubscribe handling, daily caps, and recovery controls.

This packet changes external behavior. It must fail closed.

## Required files to inspect

```text
src/app/api/manage/mail/messages/route.ts
src/lib/manage/mail.ts
src/lib/manage/mailbox-access.ts
src/lib/manage/email-signature.ts
src/lib/email/resend.ts
src/app/api/webhooks/resend/route.ts
src/app/api/cron/inbound-email/route.ts
src/lib/cron/auth.ts
src/app/api/manage/tasks/[id]/route.ts
vercel.json
```

Inspect all Packet 05 schema and Packet 06 UI code.

## Core rule

Sequence execution must call the same audited outbound-email service as manual Manage email. Do not create a second, weaker send implementation.

## Workstream A: Extract reusable outbound-email service

Refactor the non-UI business logic from:

```text
src/app/api/manage/mail/messages/route.ts
```

into a server-only service such as:

```text
src/lib/manage/outbound-email.ts
```

The service must support:

- manual immediate send
- manual scheduled send
- sequence automatic send
- sequence test send to operator

It must preserve:

- mailbox authorization
- account/contact linkage
- sanitization
- signature rendering
- thread headers
- request hash
- stable idempotency
- `external_side_effects`
- CRM thread/message records
- CRM activity
- internal audit events
- Resend provider acceptance
- delivery reconciliation

Do not allow sequence sends to include attachments in v1.

## Workstream B: Deterministic scheduling

Create pure functions for:

- add minutes
- add hours
- add calendar days
- add business days
- move into allowed send window
- skip disallowed weekdays
- resolve recipient timezone
- fallback to sequence timezone
- calculate next action after a completed step

Suggested file:

```text
src/lib/manage/sequences/schedule.ts
```

Use IANA timezones. Test daylight-saving transitions.

Do not use an LLM for timing.

## Workstream C: Atomic claim path

Add a database function or equivalent atomic operation that:

- finds due active enrollments;
- skips terminal, paused, locked, or suppressed records;
- orders predictably;
- claims a bounded batch;
- sets lock token and lock timestamp;
- prevents two Vercel workers from executing the same action.

Prefer `SECURITY INVOKER` with service-role-only execution.

Revoke execute from:

- PUBLIC
- anon
- authenticated

Add stale-lock recovery with a bounded age.

## Workstream D: Cron worker

Add:

```text
/api/cron/outreach-sequences
```

Add a schedule to `vercel.json`.

The worker must:

1. authenticate with existing cron authorization;
2. claim a small batch;
3. re-check suppression and contact state;
4. load authoritative contact, company, mailbox, sender, sequence, and step records;
5. render allowlisted variables;
6. execute the step;
7. write sequence event;
8. advance or stop enrollment atomically;
9. release the lock;
10. return safe aggregate results.

Bound:

- batch size
- runtime
- retries
- sends per mailbox
- sends per sequence
- sends per day

## Workstream E: Activation gate

Add the real activate endpoint only now.

A sequence may activate only when:

- status is draft or paused;
- at least one valid step exists;
- safety stop rules are enabled;
- schedule is valid;
- no unsupported step type exists;
- no unresolved token exists;
- automatic emails have subject/body;
- first step is preferably manual email;
- the execution feature flag is enabled;
- the current operator is authorized;
- the current release readiness check is not blocked.

Activation writes an audit event.

Editing step content while active is prohibited. Require pause and zero active enrollments, or clone to a new draft.

## Workstream F: Automatic email step

For each automatic email:

- stable idempotency key:
  `sequence:<enrollmentId>:<stepId>:<attempt>`
- request hash derived from final recipients and rendered content
- origin `sequence`
- sequence link fields on CRM message
- side-effect authorization method `sequence_step`
- provider acceptance persisted
- sequence event persisted
- thread mode honored
- next action scheduled only after the durable send operation succeeds

Do not count provider acceptance as delivery.

## Workstream G: Manual email and task steps

### Manual email

Create a `crm_tasks` record with:

- sequence origin
- enrollment
- step
- contact
- account
- suggested subject/body
- due time

The sequence enters `waiting_for_task`.

Completing the task from Outreach should:

- open or use the normal composer;
- preserve the sequence linkage;
- require the operator to click send;
- advance only after the email send succeeds;
- write task-completed and step-completed events.

### Call/general task

Create the task and wait.

Marking it complete advances the sequence. Skipping must require an explicit reason and audit event.

## Workstream H: Stop rules

Stop immediately on:

- inbound reply
- hard bounce
- complaint
- unsubscribe
- manual stop
- contact deactivation
- mailbox disabled
- global suppression
- invalid recipient
- company-level reply rule when enabled

Pause, rather than stop, on:

- temporary provider outage
- temporary mailbox issue
- daily limit exhaustion
- schedule window closure

Do not send after a reply merely because the next action was already claimed. Re-check immediately before the external send.

## Workstream I: Reply association

When a signed inbound Resend event creates or updates a CRM thread:

- resolve contact and organization;
- find the active enrollment for that contact;
- set replied state;
- record reply timestamp;
- clear next action;
- create sequence event;
- optionally stop same-company enrollments when configured;
- create a human follow-up task if appropriate.

Do not classify reply sentiment in v1.

## Workstream J: Bounce, complaint, and suppression

On provider events:

- update CRM message delivery state;
- stop the enrollment;
- update contact status where appropriate;
- insert a global suppression;
- prevent future enrollment;
- preserve safe provider reason.

Soft bounces may pause and retry according to a bounded policy. Hard bounces stop.

## Workstream K: Unsubscribe

Add a signed, opaque unsubscribe mechanism.

Requirements:

- no PII in the token;
- token expiry or revocation strategy;
- one-click POST support where possible;
- `List-Unsubscribe` headers;
- `List-Unsubscribe-Post` header for one-click;
- simple confirmation response;
- global suppression record;
- enrollment stopped;
- contact communication status updated;
- audit event;
- idempotent repeat requests.

This is not a new Manage navigation page. A minimal public compliance endpoint is allowed.

## Workstream L: Capacity and deliverability

Pilot defaults:

- conservative daily cap per mailbox
- business-day send window
- local timezone when known
- no weekend sends by default
- no open tracking required
- reply rate, bounce rate, complaint rate, and unsubscribe rate are primary
- automatically pause a mailbox or sequence when reviewed safety thresholds are exceeded

Do not implement mailbox warm-up or artificial engagement traffic.

## Workstream M: Recovery controls

Inside Outreach, operators need:

- worker health
- due actions
- temporarily delayed
- failed actions
- retry safe failure
- stop enrollment
- pause sequence
- inspect event timeline

Never allow retry of a sent step when the provider result is ambiguous without reconciliation.

## Tests

Unit:

- schedule calculations
- DST
- token rendering
- suppression
- activation validation
- state transitions
- idempotency
- daily caps

Integration:

- concurrent workers claim once
- duplicate cron invocation
- automatic email
- manual task progression
- reply stop
- hard bounce
- unsubscribe
- mailbox disabled
- provider timeout
- stale lock recovery
- cross-tenant rejection

Browser:

- activate sequence
- pending enrollment begins
- manual first step
- automatic later step
- pause/resume
- stop
- recovery view

Run:

```bash
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run build
npm run test:e2e
npm run test:e2e:authenticated
npm run ops:verify
```

## Acceptance criteria

- The worker cannot double-send a step.
- Reply, bounce, complaint, and unsubscribe stop future sends.
- Manual tasks genuinely pause progression.
- All sends use the canonical outbound-email service.
- Every external send has a side-effect ledger record.
- Daily caps and send windows are enforced.
- Activation is blocked for invalid sequences.
- Recovery controls exist.
- No unsupported automation was added.
- No branch, commit, push, merge, or deployment was performed.
