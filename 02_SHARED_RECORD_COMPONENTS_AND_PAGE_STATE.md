---
description: Finish page-level dirty state, inline save behavior, component contracts, and no-shift interaction proof for Costivra ID pages.
---

# Chunk 2: Shared Components and Page State

## Goal

Finish integration of the already-hardened shared record components.

Do not rewrite the component system. This chunk connects it correctly to vendor, account, and contact page state.

Recommended branch:

```text
agent/id-pages-02-page-state
```

## Prerequisite

Chunk 1 must be merged.

The edit APIs must return:

```text
updatedAt
```

and support:

```text
expectedUpdatedAt
```

## Current problems

All three edit sheets still pass:

```tsx
isDirty={true}
```

This causes:

- False unsaved-change warnings
- Save enabled when nothing changed
- No clean baseline after successful save
- Confusing close behavior

Inline saves also need consistent response checking and updated timestamp handling.

## Create a shared draft comparison helper

Suggested file:

```text
src/lib/records/draft-state.ts
```

Responsibilities:

- Normalize nullable strings
- Normalize dates
- Normalize numeric strings
- Compare initial and current drafts
- Exclude read-only fields
- Avoid treating formatting-only differences as edits when safe

Suggested API:

```ts
recordDraftChanged(initial, current, fields)
```

Do not use `JSON.stringify` blindly when field order or undefined values can differ.

## Vendor edit-sheet state

Capture an initial snapshot when opening:

```text
displayNameOverride
categoryOverride
websiteOverride
relationshipStatus
annualizedSpend
spendCadence
updatedAt
```

Compute dirty state from editable fields only.

After successful save:

1. Apply returned values or refresh.
2. Update initial snapshot.
3. Set dirty false.
4. Close only after success.
5. Preserve draft on error.
6. Store returned `updatedAt`.

## Account edit-sheet state

Initial snapshot:

```text
name
legalName
industry
employeeCountRange
annualRevenueRange
timezone
currency
website
stage
assignedTo
primaryContactId
nextFollowUpAt
nextStep
privateNotes
visibleInCrm
parentAccountId
updatedAt
```

Use IDs for:

```text
assignedTo
primaryContactId
parentAccountId
```

Do not compare display names as identifiers.

## Contact edit-sheet state

Initial snapshot:

```text
fullName
email
phone
title
organizationId
isPrimary
status
updatedAt
```

Marketing consent remains outside this sheet.

Workspace access remains outside this sheet.

## Standard save helper

Create or reuse a helper that:

```ts
const response = await fetch(...);
const payload = await response.json().catch(() => ({}));

if (!response.ok) {
  const error = new Error(payload.error || "The record could not be updated.");
  Object.assign(error, { code: payload.code, status: response.status });
  throw error;
}
```

Every page-level inline save must use it.

Never show a success toast before `response.ok`.

## Inline field integration

### Account inline fields

Required:

```text
Lifecycle
Next step
Next follow-up
Website
Industry
Assigned owner
Private notes
```

### Contact inline fields

Required:

```text
Full name
Email
Phone
Title
```

### Vendor inline fields

Use inline edit only where it does not make the page noisy.

Recommended:

```text
Workspace website
Annualized spend
Spend cadence
```

Full vendor identity override editing remains in the edit sheet.

## Correct input types

Verify:

```text
email -> email
phone -> tel
url -> url
date -> date
datetime -> datetime-local
number -> number
textarea -> textarea
enum -> select
```

## Copy and paste

Copy:

- Copy normalized display value
- Show Costivra toast
- Handle denied clipboard access

Paste:

- User gesture only
- Enter edit mode
- Fill draft
- Never autosave
- Preserve cancel path

Do not show paste on:

```text
enum
date
datetime
boolean
derived values
IDs
```

## Touch behavior

On pointer-coarse devices:

- First tap reveals actions
- Second tap on an action performs that action
- Tap outside closes actions
- One field rail should be open at a time when practical
- No permanent icon clutter
- No content shift

## Overflow menu page integration

Verify each page uses a record-specific accessible label:

```text
More vendor actions
More account actions
More contact actions
```

The menu trigger must remain:

```text
Visible dots
Transparent container at rest
Quiet container on hover, focus, and open
```

## Menu collision behavior

The current menu has a bounded height but can still open below a trigger near the viewport bottom.

Add measured vertical placement:

```text
open below when space exists
open above when bottom space is insufficient
```

Do not introduce a heavyweight positioning dependency solely for this menu.

## Edit sheet lifecycle

Verify the shared sheet:

- Focuses its title or first input
- Traps focus
- Restores focus
- Locks body scroll
- Does not warn when clean
- Warns when dirty
- Resets warning after close
- Prevents close while saving
- Uses unique IDs

This chunk should add tests rather than rewriting already-correct behavior.

## Danger dialog page integration

Every page must pass:

```text
previewRequired
preview error
loading state
reasonRequired
confirmation text
```

according to the action.

Do not let parent components swallow preview failures.

## Conflict behavior

For a 409 response:

1. Keep the draft.
2. Show:
   ```text
   This record changed in another session.
   ```
3. Offer:
   ```text
   Reload latest
   Keep my draft
   Cancel
   ```
4. Do not silently retry.
5. Do not overwrite the server state.

## No-shift Playwright measurement

For each target field:

```js
const before = await value.boundingBox();
await row.hover();
const during = await value.boundingBox();

expect(Math.abs(before.x - during.x)).toBeLessThanOrEqual(0.5);
expect(Math.abs(before.width - during.width)).toBeLessThanOrEqual(0.5);
```

Test:

```text
Account website
Account next step
Contact email
Contact phone
Contact title
Vendor annualized spend when inline-enabled
```

## Component tests

Add tests for:

### Edit sheet

- Clean close
- Dirty warning
- Successful save resets dirty baseline
- Save error preserves draft
- Conflict preserves draft
- Focus trap
- Escape
- Mobile height

### Editable field

- Hidden at rest
- Hover reveal
- Focus reveal
- Touch reveal
- Outside close
- Copy feedback
- Paste draft
- No autosave
- Save error
- Conflict
- Correct input type

### Overflow menu

- Above/below placement
- Link item
- Command item
- Disabled item
- Keyboard navigation
- Focus restoration

## Exit gate

Require:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Accept only when:

```text
No page passes isDirty={true}
No inline save ignores response.ok
All three pages retain drafts after errors
No hover action shifts content
Menu works at bottom and right viewport edges
Mobile interaction remains calm at rest
```

Update `STATUS.md`, open a focused PR, and merge only after the full quality gate is green.
