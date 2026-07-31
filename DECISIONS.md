# Costivra Architecture and Product Decisions

## 2026-07-31 — Use Resend only through a server-side delivery ledger

### Context

The `costivra.ai` sending domain is verified and a restricted server credential is configured in Vercel. The first production email use is contact-inquiry confirmation, before any approval-gated vendor communication is built.

### Decision

Send transactional email through a small server-only Resend adapter. Persist the inquiry before attempting delivery, assign a stable idempotency key to each message, and record the request hash, provider result, and failure state in a browser-inaccessible delivery ledger. Do not expose the API key or treat a provider response as proof that a person read the message.

### Alternatives considered

- Sending directly from the contact route without a ledger. This would make duplicate sends and ambiguous provider failures difficult to audit.
- Building general vendor-email execution now. That would outrun the current approval-policy and durable-workflow milestone.

### Consequences

Contact inquiries can produce a receipt and an internal notification without losing the saved inquiry when email is unavailable. Vendor, referral, cancellation, and other consequential email remain unavailable until their approval and execution controls are implemented.

## 2026-07-30 — Build the complete frontend before backend integrations

### Context

The repository was empty except for `AGENTS.md`, and the immediate objective was a complete public and customer frontend that could be reviewed locally.

### Decision

Build a single Next.js 16 App Router application with code-native marketing and customer product surfaces. Use realistic demo records and local interaction state while clearly labeling backend-dependent behavior as a preview.

### Alternatives considered

- Scaffold the full monorepo and backend foundation first. This would delay the requested reviewable frontend.
- Build only a marketing landing page. This would not satisfy the blueprint's customer application scope.

### Consequences

The full information architecture, visual system, navigation, legal drafts, responsive behavior, and primary product interactions can be reviewed now. Authentication, tenancy, storage, extraction, workflow orchestration, integrations, and persistence remain future milestones and must not be implied as complete.

## 2026-07-30 — Use an editorial evidence-first visual system

### Context

Costivra needs to feel financially serious and understandable rather than like a generic AI product.

### Decision

Use warm financial-paper backgrounds, near-black operational chrome, signal cobalt for attention, recovery mint only for verified or recovered value, restrained linework, modest radii, and mono typography for data and evidence labels.

### Consequences

The public site and customer application share one recognizable system. The design avoids neon AI decoration, unsupported social proof, and repetitive card grids.

## 2026-07-30 — Keep partner routing neutral and consent-gated

### Context

The founder's relationship with UCEP creates a material trust and conflict boundary.

### Decision

Describe UCEP as one optional energy-review destination. Keep independent detection separate from routing, present neutral choices, require explicit consent, and include a dedicated relationship disclosure.

### Consequences

The frontend cannot auto-route an energy case or present UCEP as the only option. Commercial integration remains blocked pending written employment/IP clarity and counsel-reviewed disclosure language.
