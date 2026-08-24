# Costivra public-to-customer conversion audit

Date: 2026-08-23  
Scope: `costivra.ai` public journey through first customer action  
Method: parallel passes across the live public pages, the implemented marketing components, the acquisition funnel, trust/accessibility risks, and the first-value experience. No code was changed.

## Executive conclusion

Costivra already has the beginnings of a credible “next big thing” story: it turns a messy recurring bill into a source-linked question, keeps the evidence attached, and leaves consequential decisions with the customer. That is a differentiated and trustworthy position.

The site is not yet optimized for paid acquisition. It currently makes a visitor understand the whole Costivra platform before giving them one sharply specific reason to start. The homepage has strong proof language and a compelling review artifact, but the conversion path is still asking for trust in the product before the visitor has experienced a small win.

Recommendation: send broad ads to a dedicated `/scan`-style landing page, but make that page campaign-specific and outcome-specific. Do not send cold paid traffic to the homepage, `/pricing`, or `/signup` as the primary destination. If only one destination can be used immediately, use `/scan` with improved campaign framing; a new dedicated page is the stronger option before spending materially on ads.

## What the current journey does

1. A visitor reaches the homepage.
2. The headline promises recurring bill review and names three supported starting categories: software, internet, and energy.
3. The visitor can inspect an illustrative evidence review showing a vendor, source document, detected issue, confidence, calculation, and “potential—not verified” language.
4. The visitor is asked to start with three bills.
5. `/scan` explains that the user must create a private workspace before upload.
6. `/signup` collects name, company, work email, and a password. Google/Microsoft options may be available depending on configuration.
7. The user enters the product and uploads selected documents.
8. Ongoing monitoring and paid plans are introduced after the free review rather than before it.

## What is working

### 1. The trust position is unusually strong

The site consistently says that source evidence remains attached, potential value is not verified value, humans approve consequential outside actions, and broad inbox access is not required. This is excellent for finance leaders who distrust black-box savings claims.

### 2. The homepage contains a real product proof pattern

The illustrative review is the best conversion asset on the site. It answers the questions a serious buyer has:

- What document was reviewed?
- What issue was found?
- What amount is involved?
- What is the confidence level?
- What is the calculation?
- What remains uncertain?
- What happens next?

That is much more persuasive than generic “AI saves money” copy.

### 3. The first action is contained and understandable

“Start with three bills” is a good low-risk entry point. No card, selected documents only, private workspace, and no vendor contact without approval are all useful friction reducers.

### 4. The product feels operational rather than decorative

The live pages are calm, evidence-led, and more credible than a typical AI landing page. The site avoids unsupported customer logos, invented case studies, and guaranteed savings claims.

### 5. Security and governance are visible

The security page gives concrete concepts—tenant isolation, private documents, least privilege, human authorization, provenance, and untrusted-content defense. This is valuable for conversion with controllers, finance leaders, and operators handling sensitive bills.

## Main conversion gaps

Priority uses P0 for a likely paid-acquisition blocker, P1 for a major conversion improvement, and P2 for useful polish.

### P0 — Paid traffic has no campaign-specific promise

The homepage speaks to recurring costs in general. An ad about unused software seats, telecom surcharges, or energy bills will create a message mismatch when the visitor lands on a broad platform page.

Impact: lower trust, lower relevance, and weaker ad performance.

Recommendation: create focused landing variants, for example:

- `/scan/software` — “Find unused software seats before renewal.”
- `/scan/telecom` — “See which telecom charges deserve a review.”
- `/scan/energy` — “Prepare a commercial energy review from the bills you already have.”

Each should preserve the same underlying workflow but change the hero, sample evidence, document examples, FAQ, and CTA language.

### P0 — The first-value promise is not concrete enough

“Start with three bills” tells the visitor what to upload, not what they should expect to learn. The user needs a sharper first-win promise.

Recommended framing:

> Upload up to three current bills. Costivra shows what changed, what may be costing you, what supports the finding, and what still needs a human check.

Avoid promising a savings amount or guaranteed leak. Promise a useful, reviewable answer.

### P0 — The site does not yet prove that the product has real customer momentum

The visitor can feel that the product is thoughtfully designed, but not necessarily that other businesses use it or that the workflow has produced real outcomes. The case-studies page correctly refuses to invent proof, but the absence is still a conversion gap.

Recommendation: add the first consented proof package as soon as it exists. It should show source, finding, approved action, and later evidence—not just a large savings number. Until then, use transparent language such as “Built for an evidence-backed pilot” and identify what is illustrative.

### P1 — The signup gate arrives before the visitor has earned enough confidence

The scan flow requires account creation before upload. This is defensible for privacy and document handling, but it creates a commitment before the visitor has seen a personalized result.

Recommendation: keep the account gate for private document handling, but explain it as a security benefit immediately beside the form:

> We create the private workspace before upload so your bills never pass through an unprotected public form.

Also state the expected time, supported file types, maximum document count, and what happens after upload. The current page explains these items, but they should be visually adjacent to the CTA and form rather than discovered in surrounding copy.

### P1 — “Three bills” is slightly ambiguous

The site alternates between bills, contracts, documents, accounts, services, and meters. A cold visitor may not know whether a contract counts as one of the three, whether multiple pages count separately, or which bill is best to choose.

Recommendation: add a short selection guide:

- Pick a recent invoice or statement.
- Include the agreement if the question involves renewal or contract terms.
- Start with the vendor or category that changed recently.
- One uploaded file counts as one selected document.

### P1 — The commercial category story is broader than the immediate proof

The public navigation includes many planned or broad categories, while the strongest immediately understandable proof is software, telecom/internet, and energy review. Broad navigation can make the product feel larger, but it can also make the promise feel less proven.

Recommendation: keep the broader roadmap discoverable, but make the acquisition path lead with the three categories the free review actually supports. Put “planned” labels close to planned category links, not only in navigation copy.

### P1 — The ad destination needs a tighter handoff to the actual product

The homepage shows a product walkthrough and an illustrative bill review, but the visitor does not clearly see the exact sequence after clicking the CTA: account, upload, processing, review, decision. The `/how-it-works` page does explain the sequence, but it is a secondary educational page rather than a high-intent acquisition page.

Recommendation: add a compact “What happens after you click” strip directly on the ad landing page:

1. Create a private workspace.
2. Upload up to three current documents.
3. Review source-linked findings and uncertainty.
4. Decide what deserves action.

### P1 — There is no strong objection-handling block on the acquisition path

Important objections are present across the site but not concentrated near the conversion point:

- Is this a savings guarantee?
- Does it need my entire inbox?
- Will it contact my vendor?
- Is my data private?
- Do I need a contract or all historical bills?
- What if the extracted information is wrong?
- What does “verified” mean?

Recommendation: add six plain-language FAQs to the campaign landing page, with answers no longer than necessary.

### P2 — The “next big thing” feeling should come from the operating model, not hype

The product has a genuinely differentiated idea: every recurring cost becomes a living record with source, owner, question, decision, and later proof. That idea is present, but distributed across pages.

Recommendation: express it once in a memorable sentence:

> Costivra turns recurring bills into accountable operating records.

Then show the progression: source → question → decision → proof. This creates ambition and product distinctiveness without unsupported “revolutionary” language.

### P2 — The homepage should make the audience self-select faster

The site speaks to growing businesses generally. Paid traffic will perform better if visitors can recognize themselves quickly.

Recommendation: add a small audience selector or three concise paths:

- Finance / controller: prepare reviewable cost findings.
- Operations: keep owners and renewal deadlines visible.
- Business owner: see where recurring spend needs attention.

Avoid adding a long industry chooser that delays the first action.

## Trust, accessibility, and risk notes

- Keep the “illustrative example” label attached to all sample findings and sample documents.
- Do not use the sample dollar values in ad creative as if they were customer outcomes.
- Keep confidence distinct from correctness and savings verification. The site generally does this well.
- Make the account form’s error, loading, password, and email-confirmation states explicit and easy to recover from.
- Verify the free-review path on mobile, especially the upload explanation, account form, and first post-signup state.
- Keep privacy and security claims aligned with what is actually deployed. Public legal copy currently contains launch-draft language; that can reduce enterprise trust if visitors notice it.
- Add clear analytics events for ad landing view, CTA click, signup start, signup completion, email confirmation, first upload, upload completion, first review opened, and first finding action. Without these, “conversion” cannot be diagnosed beyond account creation.

## Recommended ad destination

### Best answer: a new campaign-specific landing page

Create a dedicated landing page for the exact ad promise. It should be a focused variant of the current free scan flow, not a separate product or a generic marketing microsite.

Suggested structure:

1. One category-specific headline.
2. One sentence describing the first review outcome.
3. One CTA: “Review 3 bills free.”
4. The matching evidence example.
5. A four-step “what happens next” explanation.
6. Privacy, no-card, no-broad-inbox, and approval assurances.
7. Six objection-handling FAQs.
8. The account-creation CTA repeated once after proof.

### If advertising starts before the new page exists

Send traffic to `/scan`, not `/`, `/pricing`, or `/signup`. Use ad copy that exactly matches the current page:

> Review up to three current software, telecom, or energy bills. Keep the source evidence attached. No card required.

Do not send cold traffic directly to `/signup`: it asks for commitment before explaining enough of the value, and it removes the strongest evidence demonstration from the decision path.

## Suggested ad-to-page matrix

| Ad intent | Destination | Reason |
|---|---|---|
| Broad recurring-cost problem | New `/scan` campaign page | Keeps promise and proof aligned while preserving the free-review CTA |
| Unused software seats | New `/scan/software` | Shows the relevant seat/license evidence and renewal context |
| Telecom or internet bill issue | New `/scan/telecom` | Uses the correct charge and contract-review example |
| Commercial energy concern | New `/scan/energy` | Sets expectations around evidence-backed review, professional uncertainty, and consent |
| High-intent brand search | `/` or `/pricing` | These visitors may want broader product and commercial context |
| Security or procurement search | `/security` then `/contact` | Supports evaluation, not first-touch conversion |

## Prioritized next steps before meaningful ad spend

1. Create one campaign-specific landing page for the first paid category.
2. Sharpen the first-win promise and clarify exactly what the three-document review produces.
3. Put the four-step post-click sequence and objection FAQs beside the CTA.
4. Add funnel instrumentation through first finding viewed and first action—not only signup.
5. Publish one real, consented, evidence-backed customer story when available.
6. Run a small traffic test and compare landing-page-to-signup, signup-to-confirmation, first-upload, and first-finding rates.

## Bottom line

Costivra does feel more thoughtful and trustworthy than a generic cost-savings or AI product. The missing ingredient is not more features or more hype. It is a tighter acquisition promise, a faster path to a concrete first win, and visible real-world proof as soon as it can be honestly published.

For ads, use a new campaign-specific free-review landing page. Until that exists, use `/scan` with tightly matched ad copy and do not use `/signup` as the cold-traffic destination.

## Evidence and limitations

- Live public pages checked on 2026-08-23: `/`, `/how-it-works`, `/scan`, `/pricing`, `/security`, and `/signup`; all returned HTTP 200.
- Repository implementation inspected: `src/app/page.tsx`, `src/app/[...slug]/page.tsx`, `src/components/home-page.tsx`, `src/components/marketing-pages.tsx`, and `src/components/marketing-shell.tsx`.
- This was a read-only audit. No code, deployment, analytics configuration, or external ad account was changed.
- A literal sub-agent runtime was not available in this session; the audit used parallel independent inspection passes instead.
