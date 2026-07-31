# Costivra Frontend

Costivra is an evidence-first business cost intelligence and recovery platform. This repository currently contains the complete public-site and customer-workspace frontend concept described in `COSTIVRA_AGENTIC_BUSINESS_BLUEPRINT.md`.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Validation

```bash
npm run typecheck
npm run lint
npm run build
```

## Important scope boundary

This is a production-quality frontend concept with realistic demo data and local interactive states. Authentication, private storage, document scanning and extraction, database tenancy, workflow execution, email, billing, and partner integrations are not connected yet. The UI says so rather than pretending those backend systems exist.

## Main routes

- `/` — public homepage
- `/product`, `/solutions`, `/how-it-works`, `/pricing`, `/security`
- `/industries/*` — vertical-specific pages
- `/scan` — interactive Cost Leak Scan intake preview
- `/privacy`, `/terms`, `/ucep-disclosure` — legal and disclosure drafts
- `/app` — complete customer workspace preview
- `/app/expenses`, `/app/opportunities`, `/app/contracts`, `/app/documents`
- `/app/actions`, `/app/savings`, `/app/vendors`, `/app/integrations`
- `/app/reports`, `/app/team`, `/app/ask`, `/app/settings`

Legal pages are substantial product-launch drafts, not attorney-approved final documents.
