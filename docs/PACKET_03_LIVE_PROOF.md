# Packet 03 live scanner proof

Date: 2026-08-08 23:40 UTC

The proof used the dedicated authenticated E2E organization and the live Cloudmersive account. No real malware was used; the only infected fixture was the official inert EICAR test string.

## Evidence

| Path | Provider result | Durable evidence | Workflow result |
|---|---|---|---|
| Clean manual upload | `clean`, HTTP 200 | `document_security_scan_attempts`, `source_type=manual_upload`, `safe_code=clean` | Document created and moved to `needs_review` after extraction; audit event recorded |
| EICAR manual upload | `infected`, HTTP 200, `Eicar-Test-Signature` | `source_type=manual_upload`, `document_id=null`, `safe_code=infected` | Rejected before storage/extraction; rejection audit recorded |
| Clean forwarded attachment | `clean`, HTTP 200 | `source_type=email_forwarding`, `safe_code=clean` | Attachment marked `processed`, document linked, customer notification and Manage audit recorded |
| EICAR forwarded attachment | `infected`, HTTP 200, `Eicar-Test-Signature` | `source_type=email_forwarding`, `document_id=null`, `safe_code=infected` | Attachment marked failed/rejected; no document created; processing audit recorded |

The clean forwarded path was also exercised through the Resend-received message flow. The EICAR forwarded case used the same production `processInboundEmailJob` path with a controlled in-memory attachment because Resend rejects `.com` attachments at its boundary; this verifies Costivra's forwarding, scanning, quarantine, audit, and feedback behavior without attempting to deliver a prohibited executable attachment.

## Live controls verified

- Scanner migration `20260808231254_packet_03_scanner_budget_hardening` is applied and registered.
- Scan attempts remain queryable after pre-document rejection.
- Browser roles cannot access the budget ledger or reservation function.
- Clean files reach extraction only after a clean provider result.
- Infected files do not create downloadable documents.
- Customer-facing and Manage-facing feedback are specific to the outcome.
- Replaying the clean manual fixture returned `duplicate` and matched exactly one existing document; no second document row was created.

The retained proof documents are synthetic fixtures in the dedicated authenticated E2E organization and are clearly named `packet03-*`.
