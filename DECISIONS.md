# Costivra Architecture and Product Decisions

## 2026-07-31 — Resolve authenticated users to an authorized product surface

### Context

The login proxy previously sent every authenticated session without an explicit destination to `/app`. Internal Costivra operators intentionally have no customer-organization membership, so an owner recovery session could be redirected into the customer workspace and trigger `NO_ORGANIZATION_MEMBERSHIP`.

### Decision

Route successful authentication through `/access`. The server verifies the session, checks the explicit internal-staff boundary and customer-organization membership, then sends the user to `/manage` or `/app`. Requested destinations are restricted to those two same-origin route families. An account with neither authorization returns to login with a clear access message, and the customer workspace redirects missing-membership sessions through the resolver instead of rendering a raw server failure.

### Consequences

Owner and customer identities remain separate while sharing one sign-in surface. Recovery sessions and direct top-bar sign-in visits reach the correct portal, unauthorized accounts fail safely, and the routing rules are covered by deterministic tests.

## 2026-07-31 — Verify password recovery links on the Costivra server

### Context

Supabase recovery emails previously used `ConfirmationURL`, which produced a PKCE authorization code tied to the browser that requested the reset. Opening the email in another browser or profile left no matching verifier and caused password setup to stall or fail.

### Decision

Use Supabase's one-time `TokenHash` in the recovery email and send it to `/auth/confirm` on `costivra.ai`. That server route verifies the recovery token, establishes the secure Supabase session through cookies, and redirects to `/set-password` without exposing a browser-bound PKCE dependency. The password form becomes usable only when a real recovery session exists.

### Consequences

Recovery links work across browsers and devices while remaining single-use and time-limited. Previously issued PKCE links cannot be repaired and must be replaced with a fresh email. Invalid or expired links fail closed and return the user to a clear error state.

The email now lands on `/confirm-recovery`, which requires an explicit user button before the server verifies the token. This prevents email-client security scanners and link previewers from consuming the single-use recovery token with an automated GET request. The reproducible hosted template is stored at `docs/SUPABASE_RECOVERY_EMAIL_TEMPLATE.html` and includes the approved Costivra logo and complete footer.

## 2026-08-01 — Keep password recovery authorization server-authoritative

### Context

The password page repeated session verification in the browser and disabled its inputs and submit control from React state. A stale rotated refresh token could leave the page gray without identifying the session failure. Browser password managers could also fill the visible inputs without synchronizing that React state, making valid entries appear unmatched and preventing submission entirely.

### Decision

Verify the Supabase session on the server, include `/set-password` in the cookie-refresh proxy, and remove stale Supabase auth cookies when refresh-token rotation has invalidated them. Render a separate reset-link screen when no authenticated session exists. For an active session, use uncontrolled password fields, read the submitted DOM values, validate both entries again on the server, and keep a standard POST form action as a progressive fallback. The update route may modify only the authenticated user and must never search for or target a hardcoded owner account.

### Consequences

Password-manager autofill cannot silently keep the submit action disabled, expired sessions produce an honest recovery instruction, and password saving still works if client-side form enhancement fails. The server remains the final authorization and validation boundary. A consumed or expired link still requires a fresh recovery email; the application does not weaken Supabase's single-use-token policy.

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

## 2026-08-01 — Constrain password-recovery sessions to password setup

**Context:** Supabase establishes an authenticated, short-lived session after a valid recovery link is verified so the user can call `updateUser()` to save a new password. Without an application-level guard, a browser refresh could make that temporary session look like an ordinary Costivra sign-in and open the owner workspace before the password update completes.

**Decision:** The confirmation route writes a secure, HTTP-only, same-site `costivra-recovery-setup` cookie with a 15-minute expiry. The proxy redirects workspace requests to `/set-password?mode=recovery` while it is present. The server-side password-update route alone clears it after Supabase confirms the new password was saved.

**Consequences:** A recovery email still has the expected single-use Supabase security properties, but the product experience cannot treat that recovery session as completed access. Users cannot enter `/app` or `/manage` from the reset flow until password creation actually succeeds.

## 2026-08-01 — Keep internal profile photos private and server-scoped

**Context:** The Manage workspace needs real operator profile photos instead of permanent letter avatars. These images identify internal staff and do not need a public, permanent URL.

**Decision:** Store operator photos in a dedicated private `costivra-avatars` Supabase Storage bucket. Save only the object path on `profiles`, upload through an authenticated internal API, and render a short-lived signed URL generated on the server. Limit files to JPG, PNG, or WebP and 5 MB. Keep email identity administration under Manage Settings while preserving the old mailbox URL as a redirect.

**Alternatives considered:** A public avatar bucket would make rendering simpler but would expose durable staff image URLs. Storing avatars in the document bucket would mix user identity assets with immutable customer evidence and its stricter lifecycle.

**Consequences:** Staff images remain private by default and can be replaced without exposing a privileged Supabase key to the browser. Signed URLs expire, so the Manage page must refresh them during server rendering.

## 2026-08-01 — Treat extracted invoices as reviewable structured records

**Context:** Document intake previously stopped after saving a document summary and a few candidate facts. It could not preserve invoice identity, line items, reconciliation results, or a durable correction history, and email intake could not safely connect an extracted vendor name to an organization vendor.

**Decision:** Add tenant-scoped invoice, line-item, and append-only correction tables. AI returns typed candidate fields using decimal strings. Deterministic code performs exact-cent arithmetic and only exact canonical-name or curated-alias vendor matching. A supplied vendor is accepted only after organization validation. Ambiguous, unmatched, incomplete, low-confidence, or non-reconciling invoices remain in `needs_review`; AI output never silently becomes an approved financial fact.

**Alternatives considered:** Fuzzy vendor matching would attach more invoices automatically but risks contaminating customer history. Storing invoice fields only inside extraction JSON would avoid new tables but make reconciliation, history, correction, and evidence queries unreliable. Using JavaScript numbers for money would be simpler but would introduce binary floating-point risk.

**Consequences:** New native-text invoices can become queryable records with line items, vendor-match status, exact arithmetic checks, and visible review state. Scanned documents still require OCR, and a human correction/approval interface remains the next vertical slice before extracted records become authoritative expenses.

## 2026-08-01 — Use a canonical vendor directory with tenant relationships

**Context:** Adding a vendor required manual entry and produced a disconnected relationship record. Costivra also needs a useful vendor page without inventing missing invoices, savings, or contract terms.

**Decision:** Keep researched vendor names, aliases, categories, and websites in the shared `vendors` directory, while spend, cadence, status, and all customer records remain on tenant-scoped relationships. A directory selection is reloaded on the server so browser-supplied names and websites are not trusted. Custom vendors remain possible. Money is parsed into integer cents and annualized by deterministic code. The add flow is a non-modal right panel whose draft survives navigation for the current browser session. Individual vendor pages assemble only saved tenant documents, expenses, contracts, findings, and actions.

**Alternatives considered:** A frontend-only suggestion list would drift and could be manipulated. Scraping a very large vendor database would introduce poor-quality matches and categories outside the MVP. Copying contract dates onto vendor relationships would create conflicting sources of truth.

**Consequences:** Suggestions can improve centrally without exposing customer records across tenants. The UI is faster to complete and remains usable while the panel is open. Contract and financial gaps stay visibly unknown until evidence is added. Creating a vendor is limited to members, admins, and owners; viewers remain read-only.

## 2026-08-01 — Route only invoice exceptions through human review

**Context:** Reviewing every recurring bill would create operational drag and obscure the records that actually need judgment. At the same time, extracted invoice data must not silently become an authoritative expense when required facts, vendor identity, or arithmetic are uncertain.

**Decision:** Keep every extracted invoice queryable, but place only exception records in the default Manage review queue. Exceptions include unmatched vendors, missing required fields, missing categories or service periods, low confidence, and incomplete or failed deterministic reconciliation. Owners may bulk-assign exception records; reviewers correct them in a source-and-fields split view. Approval is a protected database transaction that requires complete reconciled fields and idempotently writes the linked tenant expense.

**Alternatives considered:** Reviewing every invoice would not scale and would train reviewers to rubber-stamp. Auto-approving all high-confidence model output would treat a probability as authorization. Keeping approved expenses disconnected from invoices would break provenance and permit duplicates.

**Consequences:** Human time stays concentrated on uncertainty while clean invoices continue through the pipeline. Every correction and assignment is attributable, repeated approval cannot duplicate expenses, and the client portal updates from the approved structured record. The queue can remain honestly empty until real invoice intake produces records.
