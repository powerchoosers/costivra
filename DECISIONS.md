# Costivra Architecture and Product Decisions

## 2026-08-11 — Keep record identity and queue controls task-first

### Context

Signed-in review of the customer vendor workspace and Manage queues showed too many controls competing at the same level. A vendor status appeared detached from the vendor identity, direct review/contract/assistant actions formed a dense button row, and a seven-tile summary gave zero-value facts as much visual weight as spend. In Manage, Overview sat inside the Clients group and a second row of tabs repeated the first filter while pagination fell below the visible workspace.

### Decision

Put a vendor relationship state beside the vendor name in the persistent shell header. Keep **Ask Costivra** as the only direct record action and move secondary record work into the existing keyboard-aware overflow menu. Present spend and latest-bill information as the primary vendor summary, then show only operational counts that matter. For Manage queues, keep Overview independent of the Clients group; use one view switcher plus one clearly labelled compact status selector; and make the Accounts/Contacts table and inspector own scrolling while their surrounding page chrome and footer remain fixed.

### Consequences

The customer record is easier to scan and still exposes every permitted action without visual noise. Manage filters describe two distinct questions instead of pretending they are both the same tab set, and a user can retain pagination context while reviewing long tables. These choices change no records, calculations, routing, authorization, or workflow states.

## 2026-08-11 — Share operational view navigation and record-quality states

### Context

Customer work queues, vendor records, onboarding, and organization preferences still carried several incompatible inline visual patterns. The mobile Manage overview also hid its account table without rendering a usable replacement, so a person could lose the account list entirely on a phone.

### Decision

Use `WorkspaceViewTabs` as the shared labelled view switcher for customer queues, settings, and vendor records; it intentionally does not claim WAI-ARIA tab behavior that the routes do not implement. Give filter popovers explicit trigger relationships, Escape/focus-return behavior, and semantics that match their actual controls. Use one evidence-to-decision rhythm for Findings and Actions. Move activation, vendor value, data-completeness, vendor-health, and preference presentation onto semantic workspace classes. Render full account cards as the mobile counterpart to Manage’s dense desktop table, preserving direct access to each account.

### Consequences

The same active state, count treatment, focus ring, and compact operational hierarchy now appears across the most frequently switched customer views. Filter controls no longer make unsupported menu-navigation promises. Mobile Manage retains account identity, contact, stage, next step, consent status, and direct navigation instead of showing a blank table area. These changes do not alter records, calculations, permissions, routing, or workflow state.

## 2026-08-11 — Give shared record editing one workspace language

### Context

Customer and Manage record editing were built from the same behavioral primitives, but their presentation still leaked assistant-specific variables and dozens of inline styles. A bill action menu was separate again, which meant common actions behaved and looked slightly differently depending on where a person encountered them.

### Decision

Use semantic `workspace-record-*` classes for record sheets, dialogs, fields, menus, and form controls. Use the same tab and overflow-menu components for vendor, account, contact, and Bills workflows. Keep the data, authorization, save/discard, keyboard, and menu behavior intact; this decision changes presentation and interaction consistency only.

### Consequences

Dense record work now carries the same button hierarchy, focus state, motion, form rhythm, and overflow-menu behavior in both products. Future record routes can reuse the semantic classes instead of introducing page-specific visual rules.

## 2026-08-11 — Make the shared operational system decisive, not decorative

### Context

The customer application and internal Manage workspace already shared a late style layer, but their buttons, controls, panels, tables, menus, and assistant surfaces had accumulated different shapes, spacing, borders, and interaction states. That made two parts of one product feel less intentional than they should, especially in dense financial workflows where a person needs to spot the next action quickly.

### Decision

Strengthen the existing scoped `--workspace-*` design system instead of restyling pages one at a time. Use a single clear blue primary action, quiet outlined secondary actions, restrained destructive controls, consistent control geometry, neutral elevated panels, readable table rhythm, visible keyboard focus, and short explicit motion. The shared assistant inherits these same tokens. Mobbin research informs control hierarchy and density only; Costivra keeps its own evidence-first, calm visual language.

### Consequences

Both shells improve together without changing records, permissions, calculations, or workflows. Inline-heavy routes can be refined incrementally without splitting the system again. Authenticated desktop and mobile visual checks remain a release gate whenever the local browser environment can reach the app reliably.

## 2026-08-10 — Standardize the site on Phosphor icons

### Context

Lucide and Phosphor were being used together, which made the customer and internal navigation surfaces feel inconsistent and made future icon changes harder to control. Directly renaming every icon would also risk changing sizing and layout props across existing components.

### Decision

Use `@phosphor-icons/react` as the only icon package. Keep shared compatibility exports in `src/lib/icons.tsx` so existing Lucide-shaped props such as `size`, `className`, and `strokeWidth` continue to render consistently while the underlying glyphs come from Phosphor. Mark the adapter as a client boundary because Phosphor uses React context during module evaluation.

### Consequences

Customer, Manage, records, assistant, marketing, and shared UI components now use one icon family without changing their layout contracts. New icons should be added to the Phosphor-backed adapter or imported directly from Phosphor; do not reintroduce `lucide-react`.

## 2026-08-09 — Treat report timezones and empty-report behavior as server policy

### Context

Saving a timezone while calculating the next run in UTC creates a quiet but serious customer error. Sending empty recurring reports also creates noise and makes the report preference meaningless.

### Decision

Use one timezone-aware schedule calculator for portal creation, schedule resume, and cron advancement. Store report communication preferences separately from organization profile settings, default empty reports off, and let the worker mark disabled or empty runs as skipped while advancing the schedule.

### Consequences

The saved local time means the same thing in the portal and worker, including daylight-saving transitions handled by the platform timezone database. Delivery history distinguishes skipped runs from provider failures. Live proof is still required before calling scheduling production-ready.

## 2026-08-09 — Keep report scheduling tenant-scoped and recipient-authorized

### Context

Automated findings reports need durable schedules, idempotent delivery claims, and provider delivery reconciliation. A browser-submitted email list cannot be trusted as authorization.

### Decision

Store schedules and delivery runs in service-role-only tables. The portal API verifies that every recipient is an email address belonging to a member of the report's organization, creates a stable delivery idempotency key, and records the external side effect before calling Resend. Resend webhook events reconcile the side-effect and delivery-run state.

### Consequences

Reports can be retried without duplicate provider sends, and delivery history remains auditable. Time-zone calculation and customer-level report preferences remain follow-up work before broad self-serve rollout.

## 2026-08-09 — Sequence builder is draft-first and execution-disabled

### Context

Outreach needs a useful planning surface without introducing autonomous acquisition behavior before suppression, approval, mailbox ownership, and delivery proof are complete.

### Decision

Sequences, steps, enrollments, events, and suppressions are isolated in internal operator tables with server-side validation and tenant checks. The `/manage/outreach` workspace adds Tasks, Sequences, and Enrollments tabs; it can create drafts and stage pending enrollments, but activation and sending are disabled.

### Consequences

Operators can review timing, copy, stop controls, and eligible contacts in the existing Outreach workspace. A later execution packet must add explicit approvals, provider-side idempotency, reply/bounce/unsubscribe state transitions, and end-to-end proof before `execution_enabled` can become true.

## 2026-08-10 — Build linear outreach sequences as a chronological machine

### Context

The first sequence-builder redesign still split a simple, linear workflow across a timeline, an editor, and a persistent settings rail. That made an ordinary follow-up plan feel harder to scan and edit than it should. Operators also need to insert a real step between two existing steps, set its delay at that point, and reorder cards without a full-page reload.

### Decision

Use one centered vertical sequence machine: compact chronological cards, visible arrow connectors, a delay attached to the following step, and a small plus control that opens a type-and-delay popover. Opening a card exposes that card's email, call, or task editor in place; only one editor is expanded at a time. Keep sequence-wide delivery settings behind a compact disclosure and link the existing Mail queue rather than duplicating queue data.

Use `@dnd-kit` for pointer, touch, and keyboard-aware card ordering. The create-step route accepts a tenant-scoped `afterStepId` so an insert control represents a real database position rather than a visual-only control. Existing draft-only API checks, server validation, AI-draft review, and no-send safeguards remain authoritative.

### Consequences

The active builder no longer has a left timeline or persistent right rail. Adding, saving, and reordering steps updates local sequence state after a confirmed server response, so the operator keeps their place in the flow. There is no separate wait record or new queue table; existing step timing and Mail queue projections remain the system of record. The prior v2 builder is retained only as inactive archived source/Git history while the new flow settles.

## 2026-08-06 — Gate customer-facing finding claims on trust provenance

### Context

Manual and seeded opportunities can contain nonzero dollar values without a source document, evidence reference, rule version, or deterministic calculation. Displaying those values as ordinary findings makes a customer believe an uploaded bill produced a supported result. Energy tariff conclusions have the same risk when the assigned rate code and current official tariff are not available.

### Decision

Represent opportunity trust explicitly as `evidence_backed`, `needs_evidence`, `manual_note`, `demo_example`, or `deprecated`. Derive the state from persisted provenance, preserve owner-reviewed demo/deprecated states, and expose a customer-facing monetary claim only when the evidence and deterministic calculation gate passes. Persist tariff review as a fails-closed, neutral analysis until the official source and assigned-versus-eligible comparison are present. Mark the local seeded workspace as sample and provide an owner-only remediation path instead of silently deleting unsupported records.

### Consequences

Customer cards and detail views can say exactly why a finding is or is not supported, and unsupported amounts are omitted rather than rendered as `$0`. Owner operations must review legacy manual claims and choose a visible treatment. The trust migration must be applied before portal reads use the new columns, and future deterministic rules must populate source record, evidence, calculation, and evaluation metadata together.

## 2026-08-06 — Keep portal reads safe during forward trust migration rollout

### Context

The connected Supabase project may receive application code before the trust migration. A hard query predicate on the new `customer_visible` column caused the entire authenticated portal to fail with a schema error.

### Decision

Read opportunity rows through the existing tenant filter, enforce `customer_visible !== false` in application memory, and use a legacy-column fallback for the owner review queue. Mutations still fail closed with a migration-specific response until the new trust columns exist. Evidence attachment verifies document ownership through explicit tenant-scoped queries.

### Consequences

Existing customers retain portal access during a staged rollout, while unsupported findings remain conservatively unmonetized because trust derivation treats absent provenance as `needs_evidence` or `manual_note`. The migration remains mandatory before trust persistence, sample-workspace labeling, or owner remediation mutations can be used.

## 2026-08-06 — Resolve legacy document scan status from successful ingestion evidence

### Context

The connected Supabase project does not yet have the document scan-provenance columns from the forward migration. The breakdown endpoint previously selected those columns directly, so an otherwise valid legacy document could fail with a schema error or be confused with a document that was still scanning.

### Decision

The breakdown read path selects only stable document columns. If the scan snapshot is missing, a tenant-scoped successful ingestion audit event may establish the legacy document as clean. Processing documents remain pending, and documents without that event remain unavailable; the code never infers a clean scan from a ready status alone.

### Consequences

Legacy extracted bills can still reach the stored breakdown during staged rollout, while unsupported security claims fail closed. The scan-provenance migration is still required before new uploads can persist scan snapshots and before release QA can treat the security workflow as fully live.

## 2026-08-06 — Retry evidence reads across the source-key migration boundary

### Context

The connected project also predates the `evidence_references.source_key` migration. Selecting or ordering by that column caused an otherwise valid stored breakdown to return a database error even after the document scan-column issue was repaired.

### Decision

The breakdown endpoint first uses the source-key-aware evidence query. When the database explicitly reports a missing-column error, it retries with the stable evidence columns and maps the absent source key to unknown. It does not fabricate a source key or page number.

### Consequences

Legacy breakdowns remain readable during staged rollout, while migrated environments retain line-item source-key provenance. The evidence migration is still required before new intake records can persist the stronger source-key contract.

## 2026-08-06 — Restrict owner evidence attachment to linked source documents

### Context

The trust-review API could already link any evidence reference from the same workspace, but workspace membership alone does not show that the evidence supports a particular opportunity. The owner UI also had no way to choose the required evidence.

### Decision

Expose only evidence references from documents linked to the opportunity’s expense account, require an explicit owner selection, and enforce that same source-document boundary again in the server mutation. Deduplicate selected IDs and record the attachment in the opportunity link table plus the audit event.

### Consequences

Owners can remediate unsupported records without attaching unrelated tenant evidence. Opportunities without a linked source document remain in the queue for a deliberate demo, manual-note, hide, or deprecation decision rather than receiving arbitrary support.

## 2026-08-06 — Carry source keys through evidence persistence

### Context

Evidence references were stored without their extraction identity, and line-item classification persistence intentionally used empty evidence arrays. A broad line-item quote cannot safely be treated as proof for every charge, and a fixed evidence limit can hide source rows from a reviewer.

### Decision

Store an optional stable `source_key` with each evidence reference. Accept indexed line-item field paths and source-key matches, but never assign generic `invoice.lineItems` evidence to an individual line. Insert evidence first, map IDs by source key or exact line index, then persist line-item metadata and classification evidence IDs. Missing line-item evidence keeps the classification in review. Serve evidence in deterministic order with bounded page-sized results, and expose findings as evidence-backed only when stored reference IDs exist.

### Consequences

The breakdown can show a source page, quote, and page-fragment link for each classified line without claiming bounding-box precision. Older evidence remains unchanged and may retain unknown or legacy page values; reprocessing or operator relinking is required to repair it. The source-key migration must be applied before new intake writes these rows.

## 2026-08-06 — Separate account-history balances from current charges and identity matches

### Context

TXU statements can show a prior balance, payments, a balance forward, current charges, and a final amount due on the same document. Treating the prior payment as an invoice credit makes the record financially misleading. The uploaded bill can also name a customer and service address that do not belong to the current workspace, even when the vendor is correctly identified.

### Decision

Represent each balance concept as a separate validated candidate field and reconcile only source-backed values with integer minor-unit arithmetic. Add a typed energy-service structure and page-aware evidence. Resolve workspace customer, expense account, and service location independently; assign an account or location only when allowlisted evidence produces one unambiguous match. Keep identity outcomes and review codes separate from vendor matching.

### Consequences

Case A and Case B can both reconcile without inventing a subtotal or annual usage. A vendor match no longer implies that the bill belongs to the customer account or location. New invoice columns and the forward migration are required before deployment, and unresolved identity evidence remains visible as review rather than being silently attached.

## 2026-08-06 — Keep upload state local and completion effects parent-owned

### Context

The upload modal previously mixed visual progress, polling, refresh behavior, toasts, and inspector navigation. That made it possible to show completion before analysis was ready, refresh more than once, or open a document automatically without a customer choosing to inspect it.

### Decision

Use an explicit upload state machine for file selection, submission, security outcomes, duplicate detection, processing, and errors. The modal owns attachment presentation and honest progress; the parent owns modal closure, the single post-close refresh, and the one outcome toast. Treat `analysisReady: true` as the only ready signal. All other successful outcomes remain explicit actions, and the inspector opens only from a customer-clicked toast action.

### Consequences

The UI can explain what is happening without inventing a percentage or claiming analysis is finished. Duplicate, quarantine, rejection, and processing outcomes remain distinguishable and auditable. A later change to completion behavior must update the typed result contract and parent orchestration rather than adding another side effect inside the attachment component.

## 2026-08-06 — Preserve provider phones when enabling account phone edits

### Context

The account detail rail needs an operator-editable phone field, but the displayed value may come from Apollo enrichment. Writing an edit directly over that enrichment would destroy provider provenance and make later refresh behavior ambiguous.

### Decision

Add a nullable `crm_account_profiles.phone` operator override and resolve the UI value as the operator phone when present, otherwise the enrichment phone. Route the edit through the existing tenant-scoped atomic account mutation and keep the provider snapshot separate.

### Consequences

Operators can correct or clear the phone shown in the CRM without erasing the Apollo source value. The forward migration must be applied before deploying the phone-edit path, and any future enrichment sync must define an explicit policy for whether an operator override remains authoritative.

## 2026-08-06 — Make bill breakdowns read-only and security provenance server-owned

### Context

The bill breakdown route was masking database schema failures as document access failures, recomputing category analysis on every GET, and deriving scan status from a loose audit-event convention. The live `documents` table stores `sha256` and did not yet store a durable scan snapshot or append-only scan attempts.

### Decision

Use a forward migration to add explicit document scan snapshot fields, align the document status enum with the existing ingestion states, and add a server-only `document_security_scan_attempts` ledger. A database trigger projects each server-recorded attempt into the document snapshot. The breakdown GET reads the stored invoice analysis, line-item classifications, and evidence in deterministic order; it never creates new analytical records. Invalid IDs, missing tenant-scoped records, processing documents, analysis gaps, and database failures use separate response contracts.

### Consequences

Opening a breakdown is now read-only and repeatable, and customers can distinguish “still processing” from “not found” or an operational failure. Scan attempts retain only safe structured metadata and cannot be written by browser roles. A migration must be applied before deploying the route that selects the new snapshot columns; existing clean audit events are backfilled without inventing results for documents with no clean provenance.

## 2026-08-06 — Make lifecycle changes repeat-safe and audit them atomically

### Context

Archive, deactivate, terminate, and restore actions can be retried by a user or the network. Repeating an unchanged request must not manufacture additional history, and a vendor termination must not leave a monitoring pause without its corresponding evidence record.

### Decision

Use server-only database functions for lifecycle mutations. They lock the record, return safely without writing when the target lifecycle state is already present, and write the material audit event in the same transaction as the state change. Vendor termination pauses monitoring in that same transaction; reactivation deliberately does not resume monitoring.

### Consequences

The UI can safely retry a request after an interrupted response without creating duplicate CRM activities or audit entries. Lifecycle history remains evidence of an actual transition, while a separate explicit monitoring action is required to resume monitoring after a vendor is reactivated.

## 2026-08-06 — Keep category evaluation evidence private and honest about coverage

### Context

Packet 10 requires repeatable release evidence, while current Category Intelligence fixtures prove deterministic rules but are not a representative set of real customer documents. Publishing run data to the browser would also create an unnecessary operational-data surface.

### Decision

Provide separate, repeatable category, line-item, benchmark, and market-research evaluation commands. Persist only their aggregate outputs in a server-only, RLS-protected ledger: suite/version, case count, pass/fail, metrics, thresholds, pack versions, and registry hash. Every result records its data classification and coverage level. The current suite is explicitly `synthetic` and `structural`; it cannot promote a pack or support a verified claim.

### Consequences

The team can compare future runs and detect contract regressions without retaining prompts, customer records, or source documents. Before a category can advance beyond draft, Costivra still needs the Packet 10 representative, de-identified or consented corpus, source-refresh proof, and documented human review.

## 2026-08-05 — Keep category market research cited, bounded, and draft-only

### Context

Costivra needs changing market context without allowing public search to receive customer data or allowing a model to invent a market comparison. Category packs also need useful industry-specific structure without being treated as verified professional advice.

### Decision

Route category research through a server-only adapter that first strips common identifiers, accepts only public-safe category/jurisdiction/vendor descriptors, and returns facts only when they cite an allowlisted registry source. Cache results using a hash of those public-safe dimensions and an expiry; never cache customer documents, account identifiers, service addresses, private usage, or financial amounts. Keep every category pack in `draft` until source freshness, evaluation thresholds, and human review required by Packet 10 are proven. Benchmark code returns `unsupported`, `insufficient_data`, or `quote_required` rather than creating a price range, savings figure, or verified claim from an invoice.

### Consequences

The product can explain supported bill structure and source-backed current context while safely asking for a quote or professional review where evidence is incomplete. A deployment still requires the reviewed research-cache migration, live-source verification, authenticated end-to-end testing, and the Packet 10 release gates before any pack can be promoted to verified.

## 2026-08-04 — Durable vendor monitoring storage, state machine, and lifecycle email triggers

### Context

Prior monitoring status was stored as loose transient metadata on `organization_vendors`. When an inbound bill was forwarded, there was no dedicated table tracking approved sender addresses, test events, cadence boundaries, or grace periods across vendor relationships.

### Decision

1. **Durable Storage (`vendor_monitoring_configs`)**: Store per-vendor monitoring rules in a dedicated relational table with explicit foreign keys to `organization_vendors`, `organizations`, `inbound_email_addresses`, and `inbound_email_events`.
2. **State Machine (`not_configured` -> `pending_test` -> `active` -> `attention_needed` | `paused`)**:
   - `not_configured`: Default state before forwarding rules are configured.
   - `pending_test`: Configured with an approved sender; awaits initial test bill forwarding.
   - `active`: Test bill received and verified; continuously monitors recurring bills on expected cadence.
   - `attention_needed`: Triggered when an expected bill is missed beyond the grace period.
   - `paused`: Explicit human pause rule.
3. **Transactional Lifecycle Email Triggers (`src/lib/email/lifecycle.ts`)**: Implement 9 transactional email triggers with SHA-256 idempotency key deduplication in `external_side_effects` to prevent duplicate customer emails during automated retries.

### Consequences

Monitoring states persist across sessions and database restarts with strict Row Level Security. Intake processing automatically activates monitoring upon verified bill forwarding.

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

## 2026-08-03 — Keep record updates server-authorized and soft-revalidated

### Context

Manage account and contact records are loaded through an internal operator boundary. The browser
should reflect edits quickly, but exposing privileged CRM tables directly to a Realtime subscription
would require a new RLS and Data API surface.

### Decision

Use the existing mutation APIs and `router.refresh()` after a successful save. In Next.js this is a
soft Server Component data re-fetch that preserves the current route and client state; it is not a
full browser reload. Keep the manual Apollo refresh/list controls out of the record header. If true
cross-session push updates become necessary, emit a narrow internal notification and reuse the
existing authorized notification listener before considering direct table subscriptions.

### Consequences

Edits update the visible record without a disruptive page reload, while service-role access and
tenant isolation stay on the server. The implementation avoids Realtime subscription cost and
permission expansion until there is a concrete cross-session update requirement.

## 2026-08-03 — Use Apollo as an operator-selected account discovery source

### Context

Operators need a faster, less error-prone way to add a company than manually copying a name and
website. Apollo can return a candidate organization, logo, industry, location, employee count,
founded year, LinkedIn URL, and technology signals. Provider data is still untrusted and may be
incomplete or stale.

### Decision

Add an internal-only, explicitly submitted company search by name or domain. Show candidates in a reviewable
list and let the operator select one; never silently create an account or overwrite manually
entered fields. Store the normalized selected snapshot in the restricted Apollo enrichment ledger,
and use an Apollo logo only after it passes the existing public-HTTPS and host allowlists. Keep
the canonical account name, industry, and website operator-controlled.

### Consequences

Account creation is faster while preserving a human confirmation step and tenant boundaries.
Technology signals remain internal context rather than authoritative facts. Apollo search requires
an API key with the provider's organization-search scope; if that scope is missing, manual entry
continues to work and the UI reports that search is unavailable.

## 2026-08-03 — Keep Apollo detail useful without a data dump

### Context

Apollo can return many company signals, but account operators need identity and contact paths first. Showing every provider field at equal visual weight would make the record harder to scan and make missing values look like broken UI.

### Decision

Use a two-level presentation: location, website, phone, and LinkedIn are conditional quick-access metadata in the account header; the rail repeats the website and phone; remaining captured Apollo fields live in a labelled internal profile block. Technologies are collapsed after the first eight and can be expanded on demand. Keep the provider snapshot separate from operator-maintained account fields, including the company phone.

Use a right-side drawer for account/contact creation so the operator retains context while entering data. Preserve focus management, keyboard dismissal, backdrop dismissal, and reduced-motion behavior.

### Consequences

The account page remains glanceable while exposing the full set of fields this integration currently captures. Future Apollo fields can be added to the profile block without changing the header hierarchy. The test account `Apollo QA - HubSpot Profile` provides a real enriched fixture for visual QA without changing a customer record.

## 2026-08-03 — Keep enrichment provider usage owner-only and server-derived

### Context

Costivra operators need to understand whether company enrichment is available and how many Apollo
lead credits remain. Apollo credentials and quota details are operational controls, and the Settings
surface should be able to add other enrichment providers later without mixing provider data into
general profile settings.

### Decision

Add a dedicated Enrichment tab to Manage Settings and place Apollo inside a provider section. Read
Apollo's current credit balance through the documented, zero-credit profile endpoint on the server,
normalize only the lead-credit allowance used by Costivra's current company workflows, and return it
through an owner-only, private/no-store route. Never return the API key or Apollo profile identity.
Derive workspace usage from allowance minus remaining balance because Apollo can report an individual
key owner's usage alongside the team's remaining credits.

### Consequences

Owners get a coherent live balance and transparent per-action credit costs without exposing secrets or
cluttering the page with unrelated Apollo quotas. Additional providers can be added as sibling sections
inside Enrichment later. Non-owner operators cannot read this billing-sensitive usage endpoint.

## 2026-08-03 — Treat server-side domain enrichment as the durable account snapshot

### Context

Apollo's mixed-company search can return the same response in several arrays and its account candidates are intentionally partial. Relying on the browser-selected JSON allowed a partial search result to become a permanently partial CRM enrichment record. It also made provider data supplied by the browser more authoritative than it should be.

### Decision

Use direct organization enrichment for an exact public domain and hydrate name-search candidates through their normalized website before showing them as ready. At account creation, resolve that public website again on the server and persist the server-normalized snapshot. Keep manual account fields canonical, keep manual creation available when Apollo is unavailable, and retain the existing restricted internal enrichment table and audit boundary.

### Consequences

Adding a known company costs one additional bounded provider read at save time, but incomplete candidate records and browser-tampered provider details no longer determine the durable snapshot. Search remains operator-reviewed, exact websites produce complete previews, and provider failure does not block a legitimate manual CRM account.

## 2026-08-03 — Keep PDF.js a direct application dependency

### Context

The Vercel production build began failing after an accidental pnpm lock/workspace addition. The
PDF viewer and server text extractor import `pdfjs-dist` directly, while the package had only been
present as a transitive dependency of `pdf-parse` and `react-pdf`. pnpm's stricter dependency
resolution exposed that undeclared import.

### Decision

Restore the repository's existing npm deployment path by removing the accidental pnpm metadata and
declare the exact PDF.js version used by both PDF consumers directly in `package.json` and
`package-lock.json`.

### Consequences

Vercel returns to the previously working npm install path, and future package-manager changes cannot
silently break the direct PDF.js imports through dependency hoisting differences.
## 2026-08-03 — Use a context rail for account and contact relationships

### Context

Account and contact detail pages had important relationship context below the fold or in a separate People tab. Operators need the primary contact, direct outreach actions, account hierarchy, and operating locations while reviewing the main record.

### Decision

Use a right-side, independently scrollable context rail on overview pages. Keep vendors, files, activity, and work as focused tabs, but keep people, account hierarchy, and locations visible beside the main overview. Locations come from the tenant-scoped `locations` table; map previews use a lightweight, external map search link so Costivra does not add a paid map SDK or expose a location API key.

### Consequences

The main record stays calm and scannable while relationship actions remain close at hand. Parent-company links are stored as an explicit self-reference on organizations, with server validation against self-parenting and unknown accounts. The client workspace continues to manage locations in Settings, which is the correct permission boundary for adding and archiving sites.
## 2026-08-04 — Isolate inbound email HTML in a sandboxed viewer

### Context

The Manage mail reader displayed only the plain-text fallback even when the mailbox had retained a complete HTML message. Rendering that markup directly in the CRM would let untrusted email styles affect the operator workspace and could enable tracking or executable behavior.

### Decision

Render each message in an iframe using `srcDoc`, a restrictive Content Security Policy, and a sandbox without script permission. The viewer preserves the email's own layout while preventing it from accessing or changing the parent application. External images are blocked by default and require an explicit per-message operator action; every link opens in a new tab without a referrer.

### Consequences

Operators can read real HTML emails, including conventional table-based designs, while normal tracking pixels are not contacted on open. The iframe is intentionally scrollable rather than dynamically measuring its document height, avoiding a broader same-origin interaction surface and keeping long emails usable.
# 2026-08-07 — Desktop application shells use a persistent sidebar and one work canvas

## Context

Both authenticated Costivra areas evolved into a narrow hover-expanded rail,
a separate top bar, and a route surface directly on the application
background. That makes navigation unstable and leaves the page composition
less calm than the intended finance-product experience.

## Decision

At supported desktop widths, `/app` and `/manage` will use a persistent light
sidebar and one rounded white work canvas. The sidebar is the only normal
surface outside that canvas. The existing header controls and all normal route
content live inside the canvas. Drawers, dialogs, menus, toasts, and assistant
surfaces remain overlays above it.

The customer and Manage shells share this structural rule but keep their
separate components and density: Manage stays denser for internal operations.
At compact widths navigation remains an explicit rail or drawer; hover is not
required for access.

## Alternatives considered

- Keep the hover-expanded rails: rejected because labels are hidden by
  default, keyboard navigation changes the page geometry, and the content
  still sits outside a stable work surface.
- Build one new generic shell component for both applications immediately:
  rejected because the existing customer and Manage workflows have different
  headers, assistant behavior, and viewport-dependent workspaces. A shared
  visual contract with focused per-shell changes is safer.
- Add a rounded card around each route: rejected because it would create
  nested page containers and fail the requirement that the whole normal
  workspace is inside one canvas.

## Consequences

- CSS height calculations tied to the current 72px or 64px top bars must be
  revisited route by route.
- Search, create, profile, notification, dialog, composer, and assistant
  overlays must be checked for clipping and stacking order.
- The implementation proceeds in customer-first chunks before the denser
  Manage shell is changed.
# 2026-08-07 — Customer shell owns route identity

## Context

The customer application repeated large route titles inside each page body,
while the shared top bar only held global actions. That consumed the first
viewport and made `/app`, `/app/bills`, and detail pages feel like separate
layouts.

## Decision

The shared customer top bar now owns the current route title and short context
line. It also provides the manual sidebar expand/collapse control separated by
a divider. Page bodies retain only data, tabs, breadcrumbs, and route-specific
actions. Vendor detail identity uses the real vendor logo in the shared header.

## Consequences

- Route identity is consistent across customer pages and detail routes.
- The main work area starts closer to the user’s data without hiding actions.
- The sidebar can be manually collapsed into a compact rail; it never expands
  on hover.
- Mobile keeps a compact route title and hides the desktop rail control.
# 2026-08-08 — One audited outbound-email service for manual and sequence mail

## Context

The manual Manage mail route contained provider sending, idempotency, side-effect
ledger writes, CRM message/thread persistence, activities, and audit events in
one HTTP handler. Sequence execution must not create a second, weaker send path.

## Decision

Move the provider mutation and durable outbound-record workflow into the
server-only `src/lib/manage/outbound-email.ts` service. The manual route keeps
authentication, contact/mailbox lookup, form validation, draft handling, and
signature preparation, then calls this service. Sequence workers will call the
same service with `origin: "sequence"` and sequence linkage fields.

The service records the side effect before contacting Resend, passes a stable
idempotency key, stores provider acceptance, persists CRM linkage, and records
the activity and audit event. A reused key with different content or an active
send is rejected rather than risking a duplicate external email.

## Consequences

Manual and sequence mail now share one safety boundary. Sequence execution is
still disabled until its claim, suppression, approval, and recovery controls
are implemented. The service deliberately accepts already-authorized recipients;
route/worker callers remain responsible for tenant and mailbox authorization.

# 2026-08-08 — Sequence timing is deterministic and timezone-aware

## Context

Sequence delays must remain predictable across business days, local send
windows, recipient timezones, and daylight-saving transitions. An LLM is not a
safe scheduler for external communication.

## Decision

Implement pure helpers in `src/lib/manage/sequences/schedule.ts` for minute,
hour, calendar-day, and business-day delays; local send-window movement;
recipient-timezone fallback; and next-action calculation. All conversion uses
IANA timezone rules through `Intl.DateTimeFormat`, with explicit validation and
tests covering DST and weekend boundaries.

## Consequences

Workers can calculate due times without model calls or browser state. Invalid
windows, timezones, and business-day lists fail closed. A recipient timezone is
used only when valid; otherwise the sequence timezone is used.
# 2026-08-08 — Claim sequence work atomically and keep the worker fail-closed

## Context

Vercel cron can overlap or retry. A due enrollment must not be executed by two
workers, and a dead worker must not hold work forever. The send path is not yet
ready to activate, so adding a cron route must not accidentally send mail.

## Decision

Add service-role-only database functions that claim a bounded, predictably
ordered due batch with a per-batch lock token and stale-lock recovery. Add a
protected `/api/cron/outreach-sequences` route and cron schedule, but require
`COSTIVRA_SEQUENCE_EXECUTION_ENABLED=true` before claiming. The current route
releases any claims and returns a 503 until the provider-send and stop-rule
implementation is complete.

## Consequences

Concurrent workers have a database ownership boundary rather than an
application-only check. No sequence can send merely because the cron schedule
exists. The migration must be applied and verified against the Costivra
Supabase project before the worker is considered deployable.
# 2026-08-08 — Sequence execution advances only after durable provider/task state

## Context

Sequence execution has two different kinds of side effect: an external email
accepted by Resend, or an operator task completed in Costivra. Advancing before
either durable fact exists can skip work or send duplicate follow-ups after a
worker retry.

## Decision

The sequence worker re-checks the tenant, contact, mailbox, suppression, and
sequence state after claiming work. Automatic email steps call the shared
outbound service with a sequence-scoped idempotency key and advance only after
provider acceptance plus local message persistence. A retry first checks for an
already-persisted message for that enrollment/step. Manual email, call, and
general-task steps create sequence-linked CRM tasks and wait; call/general tasks
advance only when an operator completes them. Email tasks cannot be marked
complete without sending through the composer.

Inbound replies and signed Resend bounce/complaint/suppression events stop open
enrollments, create suppression records where appropriate, and append durable
sequence events.

## Consequences

The worker is retryable and fails closed on missing contact, mailbox, step, or
template data. Provider acceptance is still not treated as delivery; Resend
webhooks remain the delivery truth. The SQL claim migration and a real
test-mode end-to-end run are required before enabling the feature flag.
# 2026-08-08 — Keep sequence mail inside the existing Mail workspace

## Context

Operators need to see scheduled and provider-reconciled sequence messages,
but a separate sequence inbox would split the source-of-truth mailbox and add
another navigation surface.

## Decision

Add `view=sequence` to `/manage/mail` and load a dedicated paginated API that
returns only sequence-origin messages plus their enrollment and provider
context. Reuse the existing thread reader through links back to the normal Mail
route. Expose only pause and stop enrollment actions from the list; provider
cancellation is not implied when Resend has already accepted a scheduled send.

## Consequences

All mail remains the authoritative conversation view, while Sequence emails
provides operational filtering and metrics without loading every sequence event
into the main Manage payload. Authenticated browser QA and live provider-state
proof remain release gates.

# 2026-08-08 — Use Stripe Checkout plus webhook-projected entitlements

## Context

Costivra now has a dedicated Stripe test account, but billing state must not be inferred from a browser redirect or kept only in Stripe. The application needs an auditable tenant projection and a safe recovery path when webhook delivery is retried or arrives out of order.

## Decision

Use Stripe Billing recurring Prices with Checkout Sessions in subscription mode and the Stripe Customer Portal. Keep plan keys stable (`starter`, `growth`, `enterprise`) and pass Price IDs through server-only environment variables. Verify the raw webhook signature, persist each event ID before processing, project subscription status into tenant billing tables, and grant the minimal `paid_workspace` entitlement only for active or trialing subscriptions. Enterprise stays out of self-serve checkout until its commercial terms are approved.

## Consequences

Checkout is useful only when the server has a configured Costivra Price ID; missing configuration fails closed. A successful redirect does not grant access. Webhook retries can repair a failed projection, and payment failures remove the paid entitlement without storing payment method data. Test-mode Stripe objects and webhook configuration remain a Lewis-controlled release step.

# 2026-08-08 — Enforce sequence daily caps before provider send

## Context

The sequence schema already carries a per-sequence `daily_send_limit`, but a worker that ignored it could flood a mailbox during a retry or cron overlap.

## Decision

Count already accepted sequence messages for the bounded UTC day before an automatic email send. If the cap is reached, release the claim, preserve the current step, and schedule the next permitted send window. A retry with a persisted provider message is reconciled first so it advances instead of being stranded by the cap.

## Consequences

The first worker slice is conservative across regions and may defer a message slightly around local midnight, but it cannot exceed the configured cap. The partial index keeps the count query bounded as the mailbox grows.

# 2026-08-09 — Send lifecycle email from durable state transitions

## Context

The shared lifecycle email renderer and idempotent side-effect ledger existed, but most production transitions did not call it. A catalog without triggers would leave customers unaware of uploads, monitoring setup, findings, or missed bills.

## Decision

Resolve current owner/admin membership at send time through one recipient helper and call the existing lifecycle sender after durable transitions. Email failures are logged and do not roll back the financial or document workflow. Monitoring misses atomically move to `attention_needed` and clear `next_expected_at`, so the same cycle cannot send repeatedly; a later accepted bill can restore active monitoring through the existing intake reconciliation.

## Consequences

Lifecycle messages remain branded, source-linked, and idempotent without creating a parallel email system. Welcome activation is sent once per user metadata marker, while workspace notifications are scoped to current authorized members. Remaining lifecycle states that depend on approval-assignment internals still require a dedicated trigger at their database workflow boundary.

# 2026-08-09 — Verification email follows the verified state transition

## Context

The value engine creates a `ready_for_review` savings outcome when a later invoice is attached. That state is not verified value and must not trigger a message that sounds like verification is complete.

## Decision

Send `verification_ready` only from the authenticated savings operation route after the authoritative workflow RPC returns `verified`. The comparison stage remains silent until an owner or administrator completes the verification action.

## Consequences

Customer email language and the savings state machine now agree. A workflow RPC failure cannot create a false verification notification; an email-provider failure is logged and can be retried idempotently.

# 2026-08-09 — Retry failed report delivery runs without replaying accepted recipients

## Context

A cron invocation can fail after one report recipient has already been accepted. A unique delivery-run claim prevents duplicate periods, but without a failed-run reclaim path the remaining recipients would never be retried.

## Decision

Reclaim only a delivery run whose status is `failed`, and skip existing side effects already marked `accepted`, `sent`, or `delivered` before sending. Concurrent claims and completed runs remain untouched.

## Consequences

Transient report failures can recover on a later cron invocation without replaying accepted provider sends. The run ledger remains the source of truth for each schedule period.

# 2026-08-09 — Finding alerts require evidence-backed trust

## Context

The deterministic value engine could create an opportunity before evidence references were linked. Sending a customer alert at that point would make a potential issue look customer-ready even when the source evidence was missing or an operator had hidden/sample-labeled the record.

## Decision

Link source evidence first, promote only ordinary deterministic findings from `needs_evidence` to `evidence_backed`, and send `finding_ready` only when evidence exists, the record is customer-visible, and it is not labeled manual, sample, or deprecated.

## Consequences

Customers receive finding alerts only for source-linked records. Operator trust labels and hidden records remain authoritative, and missing evidence produces no outbound message.

# 2026-08-09 — Delivery history stays inside the Reports surface

## Context

The report worker and schedule controls existed, but customers could see only the next scheduled time. That was not enough to distinguish an accepted delivery, a provider failure, or a skipped run.

## Decision

Expose a tenant-scoped read API for the latest report delivery runs and render it below the existing Reports controls. Do not add a new navigation page or allow customer edits to delivery history.

## Consequences

Customers can verify report outcomes without inspecting provider dashboards, while organization filtering and the existing server authorization boundary remain the source of access control.

# 2026-08-09 — Billing UI fails closed until test configuration exists

## Context

Stripe Checkout can be implemented in the application before the Costivra test Price IDs and billing tables exist. Showing an active checkout button in that state creates a confusing failure and makes an incomplete pilot setup look ready.

## Decision

Have the billing status route return only non-secret readiness facts: database readiness, Stripe server-key presence, and per-plan Price configuration. Disable the Settings checkout button until the selected plan is configured.

## Consequences

Lewis can add test Prices and see the UI become ready without code changes, while missing provider or database setup remains explicit and no checkout request is attempted prematurely.

# 2026-08-09 — Activation progress counts durable evidence, not upload rows

## Context

The activation checklist previously treated any document row as progress, treated an empty review queue as a completed review, and counted a pending monitoring test as active. Those signals could make an incomplete workspace appear activated.

## Decision

Compute activation progress from clean, supported, durably stored documents; an approved invoice or documented active contract linked to that evidence; and monitoring states that are either truly active or explicitly manual. Pending, quarantined, rejected, failed, and processing states do not complete a step.

## Consequences

The checklist is conservative and resumable. Customers see the next real action instead of a false completion state, and the same pure progress rules can be reused by future onboarding APIs.

# 2026-08-09 — Persist onboarding progress without replacing authoritative records

## Context

The activation checklist was truthful but page-derived. A refresh or a blocked pilot handoff had no durable state, and manually treating a checklist as complete would weaken the evidence rules.

## Decision

Store a tenant-scoped onboarding projection with explicit status, current step, completion timestamps, and an operator-entered blocked reason. The server sync endpoint derives it only from the same clean-document, authoritative-review, and real-monitoring rules as the checklist. Only owners/admins may block or resume it, and activation cannot be manually set.

## Consequences

Onboarding can resume across sessions and can show a real blocked state, while documents, reviews, and monitoring records remain the source of truth for whether activation is actually earned.

# 2026-08-09 — Readiness pages never spend scanner quota

## Context

The private Manage readiness endpoint was invoking a live clean-file malware probe on every dashboard read. That could consume provider quota and was not an appropriate side effect for a normal GET request.

## Decision

`checkSystemReadiness` now requires an explicit `runLiveMalwareProbe: true` option for a provider probe. Public status and private dashboard reads use persisted/configuration readiness only; the dedicated operational verifier remains the explicit probe path.

## Consequences

Opening a status page is now read-only with respect to the malware provider. Operators still receive an honest warning until the separately run clean and inert-file exercises establish live proof.

# 2026-08-09 — Monitoring tests require an exact approved sender

## Context

The inbound monitoring reconciler treated every successfully processed message as a valid pending test. That allowed unrelated inbound mail to activate a vendor's monitoring configuration.

## Decision

Normalize display-name addresses and require an exact match between the inbound sender and the configured approved forwarding address before advancing a pending test or recurring monitoring cycle. Missing approval never authorizes activation.

## Consequences

A real approved forwarding test still activates monitoring after clean processing, while unrelated or spoofed mail remains in the normal intake record without changing monitoring state.

# 2026-08-09 — External email effects use an insert-winner claim

## Context

A read-then-upsert pattern is not enough to prevent duplicate provider calls: two workers can both observe no completed effect and then both send the same email before either write is visible.

## Decision

Lifecycle and report email sends claim the unique idempotency key with an insert. Only the insert winner may call Resend. Failed rows can be reclaimed with a compare-and-set update; an approved in-flight row is treated as already owned by another worker.

## Consequences

Concurrent lifecycle/report triggers now fail closed against duplicate sends while preserving safe retries after a provider rejection. An ambiguous in-flight send remains visible for operator reconciliation instead of being retried blindly.

# 2026-08-09 — Normalize scheduled report recipients before delivery

## Context

Recipient arrays come from editable schedule records and may contain case differences, blanks, or repeated addresses. Filtering only at send time can overstate recipient counts and makes delivery history harder to interpret.

## Decision

Normalize and deduplicate recipient addresses before schedule creation and again at cron delivery, then intersect them with current workspace membership. Any unauthorized requested address still blocks schedule creation.

## Consequences

Each authorized address is delivered at most once per scheduled report period, and a stale or malformed schedule cannot expand delivery outside the current organization.

# 2026-08-09 — Email-forwarding monitoring requires a configured sender

## Context

An email-forwarding monitor cannot safely complete its test without knowing which sender is authorized. Allowing an empty sender would create a configuration that can never activate, or tempt a later fallback to accept unrelated mail.

## Decision

The monitoring API and persistence helper require a valid approved email address whenever the source method is `email_forwarding`. Manual forwarding and manual upload remain available without that sender constraint.

## Consequences

The setup flow fails early with a plain-language error instead of creating a permanently pending monitor. Exact sender matching remains the only path that activates recurring monitoring.

# 2026-08-09 — Enforce sequence enrollment consistency in the database

## Context

The sequence APIs already checked that contacts belonged to the sequence organization, but a service-role worker or repair script could bypass the API and create a cross-organization enrollment or attach a step from another sequence.

## Decision

Add a trigger-backed database guard for sequence organization, contact organization, current-step ownership, and active send-capable mailbox state. The server APIs remain responsible for user authorization and suppression checks.

## Consequences

Direct internal writes fail closed at the database boundary instead of relying only on application callers. Manual mail and customer tables remain outside the sequence write path.

# 2026-08-09 — Keep mailboxes global, enforce personal assignment for sequences

## Context

`crm_mailboxes` is a server-only Costivra operator allowlist. It deliberately has no organization column: shared senders can serve multiple customer organizations, while personal senders are assigned to an internal operator. Adding a tenant foreign key would change that established mailbox model without improving the shared-sender case.

## Decision

Keep shared mailboxes global. Make sequence enrollment use the existing rule consistently: the sender must be active and send-capable; shared mailboxes are allowed, and personal mailboxes must be assigned to the enrolling operator. Enforce this in the API and in the enrollment trigger so direct service-role writes cannot bypass it.

## Consequences

The API and database now agree on personal-mailbox ownership. Shared mailboxes remain reusable across organizations by design. Owner/operator mailbox administration outside sequences is unchanged.

# 2026-08-09 — Recheck sequence mailbox ownership immediately before send

## Context

An enrollment can remain pending while an operator disables or reassigns its mailbox. Validating only when the enrollment is created would allow a later worker run to send from a mailbox that is no longer available to the enrolling operator.

## Decision

The sequence worker reuses the same active/send-capable/shared-or-assigned policy immediately before processing an email step. A changed mailbox fails the enrollment instead of sending.

## Consequences

Mailbox changes take effect for future sends without requiring a bulk enrollment rewrite. Existing rows are protected by the worker’s runtime check as well as the enrollment trigger.

# 2026-08-09 — Match Stripe webhook mode to the configured key

## Context

Checking only the live-mode feature flag does not prove that an incoming Stripe event belongs to the same account mode as the configured secret. A test event must not be projected through a live-key deployment, and a live event must remain disabled until explicitly approved.

## Decision

Require a recognized `sk_`/`rk_` test or live key, match webhook `event.livemode` to that key mode, and keep live keys blocked unless `STRIPE_BILLING_LIVEMODE_ENABLED=1`. Checkout and Customer Portal use the same guard before provider calls.

## Consequences

Misconfigured Stripe environments fail closed with no billing projection or portal session. Test-mode Costivra setup remains the default until the explicit live launch gate is approved.

# 2026-08-09 — Make sequence activation one database transition

## Context

Activating a sequence and then updating pending enrollments in separate API calls could leave an active sequence with only some contacts activated if the second write or event insert failed.

## Decision

Add the service-role-only `activate_crm_sequence` database function. It locks the sequence, changes the sequence state, activates pending enrollments, writes scheduling events, and records the audit event in one transaction. The API continues to perform operator authorization and draft validation before calling it.

## Consequences

Activation is all-or-nothing and safe to retry after a request timeout. Deployments must apply the migration before enabling the activation flag; the API reports that prerequisite explicitly instead of returning a generic failure.

# 2026-08-09 — Track scheduled report delivery per recipient

## Context

One scheduled report can target several authorized workspace members, but the original delivery-run record stored only one side-effect and provider message ID. A run could therefore appear accepted or delivered when a second recipient failed, and retries could not distinguish completed recipients from failed ones.

## Decision

Add the service-role-only `report_delivery_recipients` table. It stores one normalized recipient, stable idempotency key, side-effect reference, provider message ID, status, safe error, and timestamps for each run. The run remains an aggregate summary; Resend webhook events aggregate recipient state before updating it. A failed recipient can be retried without sending again to recipients already accepted or delivered.

## Consequences

Delivery history is honest for multi-recipient reports and the existing Reports surface can show per-recipient state without adding a new page. The migration must be applied before scheduled report delivery is enabled; the cron reports an explicit setup-required result when the table is absent.

# 2026-08-09 — Make enrollment controls claim-aware

## Context

The sequence worker claims an enrollment before it renders or sends a step. A separate operator pause or stop request could previously update the row while that claim was active; the worker could then release its old claim and overwrite the operator's decision. Paused enrollments also had no resume action in the existing Mail workspace.

## Decision

Pause, stop, and resume now use compare-and-set updates that require no active worker lock. Pause and stop clear the due time and stale lock fields, while resume requires the parent sequence to be active and execution-enabled and schedules the enrollment immediately. The existing sequence-mail view exposes resume for paused enrollments; no new page was added.

## Consequences

An in-flight worker wins neither silently nor destructively: the operator receives a retryable conflict and the worker cannot overwrite a successful control transition. Resuming is explicit and cannot accidentally restart an enrollment while its sequence is paused or disabled.

# 2026-08-09 — Couple sequence task status to enrollment transition

## Context

The task endpoint could mark a sequence task completed before the enrollment transition succeeded. Concurrent clicks could also advance the same enrollment twice, and cancelling a waiting call/general task left the enrollment stuck in `waiting_for_task`.

## Decision

Sequence task updates now use a status compare-and-set. Completion advances the enrollment only after the task update wins; a stale or failed transition restores the prior task status. Cancellation requires an explicit operator reason and stops the waiting enrollment as a failed, auditable sequence transition. Completed or cancelled sequence tasks cannot be reopened, and suggested automatic-email tasks retain their composer-only completion rule.

## Consequences

Task history and enrollment state cannot silently disagree after a stale click or failed transition. Operators use the existing enrollment controls for explicit restart decisions instead of reopening a task that already advanced the sequence.

# 2026-08-09 — Gate sequence activation on current system readiness

## Context

The sequence specification requires activation to stop when the current release readiness check is blocked. Draft validation and the execution flag alone do not prove that Resend, the database, the worker, or malware boundary is ready for a consequential outbound workflow.

## Decision

The activation route runs the existing server-side readiness check without a billable live malware probe. Any blocked service prevents activation and returns only the safe blocked service IDs and messages. Warnings remain visible but do not block activation.

## Consequences

An operator cannot turn on sequence execution while a required platform control is blocked. Activation still requires the existing feature flag, valid draft, operator authorization, and database activation function; no provider call occurs during the readiness check.

# 2026-08-09 — Keep sequence activation honest in the existing Outreach tab

## Context

The server now has a real activation gate, but the builder still showed a permanently disabled “Activation unavailable” control. That made the UI misleading and allowed operators to edit sequences after activation even though the API correctly rejects those writes.

## Decision

Use the existing Outreach Sequences tab as the single control surface. Show a state-specific badge and activation button, call the guarded activation route, surface safe readiness blockers, and make active/paused/archived sequences read-only. Draft validation remains the first local gate; server authorization and readiness remain authoritative.

## Consequences

Operators can understand what is actionable without a new page, and the UI no longer offers edits the backend cannot accept. Activation remains disabled when the draft is invalid, execution is disabled, readiness is blocked, or the required database function has not been applied. The browser check can validate layout and copy, but live sequence data still requires the pending migrations and feature flag.

# 2026-08-09 — Make Outreach metrics and enrollment preview evidence-based

## Context

The first sequence UI exposed placeholder zero metrics and let operators stage contacts without seeing the rendered first touch. Packet 06 requires operational context, truthful performance signals, and a review step before enrollment.

## Decision

Derive sequence sent/reply/scheduled counts from persisted sequence-origin messages, sequence events, and enrollment due times. Add filters and lifecycle controls to the existing tabs, and require a server-generated first-touch preview before the enrollment form can submit. The preview marks inactive, suppressed, missing, and already-enrolled contacts as blocked; the final enrollment route remains authoritative.

## Consequences

Operators see real counts or an honest zero, not estimated activity, and can review personalization before staging a contact. The preview is not an authorization bypass: the server rechecks eligibility at enrollment time. The new controls stay within `/manage/outreach`; pending migrations are still required before local or production sequence data can appear.

# 2026-08-09 — Recalculate report schedules on edit

## Context

The Reports surface could create and pause schedules, but editing cadence, recipient membership, timezone, or send time required creating a new schedule. That made the stored `next_run_at` easy to leave stale and made multiple schedules for one report ambiguous.

## Decision

Use the existing schedule endpoint and sheet for both create and edit. The API validates the complete schedule, rechecks every recipient against current organization membership, and calculates the next run from the saved cadence/timezone/window. The UI tracks the selected schedule ID when editing.

## Consequences

Operators can safely change a schedule without creating duplicate rows, and a paused or archived schedule has no future claim time. Recipient authorization is re-evaluated on every edit, so a previously authorized address cannot remain in a schedule after access is removed.

# 2026-08-09 — Put sequence invariants at the database boundary

## Context

Packet 05 routes validate sequence drafts, but internal workers and future server routes use the service role and could bypass those helpers. Sequence steps also carry cross-row relationships that ordinary foreign keys do not fully protect, such as a reply step preceding an email or an enrollment pointing at another sequence's step.

## Decision

Add a forward-only migration with draft-only step mutation guards, field-shape and reply-order triggers, valid business-day checks, terminal enrollment action checks, sequence/enrollment/step consistency triggers, and a unique provider-event key. Keep the application checks as the user-facing error layer and use the database as the final integrity backstop.

## Consequences

Invalid or cross-sequence sequence data fails closed even when written by a privileged process. Reordering must submit the complete step set, and provider webhook races resolve idempotently. The migration must be applied and linted before sequence APIs can operate against the remote database; it has not been applied by this agent.

# 2026-08-09 — Enforce report tenant links in Postgres

## Context

Portal schedule routes already check that a report definition belongs to the current workspace, but the report cron and other service-role code can write directly. A malformed privileged write could otherwise attach a schedule or delivery run to another organization’s report.

## Decision

Add database triggers for schedule-to-definition and delivery-run-to-definition/schedule consistency. Add a status/next-run invariant so paused and archived schedules cannot remain claimable, while active schedules must retain a next run.

## Consequences

Tenant isolation and pause semantics remain true outside the HTTP routes. The migration must be applied before relying on these guarantees in production; no remote schema change was made by this agent.

# 2026-08-09 — Keep personalization and test sends bounded

## Context

Packet 06 requires an operator to preview and correct contact-specific merge values, and to send a clearly labeled test to the current operator. A generic JSON override would allow arbitrary template paths or sender spoofing, while routing a test through sequence linkage could contaminate production enrollment metrics.

## Decision

Store only a fixed contact-field allowlist in `crm_sequence_enrollments.personalization`; render those values server-side in preview and worker execution. Test sends require a confirmed internal operator email, a personal send-capable mailbox assigned to that operator, and a caller-provided idempotency request ID. They use the audited outbound sender with manual origin and no contact, enrollment, or sequence-step linkage.

## Consequences

Operators can correct a missing contact value without mutating the CRM source record, and retries cannot send a second copy. Test messages remain auditable mailbox activity but cannot look like sequence production events. Provider delivery and the pending migrations still require separate operational setup.

# 2026-08-09 — Include rendered HTML in email idempotency hashes

## Context

Report and lifecycle sends carry both plain-text and HTML bodies. Hashing only the text body could treat a changed HTML rendering as the same request, which makes delivery reconciliation and retry behavior less trustworthy.

## Decision

Include the rendered HTML in the shared `emailRequestHash` input alongside recipient, subject, and plain text. Keep the hash deterministic and content-only; the durable side-effect ledger remains responsible for the idempotency key and provider result.

## Consequences

A materially changed report body receives a distinct request hash, while exact retries remain deduplicated. Existing transactional callers already provide HTML, so no provider contract changes are required.

# 2026-08-09 — Gate finding alerts on the final trust state

## Context

The deterministic expense evaluator can promote a finding from `needs_evidence` to `evidence_backed` during the same transaction that links source evidence. Reading the pre-promotion row could either send an alert before trust review or suppress a valid alert because the in-memory value was stale.

## Decision

Centralize the `finding_ready` predicate and require linked evidence, `evidence_backed` trust state, and customer visibility. Update the in-memory state after a successful promotion before evaluating the notification.

## Consequences

Customer alerts now match the trust state shown in the portal. Findings that are manual notes, demo examples, deprecated, hidden, or still awaiting evidence cannot produce a customer-facing finding alert.

# 2026-08-09 — Park sequence claims when execution is unavailable

## Context

A worker claim can race a sequence pause, feature-flag disablement, or sequence deletion. Merely clearing the lock leaves a due enrollment eligible for the next cron run, creating a repeated claim loop and noisy audit history.

## Decision

Treat a missing parent sequence as a failed claim, and treat a paused or execution-disabled sequence as a paused enrollment. Clear `next_action_at`, retain the pause reason, and append one idempotent paused event while releasing the worker lock.

## Consequences

Paused sequences stop producing repeated work until an operator deliberately resumes the enrollment or sequence. A deletion/data-integrity problem is visible as a failed enrollment rather than silently dropped.

# 2026-08-09 — Require a stable source for lifecycle email idempotency

## Context

The lifecycle sender previously fell back to a generic `workspace-event` key when a caller omitted both a source record and event key. That could silently suppress unrelated emails of the same kind to the same recipient.

## Decision

Require every lifecycle send to provide a trimmed `sourceRecordId` or `eventKey`. Return a safe failed result before claiming the external side effect when neither is present.

## Consequences

Every accepted lifecycle email is traceable to a durable event or record, and malformed callers fail without touching Resend or the side-effect ledger. Existing production call sites already provide one of the two identifiers; fixtures now model that contract explicitly.

# 2026-08-09 — Encode lifecycle idempotency in the send type

## Context

Runtime validation prevents malformed lifecycle sends in production, but an optional payload type still lets new call sites omit the source identifier until runtime.

## Decision

Keep the content renderer’s general payload type, but require `sourceRecordId` or `eventKey` on the side-effect-producing send and workspace-recipient APIs. Rejected manual uploads use their SHA-256 digest as a stable source identifier because no document row exists.

## Consequences

New lifecycle call sites fail TypeScript validation unless they provide an idempotency source, while rejected uploads remain auditable and deduplicated without inventing a document ID.

# 2026-08-09 — Expose Stripe billing-mode readiness before checkout

## Context

The Stripe account is currently a Costivra test account. A server using live credentials with configured prices must not appear checkout-ready while live billing remains disabled; otherwise the UI can offer a path that the checkout route will reject.

## Decision

Derive an explicit Stripe mode (`test`, `live`, or `unknown`) and `billingEnabled` signal in the server-only Stripe helper. Return both from billing status and require the enabled signal in the portal checkout control. Live mode remains disabled unless `STRIPE_BILLING_LIVEMODE_ENABLED=1`.

## Consequences

The billing UI and API now agree on whether checkout is actually available. A live key cannot accidentally turn on self-serve billing merely because Stripe prices exist.

# 2026-08-09 — Store editable pricing in a mode-aware catalog

## Context

Pricing appeared in several places and was previously split between environment Price IDs and hardcoded display amounts. That made a legitimate price change easy to show incorrectly or apply to the wrong Stripe mode.

## Decision

Use a service-role-only `billing_plan_catalog` table with one row per plan and Stripe mode (`test` or `live`). The owner portal edits the catalog through a server-authorized route. For recurring plans, a save creates a new Stripe Price and archives the previous one; the app records the active Price ID and uses it for Checkout and webhook resolution. Public pages receive display fields only, never provider identifiers.

## Consequences

Pricing changes are traceable, mode-separated, and consistent across the homepage, pricing page, portal checkout, Stripe, and webhook processing. Stripe Price objects remain immutable in practice, so historical subscriptions continue to reference their original price. Production still requires a separate live Stripe key and live catalog prices before enabling live billing.

# 2026-08-09 — Use an authenticated workspace before paid Checkout

## Context

Stripe can collect payment before Costivra knows which authenticated user and organization should receive access, but provisioning a workspace from a browser success URL would create an unsafe ownership and tenant-isolation boundary. Costivra already creates an organization-scoped workspace during account signup when the customer provides a company name.

## Decision

Use an auth-first paid handoff for the pilot: public Starter/Growth CTAs carry a stable plan key into signup or sign-in, email confirmation and OAuth preserve the selection, and the authenticated owner/admin starts Stripe Checkout from `/app/settings?tab=billing&plan=...`. Signed Stripe webhooks remain the only source of paid access and mark the existing workspace onboarding source `paid_checkout`.

## Consequences

Customers choose a plan before creating or entering their workspace and return directly to the correct Billing tab, while Costivra never grants paid access to an unowned organization. Direct pre-auth Checkout with signed user/workspace provisioning remains a separate future milestone rather than a shortcut around tenant authorization.

# 2026-08-10 — Use a pending paid Checkout intent for self-service creation

## Context

The auth-first handoff was safe, but it made a visitor create an account and workspace before Costivra could collect payment. That added friction and did not satisfy the intended “choose a plan, pay, then activate” creation flow. Stripe Checkout can collect the subscription before a Costivra user exists, but a browser success URL must never be trusted to create access.

## Decision

Add a short-lived, service-role-only `billing_checkout_intents` record. The public signup form validates the selected plan and contact details, creates one idempotent Stripe subscription Checkout Session, and stores only the minimum pending handoff data. A signed `checkout.session.completed` webhook is the only path that creates or reuses the auth user, one organization, one owner membership, onboarding projection, and billing customer. A user email with multiple existing workspaces is sent to manual review instead of guessing a tenant. The existing authenticated owner/admin Checkout path remains supported for founder-led and existing-workspace billing.

## Consequences

Paid creation now has a direct plan-to-payment path without granting access before Stripe confirmation. Webhook retries are safe at the intent, user, workspace, membership, and billing layers. Activation still depends on the secure Supabase invite/password flow and the signed subscription projection. Real test-mode Checkout plus signed webhook proof, delayed-invite recovery, and live-mode setup remain release gates.

# 2026-08-10 — Keep Stripe Managed Payments disabled for the pilot

## Context

The Costivra Stripe Test account has Managed Payments enabled by default. Creating a recurring Checkout Session without a product tax code is rejected by Stripe before the customer ever sees Checkout. Managed Payments would also make Stripe the merchant of record, which has separate tax and compliance implications.

## Decision

Both authenticated and pre-auth subscription Checkout Sessions explicitly set `managed_payments.enabled = false`. Costivra remains the merchant of record for this pilot. Managed Payments can be reconsidered only after product tax codes, registrations, and the legal/compliance responsibilities are intentionally configured.

## Consequences

Test Checkout can open with the current dynamic catalog, while tax collection and merchant-of-record work remain visible release gates rather than an accidental Stripe default.

# 2026-08-10 — Keep sequence execution fail-closed behind migration and operator review

## Context

Automatic outreach has consequential external side effects. The sequence UI and worker can be deployed before the safety schema, unsubscribe path, provider reconciliation, and recovery ledger are present.

## Decision

Sequence activation requires the safety tables to exist and the existing server-side validation/readiness checks to pass. Automatic sending remains behind `COSTIVRA_SEQUENCE_EXECUTION_ENABLED`. Every sequence send uses the canonical outbound service, opaque hashed unsubscribe tokens, provider idempotency, and a ten-send-per-mailbox pilot ceiling. Provider-ambiguous failures are never retried automatically.

## Consequences

The product can be tested and reviewed without accidental sends. A migration-history mismatch must be repaired deliberately before the new safety migration is pushed; the implementation does not silently repair or reorder remote history.

# 2026-08-10 — Separate sequence directory from sequence detail

## Context

The Outreach Sequences screen was trying to act as both a campaign directory and a full workflow editor. The split pane left unused space, crowded the header with unrelated metrics, and made long sequences compete with the list.

## Decision

Use a full-width, paginated sequence table at `/manage/outreach?tab=sequences` and a dedicated workflow page at `/manage/outreach/sequences/[id]`. Keep directory metrics as quiet contextual copy, keep sequence-specific metrics on the detail page, and link to the existing filtered Enrollments table instead of duplicating contact lists.

## Consequences

Sequence discovery, workflow editing, and enrollment review have clear ownership. The existing server-side authorization, validation, consent, approval, audit, and release-gate behavior remains unchanged. The detail GET path now includes accurate live stats without changing the database schema.

# 2026-08-10 — Use reference-inspired mechanics for the public header

## Context

The public Costivra header was visually polished but had a basic mobile dropdown and no meaningful scroll state. The CRM platform and Luxor public sites demonstrated stronger mechanics: a header that settles as visitors scroll, an animated mobile surface, a page scrim, and deliberate focus/scroll handling.

## Decision

Keep Costivra’s existing brand, navigation, and authenticated app shell, while adopting the useful public-header mechanics: a scroll-aware visual state, a scrim-backed mobile drawer, body-scroll locking, Escape-to-close, focus restoration, and reduced-motion behavior. The mobile drawer remains an in-page navigation surface and does not introduce a new dependency.

## Consequences

Public navigation is more consistent across desktop and mobile without coupling the marketing site to the CRM or Luxor implementations. The new behavior is covered by the public smoke test and direct desktop/mobile browser QA. The authenticated workspace header remains intentionally separate because it serves a different, higher-density task context.

# 2026-08-10 — Make the public header transition materially visible

## Context

The first reference-inspired pass only changed the marketing header's background and shadow after scrolling. In practice that looked like a faint flicker instead of the deliberate CRM/Luxor behavior Lewis was trying to match. The mobile drawer was also nested inside the blurred header, which could constrain its viewport overlay in the browser compositor.

## Decision

Use a fixed full-width marketing bar with a meaningful height transition: 88px at the top of the page and 68px after scrolling past 50px, with hysteresis so it does not chatter near the threshold. Render the mobile navigation outside the blurred header as a separate full-viewport overlay, while keeping the header and menu control above it. Keep the overlay solid, animated, scroll-locking, keyboard-accessible, and dependency-free.

## Consequences

The public header now has a clear before/after state instead of a barely perceptible style change. The mobile menu is no longer affected by the header's blur/compositing layer and covers the full viewport at 390×844. The public header remains separate from the authenticated app shell.

# 2026-08-11 — Use one quiet operational-surface system for Manage and the customer workspace

## Context

The authenticated customer workspace and internal Manage shell had accumulated different generations of container, panel, table, and modal styling. Similar work could therefore look like separate products: inconsistent corner radii, elevated panels that appeared clickable, uneven table headers, and a heavy selected-row accent. That read more like a generic dashboard than a calm operating workspace.

## Decision

Define a late, scoped set of workspace surface tokens and apply them only to `.manage-shell-v2` and `.app-body .app-work-canvas`. Both shells use the same neutral page ground, white work canvas, restrained one-pixel borders, 20px frame corners, 16px panel corners, quiet table states, and consistent controls. Panels do not lift on hover; status and selection remain legible without a colored left rail. Portal-based customer dialogs retain the same geometry through their explicit body-level selectors. Public marketing pages and structural layout/sticky-table rules remain outside this pass.

## Consequences

New and existing operational pages now share a clear visual grammar without changing their workflows or introducing a new component dependency. Future workspace surfaces should reuse these scoped primitives rather than adding another card/shadow variant. The legacy shell layers remain in place for compatibility and can be reduced deliberately in a later component migration.

# 2026-08-11 — Keep sequence actions contextual instead of persistent

## Context

The sequence detail page exposed navigation, enrollment, queue monitoring, duplication, and execution state as neighboring button-like controls. That made the page feel busy and made a non-actionable “Execution disabled” state look clickable.

## Decision

Keep one state-dependent primary action in the detail context row: Enroll contacts while activation is unavailable, or Activate/Resume when the sequence is ready. Move View enrollments, Queue & activity, Duplicate, Pause, Archive, and the alternate enrollment action into an accessible three-dot menu. Remove the duplicate action cluster from the builder header. Connector arrows use a transparent SVG background so the timeline remains a clean line between cards.

## Consequences

The page has one clear next action and a predictable home for less frequent operations. The menu closes on outside click and Escape, restores focus after its exit animation, and respects reduced motion. Execution status remains explanatory UI rather than a fake disabled button.

# 2026-08-11 — Align shared shell utilities with the workspace frame

## Context

The shared floating Back control could sit directly against the sticky Manage top bar, while the global create trigger inherited the visual treatment of a primary rectangular CTA. That made navigation feel cramped and the two utility controls look unrelated.

## Decision

Keep a small clear gap below the shell header for floating Back controls and give the Manage create trigger the same 40px circular, neutral utility treatment as Ask Costivra. The plus remains a global menu trigger; it is not promoted to a page-level primary action.

## Consequences

Sequence and other Manage detail pages retain their existing navigation behavior while gaining clearer separation from the header. The create and assistant controls now read as one utility group, with the page's actual actions remaining in the content area.

# 2026-08-11 — Treat sequence connectors as one visual element

## Context

The sequence rail line used a light neutral stroke while its downward arrow used a darker gray. The mismatch made each transition look assembled from separate pieces.

## Decision

Use the same neutral color for the connector line and arrowhead, while keeping the arrow background transparent so it stays integrated with the rail.

## Consequences

Wait chips remain readable, but the timeline now reads as one continuous chronological path between steps.

# 2026-08-11 — Open the terminal add-step tray into the available canvas

## Context

The only add-step control is at the end of the sequence. Its anchored tray opened downward, which pushed part of the dialog below the scroll viewport when the final plus button was near the bottom of the page.

## Decision

On desktop widths, the terminal tray opens upward from the final plus control. Mobile keeps the existing in-flow tray so it can use the full available width.

## Consequences

The complete add-step form remains visible without requiring the user to hunt for hidden fields or manually scroll the page.

# 2026-08-11 — Keep sequence utilities available without crowding the header

## Context

The global create menu could be clipped against the right edge, and sequence detail actions disappeared with the header during long builder sessions. The sequence overflow trigger also used a horizontal ellipsis unlike the vertical action menus elsewhere in the CRM.

## Decision

Anchor the global create menu inward from the right edge, use the shared vertical ellipsis icon for sequence actions, and pass Enroll contacts plus the overflow menu through the existing floating Back strip when the detail header scrolls away.

## Consequences

Frequent sequence actions remain reachable without a second permanent toolbar, while less frequent actions stay in the same overflow menu. The floating menu has its own anchored popover so it remains usable after scrolling.

# 2026-08-11 — Align the Manage rail with page context controls

## Context

On sequence detail pages, the first sidebar destination sat noticeably below the Back control in the content area. That made the shell feel vertically misregistered.

## Decision

Raise the shared Manage primary navigation rail by 20px so its first icon aligns with the Back control. Keep the adjustment scoped to the v2 Manage shell and leave the top bar, utility nav, and mobile structure unchanged.

## Consequences

Sidebar navigation and page context now share the same visual starting line, reducing unnecessary vertical drift without changing navigation behavior.

# 2026-08-11 — Use vertical overflow affordances consistently

## Context

The sequence card overflow control still used a horizontal ellipsis even though the rest of the CRM uses vertical action dots. The sidebar also remained slightly below the floating Back control after the first alignment pass.

## Decision

Use the vertical overflow icon for step-card actions and raise the Manage primary rail another 14px to align the icon center with the floating Back control in the scrolled detail state.

## Consequences

Overflow actions now share one recognizable convention across sequence cards, record lists, and detail menus. The navigation rail has a consistent visual baseline with the detail context control.

# 2026-08-11 — Make product-design guidance explicit about icons, motion, loading, and performance

## Context

Costivra's product-design skill stated a calm visual direction but did not explicitly codify the codebase's Phosphor-compatible icon system, shared motion rules, skeleton loading expectations, or the requirement to keep Manage and the customer app visually aligned without indiscriminate browser caching.

## Decision

Expand the project-owned product-design skill with concrete rules for `@/lib/icons`, vertical overflow menus, consistent entry/exit motion, shared skeleton primitives, scoped shared operational styles, server-first rendering, and minimal non-persistent client data loading. Record `.agents/skills/costivra-product-design/SKILL.md` as the source of truth and require any future mirror to remain byte-for-byte identical.

## Consequences

Future UI work has an actionable, consistent design and engineering contract. It favors a smooth, fast product without turning users' browsers into a long-lived cache of workspace data.

# 2026-08-11 — Use one reliable marketing navigation control at compact widths

## Context

At tablet widths the marketing header could show the compact menu control alongside the desktop CTA, and both menu glyphs were mounted at once while transitioning. That made the header look like two controls and made the click target harder to reason about.

## Decision

Use one conditionally rendered Menu or X icon, hide the desktop CTA at the same compact breakpoint where the menu appears, and keep the menu trigger above the header surface with a clear pointer target.

## Consequences

Compact desktop/tablet and phone widths now share one predictable navigation mode. The open state has one visible close control and the closed state has one visible menu control.

# 2026-08-11 — Make account feedback and password visibility explicit

## Context

Signup confirmation feedback appeared abruptly, and the account password field had no visible way to inspect the value while typing. The signup email question also required checking the real Supabase Auth record rather than guessing from the UI.

## Decision

Animate account status messages when they appear or change, add an accessible eye toggle to the password field, and verify account existence/confirmation through a read-only Supabase Auth query.

## Consequences

Signup and sign-in feedback is easier to notice without being disruptive, password entry is more recoverable, and account support answers can distinguish a missing account from a delivery problem.

# 2026-08-11 — Share visual primitives before consolidating workspace shells

## Context

The customer workspace and Manage have accumulated separate shell selectors and several generations of CSS overrides. A small visual adjustment could therefore require parallel changes or be accidentally undone by a later legacy rule.

## Decision

Keep the existing late unified workspace layer in place and extend it with semantic `--workspace-*` tokens for controls, table states, overlays, motion, and accents. Introduce visual-only shared primitives for utility buttons, status badges, empty states, and route matching; mark both shells with the same frame-slot contract. Keep navigation maps, data sources, permissions, assistant drawers, and mobile behavior local to their respective platforms.

The final shared layer also owns the customer mobile rail transition so an older sidebar rule cannot restore the desktop rail at small widths.

## Consequences

Future cosmetic changes can be made through the shared tokens and primitives without coupling customer and internal workflows. The legacy selectors remain temporarily, so later migrations should move one visually verified surface at a time instead of attempting a high-risk stylesheet rewrite.

# 2026-08-11 — Share assistant chrome while keeping data boundaries separate

## Context

The customer assistant and internal Manage assistant had drifted in their headers, circular controls, composer sizing, history rail, and open/close motion. Their records and authorization scopes are intentionally different.

## Decision

Use shared React primitives and assistant CSS for the header, icon buttons, composer shell, textarea autoresize, attachment affordance, message treatment, rail geometry, and motion. Keep customer chat sessions and internal operator history in separate provider/API paths. Manage attachments remain a visual handoff until they can be tied to a selected client and the private intake workflow.

## Consequences

CSS and animation changes now apply predictably to both assistants without allowing internal CRM context to enter a customer session or vice versa. A future Manage attachment workflow must add explicit client selection, private storage, scanning, and auditability before sending file content to the assistant.

# 2026-08-12 — Share notification presentation while preserving notification authority

## Context

The customer workspace had a notification bell, while Manage only displayed transient toast alerts and immediately marked them read. That meant internal operators could lose the alert history and the two workspace headers visibly diverged.

## Decision

Use one `WorkspaceNotificationCenter` for the circular bell, unread badge, recent-list popover, motion, keyboard dismissal, focus return, and reduced-motion behavior. Keep the notification controllers and data sources separate: customer notifications remain organization-scoped, while Manage reads internal operator/global notifications through its internal API.

The Manage API now returns a bounded recent list with read state, marks alerts read only after a deliberate user action, validates each requested alert against the signed-in operator's visible scope, and permits only relative `/manage` action links.

## Consequences

Both workspaces now share one notification interaction and visual language without joining customer and internal data. Manage operators retain a clear recent-alert history, and a compromised browser request cannot mark another operator's alert as read.

# 2026-08-16 — Make the free review a server-enforced product boundary

## Context

The public experience promised a three-bill starting point, but the upload endpoint did not enforce a limit. Counting visible documents alone would also be vulnerable to duplicate retries and concurrent uploads, and alternate intake paths could bypass the manual upload screen.

## Decision

Represent each distinct document hash as one organization-scoped free-review slot. Claim slots through a security-definer database function protected by a transaction advisory lock, finalize claims only after intake outcome, and release duplicates or failed attempts. Apply the same boundary to manual uploads, chat attachments, inbound email, and quarantine release. Paid or trialing subscriptions bypass the allowance. Block ongoing monitoring and email-intake activation for free workspaces.

Persist the first-run walkthrough per organization member and tutorial version rather than using browser-only storage, so the experience is consistent across devices and can be replayed intentionally.

## Consequences

The product can truthfully show “3 free bills” and offer a direct upgrade when the allowance is exhausted. The free-review migration is now applied to the target Supabase project; the code's document-count fallback remains only a compatibility aid for environments where the migration is absent and is not a substitute for the concurrency-safe database claim path.

# 2026-08-16 — Keep the free workspace useful without pretending it is paid

## Context

A free user can understand the upload limit but still encounter paid-only tasks such as ongoing monitoring, team invitations, scheduled reports, or a checklist that asks them to activate a paid workflow. That creates a dead-end rather than a coherent first experience.

## Decision

The free workspace remains useful for a contained source review: upload up to three selected documents, inspect findings and evidence, and make an informed upgrade decision. Its workspace banner and review-path checklist explain the boundary. Ongoing monitoring, team invitations, and scheduled reports are server-gated and return a direct upgrade path; paid workspaces retain the full activation checklist and controls.

## Consequences

Free users see a complete, honest journey with a next step at every stage. The product avoids silently exposing paid operational capabilities through secondary routes while preserving the source-review experience that earns the upgrade.

# 2026-08-16 — Apply free-review persistence through the supported Supabase migration API

## Context

The local migration directory does not contain several migration versions already recorded by the linked Supabase project, so `supabase db push --dry-run --linked` refused to proceed. Repairing or rewriting that history would be unsafe. The free-review gate and per-member tutorial nevertheless require their two tables and database functions in the target project.

## Decision

Apply the two already-reviewed migration files as one named, atomic migration through Supabase's supported Management API migration endpoint. Verify the resulting tables, RLS, deny policies, functions, and schema lint results with read-only checks. Do not repair the divergent local migration history or run an unrestricted push.

## Consequences

The production database now contains the concurrency-safe free-review slot claim and durable tutorial state. The local migration history remains divergent and must be reconciled deliberately before future automated pushes; the applied migration is documented here rather than hiding that operational constraint. The project security advisor still reports the pre-existing warning that leaked-password protection is disabled; that is an Auth configuration follow-up, not a reason to weaken the new database boundary.

# 2026-08-16 — Show plan state inside the first-run tour and recover abandoned claims

## Context

The workspace banner communicates the free limit, but the onboarding modal dims the workspace while it is open. Also, a process interruption between claiming and finalizing a document could leave a reserved slot behind.

## Decision

Show a compact plan-state row inside the tour itself: free members see the remaining document allowance and a paid-plan link, while paid members see that full monitoring and controls are active. Treat reservations older than 30 minutes as abandoned and release them under the same organization advisory lock before counting or claiming new slots.

## Consequences

The first-run experience explains the commercial boundary at the moment a member is learning the product. The limit remains strict during normal concurrent work, while interrupted uploads no longer permanently consume allowance. A very long-running intake over 30 minutes would be eligible for recovery, so the intake pipeline must continue to finalize promptly and keep its processing window bounded.

# 2026-08-16 — Make annual billing a real paid journey in Test mode

## Context

The public pricing page already offered an annual cadence and displayed the 20% savings calculation, but the connected catalog had no annual schema columns or Stripe annual Price IDs. Leaving the control visible would make the paid journey look complete while sending customers to a contact fallback.

## Decision

Apply the reviewed annual billing migrations, create matching recurring annual Prices in the configured Stripe Test account, and store only their non-secret Price IDs in the Test billing catalog. Keep live billing untouched until the live Stripe account and catalog are intentionally configured.

## Consequences

Starter and Growth annual selections now flow through the same pre-auth Checkout path as monthly plans, with the interval preserved in Checkout metadata, intents, webhook projection, and return URLs. Production/live readiness remains a separate gate; no live Price or payment was created.

# 2026-08-16 — Keep the mobile workspace journey fully operable

## Context

The responsive customer shell replaces the desktop profile menu with a bottom navigation drawer. The authenticated journey test reached the Command Center at 390px, but the drawer had no account exit action, so the mobile sign-out checkpoint could not be exercised.

## Decision

Add a clearly labeled Sign out action to the mobile workspace drawer and use that responsive path in the authenticated browser regression. Keep the existing desktop profile-menu sign-out unchanged.

## Consequences

Mobile members have a complete, discoverable account-exit path, and the responsive journey now verifies sign-out, protected-route redirect, re-authentication, and workspace-state resume. The action is a normal auth session mutation and does not create an external side effect.
