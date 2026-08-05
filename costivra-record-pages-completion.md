---
description: Finish Costivra's customer vendor, internal account, and internal contact record pages with consistent overflow menus, complete edit flows, no-shift inline controls, safe archive and deletion behavior, record history, deep links, and verified desktop, keyboard, and mobile interactions.
---

# Costivra Record Pages Completion Goal

## Antigravity Goal Mode execution directive

**Repository:** `powerchoosers/costivra`  
**Baseline audited commit:** `83302c4df938d7e30aa7e6cb2091d8dbcd49283b`  
**Primary surfaces:**

```text
/app/vendors/[vendorId]
/manage/accounts/[accountId]
/manage/contacts/[contactId]
```

**Supporting embedded surface:**

```text
/manage/accounts/[accountId]?tab=vendors&vendor=[relationshipId]
```

**Recommended workflow path:**

```text
.agents/workflows/costivra-record-pages-completion.md
```

**Suggested command:**

```text
/costivra-record-pages-completion
```

**Goal:**

```text
COMPLETE_RECORD_OPERATING_SYSTEM
```

> The record pages already contain substantial product intelligence. This assignment is not a visual rewrite. It completes record control: edit, copy, paste, quick actions, archive, safe removal, history, permissions, conflict handling, direct links, and dependable mobile and keyboard behavior.

---

# 1. Goal Mode operating instructions

Execute this directive in Goal Mode.

Do not stop after writing a plan.

Use this sequence:

1. Recheck the latest `main` branch.
2. Create a protected worktree or branch.
3. Inspect the rendered authenticated pages before editing.
4. Preserve the current Costivra visual system.
5. Build shared interaction components before page-specific implementations.
6. Implement server contracts and migrations before wiring destructive UI.
7. Validate each vertical slice in a real browser.
8. Keep `STATUS.md` truthful.
9. Run the complete quality gate.
10. End with an evidence-backed completion report.

Recommended branch:

```text
goal/record-pages-completion
```

Do not push directly to `main` during development.

Do not rewrite unrelated Ask Costivra, bill-inspector, email, malware-scanner, extraction, or financial workflow code.

---

# 2. Current source-grounded state

Recheck these observations before editing.

Changes after the earlier page audit affected Ask Costivra and its response cards, not the account, contact, or vendor record-page implementations.

## 2.1 Customer vendor page

The current customer vendor detail page already contains:

- Dynamic primary action
- Add contract
- Upload file
- Annualized spend
- Latest expense
- Spend trend
- Record counts
- Continuous monitoring card
- Data-completeness checklist
- Contract summary
- Active findings
- Expense history
- Protected vendor files

It does not provide a complete relationship edit sheet or safe remove flow.

The route is opened with the canonical vendor ID:

```text
/app/vendors/[vendorId]
```

The actual tenant-owned relationship uses:

```text
vendor.relationshipId
```

The customer must edit or remove the organization relationship, not the shared global vendor catalog record.

The existing generic portal edit API supports only these vendor-relationship fields:

```text
relationshipStatus
annualizedSpend
spendCadence
```

The monitoring endpoint uses the relationship ID.

## 2.2 Manage account page

The current account detail page already contains:

- Record header and external links
- Lifecycle
- Next step
- Follow-up date
- Vendor count
- Open work
- Evidence-file count
- Overview, Vendors, Files, Activity, and Work tabs
- Company profile
- Recorded-spend trend
- Vendor relationships
- Contact rail
- Parent and child companies
- Locations
- Internal notes

The current account PATCH route updates only:

```text
stage
nextFollowUpAt
nextStep
privateNotes
website
parentAccountId
```

The displayed record contains more fields than the route can edit.

## 2.3 Manage contact page

The current contact detail page already contains:

- Contact identity
- Email and phone actions
- Account relationship
- Marketing status
- Overview, Shared Files, Activity, and Tasks tabs
- Account context rail

The current Manage contact API supports creation only.

There is no complete:

```text
PATCH /api/manage/contacts/[id]
DELETE /api/manage/contacts/[id]
```

The current contact Activity tab uses organization-level activity rather than contact-specific activity.

The current Shared Files tab displays account files, not files specifically associated with the contact.

## 2.4 Current inline-control behavior

The current account website field always renders its edit and copy buttons in the normal layout.

The actions use an inline-flex container, so they remain visible and consume space.

This violates the required resting behavior.

## 2.5 Live data relationships

The current live schema distinguishes:

```text
vendors
organization_vendors
vendor_monitoring_configs
organizations
crm_account_profiles
crm_contacts
```

Important deletion behavior includes:

- `organization_vendors` may have invoices and expense accounts that restrict deletion.
- Some expenses and contracts may cascade from a vendor relationship.
- Documents may become unassigned.
- Vendor-monitoring configurations may cascade.
- Deleting an organization can cascade through most customer records.
- Contact references in activities, mail, tasks, and inquiries generally become null.
- Contact marketing-consent records may cascade.
- A CRM contact may be linked to a workspace profile.

Do not use a blind database delete from a menu click.

---

# 3. Product outcome

After completion, all three ID pages must feel like members of one record system.

Each page must provide:

```text
Clear identity
Primary next action
Quiet three-dot record menu
Complete edit sheet
Selective inline editing
Copy and paste helpers
Stable resting layout
Direct related-record links
URL-persisted sections
Change history
Safe archive or end action
Dependency-aware permanent removal
Optimistic conflict protection
Audit events
Keyboard support
Touch support
Responsive layout
```

The page should remain visually calm when nobody is interacting with it.

Controls should appear when they are useful, then disappear back into the furniture.

---

# 4. Non-negotiable visual behavior

## 4.1 Three-dot menu

Each record header must contain one visible three-dot icon in its top-right action area.

Required resting state:

```text
Dots visible
No visible border
No visible background
No shadow
No layout shift
```

Required hover and keyboard-focus state:

```text
Quiet neutral background
Quiet neutral border if needed
Visible focus ring
No movement of the record title or other actions
```

The button must have a stable 40 to 44 pixel hit target.

The icon may be 18 to 20 pixels.

The button must be positioned so it does not participate in the title's width calculation.

Recommended structure:

```tsx
<header className="record-header">
  <div className="record-header__identity">...</div>
  <div className="record-header__actions">...</div>
  <RecordOverflowMenu ... />
</header>
```

Recommended positioning:

```css
.record-header {
  position: relative;
}

.record-overflow-trigger {
  width: 42px;
  height: 42px;
  border: 1px solid transparent;
  background: transparent;
  box-shadow: none;
}

.record-overflow-trigger:hover,
.record-overflow-trigger:focus-visible,
.record-overflow-trigger[aria-expanded="true"] {
  border-color: var(--quiet-border);
  background: var(--quiet-hover);
}
```

Do not hide the dots.

The user asked for no visible container until hover, not an invisible menu trigger.

## 4.2 Inline copy, paste, and edit actions

Inline actions must not be visible in the resting state.

Inline actions must not reserve horizontal or vertical space.

The value's position and width must remain unchanged before, during, and after hover.

Required structure:

```tsx
<div className="editable-field-row" tabIndex={0}>
  <div className="editable-field-row__value">...</div>
  <div className="editable-field-row__actions">...</div>
</div>
```

Required positioning:

```css
.editable-field-row {
  position: relative;
  min-width: 0;
}

.editable-field-row__actions {
  position: absolute;
  top: 50%;
  right: 2px;
  display: inline-flex;
  gap: 4px;
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-50%) translateX(4px);
}

.editable-field-row:hover .editable-field-row__actions,
.editable-field-row:focus-within .editable-field-row__actions,
.editable-field-row[data-actions-open="true"] .editable-field-row__actions {
  visibility: visible;
  opacity: 1;
  pointer-events: auto;
  transform: translateY(-50%) translateX(0);
}
```

The action rail may use a subtle background fade so it remains readable over long text:

```css
background: linear-gradient(90deg, transparent, var(--surface) 24%);
padding-left: 18px;
```

Do not implement hidden actions with `opacity: 0` alone while leaving them focusable.

Do not render actions in an inline-flex row beside the value.

## 4.3 Touch behavior

Touch screens have no hover.

On devices where hover is unavailable:

- Tapping the field row may reveal its absolutely positioned action rail.
- Tapping elsewhere closes it.
- The field value must not move.
- The three-dot trigger must remain directly tappable.
- Editing must remain available through the record menu even if inline actions are not revealed.

Do not permanently show every pen and copy icon on mobile.

## 4.4 Copy behavior

Copy must:

- Copy the normalized displayed field value.
- Show a small success toast.
- Fail safely when clipboard access is blocked.
- Never copy secrets, private storage paths, internal provider errors, or unredacted account numbers.

## 4.5 Paste behavior

Paste must:

- Read the clipboard only after a user gesture.
- Enter edit mode.
- Place clipboard text into the draft.
- Not save automatically.
- Allow review and cancellation.
- Show a safe error when clipboard permission is blocked.

Paste should appear only for compatible text fields.

Do not show paste for:

- Dates
- Enums
- Boolean fields
- Derived values
- Counts
- Audit timestamps

## 4.6 Edit behavior

Edit must:

- Use the field's correct input type.
- Preserve a cancel path.
- Save with Enter where appropriate.
- Save multiline fields with Ctrl+Enter or Command+Enter.
- Cancel with Escape.
- Show busy, success, error, and conflict states.
- Retain the user's draft after a recoverable error.
- Use `expectedUpdatedAt` or equivalent optimistic concurrency.

---

# 5. Shared component foundation

Build these reusable components before page-specific work.

## 5.1 `RecordOverflowMenu`

Suggested path:

```text
src/components/records/record-overflow-menu.tsx
```

Responsibilities:

- Transparent resting trigger
- Anchored menu
- Click-outside closing
- Escape closing
- Arrow Up and Arrow Down navigation
- Home and End navigation
- Focus return to trigger
- Permission filtering
- Destructive-action separator
- Mobile-safe positioning
- Viewport collision handling
- `aria-haspopup="menu"`
- `aria-expanded`
- `role="menu"`
- `role="menuitem"`

Suggested data contract:

```ts
type RecordMenuItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  hidden?: boolean;
  destructive?: boolean;
  separatorBefore?: boolean;
  onSelect?: () => void;
  href?: string;
};
```

## 5.2 `EditableFieldRow`

Suggested path:

```text
src/components/records/editable-field-row.tsx
```

Responsibilities:

- Stable resting layout
- Hover, focus, and touch reveal
- Copy action
- Paste-to-draft action
- Edit action
- Inline editor
- View-only mode
- Loading
- Conflict message
- Empty value
- Field provenance badge when useful
- Accessible action labels

Suggested contract:

```ts
type EditableFieldRowProps = {
  label: string;
  value: string | number | null;
  displayValue: ReactNode;
  editable: boolean;
  copyable?: boolean;
  pasteable?: boolean;
  input:
    | { kind: "text"; maxLength?: number }
    | { kind: "url" }
    | { kind: "email" }
    | { kind: "phone" }
    | { kind: "textarea"; maxLength?: number }
    | { kind: "date" }
    | { kind: "datetime" }
    | { kind: "number"; min?: number; max?: number }
    | { kind: "enum"; options: Array<{ value: string; label: string }> };
  onSave: (value: unknown) => Promise<void>;
  source?: "customer" | "internal" | "extracted" | "enriched" | "system";
};
```

Do not let the component infer financial truth.

## 5.3 `EditRecordSheet`

Suggested path:

```text
src/components/records/edit-record-sheet.tsx
```

Use a right-side sheet rather than a cramped modal.

Desktop:

```text
480 to 560 pixels wide
Full viewport height
Scrollable body
Sticky title
Sticky save footer
```

Mobile:

```text
Full screen
Safe-area padding
Large close control
Sticky save footer
```

Responsibilities:

- Grouped fields
- Dirty-state detection
- Save and Cancel
- Unsaved-changes confirmation
- Field-level validation
- Server error summary
- Optimistic conflict handling
- Correct focus trapping
- Focus return
- No background scroll
- Source labels
- Read-only enriched values separated from editable source-of-truth fields

## 5.4 `RecordDangerDialog`

Suggested path:

```text
src/components/records/record-danger-dialog.tsx
```

Responsibilities:

- Archive, deactivate, end, remove, and permanent-delete modes
- Dependency preview
- Consequence explanation
- Typed confirmation where required
- Busy state
- Server error
- Owner-only messaging
- Safe redirect after completion
- No accidental form submission

## 5.5 `RecordChangeHistory`

Suggested path:

```text
src/components/records/record-change-history.tsx
```

Responsibilities:

- Actor
- Timestamp
- Field or action
- Before and after summary where safe
- Source
- Pagination or bounded initial result
- Empty state
- No raw provider payloads
- No secret metadata

Use existing audit tables.

Do not create a parallel ungoverned activity ledger.

---

# 6. Permission model

Implement and test an explicit matrix.

## 6.1 Customer vendor page

| Role | View | Copy | Edit relationship | Edit monitoring | End relationship | Permanent remove |
|---|---:|---:|---:|---:|---:|---:|
| Owner | Yes | Yes | Yes | Yes | Yes | Yes when safe |
| Admin | Yes | Yes | Yes | Yes | Yes | Yes when safe |
| Member | Yes | Yes | Yes | Yes | No | No |
| Viewer | Yes | Yes | No | No | No | No |

A member may not permanently remove financial history.

## 6.2 Manage account and contact pages

| Internal role | View | Edit | Archive or deactivate | Permanent delete |
|---|---:|---:|---:|---:|
| Owner | Yes | Yes | Yes | Yes when safe |
| Operator | Yes | Yes | Yes | No |

The server is authoritative.

Hiding a menu item is not authorization.

---

# 7. Customer vendor page completion

## 7.1 Header menu

Add this menu to `/app/vendors/[vendorId]`:

```text
Edit vendor relationship
Configure monitoring
Add bill or contract
Copy vendor information
Pause monitoring
End vendor relationship
────────────────────────
Remove vendor from workspace…
```

Conditional behavior:

- Show Pause monitoring only when monitoring is active or pending.
- Show Resume monitoring when paused.
- Show End relationship only when not already ended.
- Show Reactivate relationship when ended.
- Show permanent remove only to owner or admin.
- Disable permanent remove until deletion preview is loaded.
- Explain why removal is blocked.

Do not label the tenant action `Delete vendor`.

Use:

```text
Remove vendor from workspace
```

The customer is removing an organization relationship, not deleting the global vendor.

## 7.2 Tenant-owned vendor identity overrides

Do not allow a customer to silently mutate a shared canonical vendor.

Add tenant-owned override fields to `organization_vendors` if they do not already exist:

```text
display_name_override
category_override
website_override
```

Optional supporting fields:

```text
ended_at
ended_by
```

Resolution order:

```text
display_name_override ?? vendors.canonical_name
category_override ?? vendors.category
website_override ?? vendors.website
```

The customer edit sheet should label these fields:

```text
Workspace display name
Workspace category
Workspace website
```

Explain quietly:

```text
These changes affect only your Costivra workspace.
```

Internal vendor-catalog verification remains separate.

## 7.3 Edit-all vendor sheet

Groups:

### Workspace identity

```text
Display name
Category
Website
```

### Relationship

```text
Relationship status
Annualized spend
Spend cadence
Account owner
```

### Monitoring

```text
Source method
Approved sender
Expected cadence days
Grace period days
Monitoring state
```

Read-only operational facts:

```text
Last successful test
Last bill received
Next expected bill
Latest failure state
Private intake address
```

Do not let a user manually claim that a forwarding test passed.

Do not let a user manually claim a bill was received.

Those are system-derived.

## 7.4 Authoritative monitoring card

Replace any derived or hardcoded display with `vendor_monitoring_configs` and the actual `inbound_email_addresses` record.

Show:

```text
Monitoring state
Approved sender
Private intake address
Source method
Expected cadence
Grace period
Last test
Last bill received
Next expected bill
Failure or attention state
```

Do not construct a pretend intake address from the organization UUID.

Do not hardcode monthly cadence when the stored value differs.

## 7.5 Correct data completeness

Use actual records.

Suggested checks:

```text
Recent source document exists
Invoice vendor match resolved
Invoice totals reconciled
At least one normalized expense exists
Contract recorded
Renewal or end date recorded
Location assigned where applicable
Monitoring configured
Forwarding test passed when email monitoring is selected
Last expected bill not missed
```

Do not set Vendor matched to true unconditionally.

Do not infer reconciliation from the existence of an expense.

Each check should have:

```text
Complete
Needs attention
Not applicable
Unknown
```

Do not convert Unknown into Complete.

## 7.6 Vendor section navigation

Add URL-persisted sections:

```text
Overview
Bills
Contracts
Findings
Actions
Files
Monitoring
```

Use:

```text
/app/vendors/[vendorId]?tab=overview
/app/vendors/[vendorId]?tab=bills
/app/vendors/[vendorId]?tab=contracts
```

Requirements:

- Refresh preserves the tab.
- Browser Back and Forward work.
- Ask Costivra can link to a specific section.
- Unknown tab values fall back safely.
- Counts remain visible.
- Mobile tab strip scrolls without page overflow.

## 7.7 Related-record links

Make rows and summary items open their direct records:

```text
/app/expenses/[expenseId]
/app/contracts/[contractId]
/app/opportunities/[opportunityId]
/app/actions/[actionId]
/app/documents/[documentId]
```

Do not link findings to a list-page hash when a direct detail route exists.

## 7.8 End versus permanent removal

### End relationship

Everyday lifecycle action:

- Set relationship status to ended.
- Record ended timestamp and actor when schema supports it.
- Pause monitoring.
- Keep documents, invoices, expenses, contracts, findings, actions, and audit history.
- Hide ended relationships from default active lists.
- Add an Ended filter.
- Allow reactivation.

### Permanent remove

Rare action:

- Load dependency preview first.
- Never rely on current FK cascades as the product behavior.
- Block when invoices or expense accounts reference the relationship.
- Block when removal would destroy normalized financial history.
- Offer End relationship instead.
- Permit permanent removal only for an empty or safely reassignable relationship.
- Require typing the vendor display name.
- Require owner or admin authorization.
- Write an audit event.

Suggested endpoints:

```text
PATCH  /api/portal/vendors/[relationshipId]
GET    /api/portal/vendors/[relationshipId]/deletion-preview
DELETE /api/portal/vendors/[relationshipId]
```

The API path uses the relationship ID even though the page path uses the canonical vendor ID.

Return `409` with dependency counts when permanent removal is unsafe.

---

# 8. Manage account page completion

## 8.1 Header menu

Add:

```text
Edit account
Add contact
Add task
Add internal note
Add vendor
Copy account details
Export account data
Manage workspace access
Find possible duplicate
Merge account…
Archive account
────────────────────────
Delete account…
```

Conditional behavior:

- Workspace access appears only when memberships exist or can be provisioned.
- Merge appears only when another candidate exists.
- Permanent delete is owner-only.
- Archive remains available to operators.
- Delete preview loads before confirmation.

## 8.2 Edit-all account sheet

Groups:

### Identity

```text
Organization name
Legal name
Industry
Website
Logo
```

### Operating profile

```text
Employee range
Annual revenue range
Timezone
Currency
```

### Internal relationship

```text
Lifecycle stage
Assigned internal owner
Primary contact
Next follow-up
Next step
Private notes
CRM visibility
Parent company
```

Read-only derived values:

```text
Last contacted
Member count
Document count
Opportunity count
Open-task count
Created at
```

Do not make Last contacted a freely editable text field.

Derive it from approved activity and mail data.

## 8.3 Atomic account update

Account editing spans:

```text
organizations
crm_account_profiles
crm_contacts for primary-contact selection
```

Use one server-owned transaction or reviewed Postgres RPC.

Do not leave the account half-updated when one table fails.

Extend:

```text
PATCH /api/manage/accounts/[id]
```

Support:

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
expectedUpdatedAt
```

Validate:

- Website protocol
- Currency
- Timezone
- Parent-account cycle
- Primary contact belongs to account
- Assigned owner is active internal staff
- Expected update version

When primary contact changes:

- Clear `is_primary` for other CRM contacts in that account.
- Set the selected contact primary.
- Do not confuse workspace membership with primary CRM contact.

## 8.4 Account inline fields

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

Optional copy-only fields:

```text
Account name
Legal name
Primary email
Record ID
```

Do not expose paste for lifecycle, assigned owner, or follow-up date.

The current website edit and copy controls must be replaced by the shared no-shift component.

## 8.5 Account highlights

Add or promote:

```text
Assigned owner
Last contacted
Next follow-up
```

These answer:

```text
Who owns this?
When did we last speak?
What happens next?
```

Do not crowd the header with every metric.

The most operational fields should be visible above the fold.

## 8.6 Account URL state

Persist tabs:

```text
/manage/accounts/[accountId]?tab=overview
/manage/accounts/[accountId]?tab=vendors
/manage/accounts/[accountId]?tab=files
/manage/accounts/[accountId]?tab=activity
/manage/accounts/[accountId]?tab=work
/manage/accounts/[accountId]?tab=history
```

Persist selected vendor:

```text
/manage/accounts/[accountId]?tab=vendors&vendor=[relationshipId]
```

Requirements:

- Refresh preserves state.
- Browser history behaves normally.
- Vendor links are shareable internally.
- Invalid IDs fall back safely.

## 8.7 Change history

Add a History tab.

Source:

```text
internal_audit_events
crm_activities where appropriate
```

Show:

```text
Actor
Action
Safe summary
Timestamp
Source
```

Examples:

```text
Lewis changed lifecycle from Onboarding to Active.
Lewis updated the website.
Lewis assigned the account to Jordan.
Lewis archived the account.
```

Do not show raw safe_metadata JSON.

## 8.8 Account archive

Use existing CRM visibility and lifecycle fields.

Archive should:

- Set `visible_in_crm = false`.
- Move lifecycle to inactive or closed according to the selected reason.
- Preserve the customer organization and every financial record.
- Remove the account from default Manage lists.
- Keep it available through an Archived filter.
- Allow restore.
- Write an internal audit event.
- Not alter customer workspace access unless selected separately.

## 8.9 Account permanent deletion

Deleting an organization can cascade through most of the tenant.

Treat permanent deletion as a controlled data-destruction operation.

Create:

```text
GET    /api/manage/accounts/[id]/deletion-preview
POST   /api/manage/accounts/[id]/archive
DELETE /api/manage/accounts/[id]
```

The preview must count:

```text
Workspace memberships
Contacts
Documents
Invoices
Expenses
Contracts
Opportunities
Actions
Savings outcomes
Vendor relationships
Monitoring configurations
Email threads and messages
Tasks
Audit events
```

Pilot policy:

- Allow permanent deletion automatically only for empty lead or test accounts with no protected history.
- Block deletion of active customer accounts with financial, document, membership, or audit history.
- Offer Archive account.
- Offer a workspace export.
- Require typing the account name.
- Require internal owner authorization.
- Require a deletion reason.
- Never silently cascade an active customer tenant.

If a future legal deletion workflow is needed, keep it separate from the everyday three-dot menu operation.

## 8.10 Duplicate and merge

Implement a careful first version:

```text
Find possible duplicate
Merge account…
```

Candidate signals:

```text
Normalized organization name
Website domain
Primary email domain
Phone
Known enrichment identity
```

Merge preview must show:

```text
Surviving account
Fields selected from each record
Contacts moved
Tasks moved
Activities moved
Mail relationships moved
Vendor relationships
Customer workspace membership implications
```

Do not automatically merge two active customer tenants.

For the supervised pilot, merge may be restricted to CRM-only lead accounts with no financial documents.

---

# 9. Manage contact page completion

## 9.1 Header menu

Add:

```text
Edit contact
Send email
Call
Copy contact details
Make primary contact
Move to another account
Create task
Add internal note
View recent email
Deactivate contact
Manage workspace access
Find possible duplicate
Merge contact…
────────────────────────
Remove contact…
```

Conditional behavior:

- Call appears only when a phone exists.
- View recent email appears only when a thread exists.
- Make primary appears only when the contact is not already primary.
- Manage workspace access appears only when the contact has a profile or membership.
- Permanent remove must distinguish CRM contact removal from workspace access.
- Marketing-consent actions must not be hidden inside ordinary Edit contact.

## 9.2 Contact API

Create:

```text
PATCH  /api/manage/contacts/[id]
GET    /api/manage/contacts/[id]/deletion-preview
POST   /api/manage/contacts/[id]/deactivate
DELETE /api/manage/contacts/[id]
```

PATCH fields:

```text
fullName
email
phone
title
organizationId
isPrimary
status
expectedUpdatedAt
```

Validation:

- Valid email
- Valid target account
- Email uniqueness rules
- Primary-contact transaction
- Workspace profile distinction
- Conflict protection

Write:

```text
crm.contact_updated
```

to internal audit history with safe field-change metadata.

## 9.3 Edit-all contact sheet

Groups:

### Contact identity

```text
Full name
Email
Phone
Job title
```

### Relationship

```text
Account
Primary contact
Contact status
```

### Workspace access

Read-only summary plus link:

```text
CRM only
Workspace member
Active membership
Disabled membership
```

Do not delete or modify authentication implicitly through Edit contact.

## 9.4 Marketing consent is governed separately

Do not add a casual marketing-consent dropdown to the normal contact edit sheet.

Show a separate section:

```text
Marketing status
Consent source
Consent recorded at
Disclosure version
Revoked at
```

Changing consent requires:

- A dedicated action
- A reason or source
- An audit record
- The correct disclosure version
- Compliance with existing marketing policy

Workspace membership is not marketing consent.

## 9.5 Contact inline fields

Use `EditableFieldRow` for:

```text
Full name
Email
Phone
Job title
```

Use edit-only controls for:

```text
Account
Primary status
Contact status
```

Copy-only:

```text
Record ID
Account name
```

When an email changes:

- Do not rewrite historical sent or received email addresses.
- Future compose uses the new address.
- Existing messages remain evidence of what occurred.

## 9.6 Correct activity scope

Extend `ManageActivity` and repository mapping to include:

```text
contactId
```

Split the contact Activity tab into:

```text
Contact activity
Account context
```

Contact activity:

```text
activity.contact_id = selected contact
```

Account context:

```text
activity.organization_id = contact organization
activity.contact_id is null or belongs to another contact
```

Label account context clearly.

Do not present organization-wide activity as though it belongs to the selected person.

## 9.7 Correct file naming

Rename:

```text
Shared files
```

to:

```text
Account files
```

until the system has a real contact-file association.

Copy:

```text
These source files belong to the client account. Contact-specific email attachments remain in Mail.
```

Do not imply that every account bill was shared by this contact.

## 9.8 Contact communication summary

Add a compact Overview card:

```text
Last contacted
Recent email subject
Recent email date
Next task
Open-task count
```

Direct links:

```text
/manage/mail/[threadId]
/manage/outreach
```

Use actual contact-linked mail or exact email match.

Do not show another contact's thread because it belongs to the same account.

## 9.9 Make primary

Make primary must be transactional:

```text
Clear current primary
Set selected contact primary
Update account summary
Write audit event
Refresh page
```

Only one CRM contact per account may be primary.

If the data model permits multiple by accident, add a partial unique index or server-enforced transaction after checking current data.

## 9.10 Move contact

Moving to another account requires confirmation.

Preview:

```text
Current account
New account
Open tasks that move
Contact-linked activities
Email-thread associations
Marketing-consent organization link
Workspace membership impact
```

Do not automatically move a workspace membership.

If `profile_id` exists, present:

```text
Move CRM contact only
Review workspace access separately
```

## 9.11 Deactivate versus remove

### Deactivate

Everyday action:

- Set status inactive or archived.
- Preserve tasks, activity, email, consent history, and profile link.
- Remove from default active-contact lists.
- Allow restore.
- Do not remove workspace access automatically.

### Remove CRM contact

Permanent CRM action:

- Load dependency preview.
- Preserve messages, activities, and tasks through current null-on-delete behavior.
- Explain that contact links will be removed while historical records remain.
- Marketing-consent deletion must comply with retention policy.
- Require typed confirmation.
- Require internal owner for workspace-linked contacts.
- Never delete the auth profile.
- Never delete organization membership implicitly.
- Write an internal audit event.

If the contact is a workspace member, the danger dialog must provide a separate link:

```text
Manage workspace access
```

## 9.12 Duplicate and merge contacts

Candidate signals:

```text
Normalized email
Normalized phone
Normalized full name within the same account
Profile ID
```

Merge preview:

```text
Surviving contact
Email and phone choice
Title choice
Primary status
Tasks
Activities
Mail threads
Marketing consent
Profile link
```

Never merge contradictory marketing-consent states without explicit review.

---

# 10. Record change history and provenance

## 10.1 Customer vendor history

Use tenant audit events:

```text
audit_events
```

Show:

```text
Relationship edited
Monitoring configured
Monitoring paused
Forwarding test completed
Relationship ended
Relationship reactivated
```

## 10.2 Manage history

Use:

```text
internal_audit_events
crm_activities
```

Do not mix customer-visible and internal-only notes.

## 10.3 Field provenance

Where helpful, show a quiet source label:

```text
Customer entered
Internal CRM
Extracted from source
Public enrichment
System derived
```

Examples:

- Account industry may be Internal CRM or Public enrichment.
- Vendor bill amount may be Extracted from source.
- Last contacted is System derived.
- Private notes are Internal CRM.

Do not allow editing of an enriched display value without clearly deciding where the new value will be stored.

---

# 11. Direct links and quick creation

## 11.1 Vendor page

Direct actions:

```text
Add bill
Add contract
Configure monitoring
Review finding
Review action
```

## 11.2 Account page

Direct actions:

```text
Add contact
Add task
Add note
Add vendor
Compose email
```

New records created from the account page should inherit the account ID.

## 11.3 Contact page

Direct actions:

```text
Compose email
Call
Add task
Add note
Open recent thread
```

New tasks created from the contact page must inherit:

```text
organizationId
contactId
```

Do not require the operator to reselect context they already opened.

---

# 12. Loading, errors, conflicts, and empty states

Every ID page must handle:

```text
Loading
Not found
Permission denied
Archived
Ended
No related records
Save in progress
Save failed
Conflict
Delete blocked
Delete completed
```

## Conflict copy

Use:

```text
This record changed in another session. Review the latest version before saving.
```

Provide:

```text
Reload latest
Keep my draft
Cancel
```

Do not overwrite another operator's changes silently.

## Delete blocked copy

Use dependency-specific language.

Example:

```text
This vendor relationship cannot be removed because 3 invoices and 1 expense account still reference it. End the relationship instead to preserve the financial history.
```

Do not return only:

```text
Delete failed
```

---

# 13. Server and database design rules

1. Every mutation is server-authorized.
2. Customer vendor operations are tenant-scoped.
3. Manage operations require internal access.
4. Permanent account deletion is internal-owner only.
5. Optimistic concurrency is required.
6. Multi-table edits are transactional.
7. Every edit has an audit event.
8. Every archive, end, restore, merge, and delete has an audit event.
9. No customer edit mutates the shared global vendor catalog.
10. No hard delete relies on accidental cascade behavior.
11. No UI-only permission check.
12. No private note enters a customer-visible audit stream.
13. No destructive operation deletes immutable source evidence without an approved retention or deletion policy.
14. No history UI displays secret or raw provider metadata.
15. No duplicate action creates duplicate side effects.

---

# 14. Suggested migrations

Inspect current constraints before creating migrations.

Potential migration set:

```text
record_page_vendor_relationship_overrides
record_page_archive_and_history_support
record_page_contact_update_constraints
record_page_primary_contact_uniqueness
```

Possible vendor relationship fields:

```sql
display_name_override text
category_override text
website_override text
ended_at timestamptz
ended_by uuid
```

Possible contact archive field when status constraints are insufficient:

```sql
archived_at timestamptz
archived_by uuid
```

Use the existing `crm_account_profiles.visible_in_crm` for account archive unless the domain requires a separate timestamp.

If primary contacts are intended to be unique, consider a reviewed partial index:

```sql
create unique index ...
on crm_contacts (organization_id)
where is_primary = true and archived_at is null;
```

Apply only after checking existing duplicate-primary rows.

Every new table or field requires:

- RLS review
- Browser-grant review
- Index review
- Migration-history alignment
- Security-advisor review
- Performance-advisor review

---

# 15. CSS acceptance details

## 15.1 No-shift inline actions

Automated browser measurement must prove:

```text
value x-coordinate before hover
==
value x-coordinate during hover
==
value x-coordinate after hover
```

Also prove:

```text
row width before hover
==
row width during hover
```

The same requirement applies to:

- Account website
- Account next step
- Contact email
- Contact phone
- Contact title
- Vendor relationship fields

## 15.2 Record header stability

Opening the overflow menu must not change:

```text
Title position
Subtitle position
Header height
Primary action position
Phone or email action position
```

## 15.3 Motion

Use restrained transitions:

```text
opacity
transform
background
border-color
```

Avoid animating width or grid columns for hover actions.

Respect:

```css
@media (prefers-reduced-motion: reduce)
```

## 15.4 Responsive behavior

Desktop:

- Overflow menu anchors right.
- Edit sheet remains within viewport.
- Long values truncate safely.
- Related-record tables remain usable.

Tablet:

- Header actions wrap deliberately.
- Overflow remains top-right.
- Right rails move below main content when necessary.

Mobile:

- Header identity remains readable.
- Three-dot trigger remains accessible.
- Tabs horizontally scroll.
- Edit sheet becomes full screen.
- Inline action popover remains on screen.
- Destructive confirmation fits without clipping.
- No horizontal page overflow.

---

# 16. Accessibility acceptance

## Overflow menu

- Trigger has an accessible name such as `More account actions`.
- Menu announces itself.
- Arrow-key navigation works.
- Escape closes.
- Focus returns to trigger.
- Destructive item includes clear text, not color alone.

## Editable fields

- Wrapper announces label and current value.
- Keyboard users can reveal actions.
- Hidden actions are not focusable.
- Edit control has an accessible field-specific name.
- Copy and paste controls have accessible names.
- Validation errors connect to inputs.
- Save status uses `aria-live`.
- Color is not the only source marker.

## Edit sheet

- `role="dialog"`
- `aria-modal="true"`
- Labelled title
- Focus trap
- Escape behavior
- Unsaved-change handling
- Focus return

## Danger dialog

- Consequences readable by screen reader
- Typed confirmation labelled
- Destructive button disabled until requirements are met
- No auto-focus on destructive button
- Cancel is the initial safe action

---

# 17. Automated test plan

## 17.1 Shared components

### `RecordOverflowMenu`

Test:

- Resting trigger has transparent container.
- Trigger is visible.
- Menu opens.
- Click outside closes.
- Escape closes.
- Arrow keys move focus.
- Focus returns.
- Hidden permission items do not render.
- Destructive separator renders.
- Mobile viewport collision handling.

### `EditableFieldRow`

Test:

- Actions hidden at rest.
- Actions do not consume layout.
- Hover reveals.
- Focus reveals.
- Touch toggle reveals.
- Copy works.
- Paste enters draft.
- Paste does not autosave.
- Escape cancels.
- Enter saves.
- Error preserves draft.
- Conflict preserves draft.
- Viewer cannot edit.

### `EditRecordSheet`

Test:

- Opens with complete fields.
- Dirty-state prompt.
- Save.
- Validation.
- Server error.
- Conflict.
- Focus trap.
- Mobile full-screen behavior.

### `RecordDangerDialog`

Test:

- Dependency loading.
- Blocked state.
- Typed confirmation.
- Role restriction.
- Cancel.
- Successful archive.
- Successful safe delete.
- Correct redirect.

## 17.2 Customer vendor

Test:

- Menu labels and permissions.
- Workspace identity override does not mutate global vendor.
- Monitoring uses actual address and cadence.
- Data completeness uses actual invoice state.
- End relationship preserves history.
- Unsafe delete returns 409 and counts.
- Empty relationship can be removed.
- URL tab persists.
- Related-record links work.
- Audit history appears.

## 17.3 Manage account

Test:

- Complete edit sheet.
- Multi-table update.
- Primary-contact transaction.
- Parent cycle rejection.
- Assigned-owner validation.
- Inline field no-shift.
- Archive and restore.
- Permanent delete blocked for active account.
- Empty test account may be deleted by owner.
- Operator cannot permanently delete.
- History tab.
- Vendor deep link.
- Duplicate candidate and restricted merge.

## 17.4 Manage contact

Test:

- PATCH.
- Deactivate and restore.
- CRM-only safe remove.
- Workspace-linked contact does not delete profile or membership.
- Move-account confirmation.
- Make-primary uniqueness.
- Contact activity scope.
- Account context scope.
- Account Files label.
- Recent contact-linked email.
- Consent not casually editable.
- Merge conflicting consent blocked.

## 17.5 Security and isolation

Test:

- Customer cannot edit another tenant's vendor relationship.
- Customer cannot remove another tenant's vendor relationship.
- Viewer cannot mutate.
- Manage endpoints reject customer roles.
- Operator cannot perform owner-only deletion.
- Browser cannot call internal merge or delete RPCs directly when server-only.
- Audit history is tenant-scoped.
- Private notes never appear in customer vendor history.

---

# 18. Playwright browser stories

Capture screenshots and verify behavior for each story.

Store accepted artifacts in:

```text
output/playwright/record-pages-completion/
```

## Story 1: Vendor resting state

- Open vendor detail.
- Confirm dots visible.
- Confirm no visible trigger container.
- Confirm inline controls hidden.
- Capture screenshot.

## Story 2: Vendor menu

- Hover trigger.
- Open menu.
- Capture screenshot.
- Verify keyboard navigation.
- Open Edit vendor relationship.
- Capture sheet.

## Story 3: Vendor blocked removal

- Open Remove vendor.
- Load dependency preview.
- Confirm End relationship recommendation.
- Capture dialog.
- Cancel without mutation.

## Story 4: Account resting state

- Open account.
- Capture resting page.
- Measure website field.
- Hover website.
- Measure again.
- Confirm zero shift.
- Capture action reveal.

## Story 5: Account edit-all

- Open menu.
- Open Edit account.
- Change a disposable field.
- Save.
- Confirm history entry.
- Restore original value.

## Story 6: Account archive

- Use disposable account.
- Archive.
- Confirm hidden from active list.
- Confirm visible in archived filter.
- Restore.

## Story 7: Contact edit

- Open CRM-only contact.
- Reveal email actions.
- Copy.
- Paste into edit draft.
- Cancel.
- Open edit sheet.
- Save a disposable title.
- Restore.

## Story 8: Contact-specific activity

- Confirm Contact activity excludes another contact's event.
- Confirm Account context includes it with correct label.

## Story 9: Touch behavior

At:

```text
390 x 844
```

Verify:

- Three-dot menu
- Inline action reveal
- Full-screen edit sheet
- Danger dialog
- Tab scrolling
- No horizontal overflow

## Story 10: Keyboard-only

Complete:

```text
Open menu
Navigate menu
Open edit sheet
Move through fields
Save
Open inline actions
Cancel
```

without a mouse.

---

# 19. Quality gate

Run on the exact implementation commit:

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

Run live Supabase tests when credentials are available:

```bash
npm run test:integration:live
```

Do not mark complete if the quality workflow fails for an unrelated stale test.

Fix or accurately update the test.

Do not remove meaningful coverage.

At the audited baseline, the quality gate had progressed through lint, unit tests, invoice evaluation, integration, and build, then failed on stale Ask Costivra E2E selectors. Recheck the latest branch and finish the exact current gate rather than assuming it is green.

---

# 20. Definition of done

The task is complete only when all boxes are true.

## Shared behavior

- [ ] Three-dot icon exists on all three ID pages.
- [ ] Trigger container is visually absent at rest.
- [ ] Trigger has a stable accessible hit target.
- [ ] Menu works with mouse, keyboard, and touch.
- [ ] Inline actions are hidden at rest.
- [ ] Inline actions consume no layout space.
- [ ] Copy, paste, and edit work where appropriate.
- [ ] Paste never autosaves.
- [ ] View-only roles cannot edit.
- [ ] Edit sheets are complete and responsive.
- [ ] Conflicts are handled.
- [ ] Every mutation is audited.

## Customer vendor

- [ ] Customer edits tenant-owned relationship data, not global catalog data.
- [ ] Workspace identity overrides are supported safely.
- [ ] Monitoring card uses authoritative records.
- [ ] Data completeness uses real evidence states.
- [ ] URL tabs work.
- [ ] Related records link directly.
- [ ] End relationship preserves history.
- [ ] Permanent removal is dependency-aware.
- [ ] Unsafe removal is blocked with counts.
- [ ] Vendor history is visible.

## Manage account

- [ ] Account edit sheet covers all intended source-of-truth fields.
- [ ] Multi-table updates are atomic.
- [ ] Primary contact is selected transactionally.
- [ ] Assigned owner is visible.
- [ ] Last contacted is visible and derived.
- [ ] High-value fields are inline editable.
- [ ] Archive and restore work.
- [ ] Permanent delete is owner-only and safe.
- [ ] History tab works.
- [ ] URL tab and selected-vendor state persist.
- [ ] Duplicate and merge behavior is bounded safely.

## Manage contact

- [ ] Contact PATCH exists.
- [ ] Contact deactivate and restore exist.
- [ ] Contact delete preview exists.
- [ ] CRM contact removal does not remove auth or membership.
- [ ] Make-primary is unique and transactional.
- [ ] Move-account behavior is safe.
- [ ] Contact activity is contact-specific.
- [ ] Account context is labelled separately.
- [ ] Shared Files is renamed Account Files.
- [ ] Recent email and next task are visible.
- [ ] Marketing consent remains governed separately.
- [ ] Duplicate and merge behavior reviews consent.

## Verification

- [ ] Desktop screenshots accepted.
- [ ] Mobile screenshots accepted.
- [ ] Keyboard story passes.
- [ ] No horizontal overflow.
- [ ] No resting-layout shift.
- [ ] Full quality gate passes.
- [ ] Supabase advisors reviewed.
- [ ] `STATUS.md` updated truthfully.

---

# 21. Scope guardrails

Do not add:

- A new global design system
- A new CRM platform
- A new vendor catalog architecture
- Broad autonomous account deletion
- Unreviewed customer edits to shared vendor identity
- A second audit-event system
- A second modal library
- A new email editor
- A new document-ingestion path
- A new assistant feature
- New financial calculations
- New partner sharing
- New marketing-consent shortcuts

Finish the record pages.

---

# 22. Implementation report required from Antigravity

At completion, provide:

## Verdict

```text
COMPLETE
PARTIAL
BLOCKED
```

## Exact release identity

```text
Commit SHA
Branch
GitHub Actions run
Preview deployment
Production deployment if released
Supabase migration versions
```

## Changed files

Group by:

```text
Shared record components
Customer vendor
Manage account
Manage contact
API routes
Database migrations
Tests
Styles
Documentation
```

## Interaction proof

Report:

```text
Three-dot resting behavior
Hover behavior
Keyboard behavior
Touch behavior
Inline no-shift measurements
Copy and paste behavior
Edit-sheet behavior
Conflict behavior
```

## Destructive-action proof

Report:

```text
Vendor end
Vendor remove blocked or completed
Account archive and restore
Account delete blocked or completed
Contact deactivate and restore
Contact remove
Workspace profile preservation
```

## Data-integrity proof

Report:

```text
Tenant isolation
Audit events
Primary-contact uniqueness
No global vendor mutation
No accidental cascade
No duplicate financial record
```

## Browser evidence

List screenshot paths for:

```text
Vendor resting
Vendor menu
Vendor edit sheet
Vendor danger dialog
Account resting
Account inline hover
Account edit sheet
Contact resting
Contact inline hover
Contact edit sheet
Mobile
```

## Remaining limitations

Only list concrete remaining items.

Do not claim completion when a destructive operation is merely hidden rather than safely implemented.

---

# 23. Final product standard

The completed pages should feel calm at rest and capable in motion.

A user should be able to answer:

```text
What is this record?
What needs attention?
Who owns it?
What happened recently?
What can I change?
What can I safely remove?
Where is the source evidence?
```

without hunting through the application.

The three dots should whisper until called upon.

The inline tools should appear like a pocketknife, not live on the table taking up space.

The database should remain more cautious than the interface.
