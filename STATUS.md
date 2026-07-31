# Costivra Status

## Owner CRM and Resend mailbox — July 31, 2026

- Added server-only mailbox seats and the **Mailboxes** owner page. `l.patterson@costivra.ai` is the active default owner seat; owners can create additional personal or shared `@costivra.ai` addresses, and disable non-default seats without deleting their history.
- Compose now requires an authorized active sender seat. Inbound messages route by exact active mailbox address, threads and side-effect records retain the mailbox identity, and operators can use only assigned or shared seats while owners administer all seats.
- Added the owner-only `/manage` portal with Overview, Accounts, Contacts, Outreach, Mail, and Activity views. It reads live Supabase organizations and workspace members; there is no frontend demo data.
- The live Supabase account check found one Auth user and one organization, both belonging to the existing `demo@costivra.com` / Northstar Hospitality test workspace. That workspace is now explicitly hidden from `/manage` without deleting or changing its customer-portal records. The CRM will stay honestly empty until a real organization is created.
- Added account/contact creation, lifecycle stage, next follow-up, private notes, internal activity notes, and assignable outreach tasks. Customer workspace financial records remain authoritative and tenant-isolated.
- Added a Gmail-style Resend mailbox with Inbox, Starred, Sent, Drafts, Scheduled, Archive, and Trash; conversation reading; compose, reply, forward, Cc/Bcc, attachments, plain-text rendering, search, provider status, and client context.
- Added explicit internal authorization through `internal_staff_users` plus `COSTIVRA_INTERNAL_ADMIN_EMAILS`. Customer organization roles never grant cross-tenant owner-portal access.
- Added an external-side-effect ledger around every send, including human authorization, idempotency, request hash, provider reference, retries, trace ID, sanitized metadata, CRM activity, and internal audit history.
- Extended the signed Resend webhook to keep delivery states current and route exact active `crm_mailboxes` recipients while preserving the separate customer document-intake path.
- Applied the `owner_crm_and_resend_mail` migration to the live Costivra project. All new tables have RLS enabled and deny browser roles. Supabase security review found only the existing leaked-password-protection warning; performance review found unused-index informational notices expected for new empty tables and no missing foreign-key indexes.
- Validation passed: `npm run typecheck`, `npm run lint`, `npm test` (11 tests), and `npm run build`. Browser QA passed for the overview, empty live-data states, mailbox, composer, and 390px phone layout; the temporary QA route was removed afterward.
- Remaining setup at this point in the work: deploy the mailbox-aware webhook, update the existing Resend webhook event subscriptions, enable receiving for `costivra.ai`, and perform a controlled round-trip test. No customer email has been sent.
- Dependency audit: `npm audit --omit=dev --json` currently reports three high-severity production findings through Next.js transitive `postcss` and `sharp` packages. npm proposes an unsafe major downgrade rather than a compatible patched Next.js release, so no automated force-fix was applied. Track the upstream patched Next.js/sharp/postcss release before production launch.

## Automatic email document intake — July 31, 2026

- Added one private generated intake address per organization, automatic provisioning for every new customer workspace, tenant-scoped inbound event and attachment records, Row Level Security, audit events, and required foreign-key indexes in the live Costivra Supabase project.
- Added a signed Resend `email.received` webhook. It resolves the exact organization address, rejects unknown senders, retrieves short-lived attachments, permits only PDF/DOCX/TXT up to 20 MB, scans before extraction, deduplicates by SHA-256, and reuses the same versioned document/evidence pipeline as manual upload.
- Added a fail-closed malware boundary. Clean files proceed; infected files are rejected; scanner failures or missing configuration put originals in private quarantine and never send them to AI extraction.
- Added owner/admin customer controls under Integrations: copy address, approve/remove forwarding senders, activate/pause intake, retry quarantined files, and review recent accepted/rejected/quarantined activity. Non-admin members have read-only visibility.
- Added client setup guidance in `docs/EMAIL_INTAKE_SETUP.md` and server configuration keys in `.env.example`.
- A production Resend webhook is registered at `https://costivra.ai/api/webhooks/resend` with `email.received`; its event subscriptions still need to be expanded after the mailbox-aware handler is deployed.
- DNS inspection found no existing MX provider on the root `costivra.ai` domain. The verified Resend domain can therefore be used for CRM mailbox seats without displacing an existing mailbox host; receiving activation is tracked in the owner-mailbox setup above.
- A production malware-scanning provider and its server credential are still required. A direct Cloudmersive adapter is included for the simplest setup, while a provider-neutral HTTP adapter remains available. Until configured, the system safely quarantines files instead of pretending intake completed.
- Validation: `npm test` (3 inbound-policy tests), `npm run typecheck`, `npm run lint`, and `npm run build` passed. Supabase security advisor reported no new RLS findings; the three new unindexed-foreign-key findings were corrected in a follow-up migration.

## Transactional contact email — July 31, 2026

- Verified the `costivra.ai` domain is active for sending in Resend; receiving remains disabled.
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

## Validation completed July 31, 2026

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

- Supabase leaked-password checking is unavailable on the current plan. Password minimum length is 10, recent authentication is required for password changes, and password-change notifications are enabled. Upgrade to Supabase Pro to enable HaveIBeenPwned protection.
- Integration controls safely manage Costivra-side connection state; provider OAuth/API credentials still need to be configured before external synchronization can occur.
- Uploaded files are validated by type, size, hash, tenant, and private storage. A dedicated malware-scanning provider and OCR for image-only scans are not connected yet; these require external vendor selection.
- Team invitations use Supabase email delivery. Production SMTP should be configured before launch.
- Billing, supplier communication, cancellation, and other external financial actions remain intentionally unavailable until provider adapters and explicit authorization workflows exist.
- Legal and UCEP drafts still require qualified counsel before commercial launch.

## Next launch work

Configure Vercel environment variables, production SMTP, domain/redirect URLs, and selected provider OAuth credentials. Then add automated tenant-isolation, upload, workflow, and browser regression suites to CI.
