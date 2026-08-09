# Packet 08: Mail Sequence Emails Tab and Reply Handling

## Mission

Add a dedicated Sequence emails view to the existing `/manage/mail` workspace. Operators must be able to inspect scheduled, sent, delivered, replied, bounced, suppressed, and failed sequence mail without adding a new top-level page.

Keep the current thread reader and mailbox controls.

## Required files to inspect

```text
src/components/manage-portal.tsx
src/lib/manage/types.ts
src/lib/manage/repository.ts
src/app/api/manage/mail/
src/app/api/webhooks/resend/route.ts
src/app/globals.css
```

Inspect Packet 05 sequence linkage and Packet 07 execution events.

## Route model

Keep:

```text
/manage/mail
```

Add a view query:

```text
/manage/mail?view=all&folder=inbox
/manage/mail?view=sequence
```

Top view tabs:

1. All mail
2. Sequence emails

Do not add `/manage/sequence-mail`.

## Repository loading

The current Manage repository loads many threads and messages globally. Do not make this heavier.

For the Sequence emails view:

- use a dedicated paginated API;
- query only sequence-origin messages and related enrollment context;
- load thread messages when a row opens;
- avoid placing every sequence event in `ManageData`;
- preserve existing All mail behavior.

Suggested endpoints:

```text
GET /api/manage/mail/sequence
GET /api/manage/mail/sequence/[messageOrThreadId]
POST /api/manage/mail/sequence/[enrollmentId]/pause
POST /api/manage/mail/sequence/[enrollmentId]/stop
POST /api/manage/mail/sequence/[messageId]/cancel
```

Only expose actions that are safe and supported.

## Sequence emails list

Header metrics:

- scheduled today
- sent today
- delivered
- replies
- bounced
- needs attention
- daily mailbox capacity

List columns:

- recipient
- account
- sequence
- step
- sender mailbox
- scheduled/sent time
- delivery state
- enrollment state
- subject
- actions

Filters:

- sequence
- status
- mailbox
- owner
- account
- date range

Statuses:

- scheduled
- queued
- sent
- delivered
- delayed
- replied
- bounced
- complained
- suppressed
- failed
- canceled

Do not derive delivered from `sent`.

## Thread behavior

Reuse the existing thread reader when the sequence email belongs to a CRM thread.

Add compact context near the subject:

```text
Sequence name · Step 2 of 4
```

Show:

- sequence
- enrollment state
- step type
- sender
- provider status
- scheduled time
- side-effect trace
- last enrollment event
- reply-stop state

Link to:

```text
/manage/outreach?tab=enrollments&enrollment=<uuid>
```

This is an existing route with nested state, not a new page.

## Scheduled sequence email

Before provider acceptance, allow:

- pause enrollment
- stop enrollment
- cancel the queued action

After Resend has accepted a scheduled send:

- cancel only through a verified provider-supported operation;
- reconcile the provider result;
- never hide an email locally while leaving it scheduled at the provider.

If cancel support is not reliable, pause future steps and clearly state that the already accepted message cannot be canceled.

## Reply handling display

When an inbound reply stops an enrollment, show:

- `Replied`
- reply timestamp
- stopped by reply
- future steps canceled
- follow-up task if one was created

Do not add AI sentiment labels in v1.

## Bounce and suppression display

Show a safe reason:

- hard bounce
- complaint
- provider suppression
- manual suppression
- unsubscribed

Provide:

- open contact
- open enrollment
- inspect event history

Do not provide a one-click override of hard bounce or complaint suppression.

## Message origin

Manual emails remain in All mail.

Sequence emails appear:

- in All mail when their normal folder applies;
- in Sequence emails through the origin filter.

Do not duplicate the message record. One CRM message has one authoritative record and may appear in multiple views.

## Right rail

Extend the existing contact rail with a Sequence section:

- sequence name
- enrollment state
- current step
- next action
- stop reason
- sender mailbox
- pause/stop action
- open Outreach enrollment

Keep account and contact information.

## Analytics

Use:

- sent
- delivered
- replied
- bounced
- complained
- unsubscribed
- completed

Do not make open rate the primary KPI. Open tracking is optional and may remain disabled.

Reply rate:

```text
unique enrollments with reply / enrollments that received at least one step
```

Bounce rate:

```text
hard-bounced recipients / recipients attempted
```

Use deterministic definitions and test them.

## Live updates

Use the existing notification infrastructure or safe polling.

When a delivery or reply event arrives:

- update the visible row;
- update the reader;
- update enrollment state;
- avoid duplicate toast spam.

## Component extraction

Prefer:

```text
src/components/manage/mail/manage-mail-page.tsx
src/components/manage/mail/mail-view-tabs.tsx
src/components/manage/mail/sequence-email-list.tsx
src/components/manage/mail/sequence-email-context.tsx
```

Do not keep expanding the monolithic `manage-portal.tsx`.

## Tests

Add coverage for:

- All mail unchanged
- Sequence emails tab
- sequence-only filtering
- scheduled state
- delivery reconciliation
- reply stop
- hard bounce
- unsubscribe
- right-rail enrollment link
- pagination
- mobile layout
- browser back/forward
- no duplicate records
- no cross-mailbox access

Run:

```bash
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run build
npm run test:e2e
```

## Acceptance criteria

- Sequence emails are visible inside `/manage/mail`.
- No new top-level page or sidebar item exists.
- All mail still works.
- Sequence status reflects provider and enrollment truth.
- Replies visibly stop future sequence steps.
- Hard bounce and suppression cannot be casually overridden.
- The same CRM message is not duplicated.
- Query and pagination do not bloat the global Manage payload.
- No branch, commit, push, merge, or deployment was performed.
