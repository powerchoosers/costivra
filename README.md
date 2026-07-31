# Costivra

Costivra is an evidence-first recurring-cost intelligence platform. This repository contains the public site and a functioning, authenticated customer workspace backed by Supabase and a source-grounded AI assistant.

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

## Configuration

Copy `.env.example` to `.env.local` and configure the Costivra Supabase publishable/secret keys and the server-only OpenRouter key. Never commit `.env.local`.

## Main routes

- `/` — public homepage
- `/product`, `/solutions`, `/how-it-works`, `/pricing`, `/security`
- `/industries/*` — vertical-specific pages
- `/scan` — secure Cost Leak Scan account entry
- `/privacy`, `/terms`, `/ucep-disclosure` — legal and disclosure drafts
- `/app` — authenticated customer command center
- `/app/expenses`, `/app/opportunities`, `/app/contracts`, `/app/documents`
- `/app/actions`, `/app/savings`, `/app/vendors`, `/app/integrations`
- `/app/reports`, `/app/team`, `/app/ask`, `/app/settings`

Legal pages are substantial product-launch drafts, not attorney-approved final documents.

See `STATUS.md` for verified capabilities, current provider boundaries, and launch work.
