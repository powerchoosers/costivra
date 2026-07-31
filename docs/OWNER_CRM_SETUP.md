# Costivra owner CRM setup

The internal CRM lives at `/manage`. It is deliberately separate from `/app`, which remains the customer workspace.

## 1. Authorize the first internal owner

Set this server-only environment variable in Vercel for Production, Preview, and Development as needed:

```text
COSTIVRA_INTERNAL_ADMIN_EMAILS=your-exact-supabase-login@example.com
```

Use a comma-separated list for more than one internal owner. On the first successful visit to `/manage`, Costivra verifies the authenticated Supabase email and records that user in `internal_staff_users`. A customer workspace owner or administrator is not automatically allowed into the internal CRM.

## 2. Configure Resend sending

```text
RESEND_API_KEY=server-only-key
RESEND_FROM_EMAIL=Costivra <hello@costivra.ai>
```

The From address must belong to a Resend-verified sending domain. The CRM does not send during deployment or testing. A human operator must link the message to a real client account and click Send.

## 3. Configure the owner inbox

Use a dedicated receiving subdomain so business mailbox MX records on `costivra.ai` are not replaced:

```text
RESEND_INBOUND_DOMAIN=inbound.costivra.ai
RESEND_OWNER_INBOX=mail@inbound.costivra.ai
RESEND_WEBHOOK_SECRET=whsec_...
```

Create one signed Resend webhook pointing to:

```text
https://costivra.ai/api/webhooks/resend
```

Subscribe to `email.received`, `email.scheduled`, `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained`, `email.failed`, and `email.suppressed`.

Do not enable receiving on the root `costivra.ai` domain. Do not enable the receiving subdomain until the deployed webhook returns successfully, its signing secret is configured, and the separate document-intake malware scanner requirement is satisfied.

## 4. First production check

1. Sign in with the exact allowlisted Supabase email and open `/manage`.
2. Confirm existing Supabase organizations appear as accounts without sample rows.
3. Add a real follow-up or internal note and confirm it appears in Activity.
4. Send one intentionally authorized email to an address you control.
5. Confirm the Sent conversation has a Resend provider state and an `external_side_effects` record.
6. Reply from the controlled address and confirm the signed webhook creates one Inbox message, not a duplicate.

Never use a real customer address for the first delivery test unless the message itself is legitimate and approved.

## Live-data rule

The owner CRM has no sample rows or browser-side fixtures. It reads customer organizations already stored in the Costivra Supabase project. The existing `demo@costivra.com` / Northstar Hospitality workspace is explicitly marked `visible_in_crm = false`; it remains available for customer-portal testing but is excluded from owner CRM accounts, contacts, work, activity, and linked mail.
