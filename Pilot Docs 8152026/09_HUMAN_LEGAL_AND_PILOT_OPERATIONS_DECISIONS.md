# Packet 09: Human, Legal, and Pilot Operations Decisions

**Snapshot date:** August 15, 2026  
**Priority:** Critical  
**Pilot requirement:** Mandatory  
**Primary owner:** Lewis and qualified advisers

## Mission

Turn unresolved human decisions into an explicit pilot operating contract. Code cannot approve legal language, select customers, set a support promise, decide retention, or accept commercial risk.

This packet should create a decision record, not pretend that blank fields are approvals.

## Output required

Create or update:

```text
docs/PILOT_GOVERNANCE_DECISIONS.md
```

Every decision must include:

- status;
- decision;
- owner;
- approver when different;
- date;
- evidence or document reference;
- review date;
- launch impact;
- notes.

Allowed statuses:

```text
APPROVED
APPROVED_WITH_LIMITS
PENDING
REJECTED
NOT_APPLICABLE
```

A missing answer is `PENDING`, not assumed approval.

## Workstream A: Define the first pilot

Record:

- pilot name;
- target start date;
- target end or review date;
- maximum organizations;
- named organizations or selection criteria;
- categories supported;
- categories excluded;
- geographic scope;
- free, manually invoiced, or Stripe-paid;
- plan or service level;
- customer success owner;
- support channel;
- weekly review cadence;
- conditions for pausing or removing a tenant.

Recommended initial boundary:

- 3 to 5 invited organizations;
- founder-led qualification;
- no public self-serve promotion;
- direct support;
- human review of material findings;
- no autonomous vendor action;
- no savings guarantee.

The recommendation is not the decision. Lewis must approve or change it.

## Workstream B: Customer and document consent

Decide and document:

- who may upload or forward a bill;
- how authority to share vendor documents is represented;
- permitted document categories;
- prohibited sensitive data;
- whether real documents may be used for product evaluation;
- de-identification process;
- consent for model or provider processing;
- data-processing and subprocessors disclosure;
- process for revoking consent;
- handling of mistakenly uploaded documents;
- policy for test and support access.

Do not use a pilot customer's documents in the golden set unless the consent explicitly permits it.

## Workstream C: Legal documents

Have qualified counsel review and reference the approved versions of:

- Privacy Policy;
- Terms of Service;
- pilot or design-partner agreement;
- data-processing language where needed;
- UCEP relationship and conflict disclosure;
- consent and authorization language;
- performance-fee method;
- savings methodology and disclaimers;
- no-guarantee language;
- acceptable-use restrictions;
- third-party provider disclosure;
- limitation of liability;
- dispute, governing-law, and termination terms;
- communication consent;
- document retention and deletion language.

The coding agent may identify inconsistencies and insert approved copy. It must not act as legal approver.

Record version, date, and counsel or approver reference.

## Workstream D: Savings and finding policy

Define:

- difference between anomaly, opportunity, potential value, realized value, and verified savings;
- acceptable evidence for each stage;
- who performs trust review;
- who may approve an action;
- acceptable baseline;
- acceptable comparison period;
- treatment of taxes, fees, credits, usage changes, one-time charges, and seasonality;
- how disputed findings are handled;
- whether and how a performance fee applies;
- when a verified result can be shown in reports or marketing;
- correction and reversal process.

Hard boundary:

- an estimate cannot become verified savings merely because a user approved it;
- a marketing claim cannot use a pilot result without explicit permission and evidence.

## Workstream E: Retention, deletion, and legal hold

Choose values or policy references for:

- quarantined source retention;
- clean source-document retention;
- extracted data retention;
- report retention;
- audit-event retention;
- email and webhook metadata retention;
- evaluation corpus retention;
- deleted-organization grace period;
- backup retention;
- support artifacts and screenshots;
- legal hold;
- deletion request response process.

Record:

- policy owner;
- enforcement date;
- whether enforcement is report-only or active;
- exceptions;
- customer-facing disclosure;
- deletion verification method.

Do not enable destructive enforcement until Packet 03 proves the procedure.

## Workstream F: Security and incident ownership

Assign:

- primary incident owner;
- backup incident owner;
- security contact;
- customer-support owner;
- provider-outage owner;
- billing owner if Packet 08 is active;
- legal escalation contact;
- data-deletion approver.

Define severity:

### Severity 1

Examples:

- suspected cross-tenant exposure;
- unauthorized private-document access;
- secret exposure;
- incorrect external vendor action;
- widespread data loss.

### Severity 2

Examples:

- pilot intake unavailable;
- persistent extraction failure;
- reports or lifecycle email failing for multiple tenants;
- incorrect material findings reaching customers.

### Severity 3

Examples:

- single-document failure with recovery;
- non-critical UI defect;
- delayed optional report.

Record response targets and communication authority. Do not promise a 24/7 SLA unless it can be staffed.

## Workstream G: Support model

Decide:

- support email or channel;
- support hours;
- first-response target;
- escalation target;
- who may view customer documents;
- how support access is audited;
- how customers report incorrect extraction or findings;
- how urgent security concerns are reported;
- whether phone support is offered;
- onboarding meeting format;
- weekly check-in format;
- pilot closeout and feedback process.

Provide the exact customer-facing support route only after it exists and is monitored.

## Workstream H: Provider and commercial decisions

Record decisions for:

### Malware scanning

- selected provider;
- plan and quota;
- monthly budget;
- overage handling;
- outage policy;
- credential owner.

### AI or extraction provider

- selected provider;
- data-handling terms;
- model version policy;
- cost ceiling;
- fallback behavior;
- private-data restrictions.

### Resend

- sender identities;
- support inbox;
- complaint and bounce owner;
- sending limits;
- inbound address policy.

### Supabase

- plan;
- backup and restore method;
- leaked-password protection decision;
- region and data-residency considerations.

### Vercel and monitoring

- plan;
- observability provider;
- alert destinations;
- log-retention expectations.

### Stripe, when applicable

- free versus paid pilot;
- prices;
- billing cadence;
- refund policy;
- cancellation policy;
- tax treatment;
- live-mode authorization;
- account owner.

## Workstream I: Pilot customer selection

For each candidate, record:

- organization;
- primary contact;
- authority to participate;
- expected categories;
- expected document volume;
- technical fit;
- willingness to provide feedback;
- data sensitivity;
- conflicts or disclosures;
- agreement status;
- onboarding owner;
- risk level;
- launch order.

Do not onboard all customers simultaneously. Use staged waves:

1. internal or friendly design partner;
2. second tenant with a different document pattern;
3. remaining pilot tenants after the first week is stable.

## Workstream J: Launch pause and exit criteria

Define pause triggers:

- scanner unavailable beyond the approved period;
- cross-tenant test failure;
- repeated incorrect material findings;
- queue age beyond threshold;
- bounce or complaint spike;
- provider cost anomaly;
- inability to support customers;
- legal or consent concern;
- backup or restore concern;
- data deletion failure.

Define success criteria:

- document success rate;
- review turnaround;
- false-positive rate;
- customer engagement;
- report delivery;
- support burden;
- verified outcomes, when eligible;
- no security incident;
- willingness to continue or pay.

Define exit:

- how data is exported;
- how data is deleted or retained;
- how billing stops;
- how monitoring addresses are disabled;
- how final report and feedback are delivered.

## Required decision checklist

Before Packet 10 may return a ready verdict, all required rows below must be `APPROVED`, `APPROVED_WITH_LIMITS`, or legitimately `NOT_APPLICABLE`:

- [ ] First pilot organizations or approved selection criteria
- [ ] Free, manual billing, or Stripe track
- [ ] Pilot price or free terms
- [ ] Pilot agreement
- [ ] Privacy Policy
- [ ] Terms of Service
- [ ] UCEP relationship disclosure
- [ ] Consent to process documents
- [ ] Savings and performance-fee method
- [ ] Retention windows
- [ ] Deletion process
- [ ] Backup and restore owner
- [ ] Incident owner
- [ ] Support channel
- [ ] Support hours and response target
- [ ] Malware scanner provider and budget
- [ ] AI provider and data-handling approval
- [ ] Resend sending and complaint owner
- [ ] Live Stripe authorization, or `NOT_APPLICABLE`
- [ ] Pilot pause criteria
- [ ] Pilot success and exit criteria

## Acceptance criteria

- `docs/PILOT_GOVERNANCE_DECISIONS.md` exists.
- Every required decision has an owner and status.
- Legal approvals reference an approved version and approver.
- Blank or unavailable decisions remain pending.
- Pilot boundaries are explicit.
- Retention and deletion values are explicit or block launch.
- Incident and support ownership are assigned.
- Free, manually invoiced, and Stripe-paid tracks are not confused.
- No live billing or real customer onboarding is authorized implicitly.
- Packet 10 can determine launch impact without guessing.

## Explicitly out of scope

- providing legal advice or legal approval;
- signing agreements;
- choosing values on Lewis's behalf;
- enabling live billing;
- onboarding customers;
- sending policy emails;
- applying destructive retention;
- fabricating counsel approval;
- committing or deploying without explicit authorization.

## Completion report

Return the shared completion report from Packet 00. The packet verdict is:

- `PASS` only when every launch-required human decision is complete;
- `PARTIAL` when the decision record exists but some non-blocking items remain;
- `BLOCKED` when a mandatory launch decision remains pending.
