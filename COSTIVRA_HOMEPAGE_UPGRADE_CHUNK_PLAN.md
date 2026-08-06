# Costivra Homepage Upgrade Plan

**Purpose:** Upgrade the Costivra public homepage from a strong early-stage SaaS presentation into a category-leading, enterprise-credible marketing experience without restarting the design, weakening product truth, or adding decorative AI clutter.

**Execution model:** Complete exactly one chunk per coding session. Validate it, update the tracking table, present the result for review, and stop. Do not continue automatically.

**Primary repository:** `powerchoosers/costivra`

**Primary route:** `/`

**Primary audience:** Owners, CFOs, controllers, finance leaders, and operations leaders managing recurring business costs.

**North-star impression:** Costivra is a serious evidence-first operating system for recurring-cost control, not a generic bill scanner, chatbot, brokerage funnel, or AI demo.

---

## 1. Instructions for the coding agent

Read these files before changing anything:

1. `AGENTS.md`
2. `README.md`
3. `STATUS.md`
4. `DECISIONS.md`
5. `COSTIVRA_PILOT_PLATFORM_COMPLETION_SPEC.md`
6. `src/components/home-page.tsx`
7. `src/components/marketing-shell.tsx`
8. `src/components/faq.tsx`
9. `src/app/globals.css`
10. `src/app/layout.tsx`
11. `src/app/opengraph-image.tsx`
12. Existing marketing and public-site tests

Then follow these rules:

- Execute only the first incomplete chunk in the tracking table.
- Do not combine chunks, even when a later chunk appears easy.
- Preserve unrelated work and existing product behavior.
- Do not reset files, discard local changes, or rewrite the site from scratch.
- Do not add fake customer logos, fabricated customer quotes, invented savings, unsupported security claims, or unlabeled demonstration data.
- Do not use sparkle, magic-wand, or generic AI imagery.
- Do not add ornamental bento grids, random gradients, excessive pills, or filler metrics.
- Keep every financial example clearly labeled as illustrative unless it is an approved, consented, public customer result.
- Use the real Costivra mark and existing brand components.
- Keep supported public categories aligned with current product scope: software subscriptions, telecom and internet, and commercial-energy review detection.
- Treat `verified` as a protected word. Do not use it for an estimate, demo, prediction, or unconfirmed result.
- Keep the UCEP relationship outside the homepage value proposition. Do not turn the public site into an energy lead funnel.
- Prefer server-rendered static marketing content. Use client components only for real interaction.
- Do not add a new dependency unless the existing stack cannot complete the chunk.
- Run the narrowest relevant checks while working, then run every check listed in the chunk.
- Update `STATUS.md` with the exact work completed, commands run, results, risks, and next chunk.
- Update `DECISIONS.md` only when the chunk creates a meaningful new product or architecture boundary.
- At the end of the chunk, stop and wait for explicit approval before moving forward.

---

## 2. Chunk tracker

The coding agent must complete only the first row marked `[ ]`.

| Status | Chunk | Outcome |
|---|---:|---|
| [ ] | 0 | Baseline audit, screenshots, and regression map |
| [ ] | 1 | Header and hero become clearer, tighter, and more premium |
| [ ] | 2 | Hero product preview becomes a real interactive public demo |
| [ ] | 3 | Honest proof and verified-value methodology section is added |
| [ ] | 4 | Evidence section and page order tell a stronger product story |
| [ ] | 5 | Workflow section becomes compact, concrete, and product-specific |
| [ ] | 6 | Trust and security section earns enterprise confidence |
| [ ] | 7 | Pricing, navigation, footer, and CTA language become consistent |
| [ ] | 8 | Typography and marketing CSS are consolidated into a durable system |
| [ ] | 9 | Mobile, tablet, accessibility, and motion are production-polished |
| [ ] | 10 | SEO, metadata, performance, and public analytics readiness are tightened |
| [ ] | 11 | Final cross-browser QA, release gate, and production handoff |

When a chunk is completed:

1. Change its status from `[ ]` to `[x]`.
2. Add the commit SHA or branch name in the chunk completion log.
3. Record validation results.
4. Stop.

---

## 3. Global product and design direction

### Preserve

- Dark navy foundation
- Acid-lime action color
- Editorial serif headline character
- Restrained blue support color
- Real Costivra logo and mark
- Evidence-first product story
- Human approval positioning
- Source-linked findings
- Product UI as the primary visual asset
- Calm, precise, finance-oriented tone

### Improve

- Five-second comprehension
- First-viewport balance
- Product-demo credibility
- External trust and proof
- Interaction fidelity
- Page narrative order
- CTA consistency
- Mobile composition
- Accessibility
- CSS maintainability
- Performance and server rendering

### Avoid

- Wholesale aesthetic reset
- Generic AI SaaS visual patterns
- Fake social proof
- Empty visual spectacle
- More gradients merely to look futuristic
- More motion merely to look expensive
- Overly technical labels such as internal extraction versions in buyer-facing areas
- Unlabeled synthetic financial figures
- Pricing language that makes the product sound temporary or unfinished
- Repeating the same doctrine in multiple sections

---

## 4. Homepage narrative target

The final page should answer these questions in this order:

1. What does Costivra review?
2. What expensive problems can it find?
3. How does it show the evidence?
4. Can it act without customer permission?
5. What does a real or properly labeled example look like?
6. How does the process move from bill to finding to approval to result?
7. How is customer data protected?
8. What does it cost?
9. What should the visitor do next?

### Target section order after all chunks

1. Header
2. Hero with interactive product finding
3. Honest proof or verified-value methodology
4. Evidence demonstration by category
5. Compact five-step workflow
6. Security, controls, and human authorization
7. Pricing and free scan offer
8. FAQ
9. Final CTA and footer

Do not perform the full reorder in an earlier chunk. Each chunk has a limited scope.

---

# Chunk 0: Baseline audit and regression map

**Status:** `[ ]`

## Objective

Establish a trustworthy visual and technical baseline before editing the homepage. This chunk changes no public design except for a narrowly required test hook or non-visible accessibility identifier.

## Required work

1. Confirm the current branch, commit, and dirty working-tree state.
2. Read all source files listed in Section 1.
3. Identify the final CSS declarations that currently control:
   - `.marketing-header`
   - `.hero`
   - `.hero-inner`
   - `.hero-copy`
   - `.product-frame`
   - `.workflow`
   - `.evidence-section`
   - `.doctrine`
   - `.pricing`
   - `.faq`
   - `.marketing-footer`
4. Document duplicate or conflicting marketing selectors in `src/app/globals.css`.
5. Record current public homepage copy, section order, CTA labels, and destination routes.
6. Capture baseline screenshots at:
   - Desktop: `1440 x 900`
   - Wide desktop: `1792 x 900`
   - Tablet portrait: `768 x 1024`
   - Mobile: `390 x 844`
7. Exercise these interactions:
   - Header CTA
   - Hero primary CTA
   - Hero secondary CTA
   - Automatic product-preview stage change
   - Evidence category controls
   - FAQ open and close
   - Mobile navigation open and close
8. Record console errors and warnings.
9. Record all visible controls that appear clickable but do not produce a meaningful result.
10. Add or identify an existing public-homepage Playwright test file.

## Deliverables

Create a short section in `STATUS.md` titled:

`Homepage premium-upgrade baseline`

Include:

- Current commit
- Screenshot paths outside committed source
- Current section order
- Current visible copy
- Broken or theatrical controls
- CSS conflict map
- Existing test coverage
- Baseline command results

## Validation

Run:

```bash
npm run typecheck
npm run lint
npm run build
```

Run existing public-site tests when available. Do not create broad tests merely to make the chunk look larger.

## Acceptance criteria

- No intentional visual changes.
- No content changes.
- No route changes.
- Baseline screenshots exist at all four sizes.
- The final active CSS rules for the marketing surface are identified.
- The next chunk can proceed without guessing which styles are actually winning.

## Stop condition

Report the baseline findings, mark Chunk 0 complete, and stop.

---

# Chunk 1: Header and hero refinement

**Status:** `[ ]`

## Objective

Make the first viewport feel more like a category-leading finance platform and less like an oversized startup landing page. Improve comprehension, hierarchy, and balance without redesigning the rest of the homepage.

## Scope

Edit only the header and hero. Do not reorder downstream sections. Do not rebuild the interactive preview yet.

Likely files:

- `src/components/marketing-shell.tsx`
- `src/components/home-page.tsx`
- Marketing-related styles currently in `src/app/globals.css`
- Existing public homepage tests

## Required copy

Use this exact direction unless a current legal or product constraint makes a line inaccurate.

### Hero eyebrow

`Recurring cost intelligence for finance and operations`

### Hero headline

`Put every recurring business cost under command.`

### Hero body

`Costivra reviews bills and contracts for price increases, duplicate or unused services, and renewal risk. Every finding links to the source evidence, and your team approves what happens next.`

### Audience line

`For owners, CFOs, controllers, and operations leaders managing recurring business spend.`

### Primary CTA

`Scan 3 bills free`

Destination: `/scan`

### Secondary CTA

`See a finding from source to result`

Destination: the homepage evidence or demo anchor. Do not send the user to an authenticated route.

### Trust row

- `Only the documents you choose`
- `No broad inbox access`
- `Human approval before outside action`

### Header CTA

Use the same label as the hero primary CTA:

`Scan 3 bills free`

## Visual requirements

### Header

- Keep the floating-header idea but reduce the inflated pill effect.
- Reduce overall height and visual weight slightly.
- Use a more disciplined radius, spacing system, and shadow.
- Keep the logo left, essential navigation centered, sign-in and one CTA right.
- Ensure the header does not cover or awkwardly collide with the hero at common laptop heights.
- Do not add new icons or decorative controls.

Recommended navigation labels:

- `Product`
- `What we review`
- `How it works`
- `Security`
- `Pricing`

Preserve current destinations unless a destination is broken.

### Hero

- Keep the two-column composition.
- Make the headline shorter in physical height than the current version.
- Keep the headline commanding without allowing it to dominate five or six lines on common desktop widths.
- Ensure the full primary CTA, secondary CTA, and trust row are visible in the first `1440 x 900` viewport.
- Preserve the product preview as the visual focal point on the right.
- Reduce dead space above and below the main content.
- Ensure the preview is not hidden beneath operating-system overlays or clipped by the viewport in normal browser conditions.
- Preserve Costivra's navy, lime, pale blue, and serif character.

## Interaction requirements

- Header CTA works.
- Hero primary CTA works.
- Secondary CTA scrolls smoothly to its target while respecting reduced-motion settings.
- Keyboard focus is clear.
- Mobile menu remains functional.

## Tests

Add or update checks for:

- Exact hero headline
- Exact CTA labels
- Primary CTA destination
- Secondary CTA destination or anchor behavior
- Mobile menu open and close
- No horizontal overflow at `390 x 844`

## Validation

```bash
npm run typecheck
npm run lint
npm run build
```

Run the relevant Playwright test at desktop and mobile widths.

Capture before and after screenshots at:

- `1440 x 900`
- `390 x 844`

## Acceptance criteria

- A new visitor can identify Costivra's category and value proposition within five seconds.
- First-viewport CTA hierarchy is obvious.
- Hero copy is accurate and plain-language.
- Header looks custom to Costivra, not like a generic floating SaaS capsule.
- No downstream section is changed.
- No fake proof is introduced.

## Stop condition

Present before and after screenshots, copy diff, route checks, and validation results. Mark Chunk 1 complete and stop.

---

# Chunk 2: Interactive public product demo

**Status:** `[ ]`

## Objective

Turn the hero product preview from a polished stage prop into a credible public demonstration of Costivra's core loop.

## Scope

Edit the hero preview and any new components required for the public demo. Do not add customer proof or reorder downstream sections.

Suggested component structure:

```text
src/components/marketing-demo/
  opportunity-demo.tsx
  source-evidence-drawer.tsx
  demo-approval-state.tsx
  demo-verification-state.tsx
  demo-data.ts
```

The exact structure may differ, but do not leave all demo data and interaction inside one oversized homepage component.

## Demo content rules

- Use synthetic demonstration data only.
- Label the demo clearly as `Illustrative example` or `Interactive example`.
- Never present synthetic values as customer results.
- Do not use real customer documents.
- Do not copy sensitive production records into frontend code.
- Keep calculations deterministic and internally consistent.
- Keep `potential annual value` separate from `verified value`.

## Required public demo flow

The visitor must be able to move through these states:

1. `Source received`
2. `Change detected`
3. `Evidence linked`
4. `Approval required`
5. `Later result checked`

The demo may still auto-advance, but the visitor must also be able to select a stage manually.

## Required interactions

### Stage selection

- Make each stage indicator keyboard accessible.
- Display a clear selected state.
- Pause auto-advance after manual interaction.
- Respect reduced motion.

### View source

Replace the current inert source control with a functional public drawer or modal.

The source view must show:

- A synthetic source document representation
- The relevant line or region highlighted
- The extracted fact
- The evidence reference
- The calculation inputs
- The confidence label
- A clear note that this is an illustrative example

### Approval state

The demo must show:

- What action is proposed
- What data or communication would be involved
- That Costivra has not acted yet
- Who must approve
- A clear illustrative approve or decline state

Do not send any external communication.

### Result state

The demo must distinguish:

- Potential value
- Approved action
- Work in progress
- Verified or unverified outcome

For synthetic demo data, use wording such as:

`Example later invoice confirms the changed charge.`

Do not imply that Costivra has verified a real customer result.

## Public-route behavior

- Do not send unauthenticated visitors to `/app/opportunities` as the primary demo action.
- The demo should remain on the public homepage.
- The final conversion CTA should send the visitor to `/scan`.

## Accessibility requirements

- Modal or drawer uses correct dialog semantics.
- Focus moves into the dialog when opened.
- Escape closes it.
- Focus returns to the triggering control.
- Background content is not keyboard-interactive while the dialog is open.
- All stage controls have accessible names.

## Tests

Test:

- Manual stage selection
- Auto-advance pause after manual interaction
- Source drawer open and close
- Escape close
- Focus return
- Approval-state display
- Result-state display
- Final CTA route
- Reduced-motion behavior when practical

## Validation

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Run the relevant Playwright tests.

Capture:

- Default hero demo
- Source drawer open
- Approval state
- Mobile demo state

## Acceptance criteria

- Every visible control has a meaningful result.
- Synthetic values are clearly labeled.
- The demo explains Costivra's evidence and approval model without requiring a login.
- The source view is the most convincing interaction on the page.
- No unsupported product claim is introduced.

## Stop condition

Present the interaction path, screenshots, accessibility checks, and test results. Mark Chunk 2 complete and stop.

---

# Chunk 3: Honest proof and verified-value methodology

**Status:** `[ ]`

## Objective

Add credibility immediately below the hero without fabricating customer traction. Create a section that can display approved real proof when available and remains honest when it is not.

## Source hierarchy

Before writing the section:

1. Search the repository for approved public case-study content.
2. Check whether a customer result is explicitly consented for public use.
3. Check whether the result is potential, approved, completed, or verified.
4. Do not infer approval from the presence of a record in Supabase or a test fixture.
5. Do not publish a company name, logo, quote, amount, invoice, or identifying detail without explicit approval.

## Required implementation

Create a typed public-proof content model, for example:

```ts
type PublicProof = {
  kind: "approved_case" | "methodology";
  title: string;
  summary: string;
  stage: "potential" | "approved" | "completed" | "verified";
  metrics?: Array<{ label: string; value: string }>;
  sourceLabel?: string;
  permissionReference?: string;
};
```

The exact type may differ, but the content must make proof status explicit.

## Rendering behavior

### When approved public proof exists

Show one strong case, not a wall of logos.

The case should explain:

- What was reviewed
- What issue was found
- What evidence supported it
- What the customer approved
- What later evidence confirmed
- Whether the amount is potential or verified

### When approved proof does not exist

Render a methodology section titled:

`Value is not verified until later evidence proves it.`

Supporting copy:

`Costivra keeps potential value separate from confirmed results. A finding becomes verified only after the approved method and a later bill, credit, contract, or vendor record support the outcome.`

Show a restrained four-step sequence:

1. `Finding identified`
2. `Customer approves the method`
3. `Later evidence arrives`
4. `Result is confirmed or rejected`

Do not add placeholder logos, fake testimonials, or generic statements such as `trusted by leading companies`.

## Visual requirements

- Place the section immediately below the hero.
- Use a quieter light or pale-blue surface to create rhythm after the dark first viewport.
- Prefer one wide proof narrative over a grid of cards.
- Keep metrics secondary to the evidence chain.
- Clearly label `Potential` and `Verified` states.

## Tests

Test both content modes:

- Approved-case mode with synthetic test content
- Methodology fallback mode

Tests must confirm that:

- A missing permission reference prevents approved-case rendering.
- Potential value is never labeled verified.
- The fallback contains no fake customer proof.

## Validation

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Capture desktop and mobile screenshots.

## Acceptance criteria

- The homepage gains credibility without inventing traction.
- Proof status is explicit.
- The section can accept real approved results later without a redesign.
- No production customer data is exposed.

## Stop condition

Report which proof mode is active and why. Mark Chunk 3 complete and stop.

---

# Chunk 4: Evidence section and page-story reorder

**Status:** `[ ]`

## Objective

Move the strongest product explanation closer to the top and make category switching control the actual evidence display.

## Required page-order change

After this chunk, the order should be:

1. Hero
2. Proof or methodology section
3. Evidence section
4. Existing workflow section
5. Remaining sections unchanged

Do not modify the workflow contents yet. Only move it below the evidence section.

## Evidence-section copy

Retain the core headline:

`See the leak. See the evidence. Decide what happens next.`

Keep this as a signature Costivra line.

Replace internal-facing labels such as:

- `EVIDENCE VIEWER · EXTRACTION V3`

with plain buyer-facing language such as:

- `Source-linked finding`
- `Bill and extracted facts`

Do not expose internal version labels unless they answer a customer question.

## Category interaction

Current category rows and evidence tabs must become one synchronized control system.

Required categories:

- Software subscriptions
- Telecom and internet
- Commercial energy review

Requirements:

- Clicking a category changes the evidence viewer.
- Keyboard navigation works.
- Selected state is clear.
- The category label, source bill, extracted facts, issue, and calculation all update together.
- A separate, quiet link may lead to the category solution page.
- Do not make the entire row both a category switcher and a navigation link.

## Evidence viewer requirements

For each category, display:

- Vendor or provider
- Document name
- Relevant charge or term
- Highlighted source row
- Total
- Extracted facts
- Confidence
- Reconciliation or rule status
- Potential value only when supported by deterministic demo logic
- Clear illustrative-example label

Use consistent field labels across categories.

## Visual requirements

- Keep the large editorial headline on the left.
- Keep the evidence viewer as the dominant right-side asset.
- Reduce excessive internal chrome.
- Maintain high text contrast.
- Preserve the dark evidence environment.
- Ensure the sticky left column does not create awkward behavior on medium-height laptops.
- On mobile, category controls must remain visible and usable before the evidence details.

## Tests

Test:

- Each category switch
- Synchronized labels and content
- Selected state
- Keyboard operation
- Mobile layout
- No navigation occurs when switching categories
- Category solution link remains functional

## Validation

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Run relevant Playwright tests and capture all three category states.

## Acceptance criteria

- The visitor sees product evidence before process explanation.
- Category controls are functional rather than decorative.
- Technical jargon is reduced.
- Synthetic examples remain clearly labeled.
- The evidence section feels like one coherent product demonstration.

## Stop condition

Present the new section order and category-state screenshots. Mark Chunk 4 complete and stop.

---

# Chunk 5: Compact, concrete workflow

**Status:** `[ ]`

## Objective

Turn the current large workflow viewport into a compact, product-specific explanation that earns its space.

## Required workflow stages

Keep the five-stage model:

1. Connect
2. Extract
3. Detect
4. Approve
5. Verify

Use this plain-language copy direction:

### Connect

`Add selected bills, contracts, and vendor records.`

### Extract

`Costivra reads the terms and keeps the source attached.`

### Detect

`Rules flag price changes, duplicate costs, unused services, and deadline risk.`

### Approve

`The right person decides whether Costivra should help take the next step.`

### Verify

`A later bill, credit, or contract confirms whether the result occurred.`

## Concrete artifact requirement

Each stage must include one small product-specific artifact, not merely an icon:

- Connect: file or vendor intake state
- Extract: highlighted source term
- Detect: finding label and amount type
- Approve: named approver or approval status
- Verify: later evidence status

These artifacts must be lightweight and code-native. Do not create five large cards.

## Doctrine placement

Remove the repeated full doctrine line from this section if the same doctrine is used later in the trust section.

Do not repeat:

`AI interprets. Code calculates. Policies control. Humans authorize. Evidence proves.`

more than once on the homepage.

## Visual requirements

- Reduce the section's vertical height.
- Preserve a horizontal sequence on wide screens.
- Use a compact vertical sequence on mobile.
- Keep generous spacing without turning the section into an empty slide.
- Make the connection between stages visually clear.
- Avoid large numbered pills and oversized decorative nodes.

## Tests

Test:

- Correct stage order
- Exact stage count
- Mobile ordering
- No content overlap
- Reduced-motion behavior for reveals

## Validation

```bash
npm run typecheck
npm run lint
npm run build
```

Run the homepage Playwright test at desktop, tablet, and mobile sizes.

## Acceptance criteria

- The workflow is understandable in one scan.
- Every stage feels specific to Costivra.
- The section uses less vertical space than before.
- No doctrine duplication remains.

## Stop condition

Show before and after section-height screenshots and validation results. Mark Chunk 5 complete and stop.

---

# Chunk 6: Enterprise trust and security section

**Status:** `[ ]`

## Objective

Turn Costivra's product doctrine into plain-language enterprise trust, using only claims supported by the implementation and repository rules.

## Required headline

`Built for decisions that affect real money.`

## Required supporting copy

`AI can read and explain the documents. Deterministic code calculates the amounts. Policies define what is allowed. Your team approves consequential actions. The source and audit history remain attached.`

## Required trust areas

Use a restrained open layout or single band, not a generic card grid.

Include only supported claims:

1. `Private documents`
   - Files remain private and use controlled access.
2. `Tenant-isolated records`
   - Customer records are separated by organization boundaries and database policies.
3. `Human approval`
   - Consequential outside actions require the configured approval.
4. `Source-linked findings`
   - Material claims remain connected to evidence and calculation details.
5. `Audit history`
   - Decisions, corrections, approvals, and outside effects are recorded.
6. `No broad inbox access required`
   - Customers can begin with selected uploads and controlled forwarding.

## Required disclosure

Add a plain statement near the section CTA:

`Costivra does not automatically cancel services, sign contracts, change payment instructions, or send customer records to an outside advisor.`

This statement must remain accurate. If any current product behavior conflicts, stop and report the conflict instead of changing the copy silently.

## Security CTA

`Review Costivra security`

Destination: `/security`

## Certification rule

Do not add:

- SOC 2 badge
- ISO badge
- HIPAA badge
- GDPR-compliant badge
- bank-grade security claim
- enterprise-grade security claim
- encryption claim beyond what is documented

unless the current repository and approved documentation explicitly support it.

## Visual requirements

- Preserve acid-lime as a distinctive Costivra moment only if contrast and hierarchy remain excellent.
- Reduce visual noise.
- Use one doctrine statement, not several repeated slogans.
- Use typography and spacing instead of decorative icons wherever possible.
- Keep the security CTA visible but secondary to the homepage conversion CTA.

## Tests

Test:

- Security CTA route
- Required trust statements present
- Prohibited automatic-action language absent
- No unsupported certification text
- Mobile readability and contrast

## Validation

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Capture desktop and mobile screenshots.

## Acceptance criteria

- A finance leader understands what Costivra can and cannot do.
- The section feels operational, not promotional.
- Every material trust claim is supportable.
- Doctrine appears only once on the homepage.

## Stop condition

Report each public trust claim and its implementation basis. Mark Chunk 6 complete and stop.

---

# Chunk 7: Pricing, navigation, footer, and CTA consistency

**Status:** `[ ]`

## Objective

Remove small inconsistencies that make a polished product feel early. Standardize terminology, routes, and the conversion path.

## CTA vocabulary

Use one primary homepage CTA everywhere:

`Scan 3 bills free`

Apply it to:

- Header
- Hero
- Pricing section
- Final CTA
- Footer CTA

Destination: `/scan`

Do not alternate among:

- Scan three bills free
- Upload 3 bills for a free review
- Start with three bills
- Cost leak scan

unless the phrase describes a different action.

## Secondary CTA vocabulary

Use:

`See how it works`

or:

`See a finding from source to result`

Use each phrase only where it accurately matches the destination.

## Pricing requirements

- Keep the existing tier names and prices unless the founder has made a separate pricing decision.
- Remove or relocate `Pilot pricing shown for product evaluation` from the main homepage presentation.
- Do not rename it `Founding customer pricing` unless that is an approved business offer.
- Add a short accuracy note only where needed, for example:
  - `Plans shown for the current Costivra offering. See pricing for details.`
- Keep potential savings separate from subscription pricing.
- Do not add guaranteed-savings language.

## Navigation requirements

- Use short, clear labels.
- Keep one primary CTA.
- Verify every public navigation destination.
- Remove dead links.
- Avoid duplicate destinations under confusing labels.
- Keep `Sign in` visually secondary.

Recommended top navigation:

- Product
- What we review
- How it works
- Security
- Pricing

## Footer requirements

- Remove redundant links when the same destination appears twice without a clear reason.
- Keep legal links accurate.
- Keep UCEP disclosure available in the legal area, not promoted as a core product feature.
- Confirm the current year and company name.
- Keep the brand statement concise.

Recommended footer brand statement:

`Evidence-first control for recurring business costs.`

Recommended final CTA headline:

`Start with three bills. Keep the evidence.`

Supporting copy:

`Costivra reviews the selected documents, shows what changed, and keeps every finding tied to the source.`

## Tests

Create a route matrix test for every homepage and footer link.

Test:

- All primary CTAs use the same label and route.
- No public link returns a 404.
- Sign-in remains `/login`.
- UCEP disclosure remains accessible.
- Mobile navigation matches desktop destinations.

## Validation

```bash
npm run typecheck
npm run lint
npm run build
```

Run public-route Playwright tests.

## Acceptance criteria

- CTA language is consistent.
- Pricing no longer sounds temporary or improvised.
- Header and footer navigation feel deliberate.
- No dead public links remain.

## Stop condition

Present the CTA and route matrix. Mark Chunk 7 complete and stop.

---

# Chunk 8: Typography and marketing CSS consolidation

**Status:** `[ ]`

## Objective

Replace layered prototype-style marketing CSS with a durable, explicit design system while preserving the approved visual result from Chunks 1 through 7.

## Important constraint

This is a refactor and fidelity chunk. It must not casually redesign the homepage.

## Typography system

Establish three explicit roles:

1. Display typography
2. Interface and body typography
3. Data and evidence typography

Recommended direction:

- Display: an intentional serif loaded through `next/font`, such as `Newsreader`, after visual comparison
- Interface and body: the currently approved sans family, preferably one family used consistently
- Data and evidence: `JetBrains Mono` or the existing approved mono family

Requirements:

- Do not rely on `Georgia`, `Courier New`, or browser-dependent serif fallbacks as the primary brand experience.
- Do not load an additional font if browser comparison shows no meaningful improvement.
- Set explicit variables such as:

```css
--font-display
--font-sans
--font-mono
```

- Use the variables consistently across marketing headings, body, controls, evidence labels, and pricing.

## CSS architecture

Create a clear marketing-style boundary, for example:

```text
src/app/marketing.css
```

or another repository-consistent location.

Requirements:

- Move final marketing-surface declarations out of the sedimentary section of `globals.css`.
- Remove obsolete duplicate declarations after confirming they are unused.
- Do not move authenticated-app or Manage portal styles in this chunk.
- Keep class behavior unchanged unless the chunk explicitly documents a visual correction.
- Establish tokens for:
  - Dark background
  - Light surface
  - Primary text
  - Muted text
  - Border
  - Lime action
  - Blue support
  - Radius scale
  - Shadow scale
  - Marketing spacing scale
  - Motion timing

## Component cleanup

- Remove inline style objects from homepage marketing components where they represent reusable visual decisions.
- Keep true one-off data values out of CSS.
- Break `home-page.tsx` into focused sections if it remains overly large.
- Do not create dozens of tiny components that make simple markup harder to follow.

Suggested boundaries:

- `HomeHero`
- `PublicProofSection`
- `EvidenceSection`
- `WorkflowSection`
- `TrustSection`
- `PricingSection`

## Regression method

Compare the refactored result against screenshots from the end of Chunk 7 at:

- `1440 x 900`
- `1792 x 900`
- `768 x 1024`
- `390 x 844`

Keep a fidelity ledger:

| Area | Before | After | Result |
|---|---|---|---|
| Header geometry | screenshot | screenshot | match/fix |
| Hero line breaks | screenshot | screenshot | match/fix |
| Product preview | screenshot | screenshot | match/fix |
| Evidence viewer | screenshot | screenshot | match/fix |
| Workflow | screenshot | screenshot | match/fix |
| Trust section | screenshot | screenshot | match/fix |
| Pricing | screenshot | screenshot | match/fix |
| Footer | screenshot | screenshot | match/fix |

## Tests and validation

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Run all public-homepage Playwright tests.

## Acceptance criteria

- No material visual regression.
- Marketing CSS has one clear source of truth.
- Obsolete duplicate rules are removed.
- Typography is consistent across operating systems.
- Homepage sections have understandable component ownership.
- Authenticated product styling remains untouched.

## Stop condition

Present the fidelity ledger and CSS size or selector-duplication improvement. Mark Chunk 8 complete and stop.

---

# Chunk 9: Responsive, accessibility, and motion polish

**Status:** `[ ]`

## Objective

Make the homepage feel purpose-built at desktop, tablet, and mobile sizes rather than compressed from one desktop design.

## Required viewport matrix

Test at minimum:

- `1792 x 900`
- `1440 x 900`
- `1280 x 800`
- `1024 x 768`
- `768 x 1024`
- `430 x 932`
- `390 x 844`
- `360 x 800`

## Responsive requirements

### Header

- Logo remains readable.
- Mobile menu has a comfortable touch target.
- Drawer fits within the viewport.
- Primary CTA remains available inside the mobile drawer.
- No links are clipped.

### Hero

- The headline does not create awkward single-word lines.
- Primary CTA appears before the product demo on mobile.
- Trust lines remain readable.
- Demo controls are usable by touch.
- No horizontal overflow.

### Proof section

- Proof status remains clear.
- Metrics do not become tiny tiles.
- Methodology sequence stacks logically.

### Evidence section

- Category controls remain visible.
- The source document and facts remain understandable.
- Long vendor names and amounts wrap or truncate deliberately.
- No sticky behavior traps the user on tablet.

### Workflow

- Stage order remains obvious.
- Artifacts stay aligned.
- The section does not become a repetitive card stack.

### Pricing

- Prices, plan names, and CTAs remain readable.
- Mobile plan order is intentional.

### Footer

- Link columns collapse cleanly.
- Legal and disclosure links remain available.

## Accessibility requirements

Meet WCAG 2.2 AA expectations for the homepage:

- Logical heading order
- Landmark structure
- Keyboard access
- Visible focus
- Button and link names
- Dialog semantics
- Escape behavior
- Focus return
- Color contrast
- Text resizing
- Reduced motion
- Touch target size
- Form and control labels
- No information communicated by color alone

## Motion requirements

- Motion must explain state or hierarchy.
- Remove any animation that only decorates empty space.
- Auto-advancing demo motion pauses after user interaction.
- `prefers-reduced-motion` disables or simplifies non-essential animation.
- Smooth scrolling must not override reduced-motion preferences.

## Testing

Add automated accessibility checks when the repository already supports them. Do not add a large dependency only for one superficial scan.

Test:

- Tab order
- Mobile navigation
- Demo drawer
- Category switching
- FAQ
- Reduced-motion mode
- No horizontal overflow
- Zoom or text resizing at practical levels

## Validation

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

If the complete E2E suite requires unavailable secrets, run the public subset and report the exact limitation.

## Acceptance criteria

- No clipped primary content at any required viewport.
- No horizontal scrolling caused by the homepage.
- All interactions work by keyboard and touch.
- Focus and motion behavior are production-ready.
- Mobile feels intentionally designed.

## Stop condition

Present a viewport checklist, accessibility findings, and screenshots. Mark Chunk 9 complete and stop.

---

# Chunk 10: SEO, metadata, performance, and analytics readiness

**Status:** `[ ]`

## Objective

Make the public homepage technically worthy of the visual presentation and ready to measure real buyer behavior without weakening privacy.

## Server-rendering requirements

The current homepage should not remain entirely client-rendered merely because two sections use state.

Refactor so that:

- Static homepage sections render as server components where appropriate.
- Interactive product demo is a client component.
- Interactive evidence switcher is a client component.
- FAQ remains client-side only if interaction requires it.
- Static copy and structure do not require hydration.

## Metadata requirements

Align metadata with the approved homepage positioning.

Recommended title direction:

`Costivra | Recurring business costs, under command`

Recommended description direction:

`Costivra reviews recurring business bills and contracts for price increases, duplicate or unused services, and renewal risk, with source-linked findings and human approval.`

Requirements:

- Canonical URL uses `https://costivra.ai`.
- Open Graph title and description match the actual homepage.
- Twitter metadata matches.
- Theme color reflects the public experience without breaking authenticated routes.
- Open Graph image uses the real Costivra mark and approved visual system.
- Do not place unsupported savings numbers in metadata or social images.

## Structured-data requirements

Add only accurate structured data.

Possible types:

- `Organization`
- `SoftwareApplication`

Do not add ratings, reviews, price ranges, customer counts, or awards that are not supported.

## Performance requirements

- Avoid unnecessary hydration.
- Avoid layout shift in the header, hero, logo, and product preview.
- Keep first-viewport assets efficient.
- Do not rasterize code-native interface text.
- Use responsive image handling for any real images.
- Avoid loading the evidence demo or below-fold interactions before needed when it does not harm UX.
- Keep font loading stable and avoid invisible text.

## Analytics readiness

Instrument only the key public funnel events if an approved analytics system already exists:

- Header scan CTA clicked
- Hero scan CTA clicked
- Secondary demo CTA clicked
- Source evidence opened
- Demo stage selected
- Category selected
- Pricing CTA clicked
- Security page clicked
- Scan flow started

Requirements:

- Use event names that describe user intent.
- Do not send document content, account identifiers, customer data, or sensitive values.
- Do not add a new analytics vendor without approval.
- If no analytics system exists, create an event interface and document the gap rather than installing one silently.

## Tests

Test:

- Metadata output
- Canonical URL
- Structured data syntax
- CTA event calls through a mock adapter
- No sensitive payload fields
- Server-rendered homepage copy is present before client interaction

## Validation

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Run a production build and inspect the homepage route output.

Use Lighthouse or an equivalent local audit when available. Record the environment and do not treat one machine's score as a universal guarantee.

## Acceptance criteria

- Static marketing content is not unnecessarily hydrated.
- Metadata accurately reflects the product.
- No unsupported claims appear in structured data.
- Funnel events are measurable or the analytics gap is explicitly documented.
- No sensitive data enters analytics.

## Stop condition

Present the server/client component map, metadata diff, and performance findings. Mark Chunk 10 complete and stop.

---

# Chunk 11: Final QA and production handoff

**Status:** `[ ]`

## Objective

Prove that the upgraded homepage is coherent, functional, honest, accessible, and ready for production review.

## Final functional flow

Test this public journey:

1. Visitor lands on `/`.
2. Visitor understands what Costivra reviews.
3. Visitor sees a finding and potential value label.
4. Visitor opens the source evidence.
5. Visitor understands approval is required.
6. Visitor changes categories.
7. Visitor reviews the workflow.
8. Visitor reviews security boundaries.
9. Visitor reviews pricing.
10. Visitor starts the free three-bill scan.

## Final copy audit

Confirm:

- One primary CTA label
- One clear product category statement
- No unsupported urgency
- No guaranteed savings
- No fake customer proof
- No unlabeled demo figures
- Potential and verified values remain distinct
- No claim that Costivra acts without approval
- No hidden UCEP promotion
- No unsupported certification
- No duplicate doctrine statement

## Final visual audit

Inspect:

- Header precision
- Hero line breaks
- First-viewport balance
- Product-demo clarity
- Proof section honesty
- Evidence viewer legibility
- Workflow density
- Security hierarchy
- Pricing clarity
- Footer completeness
- Hover and focus states
- Desktop, tablet, and mobile rhythm

## Final route audit

Verify every homepage route and anchor, including:

- `/product`
- `/solutions`
- `/how-it-works`
- `/security`
- `/pricing`
- `/scan`
- `/login`
- `/about`
- `/case-studies`
- `/partners`
- `/contact`
- `/help`
- `/status`
- `/privacy`
- `/terms`
- `/ucep-disclosure`

If a route does not exist or is not ready, remove or replace the link instead of shipping a dead path.

## Required commands

Run the repository's actual applicable suite:

```bash
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run test:e2e
npm run build
```

If a command is unavailable or requires credentials not present in the environment:

- Do not claim it passed.
- Record the exact reason.
- Run the closest valid public-site subset.
- Keep the release gate open until the required check is completed in an appropriate environment.

## Browser QA

Test at minimum:

- Chromium desktop
- Chromium mobile emulation
- One WebKit or Safari-equivalent run when available
- One Firefox run when available

Capture final screenshots at:

- `1792 x 900`
- `1440 x 900`
- `768 x 1024`
- `390 x 844`

## Production review packet

Prepare a concise final report containing:

1. Summary of visible improvements
2. Exact files changed
3. Before and after screenshots
4. Copy changes
5. Interaction path tested
6. Accessibility results
7. Validation commands and results
8. Analytics events added or deferred
9. Known limitations
10. Remaining proof gap, if no approved case study exists
11. Recommended next experiment

## Release rule

Do not push to `main` or claim production readiness unless the user explicitly requested deployment and every applicable release gate is complete.

## Acceptance criteria

- Homepage feels coherent across every section.
- All visible controls work.
- No claim exceeds the evidence.
- Mobile and desktop are polished.
- Required checks pass or blockers are explicit.
- `STATUS.md` reflects the final state.

## Stop condition

Mark Chunk 11 complete, present the full review packet, and stop.

---

## 5. Chunk completion log

Add one entry after each completed chunk.

### Template

```md
## Chunk [number] completion

- Date:
- Branch:
- Commit:
- Files changed:
- User-visible result:
- Commands run:
- Results:
- Browser sizes checked:
- Screenshots:
- Known risks:
- Next chunk:
- Approval required before continuing: Yes
```

---

## 6. Required end-of-session response format

After completing one chunk, respond with:

### Completed

State the single chunk completed and the user-visible result.

### Changed

List the relevant files and meaningful changes.

### Verified

List exact commands, browser sizes, interactions, and results.

### Evidence

Provide screenshots or paths to screenshots.

### Remaining risk

State anything not verified, any dependency on real proof, and any open issue.

### Stop

End with:

`Stopped after Chunk [number]. The next chunk has not been started.`

Do not offer to continue automatically. Wait for the user to approve the next chunk.

---

## 7. Final quality standard

The final homepage should not merely look expensive. It should make Costivra feel trustworthy enough for a finance leader to upload real operating-expense documents.

The test is not whether the page has enough animation, gradients, or polish. The test is whether a skeptical visitor can quickly understand:

- What Costivra reviews
- What it can find
- Where the evidence comes from
- How amounts are calculated
- What requires approval
- What counts as verified
- How customer data is protected
- What the visitor should do next

Every completed chunk must move the homepage toward that standard without weakening product truth.
