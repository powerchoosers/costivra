# Costivra Pilot Incident Response

**Incident owner:** Unassigned pending Packet 09  
**Security contact:** `security@costivra.ai` is published for suspected security issues  
**General support channel and response target:** Unassigned pending Packet 09

## Severity

- **SEV-1:** suspected cross-tenant access, secret exposure, document loss, unauthorized external action, or active security compromise. Pause the affected path immediately.
- **SEV-2:** mandatory pilot path is unavailable, repeatedly duplicates work, or cannot reconcile an external effect.
- **SEV-3:** a customer-facing issue has a safe workaround and no evidence of data loss or isolation failure.
- **SEV-4:** non-pilot feature, cosmetic issue, or expected unauthenticated probe.

## First 15 minutes

1. Confirm the symptom with a safe request and capture time, deployment, route, status, and safe error code.
2. Check `/api/status` and Manage Production readiness.
3. Decide whether to pause intake, scanning, reports, or outbound sends.
4. Preserve the queue, side-effect, audit, and provider-event records. Do not retry an ambiguous send.
5. For a security concern, use `security@costivra.ai`; do not include invoice text or secrets.

## Common incident playbooks

### Failed or quarantined upload

Keep the source private. Confirm scanner configuration and document/attachment state. If a clean result is available, use the guarded rescan/release control. If the scanner is unavailable, tell the customer processing is paused and do not bypass quarantine.

### Duplicate inbound webhook or cron

Check the durable event key, worker-run ledger, authoritative document, report delivery run, and external-side-effect claim. The expected result is one authoritative record and one external side effect. Do not delete the duplicate blindly; preserve the audit trail and use the recovery view.

### Provider timeout or ambiguous report send

Mark the operation ambiguous, reconcile against provider events and the side-effect ledger, and retry only if no accepted/delivered provider reference exists. A timeout alone is not proof that the provider did not accept the send.

### Data-isolation concern

Pause access to the affected route, record the organization and resource identifiers only in protected internal systems, preserve audit evidence, and escalate as SEV-1. Never investigate by sharing customer documents in chat or logs.

## Communication

Use the approved customer communication templates when Packet 09 assigns an owner and channel. Until then, communicate only verified facts: affected capability, current safe state, workaround if any, and next update owner/time. Do not promise restoration, deletion, or response times that have not been approved.

## Closure and review

Close only after the authoritative state is reconciled, the customer-facing status is accurate, recovery is tested, and no duplicate external effect remains. Record root cause, timeline, safe error code, deployment, evidence links, customer impact, corrective action, and a regression test. Packet 09 must record the human owner and support commitments before final launch.
