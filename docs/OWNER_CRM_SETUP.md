# Costivra owner CRM setup

The internal CRM lives at `/manage`. It is deliberately separate from `/app`, which remains the customer workspace.

## 1. Authorize the first internal owner

Set this server-only environment variable in Vercel for Production, Preview, and Development as needed:

```text
COSTIVRA_INTERNAL_ADMIN_EMAILS=l.patterson@costivra.ai
```

Use a comma-separated list for more than one internal owner. On the first successful visit to `/manage`, Costivra verifies the authenticated Supabase email and records that user in `internal_staff_users`. A customer workspace owner or administrator is not automatically allowed into the internal CRM.

## 2. Configure Resend sending

```text
RESEND_API_KEY=server-only-key
RESEND_FROM_EMAIL=Costivra <hello@costivra.ai>
CONTACT_NOTIFICATION_EMAIL=l.patterson@costivra.ai
```

The From address must belong to a Resend-verified sending domain. `costivra.ai` is verified. CRM messages use the active mailbox seat selected in the composer; the fallback variable remains for transactional product mail. The CRM does not send during deployment or testing. A human operator must link the message to a real client account and click Send.

## 3. Configure the owner inbox

The root domain had no existing MX mailbox provider when receiving was configured, so the CRM can safely receive its mailbox seats directly at `@costivra.ai`:

```text
RESEND_INBOUND_DOMAIN=costivra.ai
RESEND_WEBHOOK_SECRET=whsec_...
```

Create one signed Resend webhook pointing to:

```text
https://costivra.ai/api/webhooks/resend
```

Subscribe to `email.received`, `email.scheduled`, `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained`, `email.failed`, and `email.suppressed`.

Resend receives domain-wide, but the webhook stores owner mail only when the recipient matches an active row in `crm_mailboxes`. Unknown addresses are ignored. Document-intake addresses continue through their separate sender allowlist and fail-closed malware boundary.

Live configuration on July 31, 2026:

- Vercel Production has `RESEND_INBOUND_DOMAIN=costivra.ai`, `RESEND_WEBHOOK_SECRET`, and `COSTIVRA_INTERNAL_ADMIN_EMAILS=l.patterson@costivra.ai`.
- Resend sending and receiving are enabled and fully verified for `costivra.ai`.
- The root MX is `inbound-smtp.us-east-1.amazonaws.com` at priority 10 and resolves publicly.
- The signed production webhook is enabled for inbound and the outbound delivery events listed above.
- The production webhook completed a signed inbound delivery for the owner invitation with HTTP `200` and stored it in the `l.patterson@costivra.ai` inbox.

## 4. Mailbox seats

The first owner seat is `l.patterson@costivra.ai`. Owners can open **Mailboxes** in `/manage` to create additional personal or shared addresses. A verified Resend domain can send from any address on that domain; receiving is also domain-wide, so the database allowlist is the authoritative list of addresses Costivra accepts.

These seats are full send/receive identities inside the CRM. They are not IMAP accounts and do not create Gmail or Outlook credentials. Platform login access remains separate so creating a mailbox cannot accidentally grant someone cross-client access.

## 5. Website inquiry flow

Every successful `/contact` submission now creates or reuses a live owner-CRM account and contact, records the inquiry, adds a high-priority follow-up, and shows the account at the **Lead** stage. Signed-in owner pages check for new inquiry notifications every three seconds and show a toast linking to the account.

The customer receives a transactional acknowledgment immediately through Resend, and `CONTACT_NOTIFICATION_EMAIL` receives the owner copy. These sends use the real Costivra logo and the server-only external-side-effect ledger. The public form does not fail or lose the saved lead if the mail provider is temporarily unavailable.

The marketing checkbox is unchecked by default. Checking it records the exact consent statement, copy version, source, and timestamp; the CRM then labels the contact and account as opted into email marketing. The acknowledgment itself is transactional and does not require marketing consent. Do not add unchecked contacts to Resend broadcasts.

## 6. Branded Supabase Auth domain

The public login, signup, confirmation landing, and password setup pages use `costivra.ai`. The intended Supabase API hostname is `auth.costivra.ai` because Supabase custom domains require a subdomain.

Do not change `NEXT_PUBLIC_SUPABASE_URL` before activation. The safe sequence is:

1. Enable Supabase's separate **Custom Domain add-on** for project `skfocjrykyvsaviyhdea`. **Completed July 31, 2026.**
2. Create `auth.costivra.ai` as the project custom hostname. **Completed.**
3. Add the exact CNAME and TXT verification records Supabase returns to Vercel DNS. **Completed; both records resolve publicly.**
4. Wait for SSL validation, then reverify and activate the hostname in Supabase. **Pending SSL issuance.**
5. Set `NEXT_PUBLIC_SUPABASE_URL=https://auth.costivra.ai` in Vercel Production, Preview, and Development as appropriate; redeploy.
6. Test signup confirmation, normal login, password recovery, owner activation, sign-out, and session refresh on `https://costivra.ai`.

The current Supabase status is `ssl.status=pending_validation`. The project stays on its working `https://skfocjrykyvsaviyhdea.supabase.co` value until SSL is active, preventing an avoidable login outage.

## 7. First production check

1. Sign in with the exact allowlisted Supabase email and open `/manage`.
2. Confirm existing Supabase organizations appear as accounts without sample rows.
3. Add a real follow-up or internal note and confirm it appears in Activity.
4. Send one intentionally authorized email to an address you control.
5. Confirm the Sent conversation has a Resend provider state and an `external_side_effects` record.
6. Reply from the controlled address and confirm the signed webhook creates one Inbox message in the selected seat, not a duplicate.
7. Submit one legitimate inquiry from an address you control, confirm the CRM account stage is Lead, verify the toast appears, and verify the acknowledgment is delivered.
8. Repeat once with marketing consent checked and confirm the account/contact opt-in label appears; do not reuse synthetic or customer-sensitive test data.

Never use a real customer address for the first delivery test unless the message itself is legitimate and approved.

The mailbox seat is already created, but a mailbox seat is not a login. A Supabase owner invitation for `l.patterson@costivra.ai` was created on July 31, 2026 and received in the CRM inbox. The newer email **Set your Costivra owner password** was delivered through Resend and stored in the same inbox; use that secure link. It opens `/set-password`, accepts only the one-time owner-invite session, and then routes to `/manage`.

## Live-data rule

The owner CRM has no sample rows or browser-side fixtures. It reads customer organizations already stored in the Costivra Supabase project. The existing `demo@costivra.com` / Northstar Hospitality workspace is explicitly marked `visible_in_crm = false`; it remains available for customer-portal testing but is excluded from owner CRM accounts, contacts, work, activity, and linked mail.
