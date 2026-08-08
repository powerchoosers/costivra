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

1. Preserve the compact rail, but remove hover-only dependence from `AppShellContent`:
   - keep the expanded and compact states as intentional desktop states
   - keep the existing collapse/expand control and keyboard access
   - remove delayed pointer behavior that causes accidental expansion or collapse
   - remove tooltip-only rail behavior that hides essential navigation context
2. Keep the expanded sidebar near 256px and the compact rail near 76px on supported desktop widths.
3. Keep all navigation labels and section labels visible when expanded.
4. Preserve the current navigation groups and `isRouteActive` behavior.
5. Keep Settings and the signed-in user anchored at the bottom.
6. Add one explicit wrapper inside `.app-main` that contains both the current top-bar UI and `{children}`. This wrapper becomes the single rounded white work container.
7. Make `.app-main` reserve the correct sidebar width in both expanded and compact states.
8. Apply the pale outer background and 10–14px canvas gap.
9. Give the canvas a 24–28px radius, subtle border, restrained shadow, and stable minimum height.
10. Ensure the canvas—not each individual page—is the dominant page-level surface.
11. Test resizing while the sidebar is expanded, compact, and mid-transition so the canvas never clips or leaves a false gutter.

## Important restraint

Do not move search or the organization selector yet. Do not redesign dashboard cards yet. This chunk settles geometry and removes sidebar movement.

## Exit gate

- The sidebar expands and collapses intentionally without requiring hover.
- Labels remain visible when expanded and compact icons remain centered when collapsed.
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

# Chunk 4 — Manage desktop frame and shared sidebar behavior

## Goal

Apply the proven `/app` shell contract to `/manage` while preserving its denser internal workflow. `/manage` should feel like the same Costivra product, not a second-generation shell.

## Primary files

```text
src/components/manage-portal.tsx
src/app/globals.css
src/components/manage-ai-drawer.tsx
```

## Required work

1. Reuse the `/app` shell behavior instead of inventing a separate Manage pattern:
   - expanded sidebar near 256px
   - compact rail near 76px
   - one smooth width transition for the sidebar and main canvas
   - labels and utility content animate in/out without clipping
   - preserve a drawer strategy at mobile widths
2. Keep the sidebar transparent so the shared textured application background remains visible. Remove the hard divider line between sidebar and canvas.
3. Keep `CLIENTS` and `WORK` group labels and all navigation labels visible when expanded.
4. Keep Owner Operations/workspace identity at the top, with Manage search directly beneath it.
5. Make the navigation region its own internal scroll container. It must scroll with the mouse wheel and keyboard without covering the search area.
6. Keep Settings and the operator profile anchored at the bottom of the sidebar; the profile must remain visible while navigation scrolls.
7. Wrap `.manage-topbar` and `.manage-page` in one rounded work canvas. The sidebar is the only normal surface outside it.
8. Keep the top bar fixed inside the canvas while `.manage-page` owns vertical scrolling. Do not leave a page-level scrollbar beside the canvas.
9. Put the collapse/expand control at the left of the canvas header, followed by a divider and the current page title/description.
10. Keep create actions, Ask Costivra, and notifications inside the canvas header. Normalize their controls to 40×40px, equal gaps, equal borders, equal hover treatment, and `box-sizing: border-box`.
11. Preserve the dense Manage rhythm: tighter content padding, smaller table rows, and more information per viewport than `/app`.
12. Do not split or rewrite the 7,000-line `manage-portal.tsx` merely for aesthetics. Extract only a small shell component if it creates a clear boundary without changing domain behavior.

## `/app` shell contract to match

```text
Shared pale textured background
├── Transparent sidebar
│   ├── Brand / identity
│   ├── Workspace context
│   ├── Search
│   ├── Scrollable navigation
│   └── Fixed Settings + profile footer
└── Rounded work canvas
    ├── Fixed canvas header
    │   ├── Collapse/expand control
    │   ├── Divider
    │   ├── Page identity
    │   └── 40px global controls
    └── Scrollable route content
```

The shell should use one scroll owner per region. Do not solve a Manage scroll bug by adding another nested `100vh` wrapper. First identify whether the sidebar navigation, canvas route content, table, mail pane, or assistant surface owns the scroll.

## Scroll-owner map required before Manage edits

Document the actual owner, height constraint, and nested exceptions for each region:

| Region | Expected owner | Must not be hijacked by |
|---|---|---|
| Sidebar navigation | sidebar navigation container | workspace search, profile footer |
| Canvas route content | Manage page/content container | tables, mail panes, dialogs |
| Dense tables | local table wrapper | canvas wheel handler |
| Mail | message list/message body panes | canvas route scroll |
| Assistant | assistant surface or drawer body | underlying canvas |
| Menus and dialogs | their own scroll region when needed | page or sidebar scroll |

Before implementation, verify this map against computed browser dimensions and the actual rendered DOM. Record exceptions rather than adding broad global wheel handlers.

## Implementation checkpoint — first Chunk 4 slice

The first implementation slice is now in place:

- Manage has a shared pale textured background, transparent sidebar, compact rail, and rounded white work canvas.
- The canvas header stays fixed while `.manage-page` owns route scrolling.
- The sidebar navigation and route canvas have explicit wheel handling only when their own scroll range exists; nested tables, mail panes, menus, and the assistant are excluded.
- The top-left control now explicitly expands and collapses the desktop rail instead of treating every desktop state as collapsed.
- Manage header icon/create controls are normalized to 40px square boxes with shared border and hover treatment.

The follow-up slice is also in place: Manage search now lives beneath the workspace identity, remains available as a compact-rail search icon, and expands the rail when focused. Long settings/mail routes, profile anchoring, assistant drawer containment, mobile drawer geometry, reduced-motion overrides, accessible shell labels, and the existing create menu have been checked.

### Chunk 4 completion evidence

- `npm run typecheck` passes.
- `npm run lint` passes with one existing warning in `src/components/navigation-history.tsx`; no errors were introduced by the Manage shell work.
- `git diff --check` passes.
- Browser checks cover `/manage`, `/manage/accounts`, `/manage/settings`, and `/manage/mail` at the default desktop viewport, a 1000px compact viewport, and a 390px mobile viewport.
- The final shell audit found one search field, no top-bar search duplicate, no unnamed shell buttons, accessible labels for every navigation link, a fixed footer during navigation scroll, a working profile menu, a working create menu, contained assistant behavior, and no body overflow beyond the viewport.
- **Parity repair**: Manage now uses the same compact breakpoint as `/app` (980px), opens with the full rail above that breakpoint, and no longer collapses on pointer-leave when expanded. Hover no longer opens the rail; the compact rail uses explicit click/focus expansion instead.
- **Compact interaction polish**: The search field contracts into a centered search icon during collapse and animates back to the full field during expansion. Compact navigation, Settings, profile, and search controls expose descriptive label chips without clipping the scrollable nav.
- **Compact spacing correction**: The collapsed rail no longer reserves a visible search row, the hover label sits 4px beyond the rail edge, and the Work divider-to-Outreach spacing is tightened to match the surrounding icon rhythm.
- **Cross-shell visual parity**: Manage now uses the shared Space Grotesk wordmark treatment, the `/app` compact tile glow, the white/blue label chip, the same border radius/shadow, and the same 150ms/190ms hover easing. The label sits 2px beyond the Manage rail edge to match the customer rail’s visual gap.
- **Badge anchoring and exit motion**: Compact Manage labels are now positioned from the actual 48px option tile (`tile right + 2px`) rather than from the rail edge, and retain a 190ms exit animation before unmounting. The brand block no longer has a bottom divider.
- **Navigation persistence and click behavior**: Both `/app` and `/manage` now remember the user's collapsed/expanded sidebar preference for the current session, so changing sections does not reopen the panel. Manage suppresses the keyboard-focus expansion that normally follows a mouse click while preserving keyboard focus expansion for accessibility.

Chunk 4 is complete. Continue with Chunk 5 for route-specific dense-workspace compatibility and the remaining internal scroll-owner hardening.

## Exit gate

- `/manage` and `/app` visibly share the same shell family.
- Expanded and compact sidebar states open and close smoothly without clipping search, labels, section names, or glow effects.
- Clicking a navigation option does not reopen a collapsed sidebar after the route changes.
- Sidebar navigation scrolls independently; Settings and profile stay fixed at the bottom.
- The canvas header remains fixed while route content scrolls inside the canvas.
- Search, navigation, profile, create actions, live notifications, assistant behavior, and role-gated destinations still work.
- The sidebar is the only normal surface outside the Manage canvas.

Stop after this chunk.

---

# Chunk 5 — Manage internal scrolling and dense-workspace compatibility

## Goal

Repair every height, width, sticky, and overflow dependency affected by the shared fixed-frame shell. Make each Manage workspace scroll naturally inside the canvas without stealing scroll from its own nested work area.

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

1. Recalculate every `calc(100dvh - 72px)`, `calc(100dvh - 64px)`, `100vh`, and `100dvh` rule against the actual in-canvas header height and outer canvas gap.
2. Give the Manage route content one explicit internal scroll container with `min-height: 0`, `overflow-y: auto`, and stable scrollbar behavior.
3. Keep Accounts, Contacts, and their inspectors usable without page-level horizontal overflow.
4. Keep Mail split panes and message scroll areas inside the available canvas height. The message list and message body may scroll independently where they already do.
5. Keep Invoice Review, Intake, Category Intelligence, and Trust Review full-width inside the canvas.
6. Keep sticky table headers attached to their local table scroll area, not to the browser viewport.
7. Add deterministic wheel handling only where the browser fails to deliver wheel events to the intended internal scroll owner. Do not apply a parent wheel handler that hijacks nested table, menu, search-result, mail, or assistant scrolling.
8. Keep the Manage assistant rail functional:
   - desktop: it may reduce the canvas width if enough useful width remains
   - narrower screens: retain the existing overlay/scrim behavior
   - do not clip the canvas radius or leave a false blank gutter
9. Verify composer, record menus, edit sheets, profile menu, create menu, dialogs, live notifications, and notifications popovers above the canvas.
10. Remove duplicate page-title treatments where a route renders both the Manage top-bar title and its own equivalent heading. Preserve useful descriptive copy.
11. Test the shell with short content, long content, empty states, loading states, and permission-limited states so the scroll owner does not depend on data volume.
12. Verify overlay anchoring at the rounded canvas edges and while the canvas is scrolled or the sidebar changes state.
13. Consolidate effective Manage shell declarations after the change. Do not leave another anonymous override block competing with older `.manage-*` rules.

## Exit gate

- All listed routes remain usable at 1440px, 1280px, and 1024px widths.
- No normal page has a second full-page background outside the canvas.
- No page-level horizontal scrollbar appears.
- Canvas content scrolls with the wheel, trackpad, keyboard, and scrollbar.
- Mail, tables, inspectors, drawers, and dialogs retain their working local scroll behavior.

Stop after this chunk.

---

# Chunk 6 — Responsive, compact rail, and mobile adaptation

## Goal

Make the shell intentional below desktop widths instead of squeezing the desktop composition.

## Required work

1. Keep the expanded sidebar only where the content can support it.
2. At compact desktop/tablet widths, use the proven compact rail with a clear expand/collapse control and smooth width transition. Hover must not automatically open navigation; click and keyboard focus are the explicit expansion paths.
3. Ensure compact mode keeps icons centered in square controls, preserves section dividers, and shows descriptive label chips outward without clipping or stealing scroll ownership.
4. Preserve the existing customer bottom navigation when it remains the clearest mobile pattern.
5. Preserve the Manage mobile drawer and scrim.
6. On mobile, reduce or remove the outer canvas gap and large radius when they waste working space.
7. Keep page titles and primary actions readable without crowding one row. Stack the 40px global controls when necessary rather than shrinking them below the touch target.
8. Keep at least approximately 44px touch targets for navigation and primary actions; the compact 40px header controls are the deliberate exception only where the surrounding hit area remains accessible.
9. Respect safe areas and `100dvh` behavior.
10. Test both short-height and portrait layouts, including sidebar overflow and profile visibility.
11. Test viewport resizing during sidebar open/close, including keyboard focus during the transition.

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
- Compact sidebar labels, glows, dividers, and scrollbars do not clip during open/close.
- Focus remains trapped correctly in open drawers and dialogs.

Stop after this chunk.

---

# Chunk 7 — Shell regression coverage and final release QA

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
- expanded and compact sidebar transitions
- sidebar internal scrolling with fixed Settings/profile footer
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
- canvas scroll owner and wheel scrolling
- fixed canvas header while route content scrolls
- table and mail local scrolling
- resize during sidebar transitions
- overlay positioning at desktop, compact, and mobile widths
- keyboard focus, Escape behavior, visible focus rings, and reduced-motion mode

## Visual comparison

Compare these three views side by side at matching viewport sizes:

1. Chunk 0 before screenshot.
2. Final Costivra implementation.
3. The supplied Kontai reference.

Judge:

- sidebar proportion
- compact rail alignment and open/close motion
- canvas boundary and radius
- page-title alignment
- header control dimensions, color, hover treatment, and spacing
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
- `/manage` matches the tested `/app` shell contract without copying customer density.
- Customer and internal density remain intentionally different.
- No tenant, authorization, evidence, or financial behavior changed.
- Production deployment is verified before declaring completion.

Stop after this chunk.

---

## Definition of done

- Desktop navigation is stable and readable without requiring hover; compact-rail hover may assist discovery.
- Sidebar order and identity are clear.
- The sidebar is the only normal desktop surface outside the main container.
- Every title, global action, dashboard section, list, table, detail view, and page state is inside one continuous rounded canvas.
- `/app` feels calm and customer-friendly.
- `/manage` uses the same shell language with appropriately higher density.
- Search, creation, uploads, AI, notifications, menus, dialogs, sheets, and profile behavior still work.
- Internal sidebar and canvas scrolling work with wheel, keyboard, trackpad, and scrollbar input.
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
