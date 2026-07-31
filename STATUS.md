# Costivra Status

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
