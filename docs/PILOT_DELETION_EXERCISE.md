# Pilot Deletion and Retention Exercise

**Project:** `skfocjrykyvsaviyhdea` (`Costivra`)  
**Data class:** synthetic disposable records only

## Direct deletion proof

A synthetic organization was created through a server-side SQL exercise with no customer records. The hardened `manage_delete_empty_account` function was called with the reason `Packet 03 synthetic deletion exercise`. The assertion completed successfully only after:

- the organization no longer existed; and
- exactly one `crm.account_deleted` internal audit event remained for the deleted organization.

No real customer row, document, or storage object was touched.

## Application cleanup proof

The live integration suite passed 14 tests across 8 files. Its disposable tenant and pilot-journey fixtures create and clean temporary users, organizations, memberships, vendors, monitoring records, documents, and audit-side records. The two-tenant suite proves customer A cannot read or write customer B's organization/document rows.

Targeted retention and private-document tests passed 15/15. They cover storage removal before metadata purge, retention-gone responses, no signed URL for purged originals, tenant-scoped document downloads, and Manage download authorization.

## Retention behavior

The retention runner remains report-only or policy-gated according to environment. No legal retention window was invented or changed by Packet 03. Original-source deletion requires the approved policy and an explicit enforcement switch; audit evidence is retained.

## Storage limitations

Production buckets `costivra-documents`, `costivra-mail-attachments`, and `costivra-avatars` are all private. Storage paths are organization/document scoped in application code. Direct catalog inspection found no `storage.objects` policies visible through the connected SQL inspection, so browser-direct storage access is not claimed as independently proven; the application uses server-side authorized routes and short-lived signed URLs.

## Current conclusion

Synthetic deletion and application cleanup passed. Hosted restore remains separately blocked. Legal retention windows, production enforcement, and any deletion involving real customer data remain outside this exercise.
