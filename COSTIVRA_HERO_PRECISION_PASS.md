# Costivra Homepage Hero Precision Pass

**Purpose:** Tighten the current Costivra homepage hero without redesigning or changing its overall layout.

**Scope:** Hero only.

**Important constraint:** Do **not** alter the current desktop composition, left/right column geometry, horizontal gutters, container width, hero width, or overall visual balance. The reference screenshot was cropped on the right side, and the current layout is considered correct.

This is a precision pass, not a redesign.

---

## 1. Read Before Editing

Before making changes:

1. Read `AGENTS.md`.
2. Read `README.md`.
3. Inspect:
   - `src/components/home-page.tsx`
   - the homepage-related rules in `src/app/globals.css`
   - `src/components/marketing-shell.tsx` only if needed for CTA consistency
4. Preserve unrelated work.
5. Do not introduce new homepage sections.
6. Do not change the Costivra brand system or hero layout.

Preserve the core Costivra product doctrine:

- **AI interprets.**
- **Code calculates.**
- **Policies control.**
- **Humans authorize.**
- **Evidence proves.**
- **Verified is a protected term.**

Any financial number shown in the hero example must be transparently derived, clearly labeled, and never presented as verified savings unless the product has actually verified it.

---

# 2. Preserve These Hero Elements

Do not materially change these elements:

### Eyebrow

> RECURRING BILL REVIEW FOR GROWING BUSINESSES

### Headline

> Find hidden waste in your business bills.

### Existing visual direction

Preserve:

- dark Costivra hero
- current serif display treatment
- current lime accent
- current left/right desktop composition
- current illustrative bill-review concept
- restrained finance-oriented design
- the label **ILLUSTRATIVE EXAMPLE**
- the existing trust row concept
- the current calm, high-trust aesthetic

Do not add gradients, decorative AI effects, sparkles, floating ornaments, stock imagery, new pills, or generic SaaS cards.

---

# 3. Tighten the Supporting Copy

Update the main supporting paragraph to this direction:

> Upload up to three software, internet, or energy bills. Costivra flags price increases, duplicate charges, unused services, and renewal risks, then links every finding to the exact source.

Use this wording unless the existing production flow requires a small factual adjustment.

The copy must remain strictly accurate to the product's supported categories and capabilities.

---

# 4. Improve the Audience Line

Replace the current audience line with:

> Built for owners, finance teams, and operators managing recurring costs across locations, services, and contracts.

Keep this visually secondary to the supporting paragraph.

---

# 5. Primary CTA

Change the primary CTA to:

> **Review 3 bills free**

Keep the arrow icon.

The CTA should clearly communicate that the initial three-bill review is free.

Do not use multiple competing versions of this CTA within the hero.

---

# 6. Secondary CTA

Change the secondary CTA to:

> **See a sample review**

The secondary action should remain visually subordinate to the primary CTA.

If the button scrolls to or opens the illustrative example, ensure the interaction actually works.

---

# 7. Remove the Redundant Sentence Below the CTAs

Remove:

> Create a private workspace, choose up to three bills, and see the next review step.

Do not replace it with another explanatory paragraph.

After removing it, tighten the vertical spacing so the trust row sits naturally beneath the CTA group.

Do not over-compress the hero.

---

# 8. Preserve and Refine the Trust Row

Keep the current three trust ideas:

- Only the documents you choose
- No broad inbox access
- Human approval before outside action

Maintain the current restrained icon treatment.

Do not turn the trust row into cards, badges, or large security blocks.

---

# 9. Upgrade the Illustrative Bill Review Card

The right-side example should tell this complete story:

1. A source bill exists.
2. A recurring charge changed.
3. The previous and current amounts are visible.
4. The arithmetic difference is obvious.
5. The potential annual impact is deterministically calculated.
6. The exact source evidence is visible.
7. A human review is required.
8. The amount is explicitly **not verified savings**.

Do not turn the example into a full dashboard.

---

# 10. Add Previous Bill vs. Current Bill

For the current example where the recurring charge increased by **$200/month**, visibly show the underlying comparison.

Use:

### Previous bill

> $1,310 / month

### Current bill

> $1,510 / month

### Change from prior bill

> +$200 / month

The interface should make the calculation understandable at a glance:

`$1,510 - $1,310 = $200`

Do not rely on AI-generated arithmetic for this number.

If the example is implemented as data, derive the change in deterministic application code rather than storing multiple contradictory hard-coded values.

---

# 11. Replace the Weak "Why It Matters" Copy

Remove or replace:

> This recurring charge is higher than expected.

It repeats information already conveyed by the finding.

Replace that section with a deterministic financial consequence.

Recommended structure:

### POTENTIAL ANNUAL IMPACT

> **+$2,400**

Supporting explanation:

> If the new charge continues for 12 months.

The amount must be calculated from:

`$200 × 12 = $2,400`

This is **potential annual impact**, not verified savings.

Do not label it:

- savings
- recovered value
- verified savings
- guaranteed savings

unless the underlying product state actually supports those terms.

---

# 12. Add Visible Source Evidence

The hero promises that Costivra links findings to the exact source. The illustrative example should demonstrate that visually.

Add a compact evidence block inside the bill-review card.

Recommended content:

### SOURCE EVIDENCE

> May internet bill · Page 2

Then show a short illustrative excerpt such as:

> “Monthly circuit charge: $1,510.00”

The evidence treatment should feel like a real source reference, not a marketing quote.

Prefer a restrained document-reference row, excerpt, or highlighted line.

Do not create a large second document viewer inside the hero.

The evidence should visually connect the finding to:

- document
- page
- source text
- current amount

Keep **ILLUSTRATIVE EXAMPLE** visible so the visitor understands this is demonstration data.

---

# 13. Refine the Bottom-Right Financial State Label

Replace:

> NOT SAVINGS YET

with:

> **POTENTIAL IMPACT · NOT VERIFIED**

This language is more institutional and more aligned with Costivra's financial doctrine.

The label must remain visually secondary.

Do not use a bright warning treatment unless needed for accessibility.

---

# 14. Improve the Review Action

Prefer:

> **Review the source**

instead of:

> Review the bill

This reinforces Costivra's evidence-first positioning.

The action should either:

1. open the relevant source/evidence interaction, or
2. clearly behave as part of an illustrative demo.

Do not leave an obviously clickable control inert.

---

# 15. Interaction Requirement

Audit every interactive-looking control inside the hero.

Any visible control must be one of:

- a working link
- a working button
- an intentional non-interactive visual element that does not look clickable

In particular, verify:

- primary CTA
- secondary CTA
- hero example review/source action

Do not ship stage-prop controls.

---

# 16. Do Not Change

This pass must **not** include:

- changing hero width
- changing desktop gutters
- changing the current two-column layout
- changing the headline
- redesigning the navigation
- redesigning the rest of the homepage
- adding testimonials
- adding logo strips
- adding new customer claims
- adding new supported expense categories
- adding new pricing language
- changing authentication or upload flows
- creating another generic dashboard preview
- adding decorative AI visuals
- fabricating customer results
- presenting the illustrative $2,400 as real customer savings

Stay inside the hero.

---

# 17. Preferred Final Hero Copy

## Eyebrow

**RECURRING BILL REVIEW FOR GROWING BUSINESSES**

## Headline

**Find hidden waste in your business bills.**

## Supporting copy

> Upload up to three software, internet, or energy bills. Costivra flags price increases, duplicate charges, unused services, and renewal risks, then links every finding to the exact source.

## Audience

> Built for owners, finance teams, and operators managing recurring costs across locations, services, and contracts.

## Primary CTA

**Review 3 bills free →**

## Secondary CTA

**See a sample review**

## Trust row

- Only the documents you choose
- No broad inbox access
- Human approval before outside action

---

# 18. Preferred Illustrative Card Content

## Top rail

**BILL REVIEW**

**ILLUSTRATIVE EXAMPLE**

## Source

**MAY INTERNET BILL**

**Source bill attached**

Page 2

## Finding

**NEEDS YOUR REVIEW**

**Monthly circuit charge increased**

## Comparison

**PREVIOUS BILL**

$1,310 / month

**CURRENT BILL**

$1,510 / month

## Change

**CHANGE FROM PRIOR BILL**

**+$200 / month**

## Potential impact

**POTENTIAL ANNUAL IMPACT**

**+$2,400**

If the new charge continues for 12 months.

## Evidence

**SOURCE EVIDENCE**

May internet bill · Page 2

> “Monthly circuit charge: $1,510.00”

## Bottom rail

**Review the source →**

**POTENTIAL IMPACT · NOT VERIFIED**

---

# 19. Design Guidance

Keep the current Costivra visual language.

The right-side example should feel like a financial review instrument, not a marketing card.

Prioritize:

- exact alignment
- restrained borders
- clear numeric hierarchy
- tabular numbers
- source proximity
- calm whitespace
- readable labels
- clear review state
- minimal ornament

The numeric story should visually read:

**$1,310 → $1,510 → +$200/month → +$2,400 potential annual impact**

The evidence should then answer:

**Where did that number come from?**

And the review action should answer:

**What does the user do next?**

---

# 20. Responsive Requirements

Preserve the current responsive strategy, but verify the modified content at:

- desktop
- tablet
- mobile

On mobile:

- keep the headline readable
- do not allow comparison values to overflow
- stack previous/current values if necessary
- keep the evidence reference readable
- keep the CTA hierarchy obvious
- preserve comfortable touch targets
- do not hide the fact that the example is illustrative
- do not allow the potential-impact label to be mistaken for verified savings

Do not simply shrink the desktop card until the text becomes tiny.

---

# 21. Accessibility

Verify:

- WCAG 2.2 AA contrast
- keyboard access to working hero controls
- visible focus states
- semantic button/link usage
- no information communicated solely by lime color
- numeric labels remain understandable with screen readers
- source evidence has meaningful text
- reduced-motion behavior remains respected

---

# 22. Likely Files

Start by inspecting:

- `src/components/home-page.tsx`
- `src/app/globals.css`

Only edit other files if genuinely necessary.

Do not move the homepage into a new component architecture during this pass unless a tiny extraction materially improves clarity without expanding scope.

---

# 23. Validation

Use the repository's actual scripts.

At minimum run:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Run relevant homepage/browser tests if present.

Then inspect the hero in a browser at:

- desktop
- tablet
- mobile

Verify:

- no clipping
- no accidental wrapping
- no overflow
- no broken CTA
- no inert interactive-looking control
- previous/current/change arithmetic is correct
- `$200 × 12 = $2,400`
- potential impact is clearly not verified savings
- source evidence is visible
- `ILLUSTRATIVE EXAMPLE` remains visible
- no unrelated homepage regressions

If the repository has Playwright coverage for the public homepage, run the relevant test as well.

---

# 24. Completion Report

When finished, report:

1. exact files changed
2. hero copy changed
3. comparison UI added
4. deterministic calculation used
5. source-evidence treatment added
6. CTA behavior verified
7. desktop/tablet/mobile visual result
8. exact validation commands and results
9. any remaining limitation

Update `STATUS.md` if required by repository policy.

---

# 25. Stop Condition

After this hero precision pass is complete and validated:

**STOP.**

Do not continue into:

- workflow section
- evidence section below the hero
- pricing
- footer
- navigation redesign
- testimonials
- case studies
- broader design-system refactors

The purpose of this task is to finish the current hero, not redesign the homepage.
