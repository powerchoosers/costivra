# Costivra Status

## Completed

- Root engineering instructions and the full business blueprint are stored in the repository.
- Original Costivra logo direction, standalone SVG mark, wordmark, favicon, pinned-tab icon, web manifest, and dynamic social card.
- Responsive public homepage with product preview, workflow, evidence viewer, security doctrine, pricing, FAQ, and footer.
- Public product, solutions, integrations, industry, how-it-works, pricing, security, about, partner, contact, help, status, and case-study-standard pages.
- Interactive Cost Leak Scan, sign-in, and signup frontend states.
- Substantive privacy, terms, and UCEP relationship-disclosure drafts.
- Complete customer workspace navigation and pages for Command Center, Expenses, Opportunities, Contracts, Documents, Actions, Savings, Vendors, Integrations, Reports, Team & approvals, Ask Costivra, and Settings.
- Desktop and mobile responsive layouts.
- Robots rules, sitemap, metadata, and Open Graph image.
- Supabase project created for Costivra (`skfocjrykyvsaviyhdea`, `us-east-2`) with the secure foundation deployed: organizations, memberships, locations, vendor and expense records, documents, evidence, opportunities, approvals, audit events, and external-side-effect records.
- Row Level Security enabled on all 17 current public tables, with tenant-scoped read policies and server-only mutation paths.
- Private `costivra-documents` Storage bucket created for source files.
- Server-only Supabase helper and bounded OpenRouter document-intelligence adapter added, plus `.env.example` for safe configuration.

## Validation

- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm run build` — passed.
- Supabase security advisor — passed with no findings.
- Supabase performance advisor — only reports unused indexes because the new database has no live records yet.
- Browser QA at 1536×1024 and 390×844.
- All 39 tested public, legal, asset, and application routes returned HTTP 200.
- Mobile navigation opened and exposed the expected links.
- Command Center approval filter updated from three rows to one row.
- Cost Leak Scan reached its confirmation state using QA-only sample data.
- UCEP disclosure rendered the relationship and customer-choice sections.
- No browser console errors were found during the final disclosure check.

## Current QA server

- URL: `http://localhost:3000`
- Command: `npm run dev`

## Known boundaries

- Authentication and form submissions are frontend demonstrations, not connected services.
- The database and private document bucket are ready, but application authentication, upload handling, malware scanning, signed access, persistence repositories, and extraction-job orchestration are not connected to the UI yet.
- The OpenRouter adapter is implemented but cannot be invoked until `OPEN_ROUTER_API_KEY` and Costivra's `SUPABASE_SECRET_KEY` are configured in local and Vercel environments.
- Demo financial values are illustrative product data, not customer claims.
- Legal drafts need review by qualified counsel before commercial launch.
- UCEP data sharing must not be implemented before written employment/IP clarity and counsel-reviewed disclosure terms.

## Next recommended milestone

Connect Supabase Auth and tenant-aware repositories to the customer workspace, then implement the private document intake path: server-side validation, SHA-256 provenance, malware-scan boundary, private upload, extraction queue, field-level evidence, and tenant-isolation tests.
