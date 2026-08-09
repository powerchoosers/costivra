# Packet 06: Outreach Sequence Builder and Enrollment UI

## Mission

Add a restrained, attractive sequence builder to the existing `/manage/outreach` route. Preserve the current task board, add nested tabs, and let operators create sequence drafts and preview enrollments without adding new top-level pages.

This packet does not enable automated sending.

## Required files to inspect

```text
src/components/manage-portal.tsx
src/app/globals.css
src/lib/manage/types.ts
src/lib/manage/repository.ts
src/components/ui/
src/components/records/
src/app/api/manage/outreach/
```

Inspect the completed Packet 05 APIs and types.

## Research-derived product principles

Use the strongest simple patterns from current sequence products:

- Show steps as an ordered timeline.
- Make the delay between steps visible.
- Allow automatic email and human task steps.
- Default the first touch to a manual, personalized email.
- Select the sender mailbox when enrolling a contact, not while authoring reusable sequence content.
- Make pause, clone, and archive obvious.
- Show scheduled work and daily capacity.
- Stop on reply, bounce, and unsubscribe by default.
- Prioritize reply rate and meetings over vanity open-rate metrics.
- Keep sequence content reusable and enrollment context specific.

Do not copy another product's visual identity.

## Route and tab structure

Keep one route:

```text
/manage/outreach
```

Use query state:

```text
/manage/outreach?tab=tasks
/manage/outreach?tab=sequences
/manage/outreach?tab=enrollments
```

Top-level nested tabs inside the page:

1. Tasks
2. Sequences
3. Enrollments

The current priority filters remain inside the Tasks tab.

Do not add a sidebar item. Do not add `/manage/sequences`.

## Component extraction

`manage-portal.tsx` is already large. Extract the Outreach implementation into focused components, for example:

```text
src/components/manage/outreach/manage-outreach.tsx
src/components/manage/outreach/outreach-tasks-tab.tsx
src/components/manage/outreach/sequence-list.tsx
src/components/manage/outreach/sequence-builder-sheet.tsx
src/components/manage/outreach/sequence-step-card.tsx
src/components/manage/outreach/enrollment-list.tsx
src/components/manage/outreach/enrollment-drawer.tsx
```

Keep `ManagePortal` responsible for route composition, not the whole feature implementation.

## Visual direction

The sequence experience should feel like a quiet operating console.

Use:

- white or near-white work surfaces
- restrained 1px borders
- 16px to 20px corners consistent with Manage
- no gradients
- minimal shadows
- limited status colors
- clear type hierarchy
- compact data density
- visible keyboard focus
- subtle motion only
- no decorative pipeline graphics
- no sprawling drag-and-drop canvas

### Status colors

- Draft: slate
- Active: green
- Paused: amber
- Attention: red
- Archived: muted gray

Do not color every element.

## Tasks tab

Preserve the current board:

- open
- in progress
- completed
- priority filters
- add task
- add note
- export CSV

Add a small origin pill to sequence-generated tasks:

```text
Sequence · Step 3
```

Clicking the pill opens the related enrollment drawer inside Outreach.

## Sequences tab

### Header

Show:

- `New sequence`
- search
- status filter
- owner filter
- archived toggle

Summary strip:

- active sequences
- active enrollments
- scheduled touches
- replies
- needs attention

Do not show fake or estimated metrics.

### Sequence list

Use a clean table or list, not a card mosaic.

Columns:

- sequence name
- status
- step count
- active contacts
- scheduled next 24 hours
- sent
- replies
- reply rate
- owner
- updated
- actions

Actions:

- open
- clone
- pause
- archive

Active sequences remain read-only in this packet.

## Sequence builder sheet

Open in a large in-route sheet or full-canvas overlay. Do not navigate to a new page.

Header:

- sequence name
- draft status
- save state
- close
- clone when editing
- activation placeholder

Sections:

1. Steps
2. Schedule
3. Safety
4. Preview

### Step timeline

Use a vertical timeline.

Each step card shows:

- step number
- type icon
- type label
- delay from previous step
- subject or task title preview
- manual or automatic state
- move up
- move down
- duplicate
- delete

Use move buttons instead of drag-and-drop for v1. They are simpler, more accessible, and less fragile.

Supported add-step menu:

- Manual email
- Automatic email
- Call task
- General task

### Email editor

Fields:

- thread mode
- subject
- body
- variable insert menu
- plain-text preview
- rendered preview
- send test to current operator

Test-send restrictions:

- only current operator's verified email
- clearly labeled test
- no CRM contact or sequence enrollment created
- no production sequence event
- auditable provider send
- idempotent test request

### Schedule editor

Fields:

- timezone
- business days
- local send window
- daily send cap

Copy should explain that enrollment chooses the sender mailbox.

### Safety editor

Show mandatory controls:

- stop on reply
- stop on bounce
- stop on unsubscribe

These are on and locked for pilot v1.

Optional:

- stop other contacts at the same company when one replies

### Preview

Preview with:

- explicit sample contact
- explicit sample company
- selected sender profile
- unresolved-token warning
- mobile and desktop email width

No AI content generation at render time.

## Enrollments tab

### List

Columns:

- contact
- account
- sequence
- state
- current step
- next action
- sender mailbox
- last touch
- stop reason
- actions

Filters:

- sequence
- state
- mailbox
- owner
- account
- date range

Actions:

- inspect
- pause
- resume placeholder
- stop

### Enrollment flow

`Enroll contacts` opens a sheet.

Step 1: choose sequence

- only valid drafts are selectable for preview
- active execution remains unavailable until Packet 07

Step 2: choose contacts

- search CRM contacts
- show account and title
- show contact status
- show marketing/permission state
- show suppression reason
- block bounced, unsubscribed, complained, inactive, or suppressed contacts
- prevent duplicate active enrollment

Step 3: choose sender mailbox

- active
- send-capable
- authorized for operator
- show daily capacity

Step 4: personalization preview

- render first step for each contact
- flag missing fields
- allow explicit operator override stored in enrollment personalization
- do not mutate the CRM source field from the override

Step 5: confirm

- count
- sequence
- mailbox
- first action timing
- safety rules
- no send in this packet

Create enrollment records in `pending` state only.

## Activation state in this packet

The builder may display an activation button, but it must remain disabled with:

```text
Execution setup required
```

or be guarded by:

```text
OUTREACH_SEQUENCE_EXECUTION_ENABLED=0
```

Do not pretend an active toggle works before Packet 07.

## URL and browser behavior

Use query parameters for:

- active tab
- sequence ID
- enrollment ID
- filters where useful

Examples:

```text
/manage/outreach?tab=sequences&sequence=<uuid>
/manage/outreach?tab=enrollments&enrollment=<uuid>
```

Back and forward browser navigation must restore state.

## Accessibility

- real tabs with `role=tablist`
- sheets with focus trap and Escape handling
- timeline buttons have labels
- no color-only status
- keyboard access to every action
- reduced-motion support
- no horizontal page overflow at 390px

## Tests

Add component and browser coverage for:

- current task board preserved
- nested tab navigation
- sequence list empty state
- create draft
- add/reorder/delete steps
- unresolved-token warning
- test send restriction
- schedule validation
- suppression display
- pending enrollment creation
- browser back/forward
- mobile layout
- keyboard navigation

Run:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

## Acceptance criteria

- `/manage/outreach` contains Tasks, Sequences, and Enrollments tabs.
- No new top-level route or sidebar item exists.
- Current task behavior still works.
- Sequence drafts can be created and edited.
- Pending enrollments can be previewed and created.
- Suppressed contacts are blocked.
- Automated sending remains disabled.
- UI is responsive, calm, and accessible.
- `manage-portal.tsx` becomes smaller rather than larger where practical.
- No branch, commit, push, merge, or deployment was performed.
