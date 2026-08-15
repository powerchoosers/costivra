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

Read-only operational checks also passed under Node 24: `ops:readiness` reported Resend, Supabase, OpenRouter, and Cloudmersive readiness, and `ops:smoke` passed the public site, status endpoint, protected cron rejection, and signed webhook rejection checks. The production deployment does not yet contain the new activation-reminder route.

Vercel read-only deployment inspection confirms the latest production deployment is `dpl_F7E8Jf9t2XvoETWA2BJgzTkR54Jc`, `READY`, for commit `782905cc6d31587db3246c46e2a84b852a522e1d` (`Record public invoice AI smoke test`). It therefore cannot prove the uncommitted Packet 06 routes. The last 24-hour production runtime grouping showed 2,341 responses at 200, 9 at 307, 4 at 401, 2 at 400, 2 at 405, and 1 at 404; this is operational context, not lifecycle delivery proof.

The full live-provider matrix is not claimed here. It requires a permitted disposable recipient, current production deployment, and provider-side message/event IDs. No real customer message was sent during this change.

## Remaining Packet 06 proof gaps

- The Vercel deployment containing the new cron route must still be released before production begins invoking the reminder worker.
- The Vercel deployment containing the manual-report history code must be released before customers see the corrected “Email now” history behavior.
- Current-commit live proof for every lifecycle event, scheduled report, duplicate worker invocation, and provider bounce/failure still needs to be run with disposable data.
- Resend domain/webhook/provider history must be rechecked at the time of release; this document does not substitute for that external evidence.
- No commit, push, deployment, or real-customer send is authorized by this evidence update.
