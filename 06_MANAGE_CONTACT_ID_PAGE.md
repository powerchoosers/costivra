---
description: Finish Costivra's internal Manage contact ID page with complete editing, primary-contact control, account movement, communication context, deactivation, history, and safe CRM removal.
---

# Chunk 6: Manage Contact ID Page

## Goal

Finish:

```text
/manage/contacts/[contactId]
```

Recommended branch:

```text
agent/id-pages-06-contact
```

## Prerequisites

Chunks 1 through 5 must be merged.

## Header

Required:

- Back to Contacts
- Contact initials or avatar
- Full name
- Job title
- Account
- Active/inactive state
- Primary-contact badge
- Email action
- Phone action when available
- Transparent three-dot trigger

Three-dot menu:

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
Manage workspace access
View history
Deactivate or reactivate
Remove contact from CRM
```

Do not show unavailable actions as live controls.

## Complete edit sheet

### Identity

```text
Full name
Email
Phone
Job title
```

### CRM relationship

```text
Account
Primary contact
Contact status
```

### Read-only workspace context

```text
CRM only
Profile linked
Workspace member
Current membership role
```

Marketing consent remains separate.

## Validation

Full name:

- Required
- Bounded

Email:

- Required when current product policy requires it
- Syntax validated
- Trimmed
- Lowercased

Phone:

- Bounded
- No destructive normalization

Title:

- Bounded

Status:

```text
active
inactive
bounced
unsubscribed
```

Do not write `archived`.

## True dirty state

Do not pass:

```tsx
isDirty={true}
```

Send:

```text
expectedUpdatedAt
```

Preserve draft on conflict.

## Inline fields

Required:

```text
Full name
Email
Phone
Title
```

Every inline save checks:

```text
response.ok
```

Only then show success.

## Make primary

Atomic operation:

1. Verify contact is active.
2. Verify contact belongs to account.
3. Clear current primary.
4. Set selected contact primary.
5. Update account display state.
6. Insert audit event.
7. Commit.

The unique primary index is the final guardrail, not the transaction itself.

## Move to another account

Show preview:

```text
Current account
Target account
Current primary state
Profile link
Workspace membership
Open tasks
Activities
Mail threads
Marketing consent records
```

Move only the CRM contact relationship.

Do not automatically move:

```text
organization_memberships
auth user
profile ownership
```

When profile-linked, show:

```text
Review workspace access separately
```

After moving a primary contact:

- Repair the old account primary state
- Decide whether contact becomes primary in the new account
- Record both changes

## Communication summary

Overview card:

```text
Last contacted
Recent email subject
Recent email date
Next task
Open task count
```

Use contact-linked mail or exact normalized email.

Do not show another contact's thread merely because it belongs to the same account.

Direct link to:

```text
/manage/mail/[threadId]
```

## Activity structure

Keep separate:

### Direct contact activity

```text
contact_id = selected contact
```

### Account context

```text
organization_id = contact account
contact_id is null or another contact
```

### History

```text
internal_audit_events for this contact
```

Do not merge the three concepts.

## Account files

Use label:

```text
Account files
```

Copy:

```text
These source files belong to the client account. Contact-specific email attachments remain in Mail.
```

Do not imply every account file was shared by this contact.

## Tasks and notes

Create task from contact page with:

```text
organizationId
contactId
```

Add internal note with the same context.

## Marketing consent

Show a governed section:

```text
Marketing status
Consent source
Recorded at
Disclosure version
Revoked at
```

Do not place an ordinary consent toggle in Edit Contact.

## Deactivate and reactivate

Deactivate:

```text
status = inactive
archived_at = now()
archived_by = actor
```

When primary, require a replacement or explicit clearing.

Inactive contact disappears from Active list and appears in Inactive or All.

Reactivate restores Active visibility.

## Remove contact from CRM

Preview:

```text
Profile link
Workspace memberships
Tasks
Activities
Email threads
Email messages
Marketing consent
Contact inquiries
Primary state
```

### CRM-only contact

Operator may remove after reason and confirmation.

### Profile-linked or workspace-linked contact

Owner only.

Never delete:

```text
profile
auth user
workspace membership
```

The dialog must link to:

```text
Manage workspace access
```

## Recent email action

Show only when an actual contact-linked thread exists.

Do not construct a dead link.

## Browser stories

1. Resting header
2. Email hover actions with zero shift
3. Copy and paste
4. Edit complete contact
5. Invalid email
6. Conflict
7. Make primary
8. Move account
9. Direct activity versus account context
10. Recent email
11. Add task with context
12. Deactivate
13. Inactive filter
14. Reactivate
15. Workspace-linked removal protection
16. History
17. Mobile menu and sheet

## Exit gate

Require:

```bash
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run build
npm run test:e2e
```

Accept only when:

```text
Contact edits validate and persist
Inline saves never report false success
Make-primary is atomic
Move-account preserves workspace access
Communication summary is contact specific
Deactivate and reactivate are usable
CRM removal preserves auth and membership
Marketing consent remains governed separately
```

Update `STATUS.md`, open a focused PR, and merge only after the full gate is green.
