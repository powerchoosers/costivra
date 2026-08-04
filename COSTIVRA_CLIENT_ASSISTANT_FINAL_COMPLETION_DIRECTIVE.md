# Costivra Client Assistant Final Completion Directive

**Repository:** `powerchoosers/costivra`  
**Primary product surface:** `/app` customer workspace  
**Baseline audited:** `main` at `5eade16352845e31c574bdf9b6d3687e930d57f3`  
**Prepared:** August 4, 2026  
**Purpose:** Finish the existing Ask Costivra implementation end to end. This is not a redesign brief and not another planning exercise.

> Implement this directive in the current branch. Inspect before editing, preserve unrelated work, use the real connected Costivra schema as the source of truth, and continue through implementation, migration, tests, browser verification, and documentation. Do not stop after writing another audit or plan. Do not claim completion because TypeScript compiles or Vercel deploys. Completion requires the functional and security gates in this document.

---

# 1. Mission

Finish **Ask Costivra** as a production-capable client assistant for bills, invoices, contracts, vendors, recurring spend, evidence, opportunities, approvals, and savings records.

The completed experience must:

1. Keep the recent circular Costivra trigger in the customer top bar and keep Ask Costivra out of the left navigation.
2. Open as a polished right-side assistant on desktop.
3. Animate into a full-screen workspace without losing the session, messages, draft, attachments, scroll position, or focus.
4. Support persistent conversation history, search, rename, pin, archive, restore, pagination, and a local new-chat draft.
5. Accept text, files, or text and files together.
6. Reuse the existing secure document ingestion path for every attachment.
7. Identify invoice or statement type, vendor, category, amounts, dates, and evidence from supported bills.
8. Resolve known vendors across the organization and the shared Costivra catalog.
9. When no vendor matches, use a real bounded public-search source, create an honestly labeled vendor/category candidate, link the organization, and make public-safe catalog fields searchable for future users.
10. Render deterministic visual cards and detail containers for supported record types.
11. Use bounded conversation memory and current-page context.
12. Preserve tenant isolation, evidence, uncertainty, approvals, and human review.
13. Feel calm, fast, restrained, modern, and trustworthy. Apple is a reference for hierarchy, motion, material quality, and simplicity, not a UI to copy.

Costivra doctrine remains:

> **AI interprets. Code calculates. Policies control. Humans authorize. Evidence proves.**

---

# 2. Current-State Truth

The current branch contains a meaningful visual foundation, but it is not complete.

Already present:

- Ask Costivra is removed from desktop left navigation.
- A circular Costivra-mark trigger exists in the top bar.
- `ClientAssistantProvider` is mounted around the customer app shell.
- Drawer and full-screen surface classes exist.
- Header controls exist for new chat, history, expand, minimize, and close.
- Session, message, and attachment route scaffolding exists.
- Attachments call `ingestManualUpload` rather than creating a second extraction pipeline.
- Typed response-block scaffolding exists.
- A vendor resolver, enrichment adapter, and migration file were added.

Do not confuse those files with a finished vertical slice. The following blockers are mandatory work.

## 2.1 Blocking defects already identified

1. `supabase/migrations/20260804150000_client_assistant_v2.sql` was not present in the connected Costivra migration history during the audit.
2. The current client and routes already query columns and tables introduced by that unapplied migration.
3. The migration must not be applied blindly because new code uses field names that conflict with the established schema.
4. `src/lib/vendors/resolve.ts` uses `vendors.name`; the real Costivra field is `vendors.canonical_name`.
5. Other new code uses or assumes incompatible fields, including:
   - `documents.summary` instead of `documents.extraction_summary`
   - `opportunities.estimated_annual_savings` instead of `opportunities.estimated_annual_value`
   - `audit_events.event_type`, `target_id`, and `target_type` instead of the established audit-event contract
   - `invoices.vendor_name`, which is not an authoritative invoice column
6. `resolveVendorAndCategory()` is not integrated into `createInvoiceRecordFromExtraction()`.
7. Manual uploads, chat uploads, forwarded email, provider ingestion, and extraction recovery therefore still use the legacy organization-only vendor matcher.
8. `OpenRouterVendorEnrichmentProvider` currently asks a normal language model for a domain and then constructs a source-shaped URL. That is not public web evidence.
9. The assistant sends only the latest prompt to the model, so follow-up turns do not have real conversational memory.
10. Model citation IDs are not constrained to an authoritative server-created allowlist.
11. Duplicate request handling does not guarantee one assistant reply per client request.
12. The provider adds the same attachment twice instead of updating one attachment record.
13. A message can be sent while a file is still uploading, causing the file to be silently excluded.
14. Session rename, pin, archive, archived view, grouping, and pagination are not wired into the history UI.
15. `setContext()` exists, but customer record pages do not consistently register current-page context.
16. Only a subset of declared response-block types is hydrated and rendered.
17. The drawer applies a hard inline `margin-right: 440px` to the whole app, including narrow widths.
18. Assistant errors are frequently swallowed with empty `catch {}` blocks.
19. Dedicated authenticated browser coverage for Ask Costivra does not exist.
20. Current “integration” tests do not prove API, database, ingestion, RLS, streaming, or browser behavior.

Treat this list as the starting line, not the whole implementation. Reinspect the current branch because code may have moved after this file was prepared.

---

# 3. Execution Rules

## 3.1 Do not perform another rewrite

Build on the current `src/components/client-assistant` and `src/lib/client-assistant` structure. Refactor where needed, but do not replace the entire customer application or introduce a second assistant.

## 3.2 Do not trust documentation as proof

`STATUS.md`, commit messages, and specification files are not proof that a feature works. Verify the code, connected schema, runtime, browser behavior, and test output.

## 3.3 Preserve existing working systems

Do not regress:

- `/manage`
- customer navigation
- existing document intake
- extraction recovery
- invoice reconciliation
- approval workflows
- audit logs
- Resend intake
- current vendor pages
- responsive portal behavior
- authenticated production checks

## 3.4 Use one shared domain path

There must be:

- one assistant-turn service
- one document ingestion spine
- one vendor/category resolver
- one response-block schema
- one source of truth for record calculations

Compatibility routes may remain, but they must delegate to the same service.

## 3.5 Never invent evidence

A language model prediction is not a public source. A URL assembled from a predicted domain is not a retrieved source. Never store, display, or promote either as verified evidence.

## 3.6 Never weaken tenant boundaries to make the UI work

The browser must not choose an organization ID. All organization and user scope comes from authenticated server context. Service-role operations must occur only after server authorization and must receive only validated IDs.

---

# 4. Phase 0: Recheck the Branch and Establish a Baseline

Before changing code:

1. Read `AGENTS.md`, `DECISIONS.md`, and the current `STATUS.md`.
2. Run:

```bash
git status --short
git log -1 --oneline
npm install
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run build
```

3. Record current failures without rewriting unrelated code to hide them.
4. Inspect the connected Costivra database schema and migration history.
5. Confirm whether `20260804150000_client_assistant_v2.sql` has been applied anywhere relevant.
6. Search every usage of:

```bash
rg "client-assistant|chat_sessions|chat_messages|chat_message_documents|resolveVendorAndCategory|vendor_match_status|vendor_domains|vendor_categories|vendor_enrichment_runs" src supabase tests
```

7. Search for all incompatible field names before editing:

```bash
rg "vendors\(.*name|\.from\(\"vendors\"\).*name|documents.*summary|estimated_annual_savings|event_type|target_id|target_type|vendor_name" src
```

Do not proceed from assumptions. Build a small schema map from the actual database and existing generated types.

---

# 5. Phase 1: Repair and Apply the Database Foundation

## 5.1 The current migration is unsafe as-is

Do not apply `20260804150000_client_assistant_v2.sql` until it is reconciled with the actual schema.

If migration history confirms it has never been applied in any relevant environment, replace it with a corrected migration before first application. If any environment has already applied it, leave it immutable and add a new corrective migration.

## 5.2 Canonical schema naming

Use existing Costivra names rather than introducing parallel fields.

Required corrections include:

| Domain | Canonical field or pattern |
|---|---|
| Vendor display name | `vendors.canonical_name` |
| Vendor aliases | existing `vendors.search_aliases` plus normalized aliases where needed |
| Document summary | `documents.extraction_summary` |
| Opportunity annual estimate | `opportunities.estimated_annual_value` |
| Invoice vendor name | derive through `organization_vendor_id -> organization_vendors.vendor_id -> vendors.canonical_name` |
| Audit action | use the repository's existing `audit_events.action` contract |
| Audit resource | use existing `resource_type` and `resource_id` fields |

Inspect the actual schema for every field used by the assistant. Do not use `as unknown as` to paper over incorrect joins.

## 5.3 Chat session fields

Add or confirm:

- `pinned_at timestamptz null`
- `archived_at timestamptz null`
- `last_message_at timestamptz null`
- `metadata jsonb not null default '{}'`

Backfill `last_message_at` from the latest message timestamp when available, otherwise `updated_at`.

Create an index suitable for personal history:

```text
organization_id, user_id, archived_at, pinned_at, last_message_at, id
```

Pinned sessions must sort first, then most recent.

## 5.4 Chat message fields

Add or confirm:

- `client_request_id uuid null`
- `status text not null`
- `response_schema_version text null`
- `response_blocks jsonb not null default '[]'`
- `metadata jsonb not null default '{}'`
- `model_identifier text null`
- `trace_id uuid null`
- `error_code text null`
- `completed_at timestamptz null`
- `reply_to_message_id uuid null references chat_messages(id)`

Add constraints for valid roles and statuses. At minimum, assistant states must support:

```text
pending | streaming | complete | failed | cancelled
```

Idempotency must support exactly one user message and no more than one assistant reply for a given request. A recommended design is:

- unique partial index on `(session_id, client_request_id)` for user messages
- unique partial index on `reply_to_message_id` for assistant messages

Do not rely on testing an error message for the word `duplicate`.

## 5.5 Chat message documents

Create or repair `chat_message_documents` with:

- foreign key to `chat_messages`
- foreign key to `documents`
- unique `(message_id, document_id, relationship_type)`
- index on `document_id`
- index on `message_id`

### Required RLS behavior

A signed-in user may read a mapping only when:

1. the linked message belongs to a session in the active organization, and
2. the session belongs to that exact `auth.uid()` when chats are personal.

Organization membership alone is not sufficient. One employee must not be able to inspect another employee's personal chat attachments.

Browser insert/update/delete access is not required. The authorized server path may create mappings.

Add explicit cross-user and cross-tenant RLS tests.

## 5.6 Vendor categories

Create or repair `vendor_categories` with:

- stable `id`
- `name`
- normalized unique `slug`
- optional `parent_id`
- lifecycle state such as `candidate | verified | merged | rejected`
- source type
- confidence
- verification timestamps
- merge target
- created/updated timestamps

Add CHECK constraints. Global authenticated reads may include verified and clearly labeled candidates. Browser writes must not be permitted.

Candidate categories do not automatically activate benchmarks, savings logic, recommendations, or rules.

## 5.7 Vendor catalog extensions

Keep `canonical_name` as the canonical display field.

Add or confirm:

- `normalized_name`
- `category_id`
- `catalog_status`
- `created_source`
- `source_confidence`
- `verified_at`
- `verified_by`, using an existing actor/user FK convention where possible

Backfill normalized names for existing vendors.

Create an appropriate uniqueness strategy. It must prevent accidental duplicate verified vendors while allowing ambiguous candidates to remain reviewable. Do not assume `canonical_name` alone solves abbreviations, punctuation, subsidiaries, or brands.

## 5.8 Vendor domains

Create or repair `vendor_domains` with:

- normalized lowercase registrable domain
- vendor FK
- primary flag
- lifecycle status
- source
- confidence
- verification timestamp

Do not store paths, query strings, email addresses, or protocols as domains.

A verified primary domain should not silently belong to multiple verified vendors. Candidate collisions must route to review instead of being resolved arbitrarily.

## 5.9 Vendor enrichment provenance

Create or repair `vendor_enrichment_runs` as a server-only provenance ledger.

Add real foreign keys for organization, document, invoice, candidate vendor, and candidate category where schema conventions allow. Use `ON DELETE SET NULL` for evidence/history records when appropriate.

Record:

- public-safe query fingerprint
- provider
- start/completion timestamps
- outcome state
- candidate IDs
- confidence
- exact retrieved public sources
- bounded safe metadata
- normalized failure code

No authenticated browser read policy is required. Service-role access only.

## 5.10 Invoice resolution fields and constraints

Add or confirm:

- `vendor_match_confidence`
- `vendor_resolution_method`
- `expense_category_id`
- `category_confidence`
- `invoice_subtype`

Choose one canonical `vendor_match_status` union and update every database constraint, TypeScript type, test, filter, and UI badge to match it.

A compatible union is:

```text
provided | exact | catalog_exact | domain | enriched_candidate | ambiguous | unmatched
```

Do not add application values without updating the database CHECK constraint.

## 5.11 Atomic catalog operations

Candidate category creation, candidate vendor creation, domain insertion, and organization relationship linking must be concurrency-safe.

Implement one of these patterns:

1. a tightly scoped Postgres function called from the authorized server, or
2. conflict-safe inserts using real unique constraints and `upsert`/`on conflict` handling.

A select-then-insert sequence is not sufficient. Simultaneous uploads for the same unknown vendor must not create duplicate or partially linked catalog records.

## 5.12 Apply and verify

After repairing the migration:

1. Apply it to the intended non-production/staging target first when available.
2. Regenerate or update database types.
3. Run migration history checks.
4. Run Supabase security advisor.
5. Run Supabase performance advisor.
6. Fix findings introduced by this migration.
7. Prove personal chat isolation with two users in one organization and two users in different organizations.

Do not call the database phase complete until the deployed schema matches the route code.

---

# 6. Phase 2: Make Vendor and Category Discovery Real

## 6.1 Replace incorrect schema usage

Repair `src/lib/vendors/resolve.ts` and all related queries to use actual fields:

- `canonical_name`, not `name`
- real category joins
- real alias fields
- actual organization-vendor columns
- actual audit-event fields

Remove unsafe type casts that conceal schema mismatches.

## 6.2 Integrate the resolver into the shared ingestion path

`createInvoiceRecordFromExtraction()` in `src/lib/documents/invoice-record.ts` must call the shared resolver.

Delete or retire the duplicate private `resolveVendor()` implementation once the shared path is proven.

The shared resolver must run for every invoice-producing ingestion source:

- customer manual upload
- Ask Costivra attachment
- inbound email forwarding
- provider integration
- extraction recovery
- any future supported ingestion adapter

The chat route must not own special vendor logic. Chat attachments enter the same pipeline as all other documents.

## 6.3 Resolution order

Use a deterministic resolution order:

1. Validate a provided organization relationship ID.
2. Exact organization relationship match by normalized canonical name or alias.
3. Exact global catalog match by normalized canonical name or alias.
4. Verified domain match.
5. Candidate domain/name match with review state.
6. Bounded public enrichment.
7. Candidate category/vendor creation.
8. Organization relationship linking.
9. Invoice review classification.

Ambiguity must remain ambiguity. Never choose the first row just because a query returned one first.

## 6.4 Domain hints

Extract only public-safe vendor identity hints from supported source material, such as:

- an explicit vendor website printed on the bill
- a vendor email domain printed on the bill
- a safe sender domain from authenticated inbound-email metadata

Do not send customer name, organization name, service address, account number, payment data, invoice total, line items, or full invoice text to a public search provider.

## 6.5 Replace model-only “search”

`OpenRouterVendorEnrichmentProvider` currently performs a normal chat completion. Replace this behavior with an actual search-backed provider that returns retrieved source URLs and snippets.

Requirements:

- provider interface remains mockable
- search is server-only
- query contains only public-safe vendor identity hints
- results include exact source URL, source title, and retrieved snippet or metadata
- source URLs are normalized and validated
- no source is synthesized by Costivra
- no fallback to `google.com`
- no claim of a “public registry” unless a public registry was actually retrieved
- no automatic verification from a single weak source
- timeouts, retries, rate limits, and error categories are bounded
- results are cached or fingerprinted to avoid repeated paid searches for the same identity

If no real search provider is configured, do not fabricate enrichment. Create a clearly labeled document-derived candidate only when invoice evidence supports the vendor name, or leave the result unmatched and queue enrichment review.

## 6.6 Candidate policy

Candidate creation must distinguish:

- `document_candidate`: supported by the uploaded invoice or statement
- `public_enrichment_candidate`: supported by retrieved public evidence
- `verified`: reviewed or confirmed under an explicit verification rule

Globally visible fields may include only public-safe identity data:

- canonical vendor name
- aliases
- public website/domain
- broad category
- public logo reference when licensed/allowed
- candidate/verified status

Never expose:

- originating customer
- invoice or document ID
- account number
- amount
- service address
- document text
- sender
- customer-vendor relationship details

## 6.7 Category behavior

When a new category is needed:

1. normalize it
2. match existing verified and candidate categories
3. create a candidate only when no reasonable match exists
4. link it to the vendor and invoice
5. mark unsupported categories as monitoring-only

Do not activate recommendations or savings calculations merely because a new label exists.

## 6.8 Catalog search

Repair `/api/portal/vendor-catalog` so it:

- uses `canonical_name`
- searches canonical name, aliases, and verified domains
- ranks verified relationships first
- clearly labels candidate results
- supports pagination
- never leaks tenant relationship details
- returns stable IDs and safe public fields only

## 6.9 Vendor-resolution proof

Add tests for:

- provided relationship
- exact organization alias
- exact global catalog name
- verified domain
- ambiguous match
- public enrichment candidate
- document-only candidate when search is unavailable
- duplicate concurrent candidate creation
- category reuse
- relationship reuse
- cross-tenant isolation
- no fabricated sources

---

# 7. Phase 3: Build One Reliable Assistant-Turn Service

## 7.1 Create a shared service

Move the orchestration currently living directly in the message route into a server-only module such as:

```text
src/lib/client-assistant/service.ts
```

The service must own:

- authenticated scope inputs
- session ownership validation
- request idempotency
- attachment validation
- prior-turn retrieval
- current-page context
- bounded record context
- model invocation
- strict output parsing
- citation validation
- deterministic block hydration
- message persistence
- trace/audit records
- failure state persistence

`/api/portal/chat/sessions/[id]/messages` and compatibility `/api/portal/ask` must delegate to this service. Do not maintain two answer engines.

## 7.2 Session ownership

Every read or write must enforce:

```text
organization_id = authenticated organization
user_id = authenticated user
```

Do not return a session merely because the user belongs to the organization.

## 7.3 Attachment authorization

When attachment IDs are supplied:

1. deduplicate IDs
2. load every requested document within the authenticated organization
3. verify the returned count equals the requested count
4. reject the whole turn when any document is unauthorized or missing

Do not silently drop unauthorized IDs and continue.

## 7.4 True idempotency

For each `clientRequestId`:

- exactly one user message may be created
- at most one assistant reply may be created
- a retry must return or resume the existing turn
- a duplicate request must not call the model twice
- a browser refresh during generation must show the persisted pending state

Use database constraints, not string matching on provider errors.

## 7.5 Conversation memory

Include bounded prior turns in the model request.

Recommended limit:

- latest 8 to 12 complete user/assistant turns
- bounded by a character or token budget
- summarize older history only when necessary and store the summary separately from authoritative records

Never send all chat history or all organization records unbounded.

The model must understand follow-ups such as:

- “compare that with last month”
- “open the second invoice”
- “what evidence supports that?”
- “show only contracts ending this year”

## 7.6 Current-page context

The server must accept a typed context reference, but it must reauthorize and reload the record itself.

Support at least:

```text
vendor | invoice | document | expense | contract | opportunity | action | savings
```

The browser may submit a record kind and ID. It may not submit trusted record contents.

## 7.7 Context budget and record allowlist

`context-builder.ts` must produce:

- organization-safe summary
- relevant records only
- exact allowlisted record IDs
- exact source-document IDs
- deterministic totals/calculations already produced by code
- missing-data flags

Do not use arbitrary SQL generated by a model.

## 7.8 Centralize model access

Do not call OpenRouter directly from an API route when the repository already has an AI adapter.

Create or reuse one server adapter for:

- model identifier
- timeout
- retry policy
- provider error normalization
- structured output
- optional streaming
- trace IDs
- safe logging
- cost/usage metadata when available

Do not hardcode `gpt-4o-mini` in multiple files.

## 7.9 Strict structured output

The model may request blocks only through the declared schema.

On invalid output:

- do not treat raw invalid JSON as a successful answer
- record a normalized parse failure
- either retry once with a repair prompt or return an honest failed assistant state
- never show a canned sentence claiming records were reviewed when no successful model or deterministic result exists

## 7.10 Citations

The model may reference only IDs from the server-created allowlist.

The server must:

1. reject or remove unknown IDs
2. resolve titles and exact internal URLs itself
3. preserve record type
4. link to the exact record, not a generic documents page
5. include evidence/source status

A citation object should be generated from authoritative data, not accepted from model output.

## 7.11 Deterministic calculations

The model may choose which supported analysis to request. Code must calculate:

- totals
- differences
- percentages
- annualized values
- renewal dates
- deadline windows
- counts
- reconciliations
- savings values

Never trust model-provided financial math as authoritative payload data.

## 7.12 Streaming and durable turn states

Implement a modern incremental response experience.

Preferred transport:

- SSE or a fetch-readable stream

Suggested events:

```text
turn.accepted
assistant.started
assistant.delta
assistant.block
assistant.citation
assistant.completed
assistant.failed
```

Persist a pending assistant message before model work begins. Update it to `streaming`, then `complete`, `failed`, or `cancelled`.

If streaming cannot be safely completed, implement durable pending and progress states before claiming the frontier-chat experience is finished.

## 7.13 Failure behavior

Normalize at least:

- authentication failure
- session not found
- unauthorized attachment
- attachment still processing
- provider unavailable
- provider timeout
- malformed output
- context load failure
- block hydration failure
- persistence failure
- cancelled request

Return useful customer-safe copy. Store deeper diagnostics server-side without exposing secrets.

---

# 8. Phase 4: Repair Client State and Attachment UX

## 8.1 Replace append-only attachment handling

The reducer needs explicit actions such as:

```text
UPSERT_ATTACHMENT
UPDATE_ATTACHMENT
REMOVE_ATTACHMENT
CLEAR_ATTACHMENTS
```

Each `clientUploadId` must correspond to exactly one UI item.

State transitions:

```text
queued -> uploading -> processing -> processed
queued/uploading/processing -> failed
queued/uploading/processing -> cancelled
```

Do not dispatch `ADD_ATTACHMENT` twice for the same ID.

## 8.2 Prevent orphaned attachments

The send button must remain disabled while any attachment is queued, uploading, or processing.

A failed attachment must remain visible with retry/remove controls. It must never disappear silently.

When a user sends:

- include every processed attachment
- preserve attachments if the turn fails before acceptance
- clear them only after the server accepts the turn

## 8.3 Input modes

Support:

- text only
- one attachment only
- multiple attachments only
- text plus attachments
- drag and drop
- file picker
- paste of supported image/file content where browser APIs permit

Reuse the ingestion pipeline's actual type and size limits. Keep the 20 MB per-file boundary unless the shared pipeline changes.

## 8.4 Composer behavior

Implement:

- auto-growing textarea
- Enter to send
- Shift+Enter for newline
- disabled send state with explanation where useful
- upload progress/state
- attachment preview chips
- retry and remove
- keyboard focus after new chat
- draft preservation while switching drawer/full-screen
- draft preservation across accidental close during the same browser session

Do not render raw HTML from model output. If Markdown is supported, use a safe renderer with raw HTML disabled.

## 8.5 Stop swallowing errors

Replace empty `catch {}` blocks with:

- reducer error state
- customer-safe inline error or toast
- retry action
- server-safe logging where appropriate

The UI must not look idle when the session endpoint or message endpoint failed.

## 8.6 Optimistic messages

If optimistic user messages are used:

- give them a pending state
- reconcile them with the server message ID
- remove or mark failed on rejection
- do not duplicate them when the transcript reloads

## 8.7 Scroll behavior

Implement:

- auto-scroll during a new response only when the user is near the bottom
- preserve manual scroll position when reading older messages
- “jump to latest” affordance
- preserve scroll between drawer and full-screen
- restore transcript position after history selection where practical

---

# 9. Phase 5: Finish Conversation History

## 9.1 Local new-chat draft

The plus button must create a local blank state and focus the composer.

Do not immediately insert `New Conversation` into Supabase. Persist the session on the first accepted turn.

## 9.2 History API

Support:

- cursor pagination
- `q` search parameter
- normal and archived views
- pinned ordering
- stable cursor fields
- bounded page size

Return a real `nextCursor` and use it in the client.

## 9.3 History rail

Implement:

- current session highlight
- title
- last-message preview
- updated time
- pinned indicator
- overflow menu
- rename
- pin/unpin
- archive
- restore from archive
- empty states
- loading/error states

Group sessions using the organization timezone:

```text
Today
Yesterday
Previous 7 days
Previous 30 days
Older
```

## 9.4 Refresh and deep-link behavior

Support restoration after browser refresh.

Recommended URL behavior:

```text
/app/ask
/app/ask/{sessionId}
```

The existing catch-all route may be used. Validate the session ID on the server.

Opening full-screen should update URL state without remounting the conversation. Leaving full-screen should return to the previous customer workspace route when known, otherwise `/app`.

## 9.5 Message pagination

Long transcripts must not load without a bound. Add cursor pagination for older messages and a “Load earlier messages” control.

---

# 10. Phase 6: Finish Drawer, Full-Screen, Mobile, and Accessibility

## 10.1 Preserve the recent trigger

Keep the circular Costivra-mark top-bar trigger unless a browser review proves it unclear.

Required:

- tooltip: Ask Costivra
- `aria-label`
- `aria-expanded`
- `aria-controls`
- visible focus state
- active state while open
- keyboard shortcut only when it does not conflict

If `Cmd/Ctrl + Shift + K` is advertised, implement it. Do not show a shortcut that does nothing.

## 10.2 Responsive surface rules

Remove the unconditional inline `marginRight: 440` behavior.

Use CSS and viewport rules:

- very wide desktop: optionally push/reserve workspace width
- normal laptop: overlay with restrained scrim
- tablet: full-height sheet
- mobile: full-screen by default using `100dvh`

The customer workspace must not be compressed offscreen on a phone.

## 10.3 One mounted surface

Drawer and full-screen are layout states of the same assistant surface.

Do not create two chat trees. Preserve:

- active session
- transcript
- draft
- attachments
- scroll
- streaming state
- focused control where reasonable

Animate geometry using CSS or a small FLIP/shared-layout implementation. Avoid adding a large animation library solely for this transition.

## 10.4 Accessibility

Implement:

- dialog or complementary-region semantics appropriate to mode
- focus trap when modal overlay behavior is used
- focus restoration to trigger
- Escape to close or exit full-screen
- background inertness when required
- logical tab order
- labeled icon controls
- minimum touch targets
- visible focus states
- screen-reader announcements for upload and generation state
- sufficient contrast
- `prefers-reduced-motion` behavior

## 10.5 Mobile details

Use safe-area insets for header and composer. Verify keyboard opening does not hide the textarea or send button.

Test at minimum:

- 390 x 844
- 768 x 1024
- 1024 x 768
- 1440 x 900

---

# 11. Phase 7: Register Current-Page Context

Create one consistent context-registration pattern.

Possible implementation:

```text
AssistantContextBridge
useAssistantPageContext
```

Register context from:

- vendor detail
- invoice detail
- document detail
- expense detail
- contract detail
- opportunity detail
- action detail
- savings detail

The assistant header must show a human-readable label, for example:

```text
Viewing: AWS invoice INV-1042
Viewing: Microsoft contract
Viewing: Waste Management vendor
```

Do not display only an eight-character UUID fragment.

Context must clear or change when navigation changes. The assistant must reauthorize the referenced record on the server.

---

# 12. Phase 8: Complete Visual Response Blocks and Detail Containers

## 12.1 One source of truth

Align these files:

```text
src/lib/client-assistant/types.ts
src/lib/client-assistant/schemas.ts
src/lib/client-assistant/block-hydrator.ts
src/components/client-assistant/response-block-renderer.tsx
```

Every declared block type must either be fully implemented or removed from the public schema. Do not allow the model to request blocks that the server silently discards.

## 12.2 Required blocks

Implement and test at least:

- invoice summary
- invoice comparison
- vendor summary
- spend trend
- renewal timeline
- opportunity
- approval queue
- document ingestion result
- vendor candidate
- evidence list
- comparison table
- notice/error

## 12.3 Server-hydrated payloads

The model requests a block by record ID and intent. The server loads and calculates the payload.

The model must not provide authoritative:

- dollar values
- percentage changes
- deadlines
- statuses
- vendor verification state
- approval state
- evidence count

## 12.4 Exact links

Cards must link to exact customer records. Avoid generic links such as `/app/documents` when a specific document or invoice ID exists.

## 12.5 Detail containers

Cards that need more information must open a polished modal, side inspector, or full-screen evidence panel.

Support:

- source record identity
- calculated fields
- supporting evidence
- confidence/review state
- missing information
- exact internal navigation
- close/back behavior
- keyboard access

Do not hide uncertainty inside decorative badges.

## 12.6 Currency and dates

Use organization currency and timezone. Do not hardcode `$` or assume USD when the organization setting says otherwise.

## 12.7 Visual language

Use:

- white and near-white surfaces
- restrained blue accent
- strong hierarchy
- subtle borders
- modest shadows
- 14 to 20 px radii where appropriate
- meaningful icons only
- smooth but brief motion

Avoid:

- decorative gradients
- neon glows
- generic chatbot bubbles everywhere
- fake dashboards
- oversized empty space
- random pills
- generic “AI magic” symbols

---

# 13. Phase 9: Security and Trust Requirements

## 13.1 Prompt injection

Treat all uploaded text, email content, public websites, OCR, and vendor-search results as untrusted data.

System instructions must explicitly state that document text cannot override application policy or request tools/actions.

## 13.2 Public search and SSRF

If Costivra fetches a result URL:

- require HTTPS where possible
- block localhost, private IP ranges, link-local ranges, metadata endpoints, and non-public DNS targets
- limit redirects
- limit response size and time
- do not execute scripts
- do not send cookies or credentials
- store only safe public evidence

## 13.3 Consequential actions

Ask Costivra may explain and navigate. It must not silently:

- approve an opportunity
- authorize an action
- change a contract
- alter payment instructions
- send an email
- create a referral
- verify savings
- merge a vendor
- mark a candidate verified

Such actions require the existing explicit product workflows and authorization boundaries.

## 13.4 Audit events

Use the existing audit-event schema. Record important events such as:

- chat session created
- assistant turn submitted
- assistant turn failed
- chat attachment linked
- candidate vendor created
- candidate category created
- vendor candidate merged/verified/rejected

Never log private document text, model prompts containing sensitive values, or provider credentials.

## 13.5 Rate limits

Add bounded per-user and per-organization limits for:

- assistant turns
- concurrent generations
- attachment uploads
- public vendor searches
- candidate creation

Return clear retry guidance rather than silently failing.

---

# 14. Phase 10: Testing That Actually Proves Completion

## 14.1 Unit tests

Add meaningful unit coverage for:

- reducer attachment upsert/update behavior
- local new-chat state
- session grouping
- cursor encoding/decoding
- strict model-output parser
- citation allowlist filtering
- deterministic block calculations
- vendor normalization
- domain normalization
- candidate policy
- category matching
- enrichment source validation
- current-page context validation

A test that checks only whether a prompt contains a phrase is not sufficient assistant integration coverage.

## 14.2 Database and service integration tests

Test with a real or disposable Supabase environment:

- migration applies cleanly
- migration can be reapplied safely where intended
- personal session RLS
- personal chat attachment RLS
- cross-tenant document rejection
- one client request creates one user message and one assistant reply
- retry returns existing turn
- pending turn survives reload
- failed turn is persisted honestly
- known vendor match
- global catalog match
- verified domain match
- unknown vendor candidate creation
- concurrent duplicate candidate attempts
- category reuse
- organization relationship creation
- invoice creation uses resolved vendor/category
- email/manual/chat/recovery ingestion paths produce consistent results

## 14.3 Provider tests

Use mocks for normal test runs.

Prove:

- retrieved sources are preserved exactly
- synthesized URLs are rejected
- private/sensitive input is not sent
- timeout becomes a bounded failure
- no provider configuration produces an honest pending/unmatched state
- a single weak result does not become verified

## 14.4 Dedicated Playwright flow

Create a dedicated authenticated assistant spec, for example:

```text
tests/e2e/client-assistant.spec.ts
```

Required browser scenarios:

1. Trigger exists in top bar and not left navigation.
2. Drawer opens and closes.
3. Keyboard shortcut works if advertised.
4. New chat starts locally without adding an empty persisted row.
5. Text-only prompt returns a durable response.
6. Follow-up prompt uses prior-turn context.
7. History survives refresh.
8. Rename, pin, archive, and restore work.
9. Drawer expands to full-screen without losing draft or transcript.
10. Exact session URL restores the transcript.
11. Known invoice attachment shows ingestion and invoice cards.
12. Unknown vendor attachment creates or queues a candidate correctly.
13. Upload failure is visible and retryable.
14. Send is blocked while files are processing.
15. Current vendor/invoice/contract context appears in the assistant.
16. Card opens exact record or evidence container.
17. Mobile opens full-screen and composer remains usable with virtual keyboard.
18. Reduced-motion mode avoids large geometry animation.
19. No console errors, uncaught exceptions, hydration warnings, or failed network requests.
20. One user cannot load another user's session.

## 14.5 Visual QA

Capture and inspect screenshots for:

- empty drawer
- active conversation
- history open
- full-screen
- streaming response
- attachment processing
- failed attachment
- invoice card
- vendor candidate card
- evidence inspector
- tablet
- mobile

Repair cramped, overlapping, clipped, or generic-looking states before completion.

## 14.6 Required command gate

Run and record exact output for:

```bash
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run test:integration:live
npm run eval:invoices
npm run build
npm run test:e2e
npm run test:e2e:authenticated
npm run ops:verify
```

Environment-gated tests may be skipped only when the required external credential truly does not exist. Report each skipped proof plainly. A skipped live database or browser flow cannot be described as passed.

Also run:

- Supabase migration history check
- Supabase security advisor
- Supabase performance advisor
- production or preview smoke test against the exact deployed commit

---

# 15. File-Level Implementation Map

Inspect and update at least the following. Paths may be reorganized only when the resulting ownership is clearer.

## Database

```text
supabase/migrations/20260804150000_client_assistant_v2.sql
supabase/migrations/<corrective migration if required>.sql
```

## Shared ingestion and vendor intelligence

```text
src/lib/documents/invoice-record.ts
src/lib/documents/intake.ts
src/lib/documents/manual-upload.ts
src/lib/ai/document-intelligence.ts
src/lib/vendors/resolve.ts
src/lib/vendors/normalize.ts
src/lib/vendors/candidate-policy.ts
src/lib/vendors/enrichment-provider.ts
```

## Assistant server

```text
src/lib/client-assistant/service.ts
src/lib/client-assistant/repository.ts
src/lib/client-assistant/context-builder.ts
src/lib/client-assistant/prompt.ts
src/lib/client-assistant/schemas.ts
src/lib/client-assistant/types.ts
src/lib/client-assistant/block-hydrator.ts
src/app/api/portal/ask/route.ts
src/app/api/portal/chat/sessions/route.ts
src/app/api/portal/chat/sessions/[id]/route.ts
src/app/api/portal/chat/sessions/[id]/messages/route.ts
src/app/api/portal/chat/attachments/route.ts
src/app/api/portal/vendor-catalog/route.ts
```

## Assistant client

```text
src/components/app-shell.tsx
src/components/portal-pages.tsx
src/components/portal-record-detail.tsx
src/components/client-assistant/client-assistant-provider.tsx
src/components/client-assistant/client-assistant-trigger.tsx
src/components/client-assistant/client-assistant-surface.tsx
src/components/client-assistant/assistant-header.tsx
src/components/client-assistant/conversation-rail.tsx
src/components/client-assistant/message-thread.tsx
src/components/client-assistant/assistant-composer.tsx
src/components/client-assistant/response-block-renderer.tsx
src/components/client-assistant/client-assistant.css
```

## Tests

```text
src/lib/client-assistant/*.test.ts
src/lib/vendors/*.test.ts
src/lib/integration/client-assistant.integration.test.ts
tests/e2e/client-assistant.spec.ts
tests/e2e/authenticated-workspace.spec.ts
```

Do not delete existing coverage merely to make the suite green.

---

# 16. Definition of Done

Ask Costivra is complete only when every statement below is true.

## Database and security

- [ ] Corrected migration is applied to the intended Costivra database.
- [ ] Application fields match the actual schema.
- [ ] Database CHECK constraints match TypeScript unions.
- [ ] Chat sessions are personal by default.
- [ ] Chat attachment mappings are personal and tenant-safe.
- [ ] Global vendor candidates expose public-safe fields only.
- [ ] Global catalog writes are server-authorized.
- [ ] Candidate creation is concurrency-safe.
- [ ] Supabase security advisor has no new assistant-related finding.
- [ ] Supabase performance advisor findings introduced by this work are resolved.

## Vendor and ingestion

- [ ] Shared resolver is called by `createInvoiceRecordFromExtraction()`.
- [ ] Manual, chat, email, provider, and recovery ingestion use the same resolver.
- [ ] Known organization vendors resolve.
- [ ] Known global vendors resolve and link to the organization.
- [ ] Verified domains resolve safely.
- [ ] Unknown vendors use real retrieved public evidence when available.
- [ ] No model-generated URL is stored as retrieved evidence.
- [ ] Unknown vendors/categories become labeled candidates rather than verified truth.
- [ ] Future vendor search can find approved public-safe candidate fields.
- [ ] Duplicate simultaneous invoices do not create duplicate catalog records.

## Assistant backend

- [ ] One shared assistant-turn service exists.
- [ ] Compatibility route delegates to it.
- [ ] Prior turns provide bounded conversational memory.
- [ ] Current-page context supports all required record kinds.
- [ ] Attachments are fully authorized or the turn is rejected.
- [ ] Client request idempotency prevents duplicate model calls and replies.
- [ ] Pending, streaming, complete, failed, and cancelled states are durable.
- [ ] Model output is strictly parsed.
- [ ] Invalid output never becomes a false success message.
- [ ] Citations come only from the server allowlist.
- [ ] Calculations come from deterministic code.
- [ ] Provider failures are visible and retryable.

## Client experience

- [ ] Trigger is in the top bar and removed from left navigation.
- [ ] Drawer works at desktop widths.
- [ ] Full-screen mode works without losing state.
- [ ] Mobile defaults to a usable full-screen surface.
- [ ] No unconditional 440 px content squeeze remains.
- [ ] Local new chat does not persist an empty row.
- [ ] History search, rename, pin, archive, restore, and pagination work.
- [ ] Session and transcript restore after refresh.
- [ ] Text-only input works.
- [ ] Attachment-only input works.
- [ ] Text-plus-attachment input works.
- [ ] Drag/drop and file picker work.
- [ ] Attachment statuses update in place without duplicate chips.
- [ ] Sending is blocked while an attachment is incomplete.
- [ ] Failed uploads remain visible and retryable.
- [ ] Current-page context uses a human-readable label.
- [ ] All declared visual block types render or have been removed from the schema.
- [ ] Exact record links and detail containers work.
- [ ] Keyboard, focus, reduced motion, contrast, and touch targets pass review.
- [ ] No empty catches hide failures.

## Validation

- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Unit tests pass.
- [ ] Real integration tests pass.
- [ ] Live Supabase tests pass or are explicitly reported as unverified.
- [ ] Invoice evaluation passes at the required threshold.
- [ ] Production build passes.
- [ ] Dedicated assistant E2E passes on desktop and mobile.
- [ ] Existing authenticated workspace E2E still passes.
- [ ] Operations verification passes.
- [ ] Preview/production smoke test passes against the exact deployed commit.
- [ ] Browser console and runtime logs are clean for the tested flows.

---

# 17. Completion Report Required From Codex

At the end, provide a factual report containing:

1. exact commit/branch inspected
2. migrations changed and applied
3. schema mismatches repaired
4. vendor resolver integration points
5. actual public-search provider behavior
6. assistant service architecture
7. client UX completed
8. tests added
9. exact validation commands and results
10. browser flows tested and viewport sizes
11. Supabase advisor results
12. deployment URL or commit status when available
13. any remaining external blocker

Do not use phrases such as “production ready,” “complete,” or “fully implemented” when a required live migration, provider, browser, RLS, or deployment proof was skipped.

---

# 18. Final Instruction

Implement the complete vertical slice now. Begin with the database/schema reconciliation because the current UI depends on unapplied and mismatched fields. Then wire the shared vendor resolver into invoice ingestion, replace fabricated enrichment with retrieved public evidence, centralize assistant turns, repair client state/history/context, finish visual blocks and accessibility, and prove the entire flow through real database and browser tests.

The target is not a convincing demo. The target is a client assistant that can receive a real bill, understand what it is, place it into the correct vendor/category workflow, answer grounded follow-up questions, render useful evidence-backed visuals, survive refreshes, and protect every customer's data.
