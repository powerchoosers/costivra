# Costivra Status

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
- Dependency audit: `npm audit --omit=dev --json` currently reports three high-severity production findings through Next.js transitive `postcss` and `sharp` packages. npm proposes an unsafe major downgrade rather than a compatible patched Next.js release, so no automated force-fix was applied. Track the upstream patched Next.js/sharp/postcss release before production launch.

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

- Password recovery — diagnosed the production failure as a stale, rotated Supabase refresh token rather than a password-length failure. `/set-password` now participates in session-cookie refresh, removes invalid Supabase auth cookies, and renders a dedicated reset-link screen when no valid session exists.
- Password entry — the form reads the values actually present in the browser instead of using hidden React state as a submit gate. Password-manager autofill can no longer leave a filled-looking form disabled; both visibility controls and match/length feedback remain available, and the server returns a specific reason for every rejected save.
- Password update — the authenticated route updates only the current Supabase user, validates both 12-character entries on the server, rejects cross-origin requests, supports a normal HTML form fallback, and contains no owner-email or admin-user fallback.
- Production verification — a temporary `example.invalid` Supabase Auth user completed token verification (`307`), rendered the active form (`200`), saved a password (`200`), and signed in with the new password. The temporary user was deleted immediately. Vercel production deployment `dpl_Dgnz1vUhN27nF8qXFeGd2rctnV8C` is READY on commit `d49d941`.
- Owner recovery — sent one fresh **Reset your Costivra password** email after the verified deployment; Resend reports it delivered to the owner mailbox. Older reset links remain single-use and should be ignored.
- Marketing header stickiness — changed root horizontal overflow containment from `hidden` to `clip`, preserving horizontal clipping without creating the scroll container that caused the homepage header to scroll away. Browser QA confirmed the header remains at its configured 20px offset after a 675px scroll, with no horizontal overflow or console errors.
- Route transitions — removed the root-level opacity/translate entrance that briefly exposed the dark document background during navigation. Pages now paint immediately, while the existing section-level portal and scroll-reveal motion provides restrained content movement without a full-screen flash.

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

- Password recovery — a Supabase recovery link establishes a short-lived authenticated session by design. Costivra now marks that session as password-setup-only and blocks `/app` and `/manage` until the new password is successfully saved. The requirement cookie expires after 15 minutes and is cleared only by a successful server-side password update.

- Supabase leaked-password checking is unavailable on the current plan. Password minimum length is 10, recent authentication is required for password changes, and password-change notifications are enabled. Upgrade to Supabase Pro to enable HaveIBeenPwned protection.
- Integration controls safely manage Costivra-side connection state; provider OAuth/API credentials still need to be configured before external synchronization can occur.
- Uploaded files are validated by type, size, hash, tenant, and private storage. A dedicated malware-scanning provider and OCR for image-only scans are not connected yet; these require external vendor selection.
- Team invitations use Supabase email delivery. Production SMTP should be configured before launch.
- Billing, supplier communication, cancellation, and other external financial actions remain intentionally unavailable until provider adapters and explicit authorization workflows exist.
- Legal and UCEP drafts still require qualified counsel before commercial launch.

## Next launch work

Configure Vercel environment variables, production SMTP, domain/redirect URLs, and selected provider OAuth credentials. Then add automated tenant-isolation, upload, workflow, and browser regression suites to CI.
