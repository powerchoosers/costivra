# Costivra Pilot Completion Sequence

## Purpose

This folder breaks Costivra's remaining pilot-launch work into small, ordered implementation packets. Complete one packet at a time. Do not combine packets unless the previous packet is already green and its completion report is available.

Prepared against the repository state around:

- Repository: `powerchoosers/costivra`
- Main commit at preparation: `5d861f888b90f55d81f4ebea863defaf5da8e130`
- Application: Next.js 16, React 19, Supabase, Vercel, Resend
- Existing internal routes: `/manage/outreach` and `/manage/mail`
- Existing customer routes include documents, vendors, findings, reports, savings, settings, and onboarding-adjacent activation surfaces

Always re-check the latest code and live schema before editing. Repository documentation may contain older claims that no longer match production.

## Git operating rule

Lewis handles Git manually.

For every packet:

- Do not create or switch branches.
- Do not create commits.
- Do not push.
- Do not merge.
- Do not deploy production unless Lewis separately instructs you to do so.
- Leave the working tree in a reviewable state and report every changed file.

## Product boundaries

Preserve these rules throughout all packets:

1. AI interprets.
2. Deterministic code calculates.
3. Policies control.
4. Humans authorize consequential action.
5. Evidence proves material claims.
6. Unknown values remain unknown.
7. Potential savings are not verified savings.
8. No customer-facing finding may be promoted without the required evidence and trust review.
9. No external send may occur without authorization, idempotency, suppression checks, and an auditable side-effect record.
10. Do not weaken RLS, server authorization, private storage, malware scanning, mailbox ownership, audit history, or approval controls.
11. Do not expose provider keys or Supabase server credentials to the browser.
12. Do not invent customer records, evaluation results, delivery results, savings, or market evidence.
13. Do not add new top-level Manage navigation pages for sequences.
14. The sequence system belongs inside the existing `/manage/outreach` route.
15. Sequence-originated mail belongs inside a new view tab on the existing `/manage/mail` route.
16. Keep the initial sequence product intentionally small. No branching trees, spintax, AI-generated copy at send time, LinkedIn automation, SMS, dialer, or A/B testing in this release.
17. No automatic vendor action, contract acceptance, supplier change, payment change, or cancellation.
18. Preserve unrelated work.

## Required reading before each packet

Read the packet completely, then inspect the current versions of:

```text
AGENTS.md
STATUS.md
DECISIONS.md
package.json
vercel.json
.github/workflows/quality.yml
src/components/manage-portal.tsx
src/lib/manage/types.ts
src/lib/manage/repository.ts
src/app/manage/[[...slug]]/page.tsx
```

Read the additional files named by the packet.

## Execution order

### Wave A: Make the release truthful

1. `01_RELEASE_GATE_AND_REPOSITORY_HARDENING.md`
2. `02_REAL_INVOICE_EVALUATION_AND_SERVICE_PROOF.md`
3. `03_SECURITY_SCANNER_PROVENANCE_AND_CUSTOMER_FEEDBACK.md`

### Wave B: Complete customer communication

4. `04_LIFECYCLE_EMAILS_AND_AUTOMATED_REPORTS.md`

### Wave C: Build the controlled acquisition sequencer

5. `05_OUTREACH_SEQUENCE_DATA_MODEL_AND_APIS.md`
6. `06_OUTREACH_SEQUENCE_BUILDER_AND_ENROLLMENT_UI.md`
7. `07_SEQUENCE_EXECUTION_ENGINE_AND_SAFETY.md`
8. `08_MAIL_SEQUENCE_EMAILS_TAB_AND_REPLY_HANDLING.md`

### Wave D: Install the money pipes

9. `09_STRIPE_SUBSCRIPTIONS_AND_ENTITLEMENTS.md`
10. `10_PAID_ONBOARDING_AND_ACTIVATION.md`

### Wave E: Prove the whole pilot

11. `11_FINAL_PILOT_QA_AND_LAUNCH_GATE.md`

## Dependency map

| Packet | Depends on | May be completed independently? |
|---|---|---|
| 01 Release gate | None | Yes |
| 02 Service proof | 01 preferred | Mostly |
| 03 Scanner proof | 01 | Yes |
| 04 Emails/reports | 01 | Yes |
| 05 Sequence schema/API | 01 | Yes |
| 06 Sequence UI | 05 | No |
| 07 Sequence engine | 05, preferably 06 | No |
| 08 Mail sequence tab | 05 and 07 | No |
| 09 Stripe | 01 | Yes |
| 10 Paid onboarding | 09 | No |
| 11 Final launch gate | All applicable packets | No |

## Common completion report

Every coding agent must finish its packet with:

1. Starting commit and current working-tree state
2. Files created
3. Files modified
4. Migrations created
5. Live migrations applied, if any
6. Commands run
7. Exact pass, fail, and skip results
8. Browser flows checked
9. Remaining blockers
10. A verdict:
   - `PACKET COMPLETE`
   - `PACKET INCOMPLETE`

Do not claim completion because files exist. Completion requires the packet's acceptance criteria and verification commands to pass.

## Suggested checkpoints for Lewis

Commit after each packet or after each wave. The safest rhythm is:

```text
Packet 01
Packets 02-03
Packet 04
Packet 05
Packet 06
Packet 07
Packet 08
Packet 09
Packet 10
Packet 11
```

This gives you clean rollback points without forcing the coding agent to manage Git.
