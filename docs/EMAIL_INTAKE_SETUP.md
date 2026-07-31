# Automatic Email Intake

Costivra gives each organization a unique address at `inbound.costivra.ai`. Customers can forward vendor invoices and contracts to that address without sharing their mailbox password or granting Costivra access to every email.

## Customer setup

An organization owner or administrator opens **Integrations → Automatic document intake** and:

1. Adds the exact work email address that will forward documents. Existing Costivra member emails are trusted automatically.
2. Copies the private workspace address.
3. Creates a narrow Outlook or Google Workspace rule for expected invoice and contract messages, or gives the address directly to selected vendors.
4. Activates intake and sends one test PDF, DOCX, or TXT attachment.
5. Confirms the message appears in **Recent inbound activity** and the accepted file appears under **Documents**.

Customers should not create a rule that forwards their entire mailbox. The rule should be limited to known vendor senders, invoice aliases, or explicit folders/labels.

## Platform setup

Production requires these server-only variables:

- `RESEND_API_KEY`
- `RESEND_WEBHOOK_SECRET`
- `RESEND_INBOUND_DOMAIN=inbound.costivra.ai`
- `MALWARE_SCANNER_URL`
- `MALWARE_SCANNER_TOKEN` when required by the selected scanner

Alternatively, set `CLOUDMERSIVE_API_KEY`; the built-in adapter will use Cloudmersive's file-scanning API without a custom scanner service. This sends source files to Cloudmersive for scanning, so Costivra must approve the provider's privacy terms, DPA, retention behavior, and customer disclosure before production use.

Resend must have `inbound.costivra.ai` registered as a receiving-enabled domain, its MX record must be verified, and an `email.received` webhook must point to `https://costivra.ai/api/webhooks/resend`.

The malware scanner receives a multipart request containing a `file` part and must return JSON with either `{ "clean": true }` or `{ "infected": true, "signature": "..." }`. A missing, unavailable, or failed scanner never releases an attachment to extraction. The file stays in the private quarantine path until an administrator retries it.

## Security behavior

- Webhooks are verified from the raw request body before any database or file work.
- Unknown senders are rejected and recorded.
- Files are limited to 20 MB and PDF, DOCX, or TXT.
- Originals remain in the private `costivra-documents` bucket.
- SHA-256 prevents organization-level duplicate ingestion.
- Resend attachment URLs are downloaded immediately because they expire.
- Every accepted, rejected, quarantined, and retried message produces tenant-scoped records and audit events.
