# Automatic Email Intake

Costivra gives each organization a unique generated address at `costivra.ai`. Customers can forward vendor invoices and contracts to that address without sharing their mailbox password or granting Costivra access to every email.

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
- `RESEND_INBOUND_DOMAIN=costivra.ai`

The current Resend plan permits one verified domain. Costivra therefore uses unique generated
addresses on `costivra.ai` for both customer intake and normal platform mail. When the Resend plan
supports another domain, migrate intake to `inbound.costivra.ai` before changing this variable or
provisioned database addresses; configuring only one side silently prevents mail from arriving.
- `MALWARE_SCANNER_URL`
- `MALWARE_SCANNER_TOKEN` when required by the selected scanner

Alternatively, set `CLOUDMERSIVE_API_KEY`; the built-in adapter will use Cloudmersive's file-scanning API without a custom scanner service. This sends source files to Cloudmersive for scanning, so Costivra must approve the provider's privacy terms, DPA, retention behavior, and customer disclosure before production use.

- Resend must have receiving enabled for `costivra.ai`, its MX record verified, and an `email.received` webhook must point to `https://costivra.ai/api/webhooks/resend`.
- Owner mailbox seats and customer document-intake addresses share the receiving domain but use separate database allowlists and processing rules.
- Resend API key **must support inbound-domain and webhook reads**. If readiness check returns `restricted to only send emails`, swap to an API key with inbound permission; send-only keys will always fail domain/webhook readiness.

The malware scanner receives a multipart request containing a `file` part and must return JSON with either `{ "clean": true }` or `{ "infected": true, "signature": "..." }`. A missing, unavailable, or failed scanner never releases an attachment to extraction. The file stays in the private quarantine path until an administrator retries it.

## Security behavior

- Webhooks are verified from the raw request body before any database or file work.
- Unknown senders are rejected and recorded.
- Files are limited to 20 MB and PDF, DOCX, or TXT.
- Originals remain in the private `costivra-documents` bucket.
- SHA-256 prevents organization-level duplicate ingestion.
- Resend attachment URLs are downloaded immediately because they expire.
- Every accepted, rejected, quarantined, and retried message produces tenant-scoped records and audit events.
## Durable processing and retries

Resend delivery and document processing are separate steps. The signed webhook records an
accepted message immediately, then a protected server worker claims queued messages every
minute. The worker downloads attachments, scans them, stores clean originals privately, and
runs extraction. Transient provider or network failures are retried after 1 minute, 5 minutes,
30 minutes, and 2 hours. After five failed attempts, the event moves to manual review and the
workspace owners are notified.

Production requires a server-only `CRON_SECRET` in Vercel. Vercel supplies it as the Bearer
token when calling `/api/cron/inbound-email`; browsers and customer sessions cannot run the
worker. The one-minute schedule requires a Vercel plan that supports per-minute cron jobs.

## Local smoke checks

- `npm run ops:readiness` checks:
  - whether Resend secrets exist and are real values,
  - whether Resend domain/webhook look aligned in production API checks,
  - whether required local Supabase credentials exist and basic operational tables are readable.
- This command does not replace production testing, but it tells you immediately what to fix in
  environment setup before you try full E2E or authenticated workflows.
