# Costivra Architecture and Product Decisions

## 2026-08-02 — Deliver live mail activity through targeted notifications and scan-gated private attachments

### Context

Owner mail needs timely notice of inbound messages, opens, clicks, and delivery problems. Resend webhooks are the authoritative provider signal, but a webhook alone does not safely deliver tenant-specific updates to a browser. Incoming attachments also cannot be exposed directly from short-lived provider URLs or released before malware screening.

### Decision

Verify every Resend webhook with the configured Svix secret, deduplicate provider event IDs, translate useful events into `internal_notifications` addressed to explicit internal recipients, and deliver those records through Supabase Realtime with polling as a recovery path. Use the existing shared toast provider for visual alerts and a browser-generated, user-disableable chime after audio permission is unlocked.

For ordinary inbound attachments, copy provider files into a dedicated private Supabase bucket through the server. Enforce count and size limits, compute SHA-256, run the existing malware scanner boundary, and store server-only attachment metadata. Expose a file only through an authenticated route that rechecks internal mailbox access, scan status, storage metadata, and byte length. Keep invoice-intake attachments on the stricter document-ingestion path rather than merging both systems.

### Consequences

The browser receives only notifications for the signed-in operator, while provider payloads, private storage paths, and unsafe files stay server-side. Realtime normally feels immediate, and polling recovers missed socket events. Sound is a preference rather than a mandatory interruption. Attachments are unavailable until a scanner is configured and returns a clean result; this intentionally fails closed. Open and click alerts additionally depend on Resend domain tracking being enabled, not only webhook subscription.

## 2026-08-02 — Persist organization members as CRM contacts

### Context

The owner contacts list synthesized workspace members with IDs that were not stored in `crm_contacts`. Those rows could appear in the list but could not reliably open as contact records or retain CRM history.

### Decision

Create a durable `crm_contacts` row for each organization membership, linked to the member's `profiles.id`. A database trigger handles future memberships, and a backfill repairs existing memberships. Existing CRM contacts are matched by profile or organization/email before insertion to avoid duplicates.

### Consequences

Workspace members now have permanent contact IDs and can use the normal contact detail and activity flows. Membership remains authoritative for access; the CRM row is the durable relationship record. A member's profile email/name is captured at membership creation and future profile-sync behavior remains a separate decision.

## 2026-08-02 — Resolve composer recipients from existing CRM and staff records

### Context

The owner composer needs fast multi-recipient addressing without creating a second employee directory or making the user know exact email addresses. Contacts from the active customer account are usually the most relevant, but operators also need other CRM contacts, internal Costivra teammates, and valid outside addresses.

### Decision

Build one client-side suggestion list from the tenant-scoped contact data and the existing `internal_staff_users` profile relation already returned by the authenticated Manage repository. Rank contacts on the selected account first, then other contacts, then active Costivra staff. Store only normalized email addresses in the form and render names as removable presentation chips. Permit a syntactically valid address that is not yet in the CRM. The server remains authoritative for recipient validation, account matching, sending, and AI drafting context; when several To recipients exist, the first address supplies drafting context.

### Consequences

The flow is ready for future employees as soon as they are added through the existing staff membership path, with no duplicate table or browser write access. Multi-recipient sends work with the current mail API, while generated draft context intentionally follows only the first To recipient to avoid mixing unrelated customer records into one AI prompt.

## 2026-08-02 — Generate CRM-grounded email drafts server-side and append canonical signatures at send time

### Context

The owner composer needs to help an operator draft a real client email from a compact `/` prompt. That draft can benefit from a matched recipient, account details, vendor relationships, recent activities, and email conversations, but this information must not be exposed through a browser-wide data query or treated as model instructions. Operators also need one consistent signature that uses their profile details and a private profile image when available.

### Decision

Use a dedicated, authenticated server route to resolve the typed recipient and retrieve only its linked contact/account context. It bounds the number and length of vendor, activity, and message excerpts before sending them to the configured server-only AI adapter. The model returns a draft only; it cannot send, alter CRM records, or take other actions. Prompt instructions require short, plain-language 5th–8th grade writing and prohibit unsupported claims.

Store title, phone, and LinkedIn URL as optional fields on the existing profile record. The composer previews them locally, but the send route builds the canonical signature from the authenticated profile immediately before the operator clicks Send. A private avatar is attached to Resend as a CID image; the fallback is a circular initials glyph. Empty settings are omitted. The sent record includes the canonical signature, while the UI never receives a permanent public storage URL.

### Consequences

Draft quality improves when context exists without claiming information that is absent. The feature is tenant- and recipient-scoped, provides an audit event, and keeps the human Send action and side-effect ledger intact. It does add an AI-provider call for each requested draft; users must review every generated message before sending.

## 2026-08-01 — Load the PDF worker explicitly in server extraction

### Context

The first demo fixture import reached the document pipeline but `pdf-parse` tried to create a fake worker from a Turbopack-generated `.next` chunk that does not exist. That made every PDF look like an extraction failure even though the source text was readable.

### Decision

Load `pdfjs-dist/legacy/build/pdf.worker.mjs` into the Node process before creating `PDFParse`. The existing extraction and review policy remains unchanged: a worker or model failure produces `needs_review`, and no invoice is written until the validated structured result exists.

### Consequences

Local Next development and Node/Vercel execution use the same installed worker path and do not depend on browser fake-worker URL rewriting. The worker is still an implementation detail; OCR, schema validation, deterministic reconciliation, and human review remain separate safeguards.

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

## 2026-08-01 — Calculate opportunity and verified value outside the model

**Context:** Approved invoices can now become authoritative expenses, but the product still needed a traceable way to identify material price changes and later prove whether an approved action produced savings. A model-generated dollar amount is not sufficiently reproducible or auditable.

**Decision:** Use versioned, integer-cent domain functions for normalized period comparisons and annualization. Software and telecom price increases require the same tenant account, category, currency, and a 10% threshold. Energy variance may create a review case at 15%, but it deliberately receives no savings value without usage, rate, and weather evidence. Opportunity, action, baseline, comparison invoice, calculation inputs, result, and actor are persisted. Legal server-side state transitions require owners or administrators for consequential decisions, and a price action cannot start until its savings baseline is explicitly accepted.

**Consequences:** AI may extract and cite candidate facts, but it cannot calculate authoritative value, approve action, or mark savings verified. A later approved invoice can populate comparison evidence; a human must still verify the deterministic result. The first rule set is intentionally narrow and requires real customer fixtures before category or threshold expansion.

## 2026-08-01 — Use OpenRouter PDF parsing only as a scanned-document fallback

**Context:** Native PDF parsing is inexpensive and keeps text processing local, but image-only invoices contain no native text. Costivra already has a server-only OpenRouter boundary and cannot safely pretend such documents were extracted.

**Decision:** Attempt native extraction first. When and only when a PDF yields no meaningful text, submit the private base64 document through OpenRouter's PDF parser with Mistral OCR by default, then apply the same versioned schema, evidence, reconciliation, review, and prompt-injection boundaries. Keep the parser selectable through `OPENROUTER_PDF_ENGINE` for controlled evaluation.

**Consequences:** Scanned PDFs no longer require a second AI credential, and native PDFs do not incur OCR cost. Malware scanning remains a separate fail-closed boundary: an unscanned file is quarantined and must never reach this fallback. Real scanned invoice fixtures are still required to measure field and evidence accuracy before launch.

## 2026-08-01 — Make the repository release gate executable in CI

**Context:** Typechecking and isolated unit tests did not prove that the essential financial loop or responsive navigation worked together, and package vulnerabilities could reappear unnoticed.

**Decision:** Add a dedicated integration suite for the financial loop, Chromium browser tests for desktop/mobile public navigation and sign-in states, and a GitHub Actions workflow that runs install, typecheck, lint, unit, integration, build, and browser tests. Pin/override patched compatible versions of Playwright, PostCSS, and Sharp after validating the production build.

**Consequences:** A future change cannot reach the release branch unnoticed when these gates fail. Authenticated tenant isolation, upload, invoice review, and provider-webhook end-to-end tests remain required before general availability; the current browser suite is the first release slice, not a complete production certification.
## 2026-08-01 — Use field-scoped editing instead of generic record mutation

**Context:** Customer records need fast inline correction, but a generic table/column editor would let browser input reach protected financial, evidence, approval, or verification fields.

**Decision:** Detail pages use a server-owned allowlist for each resource and field. The API maps public field names to fixed database columns, validates values by field type, verifies membership and tenant ownership, limits mutation to owner/admin/member roles, checks `updated_at` when available, and records before/after hashes in the audit trail. Calculated opportunity value, source-document identity, reconciled invoice totals, workflow states, approvals, and verified savings remain read-only outside their dedicated workflows.

**Consequences:** Common descriptive and operational corrections are quick and consistent, while material financial claims cannot be rewritten through a convenient UI shortcut. Adding another editable field requires an explicit code review rather than becoming editable automatically.

## 2026-08-01 — Keep the owner assistant read-only and record-grounded

**Context:** Internal operators need an Elena-style assistant that can summarize live CRM work without becoming an unrestricted cross-tenant agent or silently taking action.

**Decision:** The Manage assistant uses one authenticated server route, a bounded record snapshot, allowlisted source links, and live suggestion counts derived from accounts, tasks, mail, and receiving webhook events. It may explain and prioritize existing records, but it cannot send email, invoke webhooks, alter records, approve work, or calculate authoritative savings. Questions remain session-local; safe request metadata is written to the internal audit ledger without storing raw prompts.

**Consequences:** Operators get useful, source-linked answers while human workflows remain the only path to external or financial side effects. Persistent assistant history and approved action tools require separate schemas, authorization, and explicit review before they can be added.
# Durable inbound email processing through a server-only database queue

**Date:** August 2, 2026

**Context:** The Resend webhook downloaded, scanned, stored, and extracted every attachment
inside the provider request. A normal multi-page invoice or temporary provider slowdown could
exceed the webhook's 60-second window, causing Resend to retry a partially completed operation.

**Decision:** Treat `inbound_email_events` as the durable job record. The signed webhook now
validates tenant routing and trusted senders, records the event, and returns `202`. A protected
Vercel Cron route atomically claims at most two jobs with `FOR UPDATE SKIP LOCKED`, processes
attachments idempotently, and schedules bounded retries. Stale locks can be reclaimed; five
failed attempts move the event to `dead_letter` and notify workspace owners.

**Alternatives considered:** Processing inline was operationally fragile. Exposing Supabase
Queues through the Data API would add another permission surface without improving this small,
already-audited intake ledger. A third-party workflow engine remains appropriate when Costivra
outgrows this bounded worker.

**Consequences:** Production must provide `CRON_SECRET` and a Vercel plan capable of a one-minute
cron. The queue remains server-only, retries are visible to customers, and document ingestion
continues to use the same malware, evidence, reconciliation, and human-review boundaries.

## 2026-08-02 — Use one protected record workspace and internal-only Apollo enrichment

### Context

Customer vendor pages and internal account/contact pages had developed separate visual systems.
Files were represented as short attachment lists, making it hard to find invoices, contracts,
and evidence without changing the immutable storage record. Lewis also requested concise
company context from Apollo, but Apollo's current API terms restrict exposing its data to
non-Apollo users without an appropriate agreement.

### Decision

Use one reusable record-file workspace across customer and internal records. It provides
metadata-only virtual collections (All files, Evidence, Invoices, Contracts, and Other files),
search, list/grid views, source context, and a protected inspector. It never
moves private objects or changes their SHA-256 provenance. Customer downloads remain
tenant-scoped; internal downloads use a separate authenticated route and append-only internal
audit event before creating a 60-second signed URL.

Align the App rail with the Manage rail's compact-on-idle and expand-on-hover/focus behavior,
while preserving the distinct navigation destinations. Make account and contact pages task-based
workspaces with a shared identity header, highlights, compact tabs, details rail, and responsive
one-column mobile layout.

Keep Apollo server-only and internal to `/manage`. An operator must explicitly request an
account-company refresh; the server derives only a public company domain from an
operator-stored website. It stores an allowlisted provider snapshot separately from authoritative
CRM fields, caches a fresh result for 30 days, uses a time-bounded atomic claim so two clicks
cannot spend duplicate credits, and invalidates the snapshot when the lookup website changes.
Provider links are normalized before storage and provider redirects are never followed. Individual
contact enrichment is not enabled: sending a person’s work email to Apollo requires a separate,
purpose-specific data-sharing consent and authorization feature. Apollo values never update
customer facts automatically and do not enter the customer `/app` until the required Apollo
data-sharing permission is in place.

### Consequences

Account, contact, vendor, and general record pages now share a legible evidence-first structure
without weakening storage provenance, tenant isolation, or mailbox attachment permissions.
The account Apollo table and its claim function are internal-only: RLS is enabled, browser roles
are explicitly denied, and service-role routes audit every refresh outcome without recording raw
responses, provider errors, credentials, or personal email. The reviewed migration must be
applied before deploying the enrichment route; the Manage read model remains gracefully usable
during that rollout gap.

## 2026-08-02 — Enforce customer approval counts in the database

### Context

Costivra stored approval policies and showed action decisions, but the policy rows were not yet
used by the action-creation transaction. A two-person rule therefore could not prove that two
different authorized people had decided, and customers could not manage the rule in the portal.
Expenses and contracts also lacked a first-class location link even though multi-location cost
tracking is part of the product promise.

### Decision

Treat approval policy configuration as a tenant-owned, audited control and action advancement as
a database invariant. When an opportunity becomes an action, select the strictest matching active
policy by action type, category, annual-value threshold, and minimum approver count. Assign pending
decisions to distinct owners or administrators. Record each decision independently and leave the
action pending until the required number of distinct approvals exists. Any assigned decline still
cancels the action. Bank and payment-detail changes remain outside the executable action set.

Link expenses and contracts to optional tenant locations with foreign keys and server-side
organization checks. Location removal is archival, and the nullable link uses `on delete set null`
as defense in depth so historical financial records are not cascaded away.

### Consequences

The portal settings now describe what the database will actually enforce. Rules that require more
approvers than the current team visibly tell the customer to add administrators and remain safely
blocked until they do. Approval history survives policy disablement. Bills and contracts can be
organized by operating site without weakening tenant isolation or turning location cleanup into a
destructive accounting operation.

## 2026-08-02 — Scope internal vendor intelligence to its account record

### Context

Internal operators need to understand a client account's vendor relationships, recorded expenses,
contracts, and linked evidence without exposing a cross-tenant vendor browser or duplicating the
customer portal's membership-based vendor route. The existing database already models this through
organization-scoped relationship, expense, contract, and document records.

### Decision

Load vendor data only when the Manage route is rendering a valid account ID, and filter the result
to the internal operator's visible organizations before returning it to the client component. The
account overview groups recorded expense rows by a user-selected weekly, monthly, or yearly period.
It deliberately excludes a different currency rather than presenting a combined total. Vendor
selection stays inside the account's Vendors tab, using the existing `CompanyLogo` vendor path and
the relationship ID to show contracts and source-document counts.

### Consequences

The internal account view gains a fast, evidence-connected vendor drill-in without a new public
route, schema change, or browser access to privileged vendor data. Chart values are recorded spend
only; annualized relationship values remain separately labelled and no view presents an estimated
or verified savings amount.
