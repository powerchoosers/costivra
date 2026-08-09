# Costivra Status

## August 8, 2026 — Next chunks 07–11 staged

- Added [`COSTIVRA_NEXT_CHUNKS_07_11.md`](COSTIVRA_NEXT_CHUNKS_07_11.md), a small handoff plan for sequence execution, Mail sequence visibility, Stripe test-mode billing, paid onboarding, and final pilot QA.
- The connected Stripe test account resolves to **Costivra**. Read-only audit found 0 products, 0 prices, 0 customers, 0 subscriptions, and 0 webhook endpoints. No Stripe objects were created.
- Current pricing copy is Starter $149/month, Growth $599/month, and Enterprise custom. Stripe product creation is intentionally blocked until Lewis confirms the billing catalog, annual/trial policy, currency, taxes, and entitlements.
- Recommended next implementation handoff is **Chunk 07A**, then 07B, 08, 09A approval, 09B, 10, and 11. No live sends, billing charges, migrations, deployments, or external state changes were performed in this staging step.

## August 9, 2026 — Packet 4–6 fixes implemented

- **Reports:** schedule calculation now honors the saved IANA timezone, weekly/monthly validation is explicit, schedules can be paused/resumed, and recurring report preferences are stored in a dedicated tenant table. The cron skips disabled report classes and empty reports unless the workspace explicitly allows them.
- **Outreach safety:** added sequence clone/pause/archive endpoints, enrollment preview/pause/stop endpoints, editable step content, real reorder/delete controls, and suppression-aware preview output. Automated execution remains disabled.
- **Validation:** `npm run typecheck` PASS; focused ESLint PASS; `npm test` PASS (537 passed, 6 skipped); `npm run test:integration` PASS (8 passed, 6 skipped); `npm run build` PASS; `npm run test:e2e` PASS (27 passed, 7 skipped).
- **Still required before live use:** apply and lint the new Supabase migrations against the Costivra project, verify a real scheduled delivery and Resend reconciliation, and complete Packet 07 execution/approval controls. The Supabase config was made compatible with the installed CLI; `supabase db lint` now parses the project but cannot connect because Docker/local Postgres is not running. No live migration, deployment, or external send was performed.

## August 9, 2026 — Packets 4–6 implementation checkpoint

- **Packet 04:** lifecycle emails now use the branded Costivra shell, configured Resend sender, stable source-based idempotency, and an external-side-effect record before provider send. Reports share one generator for CSV and email output. Tenant-owned report schedules, delivery runs, the protected `/api/cron/reports` route, portal Email now/Schedule/history controls, and Resend delivery reconciliation are implemented locally.
- **Packet 05:** draft-first Outreach sequence tables, steps, pending enrollments, events, suppressions, origin linkage, RLS restrictions, database contact-tenant validation, server validation, and operator APIs are implemented in migrations and routes. Sequence activation and execution remain disabled by design.
- **Packet 06:** the existing `/manage/outreach` page now has Tasks, Sequences, and Enrollments tabs. The sequence workspace supports draft creation, timeline steps, safety-control visibility, preview text, schedule/cap editing, and pending enrollment staging without adding a sidebar item or new page.
- **Validation:** `npm run typecheck` PASS; focused ESLint on the changed Packet 4–6 files PASS; `npm test` PASS (534 passed, 6 skipped); `npm run build` PASS. Full `npm run lint` exceeded the local two-minute command limit without output. `supabase db lint --local --schema public --fail-on error` is currently blocked by the repository's existing Supabase config keys (`experimental.pgdelta` and `config.local_smtp`) being rejected by the installed CLI 2.76.6; no live migration was applied in this slice.
- **Known follow-up:** Packet 04 still needs real scheduled-delivery proof and report preference controls. Packet 05/06 still need execution workflow, pause/stop actions, and browser verification at desktop/mobile sizes. No production deployment or payment charge was attempted.

## August 8, 2026 — Packets 1–3 current release verdict

- **Working commit:** `5d861f888b90f55d81f4ebea863defaf5da8e130`; the worktree is intentionally dirty because Lewis is collecting these packet changes for one manual commit/push.
- **Packet 01:** release hardening is implemented locally: Node 24 is pinned to match Vercel, CI concurrency is enabled, dependency and secret gates are active, and `release:verify` produces a fail-closed machine-readable verdict. `npm audit --omit=dev` and `npm audit` both report zero vulnerabilities after safe `nanoid` and `js-yaml` overrides.
- **Packet 02:** synthetic smoke evaluation is explicitly classified and separated from pilot evidence. Private manifests must live under ignored `private-evaluation/`, include review provenance and data classification, meet software/telecom/utility/scanned/adversarial coverage minimums, and run through `npm run eval:pilot` without logging private text. No approved real corpus is present yet, so no real-accuracy claim is made.
- **Packet 03:** scanner provenance, fail-closed Cloudmersive controls, live Supabase migration, and four-path clean/EICAR proof are complete; see `docs/PACKET_03_LIVE_PROOF.md`.
- **Current production deployment:** the last audited Vercel deployment for the working commit was `READY`, but that deployment is not treated as a release verdict because CI was red and deployment was not gated. A new deployment has not been made from these uncommitted changes.
- **Known blockers:** Lewis must revoke the previously exposed provider credential, decide whether the public repository is intentional, and supply/approve the private evaluation corpus before a paid pilot can be called evaluation-proven. These are deliberate human-controlled gates, not claims hidden by automation.
- **Latest local release verdict:** `release:verify` **PASS** (`2026-08-09T00-50-41-665Z`): typecheck, lint, both dependency audits, unit tests, invoice smoke evaluation, integration tests, build, secret scanning, and the full 34-test desktop/mobile browser suite passed (27 passed, 7 intentional skips). The ignored JSON/Markdown report is under `artifacts/release/`.

## August 8, 2026 — Packet 03 scanner boundary hardening (historical snapshot; superseded above)

- Tightened the Cloudmersive adapter to use only the fixed official endpoint, `Apikey` authentication, the `inputFile` multipart field, and the documented boolean `CleanResult` response. Generic scanner fields are no longer accepted as Cloudmersive proof of clean.
- Scanner configuration now hides provider secrets from returned config, rejects invalid numeric settings and ambiguous providers, adds the configured free-plan controls to `.env.example`, and fails closed when the distributed Supabase request-budget reservation is unavailable.
- Added a forward-safe migration for concurrent first-use budget reservations, explicit browser-role denial, service-role-only function execution, and nullable provenance for scans that finish before a document row exists (for example, infected email attachments).
- Manual, forwarded-email, quarantine-rescan, and internal-mail scan failures now record durable structured scan attempts without storing provider responses or secrets.
- Validation baseline before this packet: `npm run typecheck` PASS; `npm run lint` PASS with two existing warnings (`home-page.tsx` image optimization and `navigation-history.tsx` hook dependency); `npm test` PASS (524 passed, 6 skipped). The combined baseline command exceeded its timeout and was rerun individually.
- **Still open:** live clean/EICAR verification, real four-path intake proof, Supabase migration/advisor verification against the Costivra project, browser QA, and final packet release verdict. The connected Supabase session must be corrected before live database checks.
- **Additional validation:** `npm run ops:readiness` PASS against the local Costivra credentials; `npm run ops:smoke` PASS against `https://costivra.ai`; `npm run ops:cloudmersive` PASS (one clean probe); `npm run ops:cloudmersive:eicar` PASS (one official inert infected probe); `npm run build` PASS; authenticated E2E was skipped because its explicit opt-in is disabled. The full public E2E suite timed out after 3m59s with 16 existing marketing-copy/layout failures from the dirty worktree, so Packet 03 is not release-green.

## August 8, 2026 — Manage sidebar parity repair

- **Responsive parity**: Matched Manage’s compact breakpoint to `/app` at 980px. At the same 1186px browser width, both products now use the full 256px sidebar instead of Manage switching to a 76px rail early.
- **Stable default**: Manage now opens with the full sidebar above the compact breakpoint and stays open until the explicit header control collapses it. Pointer-leave no longer changes the default page geometry.
- **Header alignment**: Raised the Manage brand row to align the Costivra mark with the main canvas header control, matching the customer shell’s visual baseline.
- **Validation**: `npm run typecheck` PASS; the generated Next route-type file was regenerated after the local dev server restart. Browser comparison confirmed matching 256px sidebar widths for `/manage` and `/app` at 1186px. `git diff --check` remains clean.
- **Next**: Continue checking the remaining visual details of the Manage rail against `/app`: search spacing, group separators, active-row treatment, compact icon alignment, and fixed footer rhythm.

## August 7, 2026 — Manage shell redesign, Chunk 4 complete

- **Shared frame**: Added the first `/manage` shell pass using the same family as `/app`: transparent textured sidebar, 256px expanded rail, 76px compact rail, rounded white work canvas, fixed canvas header, and internal route scrolling.
- **Scroll ownership**: Gave the sidebar navigation and `.manage-page` explicit scroll ownership with nested table, mail, menu, profile, and assistant exceptions so one region does not steal another region’s wheel input.
- **Controls and motion**: The header control now explicitly expands/collapses the desktop rail. Sidebar and canvas width changes use the same restrained ease curve, and Manage header controls are normalized to 40px with matching borders and hover states.
- **Validation**: `npm run typecheck` PASS; `git diff --check` PASS. Browser checks passed on `/manage` at the default desktop viewport and a 1000px compact viewport: expanded/collapsed geometry stayed contained, the canvas retained a fixed header, and route content had an independent scroll range.
- **Follow-up slice**: Moved Manage search beneath workspace identity. Compact mode keeps a visible search icon; clicking it expands the rail and focuses the real search field. Long settings/mail routes, navigation scroll with the profile anchored, assistant drawer containment, mobile drawer geometry, reduced-motion overrides, accessible shell labels, and the existing create menu have now been checked.
- **Quality gate**: `npm run typecheck` PASS; `npm run lint` PASS with 1 existing warning in `src/components/navigation-history.tsx`; `git diff --check` PASS. Browser checks covered `/manage`, `/manage/accounts`, `/manage/settings`, and `/manage/mail` at desktop, compact, and mobile widths with no body overflow beyond the viewport.
- **Next**: Chunk 5 — harden route-specific dense tables, mail panes, settings content, and nested scroll exceptions inside the shared Manage canvas.

## August 7, 2026 — Application shell redesign, Chunk 3B complete

- **Detail compatibility**: Aligned customer detail-route sticky regions with the in-canvas header. Record tabs, evidence/source areas, review bulk controls, and side rails now clear the canvas header instead of using the removed full-width top-bar offsets.
- **Back navigation**: Repositioned the floating return control to the customer canvas rather than the former 72px rail; mobile retains its compact safe-area position.
- **Evidence and overlays**: Kept record evidence, confidence, assumptions, actions, and navigation behavior unchanged. The real vendor contract sheet continues to render above the canvas through the existing portal layer.
- **Validation**: Browser checks passed on a real vendor route at 1280×800 and 390×844. The detail, summary, back control, and canvas stayed contained; opening the existing Add contract sheet produced a full overlay with no console errors or horizontal overflow.
- **Next**: Chunk 4 — apply the same persistent-sidebar and single-canvas structure to `/manage`, while preserving its denser workflow and assistant rail.

## August 7, 2026 — Application shell redesign, Chunk 3A complete

- **Customer page composition**: Made the work canvas the clear page-level surface. Overview metrics, panels, and list-route cards now use restrained borders, 18px corners, and no heavy shadows or hover lift.
- **Page rhythm**: Standardized route-header spacing and content padding inside the canvas without changing titles, descriptions, evidence, amounts, or route-specific actions.
- **List workspace compatibility**: Recalculated customer table pages against the in-canvas header. Desktop vendor directory pages now fill the available canvas area and preserve local table scrolling; mobile returns to normal document scrolling.
- **Validation**: Browser checks passed for `/app` and `/app/vendors` at 1280×800 and `/app/vendors` at 390×844: no horizontal overflow, correct local/normal scrolling, and no console errors. `git diff --check` PASS. `npx eslint src/components/app-shell.tsx` PASS. The repository-wide `npm run lint` exceeded the two-minute local command limit without output; it remains to be rerun in the final release gate.
- **Next**: Chunk 3B — verify and refine customer detail routes, sticky sections, and overlay behavior inside the canvas before beginning the Manage shell.

## August 7, 2026 — Application shell redesign, Chunk 2 complete

- **Sidebar hierarchy**: Moved the existing workspace summary and global record search into the customer sidebar. The desktop order is now Brand → Workspace → Search → Navigation → Settings → User.
- **Quiet canvas header**: Removed workspace identity and search from the canvas header. It now contains only the existing create/upload control, Ask Costivra, and notifications; route titles remain the responsibility of the existing route-level header.
- **Preserved behavior**: Organization summary, search results, `Ctrl/Cmd + K`, create actions, notifications, profile menu, Escape handling, and result navigation retain their existing behavior. The organization visual treatment now uses named CSS classes instead of inline style objects.
- **Mobile compatibility**: Restored workspace access and global search in the compact header below 760px, avoiding a desktop-only sidebar dependency.
- **Validation**: `npm run typecheck` PASS; focused navigation coverage PASS (6 tests); `git diff --check` PASS. Local browser checks passed at 1280×800 and 390×844: menus were not clipped, keyboard search focused the visible field, no horizontal overflow, and no console errors.
- **Next**: Chunk 3A — normalize page-header spacing and remove route-level outer surfaces that compete with the new customer canvas, beginning with overview and list routes.

## August 7, 2026 — Application shell redesign, Chunk 1 complete

- **Customer desktop frame**: Replaced the hover-expanded 72px navigation rail with a stable 256px desktop sidebar. All navigation and group labels remain visible without pointer hover or focus changing the page geometry.
- **Single workspace canvas**: Added `.app-work-canvas` inside `AppShell`; it contains the existing customer top bar and every normal route page. The sidebar is now the only standard application surface outside the canvas.
- **Scope restraint**: Kept organization switching, global search, create/upload actions, notifications, profile controls, route headings, page content, data loading, and authorization behavior unchanged. Mobile remains full-width below 760px; the explicit tablet strategy is reserved for the responsive chunk.
- **Validation**: `npm run typecheck` PASS; focused navigation coverage PASS (6 tests); `git diff --check` PASS. Local authenticated browser checks passed at 1440×900, 1280×800, 1024×768, and 390×844 with no horizontal overflow. `/app/vendors` and a real vendor detail route remained inside the canvas; no browser console errors were reported.
- **Next**: Chunk 2 — move the existing workspace selector and search into the sidebar, then simplify the in-canvas header without duplicating route titles.

## August 7, 2026 — Mobile scan intake composition

- **Mobile layout**: Removed the desktop-only two-column override from the scan page so the intake story and secure workspace panel stack into a readable, intentional sequence on phones.
- **Panel treatment**: Added mobile-safe spacing, type sizing, full-width actions, and a compact header while preserving the desktop two-column composition.
- **Responsive QA**: Checked 360x800, 390x844, 430x800, and 1280x800; no horizontal overflow or browser console errors.
- **Quality gate**: Mobile layout coverage added to `tests/e2e/public-smoke.spec.ts`; `npm run typecheck` PASS, `npm run lint` PASS with 1 existing warning in `src/components/navigation-history.tsx`, and `npm run build` PASS. The focused Playwright run was not started because the existing local Next server already owns the repository's dev lock; equivalent browser QA passed at all four target widths with no console errors or horizontal overflow.

## August 7, 2026 — Desktop workflow rail smoothness

- **Desktop motion**: Kept the existing scroll-linked progress calculation, but changed the horizontal rail from animated width to a compositor-friendly transform so it follows desktop scrolling without transition lag.
- **Mobile preserved**: The vertical rail uses the same progress value and continues to animate smoothly with no horizontal overflow.
- **Quality gate**: `npm run typecheck` PASS; `npm run lint` PASS with 1 existing warning in `src/components/navigation-history.tsx`; `npm run build` PASS. Browser QA passed at 1286px and 390px with no console errors.

## August 7, 2026 — Mobile long-grid hierarchy

- **Compact mobile treatment**: Kept all six facts on Security, Product, and How it works, but changed their phone layout from tall repeated cards into compact rows. Security rows are grouped under Data boundary, Access and authority, and Evidence and accountability.
- **Desktop preserved**: The existing three-column desktop grids remain unchanged; shorter three-card industry pages keep their current layout.
- **Quality gate**: `npm run typecheck` PASS; `npm run lint` PASS with 1 existing warning in `src/components/navigation-history.tsx`; `npm run build` PASS. Browser QA passed at 384px and 1280px with no horizontal overflow or console errors.

## August 7, 2026 — Mobile category orbit alignment

- **Mobile composition**: Centered the Software / Telecom / Energy category orbit within the stacked mobile signature scene while leaving the desktop layout unchanged.
- **Responsive check**: Confirmed the orbit is centered at 384px with no horizontal overflow; desktop retains its original 330px left-column placement.
- **Quality gate**: `npm run typecheck` PASS; `npm run lint` PASS with 1 existing warning in `src/components/navigation-history.tsx`; `npm run build` PASS. Browser QA reported no console issues.

## August 7, 2026 — Footer link affordance

- **Interactive links**: Added a shared footer hover and keyboard-focus state so muted links brighten and receive a restrained mint underline when visitors move over or focus them.
- **Responsive behavior**: Kept the treatment within the existing footer layout; mobile remains contained with no horizontal overflow.
- **Quality gate**: `npm run typecheck` PASS; `npm run lint` PASS with 1 existing warning in `src/components/navigation-history.tsx`; `npm run build` PASS. Browser QA confirmed the state on the homepage at desktop and mobile sizes with no console issues.

## August 7, 2026 — Scroll-linked workflow progress

- **Visible progress**: Added a scroll-linked rail to the homepage workflow so the line fills from step 1 toward step 5 as the section moves through the visitor's viewport.
- **Responsive treatment**: Desktop uses a horizontal rail behind the five steps; mobile switches to a vertical rail beside the stacked steps without creating horizontal overflow.
- **Motion and accessibility**: The fill uses restrained linear progress and removes its transition for reduced-motion preferences while preserving the scroll state.
- **Quality gate**: `npm run typecheck` PASS; `npm run lint` PASS with 1 existing warning in `src/components/navigation-history.tsx`; `npm run build` PASS. Browser QA confirmed 0%, middle progress, and 100% states at desktop plus the vertical mobile rail.

## August 7, 2026 — Homepage stage motion and navigation balance

- **Stage transitions**: Added a calm fade-and-rise replay whenever the synthetic interactive-demo stage changes, while keeping the fixed stage viewport so the hero does not jump between states. Reduced-motion users receive no transition.
- **Desktop navigation**: Centered the primary links in the grid track between the logo and action divider rails so the header reads as balanced; the existing mobile menu remains unchanged.
- **Quality gate**: `npm run typecheck` PASS; `npm run lint` PASS with 1 existing warning in `src/components/navigation-history.tsx`; `npm run build` PASS. Browser QA passed at 1280px and 390px with no console issues or horizontal overflow.

## August 7, 2026 — Light-surface secondary actions

- **Readable buttons**: Added dark text, visible borders, light backgrounds, and rounded corners for secondary actions inside light marketing content pages and panels.
- **Dark hero preservation**: Left the homepage’s dark-hero secondary action light so it remains legible against the product demo.
- **Quality gate**: `npm run typecheck` PASS; `npm run lint` PASS with 1 existing warning in `src/components/navigation-history.tsx`; `npm run build` PASS. Browser checks passed on Scan, Solutions, and the homepage.

## August 7, 2026 — Scan-page assurance rows

- **Checklist alignment**: Converted the scan-page assurances into a shared flex row so each check icon sits to the left of its text with consistent baseline spacing.
- **Responsive behavior**: Confirmed the rows wrap naturally at 390px without horizontal overflow while keeping the icon anchored to the first line.
- **Quality gate**: `npm run typecheck` PASS; `npm run lint` PASS with 1 existing warning in `src/components/navigation-history.tsx`; `npm run build` PASS. Browser QA passed at desktop and mobile widths.

## August 7, 2026 — Industry detail-card density and scene geometry

- **Balanced industry grids**: Reduced the six solution-detail families to three focused cards each, folding the removed card’s key control language into the related card instead of leaving a sparse second row or inventing filler.
- **Rounded signature scenes**: Added consistent 24px desktop / 20px mobile corners to timeline, category, consent, portfolio, and manifesto scenes so every large visual reads as a finished card.
- **Responsive check**: Verified Software, Telecom, Energy, Insurance, Facilities, and Merchant solution pages at desktop; Software, Telecom, and Energy at 390px. All report three cards and no horizontal overflow.
- **Quality gate**: `npm run typecheck` PASS; `npm run lint` PASS with 1 existing warning in `src/components/navigation-history.tsx`; `npm run build` PASS.

## August 7, 2026 — Industry solution cards are navigable

- **Solutions entry points**: Made the Software subscriptions, Telecom & internet, and Commercial energy review cards full-card links to their existing detail pages.
- **Discoverability**: Added a restrained arrow cue on hover and keyboard focus while preserving the shared card hover treatment and accessible focus outline.
- **Responsive behavior**: Confirmed all three cards remain full-width tap targets at 390px with no horizontal overflow; Telecom navigation resolves to `/solutions/telecom`.
- **Quality gate**: `npm run typecheck` PASS; `npm run lint` PASS with 1 existing warning in `src/components/navigation-history.tsx`; browser route and mobile checks PASS.

## August 7, 2026 — Shared marketing card grid polish

- **Grid edges**: Added explicit outer borders to the shared `.content-grid` so the first and last columns no longer look clipped or unfinished.
- **Hover state**: Replaced the harsh black inversion with a light elevated surface, subtle blue border, controlled shadow, and a small scale lift that keeps text readable.
- **Shared coverage**: Applied the fix at the shared style level and checked Product, Solutions, How it works, Pricing, Case studies, and Help at desktop and 390px mobile widths.
- **Quality gate**: `npm run typecheck` PASS; `npm run lint` PASS with 1 existing warning in `src/components/navigation-history.tsx`; `npm run build` PASS. All checked pages reported no horizontal overflow.

## August 7, 2026 — Premium marketing header

- **Desktop hierarchy**: Refined the marketing header into a quiet command bar with a frosted surface, subtle brand/action rails, calmer nav states, and a more considered primary CTA.
- **Mobile navigation**: Strengthened the menu touch target, preserved the animated menu/X state, and made the open drawer opaque and spacious so navigation remains legible over the hero.
- **Responsive guardrails**: Added a compact tablet treatment and confirmed the header stays within the viewport without horizontal overflow at desktop and 390px widths.
- **Quality gate**: `npm run typecheck` PASS; `npm run lint` PASS with 1 existing warning in `src/components/navigation-history.tsx`; `npm run build` PASS. Browser QA passed at desktop and mobile widths.

## August 7, 2026 — Homepage interaction polish

- **Evidence chain**: Moved each methodology icon beside its bold step title so the four-step proof sequence reads as one compact row instead of stacking the icon above the copy.
- **Trust controls**: Removed the bottom divider from the final Audit history / No broad inbox access row so the grid ends cleanly without an orphaned rule.
- **FAQ motion**: Kept answers mounted for a smooth grid-height transition, added a subtle content fade/slide, and rotated the plus icon into an X while an answer is open. Reduced-motion users still receive no animation.
- **Quality gate**: `npm run typecheck` PASS; `npm run lint` PASS with 1 existing warning in `src/components/navigation-history.tsx`; `npm run build` PASS. Browser checks passed at desktop and 390px widths.

## August 7, 2026 — Stabilize interactive hero stage height

- **Stage viewport**: Wrapped the interactive opportunity states in a shared content viewport with desktop and mobile minimum heights based on the tallest real stage. Approval and later-result states now occupy the same frame size as source, change, and evidence states instead of shrinking the hero during the cycle.
- **Browser QA**: Measured all five stages at 1186px and 390px widths; every stage now reports the same product-frame height at each breakpoint.
- **Quality gate**: `npm run typecheck` PASS; `npm run lint` PASS with 1 existing warning in `src/components/navigation-history.tsx`; `npm run build` PASS.

## August 7, 2026 — Global scroll performance polish

- **Page scrolling**: Tuned Lenis interpolation from `0.09` to `0.12` so wheel and trackpad input settles sooner without losing the calm, eased motion.
- **Nested surfaces**: Replaced Lenis' per-event automatic nested-scroll DOM walk with an explicit, direction-aware native-scroll handoff. Scrollable Accounts, Contacts, Vendors, tables, drawers, modals, sidebars, and chat panels keep their native behavior while vertical wheel input can still return to the page when a wide table has no vertical overflow.
- **Table scrollbars**: Table wrappers now reveal only the axis being moved—horizontal for horizontal movement, vertical for vertical movement—and transition the thumb in and out instead of popping it on and off.
- **Native/browser handoff**: Disabled the browser's second smooth-scroll interpolation while Lenis is active, preventing double-easing on anchors and programmatic scrolls. Reduced-motion behavior remains unchanged.
- **Quality gate**:
  - `npm run typecheck` PASS.
  - `npm run lint` PASS with 1 existing warning in `src/components/navigation-history.tsx`.
  - `npm run build` PASS.
  - Browser smoke check PASS at desktop and 390px viewport; Lenis initialized and page scrolling remained responsive.

## August 7, 2026 — Customer App IA Chunk 6: Global vs Vendor Scope, Linking, and Routes

- **Shared scope language**: Added `PageScopeIndicator` for `Across all vendors`, `Vendor workspace`, and `Vendor account` states, with readable hierarchy and parent links.
- **Breadcrumbs**: Added shared `PageBreadcrumbs` and applied it to vendor workspaces, account selection sheets, and record detail pages. Detail pages now show their canonical global parent and vendor context.
- **Canonical linking**: Updated affected bill, Finding, Action, Result, Contract, vendor, account, and related-record links to use canonical customer routes. Source-file download links remain protected API links.
- **Legacy redirects**: Added authenticated compatibility redirects for `/app/expenses`, `/app/documents`, `/app/opportunities`, `/app/savings`, and `/app/reports`. Legacy detail routes remain supported without redirecting away from the record.
- **History and route state**: Preserved URL-backed tabs, filters, selected accounts, and existing navigation-history behavior; authenticated browser QA confirmed Back restores the prior Bills view.
- **Quality gate**:
  - `npx vitest run src/lib/portal/scope-routing.test.ts` PASS (3 tests).
  - `npm test -- --run` PASS (123 test files, 524 tests passed, 4 files and 6 tests skipped).
  - `npm run typecheck` PASS (also completed by the final production build).
  - `npm run lint` PASS with 0 errors and 0 warnings.
  - `npm run test:integration` PASS (4 files, 8 tests passed, 4 files and 6 tests skipped).
  - `npm run build` PASS (Next.js production build generated successfully).
  - Authenticated browser QA PASS for global, vendor, account, bill-detail, legacy-redirect, and browser-history journeys; no browser application errors observed.
- **Remaining release scope**: Chunk 7 updates the remaining command center/search/notification/onboarding surfaces, and Chunk 8 provides final release evidence. No Git, branch, migration, or deployment actions were performed.

## August 7, 2026 — Customer App IA Chunk 5: Findings, Actions, Results, and Contracts

- **Contracts & Renewals (`/app/contracts`)**: Added `Upcoming`, `All Contracts`, `Needs Details`, and `Expired` views with deadline classification, missing-detail visibility, vendor links, and assigned account/location links.
- **Findings (`/app/findings`)**: Replaced the customer-facing Opportunities page with `Needs Review`, `Evidence Backed`, `Needs Evidence`, and `Dismissed` views. Rows show vendor scope, source bill, trust state, evidence count, status, and potential value without presenting it as verified.
- **Actions (`/app/actions`)**: Added `Needs Approval`, `Assigned to Me`, `In Progress`, and `Completed` views while preserving the existing approval and execution controls. Action records link back to their Finding, vendor, and source bill when available.
- **Results (`/app/results`)**: Combined the former Savings and Reports destinations into `Verified Value`, `In Progress`, `Reports`, and `Executive Summary`. Verified value requires the existing verified state and verification timestamp; pending values are labeled as pending.
- **Record and vendor context**: Updated Finding/Result detail labels and canonical related-record links. Vendor Findings sections now link directly to canonical Finding, Action, and Result routes.
- **Legacy compatibility**: `/app/opportunities`, `/app/savings`, and `/app/reports` continue to render compatible customer-facing views while the internal database/API names remain unchanged.
- **Quality gate**:
  - `npx vitest run src/lib/portal/workflow-workspaces.test.ts src/lib/portal/record-context.test.ts` PASS (7 tests).
  - `npm test -- --run` PASS (122 test files, 521 tests passed, 4 files and 6 tests skipped).
  - `npm run typecheck` PASS.
  - `npm run lint` PASS.
  - `npm run test:integration` PASS (4 files, 8 tests passed, 4 files and 6 tests skipped).
  - `npm run build` PASS (Next.js production build generated successfully).
  - Authenticated browser QA PASS for Contracts, Findings, Actions, Results, legacy Savings/Reports routes, desktop Results, and 390px mobile Findings layout; no browser application errors observed.
- **Remaining release scope**: Final redirect/deep-link normalization belongs to Chunk 6, and release evidence belongs to Chunk 8. No Git, branch, migration, or deployment actions were performed.

## August 7, 2026 — Customer App IA Chunk 4: Unified Bills & Spend Workspace

- **Unified route and views (`/app/bills`)**: Completed the URL-backed `Needs Review`, `All Bills`, `Spend`, and `Source Files` workspace, including default review behavior and legacy `/app/expenses` / `/app/documents` view mappings.
- **Review queue**: Shows unresolved vendor, workspace customer, account, location, reconciliation, extraction, and security-scan issues with plain-language reasons and direct bill links.
- **Financial clarity**: Separates `Current Charges` from `Amount Due`; missing source values display as `Not recorded` rather than being silently substituted.
- **Source-file provenance**: Displays document type, upload date, security state, extraction state, and evidence count, with safe `Not recorded` fallbacks when older records lack scan metadata.
- **Filters and responsive behavior**: Added URL-persisted search, vendor/account/location/status/date/amount/type filters, a mobile-friendly tab strip, responsive review rows, and the existing permission-gated upload/actions.
- **Quality gate**:
  - `npx vitest run src/components/bills-workspace.test.ts` PASS (10 tests).
  - `npm test -- --run` PASS (121 test files, 516 tests passed, 4 files and 6 tests skipped).
  - `npm run typecheck` PASS.
  - `npm run lint` PASS.
  - `npm run test:integration` PASS (4 files, 8 tests passed, 4 files and 6 tests skipped).
  - `npm run build` PASS (Next.js production build generated successfully).
  - Authenticated browser QA PASS at desktop and 390px mobile widths, including tabs, filters, bill links, source-file metadata, and upload dialog states.
- **Remaining release scope**: Final legacy deep-link/redirect cleanup belongs to Chunk 6, and full release evidence belongs to Chunk 8. No Git, branch, migration, or deployment actions were performed.

## August 7, 2026 — Customer App IA Chunk 3: Vendor Accounts and Locations

- **Data Model & Repository Layer (`src/lib/portal/types.ts` & `src/lib/portal/repository.ts`)**:
  - Added `PortalExpenseAccount` type and mapped `expenseAccounts` from the Supabase `expense_accounts` table into `PortalData`.
  - Added `expenseAccountId` to `PortalContract` type and mapped it from the `contracts` table.
- **Vendor Accounts Tab (`/app/vendors/[vendorId]?tab=accounts`)**:
  - Exposed service accounts, subscriptions, meters, and locations inside the central vendor workspace.
  - Implemented `formatVendorAccountLabel` following strict label hierarchy: (1) Customer-entered label, (2) Location name, (3) Category + masked reference, (4) `Vendor account`.
  - Implemented `maskAccountReference` ensuring full account numbers are never exposed (e.g. `Account ending ...5124`).
  - Added **"Bills needing account match"** / **"Unmatched bills"** section for extracted invoices where `expense_account_id === null` or `expense_account_match_status !== 'matched'`, with badges for `Vendor matched`, `Account needs review`, and `Location needs review`.
- **Account Detail Side Panel (`/app/vendors/[vendorId]?tab=accounts&account=[expenseAccountId]`)**:
  - Rendered slide-out Account Detail panel supporting URL state persistence.
  - Displays account identity, masked reference, assigned location, service dates (`serviceStartDate`, `serviceEndDate`), linked bill history, linked contracts, and linked findings.
  - Provides primary actions: `"Upload bill for this account"` and `"Set monitoring"`.
- **Vendor Overview Integration**:
  - Updated relationship summary band Accounts card to show active accounts count, location count, and accounts needing review breakdown.
  - Made card clickable to navigate directly to the Accounts tab.
- **Quality Gate**:
  - Unit tests: `src/components/vendor-accounts.test.ts` PASS (9 tests passed).
  - Full test suite: `npm test -- --run` PASS (120 test files, 506 tests passed).
  - `npm run typecheck` PASS (`tsc --noEmit` clean, exit code 0).
  - `npm run lint` PASS (`eslint .` clean, 0 errors, 0 warnings).
  - `npm run build` PASS (Next.js Turbopack production build clean).

## August 7, 2026 — Customer App IA Chunk 2: Vendor Directory and Central Vendor Workspace

- **Central Vendor Directory (`/app/vendors`)**:
  - Restructured vendor index into a clear, scannable table directory with attention pills, account counts, annual spend, latest expense, next contract end, and monitoring state.
  - Implemented 7-tier attention-sorting order: (1) Bills needing review, (2) Monitoring attention required, (3) Urgent contract deadline, (4) Open high-priority findings, (5) Pending actions, (6) Active healthy vendors, (7) Terminated/inactive vendors.
  - Added filter pills (`All`, `Needs attention`, `Active`, `Monitored`, `Inactive`) for rapid operational filtering.
  - Updated directory header with `"Add vendor"` primary action and `"Upload bill"` secondary action.
- **Central Vendor Workspace (`/app/vendors/[vendorId]`)**:
  - Added page header scope badge (`Vendor workspace · Scoped to ${vendor.name}`).
  - Simplified vendor navigation to a 6-tab strip: `Overview`, `Accounts`, `Bills`, `Contracts`, `Findings`, `Activity`.
  - Added graceful legacy URL parameter mapping (`actions` & `results` -> `findings`, `files` -> `bills`, `monitoring` -> `overview`, `history` -> `activity`).
  - `Overview` tab: Spend summary band, Value summary card (Potential vs Verified value with explicit `ShieldCheck` disclosure note), `VendorMonitoringCard`, `DataCompletenessChecklist`.
  - `Accounts` tab: Mapped service accounts and locations.
  - `Bills` tab: `Bills & Spend` vs `Source Files` subview toggle.
  - `Contracts` tab: Contract terms, notice windows, and renewal risk.
  - `Findings` tab: 3 stacked sections (`Findings`, `Pending actions`, `Results`), each with an explicit cross-vendor link (`View all findings across vendors →`, `View all actions across vendors →`, `View all results across vendors →`).
  - `Activity` tab: Full relationship audit history timeline.
- **Quality Gate**:
  - `npm test -- --run` PASS (119 test files, 497 tests passed; including new `vendor-workspace.test.ts`).
  - `npm run typecheck` PASS (`tsc --noEmit` clean).
  - `npm run lint` PASS (0 errors, 0 warnings).
  - `npm run build` PASS (Next.js Turbopack production build clean).

## August 6, 2026 — Customer App IA Chunk 1: Navigation, Terminology, and Sidebar

- **Customer sidebar**: Replaced the 10 un-grouped record-type destinations with an 8-destination workflow navigation grouped under `MONITOR` (Vendors, Bills & Spend, Contracts), `OPTIMIZE` (Findings, Actions), and `PROVE` (Results), plus Command Center and Settings.
- **Section labels**: `MONITOR`, `OPTIMIZE`, and `PROVE` labels appear only when the sidebar is expanded and hide cleanly in collapsed mode via `.sidebar-collapsed .nav-section-label { display: none; }`.
- **Active route mapping**: Implemented `isRouteActive(navHref, pathname)` supporting primary routes (`/app`, `/app/vendors`, `/app/bills`, `/app/contracts`, `/app/findings`, `/app/actions`, `/app/results`, `/app/settings`) and active mapping for legacy routes (`/app/expenses`, `/app/documents`, `/app/opportunities`, `/app/savings`, `/app/reports`).
- **Global action**: Updated topbar action to `"Upload bill or document"`.
- **Search vocabulary & copy**: Updated global search categories to `Vendors`, `Bills`, `Contracts`, `Findings`, `Actions`, `Source files`, and `Spend records`. Updated finding result detail copy to use `opportunityTrustLabel`.
- **Mobile navigation**: Added bottom navigation bar with 5 targets including a "Menu" button that toggles a mobile drawer overlay sheet containing the full grouped navigation.
- **Route aliases**: Updated `portal-pages.tsx` page names map and routing map to render appropriate workspace views for `/app/bills`, `/app/findings`, and `/app/results`.
- **Quality gate**:
  - `npm test -- --run` PASS (118 test files, 493 tests passed; including new `app-navigation.test.ts`).
  - `npm run typecheck` PASS (`tsc --noEmit` clean).
  - `npm run lint` PASS (0 errors, 0 warnings).
  - `npm run build` PASS (Next.js Turbopack build clean).

## August 6, 2026 — Live verification completed for bill upload repair

- Applied and verified the five forward migrations required by the bill-upload repair in the Costivra Supabase project `skfocjrykyvsaviyhdea`. The recorded remote migration entries are documented in `08_LIVE_VERIFICATION_REPORT.md`.
- Verified the live schema, scan trigger, service-role-only scan ledger boundary, invoice semantics, evidence source keys, opportunity trust fields, and post-migration Supabase advisor state. The new scan table is intentionally fail-closed with no browser policy; the existing leaked-password-protection warning and informational index/RLS findings remain.
- Passed the final local quality gate: typecheck, lint with two existing `app-shell.tsx` warnings, 487 unit tests, production build, and `git diff --check`.
- Passed the authenticated end-to-end workflow against the connected Supabase project. It created and cleaned a disposable workspace and covered sign-in, stored invoice rendering, breakdown API `200`, approval/action/savings transitions, audit evidence, and unsupported-value trust labeling.
- Passed a live browser upload using the committed synthetic utility PDF. The upload produced a clean security snapshot, reconciled `$76.00` invoice, one line item, two page-aware evidence references, and correct unresolved identity/location matches. The disposable user, workspace, database records, and storage object were removed; the shared vendor was preserved.
- Current release verdict remains `INTERNAL_TESTING_ONLY`: production deployment SHA, mobile screenshot evidence, the single actionable completion toast, and the two private TXU paired-balance PDF replays remain unverified. See `08_LIVE_VERIFICATION_REPORT.md` for the evidence and next gates.

## August 6, 2026 — Chunk 6 release validation

- **Automated validation**: `npm test -- --run` PASS (117 files, 487 tests; 4 files and 6 tests skipped); focused breakdown route tests PASS (5 tests); focused owner trust-route tests PASS (3 tests); focused owner evidence-option data test PASS (1 test); `npm run eval:invoices -- --manifest tests/fixtures/invoices/golden-manifest.smoke.json --predictions tests/fixtures/invoices/golden-predictions.smoke.json` PASS (all 10 smoke metrics 100%, zero extraction errors); `npm run test:integration` PASS (8 tests, 6 credential-gated skips); `npm run typecheck` PASS; `npm run build` PASS; `npm run lint` PASS with the two existing `src/components/app-shell.tsx` warnings; `git diff --check` PASS.
- **End-to-end validation**: `npm run test:e2e` PASS (26 passed, 6 skipped across desktop and mobile projects). Public homepage and the configured smoke paths rendered successfully. The authenticated customer flow was separately enabled with the local `.env.local` credentials and passed below.
- **Authenticated customer replay**: `RUN_AUTHENTICATED_E2E=1 npm run test:e2e:authenticated` PASS (1 desktop test, disposable workspace cleaned up). This confirms sign-in, invoice/bill rendering, the document breakdown endpoint returning `200` from a stored legacy analysis record, opportunity approval, action approval, and savings workflow against the connected Supabase project. The same rendered test asserts that a stored `$3,000` amount with incomplete provenance is labeled `Needs evidence`, says `Not shown until calculated`, and does not display `$3,000`. The new trust banner and owner review actions remain migration-gated.
- **Runtime**: Restored the normal local Next server on `http://localhost:3000` after Playwright. No production deployment or remote migration was performed.
- **Next step**: Apply and verify the forward migrations in a controlled environment, then run the authenticated customer/owner browser walkthrough before release.
- **Live schema finding**: The disposable authenticated customer run initially failed because the connected Supabase project does not yet have `opportunities.customer_visible`. The portal read path now falls back safely before migration, and the authenticated customer workflow passes. The trust banner’s persisted sample flag and owner mutation actions still require the forward migration; no remote migration was applied.
- **Pre-migration owner safety**: The owner trust queue now falls back to legacy opportunity columns for read-only review, and mutation attempts return a clear migration-required response instead of an opaque server error. Evidence attachment checks document ownership with explicit tenant-scoped queries.
- **Breakdown compatibility**: The breakdown route now selects only stable document columns. When the scan snapshot columns are absent, it recognizes only a successful tenant-scoped legacy ingestion audit event as clean; records without that proof remain unavailable. Added a regression test for the pre-migration path. The scan-provenance migration remains required for new upload writes and full customer/owner release QA.
- **Evidence compatibility**: The live authenticated replay also exposed the pending `evidence_references.source_key` column. The breakdown route now retries with stable evidence columns when that migration is absent; the live replay passed after this fallback was added. New schemas retain source-key selection and ordering.
- **Owner remediation**: The trust-review table now offers a multi-select of evidence from source documents linked to the opportunity’s expense account. The API enforces the same source-document boundary, deduplicates selections, records the link, and audits the action. The owner UI/live walkthrough remain migration-gated because trust-state persistence is not yet present in the connected project.
- **Final verdict**: `INTERNAL_TESTING_ONLY`. The local and disposable authenticated evidence is green, but `BILL_UPLOAD_FLOW_READY` is not proven because the forward migrations have not been applied to the connected Supabase project, owner browser QA is not live-verified, production deployment identity is not recorded for this worktree, and the exact private invoice replay was intentionally not run or committed.
- **Controlled release prerequisites**: Apply and verify `20260806171657_bill_upload_security_provenance.sql`, `20260806210000_txu_invoice_semantics_and_identity.sql`, `20260806213000_evidence_source_keys.sql`, and `20260806220000_finding_trust_and_sample_workspaces.sql`; then run the owner trust-review walkthrough and the complete upload/breakdown evidence capture against the deployed SHA.
- **Read-only live schema audit**: A service-side column-availability check against the connected Supabase project returned `42703` for `documents.security_scan_status`, `invoices.current_charges`, `evidence_references.source_key`, `opportunities.customer_visible`, and `organizations.is_sample_workspace`. This confirms all four forward migration gates remain unapplied; no rows were read or changed.

## August 6, 2026 — Bill upload repair Chunk 5: finding trust, tariff guardrails, and sample workspaces

- **Trust states**: Added explicit `evidence_backed`, `needs_evidence`, `manual_note`, `demo_example`, and `deprecated` states. Customer-facing monetary values are only exposed when a deterministic rule, version, calculation inputs/results, source record, and evidence references are all present.
- **Scope and provenance**: Portal opportunity records now carry source document, expense account, service location, account reference, generated-by, evidence count, rule version, and last-evaluated context. Same-vendor records are narrowed to the invoice account/location when that context is available.
- **Energy guardrail**: Energy extraction accepts tariff dimensions only when visibly present. Category analysis persists a fails-closed tariff review; without an official current tariff and assigned rate-code comparison it returns the neutral “Tariff review may be worthwhile” message and no amount.
- **Sample/demo controls**: Seeded Northstar data is marked as a sample workspace and the customer portal displays a persistent sample banner plus an upload warning. Owner-only trust review operations can mark a record as demo, keep it as an internal note, attach same-workspace evidence, hide it, or deprecate it without silently deleting it.
- **Validation**: Trust/tariff/context tests PASS (8 tests); full unit suite, typecheck, build, lint, public E2E, and authenticated customer E2E have now passed. Owner trust-review and sample-workspace banner QA remain migration-gated.
- **Known rollout risk**: Apply `supabase/migrations/20260806220000_finding_trust_and_sample_workspaces.sql` before using the new portal query or owner remediation route in a deployed environment.

## August 6, 2026 — Bill upload repair Chunk 4: page-aware evidence and line-item provenance

- **Evidence persistence**: Extraction evidence now keeps nullable source pages and stable line-item source keys. Native PDF text retains page markers; no page is fabricated when the source does not provide one.
- **Line-item traceability**: Line items carry a stable `line-N` key, evidence rows are inserted before invoice records, and classifications receive the matching evidence-reference IDs. Missing line-item evidence forces review and is recorded as `line_item_evidence_missing`.
- **Breakdown behavior**: Evidence is ordered deterministically, browsable through page-sized API results, and displayed separately as invoice-field evidence versus line-item links. Each classified line shows its first source page, short quote, and a page-fragment link when a private PDF download is available. Findings without stored evidence are labeled `needs_evidence` rather than evidence-backed.
- **Migration**: Added `supabase/migrations/20260806213000_evidence_source_keys.sql` for the source-key column and index. Existing legacy evidence is not backfilled or assigned guessed pages.
- **Validation**: Focused provenance/API tests PASS (12 tests); `npm run typecheck` PASS; `npm test -- --run` PASS (113 files, 476 tests; 4 files and 6 tests skipped); `npm run lint` PASS with the two existing `app-shell.tsx` warnings; `git diff --check` PASS.
- **Known rollout risk**: Apply and verify the Chunk 1, Chunk 3, and Chunk 4 migrations before production intake writes the new scan, invoice-semantics, identity, and evidence source-key fields.

## August 6, 2026 — Account locations and activity-linked internal notes

- **Location workflow**: Replaced the Operating footprint count with a plus action. The account detail card now animates an inline address form beneath the map with location name, street, city, state, ZIP, country, save, and cancel controls. The server validates the account, required address fields, duplicate names, and records an internal audit event.
- **Note workflow**: Added a plus action to the Internal CRM note card that opens the existing internal-note composer with the current account prefilled. Existing teammate mention controls remain available; mentioned teammates receive the existing in-app notification and internal email path.
- **Activity linkage**: Notifications now deep-link to `/manage/accounts/:id?tab=activity&activity=:activityId`, and the account Activity tab scrolls the exact activity row into view. Notes continue to persist as `crm_activities`, so they appear in the account Activity tab and global recent activity surfaces after refresh.
- **Files**: `src/components/manage-portal.tsx`, `src/app/globals.css`, `src/app/api/manage/locations/route.ts`, `src/app/api/manage/locations/route.test.ts`, `src/app/api/manage/activities/route.ts`.
- **Validation**: Local browser QA passed for account-page identity, location-plus expansion, animated form rendering, note-plus account prefill, Activity tab rendering, deep-link row targeting, and zero browser warnings/errors. `npm run typecheck` PASS; focused ESLint PASS; location route tests PASS (2 tests); account API tests PASS (3 tests); `git diff --check` PASS.

## August 6, 2026 — Searchable account selection for client contacts

- **User-visible change**: Replaced the client-contact account dropdown with a searchable input that filters existing accounts and shows up to eight matching suggestions with account names and industries.
- **Prefill and validation**: The account-page plus action still opens the existing modal with the current account prefilled. Selecting a suggestion preserves the real account ID; arbitrary text is rejected with a clear validation message.
- **Files**: `src/components/manage-portal.tsx` and `src/app/globals.css`.
- **Validation**: Local desktop browser QA confirmed prefill, filtering, suggestion selection, account-ID preservation, invalid free-text rejection, and zero browser warnings/errors. `npm run typecheck` PASS; focused ESLint for `manage-portal.tsx` PASS; focused account API tests PASS (3 tests); `git diff --check` PASS.

## August 6, 2026 — Bill upload repair Chunk 3: TXU semantics, reconciliation, and identity matching

- **Extraction contract**: Added separate `previousBalance`, `paymentsAndCredits`, `balanceForward`, `currentCharges`, and `currentPeriodCredits` fields. The AI instructions explicitly keep prior-balance activity out of current-period credits, do not calculate missing totals, and preserve `totalAmount` as current bill charges while `amountDue` remains the final amount requested.
- **Energy fields**: Added validated optional energy service details for customer, service address, service identifier, meter, product, utility territory, billing days, usage, demand, multiplier, average price, and read dates. PDF text extraction now preserves page markers; evidence keeps a source page when available instead of hard-coding page 1. Customer-facing identifiers are masked.
- **Deterministic reconciliation**: Added exact-cent checks for line items to current charges, balance forward plus current charges to amount due, and previous balance minus payments to balance forward. Missing semantics remain incomplete; no floating-point arithmetic was added.
- **Identity matching**: Added separate workspace customer, expense-account, and service-location matching. Matching uses only allowlisted account, identifier, meter, and normalized full-address evidence; vendor identity alone cannot assign an account or location. Review codes include `workspace_customer_name_mismatch`, `expense_account_unmatched`, `service_identifier_unmatched`, and `service_location_unmatched`.
- **Synthetic fixtures**: Added de-identified three-page Case A and Case B TXU layouts covering paid prior balance and carried-forward balance. No private customer PDFs, full account numbers, or service identifiers were added.
- **Files**: New `src/lib/domain/energy-service.ts`, `src/lib/domain/invoice-matching.ts`, `src/lib/domain/txu-extraction.test.ts`, `src/lib/domain/invoice-matching.test.ts`, two synthetic fixtures, and `supabase/migrations/20260806210000_txu_invoice_semantics_and_identity.sql`; updated extraction, intake, invoice persistence, portal, and operator review surfaces.
- **Validation**: Focused TXU/domain tests PASS (25 tests); `npm run typecheck` PASS; `npm run lint` PASS with two existing `app-shell.tsx` warnings; `npm test -- --run` PASS (111 files, 471 tests; 4 files and 6 tests skipped); `npm run test:integration` PASS (4 files, 8 tests; 4 files and 6 tests skipped); `npm run test:e2e` PASS (26 passed, 6 skipped); `npm run build` PASS; `git diff --check` PASS.
- **Known rollout risk**: The migration must be applied and verified in production before extraction writes the new invoice columns. The real private TXU PDFs remain intentionally untested in-repository; synthetic fixtures cover the semantics without exposing customer data.

## August 6, 2026 — Account relationship-map contact entry point

- **User-visible change**: Replaced the People count badge in the account right rail with a plus icon button. It opens the existing `Add client contact` modal rather than creating a second contact flow.
- **Prefill behavior**: The current account is passed into the modal as the controlled account selection, so the form opens with `Apollo QA - HubSpot Profile` selected while leaving the account selector available for correction.
- **Files**: `src/components/manage-portal.tsx` and `src/app/globals.css`.
- **Validation**: Local browser QA confirmed the plus button, modal opening, preselected account ID, visible contact fields, and zero console errors. `npm run typecheck` PASS; focused ESLint for `manage-portal.tsx` PASS; focused account API tests PASS (3 tests); `git diff --check` PASS.

## August 6, 2026 — Account detail motion and floating Back control

- **User-visible change**: The compact floating Back control now uses the same contained icon-button treatment as the phone action, while the page-top `Back to Accounts` control remains the existing text link.
- **Interaction design**: The account technology list now measures its additional content and animates its height and opacity on `Show all` / `Show fewer`, moving the records beneath it downward and upward with the profile panel. Reduced-motion users receive an immediate state change.
- **Files**: `src/components/manage-portal.tsx` and `src/app/globals.css`.
- **Browser QA**: Local account detail QA passed at desktop and `390x844`. Confirmed page identity, nonblank render, contained compact Back control, preserved plain top Back control, expanded/collapsed technology states, surrounding-card movement, mobile alignment, and no horizontal overflow.
- **Validation**: Targeted account API tests PASS (3 tests); lint PASS with two existing `app-shell.tsx` warnings; `git diff --check` PASS. Full typecheck and unit suite are currently blocked by unrelated concurrent invoice-model edits: four `InvoiceCandidate` type errors and six invoice reconciliation test failures in `src/lib/ai`, `src/lib/domain`, and `src/lib/documents`.

## August 6, 2026 — Bill upload repair Chunk 2: attachment state, honest progress, and completion handling

- **User-visible change**: Rebuilt the bill-upload modal around explicit idle, selected, submitting, complete, quarantined, duplicate, and error states. The selected attachment remains visible during submission with filename, extension, formatted size, vendor assignment, and change/remove controls.
- **Progress contract**: Replaced percentage-style progress with honest “Reading your bill” copy, a moving scan line, and the three real stages: secure upload, security and integrity check, and reading bill details. Reduced-motion users receive the same information without motion.
- **Completion contract**: A document is “ready” only when the server reports `analysisReady: true`. The modal closes before the parent refreshes once and shows one actionable toast. The inspector never opens automatically; the action opens it only after an explicit click. Duplicate, quarantined, rejected, and still-processing outcomes retain their distinct next actions.
- **Files**: `src/components/document-upload-experience.tsx`, `src/components/portal-pages.tsx`, `src/lib/documents/client-upload.ts`, `src/lib/documents/upload-notifications.ts`, and related tests.
- **Validation**: Focused upload tests PASS (15 tests); `npm run typecheck` PASS; `npm run lint` PASS with two existing `app-shell.tsx` warnings; `npm test -- --run` PASS (109 files, 465 tests; 4 files and 6 tests skipped); `npm run test:integration` PASS (4 files, 8 tests; 4 files and 6 tests skipped); `npm run test:e2e` PASS (26 passed, 6 skipped); `npm run build` PASS; `git diff --check` PASS.
- **Browser QA**: Authenticated desktop QA confirmed the upload dialog opens, the selected modal surface is visible, Cancel closes the dialog, and focus returns to the upload trigger. Native file injection was unavailable in the connected browser, so the real upload mutation and upload-specific mobile interaction remain covered by automated tests rather than a live document upload.
- **Known rollout risk**: The forward scan-provenance migration from Chunk 1 still must be applied and verified in production before deploying the new breakdown/upload contract.

## August 6, 2026 — Account detail rail field controls

- **User-visible change**: Industry, Website, and Phone in the account detail rail are now copyable and editable through the shared CRM field control. Website no longer repeats its field label inside the value area, and its link uses the same compact value sizing as the neighboring fields.
- **Interaction design**: Copy and edit actions appear in a dedicated left-side action column on hover/focus, keeping the value readable and preventing controls from covering links or phone numbers. The field rows remain usable at the mobile `390x844` breakpoint.
- **Data boundary**: Website and industry continue through the existing atomic account mutation. Operator-entered phone is stored as a nullable `crm_account_profiles.phone` override so the Apollo enrichment phone remains available as provider data rather than being overwritten silently.
- **Files**: `src/components/manage-portal.tsx`, `src/components/records/editable-field-row.tsx`, `src/app/globals.css`, `src/app/api/manage/accounts/[id]/route.ts`, `src/lib/manage/types.ts`, `src/lib/manage/repository.ts`, `src/app/api/manage/accounts/[id]/route.test.ts`, and `supabase/migrations/20260806195000_add_operator_account_phone.sql`.
- **Validation**: Browser QA passed locally at desktop and `390x844`; hover geometry confirms actions precede the value; edit mode opens the correct Industry input; `npm run typecheck` PASS; `npm run lint` PASS with two existing `app-shell.tsx` warnings; `npm test` PASS (109 files, 465 tests; 4 files and 6 tests skipped); `npm run build` PASS; `git diff --check` PASS.
- **Release note**: Apply the new Supabase migration before deploying the phone-edit path. No production deployment was performed in this task.

## August 6, 2026 — Account header metadata and LinkedIn identity

- **User-visible change**: Account detail headers now place the industry and headquarters location together on one metadata line, with the company legal name retained as a separate subtitle when available.
- **LinkedIn action**: Replaced the generic chain icon with the actual LinkedIn “in” mark while preserving the existing website globe, external-link behavior, accessible label, and hover treatment.
- **Files**: `src/components/manage-portal.tsx` and `src/app/globals.css`.
- **Validation**: Authenticated browser QA passed at desktop and `390x844`; typecheck passed; lint passed with two existing `app-shell.tsx` warnings; `npm test -- --run` passed (108 files, 459 tests; 4 files and 6 tests skipped); `git diff --check` passed.
- **Known repository issue**: `npm run build` compiled the app but failed on an unrelated pre-existing type error in `src/components/document-upload-experience.tsx:141` (`documentId` is not present on the rejected upload result variant). This UI change does not modify that file.

## August 6, 2026 — Interactive owner dashboard follow-ups and activity

- **User-visible change**: Follow-up rows in `/manage` are now direct links to the related contact or account work tab. Recent activity rows are direct links to the related record's activity tab.
- **Interaction design**: Added the existing CRM row hover/focus treatment to activity rows so the clickable target is clear without adding loud card decoration.
- **Activity clarity**: Added type-specific icons for notes, calls, meetings, email, account creation, status changes, inquiries, and task events. Activity contact IDs are now carried through repository normalization so contact-linked events reach the correct page.
- **Files**: `src/components/manage-portal.tsx`, `src/app/globals.css`, and `src/lib/manage/repository.ts`.
- **Validation**: `npm run typecheck` PASS; `npm run lint` PASS with two existing `app-shell.tsx` warnings; `npm test -- --run` PASS (108 files, 458 tests; 4 files and 6 tests skipped); `npm run build` PASS; `git diff --check` PASS. Browser QA confirmed follow-up navigation to a contact work tab, activity navigation to an account activity tab, and the stacked mobile layout at `390x844`.

## August 6, 2026 — Bill upload repair Chunk 1: breakdown contract and scan provenance

- **Implementation**: Added `agent/bill-upload-01-breakdown-contract` with a forward Supabase migration for `document_status` alignment, document scan snapshots, and the server-only append-only `document_security_scan_attempts` ledger. Clean ingestion and quarantine rescan paths now persist safe scan provenance.
- **Breakdown API**: The endpoint uses only live-compatible `sha256` plus the new snapshot fields, returns `400` for invalid IDs, `404` for tenant-scoped absence, `202` for processing or missing analysis, `409` for blocked files, and a traceable safe `500` for database failures. It reads stored category analysis, classifications, and ordered evidence instead of recomputing on GET.
- **UI contract**: The breakdown modal understands `clean` scan status, the `sha256` field, nullable protected download URLs, and honest processing responses. The generic sparkle glyph was not retained in the edited surface.
- **Validation**: `npm run typecheck` PASS; focused breakdown route tests PASS (4 tests); intake/security boundary tests PASS (7 tests); `git diff --check` PASS. Full lint, integration, build, and browser release gates remain for Chunk 6.
- **Live schema check**: Production schema was inspected read-only. The migration has not been applied to production in this chunk, so the new route must not be deployed ahead of the migration.
- **Unrelated work preserved**: Existing concurrent edits in `STATUS.md`, `src/app/globals.css`, and `src/components/manage-portal.tsx` were not modified by this chunk.

## August 6, 2026 — Owner dashboard summary cleanup

- **User-visible change**: Removed the four hard-coded summary-card SVG squiggles from `/manage`. They were not backed by trend data and made the cards feel visually unbalanced.
- **Replacement**: Added compact state markers (`Tracked`, `Current`, `Action queue`, and `In progress`) plus plain-language context for each count. Mobile summary cards stack their marker and context cleanly at the existing `780px` breakpoint.
- **Files**: `src/components/manage-portal.tsx` and `src/app/globals.css`.
- **Validation at this milestone**: `npm run typecheck` PASS; `npm run lint` PASS with two existing `app-shell.tsx` warnings; the initial unit/build checks were blocked by concurrent document-upload work in the working tree, then passed after that work settled. See the interactive dashboard entry above for the current full-suite results.
- **Browser QA at this milestone**: The authenticated production owner tab confirmed the deployed page still contained the old four sparklines. Local authenticated QA was completed in the follow-up dashboard pass above.

## August 6, 2026 — Homepage premium-upgrade baseline (Chunk 0)

- **Baseline revision**: `main` at `8543d4ae28ddf3f19d232639ac3d17b8e3f804f9`; the working tree already contained unrelated lifecycle-history changes, which were preserved.
- **Screenshots outside committed source**: `output/playwright/homepage-baseline/homepage-1440x900.png`, `homepage-1792x900.png`, `homepage-768x1024.png`, and `homepage-390x844.png`.
- **Current public section order**: floating header; hero and illustrative product preview; workflow; evidence viewer; doctrine/trust; pricing; FAQ; footer.
- **Current hero and CTAs**: eyebrow `Recurring bill and contract monitoring for growing businesses`; headline `Find unnecessary costs and renewal risks in your business bills.`; primary `Upload 3 bills for a free review` → `/scan`; secondary `See how monitoring works` → `#how-it-works`; header CTA `Scan three bills free` → `/scan`.
- **Interaction audit**: header CTA and hero CTA routes resolve to `/scan`; the preview auto-advances; evidence category controls, FAQ toggling, and the mobile menu work; mobile overflow at `390x844` is zero; the audit observed no runtime console errors. The visible `View source` control is inert, and `Review opportunity` directs public visitors to `/app/opportunities` rather than a public result.
- **Final marketing CSS cascade map**: `.marketing-header` is defined at lines 124, 756, 890, 1918, and finally 2010 (final radius: 17px); `.hero`, `.hero-inner`, `.hero-copy`, and `.product-frame` have baseline rules near lines 143–155 and active dark-hero overrides at 769–781 plus responsive overrides at 910–918; `.workflow`, `.evidence-section`, `.doctrine`, and `.pricing` receive final marketing overrides at 812–830; `.faq` has only its base selector at 234; `.marketing-footer` has base styling at 241–242 and responsive overrides at 393–394. The duplicated cascade is a maintainability risk, not changed in this audit-only chunk.
- **Existing coverage**: `tests/e2e/public-smoke.spec.ts` covers heading/navigation and mobile-menu overflow alongside other public checks.
- **Commands and results**: manual Playwright browser audit at all four sizes: PASS; `npx playwright test tests/e2e/public-smoke.spec.ts`: PASS (10 passed, 2 expected skips); `npm run typecheck`: BLOCKED by unrelated uncommitted errors in `src/components/manage-portal.tsx` (`lifecycleFilter`, `setLifecycleFilter`, `setPage`, and `setSelectedIds` undefined). Per the validation order, lint and production build were not run after this failure.
- **Known warning**: the public smoke server prints a non-failing Next.js warning that the Costivra mark has only one rendered dimension changed. Address during a later visual/CSS chunk with the brand component changes in scope.
- **Next recommended task**: Chunk 1, header and hero refinement, only after approval and after resolving the unrelated TypeScript blocker.

## August 6, 2026 — Homepage header and hero refinement (Chunk 1)

- **User-visible change**: Replaced the hero eyebrow, headline, body, audience line, trust row, primary CTA, and secondary CTA with the approved finance-and-operations copy. Header navigation now uses `Product`, `What we review`, `How it works`, `Security`, and `Pricing`; header and mobile drawer CTAs use `Scan 3 bills free`.
- **Layout and interaction**: Tightened the desktop header and hero rhythm so both actions and the trust row are visible at `1440x900`. Added the `#evidence` destination for `See a finding from source to result`. Mobile hero layout is explicitly single-column at `390x844`; the mobile menu opens, closes, and reopens without overflow. Lenis now does not initialize when reduced motion is requested.
- **Brand/runtime cleanup**: Costivra mark sizing now supplies both rendered dimensions, removing the previous Next.js image warning during the homepage browser run.
- **Files**: `src/components/home-page.tsx`, `src/components/marketing-shell.tsx`, `src/app/globals.css`, `src/components/smooth-scroll.tsx`, `src/components/brand.tsx`, and `tests/e2e/public-smoke.spec.ts`.
- **Screenshots**: `output/playwright/homepage-chunk-1/homepage-1440x900.png` and `output/playwright/homepage-chunk-1/homepage-390x844.png`.
- **Validation**: `npm run typecheck` PASS; `npm run lint` PASS with two existing `app-shell.tsx` warnings; `npm run build` PASS; focused Playwright checks PASS (4 passed, 2 expected skips) for desktop/mobile homepage navigation, exact copy/CTA assertions, evidence anchor behavior, reduced motion, and mobile overflow. The full public smoke file's unrelated worker guard checks returned 404 rather than expected 401 in the final run; homepage checks passed.
- **Design QA**: Compared baseline and final screenshots at `1440x900`, plus final mobile at `390x844`. The desktop headline is shorter, CTA hierarchy is visible, the header is less inflated, and the mobile composition no longer clips into a two-column layout.
- **Next recommended task**: Chunk 3, honest proof and verified-value methodology, after explicit approval.

## August 6, 2026 — Interactive public product demo (Chunk 2)

- **User-visible change**: Replaced the hero's theatrical preview with a focused public demo built from `src/components/marketing-demo/`. It uses clearly labeled synthetic data and moves through `Source received`, `Change detected`, `Evidence linked`, `Approval required`, and `Later result checked`.
- **Evidence interaction**: `View source` now opens a modal dialog with a synthetic telecom bill excerpt, highlighted annual service adjustment, extracted fact, evidence reference `EV-ILL-003`, calculation inputs, confidence, and an illustrative-data note. Focus moves into the dialog, Escape closes it, focus returns to the trigger, and Tab remains inside the dialog.
- **Authorization boundary**: `Review opportunity` stays on the public homepage and opens an explicit approval state. The panel names the proposed vendor question, data involved, approver, and the fact that Costivra has not acted; approve/decline buttons are illustrative only and send no external communication.
- **Result wording**: The later-result state separates potential annual value, approved action, work in progress, and verified/unverified status. It uses the required wording `Example later invoice confirms the changed charge.` and explicitly says the demonstration is not a real customer result.
- **Files**: `src/components/marketing-demo/demo-data.ts`, `src/components/marketing-demo/opportunity-demo.tsx`, `src/components/marketing-demo/source-evidence-drawer.tsx`, `src/components/marketing-demo/demo-approval-state.tsx`, `src/components/marketing-demo/demo-verification-state.tsx`, `src/components/home-page.tsx`, `src/app/globals.css`, and `tests/e2e/public-smoke.spec.ts`.
- **Screenshots**: `output/playwright/homepage-chunk-2/homepage-default-1440x900.png`, `homepage-default-390x844.png`, `source-drawer-1440x900.png`, `approval-state-1440x900.png`, and `result-state-390x844.png`.
- **Validation**: targeted lint PASS; `npm run typecheck` PASS; `npm test -- --run` PASS (104 files, 437 tests; 4 files and 6 tests skipped); `npm run lint` PASS with two existing `app-shell.tsx` warnings; `npm run build` PASS; focused Playwright public-homepage checks PASS (8 passed, 2 expected project skips) on desktop and Pixel 5 mobile, including reduced-motion demo behavior. The full public smoke worker guards remain an unrelated 404-vs-401 mismatch.
- **Design QA**: Desktop source drawer, approval state, default hero, and mobile result state were inspected from captured screenshots. The demo remains public, evidence-led, and calm at the tested breakpoints; no generic AI sparkle/magic treatment was introduced.
- **Next recommended task**: Chunk 4, evidence section and page-story reorder, only after explicit approval.

## August 6, 2026 — Honest proof and verified-value methodology (Chunk 3)

- **Proof-mode decision**: Repository review found no explicitly approved and consented public customer case. The homepage therefore renders the methodology fallback; it does not invent a logo, company name, quote, amount, or customer result.
- **User-visible change**: Added a quiet pale-blue section immediately below the hero titled `Value is not verified until later evidence proves it.` Supporting copy keeps potential value separate from confirmed results and explains the later-evidence requirement.
- **Evidence chain**: The section labels `Potential` as a finding identified from source and deterministic calculation, while `Verified` remains `Not claimed yet`. It shows the four required steps: `Finding identified`, `Customer approves the method`, `Later evidence arrives`, and `Result is confirmed or rejected`.
- **Typed future-proof path**: Added `src/lib/public-proof.ts` with typed methodology and approved-case modes. `resolvePublicProof` falls back to methodology whenever an approved case lacks a non-empty `permissionReference`; synthetic approved-case content is covered in tests only.
- **Accessibility/layout**: Added a semantic section with an explicit heading, ordered evidence sequence, responsive mobile layout, and `scroll-margin-top` so the fixed header does not cover the section title when reached by an anchor or keyboard navigation.
- **Files**: `src/lib/public-proof.ts`, `src/lib/public-proof.test.ts`, `src/components/public-proof-section.tsx`, `src/components/home-page.tsx`, `src/app/globals.css`, and `tests/e2e/public-smoke.spec.ts`.
- **Screenshots**: `output/playwright/homepage-chunk-3/homepage-proof-1440x900.png`, `homepage-proof-390x844.png`, `proof-section-desktop.png`, and `proof-section-mobile.png`.
- **Validation**: `npm run typecheck` PASS; proof unit test PASS (4 tests); `npm test -- --run` PASS (105 files, 441 tests; 4 files and 6 tests skipped); `npm run lint` PASS with two existing `app-shell.tsx` warnings; `npm run build` PASS; focused Playwright fallback checks PASS (3 passed, 1 expected project skip) on desktop and Pixel 5 mobile; `git diff --check` PASS.
- **Next recommended task**: Chunk 4, evidence section and page-story reorder, only after explicit approval.

## August 6, 2026 — Evidence section and page-story reorder (Chunk 4)

- **Page order**: The public homepage now flows `hero → proof/methodology → evidence → workflow → doctrine/trust → pricing → FAQ`. Workflow content itself was not changed.
- **Evidence copy**: Replaced the internal `EVIDENCE VIEWER · EXTRACTION V3` label with `Source-linked finding` and `Bill and extracted facts · Illustrative example`.
- **Synchronized category control**: Software subscriptions, Telecom and internet, and Commercial energy review are now button-based category selectors with `aria-pressed` state. Each selector updates the same evidence viewer state: provider, document, relevant term, highlighted row, issue, extracted facts, confidence, calculation, potential value, and reconciliation/rule status.
- **Navigation boundary**: Each category has a separate quiet `Explore` link to its solution page. Switching categories does not navigate away from the homepage.
- **Mobile behavior**: Category controls remain visible before the evidence details, and the evidence viewer stacks into a readable single-column layout at `390x844`.
- **Generated-type hygiene**: Added `.next/dev/types` to `tsconfig.json` exclusions. Next may retain its generated include, but stale development route artifacts are excluded from TypeScript validation; the clean production route types remain authoritative.
- **Files**: `src/components/home-page.tsx`, `src/app/globals.css`, `tests/e2e/public-smoke.spec.ts`, `tsconfig.json`, `STATUS.md`, and `COSTIVRA_HOMEPAGE_UPGRADE_CHUNK_PLAN.md`.
- **Screenshots**: `output/playwright/homepage-chunk-4/evidence-software-1440x900.png`, `evidence-telecom-1440x900.png`, `evidence-energy-1440x900.png`, and `evidence-telecom-390x844.png`.
- **Validation**: `npm run typecheck` PASS; `npm test -- --run` PASS (105 files, 442 tests; 4 files and 6 tests skipped); `npm run lint` PASS with two existing `app-shell.tsx` warnings; `npm run build` PASS; focused category/browser checks PASS (3 passed, 1 expected project skip) on desktop and Pixel 5 mobile; `git diff --check` PASS.
- **Next recommended task**: Chunk 5, compact and concrete workflow, only after explicit approval.

## August 6, 2026 — Compact, concrete workflow (Chunk 5)

- **User-visible change**: Replaced the oversized workflow viewport with a compact five-stage sequence: Connect, Extract, Detect, Approve, and Verify. The copy now names the real Costivra progression from selected records to later evidence.
- **Product specificity**: Each stage includes one small artifact rather than a decorative icon: `3 files ready · 1 vendor`, `Annual adjustment · page 3`, `Potential change · $1,040 / mo`, `Finance owner · pending`, and `Later bill · awaiting`.
- **Layout and trust**: Desktop keeps one connected horizontal sequence; mobile stacks the five stages with a quiet connector. The repeated doctrine line was removed from workflow so the trust section remains the single homepage doctrine treatment. Workflow scroll targeting now leaves room for the fixed header.
- **Measured result**: Desktop workflow height is 492px after the change versus 597px in the prior-spacing reference, a reduction of 105px (17.6%).
- **Files**: `src/components/home-page.tsx`, `src/app/globals.css`, `tests/e2e/public-smoke.spec.ts`, and this status/tracking documentation.
- **Screenshots**: `output/playwright/homepage-chunk-5/workflow-before-reference-section.png`, `workflow-desktop-section.png`, `workflow-tablet-section.png`, and `workflow-mobile-section.png`.
- **Validation**: Focused Playwright checks PASS (5 passed, 1 expected project skip) on desktop and Pixel 5 mobile. The new workflow test covers exact stage order/count, copy, artifacts, doctrine removal, mobile ordering, and reduced-motion rendering. `npm run typecheck` PASS; `npm test -- --run` PASS (105 files, 442 tests; 4 files and 6 tests skipped); `npm run lint` PASS with two existing `app-shell.tsx` warnings; `npm run build` PASS; `git diff --check` PASS. Manual visual QA covered `1440x900`, `1024x900`, and `390x844`.
- **Remaining risk**: Workflow artifacts are illustrative UI states, not customer proof. Amounts and later-evidence labels must stay clearly synthetic until connected to approved public evidence. Existing lint warnings and unrelated worker endpoint mismatches remain unchanged.
- **Next recommended task**: Chunk 6, enterprise trust and security section, only after explicit approval.

## August 6, 2026 — Enterprise trust and security (Chunk 6)

- **User-visible change**: Replaced the old doctrine/trust block with `Built for decisions that affect real money.` and the required plain-language explanation of document interpretation, deterministic calculation, policy, human approval, source linkage, and audit history.
- **Supported trust claims**: The section presents six open-list controls: Private documents; Tenant-isolated records; Human approval; Source-linked findings; Audit history; and No broad inbox access required. Each claim is grounded in the repository’s private-storage, organization-boundary, approval, evidence, audit, and selected-upload rules.
- **Disclosure and CTA**: Added the required statement that Costivra does not automatically cancel services, sign contracts, change payment instructions, or send customer records to an outside advisor. Added the secondary `Review Costivra security` CTA to `/security`; browser QA verified the destination and existing security-page heading.
- **Certification boundary**: No SOC 2, ISO, HIPAA, GDPR-compliant, bank-grade, or enterprise-grade certification/security language was added.
- **Layout**: The trust section uses a dark, open, border-led list rather than a generic card grid. Desktop and tablet use two quiet columns; mobile stacks the same controls without horizontal overflow. The section preserves a single doctrine statement and keeps the homepage conversion CTA hierarchy intact.
- **Files**: `src/components/home-page.tsx`, `src/app/globals.css`, `tests/e2e/public-smoke.spec.ts`, and this status/tracking documentation.
- **Screenshots**: `output/playwright/homepage-chunk-6/trust-desktop-1440x900.png`, `trust-tablet-1024x900.png`, and `trust-mobile-390x844.png`.
- **Validation**: Targeted ESLint PASS; focused Playwright PASS (5 passed, 1 expected project skip) covering required claims, prohibited certification text, CTA navigation, contrast tokens, mobile overflow, and reduced motion; `npm run typecheck` PASS; `npm test -- --run` PASS (105 files, 442 tests; 4 files and 6 tests skipped); `npm run lint` PASS with two existing `app-shell.tsx` warnings; `npm run build` PASS; `git diff --check` PASS. Production-server visual QA had no console or page errors at `1440x900`, `1024x900`, and `390x844`.
- **Remaining risk**: This is a plain-language presentation of current product rules, not a certification or independent security audit. Existing lint warnings and unrelated worker endpoint mismatches remain unchanged.
- **Next recommended task**: Chunk 7, pricing, navigation, footer, and CTA consistency, only after explicit approval.

## August 6, 2026 — Pricing, navigation, footer, and CTA consistency (Chunk 7)

- **CTA consistency**: All homepage `/scan` links now use the exact label `Scan 3 bills free`, including the header, hero, pricing section, footer CTA, and footer scan link.
- **Final CTA**: Footer headline is now `Start with three bills. Keep the evidence.` with supporting copy that explains selected documents, findings, and source linkage.
- **Pricing**: Removed the temporary-sounding pilot pricing note. The homepage now says `Plans shown for the current Costivra offering. See pricing for details.` Tier names and prices are unchanged, and no guaranteed-savings language was added.
- **Navigation/footer**: The recommended short navigation remains in place; `Sign in` stays at `/login`; duplicate Legal → Security was removed; UCEP disclosure remains in Legal; the year remains 2026; and the footer brand statement is now `Evidence-first control for recurring business costs.`
- **Route matrix**: Added browser coverage for every internal header/footer link, desktop/mobile navigation parity, CTA labels/routes, `/login`, and `/ucep-disclosure`. No public link returned 404.
- **Files**: `src/components/home-page.tsx`, `src/components/marketing-shell.tsx`, `tests/e2e/public-smoke.spec.ts`, and this status/tracking documentation.
- **Screenshots**: `output/playwright/homepage-chunk-7/homepage-desktop-1440x900.png`, `pricing-desktop-1440x900.png`, `footer-mobile-390x844.png`, plus tablet/mobile captures in the same directory.
- **Validation**: Targeted ESLint PASS; focused Playwright PASS (5 passed, 1 expected project skip) across desktop and Pixel 5 mobile; `npm run build` PASS; `npm run typecheck` PASS after regenerating disposable `.next` route types; `npm run lint` PASS with two existing `app-shell.tsx` warnings; `npm test -- --run` PASS (105 files, 442 tests; 4 files and 6 tests skipped); `git diff --check` PASS. Production-server visual QA had no console or page errors at `1440x900`, `1024x900`, and `390x844`.
- **Remaining risk**: Route checks cover public HTTP responses only; authenticated workspace destinations remain outside this public homepage scope. Existing lint warnings and unrelated worker endpoint mismatches remain unchanged.
- **Next recommended task**: Chunk 8, typography and marketing CSS consolidation, only after explicit approval.

## August 6, 2026 — ID page lifecycle history and destructive-action safeguards (Chunk 3)

- Hardened account, contact, and vendor lifecycle routes around server authorization, durable audit history, explicit reasons, and fail-closed deletion behavior.
- Deletion previews now return the v1 contract with bounded dependency counts, a block reason, and checked timestamp. Confirm routes independently recheck dependencies instead of trusting a preview.
- Permanent account removal remains owner-only and is restricted to an empty disposable record. Permanent CRM-contact removal is owner-only and preserves profiles, auth users, memberships, and linked CRM history by refusing deletion where dependencies exist.
- Vendor termination now requires a reason, pauses monitoring in the existing atomic RPC, records a customer-safe lifecycle audit event, and requires an explicit resume of monitoring after reactivation. Vendor removal requires owner/admin confirmation and blocks when any protected record is present.
- History endpoints now use their respective audit ledgers (not CRM activity), paginate within a 100-record bound, and return only allowlisted summaries rather than raw metadata.
- Validation completed: `npm run typecheck` passed; `npm test` passed (102 files, 429 tests; 4 files and 6 tests intentionally skipped); `git diff --check` passed. `npm run lint` is presently blocked by an existing ESLint filesystem error while traversing the ignored-but-missing `test-results` path; no lint result is claimed.
- Applied and verified `20260806042128_id_page_lifecycle_history_hardening.sql` to the Costivra Supabase project. Both destructive RPCs are `security definer`, use `search_path = ''`, and are executable only by `service_role`—not anonymous or authenticated browser roles.
- Applied `20260806043157_lifecycle_delete_reason_and_contact_role.sql`: permanent-account delete evidence now includes a reason, CRM-only contact removal remains available to operators, and profile-linked contact removal requires an owner without deleting the linked profile or workspace membership.
- Manage now includes Active / Archived / All account visibility controls and Active / Inactive / All contact controls. Archived accounts are no longer discarded by the internal repository, so authorized operators can still reach their records.
- Account, contact, and vendor detail histories now load their dedicated audit endpoints rather than presenting CRM activity as change history. History responses resolve actor display names and keep private metadata out of the response.
- Archive, deactivate, and terminate controls now perform their true inverse action when the record is already archived, inactive, or terminated. Vendor lifecycle transitions append a specific customer-safe `terminated` or `reactivated` audit event in addition to the atomic update record.
- Primary-contact deactivation requires the operator to type `CLEAR PRIMARY` before the server clears primary status. Account archive now preserves the prior reviewed lifecycle stage in audit metadata and restores that stage; `20260806044140_account_restore_null_safe_stage.sql` is applied and its RPC is security-definer, empty-search-path, and service-role-only.
- The vendor editor now exposes only database-supported relationship states (`prospect`, `active`, `inactive`, `terminated`), avoiding client-side status submissions the server would rightly reject.
- `20260806045418_account_delete_location_dependency.sql` is applied. Account deletion previews and the authoritative delete RPC now include locations; previews additionally expose expense accounts, monitoring configurations, mail messages, and document retention holds before a destructive action can proceed.
- Validation after these changes: `npm run typecheck` passed; `npm test` passed (103 files, 433 tests; 4 files and 6 tests intentionally skipped); `npm run lint` completed with 0 errors and 2 existing warnings in `src/components/app-shell.tsx`; `npm run test:integration` passed (4 files, 8 tests; 4 files and 6 tests intentionally skipped); `npm run build` passed; `npm run test:e2e` passed (10 tests; 6 intentionally skipped).
- Final rerun after the vendor permission correction: unit tests passed (103 files, 434 tests); integration tests passed (4 files, 8 tests); production build passed; and Playwright E2E passed (10 tests; 6 intentionally skipped). Browser QA could reach the local sign-in screen with no console errors but could not inspect the protected Manage record controls because the in-app browser has no internal operator session; no authentication was bypassed.
- Applied `20260806052000_lifecycle_idempotency_and_atomic_vendor_audit.sql` to the Costivra Supabase project. Archive, contact-status, and vendor-lifecycle mutations now return safely without duplicate history when the requested state already exists; vendor lifecycle evidence is written in the same transaction as its status change and monitoring pause.
- Final validation after the deployed migration: `npm run typecheck` passed; `npm test` passed (103 files, 434 tests; 4 files and 6 tests intentionally skipped); `npm run lint` passed with 0 errors and 2 existing app-shell warnings; `npm run test:integration` passed (4 files, 8 tests; 4 files and 6 tests intentionally skipped); `npm run build` passed; and `npm run test:e2e` passed (10 tests; 6 intentionally skipped).
- Remaining release gate: add focused coverage for the full lifecycle permission matrix, dependency changes after preview, and the history pagination/metadata contract; then perform browser QA of the new record filters and destructive dialogs. Do not claim deployment readiness until those checks pass.

## August 6, 2026 — Customer vendor ID page (Chunk 4)

- Completed `/app/vendors/[vendorId]` as a relationship workspace, not a canonical-vendor editor. The page now keeps customer overrides separate from the canonical vendor reference, exposes the canonical name/category/website only as read-only context, and sends the relationship version for conflict-safe saves.
- Vendor tabs are now real URL-backed sections: Overview, Bills, Contracts, Findings, Actions, Files, Monitoring, and History. Direct record links use the appropriate record routes, and the active tab persists through refresh and browser navigation.
- Monitoring reads from the authenticated durable configuration endpoint. The page no longer fabricates a private intake address or assumes a monthly cadence. It displays stored sender, intake address, cadence, grace period, test/bill dates, expected date, failure state, and supports explicit pause/resume without changing the vendor relationship status.
- Completeness uses recorded document, invoice-match, reconciliation, expense, contract, location, and monitoring states. Missing evidence remains Unknown or Needs attention; an expense no longer implies reconciliation.
- Role rules are reflected in the page: viewers cannot change data; members can maintain ordinary relationship and monitoring fields but cannot terminate/reactivate or remove; owners/admins can perform lifecycle actions. Termination/re-activation uses the required current-version token, while unsafe removal continues through the dependency preview and typed confirmation.
- Added monitoring endpoint coverage and extended the self-cleaning authenticated browser test to open Bills, Monitoring, and History through the actual vendor page.
- Validation: `npm run typecheck` PASS; `npm run lint` PASS with 0 errors and 2 existing `app-shell.tsx` warnings; `npm test` PASS (104 files, 437 tests; 4 files and 6 tests intentionally skipped); `npm run test:integration` PASS (4 files, 8 tests; 4 files and 6 tests intentionally skipped); `npm run build` PASS; `npm run test:e2e` PASS (14 tests; 6 intentionally skipped); `RUN_AUTHENTICATED_E2E=1 npm run test:e2e:authenticated` PASS (one disposable, self-cleaning customer workflow).

## August 6, 2026 — Category Intelligence Packets 09–10: Structural Release Evidence

- **Main branch work in progress**:
  - Added four repeatable commands: `eval:categories`, `eval:line-items`, `eval:benchmarks`, and `eval:market-research`.
  - The checks record only aggregate, non-customer results in the private `category_evaluation_runs` ledger. Browser roles have no select access; RLS is enabled and access is limited to server-side service operations.
  - Fixed canonical category-key resolution so saved keys (for example `cloud-iaas-paas`) return their exact dedicated draft pack rather than falling through general heuristics.
  - Invoice extraction now persists the resolved category, normalized stored line-item classifications, selected pack version, deterministic bill findings, benchmark state, and missing dimensions. A trace-persistence failure removes the new invoice rather than leaving a partial analysis record.
- **Validation completed**:
  - `npm run typecheck`: PASS.
  - All four evaluation commands: PASS. Structural results are persisted as `synthetic` and `structural`; they explicitly prove deterministic safety contracts, not customer-document performance.
  - Database check: `category_evaluation_runs` has RLS enabled, anonymous and authenticated browser roles cannot select it, and four aggregate evaluation runs are stored.
- **Release boundary**:
  - This is not the Packet 10 promotion gate. The required representative, de-identified or consented corpus (including corrected and malformed cases), live source-refresh proof, and human review evidence are still outstanding.
  - All category expert packs remain `draft`; no benchmark, savings estimate, or category result is promoted to verified.

## August 6, 2026 — Category Intelligence Packet 09–10 Completion Audit

- **Verified in the current repository and live database**:
  - Invoice intake now uses the shared category service and persists a category-analysis run plus pack-driven line-item classifications.
  - Bill Breakdown and Ask Costivra use the same service; Ask Costivra retains the selected category, pack version, and cited source IDs in assistant-message metadata.
  - The owner-only Manage assistant now uses the shared service when a question has sufficient category evidence. It receives only draft pack metadata, applicable line-item labels, review rules, and caveats; it does not receive customer documents, private invoice text, or live market research. Its safe audit record retains the selected category key and pack version.
  - The Executive Value Report now includes category-trace coverage, draft-pack versions, unknown-category review count, missing benchmark dimensions, current-source-use state, estimated opportunity value, and separately calculated verified savings. It never adds estimates to verified value.
  - Deterministic expense-change opportunities now retain the category key, pack version, pack status, and resolution source inside their calculation inputs. Category resolution is descriptive only and cannot modify the deterministic amount, rule version, or verified-savings workflow.
  - Forwarded-bill monitoring now records category-specific review guidance in its service audit event: category trace, pack version/status, tracked fields, unit types, review-rule IDs, and freshness. It deliberately preserves the customer-configured cadence rather than inventing a category billing schedule.
  - A structural cross-surface integration test now proves that the same draft SaaS category and pack version flow through line normalization, bill analysis, assistant context, monitoring guidance, deterministic opportunity trace, and report output. It also proves an incomplete benchmark has no range or savings value.
  - Corrected an unregistered insurance source pack that was still marked `verified` and contained an unsupported deductible-savings range. It is now explicitly draft and quote/evidence-required, consistent with the release gate.
  - The opportunity helper no longer fabricates a ten-percent savings estimate from spend. Quote-required opportunities now have a null amount and zero confidence until comparable evidence exists.
  - The `category_evaluation_runs` ledger has RLS enabled, browser roles cannot read it, and aggregate structural evaluation results are stored.
- **Validation completed on August 6**:
  - `npm test -- --run`: PASS (94 files / 416 tests; 4 files / 6 tests skipped).
  - `npm run test:integration`: PASS (3 files / 7 tests; 4 live-only files skipped).
  - `npm run test:integration:live`: PASS (7 files / 13 tests).
  - `npm run eval:categories`, `eval:line-items`, `eval:benchmarks`, `eval:market-research`: PASS, but structural synthetic fixtures only.
  - `npm run lint`, `npm run typecheck`, and `npm run build`: PASS.
  - `npm test -- --run src/lib/documents/invoice-record.test.ts`: PASS. The test proves that an invoice's resolved category key and pack version are retained consistently in invoice metadata, line-item classifications, and the persisted analysis run.
  - `npm run test:e2e`: PASS (10 tests; 6 intentionally skipped); the separately invoked authenticated E2E was skipped in this run, so it is not release evidence.
  - `RUN_AUTHENTICATED_E2E=1 npm run test:e2e:authenticated`: PASS (1 disposable, self-cleaning customer workflow through rendered UI). The default invocation remains intentionally skipped until explicitly enabled.
  - `npm run ops:readiness` and `npm run ops:smoke`: PASS.
  - Packet 10 prohibited-pattern audit: PASS. No synthetic regional benchmark remnants, verified-pack labels, or prohibited pack-cloning spreads remain in `src`.
  - Latest structural category evaluations and `npm run ops:verify`: PASS. `npm run eval:invoices` fails as designed without an approved `--manifest`; this is a release-evidence gap, not a passing evaluation.
- **Known incomplete Packet 09 requirements**:
  - Monitoring, deterministic opportunity creation, and Executive Value Reports now consume/persist the shared category trace. The structural cross-surface contract is covered; a live authenticated customer journey still needs to prove persistence through every browser/API boundary.
  - `/manage/category-intelligence` is now an owner-only page in the standard Manage navigation. It shows protected live counts for unmapped/review-required lines, pending corrections, stale research, persisted analysis, and latest evaluation evidence. It still needs drill-down queues and an explicit unsupported-benchmark-attempt ledger.
  - The invoice-ingestion boundary now has a focused trace-consistency test. There is still no end-to-end test proving the same category, pack version, canonical codes, sources, and benchmark state from ingestion through chat, monitoring, opportunity, and reporting.
- **Known incomplete Packet 10 requirements**:
  - No reviewed representative, de-identified or consented category corpus exists. The invoice evaluator correctly refuses to run without a supplied golden manifest; no artificial corpus was created.
  - No current-source refresh run with verifiable citations, documented human review, or authenticated customer E2E proof is available for this audit.
  - **Verdict: CATEGORY INTELLIGENCE INCOMPLETE.** It is a source-safe, draft foundation, not a verified release.

## August 5, 2026 — Category Intelligence Foundation Merged to Main

- **Main commit**: `af6ff21` (`feat(category-intelligence): merge source-backed expertise foundation`)
- **Delivered**:
  - Merged Packets 01–08 foundation work: safe pack registry, honest benchmark gate, pack-driven normalization, taxonomy migrations/seeds, cited market-research cache, eight core packs, and five distinct insurance/benefits packs.
  - Every supported pack remains `draft`. No pricing comparison, coverage decision, or savings claim is promoted to verified without the Packet 10 evidence and review gates.
  - Current-market facts require an allowlisted, cited source and retain source ID and scope. The cache stores only public-safe dimensions and never customer documents, service addresses, private usage, or financial amounts.
- **Validation on merged main**:
  - `npm test -- --run`: ✅ PASS (93 files / 414 tests; 4 files / 6 tests explicitly skipped for unavailable live environment dependencies)
  - `npm run test:integration`: ✅ PASS (3 files / 7 tests; 4 files / 6 tests explicitly skipped for unavailable live environment dependencies)
  - `npm run typecheck`: ✅ PASS
  - `npm run lint`: ✅ PASS
  - `npm run build`: ✅ PASS (41 routes)
- **Not yet release-verified**:
  - Applied and verified the `category_research_runs` migration in the live Supabase project. The table has RLS enabled and intentionally has no browser policy; it is accessed only by trusted server code using the service role.
  - Production smoke passed. Live Supabase integration passed (13 tests). Public browser E2E passed (10 tests; 6 intentional skips).
  - Authenticated browser E2E now passes end-to-end with a disposable, self-cleaning customer workspace (password sign-in, policy creation, invoice review, opportunity approval, action approval, baseline acceptance, work start, and completion). The local suite binds consistently to `localhost` so its auth cookies are available to the protected workspace request.
  - Persistent evaluation-record and release-threshold proof from Packets 09–10 is still outstanding. Treat the system as a supervised, draft foundation—not as fully verified production intelligence.

## August 5, 2026 — Category Intelligence Packets 06–07: Research Cache Foundation and Core Pack Hardening (In Progress)

- **Branch**: `agent/category-intelligence-hardening`
- **Research safety and cache**:
  - Added a server-only market-research cache adapter. Its cache identity hashes only public-safe category, jurisdiction, vendor, and query dimensions; it stores cited results and expiry timestamps, never customer documents, account numbers, service addresses, private usage, or financial amounts.
  - Added reviewed migration `20260805162000_category_research_cache.sql` for the missing `category_research_runs` table with RLS enabled and no browser policy. It is intentionally **not applied** yet: this branch remains under review and needs the Packet 06 source-registry and live integration proof before deployment.
  - Research facts now retain a source registry ID and explicit scope alongside the citation. A current-market claim is rejected when it cannot be tied to an allowlisted cited source.
- **Core market packs**:
  - Brought electricity, broadband, SaaS, solid waste, and merchant processing to the required eight-or-more distinct line definitions and ten unique evaluation IDs. Strengthened the Packet 07 test so it actually enforces the stated ten-case minimum.
  - All eight Packet 07 packs are explicitly `draft`; they cannot be represented as verified until Packet 10's evidence, evaluation, and review gates are complete.
  - Removed unsupported or universal wording from legacy pack definitions, including a fixed waste-fee range and a universal telecom-surcharge negotiability claim.
- **Focused validation**:
  - `npm test -- --run src/lib/category-intelligence/market-research.test.ts src/lib/category-intelligence/distinct-market-packs.test.ts src/lib/category-intelligence/eval/category-eval.test.ts`: ✅ PASS (3 files, 85 tests)
  - `npm run typecheck`: ✅ PASS
  - `npm run lint`: ✅ PASS
  - `git diff --check`: ✅ PASS
- **Known remaining work**:
  - Packet 06 still needs the full source metadata/seeding and a controlled live-search proof; Packet 07 still needs the actual persisted evaluation-case records, rather than IDs alone. Do not merge this branch to `main` yet.

## August 5, 2026 — Category Intelligence Packet 05: Supabase Taxonomy, Legacy Normalization, and Insurance Categories

- **Branch**: `agent/category-intelligence-hardening`
- **Supabase Database & Seed Migrations**:
  - Applied migration `20260805030000_category_intelligence_taxonomy.sql` creating master taxonomy tables (`category_expert_packs`, `category_line_item_definitions`, `category_benchmark_definitions`, `category_source_registry`, `category_market_snapshots`, `invoice_line_item_classifications`, `category_analysis_runs`, `category_feedback`, `category_eval_cases`) with RLS policies.
  - Applied migration `20260805040000_seed_canonical_taxonomy_and_insurance.sql` seeding 16 parent markets and 28 leaf categories (44 total categories, including 9 first-class insurance & benefits categories) with `ON CONFLICT (slug)` updates.
- **Resolver & Test Hardening**:
  - Added `saas subscriptions` aliases to `category-resolver.ts` ALIAS_MAP.
  - Created `src/lib/category-intelligence/taxonomy-seed.test.ts` with 5 unit tests verifying parent/leaf taxonomy integrity, legacy label resolution, vendor ambiguity safety, and line-item priority.
- **Quality Gates**:
  - `npm run typecheck`: ✅ PASS (0 errors)
  - `npm run lint`: ✅ PASS (0 errors, 0 warnings)
  - `npm test -- --run`: ✅ PASS (91 test files passed, 338 unit tests passed)
  - `npm run test:integration`: ✅ PASS (3 integration test files passed)
  - `npm run build`: ✅ PASS (41 routes compiled cleanly in Next.js Turbopack)
  - `git diff --check`: ✅ PASS (0 issues)

## August 5, 2026 — Category Intelligence Packet 04: Pack-Driven Line-Item Normalization

- **Branch**: `agent/category-intelligence-hardening`
- **Pack-Driven Normalization & Safety**:
  - Eliminated global domain-specific substring matching. Line-item normalization is driven strictly by the active expert pack's ontology and explicit cross-category shared items (`GEN-TAX-01`, `GEN-CREDIT-01`).
  - Added `packVersion` property to `NormalizedLineItem` and `NormalizedLineItemSchema`, ensuring every item records the exact pack version used.
  - Carried extraction `evidenceIds` into line item classification.
  - Unclassified lines return `chargeClass: "unknown"`, `confidence: 0`, `canonicalCode: null`, and `reviewRequired: true`.
  - Created `src/lib/category-intelligence/line-item-pack-driven.test.ts` with 7 unit tests proving pack-driven matching (SaaS seat, broadband access fee), cross-category isolation (access fee in insurance, seat in vehicle lease remain unknown), negative amount generic credit mapping, and pack version retention.
- **Quality Gates**:
  - `npm run typecheck`: ✅ PASS (0 errors)
  - `npm run lint`: ✅ PASS (0 errors, 0 warnings)
  - `npm test -- --run`: ✅ PASS (90 test files passed, 333 unit tests passed)
  - `npm run test:integration`: ✅ PASS (3 integration test files passed)
  - `npm run build`: ✅ PASS (41 routes compiled cleanly in Next.js Turbopack)
  - `git diff --check`: ✅ PASS (0 issues)

## August 5, 2026 — Category Intelligence Packet 03: Remove Fabricated Benchmarks & Add Honest Benchmark Contract

- **Branch**: `agent/category-intelligence-hardening`
- **Honest Benchmark & UI Improvements**:
  - Confirmed all synthetic category multiplier ratios (e.g. 1.18, 1.12, 1.24, 1.08) and fake regional benchmark labels are absent from `benchmark-engine.ts`, breakdown route, and UI modal.
  - Enforced single shared `BenchmarkResult` contract returning `status: "insufficient_data"`, `"quote_required"`, or `"unsupported"` with explicit `missingDimensions`, zero synthetic percentiles, and `null` annual savings when unsupported by dated, source-backed comparables.
  - Updated `src/components/bill-breakdown-modal.tsx` to render explicit, honest status titles ("Market comparison needs more detail", "Live quote required") and explanation copy.
  - Created `src/lib/category-intelligence/benchmark-honest.test.ts` with 6 unit tests proving non-synthetic variance protection across telecom, energy, and unknown categories.
- **Quality Gates**:
  - `npm run typecheck`: ✅ PASS (0 errors)
  - `npm run lint`: ✅ PASS (0 errors, 0 warnings)
  - `npm test -- --run`: ✅ PASS (89 test files passed, 326 unit tests passed)
  - `npm run test:integration`: ✅ PASS (3 integration test files passed)
  - `npm run build`: ✅ PASS (41 routes compiled cleanly in Next.js Turbopack)
  - `git diff --check`: ✅ PASS (0 issues)

## August 5, 2026 — Category Intelligence Packet 02: Pack Registry and Unknown-Category Safety

- **Branch**: `agent/category-intelligence-hardening`
- **Pack Registry & Safety Improvements**:
  - Eliminated cross-market pack cloning (`electric-delivery-demand` and `general-liability-bop` object spread entries removed from `EXPERT_PACKS_REGISTRY`). Only exact, materially valid packs are registered.
  - Implemented `getExpertPackWithResolution(categoryKey)` returning exact resolution metadata (`exactMatch: boolean`, `status: CategoryExpertPackV1["status"]`).
  - Implemented `createNeutralDraftPack` returning neutral draft packs with `status: "draft"`, zero line items, zero pricing models, zero benchmark metrics, required human review caveats, and prohibited market claim assertions for unverified/unknown categories.
  - Created `src/lib/category-intelligence/pack-safety.test.ts` with 10 unit tests proving wireless/workers comp/group health/hazardous waste safety boundaries, draft pack protection, invoice and document attachment context priority, and neutral unknown pack guarantees.
- **Quality Gates**:
  - `npm run typecheck`: ✅ PASS (0 errors)
  - `npm run lint`: ✅ PASS (0 errors, 0 warnings)
  - `npm test -- --run`: ✅ PASS (88 test files passed, 320 unit tests passed)
  - `npm run build`: ✅ PASS (41 routes compiled cleanly in Next.js Turbopack)
  - `git diff --check`: ✅ PASS (0 issues)

## August 5, 2026 — Category Intelligence Packet 01: Core Contracts

- **Branch**: `agent/category-intelligence-hardening`
- **Module Inventory & Core Contracts**:
  - Confirmed all 10 required category intelligence modules exist and are committed (`types.ts`, `pack-schema.ts`, `service.ts`, `category-resolver.ts`, `context-builder.ts`, `line-item-normalizer.ts`, `bill-quality.ts`, `benchmark-engine.ts`, `current-market-research.ts`, `packs/index.ts`).
  - Implemented runtime Zod schemas and validators (`validateCategoryExpertPack`, `validateCategoryResolution`, `validateNormalizedLineItem`, `validateCategoryBillAnalysis`, `validateBenchmarkResult`, `validateMarketResearchResult`, `validateCategoryAiContext`) in `src/lib/category-intelligence/pack-schema.ts`.
  - Updated `CategoryIntelligenceService` in `src/lib/category-intelligence/service.ts` with required `getExpertPack` contract and flexible input signatures for `normalizeLineItems` and `buildAiContext`.
  - Created `src/lib/category-intelligence/module-integrity.test.ts` covering export integrity and Zod pack-schema boundary rules (draft validation, missing schema version, invalid status, unsupported charge class, negative freshness, empty category key).
- **Import Audit & Quality Gates**:
  - `npm run typecheck`: ✅ PASS (0 errors)
  - `npm run lint`: ✅ PASS (0 errors, 0 warnings)
  - `npm test -- --run`: ✅ PASS (87 test files passed, 310 unit tests passed)
  - `npm run build`: ✅ PASS (41 routes compiled cleanly in Next.js Turbopack)
  - `git diff --check`: ✅ PASS (0 issues)

## August 5, 2026 — ID Pages Final Remediation

- **Branch**: `goal/id-pages-final-remediation`
- **Database Schema & Migrations (`supabase/migrations/20260805020000_record_pages_completion.sql`)**:
  - Repaired live duplicate primary contact (`is_primary = false` for duplicate contact `a579c6b9-9b68-4e43-8698-4b7e2cd09b87`).
  - Applied migration `20260805020000_record_pages_completion.sql` adding `display_name_override`, `category_override`, `website_override`, `ended_at`, `ended_by` to `organization_vendors`, `archived_at`, `archived_by` to `crm_contacts`, and partial unique index `crm_contacts_one_primary_per_org` for active contacts.
- **Server API & Schema Mismatch Repairs**:
  - Repaired `src/app/api/manage/contacts/[id]/route.ts`: fixed `job_title`/`jobTitle` to `title` column matching live schema.
  - Repaired `src/app/api/manage/accounts/[id]/deletion-preview/route.ts` and `contacts/[id]/deletion-preview/route.ts`: fixed `crm_mail_threads` table to `crm_email_threads` matching live schema.
  - Repaired `src/app/api/manage/accounts/[id]/route.ts`: moved `industry`, `employee_count_range`, `annual_revenue_range`, `timezone`, `currency` updates to `organizations` table and used `assigned_to` on `crm_account_profiles`.
  - Repaired `src/app/api/portal/vendors/[id]/route.ts` and `deletion-preview/route.ts`: updated financial queries to check `organization_vendor_id`.
  - Created missing restore routes: `/api/manage/accounts/[id]/restore` and `/api/manage/contacts/[id]/restore`.
  - Created missing history endpoints (Workstream K): `/api/portal/vendors/[id]/history`, `/api/manage/accounts/[id]/history`, `/api/manage/contacts/[id]/history`.
- **Shared Components Polish**:
  - `record-overflow-menu.tsx`: Added `Link` component rendering for menu items with `href`.
  - `editable-field-row.tsx`: Added global CSS hover/focus/data-actions-open reveal rules in `src/app/globals.css`.
  - `edit-record-sheet.tsx`: Fixed React 19 state reset during render, added `useId()` form ID binding, and added keyboard Escape handling.
  - `record-change-history.tsx`: Fixed CSS border typo (`1px border` -> `1px solid`).
- **Quality Gates**:
  - `npm run typecheck`: ✅ PASS (0 errors)
  - `npm run lint`: ✅ PASS (0 warnings, 0 errors)
  - `npm test`: ✅ PASS (86 test files passed, 297 unit tests passed)
  - `npm run build`: ✅ PASS (41 routes compiled cleanly in Next.js Turbopack)

## August 5, 2026 — Marketing Shell Scroll and Layout Refinement

- Added a shared Lenis scroll controller to make page-level wheel and anchor scrolling consistently smooth across marketing, customer (`/app`), and internal (`/manage`) routes. It retains native nested-panel scrolling and honors `prefers-reduced-motion`.
- Refined the marketing footer into a rounded-top closing panel with an explicit next-step message and a clear scan action.
- Refined the footer again after visual review: the dark footer is now an inset panel with a visible 32px curved top inside a quiet light frame, a 52px breathing gap before navigation, and a simplified brand statement.
- Validation: `npm run typecheck`, `npm run lint`, and `npm run build` all passed. Browser QA passed on the homepage at desktop, `/how-it-works` at 390×844, and the authenticated local customer-workspace preview; the only console item was a pre-existing Costivra brand-image aspect-ratio warning.

## August 5, 2026 — Record Operating System & Pages Completion

- **Database Migrations (`supabase/migrations/20260805020000_record_pages_completion.sql`)**:
  - Added `display_name_override`, `category_override`, `website_override`, `ended_at`, `ended_by` to `organization_vendors`.
  - Added `archived_at`, `archived_by` to `crm_contacts`.
  - Added partial unique index `crm_contacts_one_primary_per_org` to enforce single active primary contact per organization.
- **Shared Component Foundation (`src/components/records/`)**:
  - `record-overflow-menu.tsx`: Accessible 3-dot menu with quiet resting state (42px hit target, zero layout shift, keyboard navigation Up/Down/Escape/Home/End).
  - `editable-field-row.tsx`: Editable field row with ZERO layout shift on hover/focus (`position: absolute; right: 2px; transform: translateY(-50%) translateX(4px); visibility: hidden; opacity: 0; pointer-events: none`).
  - `edit-record-sheet.tsx`: Right-side drawer sheet (480-560px desktop, full screen mobile) with grouped fields, dirty state detection, unsaved changes confirmation, sticky header & footer.
  - `record-danger-dialog.tsx`: Modal dialog for `archive`, `deactivate`, `end`, `remove`, and `permanent-delete` modes with dependency preview loading, block warnings, typed confirmation, and reason logging.
  - `record-change-history.tsx`: Audit history log viewer displaying actor, action, timestamp, summary, and source badge.
- **API Route Endpoints (`src/app/api/`)**:
  - `src/app/api/portal/vendors/[id]/route.ts`: `PATCH` handler for tenant vendor overrides & status; `DELETE` handler with dependency checks (returns 409 Conflict if linked invoices/expenses exist).
  - `src/app/api/portal/vendors/[id]/deletion-preview/route.ts`: `GET` handler returning linked dependency counts.
  - `src/app/api/manage/accounts/[id]/route.ts`: Extended `PATCH` handler to atomically update `organizations`, `crm_account_profiles`, and `crm_contacts` (primary contact transactional swap); added `DELETE` handler for owner-only safe deletion of empty accounts.
  - `src/app/api/manage/accounts/[id]/deletion-preview/route.ts`: `GET` handler returning dependency preview for accounts.
  - `src/app/api/manage/accounts/[id]/archive/route.ts`: `POST` handler setting `visible_in_crm = false` and `lifecycle_stage = "inactive"`.
  - `src/app/api/manage/contacts/[id]/route.ts`: `PATCH` handler for contact fields with primary contact transactional swap; `DELETE` handler for CRM contact removal (preserving auth profiles & workspace memberships).
  - `src/app/api/manage/contacts/[id]/deletion-preview/route.ts`: `GET` handler returning contact deletion dependency preview.
  - `src/app/api/manage/contacts/[id]/deactivate/route.ts`: `POST` handler for deactivating contact (`archived_at = now()`, `status = "inactive"`).
- **Record Pages Integration**:
  - Integrated Customer Vendor Detail Page (`/app/vendors/[vendorId]`) in `src/components/portal-pages.tsx`.
  - Integrated Manage Account Detail Page (`/manage/accounts/[accountId]`) in `src/components/manage-portal.tsx`.
  - Integrated Manage Contact Detail Page (`/manage/contacts/[contactId]`) in `src/components/manage-portal.tsx`.
- **Verification Gates**:
  - `npm run typecheck`: ✅ PASS (0 errors)
  - `npm run lint`: ✅ PASS (0 errors, 0 warnings)
  - `npm test -- --run`: ✅ PASS (82 test files passed, 289 unit tests passed)
  - `npm run build`: ✅ PASS (40 static & dynamic routes compiled cleanly in Next.js Turbopack)


## August 4, 2026 — Ask Costivra Visual Cards, Layout, & Motion Polish

- **Deterministic Response Planner (`src/lib/client-assistant/presentation-planner.ts`)**: Built server-side deterministic block selection to map common financial queries (spend overview, latest bill, bill comparison, contract calendar, attached file intake, opportunities) to authoritative response blocks.
- **13-Card Modular System (`src/components/client-assistant/cards/`)**: Implemented shared `AssistantCardShell`, `CardStatus`, `CardMetric`, and `RenderAssistantCard` supporting all 13 card block types with Apple-style calm financial aesthetics.
- **Fullscreen History Rail & Inspector**: Added collapsible history rail control (`PanelLeftClose`/`PanelLeftOpen`) in full-screen mode, persisting preference to `localStorage`, and right-hand Record Inspector panel.
- **Surface Transitions**: Implemented unified `.assistant-surface` with `data-mode`, `data-phase`, slide/scale entrance, and exit animations on close.
- **Verification Gates**:
  - `npm run lint`: ✅ PASS (0 errors, 0 warnings)
  - `npm run typecheck`: ✅ PASS (0 errors)
  - `npm test -- --run`: ✅ PASS (82 test files passed, 289 unit tests passed)
  - Git Commit: `cae0c3c` -> `main`


## August 4, 2026 — Bill Breakdown Inspector Modal & Supervised Pilot Readiness

- **Bill Breakdown Inspector Modal**: Created interactive PDF & Image viewer with full extraction breakdown, line items table, detected anomalies/flags, regional market benchmark comparisons (% variance and annual savings), CFO guidance deck, and one-click integration into Ask Costivra AI preloaded with document context.
- **Interactive Upload Analysis Flow**: Updated document upload workflow to show "Analyzing bill..." toast followed by "Bill Processed — View Analysis" toast with a direct action button triggering the global inspector modal.
- **Malware Scanner Architecture**: Refactored `malware-scanner-core.ts` to eliminate `require("server-only")` workaround, fixing the ESLint `no-require-imports` error and ensuring static server boundary.
- **Verification Gates**:
  - `npm run lint`: ✅ PASS (0 errors, 0 warnings)
  - `npm run typecheck`: ✅ PASS (0 errors)
  - `npm test -- --run`: ✅ PASS (81 test files passed, 283 unit tests passed, 0 failures)
  - Git Commit: `79b7edd` -> `main`


## August 4, 2026 — Costivra AI chat icon concepts

- Generated three custom, transparent-background Costivra AI chat icon concepts under `public/brand/ai-chat-concepts/`: Evidence Signal (record-linked conversation), Forensic Lens (record inspection), and Decision Circuit (evidence-to-action flow).
- Each production PNG is 1254×1254 RGBA with transparent corners and no text, robot, sparkle, wand, or generic AI glyph.
- Added a white-background-safe Evidence Signal revision, `evidence-signal-white-safe.png`, with cobalt-blue connection paths and deep-navy separation rather than white paths.
- Promoted the selected white-safe Evidence Signal into the shared Ask Costivra icon component. It now marks customer chat (`/app`) and the internal Manage assistant, including their launch controls, assistant headers, responses, and thinking states; the primary Costivra brand mark remains unchanged.
- Fixed Ask Costivra’s missing contract-renewal context. Upcoming tenant-scoped contracts now enter the bounded context in chronological order, and “next contract expiration” questions are answered by deterministic code from the earliest recorded end date instead of model inference. Focused client-assistant tests pass (7 tests); a local `.next/dev/types/validator.ts` cache artifact still blocks TypeScript after local preview runs.

## August 4, 2026 — Ask Costivra animation pass

- Added a shared, restrained motion system to both Ask Costivra chat surfaces: the customer `/app` drawer/fullscreen experience and the internal `/manage` assistant rail.
- Customer chat now animates opening panels, history rows, welcome prompts, optimistic sent messages, incoming responses, structured response cards, attached-document chips, and the record-review thinking state. Selecting history or starting a new conversation deliberately replays the relevant entrance state.
- Internal chat now animates its fresh conversation/suggestion state, sent and received messages, evidence-source links, and thinking state. Starting a new conversation returns focus to the composer.
- Motion respects `prefers-reduced-motion`; animations and transition-driven movement are removed when the user requests reduced motion.
- Validation: `npm run typecheck` passed before local browser QA and `git diff --check` passed. Browser QA passed at customer desktop and 390×844 mobile and on the internal Manage rail, with no relevant browser console errors or horizontal overflow. `npm run lint` remains blocked by the pre-existing `require()` lint error in `src/lib/security/malware-scanner.ts`. After previewing the app, Next.js left a malformed generated `.next/dev/types/routes.d.ts` cache file; a subsequent typecheck is blocked by that local cache artifact, not the edited source.
- Follow-up layout correction: in compact drawer mode, conversation history now replaces the entire chat canvas rather than sharing its narrow width. The fullscreen conversation rail remains visible permanently, so its redundant history button is removed. The no-message screen now uses an evidence-and-records review frame with quiet, medium-weight prompts. Browser QA confirmed the new compact-history view at desktop and 390×844 mobile with no horizontal overflow; the only console item was an existing Costivra mark image-aspect-ratio warning.

## August 4, 2026 — Pilot Release Repair and Completion (Final Green Gate)

- **Release Sprint Execution**: Executed `costivra-pilot-release.md` across all 10 Workstreams (A through J).
- **Quality Gates Verification**:
  - `npm run lint`: ✅ PASS (0 errors, 0 warnings across all files)
  - `npm run typecheck`: ✅ PASS (0 errors)
  - `npm test -- --run`: ✅ PASS (78 test files passed, 271 unit tests passed)
  - `npm run eval:invoices`: ✅ PASS (100.00% accuracy across classification, critical fields, line items, and evidence citations)
  - `npm run ops:verify`: ✅ PASS (Resend, OpenRouter, Supabase operational probes & public smoke test passed)
  - `npm run build`: ✅ PASS (40 static & dynamic routes compiled cleanly in Next.js Turbopack)
  - `npm run test:e2e`: ✅ PASS (Playwright 10 passed, 4 skipped)
- **Key Architectural Deliverables**:
  - `supabase/migrations/20260804160000_durable_vendor_monitoring.sql`: Created `vendor_monitoring_configs` with Row Level Security, indexes, constraints, and audit logging.
  - `src/lib/vendors/monitoring.ts`: Server-authoritative durable monitoring domain service.
  - `src/lib/email/inbound-intake.ts`: Atomic transition from `pending_test` to `active` upon receiving forwarded bills.
  - `src/lib/vendors/completeness.ts`: 11-component data completeness evaluator.
  - `src/lib/email/lifecycle.ts`: 9 transactional lifecycle email templates with idempotency key deduplication.
  - `src/lib/integration/pilot-end-to-end-journey.live.integration.test.ts`: Disposable pilot lifecycle integration test.
- **Pilot Release Verdict**: **SHIP SUPERVISED PILOT**

## August 4, 2026 — Pilot Platform Completion Program Execution

- Implemented full P0 scope per `COSTIVRA_PILOT_PLATFORM_COMPLETION_SPEC.md`:
  - **Public Site & 5-Second Comprehension**: Updated homepage hero, eyebrow, copy, actions, and trust row; simplified marketing navigation labels ("What Costivra does", "What we review", "How it works", "Security", "Pricing"); hidden unconfigured OAuth buttons on `/login` and `/signup`.
  - **Customer Workspace Activation Journey**: Added 8-step `ActivationChecklist` to `CommandCenter` (`src/components/portal-pages.tsx`); updated headline metrics to Monitored spend, Findings under review, Actions pending approval, Verified value.
  - **One-Vendor Continuous Monitoring**: Created `src/lib/vendors/monitoring.ts` domain module, `VendorMonitoringCard`, `DataCompletenessChecklist`, and `/api/portal/vendors/[id]/monitoring` API endpoint supporting email rules, manual forwarding, and test invoice verification.
  - **Vendor Command Page**: Enhanced `/app/vendors/[id]` with first-class monitoring state, data quality score, and dynamic primary actions.
  - **Verification & Validation**:
    - `npm run typecheck` ✅ (0 errors)
    - `npm test -- --run` ✅ (76 test files passed, 264 unit tests passed)
    - `npm run ops:verify` ✅ (Resend, OpenRouter, Supabase probes & public smoke test passed)
    - `npm run build` ✅ (37 static pages generated, zero errors)

## August 3, 2026 — Cron auth diagnostics and manual-invocation support

- Added robust cron credential extraction support to include debug-safe query-token paths (`secret`, `cron_secret`, `token`) for controlled manual invocation and automated verification.
- Added coverage for both inbound/retention cron routes:
  - header auth (`Authorization`, `x-vercel-cron-*`, `x-cron-*`) and query-token fallback
  - explicit positive tests for accepted query-token invocation
- Added owner-only diagnostic route `GET /api/manage/cron-auth`:
  - reports whether `CRON_SECRET` is configured and a non-reversible fingerprint/length,
  - shows which auth transport was seen on the request (`authorization`, `x-vercel-cron-secret`, query, etc.),
  - shows whether a configured token and presented token match without exposing raw secrets.
- Added unit coverage for cron auth extraction and diagnostics.
- `npm run test` (including new cron/auth diagnostics tests) and `npm run typecheck` pass.

- Current outstanding external blocker still requires manual verification:
  - production cron still returns 401 for inbound/retention when invoked with only header tokens in `npm run ops:smoke` and direct external probes,
  - use `/api/manage/cron-auth` from owner context to capture header presence/transport mismatch, then align `CRON_SECRET` in Vercel with the token used for any manual invocations and confirm deploys.

## August 3, 2026 — Readiness truth: placeholder credentials now treated as absent

- Added production smoke validation command: `npm run ops:smoke`.
  - Default checks `https://costivra.ai` public home, `/api/status` contract, protected `/api/cron/*` routes, and webhook GET behavior.
  - This gives a fast "is the deployed stack in the right shape" signal between code changes and manual user testing.
- Added convenience combined command: `npm run ops:verify`, which runs readiness and smoke in one pass.

- Added shared secret-validation helper (`src/lib/env/secrets.ts`) and wired it into Resend, OpenRouter, Apollo, and cron checks.
- Updated readiness and email-intake checks so placeholder values (`[SENSITIVE]`, `redacted`, `placeholder`, etc.) now hard-fail as missing secrets rather than passing as valid.
- Extended tests to prove placeholder secrets are blocked and never echoed in readiness payloads:
  - `src/lib/email/resend.test.ts`
  - `src/lib/manage/system-readiness.test.ts`
- Current local status after this update remains blocked only until real values are set (see `npm run ops:readiness` output for the exact remaining items).

## Operations hardening and readiness guardrail parity — August 3, 2026

- Hardened provider secret handling in `src/lib/email/resend.ts` so placeholder/reddacted values such as `[SENSITIVE]`, `redacted`, and keys with `placeholder` in them are now treated as **not configured** in all inbound intake/mailer paths.
- Added explicit reason mapping from Resend provider responses into readiness checks and activation flow so endpoint failures now return actionable messages instead of opaque generic errors.
- Re-ran full validation after this hardening:
  - `npm run typecheck` ✅
  - `npm run lint` ✅
  - `npm run test` (223 passed) ✅
  - `npm run build` ✅
  - `npm run ops:readiness` (still blocked locally because `.env.local` secrets are placeholders for webhook secret, openrouter key, Supabase service key, and cron secret).
- Updated `docs/EMAIL_INTAKE_SETUP.md` to keep setup prerequisites in sync with current Resend inbound requirements and placeholder-handling behavior.

## Operations command for immediate smoke checks — August 3, 2026

- Added `scripts/ops-readiness.ts` and `npm run ops:readiness` to report environment/runtime blockers before deeper QA.
- Current local run result with repo `.env.local`:
  - `RESEND_API_KEY` is present in file but configured alongside placeholder values for:
    - `RESEND_WEBHOOK_SECRET`
    - `SUPABASE_SECRET_KEY`
    - `OPEN_ROUTER_API_KEY`
    - `CRON_SECRET`
  - Full local readiness checks cannot complete with placeholders.
- Live probe run using the supplied key (`re_fFLk...`) showed:
  - Environment flags: `RESEND_API_KEY` present; secrets remain placeholders for other required values.
  - API response from Resend: HTTP 401 with message `restricted to only send emails` on both `/domains` and `/webhooks` for this token.
  - Result: Readiness now surfaces this exact rejection reason in both portal activation and manage-readiness flows.
- Type-level and runtime checks completed on this run:
  - `npm run typecheck` ✅
  - `npm run lint` ✅
  - `npm run build` ✅
  - targeted tests:
    - `src/lib/manage/system-readiness.test.ts` ✅
    - `src/app/api/manage/system-readiness/route.test.ts` ✅
    - `src/lib/email/inbound-intake.test.ts`, `src/lib/email/inbound-policy.test.ts`, `src/lib/manage/mail.test.ts` ✅

## Operational truth and worker health — August 2, 2026

- Added a server-only ledger for every one-minute inbound worker invocation. The owner readiness
  screen now verifies a recent completed production run instead of treating the presence of
  `CRON_SECRET` as proof that automation is alive. Stale, failed, still-running, and
  completed-with-alerting-warning states are reported separately.
- Queue alerting can no longer turn already completed invoice work into a 500 retry. If operator
  notification monitoring is unavailable, the run completes with a warning, stores a safe failure
  category, and leaves the successfully processed document untouched.
- Production proof passed on deployment `a8fc630`: Vercel's scheduled worker wrote a completed run
  to Costivra Supabase with zero claimed jobs, four queue records inspected, zero incidents, and
  zero notification failures. The worker ledger denies both anonymous and signed-in browser roles.
- Removed a misleading integration behavior that could label QuickBooks, Gmail, Microsoft 365, or
  Stripe as connected without OAuth or a data sync. The customer portal now identifies these as
  planned adapters. Approved email forwarding through the private workspace address remains the
  live automated document-intake route.
- Current Supabase security advice also includes warnings on legacy Luxor/Nodal-style tables that
  coexist in the same database project. Costivra-owned operational tables are explicitly protected,
  but the shared legacy schema must be isolated or remediated before treating this database as a
  clean production security boundary. Leaked-password protection is also still disabled.

## Document extraction recovery — August 2, 2026

- Separated document-reading failures from persistence failures. Image-only PDFs now use the
  bounded OpenRouter OCR path even when native PDF text parsing fails, while database and audit
  errors fail the request instead of being mislabeled as a customer document-quality problem.
- Added durable, non-secret extraction failure categories and reading modes in Supabase. Existing
  failed demo documents were backfilled so operators can distinguish unavailable automation,
  invalid structured output, unreadable sources, and general extraction failures without exposing
  provider diagnostics to customers.
- Added an extraction-recovery queue under **Manage → Intake** and per-file recovery controls in
  internal account workspaces. A retry is permitted only for the latest failed extraction when no
  invoice exists; immutable storage content is SHA-256 verified first, concurrent retries are
  claimed atomically, and successful low-confidence invoices continue through human review rather
  than producing duplicate financial records.
- Applied and verified the two recovery migrations directly through the connected Supabase project
  because the repository's older local/remote CLI migration histories are incomplete. Supabase's
  security advisor reports only the pre-existing leaked-password-protection warning.
- Production proof passed against `costivra.ai`: a temporary internal operator opened the rendered
  recovery queue and retried the public AWS receipt in the Cloud Billing demo account. Vercel's
  configured document intelligence created a normalized $44 invoice, reconciled the arithmetic,
  and correctly kept it in human review because the vendor relationship was unmatched. The
  temporary operator was deleted after the probe; the demo invoice remains as visible test data.
- A second production batch recovered both public Azure demo invoices into reconciled, reviewable
  invoice records ($2,810.81 and $0.00). The AWS VAT sample still failed strict output validation
  and correctly remained in extraction recovery without an invoice. This proved that batch recovery
  advances valid records, preserves uncertain files for operators, and does not create duplicates.
- Interrupted extraction jobs now become recoverable after a ten-minute lease window instead of
  remaining in `processing` forever. Active jobs are not disturbed. If the invoice was already
  committed before an interruption, recovery repairs the document state from that invoice rather
  than calling AI again or creating a duplicate; otherwise the immutable source is reprocessed.
- The minute-based inbound worker now keeps a one-minute shutdown reserve inside its five-minute
  Vercel limit. It yields unfinished attachment work back to the queue without consuming a failure
  attempt, then resumes from already persisted attachment state on the next run. OpenRouter calls
  have a 45-second ceiling, and manual quarantine release batches are bounded by route duration so
  multi-file emails cannot silently die at the platform timeout.
- The first scheduled Vercel cron invocation on the exact production deployment returned HTTP 200,
  and the following runtime audit found no warning, error, or fatal event. A manual call using the
  local `CRON_SECRET` returned 401, confirming that `.env.local` is stale relative to Vercel; this
  does not affect the scheduled production job but blocks local manual triggering until resynced.

## Savings attestation workspace — August 2, 2026

- Removed one-click baseline acceptance and verification from compact savings rows. Owners and
  administrators now enter a dedicated review workspace showing the accepted baseline, later
  comparison, deterministic method/version, calculated result, assumptions, exclusions, exact
  expense links, and source documents before making a financial attestation.
- Baseline acceptance and result verification require an explicit review confirmation. The existing
  atomic Supabase workflow remains the authoritative enforcement boundary; stale or incomplete
  decisions still fail server-side. Customers can now reject a baseline or result with a required,
  audited reason instead of relying on the previously API-only rejection operation.
- Added responsive presentation for the review surface and expanded the disposable authenticated
  browser regression to exercise the deliberate baseline-review flow.

## Live scanner verification and workspace OAuth foundation — August 2, 2026

- The owner-only production-readiness check now sends a harmless text probe through the configured
  malware provider instead of treating the presence of an environment variable as proof. Missing,
  unreachable, rejected, failed, and false-positive scanner results remain launch-blocking; the
  public status route does not run a billable upload probe.
- Google and Microsoft workspace authentication now have a real Supabase PKCE callback, safe
  `/app` and `/manage` return-path handling, generic provider-error recovery, authentic provider
  marks, and configuration-gated login controls. Email/password access remains available while the
  external provider credentials are not configured.
- Added provider setup instructions in `docs/WORKSPACE_OAUTH_SETUP.md`. Activating either provider
  requires its external application credentials, the Supabase provider toggle, the Costivra callback
  allowlist entry, and the matching Vercel public feature flag.

## Connected customer record workspaces — August 2, 2026

- Replaced the loose vendor-only related-record list with an exact connected-record model across
  expenses, contracts, documents, invoices, opportunities, actions, and savings outcomes. Direct
  source documents, invoice links, opportunity/action chains, savings records, vendor contracts,
  and evidence now appear together without inventing relationships that are not in Supabase.
- Added normalized invoice line items to the customer data model and invoice detail page, including
  quantity, unit price, signed amount, category, and service period. Invoice pages now show source
  evidence from their own document rather than limiting evidence presentation to the document and
  opportunity pages.
- Added plain-language data-quality checks appropriate to each record type: source linkage,
  comparison baseline, location, contract term/notice/owner, extraction confidence, vendor match,
  reconciliation, required invoice fields, approval progress, policy attachment, evidence,
  calculation method, and savings baseline/comparison state. These are honest readiness cues, not
  model-generated assurances.
- Expanded the authenticated browser fixture with a real invoice and normalized line item so the
  production gate verifies the rendered invoice workspace as well as the financial approval flow.
  Local TypeScript, lint, 187 unit tests, integration tests, and the 35-page production build pass.

## Customer approval policies and location-linked records — August 2, 2026

- Added a real customer Approval Center under **Settings → Team & approvals**. Owners and
  administrators can create, edit, disable, and restore plain-language rules by action type,
  annual-value threshold, category, explicit-consent requirement, and one-to-five distinct
  approvers. Disabled policies remain available for historical decisions.
- Upgraded the service-role workflow transaction so the strictest matching active tenant policy
  is attached when an action is created. Approval rows are assigned to distinct owners or
  administrators, the first decision remains pending when more people are required, and only the
  configured distinct-approval count advances the action. A rollback-only production probe proved
  both policy selection and the two-person gate without leaving fixture data.
- Added optional tenant-scoped location links to expenses and contracts. Customers can assign an
  active location during creation and change or clear it inline on the detail page. API routes
  reject cross-tenant or invalid location identifiers; archiving a location preserves existing
  financial and contract history through a nullable foreign key.
- The live Costivra migration `20260803012622` is applied and recorded. Supabase advisors report
  only the existing leaked-password-protection warning; no new database security or performance
  finding was introduced.
- The authenticated production browser gate now creates a policy through the rendered modal,
  confirms that it governs the generated action, completes the opportunity-to-savings workflow,
  checks the audit trail and browser/runtime failures, and removes its disposable organization and
  user. The expanded gate passed against `costivra.ai` after deployment.

## Atomic customer financial workflow — August 2, 2026

- Moved opportunity approval, action authorization/start/completion, savings-baseline acceptance,
  and savings verification into three service-role-only Supabase transactions. Each customer
  decision now either updates every dependent record and its audit event or changes nothing.
- The database functions lock the current workflow rows, re-check organization membership and
  role, reject stale transitions, and require an accepted baseline before work starts. Savings can
  become verified only after a later comparison expense exists and the opportunity is in progress.
- Corrected the savings opportunity uniqueness index. The previous partial index could not be used
  by PostgreSQL's conflict target, so the first real baseline creation would have failed. The new
  index preserves one savings record per opportunity while still allowing unrelated null values.
- Added a reusable rollback-only Supabase probe and a credential-gated live integration test for
  the complete approval-to-verified-savings sequence. The production probe passed, proved that a
  premature start rolls back cleanly, confirmed all six audit events, and left zero fixture rows.
- Validation passed: TypeScript, full lint, 150 unit tests with five intentional environment-gated
  skips, integration tests, production build, and eight applicable desktop/mobile browser checks.
- Supabase's post-migration advisor reports no exposure on the new workflow functions: they are
  security-invoker functions with a fixed empty search path, and only `service_role` can execute
  them. The same advisor still flags permissive policies on unrelated legacy Luxor/Nodal tables in
  the shared project. Those tables were not changed because their owning applications must be
  inventoried first; database isolation is now an explicit launch decision.

## Live public system status — August 2, 2026

- Replaced the old hard-coded preview status page with a live, customer-safe production view at
  `/status` backed by `/api/status`. It checks the public site, customer workspace, document intake,
  and document intelligence instead of claiming that disconnected preview systems are operational.
- The public response is cached briefly for stability and deliberately omits provider names, secret
  values, tenant data, queue counts, and internal error details. Owners retain the deeper diagnostic
  view in **Manage → Settings**.
- The public view reports document intake and intelligence as limited while malware scanning is not
  configured. Optional Apollo enrichment does not affect customer-facing status and is not called
  by this endpoint.
- Validation passed: TypeScript, full lint, 148 unit tests with four intentional environment-gated
  skips, integration tests, a fresh production build, and all eight applicable desktop/mobile
  Playwright checks with two intentional device-target skips.

## Fail-closed manual uploads and viewer permissions — August 2, 2026

- Manual portal uploads now pass through the same server-side malware boundary as emailed source
  files. Clean files may enter extraction, confirmed malware is rejected without being stored, and
  unavailable or failed scans are stored in private quarantine without reaching document AI.
- Quarantined manual uploads retain their SHA-256 digest and can be rescanned by an editor after a
  scanner is configured. A digest mismatch stops processing. Confirmed malware is marked rejected,
  audited, and removed from private storage.
- The document download route now refuses signed URLs for quarantined, rejected, pending, or
  processing files. Regression coverage proves quarantined content never asks storage for a signed
  URL.
- Portal viewers are now consistently read-only across document upload/rescan/delete, contract and
  expense creation, and integration changes. Customer UI actions are hidden for viewers, while the
  API independently enforces the same boundary.
- Live schema inspection confirmed the existing `documents` table accepts quarantine/rejection
  states without a migration. Validation passed: TypeScript; lint with zero errors; 121 unit tests;
  integration tests; production build; and six production Playwright checks with two intentional
  device-target skips.
- Resend credential verification passed again, and Resend reports `costivra.ai` as verified in
  `us-east-1`. Manual and emailed files will remain quarantined until Lewis configures a supported
  malware scanner.
- `npm audit --omit=dev` now reports zero production dependency vulnerabilities across the current
  dependency tree.

## Intake operations and recovery workspace — August 2, 2026

- Added `/manage/intake` as the internal source-of-truth queue for every forwarded client email,
  including active work, attention states, quarantine, attempts, timestamps, sender, client, and
  attachment-level scan and processing results.
- Added `/manage/intake/[id]` as the event detail page. Operators can inspect the message preview,
  latest processing error, each source file, and the resulting invoice-review link without opening
  private quarantine storage directly.
- Dead-lettered and failed jobs can be safely returned to the durable worker. Quarantined files can
  be rescanned only when a server-side malware scanner is configured; the UI explains why that
  action is unavailable otherwise.
- Customer and internal rescan flows now share one fail-closed quarantine-release service. A
  confirmed infected file is rejected and removed from private quarantine, unavailable scans stay
  quarantined, and clean/duplicate files update the parent event deterministically.
- Watchdog notifications now open the exact intake event instead of the general owner dashboard.
- Added policy tests for attention grouping, retry eligibility, scanner gating, partial quarantine,
  rejected files, and clean/duplicate completion.

## Built-in intake operations watchdog — August 2, 2026

- Extended the one-minute inbound worker with an operational health pass for dead-lettered jobs,
  processing or queued work that has not advanced for 15 minutes, and attachments left in private
  quarantine for 24 hours.
- Each incident creates an in-app notification for active Costivra operators. Stable incident and
  recipient keys use the existing unique index, so the one-minute worker cannot generate duplicate
  alerts for the same condition.
- Added pure threshold tests for normal retries, stuck processing, stuck queues, dead letters, and
  aging quarantine. Applied the notification-kind migration to live Supabase and verified the
  duplicate-prevention index remains active.

## Tenant download and document prompt-injection regressions — August 2, 2026

- Added route-level tests proving the customer document download endpoint scopes its lookup by
  both document ID and active organization before asking private storage for a signed URL. A
  foreign document returns `404`, and no signed URL is created.
- Added a synthetic hostile invoice fixture containing requests to reveal environment variables,
  cross tenant data, approve an invoice, cancel a contract, and send external email. Tests prove
  the text stays inside the untrusted source payload, extraction exposes no action tools, unknown
  secret/action/approval properties are discarded, and non-allowlisted evidence is removed.
- Targeted validation passed with six tests plus TypeScript checking.

## Verified Resend intake domain — August 2, 2026

- A live Costivra-to-demo-workspace probe proved sending and signed webhook delivery, then exposed
  that provisioned customer addresses used `inbound.costivra.ai` while the single Resend receiving
  domain was `costivra.ai`. The current Resend plan rejected a second domain.
- Added a migration that moves existing and future customer intake addresses to the verified
  `costivra.ai` domain. Vercel Production uses the same value. A dedicated intake subdomain remains
  the preferred future layout after upgrading the Resend domain allowance.
- Production probes then passed through the real system. An attachment-free message reached the
  correct demo tenant, was claimed once by the cron, and completed as needs-review. A public sample
  invoice PDF followed the same route and was placed in private quarantine with
  `scan_status=unavailable`; no document or invoice was created while malware scanning was absent.
  This proves the current system fails closed instead of silently trusting an unscanned file.
- A misleading zero-attachment review message was corrected to say that no supported attachments
  were included.

## Durable inbound invoice processing — August 2, 2026

- Moved customer invoice attachment processing out of the Resend webhook request and into a
  durable, server-only work queue backed by `inbound_email_events`.
- Added atomic job claiming, stale-lock recovery, idempotent attachment continuation, bounded
  retries at 1 minute, 5 minutes, 30 minutes, and 2 hours, plus a dead-letter/manual-review state
  after five failures.
- Added a protected one-minute Vercel Cron worker. The webhook now returns `202` after routing,
  trusted-sender validation, durable persistence, and audit logging.
- Added plain-language queued, processing, retry, and manual-review states to the customer
  Integrations page.
- Applied `20260802155628_durable_inbound_email_queue.sql` to the live Costivra Supabase project.
  Anonymous and authenticated roles cannot claim jobs; the server role can. A rollback-only live
  database test confirmed the same job was not claimed twice.
- Added a generated `CRON_SECRET` to the Vercel Production environment as a sensitive value.
- Validation passed: `npm run typecheck`; `npm run lint` (four pre-existing warnings, zero errors);
  `npm test -- --run` (23 files, 73 tests); `npm run test:integration` (1 test); `npm run build`
  (33 pages); and `npm run test:e2e` (6 passed, 2 intentionally skipped by project targeting).
- Verified the Vercel team is on the Pro plan, which supports the configured one-minute worker.
- Remaining deployment requirement: run one real forwarded-invoice test after configuring the
  malware scanner.

## Bulk row selector visibility — August 2, 2026

- Fixed the shared Accounts/Contacts row selector CSS so the check icon is hidden for unselected rows and appears only on hover, keyboard focus, or selection.
- Validation: `npm test -- --run` passed (71 tests). The local Playwright CLI could not attach to the authenticated in-app browser session, so visual confirmation should be done by refreshing the open Manage page.

## Realtime Resend events, notifications, and mail attachments — August 2, 2026

- Expanded the production Resend webhook subscription to cover inbound messages, scheduled/sent/delivered/delayed mail, opens, clicks, bounces, complaints, failures, and suppressions. The existing route continues to verify each webhook signature before processing it.
- Added recipient-scoped Supabase Realtime notifications for new inbound mail, opens, clicks, and delivery failures, with a 30-second polling fallback. The shared toast system now supports a direct **View** action, restrained entrance/exit motion, and a soft Web Audio chime that only starts after the browser permits audio.
- Added a persisted **Notification sounds** preference in owner Settings. It defaults on, can be disabled per operator, and updates without overwriting unrelated profile or signature fields.
- Added private storage and server-only metadata for regular mailbox attachments. Inbound Resend attachments are fetched from their short-lived provider URLs, size-limited, hashed, malware-scanned, and stored in the private `costivra-mail-attachments` bucket. Only clean attachments can be opened through the authenticated Manage attachment route; unavailable or infected files remain quarantined.
- Existing invoice-intake attachments continue through the document pipeline, including the same malware boundary, private source storage, extraction, evidence, and review behavior. Outbound compose attachments remain limited to five files, 10 MB each, and 20 MB total before Resend submission.
- Applied `20260802115030_realtime_mail_notifications_and_attachments.sql` to the Costivra Supabase project. The migration adds the sound preference, targeted notification fields and RLS, Realtime publication, the restricted attachment table, and private storage bucket.
- Validation passed: `npm run typecheck`, `npm run lint` (four existing warnings, no errors), and `npx vitest run --reporter=dot` (22 files, 71 tests). A production build was not repeated while the active local development session was being used for review.
- Remaining deployment requirements: configure `MALWARE_SCANNER_URL` or `CLOUDMERSIVE_API_KEY` before inbound attachments can be released from quarantine. Resend still reports domain-level open and click tracking as disabled even after its update API acknowledged the change; those two dashboard toggles must be confirmed before open/click events can arrive. The webhook is already subscribed for them.

## Durable workspace-member CRM contacts — August 2, 2026

- Added `20260802120301_persist_membership_crm_contacts.sql`, which creates a restricted database trigger that persists organization members as `crm_contacts` linked to `profiles.id`.
- Backfilled existing memberships, including Lewis A Patterson for the Gmail account, without duplicating existing CRM contacts.
- Supabase verification passed: Lewis now has a permanent CRM contact ID, and the membership trigger is enabled.
- Remaining follow-up: run the normal typecheck/lint/test/build suite before the next deployment.

## Contextual email drafts and profile signatures — August 2, 2026

- Added optional **Title**, **Phone number**, and **LinkedIn profile** fields beside the owner profile photo in Settings. Blank fields stay out of the signature. The details are validated server-side, write only to the authenticated operator profile, and create an audit event without recording the raw phone or URL.
- Added a `/`-triggered composer prompt: “Describe what you want to write.” It retrieves only the recipient-matched contact/account, related vendors, recent CRM activities, and recent conversations on the server, bounds the context, and asks the AI for a short human email in plain language. The operator still reviews and explicitly sends it; the drafting route cannot send mail or change CRM data.
- Refined the `/` drafting interaction into an editor overlay. The prompt now enters and exits over the message area, hides the editor placeholder while active, transitions into a restrained Costivra progress state during generation, animates the subject and message into place, and respects reduced-motion preferences. Generated drafts are also deterministically framed with the recipient's first name (or `[First name]`) and a natural sign-off followed by the operator's first name.
- Added a sender signature preview in the composer. At delivery, the server appends a canonical signature using the latest profile values. Profile photos stay private and are attached to the email by CID; without one, recipients get a circular initials fallback. Signature fields are omitted when unset.
- Refined the composer’s addressing flow: To, Cc, and Bcc accept multiple removable recipient chips, search contacts by name or email, rank contacts from the selected account first, include active Costivra staff from the existing internal staff relation, and still accept a valid outside address. Cc/Bcc now animate into the fixed-height composer while the message area yields space instead of increasing the modal height. The subject row uses a matching **Sub** label.
- Matched the signature fallback avatar to the CRM’s standard circular person glyph and fixed its centering. The Costivra lockup is larger and sits on an explicit white email-safe tile so the real mark remains legible in clients that force dark mode; the canonical sent signature uses the same treatment.
- Follow-up polish: recipient suggestions now wait for a search term instead of opening on field focus; the sender title is forced onto its own line below the name; and the normal signature lockup is unboxed and enlarged. Supporting email clients apply the protective white treatment only when they render in dark mode.
- Applied `20260802101500_profile_email_signature_fields.sql` to Supabase. Existing profile RLS remains in force. The Supabase security advisor still reports only the pre-existing leaked-password-protection warning; performance advice is existing unused-index information.
- Validation passed: `npm run typecheck`, `npm run lint`, `npx vitest run --reporter=dot` (22 files, 71 tests), and `npm run build` (33 static pages). The in-app browser refused control of the existing localhost tab under its URL policy, so authenticated visual QA was not repeated in this pass; the local development server was restarted for manual refresh.

## Owner navigation hover rail — August 1, 2026

- Reworked the owner navigation into a 72px rail on desktop and compact screens that expands after deliberate mouse hover or keyboard focus, plus the existing mobile drawer. The rail waits 240ms before opening and 460ms before closing to avoid accidental flicker; Escape closes it and the account menu.
- Grouped the primary destinations into **Clients** and **Work**, moved Settings beside the profile area, removed the disconnected expand/collapse controls, kept active icons white, and changed the Mail counter to a blue badge with white text capped at `99+`.
- Kept navigation icons on a stable horizontal anchor while labels, section headings, dividers, spacing, and rows animate during expansion and collapse. Motion is restrained, uses the CRM navigation as a reference, and is disabled when the user requests reduced motion.
- The profile card remains the account-menu trigger, with a circular avatar, profile/photo settings, and sign out. The popup matches the trigger width and opens upward inside the sidebar.
- Reorganized Mail to use the same connected header-tab pattern as Accounts: mailbox selection, Inbox, Starred, Sent, Drafts, Scheduled, Archive, and Trash now sit inside one fixed-height workspace card above the message list/reader. Folder counts appear only when non-zero, Compose is centered in the header, tabs scroll horizontally on narrower screens, and the list, reader, and contact context own their internal scrolling.
- Corrected the Accounts lifecycle-tab underline so it is sized from each active button’s actual label area rather than a fixed width/step. Longer labels such as Onboarding now receive a complete underline while retaining a short entrance animation.
- Matched Mail’s folder tabs to the Accounts tab treatment: plain text labels, identical spacing and typography, and the same label-width underline behavior. The mailbox selector sits to the left of Inbox; the redundant inbound-status card was removed.
- Rebuilt the mail composer as a rich HTML editor with text styles, emphasis, lists, alignment, links, clear formatting, undo/redo, file and image attachment controls, attachment-name feedback, an animated scheduling popover, and animated minimize/maximize behavior. Recipient emails now resolve their CRM account server-side, rich HTML is sanitized and stored beside a plain-text fallback, Resend receives both formats, and closing a non-empty composer saves a draft.
- Lifted the composer into the persistent `/manage` layout so its draft, recipient context, expanded/minimized state, and attachments follow the operator between Mail, Accounts, Contacts, Settings, and other owner pages. Minimize now animates width, vertical body height, opacity, and position together; close runs a dedicated downward fade/scale exit before unmounting. Reduced-motion preferences disable these transitions.
- Fixed the close path so saving a draft or sending a message waits for the composer’s 280ms exit before routing to the resulting mailbox. This prevents the abrupt disappearance that was cutting off the close animation.
- Validation: `npm run typecheck`, `npm run lint`, `npm test` (61 tests), and `git diff --check` passed. Browser QA at `/manage/mail` confirmed the connected workspace, full rich-text toolbar, scheduling popover, minimize/maximize interaction, and zero console warnings/errors. A real outbound send was intentionally not triggered during QA.

## Demo invoice import and extraction QA — August 1, 2026

- Created two Supabase Auth demo workspaces with owner memberships so the end-to-end portal can be reviewed without touching a real customer tenant: Cloud Billing Demo and Telecom Software Demo.
- Imported eight public, de-identified PDF fixtures into the private `costivra-documents` bucket. The import uses the same private storage, SHA-256 deduplication, extraction-version, evidence, invoice, line-item, review, and audit paths as a customer upload; the temporary local fixture route and account-creation script were removed after the run.
- Fixed the Node PDF worker configuration so `pdf-parse` loads the installed `pdfjs-dist` worker instead of a missing Turbopack `.next` chunk.
- QA result: four telecom/utility/software fixtures produced completed extraction versions with invoice rows, 4–14 line items, and 10–12 evidence references each. All remain `needs_review` because vendor matching/reconciliation or required fields still need a human decision. AWS/Azure fixtures correctly escalated to review when the model returned an ambiguous multi-invoice or incomplete result; no unvalidated invoice was written.
- This is a test dataset, not proof of production extraction accuracy. Before launch, add golden fixtures and evaluation thresholds, a visible correction console, and a configured malware scanner. Demo credentials are provided in the handoff and should not be reused for customer access.

## Public marketing-page clarity pass — August 1, 2026

- Reviewed all public marketing, category, industry, utility, scan, and legal routes for a clear visitor question: who Costivra helps, what it reviews, what it finds, and what the visitor can do next.
- Rewrote abstract page headlines and ledes on Product, Solutions, How it works, Security, Integrations, Industries, and Pricing; standardized the primary CTA to “Scan three bills free”; gave Case Studies a useful pilot CTA; and made legal-page introductions specific to their subject.
- Browser route audit passed for 30 public routes with visible headings and successful responses. Representative screenshots were captured in `output/playwright/public-product-after-reveal.png`, `output/playwright/public-pricing.png`, `output/playwright/public-case-studies.png`, and `output/playwright/public-energy-mobile.png`.
- Validation: `npm run typecheck`, `npm test` (56 tests), and `npm run build` passed. `npm run lint` remains blocked by one pre-existing error in `src/components/manage-portal.tsx:1461` (`setState` inside effect); the touched marketing files introduce no lint errors.

## Homepage product motion — August 1, 2026

- Added restrained, evidence-led motion to the public homepage: the hero preview cycles through classification, detection, evidence linking, and approval; the evidence viewer animates category changes; and the workflow section reveals on scroll with staggered steps.
- Added reduced-motion handling so these effects are disabled for visitors who request less motion.
- Validation: `npm run typecheck`, `npm run lint`, and `npm test` passed; browser screenshots captured at desktop and mobile sizes in `output/playwright/home-motion-desktop.png` and `output/playwright/home-motion-mobile.png`.

## Structured invoice pipeline v1 — August 1, 2026

- Added live `invoices`, `invoice_line_items`, and append-only `invoice_field_corrections` tables with exact numeric money columns, constraints, tenant-scoped Row Level Security, browser read-only grants, and covering indexes. Supabase now reports zero unindexed foreign keys for the project.
- Expanded document extraction from a summary-only shape to typed invoice identity, dates, service periods, masked account suffix, purchase-order reference, subtotal, tax, fees, credits, total, amount due, and up to 500 line items. Money is accepted only as decimal strings.
- Added deterministic exact-cent reconciliation for line-item totals and invoice components. Missing inputs remain incomplete, and mismatches are preserved rather than silently repaired.
- Added deterministic vendor resolution using organization relationships, canonical vendor names, and curated aliases. Only one exact match attaches automatically; ambiguous or unmatched names require review.
- Manual uploads and Resend email attachments now create structured invoice candidates. A document is only marked ready when required fields exist, vendor resolution succeeds, confidence is at least 85%, and arithmetic reconciles.
- The Documents page now shows invoice number, total, line-item count, reconciliation status, and review status alongside the source document.
- Applied the previously pending vendor-directory metadata migration so aliases and billing cadence now exist in production.
- Validation: `npm test` passed 41 tests across 13 files; `npm run typecheck`, `npm run lint`, and `npm run build` passed. Browser QA covered the authenticated Documents page at 1440×900 and 390×844 with no horizontal overflow, no browser console warnings/errors, and a readable mobile action layout.
- Remaining boundary: OCR, human correction/approval UI, expense-account matching, golden-document accuracy evaluation, and automatic opportunity creation are not part of v1 and must not be represented as complete.

## Authenticated access routing — July 31, 2026

- Fixed the production `NO_ORGANIZATION_MEMBERSHIP` crash triggered when an authenticated owner clicked the public top-bar **Sign in** link.
- Added `/access` as the narrow server-side resolver: active internal staff and configured owner emails go to `/manage`; organization members go to `/app`; accounts with neither authorization receive a clear login message.
- Successful password sign-in now passes through the same resolver, and `/app` safely reroutes missing-membership sessions instead of exposing a Next.js server-error screen.
- Validation passed: `npm run typecheck`, `npm run lint`, `npm test` (20 tests), and `npm run build`.

## Password recovery reliability — July 31, 2026

- Replaced browser-bound PKCE recovery-email links with a server-verified Supabase token-hash route at `/auth/confirm`.
- Password setup now remains disabled unless the browser has a valid recovery session; invalid or expired links fail closed instead of hanging indefinitely.
- Updated the live Supabase recovery template to one clean Costivra-branded email using the correctly proportioned approved logo and the new `costivra.ai` confirmation route.
- Commit `d440812` is deployed to Vercel production and reports **READY**. `npm run typecheck` passed before deployment.
- Production diagnosis confirmed that the newest server-verified link reaches `/set-password`, enables both password fields, and produces no browser console errors. Older `code=` links remain browser-bound and cannot be repaired.
- Added a scanner-safe `/confirm-recovery` step: automated email previews can load the landing page, but only the user's explicit **Continue securely** form submission consumes the one-time token.
- Restored the full email footer across the shared Resend shell and the hosted Supabase recovery template: Costivra promise, website, Privacy, Security, and Contact links. The checked-in template is `docs/SUPABASE_RECOVERY_EMAIL_TEMPLATE.html`.
- Validation for the scanner-safe update passed: `npm run typecheck`, `npm run lint`, `npm test` (17 tests), and `npm run build`.

## Inquiry-to-lead, consent, and brand enforcement — July 31, 2026

- Public inquiries now atomically create or resolve a real CRM account and contact, save the inquiry, set new accounts to **Lead**, add a high-priority follow-up task and inquiry activity, and create an internal owner notification. No sample or demo lead was added.
- The public endpoint is limited to five attempts per network address per hour using server-only HMAC identifiers and seven-day counter cleanup, reducing automated lead and email abuse without storing raw IP addresses.
- The owner portal polls a narrow authenticated endpoint every three seconds and turns unread inquiries into immediate toasts that link to the live account. Cross-tenant notification tables remain unavailable to browser roles.
- The contact form now has an unchecked, explicit email-marketing permission box. Opt-ins are stored as append-only evidence with the exact consent copy, version, source, and timestamp. Account lists and contact inspection show the current opt-in status.
- Inquiry acknowledgments and owner notifications use the existing Resend adapter, stable idempotency keys, the external-side-effect ledger, a shared branded email shell, and the real Costivra circuit-mark asset. A failed email send does not discard the saved lead.
- Vercel Production and Preview now explicitly set `RESEND_FROM_EMAIL=Costivra <hello@costivra.ai>` and `CONTACT_NOTIFICATION_EMAIL=l.patterson@costivra.ai`; the deployed code no longer depends on fallback addresses for inquiry delivery.
- Replaced letter-glyph branding on owner access, owner navigation, and password setup with the real Costivra logo. Added a repository rule in `AGENTS.md` requiring approved logo assets and the shared branded shell for product and marketing email.
- Applied `20260731175000_inquiry_leads_marketing_consent_notifications.sql` to the live Costivra project. A temporary `.invalid` migration check proved lead stage, consent, task, activity, and notification behavior; the exact organization and all cascaded test rows were deleted. Current counts confirm zero inquiry or migration-QA rows.
- Supabase's security advisor reports no new schema issue; its only current warning is leaked-password protection being disabled. New indexes are reported as unused because the feature has not received live customer traffic yet.
- Final validation passed: `npm run typecheck`, `npm run lint`, `npm test` (16 tests), and `npm run build`. Live database checks confirmed RLS is enabled and browser roles have no read grants on consent, notification, notification-read, or public-rate-limit tables. Browser QA covered desktop and 390px mobile contact layouts, unchecked/toggle/reset consent behavior, zero horizontal overflow, the branded confirmation landing, the real password-setup logo, and an empty browser error log.
- Signup now sends email confirmation back to `https://costivra.ai/login` (or the current branded site origin), keeping the visitor-facing flow on Costivra pages.
- Supabase's separate **Custom Domain add-on** is now enabled for project `skfocjrykyvsaviyhdea`. `auth.costivra.ai` is registered, the public CNAME points to `skfocjrykyvsaviyhdea.supabase.co`, and the required ACME TXT record is publicly visible. Supabase currently reports `ssl.status=pending_validation`; do not activate or change `NEXT_PUBLIC_SUPABASE_URL` until SSL is ready. The existing project URL remains configured so authentication is not broken while the certificate issues.

## Owner CRM and Resend mailbox — July 31, 2026

- Added server-only mailbox seats and the **Mailboxes** owner page. `l.patterson@costivra.ai` is the active default owner seat; owners can create additional personal or shared `@costivra.ai` addresses, and disable non-default seats without deleting their history.
- Added `hello@costivra.ai`, `privacy@costivra.ai`, and `security@costivra.ai` as active send/receive mailboxes assigned to the Costivra owner. General inquiries are shared; privacy and security are owner-only so future operators do not inherit sensitive mail. Resend domain receiving and the production inbound webhook are enabled; all three mailbox changes have internal audit records.
- Compose now requires an authorized active sender seat. Inbound messages route by exact active mailbox address, threads and side-effect records retain the mailbox identity, and operators can use only assigned or shared seats while owners administer all seats.
- Added the owner-only `/manage` portal with Overview, Accounts, Contacts, Outreach, Mail, and Activity views. It reads live Supabase organizations and workspace members; there is no frontend demo data.
- The live Supabase account check found one Auth user and one organization, both belonging to the existing `demo@costivra.com` / Northstar Hospitality test workspace. That workspace is now explicitly hidden from `/manage` without deleting or changing its customer-portal records. The CRM will stay honestly empty until a real organization is created.
- Added account/contact creation, lifecycle stage, next follow-up, private notes, internal activity notes, and assignable outreach tasks. Customer workspace financial records remain authoritative and tenant-isolated.
- Added a Gmail-style Resend mailbox with Inbox, Starred, Sent, Drafts, Scheduled, Archive, and Trash; conversation reading; compose, reply, forward, Cc/Bcc, attachments, plain-text rendering, search, provider status, and client context.
- Added explicit internal authorization through `internal_staff_users` plus `COSTIVRA_INTERNAL_ADMIN_EMAILS`. Customer organization roles never grant cross-tenant owner-portal access.
- Added an external-side-effect ledger around every send, including human authorization, idempotency, request hash, provider reference, retries, trace ID, sanitized metadata, CRM activity, and internal audit history.
- Extended the signed Resend webhook to keep delivery states current and route exact active `crm_mailboxes` recipients while preserving the separate customer document-intake path.
- Applied the owner CRM, mailbox-seat, and mailbox audit-index migrations to the live Costivra project. All new tables have RLS enabled and deny browser roles. Supabase security review found only the existing leaked-password-protection warning; the follow-up performance review found no unindexed foreign keys.
- Validation passed: `npm run typecheck`, `npm run lint`, `npm test` (14 tests), and `npm run build`. Browser QA covered the real owner seat, seat-creation dialog, empty live inbox, and sender selection; the review added a narrower-desktop navigation breakpoint and purpose-built mobile mailbox cards. The temporary QA route was removed afterward.
- The latest `main` deployment is READY and aliased to `costivra.ai`. Vercel Production now uses `RESEND_INBOUND_DOMAIN=costivra.ai`, allowlists `l.patterson@costivra.ai` as the internal owner, and has valid server-only Resend API, Resend webhook, and Supabase secret credentials. The initial inherited Resend values were placeholders and the Supabase server secret was absent; both problems were found by the first live inbound event and corrected before customer mail was used.
- Resend sending and receiving are enabled and fully verified for `costivra.ai`; Vercel DNS publishes the root MX `inbound-smtp.us-east-1.amazonaws.com` at priority 10. The production webhook is enabled for inbound and all implemented outbound delivery events.
- Created a Supabase Auth owner invitation for `l.patterson@costivra.ai`, redirected to `/manage`; it is awaiting Lewis's acceptance. The invitation was received by Resend and persisted in the live `l.patterson@costivra.ai` CRM inbox through a signed, successful `200` webhook. On first authenticated visit, the production allowlist records the user as an internal owner.
- Added and deployed `/set-password` for the owner activation link. It accepts Supabase PKCE or implicit invite sessions, removes tokens from the visible URL, refuses sessions without the one-time owner-invite metadata, requires a 12-character password, clears the invite flag, and routes the completed owner to `/manage`.
- Sent the auditable owner-only message **Set your Costivra owner password** from `hello@costivra.ai` to `l.patterson@costivra.ai`. Resend reports it delivered, and the signed inbound webhook stored the same message in the CRM inbox.
- Remaining production check: open the newest owner-password message in Resend Receiving, set the password, sign in, then send one deliberately authorized message linked to a real client account. No customer email was sent during setup or testing.
- Dependency audit follow-up: the affected Next.js dependency tree has since been upgraded, and the
  August 2 production audit reports zero known vulnerabilities.

## Automatic email document intake — July 31, 2026

- Added one private generated intake address per organization, automatic provisioning for every new customer workspace, tenant-scoped inbound event and attachment records, Row Level Security, audit events, and required foreign-key indexes in the live Costivra Supabase project.
- Added a signed Resend `email.received` webhook. It resolves the exact organization address, rejects unknown senders, retrieves short-lived attachments, permits only PDF/DOCX/TXT up to 20 MB, scans before extraction, deduplicates by SHA-256, and reuses the same versioned document/evidence pipeline as manual upload.
- Added a fail-closed malware boundary. Clean files proceed; infected files are rejected; scanner failures or missing configuration put originals in private quarantine and never send them to AI extraction.
- Added owner/admin customer controls under Integrations: copy address, approve/remove forwarding senders, activate/pause intake, retry quarantined files, and review recent accepted/rejected/quarantined activity. Non-admin members have read-only visibility.
- Added client setup guidance in `docs/EMAIL_INTAKE_SETUP.md` and server configuration keys in `.env.example`.
- The production Resend webhook at `https://costivra.ai/api/webhooks/resend` is enabled for `email.received` plus scheduled, sent, delivered, delayed, bounced, complained, failed, and suppressed delivery events.
- DNS inspection found no existing MX provider on the root `costivra.ai` domain. The verified Resend domain can therefore be used for CRM mailbox seats without displacing an existing mailbox host; receiving activation is tracked in the owner-mailbox setup above.
- A production malware-scanning provider and its server credential are still required. A direct Cloudmersive adapter is included for the simplest setup, while a provider-neutral HTTP adapter remains available. Until configured, the system safely quarantines files instead of pretending intake completed.
- Validation: `npm test` (3 inbound-policy tests), `npm run typecheck`, `npm run lint`, and `npm run build` passed. Supabase security advisor reported no new RLS findings; the three new unindexed-foreign-key findings were corrected in a follow-up migration.

## Transactional contact email — July 31, 2026

- Verified the `costivra.ai` domain is active for sending and receiving in Resend, with every sending and receiving DNS record fully verified.
- Added a server-only Resend adapter for contact-inquiry receipts and internal notifications from `hello@costivra.ai`.
- Added stable idempotency keys and a database delivery ledger that records request hashes and provider outcomes without storing message bodies. RLS is enabled and both browser roles are denied access.
- Contact inquiries are saved before email is attempted. A provider outage is recorded but does not discard the inquiry or falsely report that the inquiry itself failed.
- Corrected the public contact addresses and API fallback from `costivra.com` to the canonical `costivra.ai` domain.
- This does not enable vendor communication or other consequential external actions; those still require the later approval-policy and durable-workflow milestone.

## Blueprint alignment review — July 31, 2026

The implementation was checked against the original `COSTIVRA_AGENTIC_BUSINESS_BLUEPRINT.md`, especially the essential product loop, product surfaces, MVP definition, twelve-week plan, roadmap, and recommended Codex task order.

### Aligned and operational

- The positioning, homepage promise, initial categories, evidence-first language, human-approval doctrine, and neutral UCEP disclosure match the blueprint.
- Authentication, organizations, tenant memberships, private document intake, extraction versions, evidence references, expenses, contracts, opportunity cases, action plans, approvals, audit events, savings outcomes, notifications, reports, and grounded chat are backed by the live Supabase project rather than UI-only placeholders.
- All 26 current public tables have Row Level Security enabled. The external-side-effect ledger exists and is intentionally empty until an authorized provider action is implemented.
- The customer navigation matches the blueprint and Ask Costivra remains an exploration surface rather than the system of record.

### Not yet the full promised MVP

- The product still needs a human extraction review and correction console with preserved correction history.
- Deterministic software, telecom, and energy-review rules need versioned calculations, reconciliation tests, and complete evidence presentation. Seeded findings are not a substitute for this engine.
- Expense and contract detail views still need invoice history, line items, normalized contract terms, data quality, active cases, actions, and savings history in one record.
- Approval-policy configuration needs explicit role, threshold, two-approver, external-communication, cancellation, and consent rules—not only stored policies and action status controls.
- The neutral energy fork still needs referral-consent, partner/referral, package-export, destination-choice, and revocation workflows. Marketing disclosure alone is not implementation.
- Savings verification still needs approved baselines, post-action comparisons, deterministic methods, confounding-factor review, and fee support before “verified value” is a complete product claim.
- Durable workflow retries, idempotency reconciliation, automated evaluations, tenant-isolation integration tests, and end-to-end release gates remain launch blockers.

### Correct next build order

1. Extraction review/correction console and deterministic reconciliation.
2. Expense and contract detail records with invoice, line-item, and term models.
3. Versioned opportunity rules and calculation evidence.
4. Approval-policy configuration and durable action orchestration.
5. Energy referral consent and neutral advisor export.
6. Baseline-driven savings verification, followed by pilot hardening and automated release gates.

## Slopless product polish — July 31, 2026

- Restored Costivra lime to the portal's true creation and upload actions while keeping routine operational controls quiet. Extended the portal's soft-corner geometry to selected public frames, grids, and editorial panels without rounding full-bleed sections or every content block.
- Reduced the public hero texture to a near-silent structural grid and removed the decorative scanline so the headline and product proof carry the composition.
- Quieted the customer workspace: neutral active navigation, ink-colored primary actions, consistent 10px topbar controls, softer surfaces, and one restrained status-color system.
- Added a global toast system with success, error, warning, and information states; accessible live announcements; labeled dismiss controls; stacking; timed dismissal; entrance/exit motion; mobile-safe positioning; and reduced-motion support.
- Connected toasts to real portal mutations and notification actions. Successful operations refresh Supabase-backed data; failed operations show the server error instead of a false success message.
- Browser QA passed for the public home and portal at desktop and 390px mobile widths. No horizontal page overflow was found. The command palette and create/upload dialogs remained visible and unclipped; mobile modal width was tightened to avoid fractional-edge clipping.
- Live behavior check passed: a Supabase-backed settings save produced the expected success toast. Browser console contained no warnings or errors beyond normal Next.js development messages.

## Operational now

- Supabase authentication, signup organization provisioning, protected `/app/*` routes, session refresh, and sign-out.
- Tenant-scoped Supabase repositories for organizations, members, locations, vendors, expenses, contracts, documents, extraction versions, evidence, opportunities, actions, approvals, savings, integrations, reports, notifications, settings, chat sessions, and chat messages.
- Real command-center metrics and every portal list rendered from Supabase. The former hard-coded customer workspace was removed.
- Private PDF, DOCX, and text upload to `costivra-documents`, SHA-256 duplicate detection, text extraction, OpenRouter document analysis, evidence records, signed downloads, and deletion.
- Evidence-grounded Ask Costivra chat with persisted sessions and clickable source-document citations.
- Working expense, vendor, and contract creation; opportunity status changes; action approval/decline/start/complete; organization settings; notifications; team invitations; integration state controls; and live CSV reports.
- Public contact inquiries persist server-side. The free-scan path now creates a secure account before accepting private documents instead of simulating an upload.
- Portal dialogs render through a top-level portal, animate in and out, close on Escape/backdrop, and stay within desktop and mobile viewports.
- Custom blue scrollbars, responsive mobile/tablet navigation, restrained colors, compact typography, loading/empty/error/success states, and reduced-motion support.

## Live connections

- Supabase project: `skfocjrykyvsaviyhdea` (`us-east-2`).
- Private Storage bucket: `costivra-documents`.
- AI: OpenRouter through the server-only adapter in `src/lib/ai/openrouter.ts`.
- GitHub deployment route: `https://github.com/powerchoosers/costivra.git`, `main` branch to Vercel.
- Local secrets are in ignored `.env.local`; deploy environments need the variables listed in `.env.example`.

## Validation completed August 1, 2026

- Vendor intelligence — replaced the centered add-vendor dialog with a persistent, non-blocking right panel; added canonical vendor search and autofill for category and website; added dollar/decimal spend entry with monthly or annual annualization; and created tenant-scoped vendor detail pages for saved spend, contract terms, findings, actions, documents, and expense history. The live Supabase migration added search aliases, suggestion flags, spend cadence, and a curated 40-vendor MVP catalog. RLS remains enabled. Viewer creation is blocked in both the interface and API.
- Vendor validation — `npm run typecheck`, `npm run lint`, all 41 Vitest tests, and `npm run build` passed. Authenticated browser QA passed at desktop and 390×844 mobile, confirming Google Workspace autofill, a draft that survives navigation, the populated Verizon detail page, and permission-aware controls.

- Manage settings — added a dedicated owner Settings page, moved Resend-backed email identity administration out of the main navigation and into Settings, retained `/manage/mailboxes` as a compatibility redirect, and added private Supabase-backed operator profile-photo upload with type/size/signature validation, audit logging, and short-lived signed rendering. The `costivra-avatars` private bucket and `profiles.avatar_path` migration were deployed to the Costivra Supabase project. `npm run typecheck`, `npm run lint`, all 30 Vitest tests, and `npm run build` passed. Protected-page browser QA reached the expected sign-in boundary but could not inspect the new authenticated screen without an active local session.
- Owner CRM tables — converted `/manage/accounts` and `/manage/contacts` into fixed-height workspaces with independently scrolling table and inspector regions. Added horizontally scrollable data tables with sticky row numbers and sticky account/contact identity columns, hover-revealed accessible row selectors, visible-page selection, restrained selected-row states, selected-record export, single-record follow-up/email actions, table footers, and pagination arrows. Marketing consent/status now has its own column. Contacts now includes an account-style detail inspector. Redundant page headings and standalone export/count controls were removed. `npm run typecheck`, targeted ESLint, and all 28 Vitest tests passed. Authenticated local browser QA remains unavailable because the local session redirects to sign-in.
- Owner mail UI — widened the mailbox folder rail so full addresses stay inside the selector, removed the duplicate rail-level Compose button, added animated per-message expand/collapse cards with message-specific Reply actions, and removed framed containers from sidebar toggle controls in both `/manage` and `/app`. `npm run typecheck` and targeted ESLint passed. Authenticated local browser QA remains unavailable because the local session redirects to sign-in; production cannot show these uncommitted changes.
- Password recovery — diagnosed the production failure as a stale, rotated Supabase refresh token rather than a password-length failure. `/set-password` now participates in session-cookie refresh, removes invalid Supabase auth cookies, and renders a dedicated reset-link screen when no valid session exists.
- Password entry — the form reads the values actually present in the browser instead of using hidden React state as a submit gate. Password-manager autofill can no longer leave a filled-looking form disabled; both visibility controls and match/length feedback remain available, and the server returns a specific reason for every rejected save.
- Password update — the authenticated route updates only the current Supabase user, validates both 12-character entries on the server, rejects cross-origin requests, supports a normal HTML form fallback, and contains no owner-email or admin-user fallback.
- Production verification — a temporary `example.invalid` Supabase Auth user completed token verification (`307`), rendered the active form (`200`), saved a password (`200`), and signed in with the new password. The temporary user was deleted immediately. Vercel production deployment `dpl_Dgnz1vUhN27nF8qXFeGd2rctnV8C` is READY on commit `d49d941`.
- Owner recovery — sent one fresh **Reset your Costivra password** email after the verified deployment; Resend reports it delivered to the owner mailbox. Older reset links remain single-use and should be ignored.
- Marketing header stickiness — changed root horizontal overflow containment from `hidden` to `clip`, preserving horizontal clipping without creating the scroll container that caused the homepage header to scroll away. Browser QA confirmed the header remains at its configured 20px offset after a 675px scroll, with no horizontal overflow or console errors.
- Route transitions — removed the root-level opacity/translate entrance that briefly exposed the dark document background during navigation. Pages now paint immediately, while the existing section-level portal and scroll-reveal motion provides restrained content movement without a full-screen flash.
- Unified application motion — `/app` and `/manage` now share lightweight timing and easing tokens, keyed page-section entrances, restrained staggering, responsive panel feedback, smoother sidebar content collapse, and consistent container transitions. The former `/manage` animation referenced a missing keyframe and never ran; it now uses the same working section-level system as the customer workspace without reintroducing a full-screen fade.

## Validation completed July 31, 2026

- Password recovery entry — `/login?mode=recovery` is now a durable recovery route and remains reachable when a valid session cookie already exists; ordinary authenticated visits to `/login` still resolve to the authorized owner or customer workspace.
- Password recovery confirmation — the intermediate “Continue securely” control now forces a full same-site browser navigation to the server confirmation endpoint. This avoids blocked form submissions and Next.js client-routing redirects that can change the address while leaving the old screen visible. Supabase verification still requires a second-page `confirm=1` signal that is absent from the email link, preserving the scanner-safe boundary.
- Mobile homepage header — restored the hero's 112px mobile top spacing so the floating navigation no longer overlaps the headline. The menu now opens as an animated overlay without moving the hero, and the hamburger/close control uses a borderless icon treatment with a keyboard-only focus ring. Verified at 375×812 with a stable hero position and no browser console warnings or errors.
- `npm run typecheck` — passed.
- `npm run lint` — passed with zero warnings.
- `npm run build` — passed; all application and API routes compiled.
- Browser QA — all 13 portal routes loaded with real records and no horizontal overflow.
- Responsive QA — desktop, 820px tablet, and 390×844 mobile; no page overflow. All five create/upload dialogs and command search were opened and closed against live portal data. The tallest contract sheet remained reachable on mobile with an independently scrolling body and sticky actions; Escape, backdrop close, focus restoration, body scroll locking, entrance/exit motion, reduced-motion handling, and console health passed.
- Authentication — password sign-in reached the intended protected route.
- Account entry UI — sign-in and sign-up now use a responsive rounded-card layout with honest, disabled Google and Outlook placeholders for future OAuth work; email/password auth remains unchanged.
- Motion system — public routes now share a light route-entry and scroll-reveal rhythm; portal sections, buttons, surfaces, command search, and modals use the same restrained easing with reduced-motion fallbacks.
- Demo workspace — `demo@costivra.com` is confirmed in Supabase with an owner membership for Northstar Hospitality and seeded records for expenses, contracts, documents, and opportunities.
- Motion system — public routes now share a light route-entry and scroll-reveal rhythm; portal sections, buttons, surfaces, command search, and modals use the same restrained easing with reduced-motion fallbacks.
- Account entry UI — sign-in and sign-up now use a responsive rounded-card layout with honest, disabled Google and Outlook placeholders for future OAuth work; email/password auth remains unchanged.
- Persistence — settings saved and reloaded from Supabase; public contact inquiry persisted (QA row removed afterward).
- Reports — a current CSV generated and downloaded from Supabase records.
- AI — answered the highest-value open-opportunity question and linked the supporting `direct-energy-june-2026.txt` source citation.
- Supabase — all missing foreign-key indexes fixed; current domain row counts verified; no missing-RLS or unindexed-FK findings remain.

## Honest boundaries

## Invoice review operations — August 1, 2026

- Added `/manage/invoice-review` as a real Supabase-backed exception queue. The default view includes only invoices that require human attention; clean, high-confidence, fully reconciled invoices remain available under **All invoices** without creating routine review work.
- Owners can select up to 100 invoices and delegate them in bulk to active internal reviewers with a priority and optional deadline. Every assignment is recorded in the internal audit ledger.
- Added `/manage/invoice-review/[id]` as the individual verification workspace with a secure React PDF viewer, source navigation, editable structured fields, vendor/account matching, exact reconciliation status, line items, evidence excerpts, reviewer notes, and append-only correction history.
- Human corrections run through a narrowly scoped server-only database function, recalculate invoice arithmetic, preserve the original and corrected values with the actor and reason, and cannot edit arbitrary columns.
- Approval is intentionally fail-closed. A matched vendor, invoice number/date, service period, category, currency, total, and reconciled arithmetic are required. Approval idempotently creates or updates the linked client expense and records the decision in the audit ledger.
- The live Supabase migration `invoice_review_queue` is applied. `react-pdf` 10.4.1 is installed and dynamically loaded only on invoice detail screens.
- Validation passed: `npm run typecheck`, `npm run lint`, all 43 Vitest tests, and `npm run build`. Browser QA passed at desktop and 390×844 mobile; the queue has no page-level horizontal overflow, the table scrolls inside its own rounded container on mobile, the detail layout collapses to one column, and the React viewer rendered a real 14-page PDF canvas.

### Remaining boundary

- The production database currently contains six source documents and zero invoice rows because those documents predate the invoice-record pipeline. New invoice uploads and forwarded attachments will populate the queue. A reviewed backfill tool for historical documents remains a separate task; records should not be fabricated simply to make the queue look populated.

- Password recovery — a Supabase recovery link establishes a short-lived authenticated session by design. Costivra now marks that session as password-setup-only and blocks `/app` and `/manage` until the new password is successfully saved. The requirement cookie expires after 15 minutes and is cleared only by a successful server-side password update.

- Supabase leaked-password checking is unavailable on the current plan. Password minimum length is 10, recent authentication is required for password changes, and password-change notifications are enabled. Upgrade to Supabase Pro to enable HaveIBeenPwned protection.
- Integration controls safely manage Costivra-side connection state; provider OAuth/API credentials still need to be configured before external synchronization can occur.
- Uploaded files are validated by type, size, hash, tenant, and private storage. A dedicated malware-scanning provider and OCR for image-only scans are not connected yet; these require external vendor selection.
- Team invitations use Supabase email delivery. Production SMTP should be configured before launch.
- Billing, supplier communication, cancellation, and other external financial actions remain intentionally unavailable until provider adapters and explicit authorization workflows exist.
- Legal and UCEP drafts still require qualified counsel before commercial launch.

## Next launch work

Configure Vercel environment variables, production SMTP, domain/redirect URLs, and selected provider OAuth credentials. Then add automated tenant-isolation, upload, workflow, and browser regression suites to CI.

## Deterministic value loop and release hardening — August 1, 2026

- Approved invoices now run through versioned, exact-cent software/telecom price-change rules. Matching prior-period expenses establish the evidence-backed baseline; qualifying findings idempotently create or update the tenant opportunity instead of relying on model-generated savings.
- Energy changes may create a professional-review case, but the engine intentionally assigns no savings value without usage, weather, and rate evidence.
- Opportunity and action mutations now enforce legal state transitions and owner/admin authorization. Approving an opportunity creates one action/approval record; price actions cannot start before an owner accepts the deterministic savings baseline.
- A later approved invoice can populate the post-action comparison. The Savings workspace shows baseline, later invoice, method, calculation version, and protected accept/verify/reject controls. Only human verification can move the linked opportunity to `verified`.
- Scanned PDFs now fall back to OpenRouter PDF parsing only when native text is absent. The same structured candidate, evidence, reconciliation, and human-review boundaries still apply. Malware scanning remains separate and fail-closed.
- Applied the deterministic opportunity/savings migration and follow-up actor indexes to live Supabase. The security advisor reports only the existing leaked-password-protection warning; the performance advisor reports no warnings or missing foreign-key indexes, only expected low-traffic unused-index information.
- Added GitHub Actions quality gates, 53 unit tests, a financial-loop integration test, and responsive Chromium smoke tests. The dependency tree was upgraded/pinned to patched compatible Playwright, PostCSS, and Sharp releases; `npm audit --omit=dev` reports zero known vulnerabilities.
- Current launch boundary: the code and database can execute the contained invoice-to-opportunity-to-verification loop, but general availability still requires a malware-scanner account, a real de-identified invoice evaluation set, authenticated tenant-isolation/upload/workflow end-to-end tests, production monitoring and incident ownership, production email/auth delivery review, and counsel-approved legal/UCEP terms.
- Owner actions are tracked in `docs/PRODUCTION_LAUNCH_CHECKLIST.md`.
## 2026-08-01 — Portal record detail and inline editing pass

- Added complete customer detail routes for vendors, expenses, contracts, documents, extracted invoices, opportunities, action plans, and savings outcomes. List and card titles now open their corresponding detail record rather than ending at a summary screen.
- Added a shared, responsive detail-page system with overview tabs, related records, evidence excerpts where applicable, recent audit history, mobile stacking, protected-field indicators, and accessible edit/copy controls.
- Added field-by-field editing with Save/Cancel controls, visible success/error toasts, role enforcement, strict resource/field allowlists, type validation, tenant checks, stale-record detection through `updated_at`, and hashed audit events. Viewer accounts remain copy-only.
- Kept authoritative fields protected: source identity, extracted/reconciled invoice totals, deterministic opportunity value, workflow/approval state, and verified savings cannot be rewritten by the general editor.
- Expanded portal reads to include invoice review facts, source provenance, evidence references, relationship cadence, related record identifiers, update timestamps, and tenant-scoped audit activity. No production path was changed to use placeholder data.
- Validation passed: `npm run typecheck`; `npm run lint` (0 errors, two pre-existing-now-unused vendor-detail helper warnings); `npm test -- --run` (18 files, 56 tests); `npm run test:integration` (1 test); `npm run test:e2e` (4 passed, 2 intentionally skipped by project targeting); and `npm run build` (30 pages generated). Supabase security review reports only leaked-password protection being unavailable/disabled; performance review reports expected unused-index information on the low-traffic project, not missing indexes.
- Authenticated browser QA used a temporary development-only magic session for the existing Northstar demo account; that helper was removed before handoff. Vendor, expense, contract, document, opportunity, action, and savings detail routes rendered with zero horizontal overflow; the invoice detail renderer compiled but could not be populated visually because the live demo workspace currently has no `invoices` rows. Desktop and 390px mobile vendor layouts were inspected, Edit/Cancel worked, a same-value cadence save completed through the real API, and the resulting attributed audit entry appeared. No reusable demo password or auth bypass was added.

## 2026-08-01 — Consistent action cursors

- Added one shared cursor rule for public pages, the customer workspace, and the owner portal. Links, enabled buttons, select controls, checkboxes/radios, and custom button controls now use the hand cursor; disabled controls show that they are unavailable.
- Validation passed: `npm run typecheck`, `npx eslint src/app/globals.css`, and `npm test` (18 files, 56 tests).

## 2026-08-01 — Owner account workspace refinement

- Owner account and contact rows now link to dedicated internal detail pages. The account inspector supports inline lifecycle, follow-up, next-step, and private-note updates through the existing server-authorized CRM API.
- Added account-scoped task and note actions, moving tab/content motion, and deliberate row-number selection behavior: the checkbox appears only when the number cell itself is hovered.
- Internal notes can notify selected active Costivra teammates. Each mention is stored in a server-only relation, creates a recipient-specific in-app notification, records its Resend side effect, and sends a branded internal email that links to the account. The live Supabase migration is applied with RLS and no browser access.
- Validation passed: `npm run typecheck`, targeted ESLint, and `npm test` (18 files, 56 tests). A local `npm run build` could not start because another Next build process already held the build lock; Vercel production build remains the deployment gate.

## 2026-08-01 — Public invoice evaluation fixtures

- Added four public sample PDFs under `tests/fixtures/invoices/` for local extraction and review-queue evaluation: two telecom/VoIP samples, one utility bill, and one generic software invoice.
- Each fixture is documented with its source URL. These are templates/sample documents only, not customer records or production evidence.
- Verified all four downloads begin with the PDF signature (`%PDF-`). Full extraction scoring remains a follow-up once the golden-data harness is connected.
- Expanded the set with official Microsoft Azure MSDN/PAYG sample invoices and official AWS VAT invoice/receipt samples. The fixture directory now covers recognizable cloud, telecom, utility, and software billing layouts without importing private customer bills.

## 2026-08-01 — Grounded owner assistant and overview table refinement

- Added the push-layout Ask Costivra rail with live Supabase-derived suggestions, bounded server-side AI answers, allowlisted record citations, loading/error/empty states, and a responsive mobile overlay.
- The assistant reads recent inbound-delivery webhook records for operational context but cannot fire webhooks, send messages, mutate CRM data, approve work, or calculate financial value.
- Updated the owner overview account table to match the Accounts workspace with visible row numbers, aligned columns, an internal bottom scrollbar, and a paginated footer. Removed the redundant overview follow-up button.
- Synchronized the assistant rail and workspace width/max-width transitions so opening and closing use the same 320ms motion curve without the initial hard reflow.
- Validation passed: `npm run typecheck`, targeted ESLint, two assistant suggestion tests, desktop browser QA, 390×844 mobile QA, and a live account-grounded assistant response with three record citations.
- `OPEN_ROUTER_API_KEY` is configured as a sensitive Vercel variable for Production and Preview. The current local `.env.local` value is a redacted placeholder, so live local extraction evaluation requires Lewis to add a valid local key; production remains separately configured.

## 2026-08-02 — Measurable invoice-extraction release gate

- Added a strict golden-invoice manifest, prediction parser, and scorer for classification, critical-field precision/recall, optional exact line items, grounded evidence citations, deterministic reconciliation, review routing, extraction errors, and minimum software/telecom/scanned coverage.
- The evaluator reuses the exact production text parser and model extraction functions. Native-document evidence must exist in source text; scanned cases require human-transcribed evidence snippets. Wrong non-empty values count as both false positives and false negatives, and malformed or incomplete truth manifests fail before a paid model call.
- Added `npm run eval:invoices` with live, validate-only, and saved-prediction replay modes. Private source sets and generated prediction/report artifacts are ignored by Git. The production default requires 20 software, 20 telecom/internet, and 10 scanned cases.
- Added a deterministic hostile-invoice smoke manifest and prediction. GitHub Actions now executes the smoke gate on every pull request and `main` push without using an AI secret or spending model credits.
- Validation passed: TypeScript; full ESLint; 98 unit tests with two intentional live-environment skips; the integration suite with two intentional credential-gated skips; production build; Playwright browser smoke (`status: passed`); manifest validation; and deterministic evaluator replay with every metric at 100%. This proves the gate works; it does not prove production extraction accuracy. A live local probe correctly failed before launch-quality scoring because `.env.local` contains a redacted OpenRouter placeholder. Lewis still needs to supply the de-identified set and a valid local OpenRouter key to run the real gate.

## 2026-08-02 — Live invoice-review database regression

- Added a reusable credential-gated Supabase integration test for the actual `internal_update_invoice_review` and `internal_approve_invoice` functions. It creates isolated temporary records, verifies unmatched-vendor and arithmetic rejection, persists two field corrections, recalculates reconciliation, approves twice idempotently, creates exactly one linked expense, attributes the reviewer, and records both approval audit attempts before cleanup.
- Ran the equivalent assertions against the live Supabase project inside one explicit transaction followed by `ROLLBACK`. The database returned `invoice_review_database_regression_passed`; no fixture rows were retained.
- Documented the exact local secrets, command, cleanup boundary, and remaining coverage in `docs/LIVE_DATABASE_REGRESSION_TESTS.md`. The broader end-to-end gate remains open for real upload/malware/extraction versioning and the complete customer opportunity-to-verified-savings browser sequence.

## 2026-08-02 — Fresh Resend production verification

- Revalidated the newly supplied local Resend key without exposing it. Resend accepted the key, reported `costivra.ai` verified in `us-east-1`, and delivered an idempotency-protected smoke message from `hello@costivra.ai` to Resend's delivery-test inbox.
- Sent a second live message with a PDF attachment to the Northstar dummy workspace intake address. Resend received it, the production webhook returned `202`, the minute worker returned `200`, and live Supabase recorded the queued and quarantined audit events. The attachment object exists in private storage and no document row was created because a malware scanner is not configured; that is the intended fail-closed boundary.
- The webhook remains signature-protected, the production email/cron routes had no runtime errors during the test, and all 33 email-focused unit tests passed. The local Resend key and webhook secret are present, but the local Supabase server credential and `CRON_SECRET` do not match production; production itself has valid working credentials.

## 2026-08-02 — Authenticated customer-workflow browser gate

- Added an explicitly gated Playwright regression for the real customer login and financial workflow. It creates a disposable confirmed Supabase Auth user and organization, signs in through `/login`, approves an opportunity, approves its generated action, accepts the evidence baseline, starts and completes the action, and verifies the resulting opportunity, action, savings, attribution, and audit records directly in Supabase.
- The fixture is randomized and self-cleaning. Remote execution is refused unless `E2E_ALLOW_PRODUCTION=1`; placeholders and build-only keys are rejected; cleanup checks the exact organization prefix before deletion. Normal CI and ordinary local Playwright runs remain non-mutating and skip this test.
- Added a manual GitHub Actions workflow so the production regression can be repeated without keeping a reusable demo password or adding an authentication bypass. It remains unavailable until the documented `E2E_SUPABASE_SECRET_KEY` GitHub Actions secret is configured.

## 2026-08-02 — Least-privilege browser database grants

- Audited every public table, RLS policy, and browser-role grant in the dedicated Costivra Supabase project. No unrelated Luxor or Nodal tables are present. The only external security-advisor warning is Supabase Auth leaked-password protection, which remains a dashboard/plan action for Lewis.
- Replaced bootstrap-era ownership-style table grants with explicit browser privileges. `anon` receives no public-table access. `authenticated` receives only tenant-policy-protected reads, the recipient-scoped internal notification read needed by Realtime, and updates to five non-authoritative self-profile columns. All customer business mutations continue through the Costivra server APIs; `service_role` is unchanged.
- Added a repeatable SQL assertion for anonymous grants, authenticated writes, required reads, profile column boundaries, and retained server access. The migration passed a transaction-scoped production dry run, was applied as Supabase migration `20260802234849`, and passed the same assertion against the live schema.

## 2026-08-02 — Fail-safe retention operations

- Added a protected daily retention worker with a server-only run ledger, bounded policies, batch limits, retention holds, sanitized failure codes, and a report-only default. No original source file is eligible until an explicit approved window exists, and no file is deleted unless the production enforcement switch is deliberately enabled. The live schema migration is `20260803001903`.
- Enforcement removes private files through the Supabase Storage API before marking database metadata. Extracted records and provenance remain, and both customer and internal file workspaces clearly show when an original reached its retention limit instead of presenting a broken download.
- Hardened inbound quarantine cleanup so a failed Storage deletion keeps its recoverable private path. The attachment is marked rejected or processed first, the path is cleared only after Storage confirms deletion, and regression tests cover both success and failure ordering.
- Added operator readiness reporting, public-route rejection coverage, policy/runner regressions, and an activation runbook that calls out the separate off-platform Storage backup required by Supabase.
- Added explicit deny-all browser policies for the server-only retention and enrichment ledgers as migration `20260803002048`. Supabase's security advisor now reports no table/RLS findings; leaked-password protection is the only remaining dashboard warning.

## 2026-08-02 — Workspace administration and safe failure handling

- Added real organization-location management under customer Settings. Owners and administrators can create, edit, archive, and restore locations; all mutations are tenant-scoped and audited, while archival preserves historical bill and contract context.
- Completed the invited-member lifecycle. Owners and administrators can change non-owner roles and remove workspace membership without deleting the person's profile or audit history. Self-removal and owner removal are blocked, and invitations now create an audit event.
- Added an owner/admin structured workspace export with private no-store headers. It includes the customer-visible organization records, evidence references, decisions, and audit history without exposing private Storage paths or bundling source-file bytes.
- Replaced raw shared portal API failures with safe customer messages. Intentional field-validation errors remain specific, while unexpected database and provider details are logged server-side and never returned to the browser.
- Added branded application, root, and not-found recovery screens with clear retry and navigation choices. The full local gate passed with 180 unit tests, integration tests, lint, TypeScript, the 34-page production build, and public desktop/mobile browser coverage.

## Record workspace and internal CRM polish — August 2, 2026

- Rebuilt internal account and contact record pages into one shared, task-oriented workspace: identity and highlights first, then Overview, People/Shared files, Activity, and Work tabs. The account and contact views now make the next action, relationship details, internal context, and evidence easier to scan without turning the page into a form.
- Activated the stronger dedicated vendor record page in the customer App and added the same protected document-library experience to vendor and generic record pages. The library has virtual collections, search, list/grid view, status states, a selected-file inspector, and secure download actions. Collections are metadata views only; original storage paths and provenance remain immutable.
- Made the customer App rail use the same compact, expand-on-hover/focus geometry as Manage. The desktop rails now share dark surface, widths, active-state treatment, tooltips, and keyboard expansion behavior while keeping their customer/internal destinations distinct.
- Added the internal-only, account-only Apollo enrichment foundation: normalized public account lookup website, separate provider snapshots, an operator-triggered refresh route, a 30-day cache, a time-bounded atomic claim, provider URL validation, safe audit events, and a private internal document-download route. Provider redirects are blocked; a website change invalidates the saved snapshot; incomplete/quarantined documents cannot be signed; and signed links force a safe download name. Apollo-derived content is intentionally absent from `/app` pending the required Apollo data-sharing permission.
- Individual contact enrichment is deliberately not enabled. Sending a contact’s work email to an external provider needs a purpose-specific data-sharing consent and authorization feature; marketing consent is not treated as that permission.
- Visual QA used temporary local preview fixtures at desktop and 390×844 mobile for Manage account/contact and App vendor records. The selected file library, mobile action stack, record tabs, and rails rendered without browser console errors. Those temporary preview routes were removed before handoff.
- Applied `20260802194859_add_internal_crm_enrichment_records.sql` to the linked Costivra Supabase project and registered the exact migration version. Direct verification proves RLS is enabled, there are no browser policies or browser grants, only `service_role` has CRUD/claim access, the security-definer function has an empty search path, the invalidation trigger exists, and the atomic claim returns `true` once then `false` for a duplicate request inside a rolled-back transaction.
- Validation passed: `npm run typecheck`; `npm run lint` (0 errors, 0 warnings); `npm test` (37 files passed, 2 skipped; 137 tests passed, 4 skipped); `npm run test:integration` (1 passed, 2 credential-gated suites skipped); `npm run test:e2e` (6 passed, 2 intentionally skipped); and `npm run build`. The Supabase advisor reports one account-level warning: leaked-password protection is disabled. Focused adapter/download/cache coverage also passes. No live Apollo request was made and no provider credits were spent.
- Added a scoped internal account vendor workspace backed by the existing Supabase `organization_vendors`, `vendors`, `expenses`, `contracts`, and `documents` records. Account overview now shows recorded weekly/monthly/yearly cost history plus linked vendor logos; the Vendors tab supports selecting any linked vendor to inspect its real recorded spend, contract records, cadence, dates, and associated source-document count. The view excludes mixed currencies from a combined chart and makes no projected-savings claim.
- Focused validation passed: `npx next typegen`, `npm run typecheck`, and `npx vitest run src/lib/manage/vendor-costs.test.ts src/lib/manage/assistant.test.ts` (4 tests).
- Follow-up polish moved account and contact website/LinkedIn destinations into compact, keyboard-accessible icons beside the record name, removed duplicate text links and the manual Apollo refresh/list controls, and renamed the Apollo-facing panel to `Short Description`. The current production build passed after replacing the unavailable Lucide LinkedIn export with the existing Link2 icon.
- Browser QA passed against a fresh production build at desktop and 390×844 mobile sizes. Supabase verification confirmed the selected account’s website and `updated_at` fields are present in the live project. Cross-session live updates should continue through the existing server-authorized soft revalidation path; direct browser subscriptions to privileged CRM tables remain intentionally avoided.
- Production browser QA on commit `dde133e` proved the Apex account loads four account-scoped vendors and their real Supabase expense totals, switches vendor detail and weekly/monthly/yearly history, serves safe logo fallbacks without console errors, and renders at 390×844 with no horizontal overflow. Raw category slugs are now converted to readable labels in the operator UI.
- The full non-destructive release gate passed: `npm run typecheck`; `npm run lint`; `npm test` (63 files passed, 3 environment-gated files skipped; 217 tests passed, 5 skipped); `npm run test:integration` (1 passed, 3 live-credential suites skipped); `npm run test:e2e` (10 passed, 4 intentionally project/environment-gated); and `npm run build`. The separate live Supabase browser-grant assertion passed and the security advisor reports only leaked-password protection disabled.
- `npm run test:integration:live` now loads `.env.local` deliberately and rejects Vercel redaction placeholders before attempting privileged test setup. The local `SUPABASE_SECRET_KEY` is still a redacted/invalid placeholder, so Lewis must replace that one local value before the three self-cleaning live database suites can be rerun from this machine. Production Vercel credentials remain valid and the deployed runtime reports no errors.

### Remaining release work

- Add `APOLLO_API_KEY` as a server-only Vercel Production/Preview variable before operators use the manual company-profile refresh. The UI stays explicit about the missing provider configuration until then.
- Enable Supabase Auth leaked-password protection when the project plan supports it; this is the only current database-advisor warning.
- Apollo's terms must be cleared in writing before any provider-derived summary appears in the customer App. Until then, only organization-controlled facts may appear there.
- A separate consent, authorization, and audit design is required before any individual contact data is sent to Apollo or another enrichment provider.
- The broad Manage data loader still fetches more email data than an individual record page needs. A follow-up should add scoped server-side record view models and pagination before very large CRM datasets are expected.

## 2026-08-02 — Owner production-readiness controls

- Added an owner-only **Production readiness** check to Manage Settings. It verifies that the required Supabase operational tables are reachable, reports dead-letter intake work, validates the live Resend domain and signed production webhook, confirms the protected worker and server-only AI configuration, reports malware-scanner readiness, and checks optional Apollo authentication.
- Provider checks use fixed HTTPS endpoints, a six-second timeout, no redirects, and no response caching. API keys remain server-only and are never included in the response. Operators cannot call the route; failed authorization uses the existing protected Manage API boundary.
- Re-ran the live Resend flow with the supplied key. The production contact endpoint created a Supabase lead and delivered both the customer receipt and owner notification. A separate Azure PDF reached the Northstar dummy intake address, produced a signed `202` webhook and successful minute-worker run, and was stored privately with `scan_status=unavailable`, `processing_status=quarantined`, and no document row. That remains the correct result until a malware scanner is configured.
- Validation passed: TypeScript; full ESLint; 143 unit tests with four intentional environment-gated skips; integration suite with four credential-gated skips; production build; and Playwright smoke with no failed tests. The two new readiness test files cover owner authorization, private/no-store responses, missing configuration, rejected provider credentials, disabled webhook, dead-letter work, database failure, and serialized secret redaction.

## 2026-08-03 — Resend and scheduled intake verification

- Revalidated the configured Resend API key through the provider and the application readiness probe. The verified `costivra.ai` domain and signed webhook remain aligned; the key was never returned, logged, or added to source control.
- Targeted Resend/intake tests passed (10 tests), cron authorization/readiness tests passed (25 tests), and the complete automated suite passed (246 tests passed; 3 intentionally skipped). TypeScript and the optimized production build both passed.
- Live Vercel runtime logs for deployment `dpl_9xxUEtrMzZfUXxZWEJwkBkdZFb6t` confirm `/api/cron/inbound-email` is receiving successful `200` scheduled invocations every minute. This is the authoritative production-worker proof.
- The prior `ops:smoke` warning was a false operational signal: it sent the local development `CRON_SECRET` to production, where the deployed Vercel secret is intentionally independent. The smoke script now verifies unauthenticated rejection by default and only performs a protected manual invocation when `COSTIVRA_VERIFY_CRON_TOKEN` is explicitly supplied. The launch checklist explains the distinction.

## 2026-08-03 — Apollo account discovery and company profile fields

- Added a server-only Apollo company search route for internal operators. It accepts a company name
  or public domain, waits until three characters are entered, returns bounded candidates, and marks
  exact domain/name matches without automatically creating a record.
- Account creation can now select a candidate and review its name, industry, and website before
  saving. The restricted Apollo snapshot stores the provider ID, logo, LinkedIn URL, location,
  employee count, founded year, and technology names. Apollo logos use an allowlisted provider
  host with Logo.dev fallback; operator-entered account data remains canonical.
- Applied migration `20260803173631_add_apollo_account_fields` to the Costivra Supabase project.
  Live verification confirms `name`, `logo_url`, and `technology_names` exist on the restricted
  enrichment table. Security and performance advisors show no new finding from this migration;
  the existing Auth leaked-password-protection warning remains.
- Validation passed: focused Apollo and account-search tests (11 passed), TypeScript, ESLint, and
  `git diff --check`. After the server restart, a live probe using the configured server-side key
  returned HTTP 200 from `mixed_companies/search` with one company result; the key itself was never
  exposed or logged. The `crm-platform/network` reference directory is not present in this
  repository, so implementation follows the current Costivra Apollo adapter and the official
  Apollo endpoint contract.
- The lookup now auto-selects a high-confidence exact website match, keeps exact name matches
  operator-selectable to avoid same-name collisions, and accepts Apollo's `primary_domain` response
  field when a full website URL is absent.

## 2026-08-03 — Contact workspace interaction refinement

- Fixed the Manage contact inspector status-pill layout so its small status dot remains a dot instead
  of inheriting the inspector's generic block treatment. Account names now open their account record
  from the contact inspector and the contact-detail highlight, where the approved company logo is
  displayed alongside the account name.
- Contact email addresses now open the existing contextual composer from the contacts table,
  inspector, contact detail, and account people view. The composer request carries the selected
  contact and account identifiers, so draft context resolves the intended CRM relationship rather
  than relying only on the recipient address.
- Replaced the full-text contact-page compose action with a labeled icon control and added a
  phone icon/link only when a phone number is recorded. Inspector task/note forms now expand and
  collapse with a bounded transition; the note action uses the document icon.
- Validation: ESLint, `git diff --check`, and live browser verification of the contacts page,
  contextual email composer, account link, status pills, and task expansion passed. TypeScript is
  currently blocked by pre-existing Apollo nullability errors in `src/lib/integrations/apollo.ts`
  (lines 390 and 393), outside this contact-workspace change.

## 2026-08-03 — Apollo company profile presentation

- Added Apollo corporate phone capture to the restricted `crm_account_enrichments` snapshot and applied migration `20260803183758_add_apollo_company_phone` to the linked Supabase project.
- Account detail headers now show only existing location, website, phone, and LinkedIn values. The overview rail repeats the website and places the company phone directly beneath it; Apollo context shows status, founded year, team size, update time, and a collapsed technology list with an explicit “Show all” control.
- Add-account and add-contact flows now use right-side drawers with focus handling, backdrop dismissal, Escape support, and enter/exit animations.
- Created `Apollo QA - HubSpot Profile`, enriched it through the normal refresh flow, and verified the live page with Apollo location, website, phone, LinkedIn, founded year, team size, description, and technology data.
- Validation passed: focused Apollo/enrichment tests (14 passed), `npm run typecheck`, `npm run lint` (0 errors; two existing warnings remain), and `git diff --check`.

## 2026-08-03 — Add-account ingestion completeness

- Fixed Apollo mixed-company parsing so a non-empty `accounts` result is not discarded when the provider also returns an empty `organizations` array. Exact public-domain searches now use Apollo's direct organization enrichment endpoint first, while name-search candidates are hydrated through that endpoint before selection.
- Account creation now re-enriches the normalized website on the server before persistence. The browser preview is no longer the authority for provider data, and the restricted snapshot now carries the description, phone, location, employee count, founded year, LinkedIn URL, logo, and technologies even when the original search candidate was partial.
- Added a compact review block in the account drawer with conditional company details and explicit searching/loaded feedback. Operator edits to canonical name or industry no longer silently discard the selected provider snapshot; changing to a different website still clears it.
- Live browser verification found `ccmcdermott.org`, populated its full preview, created `Church of Christ On McDermott Road`, and verified the saved account detail page with its website, phone, LinkedIn, Frisco location, 17-person team, description, logo, and 30 technologies. A separate `HubSpot` name search returned eight candidates and hydrated the exact company to a complete profile without creating a duplicate test record.
- Validation passed: 14 focused Apollo/search/create tests; the complete unit suite (254 passed, 5 intentionally skipped); TypeScript; ESLint with zero errors and one unrelated existing Resend-test warning; integration tests (1 passed, 5 credential-gated skips); Playwright (10 passed, 4 intentionally skipped); and the 37-page production build.
- Company discovery is now explicitly submitted: typing does not call Apollo, and only pressing Enter starts a lookup. The drawer states this credit boundary before submission. Apollo's current documentation confirms organization search costs one credit per results page and organization enrichment costs one credit per organization; the authenticated workspace reported 3,346 of 5,000 lead credits remaining for the July 11–August 11 cycle when checked.

## 2026-08-03 — Enrichment settings and Apollo usage

- Added General and Enrichment tabs to Manage Settings. The owner-only Enrichment tab introduces a provider layout that can accept additional enrichment services later while keeping Apollo as the only provider shown today.
- Added an owner-only, private/no-store Apollo settings route. It reads the documented zero-credit current-profile endpoint with the server-side key and returns only connection state, check time, and normalized lead-credit totals. API keys and Apollo identity fields never reach the browser.
- The Apollo panel shows the live remaining balance, used/total progress, refresh state, provider-access errors, and the current Costivra credit model: organization search is one credit per results page and organization enrichment is one credit per company. The live check reported 3,346 remaining and 1,654 used of 5,000.
- Validation passed: focused adapter/route coverage (13 tests); full unit suite (258 passed, 5 intentionally skipped); TypeScript; ESLint with zero errors and one unrelated existing Resend-test warning; integration suite (1 passed, 5 credential-gated skips); Playwright (10 passed, 4 intentionally skipped); and the 37-page production build. Browser QA also passed at desktop and 390×844 mobile with no horizontal overflow or console errors. The mobile test used a temporary viewport override and restored the browser afterward.

## 2026-08-03 — Vercel PDF.js build repair

- Vercel failures on deployments `dpl_FESK95Byh1MpiDcCsS2sTfUq3RXC` and the three preceding
  deployments were traced to the accidental `pnpm-lock.yaml`/`pnpm-workspace.yaml` switch and two
  direct imports of undeclared `pdfjs-dist` modules.
- Removed the accidental pnpm metadata, added `pdfjs-dist@5.4.296` as a direct locked dependency,
  and preserved the existing npm deployment path. This addresses the dependency-resolution cause,
  not just the two visible import errors.
- `git diff --check` passes. A fresh local npm install was attempted, but the OneDrive-backed
  `node_modules` directory repeatedly failed with Windows `ENOTEMPTY`/tar extraction races; the
  local dependency tree is therefore not a trustworthy build environment at this moment. The
  production build had passed before the package-manager switch, and the next clean Vercel/npm
  build is the authoritative confirmation.
## 2026-08-03 — Account/contact relationship rail and locations

- Reworked account and contact overview pages around a right-side independently scrollable context rail.
- Removed People from the account tab list; the rail now sorts primary CRM contacts first and exposes explicit email and call actions.
- Added Supabase-backed manage locations with map links/previews, multi-site location lists, and a parent/child account relationship editor.
- Added migration `20260803220625_manage_account_relationships.sql` for `organizations.parent_organization_id`.
- Browser QA passed locally on the account, contact, and client Settings pages at desktop width. `npm run typecheck` passed. The migration was applied to project `skfocjrykyvsaviyhdea` and verified with an information-schema query. Supabase advisors returned one existing Auth warning and existing unused-index notices; the new parent index is listed as unused until hierarchy data is created.
# 2026-08-04 — Full HTML email reading in Manage

- The Manage mail reader now renders stored HTML email in an isolated iframe instead of reducing every message to its plain-text fallback. Email layout, tables, inline styling, and links remain visible without being able to alter the CRM page.
- Remote images are blocked by default to prevent invisible tracking requests. Operators can explicitly load them for an individual message, and links open in a separate tab with no referrer.
- Added focused viewer-document tests covering content isolation, external-image policy, text fallback, and removal of email-provided document-control tags.
- Validation passed: `npm run typecheck`, `npm run lint`, focused Manage mail/viewer tests (12 passing), and `git diff --check`. The local app started on port 3000, but in-app browser attachment timed out before visual QA could run; a browser read-through remains the only uncompleted check.

## 2026-08-05 — ID page mutation contracts (Chunk 1, in progress)

- Added migration `20260806020128_id_page_atomic_mutations.sql` and applied it to Supabase project `skfocjrykyvsaviyhdea`. It adds customer-safe `audit_events.safe_metadata` plus server-only, `security definer` RPCs for vendor, account, and contact updates. All three use an empty search path and grant execution only to `service_role`.
- Vendor updates now validate live status/cadence values, require `expectedUpdatedAt`, return a safe `409 record_conflict`, append a valid customer audit row, and pause vendor monitoring atomically when the relationship is terminated.
- Account and contact update routes now require the same optimistic-concurrency version token and use their atomic database contracts instead of describing independent calls as transactions.
- Validation passed: `npm run typecheck`; changed-file ESLint; focused account/contact/vendor API tests (4 passing); full unit suite (425 passing, 6 skipped); integration suite (8 passing, 6 skipped); and production build. The live function catalog confirms each new RPC is `security definer`, has `search_path = ''`, and is executable only by `service_role` and database owner. Supabase security advisor reports no new P0 warning.
- Remaining Chunk 1 work: complete the archive/deactivate/restore RPCs and test coverage for forced failures, move-primary behavior, and browser-role denial before treating the data-contract milestone as complete.

## 2026-08-06 — Manage account ID page (Chunk 5)

- Completed the account detail workflow at `/manage/accounts/[accountId]`: URL-persisted overview, vendors, files, activity, work, and audit-history tabs; archive/restore and guarded deletion flows; related records; and an operational header with lifecycle, owner, last contact, follow-up, and next-step context.
- Corrected the edit sheet so primary-contact selection uses `crm_contacts.id`, not the visible contact name. The existing server-side atomic mutation validates that the contact belongs to the account, clears any prior active primary, and records the update in audit history.
- Filled the missing editable operating-profile and ownership fields: employee/revenue ranges, timezone, currency, assigned internal owner, primary contact, next follow-up, next step, private notes, and company identity fields. All save with optimistic concurrency and preserve the user’s draft on a conflict.
- Validation passed: `npm run typecheck`; `npm run lint` (zero errors; two existing unused-variable warnings in `src/components/app-shell.tsx`); `npm test` (441 passed, 6 skipped); `npm run test:integration` (8 passed, 6 skipped); `npm run build`; and `npm run test:e2e` (18 passed, 6 credential-gated skips). The focused account route coverage has 2 passing tests, including the ID-based primary-contact contract.

## 2026-08-06 — Manage contact ID page (Chunk 6)

- Completed the contact detail workflow at `/manage/contacts/[contactId]`: URL-persisted record sections, a contact-specific email/task communication summary, distinct direct-contact and account-context activity, governed marketing-status presentation, guarded deactivation/removal, and audit history.
- Contact edits now include account movement, primary-contact state, and allowed contact statuses. Movement explicitly preserves profile links, workspace memberships, and access; it changes only the CRM relationship. Make-primary now sends the required optimistic-concurrency version token to the existing atomic update contract.
- Removed `.next/dev` generated types from `tsconfig.json` inputs. Those disposable browser-test artifacts had been able to corrupt an otherwise valid source typecheck.
- Validation passed: `npm run typecheck`; focused contact-route test (2 passing); `npm run lint` (zero errors; two existing warnings in `src/components/app-shell.tsx`); and `npm run build`.

## 2026-08-06 — ID-page test and release inventory (Chunk 7, internal testing)

- Added `docs/testing/id-pages.md`, mapping vendor, account, and contact record-page acceptance areas to unit, route, integration, live, Playwright, and manual browser evidence. It also documents the required disposable-record screenshot policy and the conditions for the final release verdict.
- Quality checks passed in the current workspace: `npm test` (442 passed, 6 skipped), `npm run test:integration` (8 passed, 6 skipped), and `npm run eval:invoices -- --manifest tests/fixtures/invoices/golden-manifest.smoke.json --predictions tests/fixtures/invoices/golden-predictions.smoke.json` (all smoke metrics 100%).
- Current verdict: `INTERNAL_TESTING_ONLY`. The repository is a mixed, unmerged worktree; authenticated record-page screenshot capture, live Supabase advisor checks, production smoke journeys, exact-main CI, and deployment verification must precede `ID_PAGES_COMPLETE`.
# 2026-08-07 — Application shell redesign, Chunk 0 complete

- Established and documented the before-state for the requested `/app` and
  `/manage` shell redesign in `docs/qa/app-manage-shell-chunk-0-baseline.md`.
- Confirmed the customer application currently renders a 72px hover-expanded
  rail over document-scrolling content, while Manage has a fixed sidebar plus
  a separate 72px top bar and page wrapper. Neither shell has the requested
  single rounded work canvas.
- Mapped the effective late customer CSS rules, Manage height calculations,
  document/local scroll owners, and overlay stacking dependencies.
- Recorded the desktop-shell architecture decision in `DECISIONS.md`. No
  production UI, tenant data, authorization behavior, or scan-page work was
  changed in this chunk.
- Next: Chunk 1 — make the customer sidebar persistent at supported desktop
  widths and add the one named work-canvas wrapper around the existing header
  and route content.

# 2026-08-07 — Application shell texture correction

- Moved the customer shell texture to the shared `.app-body` background so it
  remains visible continuously behind the sidebar and working area.
- Removed the opaque sidebar, main-area, and work-canvas fills and canvas shadow;
  individual controls and content panels remain surfaced with their own white
  backgrounds.
- Validation passed: `npm run typecheck` and `git diff --check`.

# 2026-08-07 — Collapsed rail hover labels

- Added a wider invisible hover stage around the collapsed navigation so icon
  glow is not clipped at the 72px rail edge.
- Added animated white label containers using each navigation item’s real label;
  labels slide out to the right on hover/focus and retract on exit.
- Kept the navigation scroll viewport separate from the fixed profile footer.
- Validation passed: `npm run typecheck` and `git diff --check`.
- Focused ESLint was attempted but exceeded the local command timeout; no lint
  result is being claimed here. Browser verification also timed out while the
  local route was loading.

# 2026-08-07 — Customer sidebar rail behavior

- Moved the customer sidebar navigation into its own scroll region while
  keeping the utility and profile controls fixed at the bottom.
- Lowered the Costivra mark to align with the work-header controls and softened
  collapsed-rail separators to match the light textured surface.
- Validation passed: `npm run typecheck` and `git diff --check`.

# 2026-08-07 — White customer work surface

- Restored a solid white background across the customer work canvas, fixed
  header, and scrollable content area.
- Kept the customer sidebar transparent so the shared texture remains visible
  there.
- Validation passed: `npm run typecheck` and `git diff --check`.
- The browser connection timed out during the final visual reload, so no new
  screenshot was captured for this CSS-only adjustment.

# 2026-08-07 — Removed customer sidebar divider

- Removed the hard vertical border between the customer sidebar and the work
  area so the shared texture reads continuously across the shell.
- Validation passed: `npm run typecheck` and `git diff --check`.
- A fresh browser reload timed out during this CSS-only follow-up, so the
  source rule was verified but a new visual screenshot was not captured here.

# 2026-08-07 — Application shared page header

- Moved customer route identity into the shared top bar: manual sidebar
  expand/collapse control, divider, route title, short context, and real vendor
  logo on vendor detail routes.
- Removed the repeated large page title block from customer page bodies while
  preserving page-specific actions, breadcrumbs, tabs, and data workflows.
- Browser-checked Command Center, Bills & Spend, vendor detail, collapsed and
  expanded sidebar states, and the mobile Command Center header. Mobile has no
  horizontal overflow.
- Validation passed: `npm run typecheck`, focused ESLint for
  `app-shell.tsx` and `portal-pages.tsx`, and `git diff --check`.
- `/manage` was intentionally not edited in this correction.

# 2026-08-07 — Application shell internal scrolling

- Made the customer application a fixed-height viewport frame. The rounded
  work canvas and top action bar stay in place while route content scrolls
  inside `.app-content`.
- Removed document-level scrolling from the customer shell and applied the
  same scroll ownership to overview, table, and detail routes.
- Browser-checked `/app`, `/app/vendors`, `/app/bills`, and a real vendor detail
  route. The detail route reports an internal content scroll height of 1,356px
  inside a 622px visible content area, while the document remains at viewport
  height.
- Validation passed: `npm run typecheck` and `git diff --check`.

# 2026-08-07 — Centered collapsed sidebar controls

- Re-centered the square navigation controls inside the visible collapsed rail.
- Preserved the wider hover stage so section labels can still animate out to the
  right without shifting the settings/profile area.
- Validation passed: `npm run typecheck` and `git diff --check`.

# 2026-08-07 — Collapsed sidebar divider hierarchy

- Shortened and centered the dividers between the collapsed navigation groups
  so they match the restrained separator above Settings.
- Kept the wider invisible hover stage for animated navigation labels.
- Aligned the icon column to the full 76px rail so the navigation controls and
  their dividers share the exact same center as the Settings separator.
- Lowered the Costivra mark four pixels to align it with the shared header's
  leading control.
- Added Space Grotesk as a focused wordmark experiment for the customer sidebar;
  the application UI typography remains unchanged.
- Increased the sidebar wordmark size to 1.3rem for stronger brand presence.
- Increased the sidebar wordmark again to 1.9rem at the user's request.
- Adjusted the sidebar wordmark to 1.5rem for comparison.
- Restored reliable sidebar scrolling by making `.app-nav-scroll` the sole
  navigation scroll owner and removing competing inner-nav flex sizing.
- Coordinated the customer rail open/close animation across sidebar width,
  main content offset, workspace switcher, search bar, brand wordmark, and
  profile copy, with a reduced-motion fallback.
- Reserved the expanded workspace/search space explicitly and isolated the
  navigation scroll region so it cannot cover or clip the search bar.
- Added deterministic wheel handling to the navigation scroll container after
  browser inspection showed overflow metrics were present but wheel movement
  was not changing the container's scroll position.
- Faded the wide hover-stage scrollbar out when the rail collapses.
- Captured wheel input at the navigation container so the sidebar scrolls even
  when the pointer is over a navigation link.
- Aligned table-page filter actions with the shared back-control row, including
  the Vendors filter.
# 2026-08-07 — Vendor directory search

- Added a local Vendors search field beside the existing filter control.
- Search matches vendor name, category, website, relationship/monitoring status, and visible bill or contract dates.
- Validation pending after this focused UI change.

# 2026-08-07 — Settings internal scrolling

- Applied the shared deterministic wheel handler to route content so Settings can scroll inside the fixed app frame.
- Nested tables and popover result lists keep ownership of their own scrolling.
- Validation pending after this focused UI change.

# 2026-08-07 — Floating back control alignment

- Repositioned the compact back button below the fixed app header and aligned it with the scrollable content inset.
- Kept the mobile position tied to the mobile header height and content padding.

# 2026-08-07 — Vendor detail header controls

- Moved the vendor-detail floating back control closer to the fixed header.
- Restyled the workspace create button as a circular white header control to match the adjacent actions.

# 2026-08-07 — Header control spacing refinement

- Matched the create button to the adjacent 40px controls.
- Reduced its hover emphasis and tightened only the gap between the create control and the right-side actions.

# 2026-08-07 — Header control dimensions

- Normalized the create and notification controls to exact 40×40px dimensions, including their borders.

# 2026-08-07 — Header control consistency

- Normalized the assistant control to 40×40px as well.
- Set the plus icon to the same muted slate color as the notification bell.
- Restored equal 10px spacing between all three header controls and aligned their hover treatment.

# 2026-08-07 — Plus-to-assistant spacing

- Tightened only the gap between the plus control and the Ask Costivra group.
- Preserved the existing Ask Costivra-to-notifications spacing.

# 2026-08-07 — Header grouping correction

- Removed distributed `space-between` spacing from the fixed app header so the plus, assistant, and notification controls stay grouped at their intended gap.

# 2026-08-08 — Manage compact rail interaction polish

- Removed automatic mouse-hover expansion from the Manage sidebar so the rail opens only through the explicit header control or keyboard/search focus.
- Added a smooth search-field contraction into the compact search icon, with the full field returning during expansion.
- Added unclipped descriptive label chips for compact navigation, Settings, profile, and search controls while keeping the nav’s internal scroll behavior intact.
- Validation: `npm run typecheck` passed; `git diff --check` passed; browser checks confirmed hover does not expand the rail, Accounts shows a visible label chip, and search hover leaves the rail collapsed.

# 2026-08-08 — Manage compact rail spacing correction

- Removed the visible search row from the collapsed rail so it no longer pushes the navigation downward.
- Moved the compact hover label to a 2px gap from the rail edge and tightened the divider-to-Outreach spacing.
- Browser verification confirmed the compact search area is 0px high, the Outreach label chip begins 2px beyond the 76px rail, and the icon remains centered.

# 2026-08-08 — Manage and customer rail visual parity

- Applied the shared Space Grotesk brand font to the Manage Costivra wordmark.
- Matched the customer `/app` compact tile glow, 48px square tile geometry, white/blue hover chip, border radius, shadow, and hover easing.
- Tightened the Manage hover chip to a 2px gap from the compact rail edge.
- Browser verification confirmed the Manage wordmark resolves to Space Grotesk and the Outreach hover state uses the shared glow and chip treatment.

# 2026-08-08 — Manage badge anchoring and exit motion

- Anchored compact hover badges to the actual option tile’s right edge plus 2px, matching the customer rail’s visual relationship to its buttons.
- Added a 190ms badge exit animation before removing the badge from the DOM.
- Removed the divider below the Manage brand block.
- Browser verification confirmed the badge starts at 64px for a 62px-wide tile and transitions through `manage-sidebar-tooltip-out` before removal.

# 2026-08-08 — Sidebar state persistence across navigation

- Persisted the collapsed/expanded sidebar preference separately for `/app` and `/manage` during the current browser session.
- Prevented a mouse click on a collapsed Manage navigation option from expanding the rail through the link's focus event; keyboard focus can still expand it intentionally.
- Browser verification confirmed `/app` stays collapsed after clicking Vendors and Manage stays collapsed while selecting a navigation option.
- Validation: `npm run typecheck` passed and `git diff --check` passed. Full lint remains to be run after this focused change.

# 2026-08-08 — Marketing clarity pass: home and review handoff

- Rewrote the public home-page opening around a literal business outcome: reviewing selected software, internet, and energy bills for price increases, duplicate charges, unused services, and renewal deadlines.
- Replaced the dense above-the-fold command-center demo with a calm, clearly labelled illustrative source-to-question example. It explicitly distinguishes a potential question from a verified saving.
- Replaced public "Scan 3 bills free" calls to action with the more literal "Start with 3 bills" and added a plain next-step explanation.
- Rewrote the /scan opening so visitors know that an account is required before upload, which categories are currently eligible, and that document status / the next review step appear in the private workspace.
- Marked Insurance & Benefits and Facilities as planned in the public footer while retaining their routes for future development.
- Moved source-linked examples ahead of the public value-methodology section and reduced the home-page sales story from five system stages to three plain review steps.
- Reworked the pricing page around buyer fit: a contained first step, an explicit definition of active expense account, plan-level fit cues, and an honest "not a fit yet" explanation for businesses with only a handful of simple bills.
- Kept the published price points unchanged and moved the commercial-fee explanation below the core pricing story.
- Validation: npm run typecheck passed; targeted ESLint for the three edited TSX files passed; git diff --check passed; browser QA passed at 1440×900 and 390×844 with no console warnings/errors. The desktop and mobile primary CTA both reached /scan and rendered its account-required state. Mobile QA caught and corrected an initial workflow-column override before completion.
- Known remaining work: define the exact free-offer result before using a "free review" promise; label planned categories consistently beyond the footer; simplify the lower home-page narrative, pricing, product, and solutions pages in the remaining marketing-plan chunks.

# 2026-08-08 — Homepage hero precision pass

- Kept the existing hero composition while tightening the audience copy and free three-bill review CTA.
- Rebuilt the illustrative review card around a deterministic comparison: $1,310 previous bill, $1,510 current bill, $200 monthly change, and $2,400 potential annual impact.
- Added a compact source-evidence reference and clarified the financial state as “Potential impact · not verified.”
- Validation: `npm run typecheck` and `npm run test` passed (524 tests passed, 6 skipped); desktop and mobile browser checks passed, including the working “Review the source” link. Full lint and production build exceeded the 120-second command window and remain to be rerun.

# 2026-08-08 — Standalone Costivra wordmarks

- Applied the selected Space Grotesk wordmark treatment to the shared Brand component used by the public header, public footer, and customer shell.
- Applied the same treatment to the account-access lockups and the internal email-signature brand lockup.
- Left ordinary paragraph mentions, assistant speaker labels, and descriptive product copy on their existing reading font.
- Validation: `npm run typecheck` passed; `git diff --check` passed; browser inspection confirmed the public header wordmark resolves to Space Grotesk while the hero paragraph remains on the body font.

# 2026-08-08 — Packet 03 scanner provenance and budget hardening

- Enforced the Cloudmersive contract server-side, including strict `CleanResult` handling, bounded provider responses, fail-closed configuration/quota/rate-limit states, and secret-safe readiness output.
- Added durable scan provenance for manual uploads, forwarded attachments, quarantine rescans, Resend intake, and Manage attachment actions, including pre-document attempts.
- Applied and registered Supabase migration `20260808231254_packet_03_scanner_budget_hardening` on the Costivra project. Production verification confirms nullable pre-document provenance, RLS enabled, one deny-all browser policy, and execution granted only to `service_role` for the reservation function.
- Corrected public status so configured-but-unproven malware scanning reports limited document processing instead of full operational readiness.
- Validation: focused scanner/readiness/status tests passed; full unit, integration, typecheck, lint, build, clean probe, EICAR probe, readiness, and smoke checks passed. Full browser E2E still contains unrelated marketing-copy/layout failures from the existing dirty worktree; the four authenticated intake proof paths remain the final launch evidence to capture.
- Live proof completed afterward in the dedicated authenticated E2E organization: clean and EICAR manual uploads plus clean and EICAR forwarded attachments all produced durable `document_security_scan_attempts`, correct document/attachment states, audit events, and customer/Manage feedback. Details are recorded in `docs/PACKET_03_LIVE_PROOF.md`.
