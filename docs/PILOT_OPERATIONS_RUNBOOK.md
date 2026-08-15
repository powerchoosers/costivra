# Costivra Pilot Operations Runbook

**Owner:** Unassigned — Lewis to assign before pilot launch  
**Support channel:** Unassigned — do not promise an SLA until Packet 09 records the channel  
**Hours/response target:** Unassigned  
**Primary operator surfaces:** Manage → Intake operations, Manage → Settings → Production readiness, Customer Reports delivery history, Outreach recovery

## Start-of-day check

1. Open `/api/status` and confirm the result is truthful for customers.
2. In Manage, run Production readiness. Record blocked or warning services without copying secrets.
3. Review Intake operations for queued, processing, retrying, quarantined, and dead-lettered work.
4. Review report delivery history and email events for failed, bounced, complained, or suppressed states.
5. Review open recovery actions and assign each one to a named operator.

## Safe operating rules

- Never release a file from quarantine without a clean malware result.
- Never retry an ambiguous external send until the provider event or side-effect ledger has been reconciled.
- Retry only from the event-specific Manage recovery view; do not edit queue rows directly.
- Do not paste invoice text, provider payloads, tokens, or secret values into tickets or logs.
- A 401 from a protected cron route without the cron credential is an expected security response, not proof of worker failure.

## Quick recovery map

| Symptom | First check | Safe action | Escalate when |
|---|---|---|---|
| Upload does not process | `/api/status`, scanner state, document status | Leave source quarantined; configure/verify scanner, then rescan | Scanner remains unavailable or source status is inconsistent |
| Forwarded bill missing | Intake address, inbound event, queue status | Inspect event; retry only when the source and failure code permit it | Event is dead-lettered or the provider delivery is unknown |
| Extraction failed | Recovery queue and source availability | Retry extraction from Manage | Source expired, repeated failure, or duplicate record appears |
| Finding looks wrong | Source-linked evidence and review state | Keep finding unapproved; record correction for review | Material financial impact or evidence mismatch |
| Report did not arrive | Report delivery run, recipient state, Resend event | Reconcile provider status before retrying | Bounce/complaint, ambiguous provider acceptance, or repeated failure |
| Customer sees outage | Public status plus internal readiness | Communicate only the sanitized status | Cross-tenant, privacy, or security concern |

## Pause controls

Pause affected intake, report, or outbound workflow when data integrity, tenant isolation, or provider acceptance is ambiguous. Keep already received sources private and preserve audit records. Do not delete evidence to make a queue look healthy.

## Handoff

Record the safe error code, deployment, route/worker, correlation/request identifier when available, affected organization identifier only in protected internal systems, current state, attempted recovery, and next owner. Link to the relevant Manage recovery view rather than exporting private records.
