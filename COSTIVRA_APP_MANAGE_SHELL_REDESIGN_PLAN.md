# Costivra `/app` and `/manage` Shell Redesign

## Start here

This plan is written against the actual Costivra repository as it exists on August 7, 2026.

Primary visual reference:

```text
C:\Users\Lap3p\Downloads\kontai-dashboard-hero-redacted.png
```

Secondary Costivra brand reference:

```text
docs/design-concepts/costivra-command-center-concept.png
```

The Kontai screenshot is the structural target. The existing Costivra concept is useful only for Costivra's brand, financial hierarchy, and evidence-first content. Do not restore its dark sidebar or copy its older navigation.

Execute one chunk at a time. Validate and stop after each chunk.

---

## The design decision

The desktop shell should have exactly two visible structural regions:

```text
Pale application background
├── Persistent light sidebar
└── One large rounded white work container
    ├── Page identity and global actions
    └── All normal page content
```

The sidebar is the only normal application surface outside the rounded container.

Everything else belongs inside that one container:

- page titles and descriptions
- upload/create controls
- Ask Costivra
- notifications
- page-specific actions
- metrics
- dashboard sections
- filters and tabs
- tables and lists
- detail views
- loading, empty, error, and permission states
- pagination and page footers

Dialogs, sheets, menus, toasts, and assistant drawers may render above the shell through their existing overlay or portal behavior. They are overlays, not additional page surfaces.

This rule applies to the desktop shell. Mobile navigation may remain a fixed bottom bar or drawer because it replaces the desktop sidebar.

---

## What the repository actually has today

### Customer application

The customer application is not a directory of separate route layouts. It is one authenticated catch-all route:

```text
src/app/app/[[...slug]]/page.tsx
```

That route loads tenant-scoped portal data and renders:

```text
AppShell
└── PortalPage
```

The main files are:

```text
src/components/app-shell.tsx
src/components/portal-pages.tsx
src/app/globals.css
src/components/smooth-scroll.tsx
src/components/client-assistant/*
```

Current behavior:

- `AppShellContent` starts with `sidebarCollapsed = true`.
- Pointer and focus handlers expand and collapse the desktop sidebar.
- The organization selector, global search, create button, Ask Costivra, and notifications live in a separate `.app-topbar`.
- `PortalPage` places route content inside `.app-content`.
- Route headings are normally rendered by the local `PageHeader` in `portal-pages.tsx`.
- The current light sidebar is a late CSS override; older dark and collapsed-sidebar rules still exist earlier in `globals.css`.
- The latest `.app-main` behavior reserves only the 72px collapsed rail and lets the expanded sidebar overlay content.

### Internal application

The internal application is composed through:

```text
src/app/manage/layout.tsx
src/components/manage-portal.tsx
src/app/globals.css
src/components/manage-ai-drawer.tsx
```

Current behavior:

- `ManagePortal` owns the sidebar, top bar, route switching, page content, dialogs, composer, and assistant integration.
- Desktop and compact widths use a collapsed rail until hover or keyboard focus opens the sidebar.
- `.manage-topbar` sits above `.manage-page` as a separate full-width strip.
- `/manage` uses route-specific viewport-height calculations for Accounts, Contacts, Mail, record workspaces, and detail pages.
- The internal assistant is a fixed right rail that changes `.manage-main` width.
- The navigation itself already has the correct `CLIENTS` and `WORK` group structure.

### Styling reality

`src/app/globals.css` is one large stylesheet with several generations of shell rules. The same selectors appear multiple times, including:

```text
.app-shell
.app-sidebar
.app-main
.app-topbar
.app-content
.manage-app
.manage-sidebar
.manage-main
.manage-topbar
.manage-page
```

Do not add another anonymous override block without first identifying which declarations are currently effective. Use new shell-specific class names or consolidate the affected shell rules carefully so the result has one understandable source of truth.

### Existing local work

At the time this plan was written, the worktree already contained unrelated scan-page changes in:

```text
STATUS.md
src/app/globals.css
src/components/marketing-pages.tsx
tests/e2e/public-smoke.spec.ts
```

Those changes belong to the user. Preserve them. Re-check `git status` before every chunk because this list will change over time.

---

## What should remain unchanged

- Existing route URLs and legacy redirects.
- The current customer navigation grouping and terminology.
- The current internal `CLIENTS` and `WORK` navigation.
- Tenant isolation, role checks, and server-side data loading.
- Organization switching behavior.
- Global search categories, result behavior, and `Ctrl/Cmd + K`.
- Upload/create behavior.
- Ask Costivra behavior and evidence boundaries.
- Notifications and unread states.
- Profile menus and sign-out.
- Mobile customer bottom navigation and mobile drawers unless a chunk explicitly changes them.
- Manage mail, split panes, dense tables, record inspectors, dialogs, and composer behavior.
- Loading, empty, error, low-confidence, and permission states.
- The real Costivra brand mark from `src/components/brand.tsx` and `public/brand/`.

No database, Supabase, API, financial calculation, authorization, or customer-data change is required for this shell redesign.

---

## Visual contract

Use the Kontai screenshot for proportion and hierarchy, not branding.

| Element | Starting target |
|---|---:|
| Desktop sidebar | 252–260px |
| Gap between sidebar and canvas | 10–14px |
| Gap around remaining canvas edges | 10–14px |
| Main canvas radius | 24–28px |
| Main canvas border | 1px neutral |
| Main canvas background | White |
| Outer background | Very pale cool gray/blue-gray |
| Customer content padding | 28–36px |
| Manage content padding | 20–28px |
| Navigation row height | 42–46px |
| Motion | Under 0.5s; calm ease; reduced-motion fallback |

Use Costivra blue for active navigation and primary actions. Use mint or green for actual success and verified progress. Do not copy Kontai's forest-green palette.

Cards inside the canvas should use a uniform subtle border, white surface, and restrained 16–22px corners. Do not use heavy shadows, colored left borders, loud tinted boxes, decorative gradients, or generic AI sparkle icons.

---

# Chunk 0 — Baseline and exact shell map

## Goal

Create a trustworthy before-state and a precise edit map. Do not change production UI in this chunk.

## Required work

1. Read `AGENTS.md`, `COSTIVRA_AGENTIC_BUSINESS_BLUEPRINT.md`, `DECISIONS.md`, and current `STATUS.md`.
2. Run `git status --short` and preserve unrelated changes.
3. Open both visual references at full size.
4. Capture these current authenticated states:

```text
/app
/app/vendors
/app/bills
/app/findings
/app/vendors/[a real accessible vendor id]
/manage
/manage/accounts
/manage/mail
/manage/invoice-review
```

5. Capture at minimum:

```text
1440 × 900
1280 × 800
1024 × 768
390 × 844
```

6. Map the effective CSS declarations for all shell selectors named in the Styling reality section.
7. Record the desktop and mobile scroll owner for each shell.
8. Record every height calculation tied to 72px, 64px, `100vh`, or `100dvh` that the new canvas may affect.
9. Record overlay stacking requirements for search results, create menus, profile menus, notifications, dialogs, upload sheets, the customer assistant, and the Manage assistant rail.

## Exit gate

- Before screenshots exist.
- The effective shell rules are identified.
- The height and overlay dependencies are listed.
- No production UI changed.

Stop after this chunk.

---

# Chunk 1 — Customer desktop frame and persistent sidebar

## Goal

Make `/app` use a stable full-width sidebar and one rounded main work container while preserving all current customer behavior.

## Primary files

```text
src/components/app-shell.tsx
src/app/globals.css
src/components/smooth-scroll.tsx only if the scroll owner changes
src/components/app-navigation.test.ts
```

## Required work

1. Remove the desktop hover/focus collapse model from `AppShellContent`:
   - remove `sidebarCollapsed` as the normal desktop state
   - remove delayed pointer-enter expansion
   - remove delayed pointer-leave collapse
   - remove collapse timers and tooltip-only rail behavior
2. Keep the sidebar visible at approximately 256px on normal desktop widths.
3. Keep all navigation labels and section labels visible.
4. Preserve the current navigation groups and `isRouteActive` behavior.
5. Keep Settings and the signed-in user anchored at the bottom.
6. Add one explicit wrapper inside `.app-main` that contains both the current top-bar UI and `{children}`. This wrapper becomes the single rounded white work container.
7. Make `.app-main` reserve the full persistent-sidebar width instead of only 72px.
8. Apply the pale outer background and 10–14px canvas gap.
9. Give the canvas a 24–28px radius, subtle border, restrained shadow, and stable minimum height.
10. Ensure the canvas—not each individual page—is the dominant page-level surface.

## Important restraint

Do not move search or the organization selector yet. Do not redesign dashboard cards yet. This chunk settles geometry and removes sidebar movement.

## Exit gate

- The sidebar no longer expands or collapses on desktop hover.
- Labels remain visible.
- The sidebar is the only normal surface outside the canvas.
- The existing top bar and all route content are inside the same canvas wrapper.
- `/app`, a list page, and a detail page render without clipping or double scrollbars.
- Keyboard navigation still works.

Stop after this chunk.

---

# Chunk 2 — Customer sidebar identity and utility placement

## Goal

Make the sidebar match the reference hierarchy and turn the in-canvas top bar into a quiet utility area.

## Primary files

```text
src/components/app-shell.tsx
src/components/portal-pages.tsx
src/app/globals.css
```

## Required work

1. Move the existing organization/workspace selector into the top of the sidebar beneath the Costivra brand.
2. Keep `CompanyLogo`, organization name, location count, monitored-spend context, and organization popover behavior.
3. Replace the organization popover's inline visual styling with named classes while preserving behavior.
4. Move global search below workspace identity in the sidebar.
5. Use a short visible placeholder such as `Search...`; keep the full accessible label and `Ctrl/Cmd + K` behavior.
6. Make search results escape the sidebar safely without being clipped.
7. Keep navigation below search, with its existing groups.
8. Keep the profile menu attached to the bottom user control.
9. Keep create/upload, Ask Costivra, and notifications inside the rounded canvas.
10. Remove the old full-bleed top-bar appearance. The remaining utility controls should visually belong to the canvas header, not look like a separate application strip.
11. Keep route titles sourced by the existing `PageHeader` in `portal-pages.tsx`; do not add duplicate route-title logic to `AppShell`.
12. Align global controls with the page-header zone without colliding with page-specific actions.

## Exit gate

- Sidebar order is Brand → Workspace → Search → Navigation → Settings → User.
- Organization and search functionality are unchanged.
- No route shows a duplicate page title.
- Global controls remain inside the canvas and are not clipped.
- Search, create, notification, organization, and profile menus animate in and out and support Escape/focus behavior.

Stop after this chunk.

---

# Chunk 3 — Customer page families inside the canvas

## Goal

Make every customer route feel intentionally composed inside the new canvas without changing its business logic.

## Primary files

```text
src/components/portal-pages.tsx
src/app/globals.css
relevant focused customer component tests
```

## Phase A: overview and list routes

```text
/app
/app/vendors
/app/bills
/app/contracts
/app/findings
/app/actions
/app/results
/app/settings
```

- Normalize the page-header starting position and spacing.
- Remove redundant full-page backgrounds or outer wrappers that compete with the canvas.
- Flatten child cards where their shadow or border makes the page feel like nested containers.
- Preserve purposeful metrics, priority work, review queues, deadlines, and verified-value content.
- Do not add Kontai-style charts simply to fill space.

## Phase B: record and detail routes

```text
vendor workspaces
bills and source records
contracts
findings
actions
results
legacy-compatible detail routes
```

- Preserve breadcrumbs, scope indicators, evidence, confidence, assumptions, deadlines, and next actions.
- Keep record drawers, upload sheets, document breakdowns, and danger dialogs above the canvas.
- Verify sticky sections use the correct scroll owner.
- Preserve table-page and chat-page special layouts.

Phase A and Phase B should be separate commits or pull requests if either becomes large.

## Exit gate

- Every `/app` page starts and ends inside the single canvas.
- No page creates an accidental second full-page container.
- Long tables, empty states, record details, and overlays remain usable.
- Financial and evidence states are unchanged.

Stop after this chunk.

---

# Chunk 4 — Manage desktop frame and persistent sidebar

## Goal

Apply the same shell architecture to `/manage` while preserving its denser internal workflow.

## Primary files

```text
src/components/manage-portal.tsx
src/app/globals.css
src/components/manage-ai-drawer.tsx
```

## Required work

1. Remove hover/focus rail behavior from normal desktop Manage navigation:
   - remove `openSidebarWithIntent` and `closeSidebarWithIntent` from desktop behavior
   - simplify `sidebarViewport`, `sidebarUsesRail`, and `sidebarIsCollapsed` only as far as the supported breakpoints allow
   - retain a drawer/compact strategy for smaller screens
2. Keep the internal sidebar visible near 256px on normal desktop widths.
3. Keep `CLIENTS` and `WORK` labels and all navigation labels visible.
4. Keep Owner Operations identity at the top and the operator profile at the bottom.
5. Move Manage global search beneath the internal identity in the sidebar while preserving search ordering and `Ctrl/Cmd + K`.
6. Wrap `.manage-topbar` and `.manage-page` in one rounded white work container.
7. Keep the current page title inside that container.
8. Remove the old full-width-strip appearance from `.manage-topbar`.
9. Keep create actions and Ask Costivra inside the canvas header area.
10. Use tighter padding and row density than `/app`.
11. Do not split or rewrite the 7,000-line `manage-portal.tsx` merely for aesthetics. Extract only a small shell component if it creates a clear boundary without changing domain behavior.

## Exit gate

- `/manage` and `/app` clearly share one shell family.
- Manage remains denser and faster to scan.
- The sidebar no longer performs desktop hover expansion.
- Search, navigation, profile, create actions, live notifications, and role-gated destinations still work.
- The sidebar is the only normal surface outside the Manage canvas.

Stop after this chunk.

---

# Chunk 5 — Manage dense-workspace compatibility

## Goal

Repair every height, width, sticky, and overflow dependency affected by the new container.

## Validate these routes

```text
/manage
/manage/accounts
/manage/contacts
/manage/outreach
/manage/mail
/manage/intake
/manage/invoice-review
/manage/category-intelligence
/manage/trust-review
/manage/activity
/manage/settings
account and contact detail routes
```

## Required work

1. Recalculate every `calc(100dvh - 72px)` or `calc(100dvh - 64px)` rule against the new in-canvas header and outer gap.
2. Keep Accounts, Contacts, and their inspectors usable without page-level horizontal overflow.
3. Keep Mail split panes and message scroll areas inside the available canvas height.
4. Keep Invoice Review and Intake workspaces full-width inside the canvas.
5. Keep sticky table headers attached to their local table scroll area.
6. Keep the Manage assistant rail functional:
   - desktop: it may reduce the canvas width if enough useful width remains
   - narrower screens: retain the existing overlay/scrim behavior
   - do not clip the canvas radius or leave a false blank gutter
7. Verify composer, record menus, edit sheets, profile menu, create menu, dialogs, and live notifications.
8. Remove duplicate page-title treatments where a route renders both the Manage top-bar title and its own equivalent heading. Preserve useful descriptive copy.

## Exit gate

- All listed routes remain usable at 1440px, 1280px, and 1024px widths.
- No normal page has a second full-page background outside the canvas.
- No page-level horizontal scrollbar appears.
- Mail, tables, inspectors, drawers, and dialogs retain their working scroll behavior.

Stop after this chunk.

---

# Chunk 6 — Responsive and mobile adaptation

## Goal

Make the shell intentional below desktop widths instead of squeezing the desktop composition.

## Required work

1. Keep the persistent full sidebar only where the content can support it.
2. At tablet/compact widths, use one explicit behavior:
   - a user-controlled compact rail, or
   - a drawer.
3. Do not use hover as the required mechanism at any breakpoint.
4. Preserve the existing customer bottom navigation when it remains the clearest mobile pattern.
5. Preserve the Manage mobile drawer and scrim.
6. On mobile, reduce or remove the outer canvas gap and large radius when they waste working space.
7. Keep page titles and primary actions readable without crowding one row.
8. Keep at least approximately 44px touch targets.
9. Respect safe areas and `100dvh` behavior.
10. Test both short-height and portrait layouts.

## Required viewport checks

```text
1440 × 900
1280 × 800
1024 × 768
768 × 1024
430 × 800
390 × 844
360 × 800
```

## Exit gate

- No primary navigation or action is unreachable.
- No page-level horizontal overflow exists.
- The canvas adapts instead of becoming a cramped card.
- Focus remains trapped correctly in open drawers and dialogs.

Stop after this chunk.

---

# Chunk 7 — Regression coverage and final release QA

## Goal

Prove the shell redesign works across real customer and operator workflows.

## Automated coverage

Update or add focused tests in the existing test system, including:

```text
src/components/app-navigation.test.ts
tests/e2e/authenticated-workspace.spec.ts
tests/e2e/client-assistant.spec.ts
relevant Manage browser coverage
```

Cover:

- persistent desktop navigation labels
- nested-route active states
- organization selector
- customer and Manage global search
- `Ctrl/Cmd + K`
- create/upload menu
- Ask Costivra open and closed states
- notifications
- profile menus
- mobile navigation/drawer behavior
- no page-level horizontal overflow
- no double vertical scrollbar
- table and mail local scrolling

## Visual comparison

Compare these three views side by side at matching viewport sizes:

1. Chunk 0 before screenshot.
2. Final Costivra implementation.
3. The supplied Kontai reference.

Judge:

- sidebar proportion
- canvas boundary and radius
- page-title alignment
- whitespace balance
- active navigation clarity
- card-border weight
- overlay layering
- desktop and mobile scroll behavior

Do not judge success by matching Kontai's colors or dashboard data.

## Required commands

Use the repository's npm/package-lock path and run the actual scripts:

```text
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run test:e2e
npm run build
```

Run authenticated E2E only through the repository's existing environment-gated command and fixture path. Do not point fixture-creating tests at production without the explicit existing production safeguard.

## Release gate

- All applicable checks pass on the exact release commit.
- Authenticated desktop and mobile screenshots are reviewed.
- `/app` and `/manage` share the intended shell architecture.
- Customer and internal density remain intentionally different.
- No tenant, authorization, evidence, or financial behavior changed.
- Production deployment is verified before declaring completion.

Stop after this chunk.

---

## Definition of done

- Desktop navigation is stable and readable without hover.
- Sidebar order and identity are clear.
- The sidebar is the only normal desktop surface outside the main container.
- Every title, global action, dashboard section, list, table, detail view, and page state is inside one continuous rounded canvas.
- `/app` feels calm and customer-friendly.
- `/manage` uses the same shell language with appropriately higher density.
- Search, creation, uploads, AI, notifications, menus, dialogs, sheets, and profile behavior still work.
- Mobile and tablet behavior is intentional.
- No clipped overlays, nested-scroll traps, double scrollbars, or page-level horizontal overflow remain.
- The result borrows the Kontai reference's architecture without becoming a Kontai clone.

---

## Execution order

```text
Chunk 0  Baseline and exact shell map
   ↓
Chunk 1  Customer frame and persistent sidebar
   ↓
Chunk 2  Customer identity, search, and utilities
   ↓
Chunk 3A Customer overview and list routes
   ↓
Chunk 3B Customer record and detail routes
   ↓
Visual review of /app
   ↓
Chunk 4  Manage frame and persistent sidebar
   ↓
Chunk 5  Manage dense-workspace compatibility
   ↓
Chunk 6  Responsive and mobile adaptation
   ↓
Chunk 7  Regression coverage and release QA
```

Do not start `/manage` until the customer shell has been visually reviewed. The customer application is the safer place to settle the shared geometry before applying it to the denser internal workspace.

---

## Reusable prompt

Replace `[CHUNK]` with one chunk from this file.

```text
Read AGENTS.md, COSTIVRA_AGENTIC_BUSINESS_BLUEPRINT.md, DECISIONS.md,
STATUS.md, and COSTIVRA_APP_MANAGE_SHELL_REDESIGN_PLAN.md completely.

Execute only [CHUNK].

Use C:\Users\Lap3p\Downloads\kontai-dashboard-hero-redacted.png as the
structural reference. Preserve Costivra's brand, navigation, evidence model,
financial states, permissions, tenant isolation, and current interactions.

Inspect the current worktree and rendered routes before editing. Preserve all
unrelated work. Do not begin a later chunk.

Implement the chunk, run focused tests and npm run typecheck, inspect the
affected authenticated desktop and mobile states in a real browser, update
DECISIONS.md and STATUS.md when the change warrants it, and stop only when the
chunk's exit gate is satisfied.

At handoff, report:
1. What visibly changed.
2. Which files changed.
3. Exact checks run and their results.
4. Any skipped check and why.
5. Any known limitation or follow-up.
6. Whether the chunk's exit gate is fully satisfied.
```

## First prompt to run

```text
Read AGENTS.md, COSTIVRA_AGENTIC_BUSINESS_BLUEPRINT.md, DECISIONS.md,
STATUS.md, and COSTIVRA_APP_MANAGE_SHELL_REDESIGN_PLAN.md completely.

Execute only Chunk 0 — Baseline and exact shell map.

Do not change production UI. Inspect the current worktree, open both visual
references, capture the named authenticated routes and viewports, map the
effective shell CSS and all height/overlay dependencies, document the exact
edit surface, and stop when Chunk 0's exit gate is satisfied.
```
