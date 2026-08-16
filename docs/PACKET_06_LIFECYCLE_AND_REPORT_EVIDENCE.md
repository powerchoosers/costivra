# Packet 06 — Lifecycle Email and Automated Report Evidence

**Audit date:** 2026-08-15  
**Repository:** `powerchoosers/costivra`  
**Scope:** customer lifecycle notifications and tenant-scoped scheduled reports. Acquisition sequences are excluded.

## Current event matrix

| Event | Durable source and call site | Recipient rule | Idempotency key | Current state |
|---|---|---|---|---|
| Invitation / welcome | Supabase Auth invitation in `src/app/api/portal/team/route.ts` and paid provisioning | Invited address, authorized by the membership/invitation operation | Supabase Auth provider-managed invite; Costivra welcome key begins after password activation | Provider-managed invitation; Costivra does not duplicate it |
| Welcome / password activation | Successful password activation in `src/app/api/auth/set-password/route.ts` | Current workspace owner/admin membership | `lifecycle/{org}/welcome_activation/welcome-activation:{userId}/{email}` | Implemented; non-blocking delivery |
| Activation complete | `organization_onboarding.status` transitions to `activated` in `src/app/api/portal/onboarding/route.ts` | Current workspace owner/admin membership | `lifecycle/{org}/activation_complete/activation-complete:{org}:{activatedAt}/{email}` | Implemented; non-blocking delivery |
| Upload received | Durable document insert in `src/app/api/portal/documents/route.ts` and inbound intake | Current workspace owner/admin membership | Source document ID | Implemented; copy reflects processing/quarantine/duplicate/rejected state |
| Review needed | Durable review-needed document state in portal upload/inbound intake | Current workspace owner/admin membership, optional review preference | Source document ID / event key | Implemented |
| Finding ready | Evidence-backed, customer-visible deterministic opportunity in `src/lib/workflows/value-engine.ts` | Current workspace owner/admin membership, optional finding preference | Opportunity/source ID | Implemented; copy says potential, never verified savings |
| Approval requested | Protected approval-notification cron after approval record exists | Current workspace owner/admin membership | Approval ID / event key | Implemented |
| Forwarding instructions | Saved monitoring configuration in the vendor monitoring route | Current workspace owner/admin membership | Monitoring relationship/event key | Implemented |
| Forwarding test result | Authoritative inbound processing outcome | Current workspace owner/admin membership | Inbound event key | Implemented |
| Expected bill missed | Atomic `attention_needed` transition in vendor-monitoring cron | Current workspace owner/admin membership, optional missed-bill preference | Vendor relationship and billing cycle event key | Implemented; one transition sends once |
| Verification ready | Savings route after the workflow reaches `verified` | Current workspace owner/admin membership | Savings outcome ID / event key | Implemented; `ready_for_review` does not send verification language |
| Report sent | `Email now` route or protected reports cron | Authorized current organization members intersected with configured recipients | Report definition/schedule/period/recipient | Implemented through report side-effect and recipient ledgers |
| Activation reminder | Protected `/api/cron/activation-reminders` reads durable onboarding state | Current workspace owner/admin membership | `lifecycle/{org}/activation_reminder/activation-reminder:{org}:{reminderNumber}/{email}` | Implemented; maximum three reminders, at least 72 hours apart |
| Payment failed/recovered | Packet 08 scope | Not applicable here | Not applicable | Deferred unless Packet 08 is active |

## Delivery invariant

Lifecycle and report sends claim `external_side_effects` before calling Resend. A stable key and request hash prevent duplicate sends. The signed Resend webhook maps provider acceptance and later states separately, including `delivered`, `delayed`, `bounced`, `complained`, `failed`, and `suppressed`. Report recipients are tracked independently so a partial multi-recipient send is not presented as fully delivered.

The activation-complete notification is deliberately non-blocking: the onboarding row is already durable and remains usable if Resend is temporarily unavailable. Repeated onboarding synchronization cannot send another message because the activation timestamp is stable and the side-effect claim is insert-winner idempotent. Activation reminders use the same claim before provider send and update the durable throttle only after at least one recipient is accepted or already idempotently claimed.

## Report protections verified in source and tests

- Report definitions, schedules, runs, and recipients are organization-scoped.
- Current membership is re-read before scheduled delivery; configured addresses outside that membership are skipped.
- Paused or rescheduled schedules cannot be delivered from a stale claim.
- One schedule/period pair is protected by a unique delivery-run constraint.
- Failed and stale claims use bounded retry/reclaim behavior.
- Delivery history is retained separately from schedule state.
- Potential values and verified outcomes remain distinct in generated report content.
- Customer report links use authenticated portal routes; report email content is rendered from the same server-side report service.

## Validation performed

Using the repository-mandated Node 24 runtime (`v24.19.0`):

```text
node --version
node --env-file-if-exists=.env.local node_modules/vitest/vitest.mjs run src/lib/email/lifecycle.test.ts src/lib/email/lifecycle-recipient.test.ts src/lib/reports/delivery.test.ts
```

Result: **13 tests passed across 3 files.**

The expanded follow-up validation passed **69 tests across 20 files**, including the activation policy, protected reminder route, manual report-history route, every lifecycle template, lifecycle idempotency, report delivery, and related email modules. The integration configuration also passed **8 tests** with **6 intentional skips**. Packet 06 changed-file ESLint and the earlier full TypeScript check passed under Node `v24.19.0`; `git diff --check` also passed. Next compile-only build mode passed in 95 seconds and enumerated the activation-reminder cron and report routes. A clean TypeScript retry after the added template test exceeded the local command window without diagnostics. The final production generation phase remains unverified because the standard build modes hang in Next worker processes; repository-wide Vitest and ESLint also exceeded the local command window without diagnostics.

The Supabase connector applied the reminder migration to Costivra project `skfocjrykyvsaviyhdea` as version `20260815223027`. Verification confirmed both columns, the count constraint, and the reminder index. The local migration filename was reconciled to that exact remote version. It also applied manual-report history migration `20260815223641`; verification confirmed the unique `delivery_key` constraint. Post-DDL advisors report 23 security findings (22 intentional service-only RLS INFO notices and the existing leaked-password WARN) and 145 performance findings; the new reminder index appears as an expected unused-index INFO until the worker has run.

Read-only operational checks also passed under Node 24: `ops:readiness` reported Resend, Supabase, OpenRouter, and Cloudmersive readiness, and `ops:smoke` passed the public site, status endpoint, protected cron rejection, and signed webhook rejection checks.

Vercel inspection now confirms the current production deployment is `READY` for commit `fe6945f5d1508d8276e0953bdd3d7ebc855603e2`; the live proof below covers the deployed cron routes. The earlier deployments and commits recorded below are superseded historical evidence.

## Current-commit live proof — August 15, 2026

The manually pushed `main` release is deployed to `https://costivra.ai` at commit `fe6945f5d1508d8276e0953bdd3d7ebc855603e2`. Vercel reports the production deployment `READY`, Node `24.x`, and the activation-reminder and report cron routes in the deployed configuration. Vercel's authenticated `crons run` command invoked each worker twice against production.

The proof used one synthetic organization and the two authorized test recipients supplied by Lewis. No customer invoice text or customer organization was used. The fixture was deleted successfully after evidence collection.

| Message or report | Source event | Internal evidence | Provider message ID | Final state | Duplicate test |
|---|---|---|---|---|---|
| Activation reminder · recipient A | Production activation-reminder cron | Side effect `32531681-2d3e-4499-b6e0-dce82854c92d` | `49847ddf-d373-435b-96e2-d7ea19a65d89` | delivered | PASS; reminder count remained 1 after second invocation |
| Activation reminder · recipient B | Production activation-reminder cron | Side effect `9d57b8e5-2564-4aaf-a3ad-e95833d7fc03` | `d0c65921-5a21-4e98-abf9-913819c59865` | delivered | PASS; reminder count remained 1 after second invocation |
| Scheduled coverage report · recipient A | Production reports cron | Run `95c132fb-de04-4c55-9575-3b4ea4dca207`; recipient `b5308680-3d5e-47bc-b7ed-64aa3664fcd2` | `75e4bd9c-8855-4112-85da-a038be9ab361` | delivered | PASS; second invocation created no second run |
| Scheduled coverage report · recipient B | Production reports cron | Run `95c132fb-de04-4c55-9575-3b4ea4dca207`; recipient `9d2f5efb-1a1e-4e5a-874c-6c8fcdeca84e` | `cc4c378e-4cf4-4296-8f9f-9b52a6146475` | delivered | PASS; same run/period uniqueness held |

The report run and both recipient rows were `delivered`; the Resend message lookup returned HTTP 200 with `last_event: delivered` for all four provider IDs. The activation onboarding projection recorded `activation_reminder_count: 1` and a sent timestamp. No provider acceptance was mistaken for delivery.

The same deployed release also proved two additional worker call sites with a second synthetic organization. A pending approval was processed twice; its lifecycle side effect was created once and the approval remained pending. An overdue active monitoring configuration was processed twice; it transitioned once to `attention_needed`, cleared `next_expected_at`, recorded `EXPECTED_BILL_MISSED`, and produced one lifecycle side effect. Resend returned HTTP 200 with `last_event: delivered` for provider IDs `ea25be61-66c8-43fa-b243-235a075b8731` and `9c699846-c784-4dde-b452-4a908f40b66b`. Exact fixture cleanup passed.

An additional disposable sender/provider matrix exercised the six remaining lifecycle template kinds against a synthetic organization whose memberships were the two explicitly authorized proof recipients: `upload_received`, `review_needed`, `finding_ready`, `forwarding_instructions`, `forwarding_test_result`, and `verification_ready`. Each kind produced two accepted messages (12 total), every provider lookup returned HTTP 200 with `last_event: delivered`, and repeating every source identifier returned the existing provider ID with `deliveryStatus: duplicate` for both recipients. The harness created a real disposable forwarding-monitoring configuration and deleted the organization, memberships, vendor relationship, monitoring record, audit rows, and side-effect rows in cleanup. This proves the shared recipient resolution, idempotency ledger, template copy, and Resend reconciliation path. It does not substitute for route-level proof that each business record was created by its exact production mutation path.

The safe provider-failure drill exposed and then fixed a live schema defect. Resend's official `bounced+label@resend.dev` test address returned `last_event: bounced`; the production webhook recorded the signed event, but Supabase rejected the side-effect update because `external_side_effects_status_check` allowed only pre-provider states. Migration `20260816010409_packet_06_provider_delivery_statuses` expanded the constraint to include `scheduled`, `delayed`, `delivered`, `bounced`, `complained`, and `suppressed`, and the webhook now records `last_provider_event_at`/`completed_at` and fails loudly on update errors. After applying the migration to project `skfocjrykyvsaviyhdea`, the same controlled bounce reconciled to internal status `bounced` with `last_error: RESEND_BOUNCED`. Post-DDL advisors remain at 23 security findings (22 intentional service-only RLS notices plus leaked-password protection) and 145 performance findings, with no new Packet 06 security finding.

The fix was then pushed as commit `fe6945f5d1508d8276e0953bdd3d7ebc855603e2` and Vercel production reported `READY` for that exact SHA. A final bounce test sent to Resend's controlled `bounced+packet06-deployed-<run>@resend.dev` address reconciled through the deployed webhook to internal status `bounced` with `last_error: RESEND_BOUNCED`; the disposable organization and side-effect row were deleted afterward. GitHub CLI was not authenticated locally, so the Actions run ID was not independently recorded in this turn.

Additional live source-workflow evidence passed after the release: `atomic-financial-workflow.live.integration.test.ts` passed 1/1, creating and advancing disposable opportunity/action/baseline/comparison/verified-savings records before exact organization cleanup; `invoice-review.live.integration.test.ts` passed 2/2, covering missing-vendor rejection, reconciliation correction, approval, and idempotency. These tests prove the durable finding, verification, and review state transitions that gate their lifecycle notifications. They do not claim provider delivery for the integration test's `example.invalid` fixture recipient; provider delivery is covered separately by the authorized-recipient matrix above.

The same two live integration files were rerun with Node `v24.19.0` after the deployed webhook fix: 2 files and 3 tests passed, with disposable cleanup. The full authenticated browser journey was also exercised locally with the separate Packet 05 intake change present; the business workflow reached its final assertions, but the test correctly failed its zero-console-error gate because unrelated workspace hydration warnings were emitted. That local run is not counted as a clean Packet 06 release proof.

An authenticated disposable browser capture of the live Reports page is stored at `output/playwright/packet06-report-delivery-history.png`. Reports resolves to `/app/results?view=reports`; the delivery-history API returned HTTP 200, and the captured section shows one synthetic `Email now` run with both run-level and recipient-level `Delivered` states. The synthetic report organization and user were deleted and verified absent. The artifact contains no customer invoice text or real recipient.

The current authenticated production browser proof was attempted against the exact deployed SHA `fe6945f5d1508d8276e0953bdd3d7ebc855603e2`. It reached `/api/portal/documents` with a disposable organization but returned HTTP 500. Supabase Postgres logged `null value in column "page_number" of relation "evidence_references" violates not-null constraint` at the matching time. The local worktree contains an uncommitted Packet 05 change in `src/lib/documents/intake.ts` that supplies logical page 1 for one-page native-text evidence; that change is outside this Packet 06 commit and is not included in the current production deployment. A second run against the newer live production deployment reproduced the same HTTP 500 and the same Supabase constraint error at `2026-08-16T01:46:31Z`; both runs used disposable organizations, and cleanup was verified. Therefore route-level upload-trigger proof remains open until the owning Packet 05 change is separately released and this exact production journey is rerun.

## Remaining Packet 06 proof gaps

- Current-commit live proof covers activation reminders, scheduled report delivery, approval notifications, missed-bill monitoring, the shared sender/provider matrix for upload/review/finding/forwarding/verification, duplicate worker invocations, tenant-scoped recipient authorization, provider-delivered state, and durable review/finding/verification workflow transitions. Exact authenticated route-level proof that the upload route emits both upload/review messages from a real disposable upload remains blocked by the deployed Packet 05 `page_number` defect described above; no real customer data was used.
- Safe provider bounce reconciliation is now proven with Resend's official `bounced+label@resend.dev` test address. No failure was induced against either Lewis-authorized mailbox.
- Resend domain/webhook configuration was previously verified by readiness checks; the live proof additionally verified four message lookups with `last_event: delivered`.
- No real-customer message was sent. The two test recipients were explicitly authorized for this proof.
