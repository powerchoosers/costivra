---
name: costivra-product-design
description: Design and refine Costivra product UI for finance leaders and business owners. Use for dashboards, expense organization, document review, evidence views, opportunity flows, responsive layouts, and visual QA.
---

# Costivra product design

Costivra is being built to become a billion-dollar company. Hold every interface to a senior product-design and senior front-end-engineering standard: simple, visual, calm, credible, responsive, and useful for CFOs, controllers, owners, and operations leaders managing real expenses.

## Authority

- `AGENTS.md` and `COSTIVRA_AGENTIC_BUSINESS_BLUEPRINT.md` remain the product and architecture authority. This skill is the UI implementation playbook and must not weaken either source.
- This `.agents/skills/costivra-product-design/SKILL.md` file is the sole project-owned source of truth for Costivra product-design guidance. Do not create a duplicate copy under `.codex` or another skills directory.

## Non-negotiable design direction

- Make the business question obvious: what happened, how much it matters, what evidence supports it, how confident we are, and what the user can do next.
- Use plain language. Do not require users to understand AI, data pipelines, or technical terminology.
- Prefer purposeful tables, comparisons, timelines, charts, and evidence views over decorative content. A visual must improve comprehension or decision-making.
- Use restrained typography, whitespace, subtle neutral borders, and rounded/squircle surfaces, generally with 16–22px corners. Keep hierarchy strong and the number of competing elements low.
- Give meaningful work surfaces a quiet, consistent sense of elevation. Table panels, data cards, summary groups, record sidebars, and other self-contained content containers should sit one shallow layer above the workspace ground. This is a depth cue for orientation, not decoration.
- Design mobile, tablet, and desktop intentionally. Do not compress a desktop layout into a phone.
- Shared behavior and geometry matter more than page-specific decoration. A user should feel they are in one coherent Costivra product whether they are in Manage or the customer app.

## Icon system

- Costivra uses the compatibility exports in `src/lib/icons.tsx`, backed by `@phosphor-icons/react`. New or touched product UI must import icons from `@/lib/icons`; migrate a legacy raw `@phosphor-icons/react` import when working in that file. Do not introduce Lucide, Heroicons, raw icon-library imports, emoji, or hand-drawn SVG substitutes without explicit approval.
- The shared adapter maps existing `strokeWidth` usage to Phosphor weights. Use the regular weight by default and let the existing component APIs set the size; do not mix visual weights arbitrarily on one surface.
- Use icons to clarify a concrete action or state, not to fill space. A text label remains necessary when an icon alone would be ambiguous.
- Use `MoreVertical` for overflow/action menus by default. Use `MoreHorizontal` only when the overflow is explicitly horizontal or inline and the interaction would otherwise be less clear. Reuse `GripVertical` only as a drag handle, not as an overflow menu.
- Keep common control sizing consistent: approximately 14px inside dense rows, 15–16px in buttons and menus, and 18px in standalone utility controls. Reuse existing icon-button and menu-control classes rather than creating one-off icon geometry.
- Never use `Sparkles`, a magic wand, three-star motifs, or a generic “AI” glyph to represent generated content or intelligence. Use a literal action label such as “Draft template,” a domain icon, or a restrained status indicator.
- Always use the real Costivra brand assets for product identity: reuse `Brand`/approved marks from `src/components/brand.tsx`, and use `CostivraAssistantIcon` from `src/components/assistant-icon.tsx` for the assistant. Never replace the logo with a letter, generated initials, emoji, or generic icon.

## Motion and interaction system

- Motion must make state changes easier to understand, never make the product feel theatrical. Every interaction needs clear feedback, but use motion only when it explains a spatial or state change. Do not animate typing, routine validation, initial render, or every enabled/disabled change by default.
- Animate hover, focus, selected, expanded, collapsed, loading, success, and error states only where the movement clarifies the result. Animate container size or layout when the content would otherwise jump.
- Use CSS transitions for simple state changes. Prefer `opacity` and `transform`; use `height`, grid rows, or measured dimensions only when the layout itself must expand or collapse. Never use `transition: all`.
- Standard motion should feel fast: roughly 120–180ms for hover/focus and 180–280ms for menus, popovers, drawers, sheets, cards, and layout changes. Use the existing shared timing token/easing where available, such as `--workspace-motion-fast` or `--assistant-ease`.
- New or materially changed modal, sheet, popover, dropdown, drawer, contextual menu, toast, and other transient surface must animate both in and out. Keep the closed state mounted long enough for the exit animation to finish; do not instantly remove it and make the close feel broken.
- Use a consistent animation pair for each surface family across Manage and the customer app. For example, menus use a short opacity + small translate/scale transition; side sheets use opacity + horizontal translation; dialogs use opacity + small vertical translation/scale. Reuse shared class names and keyframes instead of inventing a page-specific motion pattern.
- Motion must not block input, delay the main action, or force the browser to do expensive layout work on every frame. Do not animate large shadows, filters, blur, full-page dimensions, or continuous decorative effects unless there is a clear product reason.
- Respect `prefers-reduced-motion`: remove nonessential movement, shorten state changes, and never make essential information dependent on animation.
- Preserve keyboard behavior through animated surfaces: focus must move into dialogs, Escape must dismiss dismissible overlays, focus must return to the invoking control, and hidden/exiting controls must not remain keyboard-focusable.
- Do not use `transition: all`. Name the properties that actually change. When touching a legacy broad transition, replace it with an explicit property list rather than widening it.
- Do not couple React unmount timing to a separately hard-coded delay. Use a shared duration token or a transition/animation completion event. Automatic smooth scrolling must also respect reduced-motion preferences.

## Loading and skeleton system

- Use skeletons when an asynchronous request is replacing known structured UI such as rows, cards, detail headers, metrics, message lists, or document panes. A skeleton should mirror the final layout closely enough to prevent layout shift.
- Use a compact spinner only for a small, indeterminate operation such as a button submission or a genuinely unknown duration. Do not replace an entire table or detail page with a lone spinner when a structural skeleton can show what is loading.
- There is not yet a cross-workspace skeleton primitive. When a structured asynchronous view needs one, first add or reuse an accessible shared primitive in `src/components/ui/workspace-primitives.tsx` or the shared workspace CSS; do not invent a page-local painted rectangle. It should use restrained neutral surfaces, `aria-busy`, and a reduced-motion fallback—never loud gradients or distracting shimmer.
- Keep loading states local: preserve already-loaded content during a small mutation, show the pending row/card state in place, and avoid refetching the entire page just to update one record.
- Every user-visible data flow needs a considered loading, empty, error, success, and where relevant low-confidence state.

## Shared Manage and customer-app system

- Treat `.manage-shell-v2` and `.app-body .app-work-canvas` as two shells using one design system. Their `data-workspace-shell` attributes identify the role, but must not be used to couple records, permissions, or navigation.
- Share tokens and primitive styles for page ground, work canvas, panels, tables, buttons, icon buttons, menus, overlays, inputs, tabs, empty states, skeletons, and focus states whenever their purpose is the same.
- Extend the current shared primitive inventory before cloning JSX or CSS: `src/components/ui/workspace-primitives.tsx` for utility buttons, status badges, and empty states; `src/lib/ui/workspace-shell.ts` for shared shell contracts/route matching; `src/components/assistant-workspace.tsx` and `src/lib/ui/assistant-composer.ts` for equivalent assistant controls and autoresizing.
- The current cross-workspace CSS owner is the `/* Unified operational surfaces */` section near the end of `src/app/globals.css`, backed by `--workspace-*` tokens. Add shared operational styles there or through a reusable primitive before creating a page-specific selector. Keep structural differences local only where the actual workflow or responsive layout differs.
- Do not globally override generic selectors that affect marketing pages or unrelated product surfaces. Scope shared operational styling to the two authenticated shells.
- Keep container styles quiet: white or subtly translucent surfaces, 1px neutral borders, consistent 16–22px radii, generous whitespace, and the shared shallow panel elevation. Use `--workspace-panel-shadow` for ordinary cards, table containers, metric groups, and record panels. The shadow must be broad, low-opacity, neutral, and stable—noticeable enough to separate the surface from the page ground, never dark enough to read as an outline.
- Do not put panel elevation on every element. Buttons, inputs, list rows, dividers, inline chips, and nested sub-sections stay mostly flat; use borders, soft fills, and spacing for their hierarchy. Reserve `--workspace-shadow` or a purpose-specific elevated token for the work canvas, popovers, drawers, dialogs, and other true overlays.
- Reuse shared controls and interaction patterns. A create trigger, Back control, overflow menu, confirmation popover, drawer, filter, table row, and modal should not be redesigned independently on every page.
- Use a circular shared utility control for top-level workspace actions such as create, assistant, and notifications; use the shared soft-square treatment only where the control belongs inside a form, list, or denser local toolbar.

## Shared CSS implementation contract

- Before adding CSS, search for an existing shared token, primitive, component, or selector used by the other authenticated shell. Extend that shared contract first; do not copy a block from `/app` into `/manage` or vice versa.
- The existing late compatibility rules and `!important` values in `src/app/globals.css` are migration debt, not a pattern to repeat. Do not add another override layer or expand `!important` usage. When a legacy exception is unavoidable, scope it to the shared owner, explain the collision in a nearby comment, and leave a clear removal target.
- Put new shared visual rules in the current shared workspace owner or a reusable component stylesheet. Keep page-specific rules in a clearly named modifier or route component. New primitives must not depend on selector order to win the cascade.
- Use semantic shared classes for geometry and states (for example, control, panel, composer, rail, open, closed, selected, loading, and error) and `--workspace-*` tokens for product foundation values. Existing `--assistant-*` tokens are temporary global feature debt; do not add new global feature tokens, and scope new assistant tokens to the assistant surface while deriving them from workspace tokens where practical.
- Elevation is a shared token decision, never a page-local `box-shadow` decision. Reuse `--workspace-panel-shadow` for standard operational cards and `--workspace-shadow` for shell-level or overlay depth. If another elevation tier is genuinely needed, define it once in the shared workspace token owner, document its intended surfaces, and apply it consistently in both `/app` and `/manage`.
- Workspace scrollbars are one shared behavior, not page-local browser styling. On fine-pointer devices, use the existing `SmoothScroll` + `workspace-scrollbar` overlay contract: a muted public-site yellow-green thumb fades in only while its own horizontal or vertical scrollport is moving, then fades out after the shared idle delay. `SmoothScroll` auto-enrolls legacy native scrollports matching its shared selector, so Manage and App routes cannot silently fall back to blue browser scrollbars; new scrollports should still opt in explicitly with `data-workspace-scrollbar`. Keep the axes independent, use no thumb shadow or decorative rim, and preserve the native accessible fallback for coarse pointers, forced colors, and reduced-motion users.
- Cross-platform assistant visual rules currently live in `src/components/client-assistant/client-assistant.css` and are used by both shells. Treat it as a temporary shared presentation owner, not as customer-only CSS: do not create a competing Manage copy. When that surface next needs substantial work, extract neutral shared rules into an assistant-workspace stylesheet beside `src/components/assistant-workspace.tsx`, leaving only named customer and Manage modifiers in their feature files.
- Share the actual keyframes and transition contract for equivalent surfaces. If a structural difference requires a platform-specific rule, inherit the shared base class and add only the smallest modifier needed for that structure.
- When changing a shared class, inspect both `/app` and `/manage` at desktop and mobile widths. Check hover, focus, keyboard, open, close, loading, empty, and reduced-motion states in both shells before considering the change complete.
- Keep content, records, permissions, and data-fetching separate even when markup and CSS are shared. Shared CSS must never become a reason to share tenant data, assistant providers, navigation taxonomies, or authorization logic.
- After meaningful CSS work, run `git diff --check`, the current repository type/test commands, and a browser review. If a rule cannot be safely shared, document why in the change rather than silently duplicating it.

## Assistant surface contract

- Equivalent assistant UI—header, icon buttons, rail, composer, messages, open/close motion, and reduced-motion behavior—uses the shared assistant primitives and visual contract. Customer and Manage providers, suggestions, citations, records, authorization, and persistent-history tables remain separate.
- A composer has one outer shell that owns the focus treatment. The textarea must not create a second visible container or focus ring. It starts at one row, grows smoothly to a capped height, shrinks immediately after deletion, and scrolls only after reaching that cap. Enter sends and Shift+Enter adds a line.
- A modal or full-screen assistant must use dialog semantics (`role="dialog"`, `aria-modal="true"`, and a labelled heading), move focus in, restore focus to its trigger, make inactive background controls unavailable, and keep exiting descendants out of the keyboard order. A deliberately non-modal drawer must state that design choice and not claim modal behavior.
- On mobile, use dynamic viewport sizing and safe-area padding. The assistant canvas, not the page and not the composer, owns message scrolling; the composer stays reachable above the keyboard.
- Shared visuals never imply shared capability. An attachment, citation, action, or approval control must perform its authorized role or plainly communicate its handoff/limitation. In Manage, no attachment content may enter assistant context until the operator has selected a client and the file has passed private storage, scanning, provenance, authorization, and audit checks.
- Suggestions and answers must say enough to understand why a record surfaced, link only to authorized live sources, and never present a generated financial amount as authoritative. Persistent chat history must define access scope, retention, deletion/archive behavior, title/preview sensitivity, and source-link authorization at render time.

## Performance and data discipline

- Make the UI feel immediate without filling a user’s computer with unnecessary cached data. Do not add broad `localStorage`, `sessionStorage`, IndexedDB, service-worker, or persistent client-cache layers for general product data unless the user explicitly approves the exact data, retention, invalidation, and privacy behavior.
- Fetch only the data required for the current screen and current user action. Paginate and filter large lists server-side; do not preload or hydrate whole workspaces, documents, mailboxes, or history feeds merely to make later navigation look faster.
- Prefer server components by default. Use client components only for browser state, interaction, effects, or APIs that truly need them. Lazy-load heavy editors, viewers, charts, and dialog-only code when it is not required for the initial screen.
- Preserve local UI state after a successful mutation and update the affected record in place. Do not reload the whole page or sequence merely because one item changed.
- Keep request payloads minimal, avoid duplicate fetches, cancel stale work when practical, and do not run background polling or prefetching without a visible product need.
- Use CSS-first motion and lightweight React state. Avoid animation libraries or browser work that make simple interactions slower, increase bundle size, or degrade lower-powered devices.
- Measure before adding a cache. The default is fresh, scoped data with good loading states—not indiscriminate client persistence.

## Avoid generic AI UI

- No AI slop: no filler dashboards, random gradients, ornamental glows, decorative bento grids, excessive pills, fake “magic,” or interchangeable copy.
- Never use the conventional three-star/sparkle icon, `Sparkles`, a magic wand, or an equivalent generic icon to mean AI, generated content, intelligence, premium, or magic. Use a literal domain-specific icon, text, a status dot, or an approved custom Costivra visual.

## Definition of done for UI work

- Verify loading, skeleton, empty, error, low-confidence, mutation-pending, and success states where applicable.
- Inspect the affected flow in a real browser at relevant breakpoints and repair anything cramped, clipped, templated, inconsistent, or unfinished.
- Confirm keyboard access, focus visibility, contrast, labels, touch targets, reduced-motion behavior, and entry/exit animation behavior.
- Check that any new style, animation, skeleton, icon, or control is reused from the shared system or deliberately added to it for both Manage and the customer app.
- Preserve evidence, uncertainty, approval state, authorization boundaries, and perceived performance while improving the visual design.
