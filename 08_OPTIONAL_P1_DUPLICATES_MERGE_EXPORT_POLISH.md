---
description: Optional post-P0 work for duplicate detection, bounded merges, exports, richer record provenance, and final polish on Costivra ID pages.
---

# Optional Chunk 8: Duplicates, Merge, Export, and Polish

## Run only after

```text
ID_PAGES_COMPLETE
```

Do not mix this file into the P0 release.

Recommended branch:

```text
agent/id-pages-08-p1-polish
```

## Account duplicate detection

Candidate signals:

```text
Normalized organization name
Website domain
Primary email domain
Phone
Apollo organization identity
Legal name
```

Show confidence reasons.

Do not automatically merge active customer tenants.

## Account merge

Pilot-safe scope:

```text
CRM-only lead accounts
No memberships
No source documents
No financial records
```

Merge preview:

```text
Surviving account
Field choices
Contacts
Tasks
Activity
Mail
Vendor relationships
Parent-child relationships
```

Require internal owner.

Write audit evidence.

## Contact duplicate detection

Candidate signals:

```text
Normalized email
Normalized phone
Normalized full name in same account
Profile ID
```

## Contact merge

Preview:

```text
Surviving contact
Email
Phone
Title
Primary status
Tasks
Activities
Mail
Marketing consent
Profile link
```

Never merge contradictory consent history without review.

Never merge two different profile IDs automatically.

## Export

### Account export

Support a safe package:

```text
Account profile
Contacts
Tasks
Activities
Vendor relationship metadata
Document metadata
Financial record metadata
Audit history
```

Source file bytes require a separate authorized export flow.

### Vendor export

```text
Relationship profile
Monitoring profile
Bills
Contracts
Findings
Actions
File metadata
History
```

### Contact export

```text
Contact profile
Tasks
Direct activity
Mail metadata
Consent history
History
```

## Provenance polish

Show quiet field sources:

```text
Customer entered
Internal CRM
Extracted from source
Public enrichment
System derived
```

Do not let provenance labels become visual confetti.

## Empty and error states

Polish:

```text
No history
No recent mail
No primary contact
No monitoring
Archived record
Terminated relationship
Conflict
Permission denied
Deleted record
```

## Performance

Profile:

```text
Manage account loader
Contact mail lookup
Vendor page related records
History pagination
```

Avoid loading the full CRM when opening one record.

## Final P1 gate

Require the standard complete quality gate and browser QA.

Do not declare P1 complete when merge behavior is merely visual.
