---
description: Replace Costivra's generic bill file input and confusing post-upload sequence with a modern attachment card, honest progress animation, automatic close, and one clickable breakdown-ready toast.
---

# Chunk 2: Upload Modal, Attachment, Progress, and Toast

## Goal

Deliver the customer interaction described below without changing financial logic.

Recommended branch:

```text
agent/bill-upload-02-upload-ux
```

## Primary file

```text
src/components/portal-pages.tsx
```

Supporting files:

```text
src/components/toast-provider.tsx
src/components/bill-inspector-provider.tsx
src/components/bill-breakdown-modal.tsx
src/app/globals.css
```

## Current behavior to remove

Current upload code:

- Shows only the native file field
- Starts an "Analyzing bill" toast before the modal work finishes
- Waits through the synchronous processing request
- Closes modal state
- Creates a "Bill Processed" toast
- Automatically calls `openInspector(documentId)`
- Calls the generic `run()` helper with a resolved promise
- Produces another success toast and refresh

Remove:

```text
automatic breakdown opening
duplicate success toast
fake generic run() call
overconfident "Bill Processed" language
```

## Upload state machine

Implement explicit local state:

```text
idle
selected
submitting
complete
quarantined
duplicate
error
```

For the current synchronous API, `submitting` means:

```text
secure upload, malware scan, extraction, and record preparation are in progress
```

Do not claim an exact backend stage that the browser cannot observe.

Do not display fake percentages.

## Selected attachment card

After file selection, replace or supplement the drop zone with a stable attachment card.

Show:

```text
file-type icon
filename
file extension
formatted size
selected vendor or Unassigned
remove button
change file button
```

File icons:

```text
PDF
DOCX
TXT
generic document fallback
```

Use accessible labels.

Do not expose local file paths.

## Modern loading treatment

Use a restrained 2026 interaction, not a carnival spinner.

Recommended visual:

```text
document tile remains visible
soft moving scan line across the tile
three small status nodes:
  Secure upload
  Security and integrity check
  Reading bill details
subtle orbit or pulse around the document icon
```

Copy:

```text
Reading your bill
Costivra is securely checking the file and preparing the extracted record.
```

Requirements:

- Respect prefers-reduced-motion
- No fake percentage
- No shifting modal layout
- Filename remains visible
- Cancel disabled only when aborting would leave an unclear server outcome
- Close button behavior explicit
- `aria-live` announces state

## Submit behavior

On successful response:

1. Capture:
   ```text
   outcome
   documentId
   status
   warning
   invoiceRecord
   ```
2. Stop busy state.
3. Reset the form.
4. Close the upload modal.
5. Allow the modal close animation to complete.
6. Refresh portal data once.
7. Show one actionable toast.
8. Do not open the breakdown automatically.

## Actionable success toast

### Needs review

```text
Title:
Bill breakdown ready for review

Message:
Costivra extracted the bill and found one or more fields that need confirmation.

Action:
Open breakdown
```

### Ready

```text
Title:
Bill breakdown ready

Message:
Security checks and extraction are complete.

Action:
Open breakdown
```

The action calls:

```text
openInspector(documentId)
```

The toast should remain long enough to act, such as 10 to 15 seconds, or remain until dismissed for this important result.

## Other outcomes

### Quarantined

```text
Title:
Bill safely quarantined

Message:
The security check could not finish. Costivra has not analyzed the file.

Action:
View document status
```

Do not offer breakdown.

### Duplicate

The API currently returns 409 with an existing document ID.

Show:

```text
Title:
This bill is already in your workspace

Action:
Open existing document
```

Do not label it an upload failure.

### Rejected

Show:

```text
File blocked by the security check
The file was not analyzed.
```

### Processing response

If Chunk 1 returns `analysisReady=false`, show:

```text
Bill uploaded
Costivra is still preparing the breakdown.
```

Then poll or subscribe until ready.

Only create the clickable ready toast after the breakdown endpoint confirms readiness.

## Modal close reliability

Do not layer the bill breakdown over a closing upload modal.

Use a single sequence.

Possible pattern:

```ts
setUploadResult(result);
setKind(null);

window.setTimeout(() => {
  router.refresh();
  showReadyToast(result);
}, PORTAL_MODAL_CLOSE_DURATION_MS);
```

Prefer a close-complete callback over a hardcoded timeout when available.

## File input reset

After:

```text
success
duplicate
quarantine
explicit close
```

reset:

```text
selected file
input value
preview state
progress state
error
```

Reopening the modal must not show the previous file.

## Navigation after toast click

The breakdown modal should open from the toast action.

If the browser state no longer contains the document, use the document ID directly.

Do not rely on a stale `PortalData.documents` array before opening.

## Document list optimism

After upload response, the document should appear without a full page confusion gap.

Use one of:

```text
router.refresh with a temporary optimistic row
client-side mutation with server confirmation
```

Optimistic row fields:

```text
filename
type icon
status
created just now
```

Remove or reconcile it when refreshed server data arrives.

Do not fabricate extracted values in the optimistic row.

## Accessibility

- Native input remains keyboard accessible
- Drag and drop is optional
- Attachment removal has a clear label
- Progress uses `role=status`
- Errors use `role=alert`
- File icon is decorative when filename is read
- Toast action is keyboard accessible
- Focus returns to the upload trigger after close

## Component extraction

Do not keep all logic inside `CreateModals`.

Suggested components:

```text
src/components/documents/source-upload-field.tsx
src/components/documents/source-upload-progress.tsx
src/lib/documents/upload-client-state.ts
```

## Tests

Add tests for:

- File selection displays filename
- Correct PDF/DOCX/TXT icon
- File removal
- Submit progress
- Reduced motion
- Ready outcome
- Needs-review outcome
- Quarantine
- Duplicate
- Rejected
- Single success toast
- No automatic inspector opening
- Modal closes after success
- Toast action opens breakdown
- Form resets
- No duplicate refresh/toast

## Browser acceptance

At desktop and mobile:

```text
Select PDF
See attachment card
Submit
See modern stable animation
Modal closes
One toast appears
Nothing auto-opens
Click Open breakdown
Breakdown opens
```

## Exit gate

Require the standard quality gate.

Do not call this chunk complete when the animation looks polished but the modal/toast sequence is still duplicated or race-prone.
