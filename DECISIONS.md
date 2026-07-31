# Costivra Architecture and Product Decisions

## 2026-07-31 — Verify password recovery links on the Costivra server

### Context

Supabase recovery emails previously used `ConfirmationURL`, which produced a PKCE authorization code tied to the browser that requested the reset. Opening the email in another browser or profile left no matching verifier and caused password setup to stall or fail.

### Decision

Use Supabase's one-time `TokenHash` in the recovery email and send it to `/auth/confirm` on `costivra.ai`. That server route verifies the recovery token, establishes the secure Supabase session through cookies, and redirects to `/set-password` without exposing a browser-bound PKCE dependency. The password form becomes usable only when a real recovery session exists.

### Consequences

Recovery links work across browsers and devices while remaining single-use and time-limited. Previously issued PKCE links cannot be repaired and must be replaced with a fresh email. Invalid or expired links fail closed and return the user to a clear error state.

## 2026-07-31 — Promote website inquiries into auditable CRM leads

### Context

The public contact form previously saved a standalone inquiry and sent plain transactional email. It did not create an owner-CRM account, show a lead stage, record marketing permission, or surface a timely in-product alert.

### Decision

Handle one contact-form submission as one database transaction. Create or resolve the organization and primary contact, set a new account to the `lead` lifecycle stage, save the original inquiry, create an immediate follow-up task and CRM activity, append explicit email-marketing consent evidence only when the visitor checks the unchecked box, and create a browser-inaccessible internal notification. The owner UI polls a narrow authenticated server route every three seconds and shows unread inquiry alerts as toasts; it never subscribes a browser directly to cross-tenant tables.

Send the visitor's acknowledgment and the owner's notification through the existing Resend side-effect ledger. Both messages use the shared Costivra email shell and the real circuit-mark asset. A repeated inquiry from the same email and company adds activity to the existing account instead of creating a duplicate account.

Rate-limit the public path to five accepted attempts per hashed network address per hour. The database updates the counter atomically, browser roles cannot read it, raw addresses are never stored, and stale counters are deleted after seven days.

### Alternatives considered

- Keeping inquiries in a separate inbox for later manual conversion. This makes follow-up easy to miss and creates two sources of truth.
- Treating form submission as marketing consent. A service acknowledgment is transactional; marketing permission must be separate, explicit, unchecked by default, and evidenced.
- Reading internal notification tables from the browser. This would widen the cross-tenant data surface unnecessarily.

### Consequences

Real inquiries appear immediately in the CRM as leads without demo records. The account and contact show the latest marketing status, while the append-only consent row preserves the exact wording, version, source, and time. Delivery failures do not discard the saved lead, and no provider send is accepted without an idempotency key and ledger record.

## 2026-07-31 — Use `auth.costivra.ai` for the Supabase custom domain

### Context

Costivra's account pages already live on `costivra.ai`, but Supabase Auth network requests still use the default project hostname. Supabase custom domains support a subdomain, not the root domain already serving the website.

### Decision

Use `auth.costivra.ai` as the intended Supabase custom hostname. Keep `NEXT_PUBLIC_SUPABASE_URL=https://skfocjrykyvsaviyhdea.supabase.co` until Supabase reports that the custom hostname is DNS-verified and activated, then change the variable and redeploy. Signup email confirmation explicitly returns to `/login` on the Costivra website.

### Consequences

Changing the client URL early would break login, so activation is a gated infrastructure step. The separate Custom Domain add-on was enabled on July 31, 2026. `auth.costivra.ai` is now registered with Supabase, its CNAME and ACME TXT records are public, and SSL issuance is pending. DNS verification, activation, and the Vercel environment change remain intentionally separate until the certificate is ready.

## 2026-07-31 — Separate the internal CRM control plane from customer workspaces

### Context

Costivra needs one place for its owner to manage customer accounts, contacts, follow-ups, internal notes, and business email across organizations. A customer organization owner is not automatically a Costivra employee, and customer Row Level Security must never become a route to cross-tenant administration.

### Decision

Add an internal `/manage` portal that reads authoritative accounts from `organizations` and workspace contacts from memberships/profiles, then layers server-only CRM fields onto those records. Internal access requires an authenticated user plus an explicit `internal_staff_users` record or exact email in `COSTIVRA_INTERNAL_ADMIN_EMAILS`. All cross-tenant reads and writes run through narrow server routes after that check. CRM, mailbox, and internal-audit tables deny `anon` and `authenticated` browser roles even though Row Level Security remains enabled.

Do not seed sample accounts, contacts, tasks, activities, or messages. Missing CRM fields display as unknown or empty rather than being invented.

### Alternatives considered

- Reusing customer organization roles for internal access. This would let customer permissions leak into a cross-tenant control plane.
- Copying customer records into a second CRM account table. That creates conflicting sources of truth.
- Shipping static example data to make the interface look populated. This hides real empty states and can be mistaken for customer data.

### Consequences

The owner portal stays useful as real customers arrive while customer workspaces remain isolated. Deployment must configure the internal email allowlist before the first operator can enter `/manage`; the allowlisted authenticated user is then recorded as an internal owner.

## 2026-07-31 — Treat every Resend send as an authorized external side effect

### Context

The internal mailbox needs outbound, scheduled, reply, forward, attachment, and delivery-state behavior. Email is an external action, so a UI click alone is not enough evidence after a timeout or retry.

### Decision

Require every outbound message to be linked to a real organization. Before contacting Resend, persist the actor, organization, destination, content hash, idempotency key, authorization time/method, sanitized attachment names, and trace identifier in `external_side_effects`. Store provider acceptance immediately, then create the mailbox message, activity, and internal audit event. Verify signed webhooks and idempotently reconcile scheduled, sent, delivered, delayed, bounced, complained, failed, and suppressed states. Render inbound email from plain text; retain provider HTML for provenance but never inject it into the owner UI.

### Consequences

Repeated requests cannot silently duplicate a send, ambiguous outcomes have a provider reference for reconciliation, and messages remain attributable. No live email is sent merely to test the implementation; an operator must intentionally authorize the first production send.

## 2026-07-31 — Use customer-managed forwarding for automatic document intake

### Context

Costivra needs recurring invoice and contract intake without requiring every customer to manually upload each month or granting broad access to an employee's mailbox. Source attachments are untrusted and may contain sensitive financial data.

### Decision

Provision one private receiving address per organization. Let an owner or administrator approve exact forwarding addresses and configure a narrow rule in the customer's existing mail system. Verify signed Resend webhooks, require an exact tenant address and trusted sender, retrieve attachments immediately, scan them before extraction, and route scanner failures to private quarantine. Reuse the manual document ingestion pipeline so provenance, deduplication, extraction versions, evidence, and audit behavior do not diverge.

### Alternatives considered

- Broad Gmail or Microsoft mailbox OAuth as the first path. This creates a larger privacy and permission surface and is unnecessary for the MVP.
- Accepting attachments before malware scanning. This violates the document-intake security boundary.
- Enabling Resend receiving on the root `costivra.ai` domain without first checking MX records. That would risk displacing an existing mailbox provider.

### Consequences

Customers can configure intake themselves without sharing mailbox credentials. Unknown senders fail closed, and unscanned files never reach extraction. A production malware scanner must be selected. A live DNS inspection later on July 31 found no root-domain MX provider, so the mailbox-seat decision below uses `costivra.ai` directly; the safety rule remains to inspect MX before enabling receiving.

## 2026-07-31 — Use Resend only through a server-side delivery ledger

### Context

The `costivra.ai` sending domain is verified and a restricted server credential is configured in Vercel. The first production email use is contact-inquiry confirmation, before any approval-gated vendor communication is built.

### Decision

Send transactional email through a small server-only Resend adapter. Persist the inquiry before attempting delivery, assign a stable idempotency key to each message, and record the request hash, provider result, and failure state in a browser-inaccessible delivery ledger. Do not expose the API key or treat a provider response as proof that a person read the message.

### Alternatives considered

- Sending directly from the contact route without a ledger. This would make duplicate sends and ambiguous provider failures difficult to audit.
- Building general vendor-email execution now. That would outrun the current approval-policy and durable-workflow milestone.

### Consequences

Contact inquiries can produce a receipt and an internal notification without losing the saved inquiry when email is unavailable. Vendor, referral, cancellation, and other consequential email remain unavailable until their approval and execution controls are implemented.

## 2026-07-30 — Build the complete frontend before backend integrations

### Context

The repository was empty except for `AGENTS.md`, and the immediate objective was a complete public and customer frontend that could be reviewed locally.

### Decision

Build a single Next.js 16 App Router application with code-native marketing and customer product surfaces. Use realistic demo records and local interaction state while clearly labeling backend-dependent behavior as a preview.

### Alternatives considered

- Scaffold the full monorepo and backend foundation first. This would delay the requested reviewable frontend.
- Build only a marketing landing page. This would not satisfy the blueprint's customer application scope.

### Consequences

The full information architecture, visual system, navigation, legal drafts, responsive behavior, and primary product interactions can be reviewed now. Authentication, tenancy, storage, extraction, workflow orchestration, integrations, and persistence remain future milestones and must not be implied as complete.

## 2026-07-30 — Use an editorial evidence-first visual system

### Context

Costivra needs to feel financially serious and understandable rather than like a generic AI product.

### Decision

Use warm financial-paper backgrounds, near-black operational chrome, signal cobalt for attention, recovery mint only for verified or recovered value, restrained linework, modest radii, and mono typography for data and evidence labels.

### Consequences

The public site and customer application share one recognizable system. The design avoids neon AI decoration, unsupported social proof, and repetitive card grids.

## 2026-07-30 — Keep partner routing neutral and consent-gated

### Context

The founder's relationship with UCEP creates a material trust and conflict boundary.

### Decision

Describe UCEP as one optional energy-review destination. Keep independent detection separate from routing, present neutral choices, require explicit consent, and include a dedicated relationship disclosure.

### Consequences

The frontend cannot auto-route an energy case or present UCEP as the only option. Commercial integration remains blocked pending written employment/IP clarity and counsel-reviewed disclosure language.
## 2026-07-31 — Treat Resend mailbox seats as application identities, not hosted email accounts

**Context:** Costivra needs multiple working `@costivra.ai` addresses in the owner CRM. Resend accepts any sender on a verified domain and receives any address on a receiving-enabled domain, but it does not provide Gmail/Outlook-style IMAP seats.

**Decision:** Store an explicit server-only `crm_mailboxes` allowlist. Each thread, message, and outbound side effect records its mailbox. Owners administer all seats; operators may use only assigned personal seats or shared seats. Creating a mailbox never grants platform access, and creating a platform user never silently creates cross-client mailbox access.

**Alternatives considered:** Treat arbitrary From addresses as seats, which would allow spoofing and make inbound routing ambiguous; or require Google Workspace/Microsoft 365 immediately, which would add OAuth, provider billing, token custody, and synchronization before the CRM workflow is proven.

**Consequences:** Seats send and receive completely inside Costivra through Resend, with exact address routing and auditability. The root `costivra.ai` MX now routes inbound mail to Resend, and only active database-allowlisted mailbox or document-intake addresses are retained. Seats do not provide IMAP, native Gmail, or Outlook logins. A traditional mailbox provider can be added later behind a separate adapter if outside-CRM access becomes necessary.
