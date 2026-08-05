# Ask Costivra Visual Cards, Layout, and Motion Polish Directive

**Repository:** `powerchoosers/costivra`  
**Primary surface:** Client workspace Ask Costivra assistant  
**Baseline inspected:** `dc9314c5f6e86a9c09fe9d3e69bb0c36145846b9`  
**Execution environment:** Antigravity IDE with GitHub and Supabase MCP  
**Scope:** Final visual cleanup, reliable response-card presentation, full-screen history controls, and seamless surface transitions  
**Prepared:** August 4, 2026, America/Chicago

> Implement this directive. Do not return another design memo without changing the product. Inspect the current branch first, preserve the functional and security work already completed, then implement, browser-test, and visually refine the assistant until the result feels deliberate, calm, modern, and finished.

---

# 1. Mission

Give Ask Costivra its final visual and interaction pass.

The finished experience should feel like a premium financial-intelligence workspace rather than a generic chat drawer:

1. Useful visual cards appear naturally for prompts that involve invoices, vendors, spend, contracts, opportunities, evidence, ingestion, approvals, and savings.
2. The full-screen assistant has a history rail that the user can collapse and reopen.
3. Drawer, full-screen, and closed states transition through one continuous surface rather than appearing to swap between unrelated panels.
4. Closing the drawer or full-screen experience has a deliberate exit animation.
5. Chat messages, cards, citations, attachments, and loading states share one consistent design language.
6. The experience is restrained and airy, inspired by Apple's clarity and material quality without copying Apple UI.
7. The visual system remains unmistakably Costivra.
8. Cards never invent data, show fake metrics, or decorate an answer that has no supporting record.
9. Accessibility, reduced motion, mobile behavior, and keyboard navigation remain first-class.

This is the final cosmetic layer, but the card-visibility problem is not cosmetic only. Fix the presentation pipeline so the cards actually receive valid record IDs and appear in normal conversations.

---

# 2. Verified current state

Recheck these findings against the latest branch before editing.

## 2.1 Cards technically exist

The current frontend renderer supports these block types:

- `invoice_summary`
- `invoice_comparison`
- `vendor_summary`
- `opportunity`
- `document_ingestion`
- `notice`

The shared type declaration also lists:

- `spend_trend`
- `renewal_timeline`
- `approval_queue`
- `vendor_candidate`
- `evidence_list`

Those five declared types are not currently hydrated and rendered.

## 2.2 Why cards rarely appear

The central assistant prompt currently gives the model readable summaries such as vendor name, invoice amount, invoice date, and opportunity title, but it omits the corresponding record IDs.

The same prompt tells the model:

```text
Only request block types for records explicitly present in the context.
Do not invent record IDs.
```

That is a logical dead end.

The model often knows that a card would be appropriate, but it cannot safely request one because it has no allowed ID to use. This is the primary reason basic chats return text without cards.

Do not solve this by letting the model invent IDs. Provide an allowlisted record catalog and add deterministic server-side card planning.

## 2.3 Existing rendering inconsistencies

Repair these as part of this pass:

- The opportunity hydrator provides `estimatedAnnualValue`, but the renderer reads `estimatedAnnualSavings`.
- The invoice card receives a precise `href`, but the renderer links to the generic `/app/documents` page.
- The vendor card receives a precise relationship `href`, but the renderer constructs a route from the catalog vendor ID.
- The document-ingestion card receives `extractionSummary`, but the renderer only displays a status line.
- Cards use extensive inline styles and do not yet share a strong component system.
- The card shell does not expose consistent header, icon, status, footer, hover, focus, compact, expanded, or loading variants.
- There is no selected-card inspector in full-screen mode.

## 2.4 Current full-screen behavior

- Full-screen mode permanently displays the history rail.
- The history button is hidden in full-screen mode.
- The user has no way to collapse the history rail and widen the conversation.
- In drawer mode, history now correctly replaces the chat canvas.
- This directive must preserve that compact behavior while adding a collapsible rail to full-screen mode.

## 2.5 Current motion behavior

- Drawer opening uses a slide-in keyframe.
- Full-screen opening uses a separate fade-and-scale keyframe.
- The same surface does not visually morph between drawer and full screen.
- Switching layout modes can feel like replacing one panel with another.
- Setting the mode to `closed` immediately unmounts the surface.
- There is no closing animation.
- Old messages may replay entrance animations when conversation views remount.
- Reduced-motion support exists and must be preserved and expanded.

---

# 3. Definition of done

This work is complete only when all of the following pass.

## 3.1 Card visibility

- Asking `Summarize our latest recurring expenses` displays a useful spend overview or ranked-spend card when records exist.
- Asking `Show our latest invoice` displays an invoice snapshot card.
- Asking `Compare our last two AT&T bills` displays an invoice comparison card when two records exist.
- Asking `Which contracts have notice deadlines approaching?` displays a renewal timeline/list when records exist.
- Asking `Show the evidence behind this opportunity` displays an evidence card/list.
- Uploading an invoice displays an ingestion-progress card, followed by an invoice card when processing succeeds.
- An unknown-vendor invoice can display a vendor-candidate card with an honest Suggested state.
- A simple explanatory question may remain text-only when a card would not improve comprehension.
- No response contains an empty card, a fake card, or a card with invented values.

## 3.2 Full-screen layout

- History is visible by default on wide full-screen layouts.
- A clear button collapses the history rail.
- The same button reopens it.
- The conversation canvas recenters smoothly when history changes.
- The collapsed state persists during the current browser session.
- On narrower screens, history opens as an overlay/sheet rather than crushing the conversation.
- The history rail has a visible close/collapse control of its own.

## 3.3 Motion

- Top-bar trigger to drawer feels connected.
- Drawer to full screen morphs cleanly without losing the conversation.
- Full screen to drawer reverses cleanly.
- Drawer to closed animates out.
- Full screen to closed animates toward the top-right trigger or exits with a deliberate top-right-origin collapse.
- The surface stays mounted until its exit animation completes.
- The backdrop, shadow, radius, and content opacity transition in sync.
- Reduced-motion mode changes state immediately or with a minimal opacity fade.
- No animation causes horizontal overflow, text blur, layout flash, or lost focus.

## 3.4 Visual quality

- Cards share one coherent system.
- Inline styles in the assistant are substantially reduced.
- Typography is intentional at every level.
- The composer feels like a polished input dock.
- Empty, loading, error, attachment, and evidence states look designed.
- Drawer and full-screen modes feel like two forms of the same product.
- Desktop and mobile browser screenshots look production-ready.

---

# 4. Product design direction

## 4.1 Character

Use these adjectives as the filter for every design decision:

```text
calm
precise
financial
airy
credible
quietly premium
evidence-led
fast
```

Avoid:

```text
generic AI glow
sparkle icons
chatbot bubbles everywhere
large gradients
neon accents
ornamental glass
decorative bento grids
excessive pills
nested cards inside cards
fake charts
huge empty areas
```

## 4.2 Surface hierarchy

Use four elevation levels only:

1. **Workspace background**
   - Cool near-white
   - No obvious texture
2. **Assistant surface**
   - True white
   - Soft border
   - Wide, low-opacity shadow in drawer mode
3. **Interactive cards**
   - White or subtly tinted surface
   - One-pixel border
   - Small shadow only on hover/selection
4. **Floating controls**
   - Composer dock, menus, tooltips, selected inspector

## 4.3 Color system

Preserve Costivra's existing blue and neutral system.

Suggested tokens:

```css
:root {
  --assistant-bg: #f7f9fc;
  --assistant-surface: #ffffff;
  --assistant-surface-subtle: #fbfcfe;
  --assistant-surface-selected: #f4f7ff;

  --assistant-text: #111827;
  --assistant-text-secondary: #475569;
  --assistant-text-tertiary: #7c8798;

  --assistant-border: rgba(30, 41, 59, 0.10);
  --assistant-border-strong: rgba(30, 41, 59, 0.16);

  --assistant-accent: #1746c8;
  --assistant-accent-hover: #123bab;
  --assistant-accent-soft: rgba(23, 70, 200, 0.075);

  --assistant-success: #138a62;
  --assistant-success-soft: #eef9f5;
  --assistant-warning: #a96818;
  --assistant-warning-soft: #fff8ed;
  --assistant-danger: #c44b4b;
  --assistant-danger-soft: #fff3f3;
  --assistant-info: #315bbb;
  --assistant-info-soft: #f1f5ff;

  --assistant-shadow-drawer:
    -18px 0 52px rgba(15, 23, 42, 0.10);

  --assistant-shadow-card:
    0 1px 2px rgba(15, 23, 42, 0.025),
    0 8px 24px rgba(15, 23, 42, 0.035);

  --assistant-radius-control: 10px;
  --assistant-radius-card: 16px;
  --assistant-radius-surface: 22px;
}
```

Do not turn every semantic state into a saturated block of color. Use colored icons, side rails, status dots, or restrained tinted surfaces.

## 4.4 Typography

Recommended hierarchy:

```text
Assistant title:       15px / 700 / -0.01em
Context label:         12px / 500
Message body:          14.5px / 1.62
Card title:            14px / 650
Card major amount:     22px / 700 / tabular numbers
Card label:            11px / 600 / slight tracking
Card supporting text:  12px / 1.45
History title:         13px / 600
History preview:       11.5px / 1.35
Composer:              14px / 1.5
```

Use tabular numerals for financial values and dates where alignment matters.

Do not use miniature 9px or 10px text for important financial information.

---

# 5. Unified assistant surface architecture

Replace the separate drawer and full-screen entrance treatments with one persistent surface component.

## 5.1 State model

Extend assistant state:

```ts
export type AssistantDisplayMode = "drawer" | "fullscreen";

export type AssistantPhase =
  | "closed"
  | "opening"
  | "open"
  | "transitioning"
  | "closing";

type AssistantState = {
  displayMode: AssistantDisplayMode;
  phase: AssistantPhase;
  historyOpen: boolean;
  historyCollapsed: boolean;
  inspectorOpen: boolean;
  selectedBlockId: string | null;
  // existing state...
};
```

Do not represent `closed` as a display mode. Closing is a lifecycle phase.

## 5.2 Persistent mount

The assistant surface should remain mounted while:

```text
phase === opening
phase === open
phase === transitioning
phase === closing
```

Unmount only after the closing animation finishes.

Suggested provider actions:

```ts
openDrawer()
openFullscreen()
transitionToDrawer()
transitionToFullscreen()
requestClose()
completeClose()
toggleFullscreenHistory()
openInspector(blockId)
closeInspector()
```

## 5.3 One DOM surface

Use one root:

```tsx
<section
  ref={surfaceRef}
  className="assistant-surface"
  data-mode={state.displayMode}
  data-phase={state.phase}
  aria-labelledby={titleId}
>
  ...
</section>
```

Do not render a drawer component and a second full-screen component.

The same message list, composer, draft, history state, and scroll container must survive layout transitions.

---

# 6. Clean drawer/full-screen transitions

## 6.1 Preferred strategy: FLIP with the Web Animations API

Use FLIP to transition the surface bounds.

Pseudo-flow:

```ts
function animateModeChange(nextMode: AssistantDisplayMode) {
  const node = surfaceRef.current;
  if (!node || prefersReducedMotion) {
    setDisplayMode(nextMode);
    return;
  }

  const first = node.getBoundingClientRect();

  flushSync(() => {
    setPhase("transitioning");
    setDisplayMode(nextMode);
  });

  requestAnimationFrame(() => {
    const last = node.getBoundingClientRect();

    const dx = first.left - last.left;
    const dy = first.top - last.top;
    const sx = first.width / last.width;
    const sy = first.height / last.height;

    const animation = node.animate(
      [
        {
          transformOrigin: "top right",
          transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
          borderRadius: firstModeRadius,
        },
        {
          transformOrigin: "top right",
          transform: "translate(0, 0) scale(1, 1)",
          borderRadius: nextModeRadius,
        },
      ],
      {
        duration: 360,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        fill: "both",
      },
    );

    animation.finished.finally(() => {
      setPhase("open");
      animation.cancel();
    });
  });
}
```

Fade or counter-scale the internal content during the middle of the geometry transition so text does not appear stretched.

Suggested content keyframes:

```text
0%   opacity 1
35%  opacity 0.80
65%  opacity 0.94
100% opacity 1
```

Do not scale text all the way from full-screen size to drawer size without compensation.

## 6.2 CSS fallback

When FLIP proves unstable, use one root with transitionable geometry:

```css
.assistant-surface {
  position: fixed;
  display: flex;
  flex-direction: column;
  overflow: clip;
  background: var(--assistant-surface);
  transition:
    inset 360ms cubic-bezier(.16, 1, .3, 1),
    width 360ms cubic-bezier(.16, 1, .3, 1),
    height 360ms cubic-bezier(.16, 1, .3, 1),
    border-radius 360ms cubic-bezier(.16, 1, .3, 1),
    box-shadow 280ms ease,
    opacity 220ms ease;
}

.assistant-surface[data-mode="drawer"] {
  inset: 10px 10px 10px auto;
  width: min(460px, calc(100vw - 20px));
  height: calc(100dvh - 20px);
  border: 1px solid var(--assistant-border-strong);
  border-radius: var(--assistant-radius-surface);
  box-shadow: var(--assistant-shadow-drawer);
}

.assistant-surface[data-mode="fullscreen"] {
  inset: 0;
  width: 100vw;
  height: 100dvh;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}
```

The current full-height edge-to-edge drawer can be retained only when browser QA proves it looks better. The preferred desktop drawer should have a small outer gutter and rounded corners, closer to a browser-extension panel.

## 6.3 Opening animation

Capture the top-bar trigger rectangle.

Opening sequence:

1. Render surface at the trigger's approximate bounds.
2. Fade in a subtle scrim when overlay behavior is active.
3. Expand to drawer bounds.
4. Fade in content after the surface is visibly established.
5. Focus the composer.

Do not make the Costivra mark bounce.

## 6.4 Drawer-to-full-screen

- Duration: 340 to 380ms
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)`
- Radius transitions from approximately 22px to 0
- Shadow fades out
- History rail appears during the second half
- Conversation max width expands smoothly
- Preserve exact scroll position

## 6.5 Full-screen-to-drawer

Reverse the same geometry.

- Collapse history before the surface becomes too narrow, or fade it during the transition.
- Do not leave the rail compressed into an unreadable strip.
- The composer remains anchored and does not jump vertically.

## 6.6 Closing animation

### Drawer close

Animate:

```text
translateX(28px -> 104%)
opacity 1 -> 0.70 -> 0
shadow normal -> none
```

Duration: 240 to 280ms.

### Full-screen close

Preferred treatment:

- Use the stored top-bar trigger rectangle as the closing FLIP destination.
- Transform origin is top right.
- Surface radius increases toward a circle/squircle.
- Content fades out before the surface becomes too small.
- The final 15% of motion merges visually with the Costivra trigger.

Fallback treatment:

```text
scale 1 -> .985
translate 0 -> 12px,-8px
opacity 1 -> 0
transform-origin top right
```

Duration: 220 to 260ms.

Do not instantly remove the surface.

## 6.7 Closing state implementation

```ts
async function requestClose() {
  if (state.phase === "closing") return;

  setPhase("closing");

  if (prefersReducedMotion) {
    completeClose();
    return;
  }

  await animateSurfaceToTriggerOrExit();
  completeClose();
}
```

On `completeClose()`:

- Set phase to closed
- Restore focus to the trigger
- Keep the active conversation and draft in provider state
- Clear transient menus/inspector selection
- Do not delete the conversation

## 6.8 Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  .assistant-surface,
  .assistant-scrim,
  .assistant-history-rail,
  .assistant-inspector,
  .assistant-card,
  .assistant-message {
    animation: none !important;
    transition-duration: 1ms !important;
    scroll-behavior: auto !important;
  }
}
```

Do not run FLIP/WAAPI geometry animations when reduced motion is enabled.

---

# 7. Full-screen history rail controls

## 7.1 Required header control

In full-screen mode, display a history/sidebar toggle rather than hiding it.

Use:

```text
PanelLeftClose when open
PanelLeftOpen when collapsed
```

Accessible labels:

```text
Collapse conversation history
Show conversation history
```

## 7.2 State

Add:

```ts
historyCollapsed: boolean
```

Persist for the current browser session:

```text
costivra.chat.fullscreenHistoryCollapsed
```

Default:

- `false` at widths `>= 1180px`
- `true` below `1180px`
- Overlay sheet behavior below tablet width

## 7.3 Layout

```css
.assistant-workspace {
  display: grid;
  grid-template-columns:
    var(--assistant-history-width)
    minmax(0, 1fr)
    var(--assistant-inspector-width);
  min-height: 0;
  transition:
    grid-template-columns 260ms cubic-bezier(.16, 1, .3, 1);
}

.assistant-workspace[data-history="open"] {
  --assistant-history-width: 280px;
}

.assistant-workspace[data-history="collapsed"] {
  --assistant-history-width: 0px;
}

.assistant-workspace[data-inspector="closed"] {
  --assistant-inspector-width: 0px;
}

.assistant-workspace[data-inspector="open"] {
  --assistant-inspector-width: 340px;
}
```

The conversation column should stay centered inside its available width.

## 7.4 Rail internal close control

At the top of the rail:

```text
Conversations                         [collapse icon]
Search
Pinned
Today
Yesterday
Previous 7 days
Older
```

The collapse control must remain keyboard accessible.

## 7.5 Narrow widths

Below approximately 980px:

- History becomes an overlay.
- The conversation remains full width.
- Add a translucent scrim.
- Escape closes history before closing the whole assistant.
- Selecting a conversation closes the history overlay.

## 7.6 Drawer history

Preserve the existing drawer pattern:

- Clicking History replaces the canvas with the history screen.
- Add a clear Back to conversation control in the rail header.
- The main header's History button toggles the same view.
- The composer is hidden while history occupies the drawer.

---

# 8. Make cards appear reliably

## 8.1 Add an allowed record catalog to the prompt

The model must receive IDs it is allowed to request.

Example context section:

```json
{
  "allowedRecords": {
    "vendors": [
      {
        "vendorRelationshipId": "uuid",
        "name": "AT&T Business",
        "category": "Telecom",
        "annualizedSpend": 18420
      }
    ],
    "invoices": [
      {
        "invoiceId": "uuid",
        "vendorRelationshipId": "uuid",
        "vendorName": "AT&T Business",
        "invoiceDate": "2026-07-31",
        "totalAmount": 1535,
        "reviewStatus": "ready"
      }
    ],
    "contracts": [],
    "opportunities": [],
    "documents": []
  }
}
```

The prompt may show these IDs because they are internal IDs already authorized for the current tenant. The browser must never choose the tenant.

## 8.2 Do not rely only on the model

Create:

```text
src/lib/client-assistant/presentation-planner.ts
```

Suggested API:

```ts
export function planDeterministicBlocks(input: {
  prompt: string;
  context: AssistantBoundedContext;
  contextRef: AssistantContextRef | null;
  attachmentIds: string[];
}): AssistantBlockRequest[];
```

Merge:

```ts
const deterministic = planDeterministicBlocks(...);
const modelSuggested = validateModelBlockRequests(...);

const planned = dedupeAndPrioritizeBlocks([
  ...deterministic,
  ...modelSuggested,
]).slice(0, maxBlocksForMode);
```

The server, not the model, owns final card selection.

## 8.3 Deterministic card rules

### Attachment ingestion

When a turn has attached documents:

1. Always request `document_ingestion` for each attached document, capped reasonably.
2. When an invoice was created for the document, add `invoice_summary`.
3. When the vendor is a candidate, add `vendor_candidate`.
4. When extraction failed or review is required, add a `notice`.

### Latest invoice

Prompt signals:

```text
latest invoice
latest bill
recent bill
most recent invoice
```

When one invoice exists:

```text
invoice_summary
```

### Invoice comparison

Prompt signals:

```text
compare
change
increase
decrease
last two bills
month over month
```

When two relevant invoices exist:

```text
invoice_comparison
```

When more periods exist:

```text
spend_trend
```

### Vendor summary

Prompt signals:

```text
vendor
supplier
AT&T
AWS
Microsoft
relationship
annual spend
```

When one strong vendor match or current vendor context exists:

```text
vendor_summary
```

### Spend overview

Prompt signals:

```text
summarize expenses
recurring expenses
where are we spending
top spend
largest vendors
cost overview
```

Add a new block:

```text
spend_overview
```

This is essential for normal high-level prompts.

### Contract deadlines

Prompt signals:

```text
contract
renewal
notice deadline
auto renew
expires
termination window
```

Use:

```text
renewal_timeline
```

### Opportunities and savings

Prompt signals:

```text
opportunity
saving
reduce cost
finding
recommendation
```

Use one or more:

```text
opportunity
savings_summary
```

### Evidence

Prompt signals:

```text
why
evidence
source
prove
how do you know
show me the bill
```

Use:

```text
evidence_list
```

### Approvals

Prompt signals:

```text
approval
pending action
needs my decision
authorize
```

Use:

```text
approval_queue
```

## 8.4 Card cap

Drawer:

```text
Maximum 3 primary cards per response
Maximum 1 large analytical card
```

Full screen:

```text
Maximum 5 cards per response
Maximum 2 large analytical cards
```

Do not render a wall of tiny cards.

## 8.5 Card suppression

Do not render a card when:

- The answer is purely explanatory
- The requested record does not exist
- All primary fields are null
- The result would repeat the exact message text
- The model requested an unauthorized ID
- The same card already appeared immediately above and contains no new state
- The card would imply verification that does not exist

---

# 9. Card type system

Replace generic payloads with a discriminated union.

Suggested additions:

```ts
export type AssistantBlockRequest =
  | { type: "spend_overview"; vendorRelationshipIds: string[] }
  | { type: "invoice_summary"; invoiceId: string }
  | { type: "invoice_comparison"; invoiceIds: [string, string] }
  | {
      type: "spend_trend";
      vendorRelationshipId?: string;
      category?: string;
      periodCount?: number;
    }
  | { type: "vendor_summary"; vendorRelationshipId: string }
  | { type: "vendor_candidate"; organizationVendorId: string }
  | { type: "renewal_timeline"; contractIds: string[] }
  | { type: "opportunity"; opportunityId: string }
  | { type: "savings_summary"; savingsIds: string[] }
  | { type: "approval_queue"; actionIds: string[] }
  | { type: "document_ingestion"; documentId: string }
  | { type: "evidence_list"; evidenceIds: string[] }
  | {
      type: "notice";
      severity: "info" | "warning" | "error" | "success";
      code: string;
      title: string;
      message: string;
    };
```

Create concrete payload types and a union:

```ts
export type AssistantBlockV1 =
  | SpendOverviewBlock
  | InvoiceSummaryBlock
  | InvoiceComparisonBlock
  | SpendTrendBlock
  | VendorSummaryBlock
  | VendorCandidateBlock
  | RenewalTimelineBlock
  | OpportunityBlock
  | SavingsSummaryBlock
  | ApprovalQueueBlock
  | DocumentIngestionBlock
  | EvidenceListBlock
  | NoticeBlock;
```

No `Record<string, unknown>` in the final renderer path.

---

# 10. Shared card anatomy

Create:

```text
src/components/client-assistant/cards/assistant-card-shell.tsx
src/components/client-assistant/cards/card-status.tsx
src/components/client-assistant/cards/card-metric.tsx
src/components/client-assistant/cards/card-footer-link.tsx
src/components/client-assistant/cards/card-mini-chart.tsx
src/components/client-assistant/cards/card-registry.tsx
```

## 10.1 Card shell

```tsx
<AssistantCardShell
  icon={<ReceiptText />}
  eyebrow="Latest invoice"
  title="AT&T Business"
  status={<CardStatus tone="success">Ready</CardStatus>}
  href="/app/documents/..."
  selected={selected}
  onSelect={...}
>
  ...
</AssistantCardShell>
```

The term `eyebrow` in code may be renamed `label`; do not create a decorative marketing-style kicker. It is a compact domain label that helps scan a financial record.

## 10.2 Card shell visuals

```css
.assistant-card {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--assistant-border);
  border-radius: var(--assistant-radius-card);
  background: var(--assistant-surface);
  box-shadow: 0 1px 2px rgba(15, 23, 42, .02);
  transition:
    transform 160ms cubic-bezier(.16, 1, .3, 1),
    border-color 160ms ease,
    box-shadow 160ms ease,
    background 160ms ease;
}

.assistant-card:hover {
  transform: translateY(-1px);
  border-color: rgba(23, 70, 200, .20);
  box-shadow: var(--assistant-shadow-card);
}

.assistant-card:focus-within,
.assistant-card[data-selected="true"] {
  border-color: rgba(23, 70, 200, .42);
  box-shadow:
    0 0 0 3px rgba(23, 70, 200, .07),
    var(--assistant-shadow-card);
}
```

## 10.3 Card header

Header contains:

- Domain-specific icon
- Small record label
- Main title
- Optional status
- Optional disclosure button

Do not place four pills in one row.

## 10.4 Card footer

Footer contains at most:

- One primary record link
- One secondary evidence link
- Optional confidence/review text

Use precise `href` supplied by the server.

## 10.5 Compact and expanded variants

Drawer:

```text
compact
single column
12–14px internal spacing
one primary amount
maximum 3 detail rows
```

Full screen:

```text
comfortable
16–18px internal spacing
optional chart
optional two-column detail area
can open inspector
```

---

# 11. Card catalog

Implement the following cards.

---

## 11.1 Spend Overview Card

### Trigger

- `Summarize our recurring expenses`
- `Where are we spending the most?`
- `Show our cost overview`
- `What are our largest vendors?`

### Visual anatomy

```text
Recurring spend
$284,920 / year                  +4.8%

Top vendors
AT&T Business       $42,180
AWS                 $38,420
Waste Management    $21,900

[View all expenses]
```

### Payload

```ts
type SpendOverviewBlock = {
  id: string;
  type: "spend_overview";
  payload: {
    annualizedSpend: number;
    currency: string;
    periodChangePercent: number | null;
    vendorCount: number;
    topVendors: Array<{
      vendorRelationshipId: string;
      name: string;
      category: string | null;
      annualizedSpend: number;
      href: string;
    }>;
    categoryCount: number;
    href: string;
  };
};
```

### Style

- Major amount on the first line
- Change indicator uses text and arrow, not color alone
- Top vendor list uses small horizontal bars in full screen
- Drawer uses a clean ranked list
- No donut chart in the drawer

---

## 11.2 Invoice Snapshot Card

### Trigger

- Latest invoice/bill
- Attached invoice successfully processed
- Review a named invoice
- Current invoice context

### Visual anatomy

```text
Latest invoice                         Ready
AT&T Business

$1,535.42
Jul 1 – Jul 31, 2026

Due Aug 18        Telecom
Exact match       Reconciled

[Open invoice]  [View evidence]
```

### Payload

Use the precise fields already available plus:

```ts
{
  invoiceId;
  vendorName;
  invoiceNumber;
  invoiceDate;
  dueDate;
  servicePeriodStart;
  servicePeriodEnd;
  totalAmount;
  amountDue;
  currency;
  category;
  reviewStatus;
  vendorMatchStatus;
  reconciliationState;
  documentId;
  href;
  evidenceHref;
}
```

### State visuals

- Ready: quiet green dot and `Ready`
- Needs review: amber rail and `Needs review`
- Candidate vendor: blue info state and `Suggested vendor`
- Unmatched: neutral warning and `Vendor not matched`
- Reconciliation mismatch: red accent only around mismatch row, not the entire card

### Required fixes

- Use `p.href`.
- Use `Intl.NumberFormat` with the payload currency.
- Do not turn null amount into `$0.00`.
- Link to the precise invoice record.

---

## 11.3 Invoice Comparison Card

### Trigger

- Compare last two bills
- Why did the bill increase?
- Month-over-month change
- Current invoice compared with prior invoice

### Visual anatomy

```text
Bill comparison
AT&T Business

June                         July
$1,410.10                    $1,535.42

+$125.32      +8.9%

[mini paired bars]

Largest observed driver
Mobility line items +$84.00

[Open both invoices]
```

### Payload

```ts
{
  vendorName;
  currency;
  periodA: {
    invoiceId;
    label;
    date;
    amount;
    href;
  };
  periodB: {
    invoiceId;
    label;
    date;
    amount;
    href;
  };
  differenceAmount;
  percentageChange;
  deterministicDrivers: Array<{
    label;
    differenceAmount;
  }>;
}
```

### Style

- Paired bars use normal CSS divs or SVG, not a heavy chart library
- Positive increase does not always mean success
- Use semantic copy:
  - `Higher by`
  - `Lower by`
  - `No material change`
- Percentage and difference are deterministic

---

## 11.4 Spend Trend Card

### Trigger

- Spending trend
- Last six months
- Has this vendor increased?
- Cost history
- Anomaly discussion

### Visual anatomy

```text
Six-month spend
AWS

$38,420 total
$6,403 monthly average
+11.4% vs prior six months

[restrained line or vertical bars]

Apr   May   Jun   Jul   Aug   Sep
```

### Payload

```ts
{
  scopeLabel;
  currency;
  total;
  average;
  changePercent;
  periods: Array<{
    label;
    amount;
    dateStart;
    dateEnd;
  }>;
  anomalyPeriods: string[];
  href;
}
```

### Chart rules

- SVG or CSS bars
- No gradients
- No misleading truncated axis
- Mark anomalies with a small dot
- Full screen can show labels
- Drawer may show only first/last labels

---

## 11.5 Vendor Summary Card

### Trigger

- Vendor question
- Current vendor page
- Who is this vendor?
- Annual spend and relationship question

### Visual anatomy

```text
Vendor
AT&T Business                         Active

Telecom · att.com
$42,180 annualized spend

12 invoices     2 contracts
Monitoring active

[Open vendor]
```

### Payload

```ts
{
  vendorRelationshipId;
  vendorId;
  name;
  logoUrl;
  category;
  website;
  primaryDomain;
  relationshipStatus;
  annualizedSpend;
  currency;
  invoiceCount;
  contractCount;
  monitoringState;
  catalogStatus;
  href;
}
```

### Style

- Use vendor logo when available
- Fall back to a clean monogram, not a generic building icon in a giant circle
- Candidate status is always visible
- Use the supplied relationship `href`

---

## 11.6 Vendor Candidate Card

### Trigger

- Unknown vendor discovered during ingestion
- Candidate match returned
- User asks what vendor was recognized

### Visual anatomy

```text
New vendor discovered                 Suggested

Datadog
Software · datadoghq.com

Match confidence      89%
Public sources         2
Invoice review         Required

This vendor has not been verified by Costivra.

[Review vendor]  [View public evidence]
```

### Payload

```ts
{
  vendorId;
  organizationVendorId;
  canonicalName;
  category;
  domain;
  confidence;
  evidenceCount;
  catalogStatus;
  reviewRequired;
  href;
  evidenceHref;
}
```

### Rules

- Never label as verified
- Never hide the review requirement
- Do not show confidence with false precision beyond a whole percentage
- If no real public evidence exists, do not render this card

---

## 11.7 Renewal Timeline Card

### Trigger

- Contracts ending soon
- Notice deadlines
- Auto-renewal exposure
- Contract calendar

### Visual anatomy

```text
Upcoming contract deadlines

14 days     Comcast Business
            Notice due Aug 18
            Contract ends Nov 18

43 days     Waste Management
            Notice due Sep 16
            Contract ends Dec 15

[Open contracts]
```

### Payload

```ts
{
  contracts: Array<{
    contractId;
    vendorName;
    contractName;
    endDate;
    noticeDeadline;
    daysUntilNotice;
    autoRenewal;
    status;
    href;
  }>;
}
```

### Style

- Vertical timeline
- Urgent items use a narrow semantic rail
- Do not use a giant red card
- Sort by notice deadline
- Label unknown dates honestly

---

## 11.8 Opportunity Card

### Trigger

- Cost-saving opportunities
- Findings
- Specific opportunity context
- What should we do next?

### Visual anatomy

```text
Cost opportunity                     Under review

Unused mobility lines
Telecom

$4,800 estimated annual value
82% analysis confidence
4 evidence references

[Review opportunity]  [Show evidence]
```

### Required fix

Read:

```text
estimatedAnnualValue
```

not:

```text
estimatedAnnualSavings
```

### Rules

- Label value as estimated unless verified
- Confidence is analysis confidence, not guaranteed savings
- Evidence count links to evidence list
- Avoid green money styling when the opportunity is unverified

---

## 11.9 Savings Summary Card

### Trigger

- Verified savings
- What have we saved?
- Show outcomes
- Explain an accepted savings result

### Visual anatomy

```text
Verified value

$18,420
3 verified outcomes

Telecom             $8,100
Waste               $6,420
Software            $3,900

[Open savings]
```

### Payload

```ts
{
  totalVerifiedValue;
  currency;
  outcomeCount;
  outcomes: Array<{
    savingsId;
    title;
    category;
    amount;
    verifiedAt;
    href;
  }>;
  href;
}
```

### Style

- Verified values may use restrained green
- Never mix estimated and verified values in one total without clear separation

---

## 11.10 Approval Queue Card

### Trigger

- What needs approval?
- Pending actions
- Decisions waiting on me
- Authorization state

### Visual anatomy

```text
Decisions awaiting approval

Terminate unused circuit
$6,200 annual impact
1 of 2 approvals

Renegotiate waste agreement
$4,800 annual impact
Ready for your decision

[Open approval center]
```

### Payload

```ts
{
  actions: Array<{
    actionId;
    title;
    actionType;
    annualValue;
    currency;
    requiredApprovals;
    completedApprovals;
    status;
    href;
  }>;
  href;
}
```

### Rules

- Card is informational
- Do not place an Approve button inside chat unless the authorization workflow is explicitly designed and separately confirmed
- Link to the authoritative approval workspace

---

## 11.11 Document Ingestion Card

### Trigger

Always for attached files.

### Visual anatomy

```text
Invoice ingestion

att-july.pdf

✓ Security scan complete
✓ Invoice recognized
✓ Amount extracted
• Vendor match needs review
• Ready for human review

[Open document]
```

### Payload

```ts
{
  documentId;
  filename;
  mimeType;
  byteSize;
  securityScanStatus;
  extractionStatus;
  classification;
  extractionSummary;
  invoiceId;
  vendorMatchStatus;
  reviewStatus;
  steps: Array<{
    key;
    label;
    state: "complete" | "active" | "warning" | "failed" | "pending";
  }>;
  href;
}
```

### Style

- Compact progress list
- Active step can pulse gently
- Completed steps use check icons
- Do not use a fake progress percentage
- Use `extractionSummary` when available

---

## 11.12 Evidence List Card

### Trigger

- Show evidence
- Why do you think that?
- Source request
- Opportunity explanation
- Contract or invoice support

### Visual anatomy

```text
Evidence

1  AT&T July Invoice                         p. 2
   "Monthly recurring charge ..."

2  Mobility Contract                        p. 7
   "Customer may terminate lines ..."

[Open evidence workspace]
```

### Payload

```ts
{
  items: Array<{
    evidenceId;
    title;
    sourceType;
    excerpt;
    pageNumber;
    href;
  }>;
  href;
}
```

### Style

- Numbered list
- One or two lines of excerpt
- Page/source metadata
- Expand in inspector for more detail
- Never display unsupported model-written quotes

---

## 11.13 Notice Card

### Trigger

- Missing information
- Extraction warning
- Unavailable provider
- No matching records
- Reconciliation issue
- Success confirmation

### Variants

```text
info
success
warning
error
```

### Style

- Narrow semantic border or icon
- No dramatic alert banner for ordinary missing data
- Customer-safe copy
- Optional recovery link
- Errors should remain visible in history

---

# 12. Response composition

## 12.1 Recommended structure

A rich response should follow:

```text
1. One or two concise explanation paragraphs
2. Primary visual card
3. Secondary card or evidence card when useful
4. Citation row
5. Two or three follow-up actions
```

Do not begin with five cards before explaining what they mean.

## 12.2 Card layout

Drawer:

```css
.assistant-card-stack {
  display: grid;
  gap: 10px;
}
```

Full screen:

```css
.assistant-card-stack[data-layout="adaptive"] {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
```

Only use two columns when:

- Cards have similar height
- Both are independently useful
- The conversation width is at least 760px

Invoice comparison, spend trend, renewal timeline, and evidence list should span both columns.

## 12.3 Card ordering

Priority:

1. Current/attached record
2. Primary analytical result
3. Warning or review state
4. Evidence
5. Related opportunity/action
6. General summary

## 12.4 Selected card inspector

In full-screen mode, selecting a card can open a right inspector.

Inspector contains:

- Full record title
- Key fields
- Evidence
- Precise internal link
- Related records
- Close control

Do not duplicate the entire product detail page inside chat.

---

# 13. Conversation canvas overhaul

## 13.1 Full-screen center column

```css
.assistant-conversation-column {
  min-width: 0;
  display: flex;
  justify-content: center;
  background: var(--assistant-bg);
}

.assistant-conversation-frame {
  width: min(100%, 900px);
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--assistant-surface);
}
```

On very wide screens, preserve breathing room around the conversation.

## 13.2 Message design

User:

- Right aligned
- Soft Costivra-blue fill
- Maximum width around 72%
- Radius 16px with one tighter corner
- No giant avatar

Assistant:

- Open text on the surface
- Small Costivra mark/name row
- Maximum readable width
- Cards align with assistant text
- No gray bubble around the whole answer

## 13.3 Message actions

On hover or focus, expose restrained actions:

```text
Copy
Open sources
Retry when failed
```

Do not add rating controls unless the product needs them.

## 13.4 Timestamps

Show time on hover/focus or in conversation details, not under every message by default.

## 13.5 Citations

Replace tiny generic pills with a compact source rail:

```text
Sources  1  AT&T July Invoice, p.2
         2  Mobility Contract, p.7
```

In drawer mode, use horizontally scrollable source chips only when space is limited.

---

# 14. Empty state overhaul

The current empty state is functional but still resembles a generic assistant welcome.

Use a calmer, more product-specific composition.

Suggested copy:

```text
Ask about your costs

Review a bill, compare spend, understand a contract,
or trace a finding back to its evidence.
```

Suggested starters:

```text
Review our latest invoice
Show contracts with upcoming deadlines
Where did recurring spend increase?
```

Visual rules:

- One Costivra mark in a restrained 48px container
- No uppercase marketing eyebrow
- No sparkle or bot icon
- Three prompt rows with domain icons
- Current page context prompt appears first when applicable
- Drawer remains compact
- Full screen may show a small `Recent records` rail beneath starters

---

# 15. Composer overhaul

## 15.1 Floating dock

In full screen, the composer should feel like a floating dock anchored inside the conversation frame.

```css
.assistant-composer-shell {
  margin: 0 18px max(14px, env(safe-area-inset-bottom));
  border: 1px solid var(--assistant-border-strong);
  border-radius: 18px;
  background: rgba(255, 255, 255, .97);
  box-shadow:
    0 8px 28px rgba(15, 23, 42, .08),
    0 1px 2px rgba(15, 23, 42, .04);
}
```

Drawer may use a flatter dock attached to the bottom.

## 15.2 Control arrangement

```text
[attach]  textarea........................  [send]
```

- Attach control inside the composer shell
- Send button 36–40px
- Textarea auto grows
- Subtle focus ring around the whole shell
- Attachment tray sits inside the shell above input row
- Drag-over state changes border and background

## 15.3 Attachment chip redesign

Show:

```text
PDF icon
att-july.pdf
Scanning...
[x]
```

Status-specific copy:

- Uploading
- Security scan
- Processing
- Ready
- Duplicate reused
- Quarantined
- Failed

Do not represent all non-uploading states as the same removable blue chip.

## 15.4 Send readiness

Do not enable Send until all included attachments are:

```text
processed
duplicate
```

Failed/rejected/quarantined files must be removed or retried.

## 15.5 Footer copy

Optional, very quiet:

```text
Costivra answers from your records and source evidence.
```

Do not add a generic legal paragraph beneath every composer.

---

# 16. History rail polish

## 16.1 Information hierarchy

Each row should support:

```text
Title
Last message preview
Relative time
Pin indicator
Context menu
```

Example:

```text
July telecom increase                 2m
AT&T was 8.9% higher than June...
```

## 16.2 Sections

Implement:

```text
Pinned
Today
Yesterday
Previous 7 days
Previous 30 days
Older
```

## 16.3 Row actions

Use a three-dot menu on hover/focus:

```text
Rename
Pin / Unpin
Archive
```

Archived view includes Restore.

## 16.4 Active row

Use:

- Soft blue background
- A narrow 2px accent rail
- Stronger title
- No saturated full-row fill

## 16.5 Loading

Use 4–5 understated skeleton rows.

Do not display a spinner in the center of the entire rail.

---

# 17. Header overhaul

## 17.1 Drawer header

Left:

```text
Costivra mark
Ask Costivra
Current context, when present
```

Right:

```text
New chat
History
Expand
Close
```

## 17.2 Full-screen header

Left:

```text
History collapse/reopen
Costivra mark
Conversation title
Current context
```

Right:

```text
New chat
Return to drawer
Close
```

Do not hide the history toggle in full-screen mode.

## 17.3 Context label

Replace:

```text
invoice: a1b2c3d4
```

with:

```text
Reviewing AT&T Invoice 104832
```

Resolve the label server-side or from already authorized portal data.

## 17.4 Icon buttons

- 34–36px target
- 10px radius
- Visible focus ring
- Tooltip after a short delay
- Active history toggle has subtle selected state

---

# 18. CSS and component cleanup

## 18.1 Remove inline style sprawl

Move assistant styling out of:

- `message-thread.tsx`
- `assistant-composer.tsx`
- `assistant-header.tsx`
- `conversation-rail.tsx`
- `response-block-renderer.tsx`

Use semantic class names and component variants.

## 18.2 Suggested component tree

```text
client-assistant/
  assistant-surface.tsx
  assistant-header.tsx
  assistant-workspace.tsx
  assistant-history-rail.tsx
  assistant-conversation.tsx
  assistant-inspector.tsx
  assistant-composer.tsx
  assistant-empty-state.tsx
  assistant-message.tsx
  assistant-sources.tsx
  assistant-motion.ts
  use-assistant-surface-transition.ts
  cards/
    assistant-card-shell.tsx
    spend-overview-card.tsx
    invoice-summary-card.tsx
    invoice-comparison-card.tsx
    spend-trend-card.tsx
    vendor-summary-card.tsx
    vendor-candidate-card.tsx
    renewal-timeline-card.tsx
    opportunity-card.tsx
    savings-summary-card.tsx
    approval-queue-card.tsx
    document-ingestion-card.tsx
    evidence-list-card.tsx
    notice-card.tsx
    card-registry.tsx
```

Do not make a single 700-line card renderer.

## 18.3 Design tokens

Keep all assistant tokens in one section.

Do not scatter raw hex values through JSX.

## 18.4 Icon consistency

Use domain-specific Lucide icons consistently:

```text
ReceiptText        invoice
ChartNoAxesCombined spend/trend
Building2          vendor
CalendarClock      renewal
Target             opportunity
CheckSquare2       approvals
FileStack          evidence/documents
ShieldCheck        scan/security
AlertTriangle      warning
CircleCheck        ready/verified
```

No sparkles.

---

# 19. Error, loading, and transition states

## 19.1 Thinking state

Keep the current `Costivra is reviewing your records` concept but polish it:

```text
Costivra mark
Reviewing records...
secondary line based on stage
```

Possible stage copy:

```text
Reading your request
Checking invoices
Comparing records
Opening evidence
Preparing the answer
```

Do not fabricate granular progress. Use only stages the server actually knows.

## 19.2 Failed assistant message

Render inside the transcript:

```text
Ask Costivra couldn't complete this analysis.

Your message and files are saved.

[Try again]
```

Do not rely only on a global error string.

## 19.3 Empty card prevention

When hydration returns no card for a requested block:

- Log a safe server error
- Do not render a blank container
- Optionally append a neutral notice card in development/test
- Cover the failure with an integration test

## 19.4 Card loading

When response blocks are pending, render one stable skeleton shaped like the expected card only when the server knows the expected block type.

Do not show random skeleton grids.

---

# 20. Backend files to update

At minimum:

```text
src/lib/client-assistant/types.ts
src/lib/client-assistant/context-builder.ts
src/lib/client-assistant/service.ts
src/lib/client-assistant/presentation-planner.ts
src/lib/client-assistant/block-hydrator.ts
src/lib/client-assistant/schemas.ts
src/components/client-assistant/client-assistant-provider.tsx
src/components/client-assistant/client-assistant-surface.tsx
src/components/client-assistant/assistant-header.tsx
src/components/client-assistant/conversation-rail.tsx
src/components/client-assistant/message-thread.tsx
src/components/client-assistant/assistant-composer.tsx
src/components/client-assistant/response-block-renderer.tsx
src/components/client-assistant/client-assistant.css
```

Add focused card components rather than continually expanding the switch statement.

---

# 21. Presentation planner examples

## 21.1 High-level spend prompt

Input:

```text
Summarize our latest recurring expenses.
```

Planner output when data exists:

```json
[
  {
    "type": "spend_overview",
    "vendorRelationshipIds": [
      "top-vendor-id-1",
      "top-vendor-id-2",
      "top-vendor-id-3"
    ]
  }
]
```

## 21.2 Latest bill

Input:

```text
Show our latest bill.
```

Planner output:

```json
[
  {
    "type": "invoice_summary",
    "invoiceId": "latest-authorized-invoice-id"
  }
]
```

## 21.3 Compare named vendor

Input:

```text
Compare our last two AT&T bills.
```

Planner output:

```json
[
  {
    "type": "invoice_comparison",
    "invoiceIds": [
      "older-authorized-invoice-id",
      "newer-authorized-invoice-id"
    ]
  }
]
```

## 21.4 Contract deadline prompt

Input:

```text
Which contracts have notice deadlines approaching?
```

Planner output:

```json
[
  {
    "type": "renewal_timeline",
    "contractIds": [
      "authorized-contract-id-1",
      "authorized-contract-id-2"
    ]
  }
]
```

## 21.5 Attachment review

Input:

```text
Review this bill.
```

With one attached document and one created invoice:

```json
[
  {
    "type": "document_ingestion",
    "documentId": "authorized-document-id"
  },
  {
    "type": "invoice_summary",
    "invoiceId": "created-invoice-id"
  }
]
```

With candidate vendor:

```json
[
  {
    "type": "document_ingestion",
    "documentId": "authorized-document-id"
  },
  {
    "type": "invoice_summary",
    "invoiceId": "created-invoice-id"
  },
  {
    "type": "vendor_candidate",
    "organizationVendorId": "authorized-relationship-id"
  }
]
```

---

# 22. Runtime validation

The model may still suggest cards, but validate them against the allowlisted context.

Required checks:

- Known block type
- UUID format
- Record ID exists in the current allowed-record map
- Maximum block count
- Correct tuple length for comparison
- Contract/evidence/action list lengths capped
- No duplicate block keys
- No arbitrary URL
- No model-provided amount used as authoritative card data

The hydrator builds the payload from the database.

---

# 23. Accessibility

## 23.1 Surface semantics

Drawer:

```text
role="complementary"
aria-label="Ask Costivra"
```

Full screen:

```text
role="dialog"
aria-modal="true"
aria-labelledby="assistant-title"
```

## 23.2 Focus

- Opening moves focus to the composer
- Full screen traps focus
- History overlay traps focus on narrow screens
- Escape closes inspector, then history overlay, then full screen/drawer
- Closing restores focus to the top-bar trigger
- Card links and menus are reachable by keyboard

## 23.3 Charts

Every mini chart must include a text equivalent:

```text
July spend was $1,535, 8.9% higher than June.
```

Do not rely on shape or color alone.

## 23.4 Status

Use text with color:

```text
Ready
Needs review
Suggested
Unmatched
```

## 23.5 Motion

Respect `prefers-reduced-motion`.

---

# 24. Responsive behavior

## Desktop wide, 1440px+

```text
History 280px
Conversation centered up to 900px
Inspector optional 340px
```

## Laptop, 1024–1439px

```text
History 250px or collapsible
Conversation flexible
Inspector overlays or remains closed by default
```

## Tablet, 768–1023px

```text
History overlay
Conversation full width
Drawer nearly full height and width
```

## Mobile, below 768px

```text
Assistant defaults to full screen
History is a full-height sheet
Inspector becomes a full-height detail sheet
Composer honors safe area
Cards are one column
No horizontal overflow
```

---

# 25. Testing requirements

## 25.1 Unit tests

Add tests for:

- Deterministic spend-overview selection
- Latest invoice selection
- Named vendor matching
- Two-invoice comparison selection
- Contract-deadline selection
- Attachment ingestion card selection
- Candidate-vendor card selection
- Unauthorized model block dropped
- Duplicate cards deduped
- Opportunity renderer reads `estimatedAnnualValue`
- Precise payload `href` is used
- Null amount does not render `$0.00`
- History collapsed state reducer
- Closing phase waits for animation completion
- Reduced-motion close completes immediately

## 25.2 Integration tests

- Text prompt returns a spend card
- Latest invoice prompt returns invoice card
- Compare prompt returns comparison card
- Contract prompt returns timeline card
- Evidence prompt returns evidence list
- Attachment prompt returns ingestion card
- Candidate vendor returns candidate card
- Blocks persist in `chat_messages.response_blocks`
- Restored history renders the same cards
- Invalid model IDs never hydrate

## 25.3 Browser tests

Desktop and mobile:

1. Open drawer.
2. Ask a high-level spend question.
3. Confirm a card is visible.
4. Expand to full screen.
5. Confirm the same card and message remain.
6. Collapse history.
7. Confirm conversation widens.
8. Reopen history.
9. Select another conversation.
10. Return to current conversation.
11. Return to drawer.
12. Close drawer and confirm exit animation completes.
13. Open full screen and close completely.
14. Confirm focus returns to trigger.
15. Confirm reduced-motion mode avoids large transitions.
16. Confirm no console errors.
17. Confirm no horizontal overflow.

## 25.4 Visual QA screenshots

Capture:

```text
Drawer empty state
Drawer text response with invoice card
Drawer attachment ingestion
Full screen with history open
Full screen with history collapsed
Full screen with inspector open
Mobile conversation
Mobile history sheet
Closing-animation start/mid/end frames when possible
```

Review:

- Alignment
- Type hierarchy
- Radius consistency
- Card density
- Icon sizing
- Amount formatting
- Responsive wrapping
- Composer anchoring
- Scroll behavior
- Motion smoothness

---

# 26. Validation commands

Run:

```bash
npm run lint
npm run typecheck
npm test -- --run
npm run test:integration
npm run build
npm run test:e2e
npm run test:e2e:authenticated
```

If the repository currently has a known lint blocker outside the edited scope, repair it when safe or document it precisely. Do not claim a fully green gate when lint is not green.

Use browser QA after automated checks.

---

# 27. Acceptance checklist

## Cards

- [ ] Cards appear in normal relevant conversations
- [ ] High-level spend prompt has a card
- [ ] Latest invoice prompt has a card
- [ ] Comparison prompt has a card
- [ ] Contract deadline prompt has a card
- [ ] Attachment review has an ingestion card
- [ ] Candidate vendor has a Suggested card
- [ ] Evidence request has an evidence card
- [ ] All cards use authoritative payloads
- [ ] All card links are precise
- [ ] All declared block types are implemented or removed
- [ ] No `Record<string, unknown>` reaches the renderer

## Layout

- [ ] Full-screen history can collapse
- [ ] Full-screen history can reopen
- [ ] Narrow-screen history overlays
- [ ] Drawer history replaces canvas
- [ ] Conversation remains centered
- [ ] Inspector is optional
- [ ] No layout crush at laptop width
- [ ] No mobile overflow

## Motion

- [ ] Trigger-to-drawer animation
- [ ] Drawer-to-full-screen morph
- [ ] Full-screen-to-drawer reverse
- [ ] Drawer close animation
- [ ] Full-screen close animation
- [ ] Surface remains mounted through exit
- [ ] Backdrop and shadow animate in sync
- [ ] Reduced motion honored
- [ ] Scroll and draft preserved
- [ ] Focus restored

## Cosmetics

- [ ] Shared card shell
- [ ] Shared card statuses
- [ ] Consistent icon system
- [ ] Minimal inline styles
- [ ] Polished composer dock
- [ ] Designed errors
- [ ] Designed loading states
- [ ] Designed attachment states
- [ ] Better source presentation
- [ ] Intentional typography
- [ ] No generic AI decoration

---

# 28. Suggested commit sequence

```text
feat(assistant): add deterministic visual response planning
feat(assistant-cards): build Costivra response card system
feat(assistant-layout): add collapsible fullscreen history and inspector
polish(assistant): unify drawer fullscreen and close motion
polish(assistant): refine composer messages sources and empty states
test(assistant-ui): prove cards layout motion and accessibility
```

---

# 29. Required completion report

Return:

## Final visual verdict

Use one:

```text
VISUAL POLISH COMPLETE
```

```text
PARTIALLY COMPLETE
```

## Cards implemented

List every implemented card and the prompts that trigger it.

## Card proof

For each major card:

- Prompt used
- Record used
- Screenshot captured
- Drawer result
- Full-screen result
- Mobile result

## Motion proof

Report:

- Open transition
- Drawer/full-screen transition
- Full-screen/drawer transition
- Drawer close
- Full-screen close
- Reduced-motion behavior

## History proof

Report:

- Full-screen collapse
- Full-screen reopen
- Overlay behavior
- Persistence
- Keyboard behavior

## Validation

Provide exact command results and browser viewport results.

## Remaining visual deviations

List only genuine remaining deviations. Do not call the work complete while a visible, fixable issue remains.

---

# 30. Final instruction

Make the experience visibly better, but do not decorate around missing functionality.

The current product already contains the beginnings of cards and motion. Finish the system:

- Give the card planner safe record IDs.
- Make common prompts produce useful visual responses.
- Build a coherent card family.
- Let users control history in full screen.
- Morph one surface between drawer, full screen, and closed.
- Keep the design restrained and evidence-led.
- Browser-test the result until it feels like a mature product rather than a collection of recently added components.

The final effect should be quiet but unmistakable: Ask Costivra should feel faster, smarter, and more trustworthy before the user reads a single sentence.
