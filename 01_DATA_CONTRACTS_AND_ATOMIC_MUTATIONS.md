---
description: Create schema-authoritative, atomic, concurrency-safe mutation services for Costivra vendor relationships, accounts, and contacts.
---

# Chunk 1: Data Contracts and Atomic Mutations

## Goal

Create the trusted server foundation for all three ID pages.

Do not spend this chunk redesigning page layouts. The UI may receive only the minimum contract adjustments required to compile and exercise the new services.

Recommended branch:

```text
agent/id-pages-01-data-contracts
```

## Entry gate

Before editing:

```bash
git status --short
git log -5 --oneline
npm ci
npm run typecheck
npm run lint
npm test
npm run test:integration
```

Inspect current live Supabase tables and migrations.

## Current problems to repair

### Account update is not atomic

`src/app/api/manage/accounts/[id]/route.ts` currently performs:

1. Organization update
2. Primary contact clearing
3. Primary contact setting
4. CRM profile upsert
5. CRM activity insert
6. Internal audit insert

as independent calls.

A later failure can leave partial state.

### Contact update is not atomic

Contact make-primary currently clears existing primary contacts and updates the selected contact through separate calls.

Moving a contact can also leave primary state inconsistent.

### Account deletion can lose audit truth

The current account delete route deletes the organization, then inserts an internal audit event referencing the deleted organization.

Because `internal_audit_events.organization_id` references `organizations.id`, this is not a safe sequence.

### Vendor audit writes do not match the live table

The vendor route currently writes:

```text
safe_metadata
```

to:

```text
audit_events
```

but the live table does not have that field.

The route also needs a valid:

```text
actor_type
```

### Concurrency is missing

Account, contact, and vendor edit sheets can overwrite a record changed in another session.

## Required architecture

Create server-only domain services, backed by reviewed Postgres RPCs where multiple writes must commit together.

Suggested application files:

```text
src/lib/manage/account-records.ts
src/lib/manage/contact-records.ts
src/lib/portal/vendor-relationships.ts
```

Suggested RPCs:

```text
manage_update_account_record
manage_update_contact_record
manage_set_primary_contact
manage_archive_account
manage_restore_account
manage_deactivate_contact
manage_reactivate_contact
portal_update_vendor_relationship
portal_terminate_vendor_relationship
portal_reactivate_vendor_relationship
```

Equivalent names are acceptable when the responsibilities remain clear.

## Security requirements for RPCs

For any `security definer` function:

```sql
set search_path = ''
```

Then:

```sql
revoke execute from public, anon, authenticated;
grant execute to service_role;
```

The browser must call an authorized Next.js route, never the RPC directly.

Server routes remain responsible for:

- Session authorization
- Role checks
- Input validation
- Tenant scope
- Safe response shaping

## Account source mapping

Update these fields on `organizations`:

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

Update these fields on `crm_account_profiles`:

```text
lifecycle_stage
assigned_to
next_follow_up_at
next_step
private_notes
visible_in_crm
website
updated_at
```

Primary contact uses:

```text
crm_contacts.id
```

not a contact-name string.

## Contact source mapping

Use:

```text
full_name
email
phone
title
organization_id
is_primary
status
archived_at
archived_by
updated_at
```

Allowed contact status values:

```text
active
inactive
bounced
unsubscribed
```

Deactivation uses:

```text
status = inactive
archived_at = now()
archived_by = actor
```

Reactivation uses:

```text
status = active
archived_at = null
archived_by = null
```

## Vendor relationship mapping

Use:

```text
display_name_override
category_override
website_override
relationship_status
annualized_spend
spend_cadence
ended_at
ended_by
updated_at
```

Allowed relationship status values:

```text
prospect
active
inactive
terminated
```

Allowed spend cadence values:

```text
monthly
annual
```

Terminate relationship:

```text
relationship_status = terminated
ended_at = now()
ended_by = actor
```

Reactivate relationship:

```text
relationship_status = active
ended_at = null
ended_by = null
```

Do not map monitoring pause into relationship status.

## Concurrency contract

Every record DTO used by an edit sheet must expose:

```text
updatedAt
```

Every mutation accepts:

```text
expectedUpdatedAt
```

The database update must include the expected timestamp in its predicate.

When no row matches because the record changed:

```http
409 Conflict
```

Safe response:

```json
{
  "error": "This record changed in another session. Reload the latest version before saving.",
  "code": "record_conflict"
}
```

Do not return private record payloads in the conflict response.

## Account transaction behavior

One atomic operation must:

1. Verify account exists.
2. Check expected account or profile version.
3. Validate parent relationship and prevent cycles.
4. Validate assigned operator.
5. Validate primary contact belongs to account.
6. Update organization fields.
7. Upsert CRM profile.
8. Clear and set primary contact when requested.
9. Insert CRM activity when appropriate.
10. Insert internal audit event.
11. Return the new `updatedAt`.

A failure rolls everything back.

## Contact transaction behavior

One atomic operation must:

1. Verify contact exists.
2. Check `expectedUpdatedAt`.
3. Validate normalized email.
4. Validate target organization.
5. Preserve profile and workspace membership links.
6. Move the CRM contact when requested.
7. Repair primary status in old and new accounts.
8. Update fields.
9. Insert CRM activity.
10. Insert internal audit event.
11. Return new `updatedAt`.

## Vendor transaction behavior

One atomic operation must:

1. Verify tenant and role.
2. Verify relationship belongs to tenant.
3. Check `expectedUpdatedAt`.
4. Validate override lengths and URL.
5. Validate status and cadence.
6. Update relationship.
7. Insert a valid customer audit event.
8. Return the updated relationship.

Termination must additionally pause monitoring in the same transaction.

## Customer audit metadata decision

The customer vendor page needs readable history.

Preferred migration:

```sql
alter table public.audit_events
add column if not exists safe_metadata jsonb not null default '{}'::jsonb;
```

Add a check or application allowlist that prevents secrets and raw source text.

Every customer audit insert must include:

```text
actor_type = user
actor_id
organization_id
action
resource_type
resource_id
safe_metadata
before_hash when applicable
after_hash when applicable
trace_id
```

Do not store:

- Private document content
- Full account numbers
- Provider secrets
- Raw request payloads
- Internal notes

If a different design is chosen, it must still support customer-safe readable history without exposing internal audit data.

## Validation rules

### Account

Validate:

- Name required and bounded
- Legal name bounded
- Timezone is recognized
- Currency is supported
- Website is public HTTP or HTTPS
- Lifecycle stage allowed
- Assigned operator is active
- Parent exists and creates no cycle
- Primary contact belongs to account
- Follow-up date parses

### Contact

Validate:

- Full name required
- Email syntactically valid and normalized lowercase
- Phone bounded
- Title bounded
- Status allowed
- Organization exists
- Profile-linked contact rules
- Primary contact belongs to target organization

### Vendor relationship

Validate:

- Display name override bounded
- Category override bounded
- Website override public HTTP or HTTPS
- Annualized spend finite and nonnegative
- Status allowed
- Cadence allowed

Do not silently ignore invalid numbers.

## Delete transaction safety

Do not implement broad deletion in this chunk. Prepare reusable atomic helpers for later lifecycle work.

The helper must be able to:

- Verify a deletion preview token or current dependency state
- Insert durable audit evidence before removing a resource
- Avoid a foreign-key reference to a deleted organization
- Roll back everything on failure

For account deletion, one acceptable audit strategy is an internal audit event with:

```text
organization_id = null
resource_id = deleted organization ID
safe_metadata containing allowlisted name and deletion reason
```

inside the transaction.

## Tests

Add focused tests for:

- Account all-or-nothing update
- Account primary-contact update
- Account parent-cycle rejection
- Contact all-or-nothing update
- Contact move between accounts
- Contact make-primary uniqueness
- Vendor termination and monitoring pause
- Vendor invalid status rejection
- Vendor invalid cadence rejection
- Concurrency conflict for all three records
- Browser roles cannot execute RPCs
- Audit rows are created only when mutation commits

## Exit gate

Require:

```bash
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run build
```

With live disposable credentials:

```bash
npm run test:integration:live
```

Confirm:

```text
No route describes independent writes as transactional
No route writes nonexistent audit columns
No account/contact/vendor partial mutation survives a forced failure
Every edit API accepts expectedUpdatedAt
Every conflict returns 409
Supabase security advisor has no new P0 warning
```

Update `STATUS.md`, open a focused PR, and merge only after the full GitHub gate is green.
