# Packet 05: Prove the End-to-End Customer Pilot Journey

**Snapshot date:** August 15, 2026  
**Priority:** Critical  
**Pilot requirement:** Mandatory  
**Recommended prerequisite packets:** 01, 03, 04, 06, and 07

## Mission

Prove that one disposable real-world-style customer can move from invitation to a useful, evidence-backed Costivra outcome without manual database surgery, cross-tenant leakage, misleading status, duplicate side effects, or an invisible operator failure.

This packet validates the service customers will actually experience. It is not a tour of disconnected pages.

## Pilot path under test

Use the founder-led, invite-only path unless Packet 08 has already proven paid activation.

The complete path is:

1. internal operator creates a disposable pilot organization;
2. operator invites an owner;
3. invitation email is delivered;
4. owner opens the link in a clean browser;
5. owner sets a password and enters the correct workspace;
6. owner completes essential company and location details;
7. owner uploads three approved clean documents;
8. every file passes the security gate;
9. extraction creates reviewable records;
10. owner or authorized reviewer corrects at least one field;
11. one authoritative invoice is approved;
12. Costivra creates an evidence-backed potential finding;
13. internal trust review makes the finding customer-visible;
14. customer reviews and approves or declines an action;
15. monitoring is configured honestly;
16. a report is generated and delivered;
17. a later source or other approved proof verifies an outcome when the scenario supports it;
18. the customer signs out and returns successfully;
19. a second tenant cannot access any artifact from the first;
20. all disposable data is cleaned up or retained according to the test policy.

## Current evidence to re-check

At the latest audit:

- public pages and the customer workspace were operational;
- invitation, onboarding, document, review, finding, action, report, and monitoring foundations existed;
- one authenticated customer workflow had passed previously;
- the scanner and complete real-document chain were not yet proven on the exact current release;
- authenticated desktop, tablet, and mobile evidence remained incomplete;
- activation-link browser proof was still an open item for paid onboarding;
- full current-commit lifecycle and report delivery proof remained necessary.

Re-check routes, tests, and production state.

## Required reading and inspection

```text
tests/e2e/authenticated-workspace.spec.ts
tests/e2e/
src/app/login/
src/app/signup/
src/app/auth/
src/app/set-password/
src/app/app/
src/app/api/portal/
src/components/app-shell.tsx
src/components/portal-pages.tsx
src/components/portal-record-detail.tsx
src/lib/portal/
src/lib/documents/
src/lib/vendors/
src/lib/reports/
src/lib/email/
src/lib/domain/
docs/PRODUCTION_LAUNCH_CHECKLIST.md
```

Inspect internal Manage flows used to:

- create the account;
- invite the owner;
- review intake;
- review invoice corrections;
- conduct trust review;
- inspect report delivery;
- inspect monitoring state;
- inspect audit events.

## Test-data rules

Use:

- a disposable organization with a unique run identifier;
- permitted test email recipients;
- harmless, approved, de-identified or synthetic documents suitable for browser testing;
- a second disposable organization for isolation checks;
- no real customer account;
- no real vendor cancellation or contract action;
- no live payment unless explicitly authorized and Packet 08 requires it.

The test must be repeatable and idempotent. It must either clean up safely or produce a documented cleanup action.

## Workstream A: Invitation and account activation

Prove:

- Manage can create the organization once;
- duplicate create attempts do not create ambiguous tenants;
- invitation goes to the intended recipient;
- the link opens in a clean browser;
- expired or reused links produce a recoverable state;
- password setup succeeds;
- redirect lands in the correct `/app` workspace;
- an invited user cannot enter another tenant;
- ordinary customers cannot enter `/manage`;
- sign-out invalidates the practical browser session;
- password reset works or is explicitly tested elsewhere in the final matrix.

Capture provider delivery truth, not merely API acceptance.

## Workstream B: Guided activation

The customer should understand:

- current workspace;
- next required action;
- document count;
- blocked or quarantined files;
- review status;
- monitoring status;
- support route.

Prove the checklist is derived from authoritative records:

- quarantined files do not count;
- failed extraction does not count;
- empty review queue does not equal reviewed;
- automatic monitoring does not count until its real test passes;
- manual monitoring is labeled manual;
- the flow can be resumed after sign-out;
- the customer cannot manually force an activated state.

## Workstream C: Three-document intake

Upload three supported documents chosen to exercise different paths:

1. native-text clean invoice;
2. scanned or image-heavy clean invoice;
3. clean invoice containing an intentional review-worthy mismatch or low-confidence field.

For each:

- durable storage succeeds;
- malware scan passes;
- digest and provenance are recorded;
- extraction starts only after clean;
- duplicate handling is truthful;
- progress UI updates without refresh traps;
- terminal failures provide a clear next action;
- the customer can inspect source evidence only when authorized.

Do not use the inert antivirus fixture in this positive journey. Packet 01 owns the negative scanner path.

## Workstream D: Review, correction, and approval

Prove:

- the review queue shows the intended record;
- source evidence aligns with extracted fields;
- an authorized correction is saved;
- correction history remains immutable;
- arithmetic reconciliation is recalculated;
- reviewer identity and timestamp are stored;
- invoice approval fails closed when required fields or reconciliation are invalid;
- a repeated submit does not duplicate the authoritative expense;
- the customer sees a clear authoritative state.

## Workstream E: Finding and trust review

Create or identify one legitimate potential finding.

Prove:

- evidence exists;
- unsupported benchmarks are not displayed;
- potential annual value is labeled potential;
- internal trust review is required before customer visibility;
- the customer sees the source, reasoning, confidence, and next action;
- approval or decline is auditable;
- approval does not turn potential value into verified savings;
- duplicate processing does not create duplicate findings or actions.

If the test data cannot support a legitimate finding, do not fabricate one. Use a separate approved fixture or report the finding step blocked.

## Workstream F: Monitoring

Prove one monitoring mode:

### Automatic forwarding

- authoritative inbound address exists;
- instructions are delivered;
- a permitted clean test bill arrives;
- the signed webhook matches the tenant and vendor;
- the attachment passes scanning;
- the monitoring test commits;
- expected next-bill timing is set;
- repeat delivery does not duplicate the source.

### Manual tracking

- customer explicitly selects manual tracking;
- UI does not imply automatic forwarding;
- expected cadence and next action are visible;
- the account can later transition to automatic only after a real test.

For the final pilot, at least one automatic path should be proven somewhere in the release evidence, even if a particular pilot tenant begins manually.

## Workstream G: Report generation and delivery

Prove:

- a customer-authorized report can be generated from authoritative data;
- potential and verified values are separated;
- the deep link returns to the correct tenant;
- `Email now` sends only to an authorized recipient;
- a scheduled run can be created or an existing schedule can be invoked safely;
- duplicate worker invocation does not duplicate the period's report;
- Resend delivery status reconciles;
- bounce or failure is not displayed as delivered;
- customer delivery history matches provider events.

## Workstream H: Verification outcome

When the scenario supports verification:

- establish an accepted baseline;
- ingest a later invoice or other approved source;
- perform the defined comparison;
- require human verification;
- store the verified outcome separately from the potential finding;
- send the verification email only after authoritative verification;
- reflect verified value correctly in reports.

If the pilot scenario does not yet contain a valid later period, mark verification as `NOT YET ELIGIBLE`, not failed and not fabricated.

## Workstream I: Cross-tenant and authorization probes

With Org A and Org B:

- Org B cannot open Org A document, invoice, finding, action, report, monitoring config, or signed link;
- guessed IDs return safe not-found responses;
- customer cannot invoke internal review endpoints;
- owner-only customer actions reject a lower role;
- stale links do not bypass current membership;
- browser network responses do not contain unrelated tenant data.

## Workstream J: Browser and accessibility matrix

Run at minimum:

```text
1440 x 900
1280 x 800
1024 x 768
390 x 844
360 x 800
```

Check the journey's relevant routes for:

- no horizontal overflow;
- keyboard operation;
- visible focus;
- sensible mobile sheets and modals;
- correct scroll ownership;
- loading, empty, blocked, and error states;
- no uncaught console errors;
- reduced-motion behavior;
- readable evidence and status text;
- no hidden action behind an off-screen control.

Do not redesign the entire product in this packet. Fix journey-blocking defects and record lower-priority polish separately.

## Automation requirements

Extend the existing authenticated Playwright test instead of creating a parallel test universe.

The automated test should:

- use a unique run ID;
- create disposable server-side state safely;
- avoid real customer data;
- exercise the browser rather than bypassing every UI;
- validate critical database side effects;
- capture trace, screenshot, and video on failure;
- clean up or provide deterministic cleanup;
- fail on console errors relevant to the journey;
- be runnable locally and from the authenticated workflow.

## Required commands

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run test:integration:live
npm run build
npm run test:e2e
npm run test:e2e:authenticated
npm run ops:readiness
npm run ops:smoke
```

Also run the relevant scanner, report, and lifecycle verification commands created by Packets 01 and 06.

## Required evidence

- exact commit and deployment;
- disposable organization IDs;
- invite provider message ID and delivered status;
- browser trace for activation;
- three document IDs and final states;
- correction and approval IDs;
- finding, trust review, and action IDs;
- monitoring configuration and test event;
- report definition, delivery run, and provider message ID;
- verification state or documented not-yet-eligible reason;
- two-tenant denial evidence;
- browser matrix results;
- cleanup result;
- screenshots that contain no unsafe private information.

## Acceptance criteria

- A new invited customer reaches the correct workspace without database intervention.
- Three clean documents pass the scanner and create reviewable records.
- Correction, reconciliation, and approval work and remain auditable.
- A legitimate finding follows evidence and trust-review rules.
- Customer action does not falsely verify savings.
- Monitoring is represented truthfully and one supported intake test works.
- A report generates, sends once, and reconciles delivery.
- Tenant and role boundaries hold through browser and API probes.
- The journey works on desktop, tablet, and phone sizes.
- No material console or runtime error occurs.
- The test is repeatable and cleans up safely.
- Every unavailable step is explicitly reported rather than simulated.

## Explicitly out of scope

- public self-serve acquisition;
- live Stripe billing unless Packet 08 is active and authorized;
- autonomous vendor actions;
- savings guarantees;
- broad visual redesign;
- real customer data;
- acquisition sequencing;
- committing, pushing, deploying, inviting real users, or sending real vendor email without explicit authorization.

## Completion report

Return the shared completion report from Packet 00. Add a journey table:

| Step | Browser result | Authoritative record | Side effect | Verdict |
|---|---|---|---|---|
| Invitation | ... | ... | Resend ... | PASS / FAIL |
| Activation | ... | ... | ... | ... |
| Documents | ... | ... | Scanner ... | ... |
| Review | ... | ... | ... | ... |
| Finding | ... | ... | ... | ... |
| Monitoring | ... | ... | Resend inbound ... | ... |
| Report | ... | ... | Resend outbound ... | ... |
| Verification | ... | ... | ... | ... |
| Isolation | ... | ... | ... | ... |
