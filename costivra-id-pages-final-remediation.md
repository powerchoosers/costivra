---
description: Final remediation for Costivra's customer vendor and internal account/contact ID pages. Repair live schema mismatches, finish shared record interactions, make archive and removal safe, wire true audit history, add missing operational actions, and prove the pages through automated and browser tests.
---

# Costivra ID Pages Final Remediation

## Antigravity Goal Mode directive

**Repository:** `powerchoosers/costivra`  
**Audited branch:** `main`  
**Audited commit:** `d9ad8e276a586c04a0d2f36e6a4a293cae3247cc`  
**Connected Supabase project:** `skfocjrykyvsaviyhdea`  
**Prepared:** August 5, 2026, America/Chicago

**Primary pages:**

```text
/app/vendors/[vendorId]
/manage/accounts/[accountId]
/manage/contacts/[contactId]
```

**Supporting account vendor state:**

```text
/manage/accounts/[accountId]?tab=vendors&vendor=[relationshipId]
```

**Recommended workflow path:**

```text
.agents/workflows/costivra-id-pages-final-remediation.md
```

**Suggested command:**

```text
/costivra-id-pages-final-remediation
```

**Goal verdict:**

```text
ID_PAGES_COMPLETE
```

> This is a remediation pass over an already substantial implementation. Preserve the existing page information architecture and visual direction. Do not rebuild the pages from scratch. Repair the shared components, align every API with the live schema, safely apply the missing migration, finish record operations, and prove the real behavior.

---

# 1. Executive verdict

The current pages are **not complete**.

A large portion of the earlier record-pages directive was implemented:

- Shared three-dot menu component
- Shared inline field component
- Shared edit sheet
- Shared danger dialog
- Shared history component
- Customer vendor edit and removal APIs
- Manage account edit, archive, and deletion APIs
- Manage contact edit, deactivate, and deletion APIs
- Vendor, account, and contact page menu wiring
- Contact-specific activity separation
- URL-based record sections in parts of the experience
- A repository migration for vendor overrides and contact archive fields

However, the latest audited implementation still contains P0 blockers.

## Confirmed P0 blockers

### Live migration is not applied

The live database does not currently contain:

```text
organization_vendors.display_name_override
organization_vendors.category_override
organization_vendors.website_override
organization_vendors.ended_at
organization_vendors.ended_by

crm_contacts.archived_at
crm_contacts.archived_by
```

The live migration history contains no applied record-pages migration.

The new vendor and contact routes therefore reference columns that do not exist in production.

### The committed migration would currently fail

The live database contains one organization with more than one active `is_primary = true` CRM contact.

The committed migration tries to create a unique primary-contact index immediately.

Do not apply it until duplicate primary records are reviewed and repaired.

### Account edit API disagrees with the live schema

The live schema places:

```text
industry
employee_count_range
annual_revenue_range
timezone
currency
```

on:

```text
organizations
```

The current account route attempts to write most of those fields to:

```text
crm_account_profiles
```

The live CRM profile assignment field is:

```text
assigned_to
```

The route uses:

```text
assigned_owner_id
```

The complete edit sheet can therefore fail even though the form renders.

### Contact edit API uses a nonexistent column

The live CRM contact column is:

```text
title
```

The route writes:

```text
job_title
```

Contact title edits can fail.

### Deletion previews use a nonexistent table

The live mail thread table is:

```text
crm_email_threads
```

The account and contact deletion-preview routes query:

```text
crm_mail_threads
```

Those previews can return an error.

### Vendor dependency queries use the wrong relationship field

Expenses, contracts, invoices, documents, and expense accounts connect to an organization vendor through:

```text
organization_vendor_id
```

The vendor delete and preview routes query several tables using:

```text
vendor_id
```

Dependency counts can be wrong or fail.

### Inline actions never reveal

`EditableFieldRow` renders its action rail with:

```text
visibility: hidden
opacity: 0
pointer-events: none
```

The current repository does not contain working hover, focus, or `data-actions-open` CSS that reverses those properties.

The copy, paste, and edit actions are effectively unreachable.

### The latest quality gate is red

On the audited commit:

```text
typecheck: passed
lint: passed
unit tests: passed
invoice evaluation: passed
integration tests: passed
build: passed
Playwright: failed
```

The two failing tests are stale Ask Costivra top-bar trigger expectations on desktop and mobile.

A production deployment or Vercel success does not replace a green complete GitHub gate.

### Record-page-specific test coverage is missing

The new record components and destructive routes were added without meaningful dedicated unit, route, integration, or Playwright coverage.

Do not treat the general unit-test count as proof of these pages.

---

# 2. Goal Mode instructions

Run this directive in Goal Mode.

Do not stop after producing a plan.

Use a new worktree or branch:

```text
goal/id-pages-final-remediation
```

Required sequence:

1. Recheck latest `main`.
2. Record the current commit and GitHub Actions result.
3. Inspect all three authenticated pages in the browser.
4. Run live schema assertions before modifying migrations.
5. Repair schema and server contracts first.
6. Harden shared components.
7. Finish page-specific behavior.
8. Add automated coverage.
9. Apply reviewed migrations.
10. Run disposable live tests.
11. Capture desktop and mobile evidence.
12. Restore the complete green quality gate.
13. Update `STATUS.md`.
14. Report one final verdict.

Do not deploy destructive behavior to production before the preview, permissions, and dependency tests are green.

---

# 3. Required reading

Read these files completely before editing:

```text
AGENTS.md
DECISIONS.md
STATUS.md
README.md
costivra-record-pages-completion.md
COSTIVRA_PILOT_PLATFORM_COMPLETION_SPEC.md

src/components/portal-pages.tsx
src/components/manage-portal.tsx
src/app/globals.css

src/components/records/record-overflow-menu.tsx
src/components/records/editable-field-row.tsx
src/components/records/edit-record-sheet.tsx
src/components/records/record-danger-dialog.tsx
src/components/records/record-change-history.tsx

src/lib/portal/repository.ts
src/lib/portal/types.ts
src/lib/manage/repository.ts
src/lib/manage/types.ts
src/lib/manage/visibility.ts

src/app/api/portal/vendors/[id]/route.ts
src/app/api/portal/vendors/[id]/deletion-preview/route.ts
src/app/api/portal/vendors/[id]/monitoring/route.ts

src/app/api/manage/accounts/[id]/route.ts
src/app/api/manage/accounts/[id]/archive/route.ts
src/app/api/manage/accounts/[id]/deletion-preview/route.ts

src/app/api/manage/contacts/[id]/route.ts
src/app/api/manage/contacts/[id]/deactivate/route.ts
src/app/api/manage/contacts/[id]/deletion-preview/route.ts

supabase/migrations/20260805020000_record_pages_completion.sql

tests/e2e/client-assistant.spec.ts
playwright.config.ts
.github/workflows/quality.yml
```

Search all references to:

```text
RecordOverflowMenu
EditableFieldRow
EditRecordSheet
RecordDangerDialog
RecordChangeHistory
display_name_override
archived_at
crm_mail_threads
vendor_id
organization_vendor_id
assigned_owner_id
assigned_to
job_title
title
isDirty={true}
```

---

# 4. Non-negotiable safety rules

1. Never delete an active customer organization through an accidental cascade.
2. Never delete the global canonical vendor when a customer removes a vendor relationship.
3. Never delete an auth profile or workspace membership when removing a CRM contact.
4. Never allow a destructive confirmation while dependency preview is loading, failed, or absent.
5. Never allow browser-hidden permissions to substitute for server authorization.
6. Never apply the unique primary-contact index while duplicate primary groups exist.
7. Never silently choose a primary contact without recording why.
8. Never perform a multi-table record update as separate unguarded mutations.
9. Never show a success toast before checking `response.ok`.
10. Never claim field-change history using a generic activity list when the audit event is available.
11. Never expose private notes in customer-visible history.
12. Never let a customer mutate the shared vendor catalog through a workspace edit.
13. Never treat a Vercel deployment as proof of a green release.
14. Never remove tests to make the quality gate green.
15. Never use real customer records for destructive QA.
16. Never reset the Supabase database or migration history.
17. Never edit production records without a disposable test plan and cleanup path.
18. Preserve immutable source evidence and financial audit history.

---

# 5. Workstream A: Establish exact baseline truth

Before editing, run:

```bash
git status --short
git log -10 --oneline
npm ci
npm run typecheck
npm run lint
npm test
npm run eval:invoices -- --manifest tests/fixtures/invoices/golden-manifest.smoke.json --predictions tests/fixtures/invoices/golden-predictions.smoke.json
npm run test:integration
npm run build
npm run test:e2e
```

Record each result separately.

Inspect the latest GitHub Actions run.

Confirm whether the current two Ask Costivra Playwright failures are:

- A stale accessible-name selector
- A missing trigger regression
- An authentication fixture problem
- A page-layout problem

Fix the implementation when the trigger should exist.

Update the test only when the intended product behavior changed.

Do not begin production migration work with a red local typecheck, lint, unit, build, or integration gate.

---

# 6. Workstream B: Reconcile the record-pages migration safely

## B1. Confirm live state

Run live assertions:

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'organization_vendors'
  and column_name in (
    'display_name_override',
    'category_override',
    'website_override',
    'ended_at',
    'ended_by'
  );

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'crm_contacts'
  and column_name in ('archived_at', 'archived_by');

select version, name
from supabase_migrations.schema_migrations
where name ilike '%record_pages%';

select organization_id, count(*) as primary_count
from public.crm_contacts
where is_primary = true
group by organization_id
having count(*) > 1;
```

Store only safe counts and IDs in the implementation report.

Do not expose customer names in public logs.

## B2. Repair duplicate primary contacts before adding uniqueness

The live audit found at least one duplicate-primary organization.

Create an owner-review report containing:

```text
Organization ID
Contact IDs
Contact names
Emails
Workspace profile links
Created timestamps
Updated timestamps
Recent task or communication evidence
Current organization primary-contact fields
```

Choose the surviving primary using evidence.

Preferred decision order:

1. Explicit current account primary-contact record
2. Current active workspace contact with matching organization owner intent
3. Most recently verified relationship evidence
4. Human owner review

Do not use alphabetical order or newest-created blindly.

For every changed contact:

- Preserve the contact
- Set only one `is_primary = true`
- Write an internal audit event
- Record the repair reason

Re-run the duplicate query and require zero groups.

## B3. Make migration order safe

The current committed migration cannot be applied safely as written.

Choose one reviewed strategy after checking every environment:

### Strategy A: no environment has applied it

- Amend the migration so duplicate repair happens before the unique index.
- Add constraints and indexes.
- Apply normally.
- Record the exact migration hash and version.

### Strategy B: any environment has applied it

- Do not rewrite history.
- Add a forward remediation migration.
- Reconcile migration history honestly.
- Keep all statements idempotent.

Do not mark a migration applied merely because some columns exist.

## B4. Strengthen the migration

Add safe field constraints where appropriate.

Vendor workspace overrides:

```text
display_name_override: nullable, bounded text
category_override: nullable, bounded text
website_override: nullable, valid application-normalized URL
ended_at: nullable timestamp
ended_by: nullable profile or auth actor reference
```

Contact archive:

```text
archived_at
archived_by
```

Add useful indexes:

```text
crm_contacts organization/status/archive
organization_vendors organization/status
organization_vendors ended_at
```

Review RLS and browser grants.

Run Supabase security and performance advisors after applying.

---

# 7. Workstream C: Create schema-authoritative mutation services

The route files currently contain ad hoc multi-table updates.

Move record mutations into server-only domain services.

Suggested paths:

```text
src/lib/manage/account-records.ts
src/lib/manage/contact-records.ts
src/lib/portal/vendor-relationships.ts
```

Use reviewed Postgres RPCs where a real transaction spans multiple tables.

## C1. Account mutation contract

The source-of-truth mapping must be:

### `organizations`

```text
name
legal_name
industry
employee_count_range
annual_revenue_range
timezone
currency
parent_organization_id
updated_at
```

### `crm_account_profiles`

```text
organization_id
lifecycle_stage
assigned_to
next_follow_up_at
next_step
private_notes
website
visible_in_crm
updated_at
```

Do not write:

```text
industry
employee_count_range
annual_revenue_range
timezone
currency
assigned_owner_id
```

to `crm_account_profiles` unless a reviewed migration explicitly adds those fields.

## C2. Contact mutation contract

Use:

```text
full_name
email
phone
title
organization_id
is_primary
status
updated_at
```

Do not write `job_title`.

## C3. Vendor relationship contract

Use:

```text
organization_vendors.id
organization_vendors.organization_id
organization_vendors.vendor_id
organization_vendors.display_name_override
organization_vendors.category_override
organization_vendors.website_override
organization_vendors.relationship_status
organization_vendors.annualized_spend
organization_vendors.spend_cadence
organization_vendors.ended_at
organization_vendors.ended_by
organization_vendors.updated_at
```

The shared `vendors` table remains unchanged by customer relationship edits.

## C4. Concurrency

All edit sheets and inline edits must submit:

```text
expectedUpdatedAt
```

Server behavior:

```text
matching timestamp:
  apply update

stale timestamp:
  return 409
  include no private record payload
```

Customer copy:

```text
This record changed in another session. Reload the latest version before saving.
```

## C5. Transactions

Use one atomic operation for:

- Account organization plus CRM profile update
- Account primary-contact selection
- Contact move plus primary-contact repair
- Contact make-primary
- Vendor end plus monitoring pause
- Safe permanent delete plus audit recording

Do not call two unrelated Supabase updates and describe them as transactional.

---

# 8. Workstream D: Finish `RecordOverflowMenu`

Preserve the current transparent 42-pixel trigger.

## D1. Implement actual link items

`RecordMenuItem` currently declares:

```ts
href?: string
```

but the component always renders a button.

Render:

```tsx
<Link role="menuitem" ... />
```

for link items.

Keep button items for commands.

## D2. Complete keyboard behavior

On open:

- Select the first enabled item
- Focus the first enabled item when opened by keyboard

Support:

```text
ArrowDown
ArrowUp
Home
End
Enter
Space
Escape
Tab
Shift+Tab
```

Skip disabled items.

Handle zero enabled items safely.

When closed by:

- Escape
- Selection
- Click outside

return focus to the trigger when appropriate.

## D3. Add hover and open styling

The trigger must have:

```text
No visible container at rest
Quiet container on hover
Quiet container on focus
Quiet container while open
```

Add actual CSS:

```css
.record-overflow-trigger:hover,
.record-overflow-trigger:focus-visible,
.record-overflow-trigger[aria-expanded="true"] {
  background: var(--quiet-hover);
  border-color: var(--quiet-border);
}
```

Do not depend on inline style alone.

## D4. Viewport collision

The menu must not clip against:

- Right edge
- Bottom edge
- Mobile viewport
- Scroll container

Use a portal or measured collision-aware position.

## D5. Accessibility

Required:

```text
aria-haspopup="menu"
aria-expanded
aria-controls
role="menu"
role="menuitem"
```

Use accessible names specific to each record:

```text
More vendor actions
More account actions
More contact actions
```

---

# 9. Workstream E: Finish `EditableFieldRow`

## E1. Reveal the controls

Add working CSS for:

```text
:hover
:focus-within
[data-actions-open="true"]
```

The action rail must transition to:

```text
visibility: visible
opacity: 1
pointer-events: auto
```

The value position must not move.

## E2. Touch behavior

Current click behavior toggles the touch actions on every click and never closes them from outside.

Implement:

- Touch or pointer-coarse detection
- Tap field to reveal
- Tap outside to close
- Tap action without toggling the row again
- Escape closes for keyboard users
- Only one field action rail open at a time when practical

Do not permanently display all actions on mobile.

## E3. Correct input types

Map:

```text
phone -> tel
date -> date
datetime -> datetime-local
email -> email
url -> url
number -> number
text -> text
```

Use labels and IDs.

## E4. Save contract

Every `onSave` must:

- Check `response.ok`
- Parse safe server errors
- Throw on failure
- Show success only after confirmed success
- Preserve draft on failure
- Send `expectedUpdatedAt`

The current contact inline saves must not show success after a 400 or 500 response.

## E5. Copy and paste feedback

Use Costivra's toast system.

Copy:

```text
Website copied.
Email copied.
Phone copied.
```

Paste:

- Opens draft
- Does not save
- Shows a clipboard error when denied

Do not use only an icon swap as feedback.

## E6. Accessibility

Add:

- Programmatic field label
- `aria-describedby` for source and error
- `aria-live` for save state
- Hidden actions not focusable
- Focus-visible reveal
- Clear view-only behavior

## E7. Automated no-shift measurement

Playwright must measure:

```js
before.x === duringHover.x
before.width === duringHover.width
```

Use a small tolerance only for subpixel rendering.

Test at least:

- Account website
- Contact email
- Contact phone
- Contact title

---

# 10. Workstream F: Finish `EditRecordSheet`

## F1. Real dirty detection

Every current page passes:

```tsx
isDirty={true}
```

Replace that with a comparison between initial and current drafts.

Requirements:

- Clean sheet can close immediately
- Dirty sheet warns
- Save disabled when clean
- Successful save resets the initial snapshot
- Reopening starts clean

## F2. Reset internal state

Reset `showConfirmClose` when:

- Sheet opens
- Sheet closes
- Save succeeds
- Record changes

Do not reopen with a stale discard warning.

## F3. Dialog behavior

Implement:

- Focus trap
- Initial focus
- Escape handling
- Focus return
- Body scroll lock
- Accessible close label
- `aria-labelledby`
- `aria-describedby`
- Error summary with `aria-live`
- Unsaved-change confirmation accessible as a real dialog or in-sheet alert

## F4. Unique form identity

Do not use one fixed form ID for every instance.

Use `useId()`.

---

# 11. Workstream G: Finish `RecordDangerDialog`

## G1. Reset all state

On every open:

```text
typedInput = ""
reason = ""
error = null
executing = false
```

Do not preserve a previous typed confirmation.

## G2. Block while preview is unresolved

The confirm button must be disabled when:

```text
loadingPreview = true
previewError exists
dependencyPreview is required but null
```

A failed preview must display:

```text
Dependency check failed. No destructive action was performed.
```

Provide Retry.

Do not allow the parent to swallow a failed preview.

## G3. Dialog behavior

Implement:

- Focus trap
- Escape when not executing
- Initial focus on Cancel or dialog title, never destructive confirm
- Focus return
- Body scroll lock
- Accessible close label
- Prevent backdrop close while executing

## G4. Reason enforcement

Require a reason for:

- Permanent account delete
- Workspace-linked CRM contact removal
- Vendor relationship removal
- Account archive
- Vendor relationship end

The server must receive and store the reason.

---

# 12. Workstream H: Customer vendor page repairs

## H1. Map workspace overrides everywhere

Update:

```text
src/lib/portal/repository.ts
src/lib/portal/types.ts
src/lib/manage/repository.ts
src/lib/manage/types.ts
```

Select and map:

```text
display_name_override
category_override
website_override
ended_at
ended_by
```

Display resolution:

```text
name = display_name_override ?? vendors.canonical_name
category = category_override ?? vendors.category
website = website_override ?? vendors.website
```

Expose canonical values separately when useful.

After saving an override, refresh must show the override.

The edit sheet must distinguish:

```text
Workspace display value
Canonical catalog value
```

## H2. Validate vendor PATCH

Validate:

```text
displayNameOverride length
categoryOverride length
websiteOverride URL
relationshipStatus enum
spendCadence enum
annualizedSpend finite and non-negative
expectedUpdatedAt
```

Allowed relationship states:

```text
active
paused
ended
```

Allowed spend cadence:

```text
monthly
quarterly
annual
variable
```

Do not silently ignore invalid numbers and return success.

## H3. Correct permissions

Server matrix:

| Role | Edit identity override | Edit spend | Configure monitoring | End relationship | Remove relationship |
|---|---:|---:|---:|---:|---:|
| Owner | Yes | Yes | Yes | Yes | Yes when safe |
| Admin | Yes | Yes | Yes | Yes | Yes when safe |
| Member | Yes | Yes | Yes | No | No |
| Viewer | No | No | No | No | No |

Do not let `requirePortalEditor` alone authorize relationship ending.

## H4. Fix dependency queries

Use:

```text
organization_vendor_id = relationshipId
```

for:

```text
expenses
contracts
invoices
documents
expense_accounts
```

Count:

```text
monitoring configs
open opportunities
open actions
source documents
normalized expenses
contracts
invoices
expense accounts
```

Do not query financial records by canonical `vendor_id`.

## H5. End relationship atomically

End must:

1. Verify role.
2. Verify relationship belongs to organization.
3. Set relationship status ended.
4. Set ended timestamp and actor.
5. Pause monitoring.
6. Preserve every financial and source record.
7. Write audit event.
8. Return updated state.

Reactivate must be explicit.

Do not automatically resume email monitoring without a valid current configuration.

## H6. Permanent remove

Allow only when:

- No invoices
- No expenses
- No contracts
- No expense accounts
- No monitoring history requiring retention
- No protected source or workflow dependency
- Role is owner or admin
- Dependency preview passed
- Typed confirmation passed
- Reason supplied

Record the audit event before or within the same transaction as deletion so the event does not fail after the resource disappears.

## H7. True vendor history

Use tenant `audit_events`.

Add a History section or tab containing:

```text
Relationship created
Workspace override changed
Monitoring configured
Monitoring paused
Forwarding test passed
Relationship ended
Relationship reactivated
Removal attempted or completed
```

Do not expose internal-only notes.

## H8. Authoritative monitoring

Use actual:

```text
vendor_monitoring_configs
inbound_email_addresses
```

Display:

```text
state
source method
approved sender
actual private intake address
expected cadence
grace period
last test
last bill received
next expected bill
last failure
```

Do not derive an address from the organization UUID.

---

# 13. Workstream I: Manage account page repairs

## I1. Correct repository types

Extend `ManageAccount` with actual editable and concurrency fields:

```text
employeeCountRange
annualRevenueRange
timezone
assignedTo
assignedToName
visibleInCrm
updatedAt
primaryContactId
```

Select those from their real tables.

Do not send a contact name where the server expects a contact ID.

## I2. Complete edit sheet

The account sheet must edit:

```text
Name
Legal name
Industry
Employee range
Revenue range
Timezone
Currency
Website
Lifecycle stage
Assigned internal owner
Primary contact ID
Next follow-up
Next step
Private notes
CRM visibility
Parent account
```

Group fields clearly.

Show enriched fields separately as read-only context.

## I3. Atomic account update

Use one transaction or reviewed RPC to update:

```text
organizations
crm_account_profiles
crm_contacts primary state
internal audit event
optional CRM activity
```

Validate:

```text
nonblank name
valid timezone
supported currency
valid website
valid stage
assigned user is active staff
primary contact belongs to organization
parent account exists
no parent cycle
expectedUpdatedAt
```

## I4. Inline fields

Use `EditableFieldRow` for:

```text
Lifecycle
Next step
Next follow-up
Website
Industry
Assigned owner
Private notes
```

Do not keep the legacy visible website action controls.

## I5. Archive and restore

Archive currently hides the account from every default Manage query.

Add:

```text
Active
Archived
All
```

filters.

Add a restore route:

```text
POST /api/manage/accounts/[id]/restore
```

Archive:

- `visible_in_crm = false`
- preserve organization
- preserve workspace
- preserve records
- record reason and actor

Restore:

- `visible_in_crm = true`
- choose appropriate lifecycle state
- record actor and reason

An archived record must remain reachable to authorized operators.

## I6. Fix account deletion preview

Use:

```text
crm_email_threads
```

not `crm_mail_threads`.

The blocked decision must consider every displayed dependency:

```text
memberships
contacts
documents
invoices
expenses
contracts
opportunities
actions
savings
vendor relationships
mail threads
tasks
monitoring
audit or retention holds
```

Do not display a nonzero dependency and then ignore it when deciding `blocked`.

## I7. Permanent delete

Permit only an empty disposable lead/test account.

Require internal owner.

Store the audit event in a place that remains valid after deletion.

Do not insert an audit row after deleting the organization when the audit row still requires that organization FK.

Use one transaction.

## I8. True account history

Source:

```text
internal_audit_events
```

Optionally combine labelled CRM activities as relationship context.

Do not present `crm_activities` alone as complete field-change history.

Add a History tab with URL persistence.

## I9. Operational header

Show:

```text
Assigned owner
Last contacted
Next follow-up
Next step
```

Use derived last-contacted truth.

---

# 14. Workstream J: Manage contact page repairs

## J1. Correct contact PATCH

Use:

```text
title
```

not `job_title`.

Validate:

```text
fullName required
valid lowercase email
phone bounded
title bounded
status enum
target organization exists
expectedUpdatedAt
```

Suggested status enum:

```text
active
inactive
archived
```

## J2. Check inline responses

Every current inline save must:

```ts
const response = await fetch(...);
const payload = await response.json().catch(() => ({}));
if (!response.ok) throw new Error(payload.error || "...");
```

Only then show success.

Use correct input kinds:

```text
Email -> email
Phone -> phone
Title -> text
```

## J3. Atomic make-primary

Make-primary must:

1. Verify contact is active.
2. Verify contact belongs to the target organization.
3. Clear current primary.
4. Set selected primary.
5. Update any account summary when required.
6. Write audit event.
7. Commit atomically.

The corrected unique index becomes the final guardrail.

## J4. Moving a contact

Add Move to another account.

Preview:

```text
current account
target account
profile link
workspace membership
tasks
activities
mail threads
marketing consent
primary status
```

Move CRM relationship only.

Do not move workspace membership automatically.

If profile-linked, require internal owner or show a separate workspace-access action.

## J5. Deactivate and restore

When deactivating a primary contact:

- Clear primary status or require selecting a replacement
- Set archived fields
- Remove from default active list
- Preserve mail, activity, tasks, consent history, and profile link

Add filters:

```text
Active
Inactive
All
```

Reactivate must restore visibility.

## J6. Fix contact deletion preview

Use:

```text
crm_email_threads
```

Count:

```text
activities
tasks
email threads
email messages where linked
marketing-consent records
contact inquiries
profile link
workspace memberships
```

A workspace-linked contact must not be removed by an ordinary operator without a clear policy.

Recommended:

```text
CRM-only contact:
  operator may remove after preview and reason

Profile-linked or workspace-linked contact:
  owner only
  show Manage workspace access separately
  never delete auth profile or membership automatically
```

## J7. True contact history

Source:

```text
internal_audit_events where resource_id = contact.id
```

Keep:

```text
Direct contact activity
Account context
History
```

as separate concepts.

## J8. Finish contact operations

Add or verify:

```text
Move to another account
Manage workspace access
View recent email
Next task
Add task with contact preselected
Add internal note with contact preselected
```

Keep marketing consent governed separately.

Do not add a generic consent toggle to Edit Contact.

## J9. Account files label

Keep the tab labelled:

```text
Account files
```

until a true contact-file association exists.

---

# 15. Workstream K: True history APIs

Create bounded server endpoints:

```text
GET /api/portal/vendors/[relationshipId]/history
GET /api/manage/accounts/[accountId]/history
GET /api/manage/contacts/[contactId]/history
```

Requirements:

- Authorization
- Tenant or internal scope
- Pagination
- Safe normalized summary
- Actor display name
- Timestamp
- Action
- Source
- No raw metadata
- No private internal note in customer history
- No provider secrets

The history component currently contains a CSS typo:

```text
border: "1px border ..."
```

Fix it.

---

# 16. Workstream L: Page menu completeness

## Customer vendor menu

Required:

```text
Edit vendor relationship
Configure monitoring
Add bill or contract
Copy vendor information
Pause or resume monitoring
End or reactivate relationship
History
Remove vendor from workspace
```

## Manage account menu

Required P0:

```text
Edit account
Add contact
Add task
Add internal note
Add vendor
Copy account details
Export account data
Manage workspace access
Archive or restore account
History
Delete account
```

Duplicate and merge can remain P1 only when clearly marked and not shown as working.

Do not render dead menu items.

## Manage contact menu

Required P0:

```text
Edit contact
Send email
Call when available
Copy contact details
Make primary
Move to another account
Create task
Add internal note
View recent email when available
Deactivate or reactivate
Manage workspace access when linked
History
Remove contact from CRM
```

Duplicate and merge can remain P1 only when omitted or honestly labelled unavailable.

---

# 17. Workstream M: URL state and direct links

Verify and finish:

```text
/app/vendors/[vendorId]?tab=overview
/app/vendors/[vendorId]?tab=bills
/app/vendors/[vendorId]?tab=contracts
/app/vendors/[vendorId]?tab=findings
/app/vendors/[vendorId]?tab=actions
/app/vendors/[vendorId]?tab=files
/app/vendors/[vendorId]?tab=monitoring
/app/vendors/[vendorId]?tab=history

/manage/accounts/[accountId]?tab=overview
/manage/accounts/[accountId]?tab=vendors&vendor=[relationshipId]
/manage/accounts/[accountId]?tab=files
/manage/accounts/[accountId]?tab=activity
/manage/accounts/[accountId]?tab=work
/manage/accounts/[accountId]?tab=history

/manage/contacts/[contactId]?tab=overview
/manage/contacts/[contactId]?tab=account-files
/manage/contacts/[contactId]?tab=activity
/manage/contacts/[contactId]?tab=tasks
/manage/contacts/[contactId]?tab=history
```

Requirements:

- Refresh preserves state
- Back and Forward work
- Invalid values fall back
- Tabs use router state, not one-time `window.location` reads only
- Mobile tab strip scrolls
- Related records use direct detail routes

---

# 18. Workstream N: Dedicated automated coverage

Add real tests for the work completed in this directive.

## N1. Shared component tests

### `RecordOverflowMenu`

- Transparent resting trigger
- Hover and open class
- Link item navigation
- Button item execution
- Disabled item skipping
- Arrow navigation
- Home and End
- Escape
- Focus return
- Click outside
- Empty menu
- Mobile collision positioning

### `EditableFieldRow`

- Hidden at rest
- Reveals on hover
- Reveals on focus
- Reveals on touch
- Outside click closes
- Copy toast
- Paste to draft
- Paste does not save
- Correct input type
- Save success
- Save error
- Conflict
- Cancel
- View-only
- No layout shift

### `EditRecordSheet`

- Clean close
- Dirty close warning
- State reset
- Focus trap
- Escape
- Focus return
- Save disable
- Error summary
- Mobile full screen

### `RecordDangerDialog`

- State reset
- Preview loading blocks
- Preview failure blocks
- Retry
- Typed confirmation
- Reason required
- Owner restriction through server
- Focus trap
- No backdrop close while executing

## N2. API route tests

Add tests for:

```text
portal vendor PATCH
portal vendor deletion preview
portal vendor DELETE
manage account PATCH
manage account archive
manage account restore
manage account deletion preview
manage account DELETE
manage contact PATCH
manage contact deactivate
manage contact restore
manage contact deletion preview
manage contact DELETE
history endpoints
```

Mock the exact live schema names.

Assert no route uses:

```text
crm_mail_threads
assigned_owner_id
job_title
vendor_id on relationship-scoped financial tables
```

## N3. Live integration tests

With disposable records:

- Vendor override saves and reloads
- Vendor end pauses monitoring
- Vendor delete blocks on every dependency
- Empty vendor relationship removes safely
- Account multi-table update is atomic
- Primary contact is unique
- Account archive disappears from Active and appears in Archived
- Account restore works
- Active customer account deletion is blocked
- Contact title saves
- Contact move is safe
- Deactivate primary requires repair
- Workspace-linked contact removal preserves auth and membership
- True audit history appears

## N4. Playwright tests

Authenticated record-page tests must cover:

```text
desktop
mobile
keyboard-only
pointer-coarse or touch behavior
```

Measure no layout shift.

Capture errors and console output.

Do not use only static component snapshots.

---

# 19. Workstream O: Browser QA

Capture and inspect:

```text
01-vendor-resting.png
02-vendor-menu.png
03-vendor-edit-sheet.png
04-vendor-blocked-remove.png
05-vendor-history.png

06-account-resting.png
07-account-inline-hover.png
08-account-edit-sheet.png
09-account-archive.png
10-account-archived-filter.png
11-account-history.png

12-contact-resting.png
13-contact-inline-hover.png
14-contact-edit-sheet.png
15-contact-move-preview.png
16-contact-workspace-linked-remove.png
17-contact-history.png

18-mobile-vendor-menu.png
19-mobile-account-sheet.png
20-mobile-contact-danger.png
```

Viewport set:

```text
1440 x 900
1024 x 768
820 x 1180
390 x 844
375 x 812
```

Check:

- Dots visible
- No trigger container at rest
- Container appears on hover and focus
- Inline actions reveal
- No text movement
- No horizontal overflow
- Menu not clipped
- Sheet focus trapped
- Dialog focus trapped
- Touch behavior works
- Preview failure cannot delete
- Browser Back works with tabs
- No console error
- No failed request
- No false success toast

Store artifacts:

```text
output/playwright/id-pages-final-remediation/
```

Do not commit auth state.

---

# 20. Workstream P: Restore the complete green gate

Run on the exact final commit:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run eval:invoices -- --manifest tests/fixtures/invoices/golden-manifest.smoke.json --predictions tests/fixtures/invoices/golden-predictions.smoke.json
npm run test:integration
npm run build
npm run test:e2e
```

With privileged ignored credentials:

```bash
npm run test:integration:live
```

Run:

```bash
supabase migration list
```

Re-run:

```text
Supabase security advisor
Supabase performance advisor
```

Require the exact final GitHub Actions run to pass every step.

Do not accept a gate where Playwright fails after every other step passes.

---

# 21. Definition of done

The final verdict may be `ID_PAGES_COMPLETE` only when every item is true.

## Migration and schema

- [ ] Duplicate primary-contact groups are zero.
- [ ] Record-pages migration is applied and recorded.
- [ ] Vendor override fields exist live.
- [ ] Contact archive fields exist live.
- [ ] Unique primary index exists live.
- [ ] Supabase advisors are reviewed.
- [ ] No route references nonexistent columns or tables.

## Shared components

- [ ] Overflow links work.
- [ ] Overflow keyboard behavior works.
- [ ] Overflow menu stays in viewport.
- [ ] Trigger container appears only on hover, focus, or open.
- [ ] Inline controls reveal.
- [ ] Inline controls do not shift values.
- [ ] Copy and paste have feedback.
- [ ] Input types are correct.
- [ ] Edit sheets have real dirty state.
- [ ] Edit sheets trap and return focus.
- [ ] Danger dialogs reset state.
- [ ] Danger dialogs cannot proceed without a successful preview.
- [ ] History uses true audit sources.

## Vendor page

- [ ] Saved overrides display after refresh.
- [ ] Global vendor catalog is untouched.
- [ ] Vendor validation is complete.
- [ ] Member cannot end or remove relationship.
- [ ] Dependency queries use `organization_vendor_id`.
- [ ] Expense accounts are counted.
- [ ] Monitoring pauses on end.
- [ ] Removal is atomic and safe.
- [ ] Vendor history is visible.
- [ ] Monitoring values are authoritative.
- [ ] URL sections work.

## Account page

- [ ] Organization fields write to `organizations`.
- [ ] CRM overlay fields write to `crm_account_profiles`.
- [ ] Assignment uses `assigned_to`.
- [ ] Primary contact uses an ID.
- [ ] Multi-table update is atomic.
- [ ] Concurrency is enforced.
- [ ] Archive filter exists.
- [ ] Restore exists.
- [ ] Deletion preview uses `crm_email_threads`.
- [ ] Every dependency affects the blocked decision.
- [ ] Permanent delete is owner-only and atomic.
- [ ] True history is visible.
- [ ] Inline operational fields work.

## Contact page

- [ ] Title writes to `title`.
- [ ] Email is validated.
- [ ] Status is validated.
- [ ] Inline saves check response status.
- [ ] Make-primary is atomic.
- [ ] One active primary per account is enforced.
- [ ] Move account is safe.
- [ ] Deactivated contacts leave the Active list.
- [ ] Reactivation works.
- [ ] Deletion preview uses `crm_email_threads`.
- [ ] Workspace-linked removal is protected.
- [ ] Auth profile and membership remain intact.
- [ ] Recent email and next task are visible.
- [ ] Direct contact activity and account context remain separate.
- [ ] True history is visible.

## Validation

- [ ] Dedicated component tests pass.
- [ ] Dedicated route tests pass.
- [ ] Live disposable integration tests pass.
- [ ] Desktop QA passes.
- [ ] Mobile QA passes.
- [ ] Keyboard QA passes.
- [ ] Full GitHub quality gate passes.
- [ ] `STATUS.md` reports current truth.

---

# 22. Scope guardrails

Do not add:

- New expense categories
- New AI card types
- New public marketing sections
- New provider integrations
- New mailbox features
- New financial calculation logic
- New autonomous actions
- New broad CRM modules
- A second record component library
- A second audit system
- A second vendor catalog
- Customer edits to shared canonical vendor records

Finish the three ID pages and their supporting contracts.

---

# 23. Required final report

Antigravity must report:

## Verdict

One of:

```text
ID_PAGES_COMPLETE
PARTIAL
BLOCKED
```

## Release identity

```text
Branch
Commit SHA
GitHub Actions run
Preview deployment
Production deployment if released
Applied migration versions
```

## Live schema proof

```text
Vendor override columns
Contact archive columns
Primary-contact unique index
Duplicate-primary count
Migration-history result
```

## Shared interaction proof

```text
Overflow hover
Overflow keyboard
Overflow link
Inline hover
Inline focus
Inline touch
No-shift measurements
Sheet focus trap
Danger preview failure behavior
```

## Vendor proof

```text
Override save and reload
Global catalog unchanged
End relationship
Monitoring pause
Blocked removal
Safe empty removal
History
```

## Account proof

```text
Atomic edit
Correct table mapping
Primary-contact update
Archive
Archived filter
Restore
Blocked delete
Safe disposable delete
History
```

## Contact proof

```text
Title edit
Email validation
Make primary
Move account
Deactivate
Reactivate
Workspace-linked removal protection
Auth and membership preservation
History
```

## Validation

List every command and result.

## Browser evidence

List every accepted screenshot path.

## Remaining limitations

Only list concrete items.

Do not use a vague statement such as `record pages done`.

---

# 24. Final product standard

The pages should be quiet when resting and powerful when touched.

The three-dot menu should be present without becoming a visual badge.

Copy, paste, and edit controls should appear without nudging the content by even a pixel.

The interface should make destructive actions feel deliberate.

The server should remain stricter than the interface.

The database, APIs, page state, audit history, and visual feedback must all tell the same story.
