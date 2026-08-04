# Costivra Client Assistant V2
## Codex implementation directive for Ask Costivra

**Repository:** `powerchoosers/costivra`  
**Primary surface:** customer workspace under `/app`  
**Supporting systems:** current Costivra Supabase project, existing document intake, existing OpenRouter adapter  
**Prepared:** August 4, 2026  
**Status:** ready for implementation

> This is an implementation directive, not a speculative product blueprint. Inspect the current branch before editing, preserve unrelated work, implement the complete vertical slices described below, and do not claim completion until the required checks and browser flows pass.

---

# 1. Mission

Revamp the client-facing **Ask Costivra** feature into a polished, persistent, evidence-grounded financial operations assistant that is available from every customer workspace page.

The finished assistant must:

1. Move out of the desktop left navigation and into the top-right workspace bar.
2. Open as a refined right-side panel that feels as immediate as a browser extension and follows the successful interaction model already used in `/manage`.
3. Expand from the right-side panel into a true full-screen assistant without losing the current session, scroll position, draft, attachments, or focus.
4. support durable conversation history, a prominent new-chat control, session search, rename, pin, and archive.
5. Accept normal text prompts, attachments, or text and attachments together.
6. Reuse Costivra's real document ingestion pipeline for every attachment.
7. Recognize invoices and statements, extract the vendor, infer the bill or expense type when supported by evidence, and present the result visually.
8. Resolve vendors across the customer's relationships and the global Costivra catalog.
9. When no vendor exists, perform bounded public vendor enrichment using public-safe identity hints, create a globally searchable vendor candidate, create or resolve a category candidate, and link the originating organization safely.
10. Render trusted visual response cards and detail containers for invoices, vendors, contracts, spend changes, opportunities, approvals, evidence, and ingestion results.
11. Preserve Costivra's doctrine: **AI interprets, code calculates, policies control, humans authorize, and evidence proves.**

The assistant must feel calm, precise, modern, and premium. Apple is a reference for restraint, typography, motion, hierarchy, and material quality, not a UI to copy.

---

# 2. Interpretation of the request

The phrase "create a before and category" is interpreted as **create a vendor and category**.

A newly discovered vendor may be added to the shared Costivra vendor catalog, but only public vendor identity information may become globally visible. Never expose the originating organization, invoice, account number, amount, service address, document text, sender, or relationship details to another tenant.

A newly discovered vendor or category is a **candidate**, not automatically verified truth. It may be globally searchable immediately with an honest Suggested or Unverified state, while verified entries rank first. Candidate status must never be presented as financial verification.

Adding a new catalog category does not activate savings rules, legal interpretations, benchmarks, or expert recommendations for that category. Unsupported categories remain monitoring-only until Costivra explicitly implements and tests analysis capabilities for them.

---

# 3. Verified current state

Codex must recheck these observations before changing code.

## 3.1 Client shell

- `src/components/app-shell.tsx` currently places `Ask Costivra` in the left navigation at `/app/ask`.
- The client top bar already contains the organization switcher, global search, document upload, notifications, and profile controls.
- The top bar is the correct mounting point for the new assistant trigger.
- The existing global search already uses `Command/Ctrl + K`, so do not reuse that shortcut for chat.

## 3.2 Current client assistant

- `src/components/portal-pages.tsx` currently renders the client `Ask` component for the `ask` slug.
- The current component keeps visible messages in local React state.
- It posts text to `/api/portal/ask` and renders a plain answer with citation links.
- It does not load previous sessions, show a history rail, accept attachments, expose a full-screen transition, render typed response blocks, or restore a conversation after reload.
- The repository contains more than one chat styling family, including current `portal-chat` markup and a separate `ask-page` style family in `src/app/globals.css`. Search all usage and consolidate deliberately. Do not delete styles based on assumption alone.

## 3.3 Internal assistant reference

- `src/components/manage-ai-drawer.tsx` is the closest interaction reference.
- `src/components/manage-portal.tsx` opens it from a top-right Bot control and mounts a fixed right-side surface.
- The internal drawer already demonstrates contextual suggestions, source cards, keyboard dismissal, a new-conversation action, and polished opening motion.
- Reuse interaction principles and neutral visual primitives where safe, but do not couple customer data, permissions, prompts, or APIs to internal CRM types.

## 3.4 Current chat backend

- `src/app/api/portal/ask/route.ts` already creates and validates `chat_sessions`.
- It persists user and assistant rows in `chat_messages`.
- It reads scoped documents, evidence, opportunities, contracts, expenses, and recent chat history.
- The missing history experience is primarily an API and UI gap, not a missing database foundation.
- The route currently returns one non-streaming JSON answer and citations.
- Preserve `/api/portal/ask` as a compatibility wrapper during migration, then route it through the new assistant service. Do not leave two divergent answer engines.

## 3.5 Existing document intake

The existing pipeline is the correct ingestion spine and must be reused:

- `src/lib/documents/manual-upload.ts`
- `src/lib/documents/intake.ts`
- `src/lib/ai/document-intelligence.ts`
- `src/lib/documents/invoice-record.ts`
- `src/app/api/portal/documents/route.ts`

It already provides:

- tenant authorization
- supported-type validation
- a 20 MB per-file limit
- malware scan, quarantine, or rejection behavior
- SHA-256 deduplication
- private Supabase Storage
- native text extraction and bounded PDF OCR fallback
- versioned structured extraction
- evidence references
- deterministic invoice reconciliation
- invoice and line-item persistence
- human review routing
- audit events

Do not create a second upload or extraction pipeline for chat.

## 3.6 Current vendor resolution

`src/lib/documents/invoice-record.ts` currently resolves only against vendor relationships already attached to the organization. It supports a provided relationship and exact normalized name or alias matching. An unknown vendor remains unmatched with a null relationship and category.

The new resolver must live in this shared ingestion path, not only inside chat, so manual uploads, forwarded email, provider integrations, recovery, and chat attachments all benefit.

## 3.7 Current Supabase shape

The connected Costivra database already includes:

- `chat_sessions`
- `chat_messages`
- `documents`
- `document_extraction_versions`
- `evidence_references`
- `invoices`
- `invoice_line_items`
- `vendors`
- `organization_vendors`
- `expense_accounts`
- `expenses`
- inbound email and attachment tables

Important current details:

- `chat_sessions` has organization, user, title, created, and updated fields.
- `chat_messages` has role, content, citations, and timestamps.
- Chat reads are already personal by default when `user_id` is populated.
- `vendors` is a global authenticated-read catalog and already has `canonical_name`, `category`, `website`, `search_aliases`, `is_suggested`, and logo fields.
- `organization_vendors` is the tenant-owned relationship layer and is unique by organization and vendor.
- `vendors.canonical_name` is currently unique, but there is no normalized-name key, domain table, category table, catalog lifecycle state, or enrichment provenance.
- `invoices.vendor_match_status` currently supports only `provided`, `exact`, `ambiguous`, and `unmatched`.
- `documents` is unique by organization and SHA-256.

All schema changes must be represented by reviewed migrations, protected by RLS and server authorization, covered by tenant-isolation tests, and checked with Supabase security and performance advisors.

---

# 4. Non-negotiable product boundaries

1. Chat is an exploration and explanation interface. Structured records remain authoritative.
2. The model must never calculate authoritative savings, totals, percentages, deadlines, or benchmarks. Deterministic code performs calculations.
3. The model must never execute arbitrary SQL or choose an organization ID supplied by the browser.
4. The model must not send email, approve work, change a contract, alter payment instructions, create a referral, or perform another consequential external side effect.
5. Vendor and category candidate creation is an ingestion service behavior supported by source evidence, not a general-purpose model tool.
6. A text prompt such as "create Vendor X" must not silently create a global catalog record. It may open an explicit form or explain the required review path.
7. Uploaded files, extracted text, email content, public websites, search results, and model output are untrusted data.
8. Never send complete invoice text or sensitive values to a public web-search provider. Only public-safe vendor identity hints may leave the document pipeline for enrichment.
9. Every material claim must cite a tenant-authorized record or source document.
10. Unknown means unknown. Missing evidence must be stated plainly.
11. Never label a candidate vendor, category, result, or savings value as verified.
12. Do not expose service-role credentials, provider keys, private storage paths, or raw provider diagnostics to the browser.

---

# 5. Target client experience

## 5.1 Top-bar entry point

Remove the `Ask Costivra` item from the desktop left navigation in `src/components/app-shell.tsx`.

Add a dedicated assistant trigger in `.top-actions`, placed after global search and before Upload documents:

- desktop wide: Costivra mark plus `Ask Costivra`
- medium widths: Costivra mark plus `Ask`
- compact widths: icon-only with an accessible label and tooltip
- active state while the assistant is open
- `aria-expanded` and `aria-controls`
- use the real `CostivraMark`, not a generic chatbot avatar

Suggested utility shortcut: `Command/Ctrl + Shift + K`, only after verifying that it does not conflict with an existing Costivra shortcut. Show the shortcut in the tooltip, not as permanent visual clutter.

The trigger must be present on every `/app` page, including vendor, invoice, document, contract, opportunity, and settings detail pages.

## 5.2 Drawer mode

Opening the assistant on desktop produces a floating or fixed right-side surface aligned below the app top bar.

Recommended desktop geometry:

- width: 430 to 470 px
- top: app top-bar height plus 10 to 14 px
- right and bottom: 10 to 14 px
- radius: 18 to 22 px
- one-pixel hairline border
- low, wide shadow
- white or nearly white material with restrained backdrop blur
- no neon glow, giant gradient, or decorative noise

Responsive behavior:

- at very wide widths, the app may reserve space or gently shift to prevent important content from being covered
- at normal laptop widths, overlay the page with a subtle scrim
- below tablet width, open as a full-height sheet
- on mobile, use `100dvh`, safe-area padding, and a full-screen layout by default

Drawer header controls, in order:

1. Costivra identity and current context
2. New chat
3. Conversation history
4. Expand to full screen
5. Close

Do not place a separate New conversation link underneath the transcript. The plus control belongs in the header and must always be available.

## 5.3 Full-screen mode

The full-screen assistant is not a different chat implementation. It is the same mounted surface in a different layout mode.

Full-screen structure:

- left conversation rail, approximately 260 to 300 px
- central conversation canvas, readable width approximately 760 to 900 px
- optional right evidence or record inspector, approximately 300 to 360 px
- compact assistant header with session title, context, status, mode toggle, and close/back action

The full-screen route remains `/app/ask` for compatibility. Support a session deep link such as `/app/ask/{sessionId}` through the existing catch-all route if it can be implemented without fighting the current routing model.

Transition requirements:

- preserve the same component instance where practical
- do not clear messages, uploads, composer text, or scroll position
- animate drawer geometry into full-screen geometry
- prefer CSS and the Web Animations API over adding a large animation dependency
- use a shared-element or FLIP-style transition only if it remains stable and accessible
- reduced-motion users receive an immediate state change or a short fade
- no layout flash, double surface, or remount flicker

Closing full-screen from `/app/ask` returns to the most recent customer workspace route when known, otherwise `/app`.

## 5.4 Conversation history

History must use the existing `chat_sessions` and `chat_messages` records.

Required behavior:

- load recent sessions only when the assistant first opens
- cursor pagination, not an unbounded fetch
- group by Today, Yesterday, Previous 7 days, Previous 30 days, and Older using the organization timezone
- search by title
- show the current session clearly
- plus button creates a local blank draft and focuses the composer
- persist a new session only when the first message is sent, avoiding empty history rows
- allow rename, pin, and archive
- archive instead of hard delete in the primary UI
- exclude archived sessions from the normal list
- allow an Archived view
- restore a selected transcript after refresh
- load the latest messages first and support loading older messages for long conversations

Sessions remain personal to the initiating user by default. Do not broaden them to every organization member. Shared conversations require a separate future sharing policy and are out of scope.

## 5.5 Current-page context

Match the useful contextual behavior of the internal assistant without trusting the URL blindly.

The client may send a bounded context reference derived from the current route:

```ts
type AssistantContextRef =
  | { kind: "vendor"; id: string }
  | { kind: "invoice"; id: string }
  | { kind: "document"; id: string }
  | { kind: "expense"; id: string }
  | { kind: "contract"; id: string }
  | { kind: "opportunity"; id: string }
  | { kind: "action"; id: string }
  | { kind: "savings"; id: string };
```

The server must verify that the record belongs to the authenticated organization before including it in context.

Show a removable context chip in the assistant header or composer, for example:

- `Viewing Vendor: AT&T Business`
- `Viewing Invoice: INV-2049`
- `Viewing Contract: Fiber Services`

When a user attaches a bill while a vendor context is active, offer that relationship as an explicit vendor hint. Do not silently force the hint if the user removes it.

## 5.6 Composer

The composer must support:

- text-only prompts
- attachment-only submission with an optional default prompt such as `Review this document`
- text and attachments together
- drag and drop
- paste-to-attach where browser support permits
- file picker
- optional vendor assignment per file
- multiline text
- Enter to send
- Shift + Enter for a newline
- stop or cancel while a request is pending using `AbortController`
- retry after a failed request
- a visible upload or processing state grounded in real server state
- draft persistence keyed by organization, session, and schema version

Do not claim fake stages or percentages. While the existing synchronous ingestion route is running, use honest language such as `Scanning and extracting securely`. Show specific states only after the server actually returns them.

Existing file support remains the baseline:

- PDF
- plain text
- DOCX
- maximum 20 MB per file

Recommended chat limit for the first production version:

- maximum 5 files per message
- maximum 50 MB total per message
- no more than 2 extraction requests in parallel from one browser

Viewers may ask text questions but must not upload. Owners, administrators, and members follow the existing document-editor authorization path.

## 5.7 Message presentation

Use stable message IDs. Never use array indexes as React keys.

Assistant messages contain:

- concise narrative
- visual response blocks when useful
- sources and evidence
- clear missing-data notices
- relevant follow-up suggestions
- copy action
- retry action on failure

Avoid large chat bubbles for assistant answers. Use an open reading layout in full-screen and a compact, lightly structured layout in the drawer. User messages may use a restrained tinted container.

Render plain text safely. Do not inject model-provided HTML. Do not add raw Markdown rendering unless it is implemented through an allowlisted parser with raw HTML disabled.

## 5.8 Suggested prompts

Suggestions must be contextual and generated from actual record conditions, not generic filler.

Examples:

- `Summarize this invoice and show what needs review.`
- `Which contracts have the nearest notice deadlines?`
- `Where did recurring spend increase most?`
- `Show the evidence behind our highest-value opportunity.`
- `Which invoices are still unmatched to a vendor?`
- `What requires an approval from me?`
- `Compare this vendor's latest two bills.`

Suggestions may be calculated by deterministic code and tailored to the current page.

---

# 6. Visual design system

Use the existing Costivra customer portal as the base system and refine it. Do not introduce an unrelated design language.

## 6.1 Design principles

- true white and cool neutral surfaces
- excellent system typography
- strong spacing and alignment
- restrained borders and shadows
- a small number of useful elevations
- calm blue accent inherited from the portal
- Costivra mark as the assistant identity
- low visual noise
- responsive density
- subtle material blur where supported
- motion that explains state change
- no imitation macOS window controls or Apple assets

## 6.2 Suggested tokens

Use existing portal variables where possible. Add assistant-specific tokens only when necessary:

```css
--assistant-bg: #fbfcfe;
--assistant-surface: rgba(255, 255, 255, 0.92);
--assistant-surface-strong: #ffffff;
--assistant-text: #141821;
--assistant-muted: #6f7888;
--assistant-border: rgba(31, 42, 61, 0.11);
--assistant-border-strong: rgba(31, 42, 61, 0.17);
--assistant-accent: var(--portal-action);
--assistant-accent-soft: rgba(49, 92, 255, 0.08);
--assistant-warning-soft: #fff8e8;
--assistant-danger-soft: #fff2f1;
--assistant-radius-sm: 10px;
--assistant-radius-md: 14px;
--assistant-radius-lg: 20px;
--assistant-shadow: 0 24px 70px rgba(16, 28, 48, 0.14);
--assistant-ease: cubic-bezier(0.22, 1, 0.36, 1);
```

Use a system font stack. Do not distribute or add proprietary font files.

## 6.3 Motion

Recommended durations:

- hover and focus: 120 to 160 ms
- small disclosure or menu: 170 to 220 ms
- drawer open: 260 to 340 ms
- drawer to full screen: 320 to 440 ms
- message and card reveal: 180 to 260 ms

Animate opacity and transforms where possible. Avoid animating large blurred surfaces continuously. Respect `prefers-reduced-motion` everywhere.

## 6.4 Accessibility

- keyboard access for every control
- visible focus rings
- restore focus to the top-bar trigger when the drawer closes
- trap focus only in modal overlay modes
- use `role="dialog"` and `aria-modal="true"` for overlay and full-screen modes
- use a complementary landmark if a wide-screen non-modal rail is implemented
- `aria-live="polite"` for status changes, not the entire transcript
- accessible names for icon-only controls
- non-color status labels
- minimum 44 px mobile targets where practical
- source cards and response cards must be reachable and operable by keyboard
- Escape closes the innermost history or inspector layer first, then the assistant

---

# 7. Visual response blocks and detail containers

The model must never generate arbitrary UI or HTML. It may request an allowlisted block type and tenant-scoped record IDs. The server validates those IDs, hydrates the block from authoritative data, and returns a typed visual payload.

## 7.1 Request schema

```ts
type AssistantBlockRequest =
  | { type: "invoice_summary"; invoiceId: string }
  | { type: "invoice_comparison"; invoiceIds: [string, string] }
  | { type: "vendor_summary"; vendorRelationshipId: string }
  | { type: "spend_trend"; vendorRelationshipId?: string; category?: string }
  | { type: "renewal_timeline"; contractIds: string[] }
  | { type: "opportunity"; opportunityId: string }
  | { type: "approval_queue"; actionIds: string[] }
  | { type: "document_ingestion"; documentId: string }
  | { type: "vendor_candidate"; vendorId: string; organizationVendorId: string }
  | { type: "evidence_list"; evidenceIds: string[] }
  | { type: "comparison_table"; recordKind: string; recordIds: string[] }
  | { type: "notice"; severity: "info" | "warning" | "error"; code: string };
```

The server must hydrate each request into a versioned `AssistantBlockV1` payload. Displayed totals, dates, deltas, and statuses come from deterministic server code, never from model prose.

## 7.2 Required cards

### Invoice summary

Show:

- vendor
- invoice number
- invoice date and due date
- service period
- total and amount due
- category
- reconciliation state
- vendor-match state
- extraction confidence
- review status
- source-document link

Mask account identifiers except the already approved last four.

### Invoice comparison

Show:

- two periods
- deterministic amount difference
- deterministic percentage difference when denominator is valid
- line-item changes when normalized data exists
- missing or incomparable fields
- source links for both invoices

Use decimal-safe money functions. Do not let the model calculate the change.

### Vendor summary

Show:

- canonical name and logo
- category
- public website or domain
- relationship status
- annualized spend
- related invoice, contract, opportunity, and action counts
- next contract deadline when deterministically available

### Spend trend

Use a restrained chart only when there are enough comparable periods. Always provide a text or table equivalent. Use real expense or invoice records and explicit date ranges.

### Renewal timeline

Show contracts ordered by the deterministic notice deadline, not only end date. Clearly distinguish missing notice periods.

### Opportunity

Show title, status, confidence, estimated value, evidence count, assumptions, and next authorized action. Never label estimated value as verified savings.

### Approval queue

Show actions that the current user may review, required approval count, current decisions, due date, and the route to the existing approval workflow. Chat must not approve from a generated card without the existing explicit review flow.

### Document ingestion result

Show real states returned by intake:

- duplicate
- quarantined
- rejected
- processing only when genuinely persisted as processing
- ready
- needs review
- failed

When an invoice record exists, include a link to the invoice detail page.

### Vendor candidate

Show:

- extracted vendor name
- proposed canonical name
- proposed public domain
- proposed category
- candidate confidence
- resolution method
- public evidence count
- Suggested or Needs review status
- link to the originating invoice or review screen

Never display the originating tenant in the global catalog view.

## 7.3 Expanded detail experience

Clicking a response card opens an assistant-owned detail container:

- drawer mode: an internal sliding inspector within the assistant surface
- full-screen mode: the right evidence inspector
- mobile: a full-screen subview with a clear Back control

Avoid stacking an uncontrolled second browser-level modal on top of the assistant dialog. Keep focus management inside the assistant surface.

## 7.4 Example mapping from prompt to block

| User intent | Primary block |
|---|---|
| "What is this bill?" | document ingestion plus invoice summary |
| "What changed?" | invoice comparison |
| "Tell me about this vendor" | vendor summary |
| "Where is spend rising?" | spend trend plus comparison table |
| "What renews next?" | renewal timeline |
| "What needs my approval?" | approval queue |
| "Why was this opportunity created?" | opportunity plus evidence list |
| "Who is this unknown vendor?" | vendor candidate |

Cards are optional when plain prose is clearer. Do not force every answer into a grid of boxes.

---

# 8. Frontend architecture

Do not continue growing the client assistant inside the already large `portal-pages.tsx` file.

Create a focused feature directory such as:

```text
src/components/client-assistant/
  client-assistant-provider.tsx
  client-assistant-trigger.tsx
  client-assistant-surface.tsx
  assistant-header.tsx
  conversation-rail.tsx
  conversation-list.tsx
  message-thread.tsx
  message-item.tsx
  assistant-composer.tsx
  attachment-tray.tsx
  attachment-item.tsx
  assistant-inspector.tsx
  safe-rich-text.tsx
  response-block-renderer.tsx
  response-blocks/
    invoice-summary-card.tsx
    invoice-comparison-card.tsx
    vendor-summary-card.tsx
    spend-trend-card.tsx
    renewal-timeline-card.tsx
    opportunity-card.tsx
    approval-queue-card.tsx
    document-ingestion-card.tsx
    vendor-candidate-card.tsx
    evidence-list.tsx
  client-assistant.css
```

Supporting client types and state may live under:

```text
src/lib/client-assistant/
  types.ts
  schemas.ts
  reducer.ts
  api-client.ts
  date-groups.ts
```

## 8.1 Provider state

Use one reducer or state machine instead of many conflicting booleans:

```ts
type AssistantMode = "closed" | "drawer" | "fullscreen";

type ClientAssistantState = {
  mode: AssistantMode;
  activeSessionId: string | null;
  localDraftId: string | null;
  historyOpen: boolean;
  inspector: null | { kind: string; id: string };
  sessionsStatus: "idle" | "loading" | "ready" | "error";
  messagesStatus: "idle" | "loading" | "ready" | "error";
  sending: boolean;
  currentContext: AssistantContextRef | null;
  pendingAttachments: ClientAssistantAttachment[];
};
```

Persist only minimal, versioned local UI state. Do not persist document content or full transcripts in local storage.

## 8.2 App-shell integration

- Mount `ClientAssistantProvider` at the customer shell level so it remains available across routes.
- Add `ClientAssistantTrigger` to the top bar.
- Dynamically import heavy assistant UI so the initial customer bundle does not pay the full cost before the assistant is opened.
- Pass only display-safe user or organization details into the client provider.
- API routes infer the organization and permissions from the authenticated session.
- Do not send an organization ID from the browser as an authority signal.

## 8.3 `/app/ask` compatibility

- Keep `/app/ask` as the full-screen entry point.
- Replace the old page-local `Ask` implementation with a route bridge or full-screen mode signal to the shell-level assistant.
- Avoid rendering a second assistant underneath the shell-level one.
- Preserve old bookmarks.

## 8.4 Shared UI with `/manage`

It is acceptable to extract neutral primitives such as surface chrome, composer framing, source cards, or typing indicators if doing so does not risk internal assistant behavior.

Do not share:

- API routes
- prompt policy
- customer and CRM data types
- authorization rules
- tenant retrieval code
- record source builders

Customer and internal assistants have different trust boundaries.

---

# 9. Chat APIs and repository layer

Create a typed server-side chat repository. Keep Supabase queries out of React components and model prompts.

Recommended API surface:

```text
GET    /api/portal/chat/sessions
POST   /api/portal/chat/sessions
GET    /api/portal/chat/sessions/[id]
PATCH  /api/portal/chat/sessions/[id]
DELETE /api/portal/chat/sessions/[id]        # archive, not hard delete
POST   /api/portal/chat/attachments
POST   /api/portal/chat/sessions/[id]/messages
POST   /api/portal/chat/messages/[id]/retry
```

## 9.1 Session list response

Return only safe summary fields:

```ts
type ChatSessionSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  pinnedAt: string | null;
  archivedAt: string | null;
  lastMessagePreview: string | null;
  messageCount: number;
};
```

Use cursor pagination based on `updated_at` plus `id`.

## 9.2 Session detail response

```ts
type ChatSessionDetail = {
  session: ChatSessionSummary;
  messages: ClientChatMessage[];
  nextOlderCursor: string | null;
};
```

Validate that the session belongs to the current organization and current user. Legacy organization-shared sessions with a null `user_id` may remain readable according to current policy, but all new client sessions must set `user_id`.

## 9.3 Attachment route

`POST /api/portal/chat/attachments` is a thin adapter around `ingestManualUpload`. It must not fork extraction logic.

Input:

- multipart file
- optional validated organization-vendor relationship hint
- optional validated current-view context
- client upload ID for idempotent UI reconciliation

Output:

```ts
type ChatAttachmentResult = {
  clientUploadId: string;
  documentId: string;
  outcome: "processed" | "duplicate" | "quarantined" | "rejected";
  status?: string;
  warning?: string;
  invoiceId?: string | null;
  vendorMatchStatus?: string | null;
  reviewStatus?: string | null;
};
```

Do not return storage paths, SHA-256 unless needed for a user-facing duplicate explanation, provider errors, or sensitive extraction payloads.

## 9.4 Message route

Accept:

```ts
type SendClientMessageInput = {
  clientRequestId: string;
  text: string;
  attachmentDocumentIds: string[];
  contextRef: AssistantContextRef | null;
};
```

The route must:

1. authenticate and resolve the current organization and user
2. verify the session belongs to that user and organization
3. verify every document ID belongs to the organization and was authorized for use
4. verify the context record belongs to the organization
5. insert the user message idempotently
6. link attached documents to the user message
7. build bounded tenant context
8. call the model through the server-only adapter
9. validate the returned response schema
10. hydrate block requests from authoritative records
11. validate citations against the allowed evidence set
12. persist the assistant message, hydrated blocks, citations, model identifier, trace ID, and completion state
13. update the session timestamp and title
14. return the persisted messages

Use a unique client request ID so retries cannot duplicate the same user and assistant turn.

## 9.5 Response transport

The first complete implementation may keep the current validated non-streaming model response. Use an honest thinking state and reveal the final answer smoothly.

Design the transport so a future SSE narrative stream can be added without changing persisted message or block schemas. Do not ship a fragile partial-JSON parser merely to imitate token streaming.

---

# 10. Assistant response contract

Create a versioned, validated response contract.

Model output should contain narrative, citation IDs, suggested block requests, and suggested follow-up prompts. The model does not supply trusted financial payloads.

```ts
type ClientAssistantModelOutputV1 = {
  version: "client-assistant-v1";
  answer: string;
  citationIds: string[];
  blockRequests: AssistantBlockRequest[];
  followUps: string[];
  missingInformation: string[];
};
```

After validation and hydration, persist and return:

```ts
type ClientAssistantResponseV1 = {
  version: "client-assistant-v1";
  answer: string;
  citations: ClientCitation[];
  blocks: AssistantBlockV1[];
  followUps: string[];
  missingInformation: string[];
  generatedAt: string;
};
```

Hard limits:

- answer: maximum 8,000 characters
- citations: maximum 10
- blocks: maximum 6
- follow-ups: maximum 4
- missing-information items: maximum 8
- record IDs must be from the supplied tenant context
- unsupported block types are discarded and audited as validation failures
- if all blocks fail, still render the validated answer and citations

Do not import a validation library unless it is already installed or intentionally added for several durable contracts and recorded in `DECISIONS.md`. The existing repository uses explicit parsers successfully; a hand-written discriminated-union parser is acceptable.

---

# 11. Grounding and retrieval

Replace the current broad data dump with a bounded context builder under `src/lib/client-assistant/`.

Recommended modules:

```text
src/lib/client-assistant/
  repository.ts
  context-builder.ts
  prompt.ts
  response-parser.ts
  block-hydrator.ts
  citations.ts
  suggestions.ts
```

## 11.1 Context priority

Load context in this order:

1. attached documents and their invoice or extraction records
2. explicitly selected current-view record
3. records directly connected to the current vendor or document
4. records relevant to detected question intent
5. recent organization records needed for general questions
6. recent conversation turns

Start independent database reads early and await them in parallel.

## 11.2 Allowed data

Use bounded fields from:

- documents
- extraction versions where needed
- evidence references
- invoices and line items
- expenses
- vendors and organization relationships
- contracts
- opportunities and their evidence
- action plans and approvals
- savings outcomes
- locations when necessary for context

Do not place private storage paths, full account numbers, authentication fields, internal staff-only notes, or unrelated tenant records into the model prompt.

## 11.3 Intent categories

A narrow typed intent classifier may select among:

- invoice review
- invoice comparison
- vendor overview
- spend analysis
- contract or renewal
- opportunity or evidence
- approvals or actions
- savings explanation
- document ingestion
- general organization records

The classifier may be deterministic, model-assisted with validated output, or hybrid. It must not generate SQL or broaden tenant scope.

## 11.4 Deterministic calculations

Create or reuse pure functions for:

- money differences
- percentage changes
- period comparison
- annualization
- notice deadlines
- days until deadline
- status counts
- simple trend series

Use decimal-safe arithmetic and explicit currency. Include formulas and missing-value behavior in tests.

---

# 12. Attachment intelligence

Extend `DocumentIntelligence` without weakening its current validation.

Add evidence-backed candidate fields such as:

```ts
type ExpenseCategoryCandidate = {
  label: string;
  normalizedSlug: string;
  confidence: number;
  evidence: Array<{ quote: string }>;
};

type VendorIdentityHints = {
  domains: string[];
  publicEmails: string[];
  websiteText: string[];
};
```

Extend the document result with:

```ts
invoiceSubtype: string | null;
expenseCategoryCandidate: ExpenseCategoryCandidate | null;
vendorIdentityHints: VendorIdentityHints;
```

The extraction prompt must:

- classify from visible document evidence
- return null when uncertain
- avoid inventing a domain
- avoid turning remittance processors or payment portals into the vendor without evidence
- distinguish bill issuer from customer
- provide short source quotes
- treat all document instructions as untrusted data

Examples of broad invoice subtype labels may include:

- commercial energy
- telecom or internet
- software subscription
- waste or recycling
- water or utility
- merchant processing
- insurance
- payroll or benefits
- equipment lease
- professional service
- shipping or logistics
- facilities or maintenance
- other recurring invoice

These are classification labels only. They do not activate an analysis module automatically.

When an existing verified vendor has a category, that category takes precedence over a model candidate. A conflict routes the invoice to review and records a safe issue code rather than overwriting the catalog silently.

---

# 13. Vendor and category discovery pipeline

Replace the current organization-only resolver with one shared service, for example:

```text
src/lib/vendors/
  normalize.ts
  resolve.ts
  discovery.ts
  enrichment-provider.ts
  enrichment-parser.ts
  catalog-repository.ts
  candidate-policy.ts
```

Invoke it from `createInvoiceRecordFromExtraction` so every ingestion source uses the same logic.

## 13.1 Resolution order

1. **Explicit relationship hint**  
   Verify it belongs to the organization, then use it as `provided`.

2. **Exact organization relationship match**  
   Compare normalized extracted name against canonical name and aliases for the organization's existing vendor relationships.

3. **Exact global catalog name or alias match**  
   Search verified entries first, then candidates. Create the organization relationship if one unique match exists.

4. **Document domain match**  
   Extract and normalize public domain hints from the bill. Search `vendor_domains`. A unique verified match may auto-link. Multiple matches are ambiguous.

5. **Bounded public enrichment**  
   Send only public-safe hints such as extracted name and already visible domain candidates to a server-only enrichment provider.

6. **Candidate creation**  
   When no catalog match exists, create or reuse a global vendor candidate and category candidate through an idempotent transaction.

7. **Organization relationship**  
   Create an active organization relationship because the invoice is evidence of an existing vendor relationship. Keep the vendor candidate state visible.

8. **Review classification**  
   Candidate or ambiguous matches remain `needs_review` even when linked, unless existing policy explicitly proves the identity.

## 13.2 Match states

Extend the invoice vendor-match constraint to support honest resolution methods:

```text
provided
exact
catalog_exact
domain
enriched_candidate
ambiguous
unmatched
```

Add a numeric match confidence and a resolution method field or equivalent structured metadata. Do not overload `exact` to hide an internet-only suggestion.

## 13.3 Normalization

Implement deterministic normalization for:

- Unicode normalization
- casing
- repeated whitespace
- punctuation
- common company suffixes for comparison only
- `www` and scheme removal for domains
- public-suffix-aware registrable domains

Do not use naive last-two-label parsing for domains. If a robust public suffix implementation is not already present, add a small vetted dependency only after documenting the need in `DECISIONS.md`.

Never fuzzy-auto-merge two vendors. Fuzzy similarity may rank review candidates but cannot be the only reason for a global merge.

## 13.4 Public web enrichment contract

Use a replaceable provider interface:

```ts
type VendorEnrichmentInput = {
  extractedName: string;
  domainHints: string[];
  categoryHint: string | null;
};

type VendorEnrichmentCandidate = {
  canonicalName: string;
  domains: string[];
  categoryName: string | null;
  aliases: string[];
  confidence: number;
  sources: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
};

interface VendorEnrichmentProvider {
  search(input: VendorEnrichmentInput): Promise<VendorEnrichmentCandidate[]>;
}
```

Provider requirements:

- server-only
- current official API documentation verified before implementation
- timeout no longer than 8 to 10 seconds for the synchronous path
- bounded results
- one bounded retry only for safe transient errors
- circuit-breaker behavior
- rate limiting by organization and document
- cache by normalized public query fingerprint
- structured output validation
- URLs validated as public HTTP or HTTPS
- no arbitrary URL fetching from model instructions
- SSRF protections if the server later fetches a page
- public evidence stored with provenance
- no invoice amount, account identifier, service address, document excerpt, customer name, or sender address sent to the search provider

Enrichment failure must never block invoice ingestion. Create an unresolved candidate with category `Other` or the evidence-backed document category, mark enrichment pending or failed safely, and route to review.

## 13.5 Candidate policy

A vendor candidate may be created only when:

- the document is classified as an invoice or statement
- a non-generic vendor name is present
- no exact organization or catalog match exists
- the candidate passes length and character validation
- no conflicting unique domain or exact normalized name is found
- a source document ID is recorded
- creation limits have not been exceeded

Reject or review generic names such as `Invoice`, `Billing Department`, `Accounts Receivable`, or `Customer Service`.

Each invoice may create at most one new vendor candidate and one new category candidate.

## 13.6 Global catalog visibility

Verified catalog entries rank first. Candidate entries are globally searchable with:

- Suggested label
- candidate category
- public website or domain when known
- no originating customer information

Rejected and merged entries are hidden from normal search. Merged entries redirect internally to the surviving vendor.

Replace any future unbounded `vendorCatalog` serialization with a paginated search route:

```text
GET /api/portal/vendor-catalog?q=&category=&cursor=&limit=
```

Search by canonical name, aliases, domain, and category. Limit results and rank verified exact matches first.

## 13.7 Human correction and catalog learning

When a user or internal reviewer corrects a candidate:

- preserve the original extracted value
- record actor, timestamp, reason, and source
- update only the tenant relationship and invoice immediately when global truth is uncertain
- submit a catalog correction event
- never overwrite a verified global vendor silently
- support merge into an existing canonical vendor
- move invoice, document, and organization relationship references transactionally
- retain the old name as an alias when appropriate

Add a compact candidate review capability to the existing internal invoice-review or intake surface. Do not build a separate oversized admin product for this milestone.

---

# 14. Database migration contract

Create one or more reviewed migrations with actual timestamps. Preserve existing data and backward compatibility.

## 14.1 Chat session enhancements

Recommended additions to `chat_sessions`:

```text
pinned_at timestamptz null
archived_at timestamptz null
last_message_at timestamptz null
metadata jsonb not null default '{}'
```

Backfill `last_message_at` from the newest existing message or `updated_at`.

Add an index suitable for personal history:

```text
(organization_id, user_id, archived_at, pinned_at desc, last_message_at desc, id)
```

## 14.2 Chat message enhancements

Recommended additions to `chat_messages`:

```text
client_request_id uuid null
status text not null default 'complete'
response_schema_version text null
response_blocks jsonb not null default '[]'
metadata jsonb not null default '{}'
model_identifier text null
trace_id uuid null
error_code text null
completed_at timestamptz null
```

Suggested status values:

```text
pending
complete
failed
cancelled
```

Add a unique idempotency index scoped to a session for non-null `client_request_id`.

## 14.3 Chat attachment mapping

Create `chat_message_documents` or `chat_message_attachments`:

```text
id uuid primary key
message_id uuid not null references chat_messages(id) on delete cascade
document_id uuid not null references documents(id) on delete restrict
relationship_type text not null default 'attachment'
created_at timestamptz not null default now()
unique(message_id, document_id, relationship_type)
```

The table must not create a new copy of the document.

## 14.4 Vendor catalog lifecycle

Extend `vendors` with fields equivalent to:

```text
normalized_name text
category_id uuid null
catalog_status text not null default 'verified'
created_source text not null default 'manual'
source_confidence numeric null
verified_at timestamptz null
verified_by uuid null
updated_at timestamptz not null default now()
```

Suggested catalog states:

```text
candidate
verified
rejected
merged
```

Suggested sources:

```text
seed
manual
document
internet_enrichment
internal_review
```

Backfill existing vendors as verified unless existing data proves they are suggested. Existing `is_suggested` can remain for compatibility during migration, but define one authoritative lifecycle field and update readers consistently.

Do not remove `vendors.category` immediately. Backfill and dual-write it while migrating current UI and repository types to `category_id`.

## 14.5 Vendor categories

Create a global public-identity taxonomy table:

```text
vendor_categories
  id uuid primary key
  name text not null
  slug text not null unique
  parent_id uuid null references vendor_categories(id)
  status text not null
  created_source text not null
  source_confidence numeric null
  merged_into_id uuid null references vendor_categories(id)
  created_at timestamptz not null default now()
  updated_at timestamptz not null default now()
  verified_at timestamptz null
```

Suggested states:

```text
candidate
verified
retired
merged
```

Category creation must normalize the slug and reuse an existing candidate or verified category when the slug matches.

## 14.6 Vendor domains

Create:

```text
vendor_domains
  id uuid primary key
  vendor_id uuid not null references vendors(id) on delete cascade
  domain text not null
  normalized_domain text not null
  is_primary boolean not null default false
  status text not null
  source text not null
  confidence numeric null
  created_at timestamptz not null default now()
  verified_at timestamptz null
  unique(vendor_id, normalized_domain)
```

Index `normalized_domain`. Do not force one vendor per domain because parent companies or shared platforms can legitimately create ambiguity.

## 14.7 Enrichment provenance

Create a browser-inaccessible `vendor_enrichment_runs` table with:

```text
id uuid primary key
organization_id uuid null
document_id uuid null
invoice_id uuid null
extracted_vendor_name text not null
query_fingerprint text not null
provider text not null
status text not null
candidate_vendor_id uuid null
candidate_category_id uuid null
confidence numeric null
public_evidence jsonb not null default '[]'
safe_metadata jsonb not null default '{}'
error_code text null
created_at timestamptz not null default now()
completed_at timestamptz null
```

Never store full document text or sensitive search input in this table.

## 14.8 Invoice resolution fields

Add or formalize:

```text
vendor_match_confidence numeric null
vendor_resolution_method text null
expense_category_id uuid null references vendor_categories(id)
category_confidence numeric null
invoice_subtype text null
```

Preserve `expense_category` as a display snapshot during migration.

## 14.9 Atomic candidate upsert

Use a transaction or a narrowly scoped service-role-only PostgreSQL function to:

1. lock or conflict-check the normalized identity
2. reuse an existing vendor or candidate
3. reuse or create the category candidate
4. insert public domain evidence
5. create the organization relationship idempotently
6. update the invoice and document relationship
7. record audit and enrichment provenance

Do not let an agent generate SQL. The function arguments must be typed, validated, and supplied by server code.

## 14.10 RLS and privileges

- New chat tables and rows remain readable only by authorized organization members and the owning user.
- New chat writes occur through authenticated server routes.
- `vendor_categories`, eligible `vendors`, and eligible `vendor_domains` may be globally readable as public catalog identity data for authenticated users.
- `organization_vendors`, invoices, documents, chat attachments, and enrichment provenance remain tenant-scoped or server-only.
- Browser roles must not read `vendor_enrichment_runs`.
- Candidate visibility must filter out rejected and merged records.
- Add cross-tenant tests before applying the migration.

---

# 15. Ingestion result flow

For a chat attachment:

1. User selects or drops a file.
2. Client validates obvious type and size constraints without treating client validation as authority.
3. UI creates a local attachment row with a stable client upload ID.
4. Client posts the file to `/api/portal/chat/attachments`.
5. Server runs the existing manual-upload authorization and malware boundary.
6. Existing document intake stores, extracts, cites, reconciles, and creates the invoice when possible.
7. Shared vendor resolution attempts organization, global catalog, domain, and bounded enrichment matches.
8. A global candidate and category candidate are created only through candidate policy.
9. The response returns document, invoice, vendor-resolution, and review states.
10. UI renders a document-ingestion card.
11. When the user sends the message, the document is linked to the user message.
12. The assistant answers with the attached document at the highest grounding priority.

Duplicate documents must link to the existing authorized document and explain the duplicate instead of uploading another source copy.

Quarantined or rejected files must never be supplied to the model or made downloadable.

---

# 16. Error and recovery states

Design every state deliberately.

## 16.1 Chat

- session list unavailable
- transcript unavailable
- answer generation timeout
- invalid structured model output
- citation validation failure
- aborted request
- offline or network loss
- stale session
- archived session selected

A failed assistant turn remains visible with Retry. Do not duplicate the user message on retry.

## 16.2 Attachments

- unsupported type
- too large
- duplicate
- malware rejected
- scanner unavailable and quarantined
- no readable text
- OCR failure
- extraction validation failure
- invoice classified but required fields missing
- vendor ambiguous
- vendor enrichment unavailable
- category conflict
- database persistence failure

Use plain language. Preserve safe diagnostic codes for support but do not expose provider secrets or raw errors.

## 16.3 Vendor discovery

- no safe public hints
- no search result
- conflicting domains
- several catalog candidates
- candidate-creation rate limit
- provider timeout
- invalid provider response
- candidate created but awaiting review

An enrichment failure does not fail the invoice. It changes the vendor state and review path.

---

# 17. Performance requirements

- dynamically load the assistant surface after first intent to open
- fetch sessions and current suggestions in parallel
- cursor paginate sessions and long transcripts
- use `content-visibility` for long history lists where appropriate
- minimize data passed from server components into the client shell
- do not serialize the growing global vendor catalog in `PortalData`
- use a paginated server search endpoint for vendor selection
- memoize expensive response cards only when profiling indicates a need
- use stable callbacks and functional state updates
- abort stale message, session, and search requests
- debounce session and vendor search
- cap model context and record counts
- start independent server queries early and await late
- add timeouts for model and enrichment providers
- keep the assistant functional when enrichment is down

The top-bar and main workspace must remain responsive while the assistant loads.

---

# 18. Security and privacy checklist

- tenant scope rechecked on every API call
- session belongs to authenticated user and organization
- context record belongs to organization
- every attachment document belongs to organization
- no browser-supplied organization authority
- no service key in client code
- private storage only
- signed document access only after status authorization
- prompt injection defense in document and web contexts
- no raw HTML from model or websites
- no arbitrary web fetch from model URLs
- SSRF-safe public URL handling
- public enrichment queries contain vendor identity hints only
- global vendor records contain public identity only
- provenance and tenant linkage are not globally readable
- candidate creation rate limited and idempotent
- audit events contain safe metadata only
- logs exclude prompt text, document text, account numbers, amounts, and source excerpts unless an existing protected trace policy explicitly permits them
- no autonomous external actions
- no hidden UCEP referral or data sharing

---

# 19. Audit and observability

Add safe audit events such as:

```text
chat.session_created
chat.session_renamed
chat.session_archived
chat.message_submitted
chat.answer_completed
chat.answer_failed
chat.attachment_uploaded
chat.attachment_quarantined
vendor.discovery_started
vendor.discovery_completed
vendor.discovery_failed
vendor.candidate_created
vendor.category_candidate_created
vendor.relationship_linked
vendor.candidate_corrected
vendor.candidate_merged
```

Safe metadata may include:

- resource IDs
- route context kind
- result status
- file count and bounded size buckets
- model identifier
- provider identifier
- duration
- confidence
- citation count
- block types
- error code
- trace ID

Do not log raw questions, answers, invoice excerpts, public search snippets, or sensitive document fields in ordinary application logs.

Track operational metrics:

- assistant open rate
- successful and failed answer rate
- median and p95 answer latency
- session restore success
- attachment outcome by state
- duplicate rate
- invoice classification success
- vendor exact, domain, candidate, ambiguous, and unmatched rates
- enrichment latency and failure rate
- candidate confirmation and merge rate
- response block validation failures

The product north star remains verified customer value, not message volume.

---

# 20. Implementation sequence

Build small, reviewable vertical slices. Each slice must work before moving on.

## Slice 1: Shell and assistant surface

- remove left-nav Ask item
- add top-bar trigger
- extract client assistant components
- drawer open, close, focus, responsive behavior
- full-screen mode and transition
- `/app/ask` compatibility
- current-view context chip
- text composer using the existing answer route through a temporary adapter

## Slice 2: Durable conversations

- migrations for session and message enhancements
- session list, detail, rename, pin, archive endpoints
- conversation rail
- refresh restoration
- local blank draft behavior
- message retry and cancellation
- cursor pagination

## Slice 3: Structured answers

- versioned model-output parser
- block-request validation
- server block hydration
- response renderer
- invoice, vendor, renewal, opportunity, approval, evidence, and notice cards
- assistant-owned inspector
- safe rich text

## Slice 4: Chat attachments

- chat attachment adapter around `ingestManualUpload`
- drag, drop, paste, file picker
- per-file vendor hint
- honest states
- message-document mapping
- ingestion result card
- attached-document grounding

## Slice 5: Shared vendor and category discovery

- schema migration
- normalized resolution service
- global catalog and domain lookup
- provider adapter
- bounded public enrichment
- idempotent candidate creation
- candidate review state
- global catalog search endpoint
- invoke from shared invoice record creation, not only chat

## Slice 6: Hardening and polish

- mobile and reduced-motion QA
- keyboard and screen-reader behavior
- dead chat CSS cleanup
- performance pass
- audit and metrics
- integration and tenant-isolation tests
- visual browser review against `/manage` and the client portal
- production readiness documentation

Do not collapse these slices into one giant component or one oversized route.

---

# 21. Expected file changes

Codex must inspect the current branch and adjust this list if the architecture has moved.

Likely modifications:

```text
src/components/app-shell.tsx
src/components/portal-pages.tsx
src/components/manage-ai-drawer.tsx            # only if extracting neutral primitives safely
src/app/globals.css
src/app/api/portal/ask/route.ts                 # compatibility adapter
src/app/api/portal/documents/route.ts           # only shared response helpers if needed
src/lib/portal/types.ts
src/lib/portal/repository.ts
src/lib/ai/openrouter.ts                        # shared transport or metadata only
src/lib/ai/document-intelligence.ts
src/lib/documents/intake.ts
src/lib/documents/invoice-record.ts
src/lib/domain/invoice-review.ts
DECISIONS.md
STATUS.md
package.json                                    # only for justified dependencies
```

Likely additions:

```text
src/components/client-assistant/**
src/lib/client-assistant/**
src/lib/vendors/normalize.ts
src/lib/vendors/resolve.ts
src/lib/vendors/discovery.ts
src/lib/vendors/enrichment-provider.ts
src/lib/vendors/enrichment-parser.ts
src/lib/vendors/catalog-repository.ts
src/lib/vendors/candidate-policy.ts
src/app/api/portal/chat/sessions/route.ts
src/app/api/portal/chat/sessions/[id]/route.ts
src/app/api/portal/chat/sessions/[id]/messages/route.ts
src/app/api/portal/chat/messages/[id]/retry/route.ts
src/app/api/portal/chat/attachments/route.ts
src/app/api/portal/vendor-catalog/route.ts
supabase/migrations/<timestamp>_client_assistant_v2.sql
supabase/migrations/<timestamp>_vendor_catalog_discovery.sql
```

Add focused unit, route, integration, and E2E tests beside the relevant modules or in the existing test structure.

---

# 22. Required test matrix

## 22.1 Unit tests

- session grouping by organization timezone
- assistant reducer transitions
- draft-key versioning
- response-schema parser
- unsupported block rejection
- block hydration with allowed and forbidden record IDs
- money and percentage comparison edge cases
- notice deadline calculations
- vendor-name normalization
- domain normalization
- generic vendor-name rejection
- exact organization match
- exact catalog match
- verified domain match
- ambiguous domain
- candidate policy
- category slug reuse
- provider response validation
- public-safe enrichment input builder
- no sensitive document fields in enrichment input
- model prompt injection fixtures

## 22.2 Route tests

- unauthenticated session list denied
- cross-tenant session read denied
- another user's personal session denied
- session rename, pin, and archive authorized correctly
- idempotent message request
- invalid context ID rejected
- cross-tenant document attachment rejected
- viewer upload denied
- member upload accepted
- quarantined file never reaches assistant context
- invalid response schema produces a safe failed turn
- citations outside the allowed set are discarded
- vendor catalog route excludes rejected and merged entries

## 22.3 Integration tests

- existing chat sessions remain readable after migration
- first message creates a personal session
- transcript persists after reload
- attached invoice uses the existing ingestion pipeline
- duplicate chat attachment reuses the existing document
- forwarded invoice and chat invoice share vendor resolution behavior
- unknown vendor creates one candidate under concurrent ingestion
- organization relationship is idempotent
- no candidate data leaks tenant details
- verified vendor category wins over conflicting model category
- enrichment failure leaves a reviewable invoice
- candidate merge preserves references
- RLS denies cross-tenant chat, attachment, invoice, and relationship access

## 22.4 E2E browser tests

Desktop and mobile:

1. Sign in to a disposable customer workspace.
2. Confirm Ask Costivra is absent from the left navigation.
3. Open it from the top-right control.
4. Verify focus enters the assistant and Escape restores focus.
5. Send a text-only question.
6. Confirm the answer and source cards render.
7. Start a new chat with the plus control.
8. Reopen the previous conversation from history.
9. Rename, pin, and archive a session.
10. Expand the drawer to full screen and confirm the current state is preserved.
11. Return to drawer mode without transcript loss.
12. Attach a known invoice and receive a real ingestion card.
13. Attach the same invoice again and receive the duplicate outcome.
14. Verify an unknown vendor becomes a reviewable candidate without exposing tenant data in catalog search.
15. Refresh and confirm the transcript and session restore.
16. Verify mobile uses a usable full-screen surface with no overflow.
17. Verify reduced-motion behavior.
18. Check browser console and runtime logs for errors.

## 22.5 AI and extraction evaluations

Add fixtures for:

- clear software invoice
- telecom bill
- commercial energy invoice
- statement rather than invoice
- vendor legal name different from brand
- payment processor named more prominently than issuer
- invoice containing prompt-injection text
- no website or email
- conflicting website and vendor name
- multiple domains
- generic issuer label
- low-confidence category
- unseen valid category
- category disagreement between document and verified catalog

The expected result must distinguish extraction confidence, vendor resolution confidence, reconciliation, and human review state.

---

# 23. Acceptance criteria

The implementation is complete only when all of the following are true.

## Navigation and surface

- [ ] Ask Costivra is removed from the desktop left navigation.
- [ ] A top-right assistant trigger is available throughout `/app`.
- [ ] Drawer mode opens and closes smoothly.
- [ ] Full-screen mode uses the same active session and draft.
- [ ] Drawer-to-full-screen motion respects reduced motion.
- [ ] `/app/ask` opens the full-screen assistant.
- [ ] Mobile has no clipped content or inaccessible controls.

## Conversations

- [ ] New-chat plus control is always available.
- [ ] Session history is loaded from Supabase.
- [ ] Conversations survive refresh and route changes.
- [ ] Rename, pin, archive, and archived browsing work.
- [ ] Sessions remain personal by default.
- [ ] Long history is paginated.

## Input and attachments

- [ ] Text-only input works.
- [ ] Attachment-only input works.
- [ ] Text plus attachments works.
- [ ] Chat uploads reuse the existing malware, storage, extraction, evidence, reconciliation, review, and audit path.
- [ ] Duplicate, quarantined, rejected, ready, and needs-review states are honest.
- [ ] Viewers cannot upload.
- [ ] Attached documents are linked to the originating message.

## Responses

- [ ] Responses use a versioned validated schema.
- [ ] The model cannot supply trusted financial display values.
- [ ] Typed cards render from authoritative data.
- [ ] Source and evidence navigation works.
- [ ] Missing information is visible.
- [ ] No model HTML is injected.
- [ ] Invalid blocks fail gracefully.

## Vendor discovery

- [ ] Resolution checks provided relationship, organization match, global catalog, domain, and enrichment in order.
- [ ] Unknown invoice vendors can create a global candidate and organization relationship.
- [ ] Unknown categories can create or reuse a category candidate.
- [ ] Candidate creation is idempotent and rate limited.
- [ ] Candidate catalog entries contain public identity only.
- [ ] Verified entries rank before candidates.
- [ ] Ambiguous or candidate matches route to review.
- [ ] The shared resolver runs for all invoice ingestion sources.
- [ ] Enrichment failure does not fail invoice ingestion.

## Security and operations

- [ ] Cross-tenant tests pass.
- [ ] Another user cannot read a personal session.
- [ ] Public enrichment receives no sensitive invoice data.
- [ ] Provider and storage secrets remain server-only.
- [ ] Safe audit events are written.
- [ ] Migrations are committed and documented.
- [ ] Supabase security and performance advisors are reviewed after migration.
- [ ] `DECISIONS.md` and `STATUS.md` reflect the final architecture and validation results.

---

# 24. Required validation commands

Run the commands supported by the current repository and record exact results in `STATUS.md`:

```bash
npm run typecheck
npm run lint
npm run test
npm run test:integration
npm run test:e2e
npm run eval:invoices
npm run build
npm run ops:readiness
npm run ops:smoke
```

Use targeted tests while iterating, then run the complete relevant suite before declaring completion.

After database changes:

- generate or refresh TypeScript database types if the repository uses generated types
- run Supabase security advisors
- run Supabase performance advisors
- inspect every new RLS policy and index
- verify migration history is recorded correctly

Do not claim production readiness while known environment blockers remain. Distinguish code completion from external provider configuration.

---

# 25. Visual QA checklist

Capture the rendered customer assistant at:

- wide desktop drawer
- laptop drawer
- wide desktop full screen
- tablet
- mobile portrait
- long transcript
- empty state
- history open
- attachment processing
- invoice response card
- vendor-candidate response card
- evidence inspector
- error state

Review:

- top-bar balance with Search and Upload documents
- consistent Costivra identity
- drawer alignment and edge spacing
- readable line length
- composer stability
- history density
- no nested-card clutter
- no excessive pills or badges
- no accidental cream or warm tint where the portal uses cool white
- crisp border, shadow, and radius hierarchy
- icon consistency and optical alignment
- motion continuity
- focus visibility
- mobile safe areas
- reduced-motion fallback

The result should look designed for controllers, owners, and finance leaders, not like a generic chatbot template wearing Costivra colors.

---

# 26. Explicit non-goals for this milestone

- unrestricted general web browsing from client chat
- autonomous vendor negotiation
- automatic contract acceptance, cancellation, or renewal
- automatic approval decisions
- sending vendor email from chat
- automatic UCEP referral
- declaring legal, tax, regulatory, or professional conclusions
- activating savings logic for every newly created category
- cross-tenant benchmarking
- shared organization-wide chats
- voice mode
- image generation
- replacing the existing document review console
- replacing the structured portal with chat

---

# 27. Final handoff requirements

At completion, provide:

1. concise summary of what changed
2. migration names and status
3. exact tests and commands run
4. browser paths verified
5. screenshots or visual QA evidence
6. remaining external configuration requirements
7. known risks or deferred improvements
8. confirmation that no tenant data is included in global vendor catalog records
9. confirmation that all ingestion sources use the same vendor discovery path
10. confirmation that `/api/portal/ask` no longer diverges from the new service

Do not leave placeholder buttons, inert menus, fake upload progress, example customer data, unvalidated model blocks, or unconnected history controls.

---

# 28. First actions for Codex

1. Read `AGENTS.md`, `COSTIVRA_AGENTIC_BUSINESS_BLUEPRINT.md`, `DECISIONS.md`, and `STATUS.md`.
2. Inspect the current versions of every file named in the verified-current-state section.
3. Search for all `Ask Costivra`, `portal-chat`, `ask-page`, `chat_sessions`, `chat_messages`, `vendor_match_status`, and `is_suggested` references.
4. Run the current typecheck and focused tests before editing to establish a baseline.
5. Add an architecture decision covering the shell-level assistant, typed response blocks, chat attachment reuse, and candidate vendor catalog policy.
6. Implement Slice 1 completely and visually verify it before moving into database and ingestion changes.
7. Preserve unrelated changes and keep each slice reviewable.

Build the assistant as a trustworthy operating surface, not a decorative chat box. The experience should let a client move from a plain-language question or uploaded bill to a clear, visual, evidence-backed understanding of what Costivra knows, what remains uncertain, and what record they should review next.
