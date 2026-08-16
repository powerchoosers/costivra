# Costivra Pilot Support Runbook

**Support owner:** Unassigned pending Packet 09  
**Support channel:** Unassigned pending Packet 09  
**Hours and first-response target:** Unassigned pending Packet 09  
**Security reports:** `security@costivra.ai`
**Draft customer communication templates:** [PILOT_CUSTOMER_COMMUNICATION_TEMPLATES.md](PILOT_CUSTOMER_COMMUNICATION_TEMPLATES.md) — owner approval required before sending

## Intake questions

Ask for the organization, vendor, approximate submission time, and the visible status—not the invoice contents. Never request passwords, API keys, full payment details, or a document through an unapproved channel.

## Response guidance

| Customer report | Verify | Customer-safe response |
|---|---|---|
| Failed upload | Document state and public status | Confirm whether the source is safely quarantined or rejected; do not claim extraction completed until the workspace shows it |
| Quarantined file | Scanner availability and scan state | Explain that the source is private and held for security review; never suggest bypassing the hold |
| Failed extraction | Recovery state and source availability | Ask the customer to retry only when the workspace offers that action; escalate repeated failures |
| Incorrect extraction | Source-linked evidence and review state | Treat the extracted value as reviewable, record the correction, and keep the original source authoritative |
| Incorrect finding | Evidence, assumptions, and trust-review state | Keep the finding unapproved until a human reviews the source and correction |
| Provider outage | Status/readiness and incident severity | Share the verified capability limitation and workaround; do not invent a restoration time |
| Missed bill | Monitoring configuration, intake event, and cadence | Confirm the expected window and ask for a safe re-forward or upload only through the workspace path |
| Report failure | Delivery run and provider event | Reconcile before retrying; do not promise a duplicate-free retry without evidence |
| Bounce/complaint | Resend event and recipient state | Stop further sends to the affected address and escalate for owner review |
| Billing issue | Packet 08 billing state | Route to the assigned billing owner; no billing owner is assigned in this packet |
| Data-isolation concern | Treat as SEV-1 | Stop sharing details, preserve evidence, and use `security@costivra.ai` |

## Ticket minimum

Record time zone, route or workspace area, safe status/error code, deployment if known, organization identifier only in the protected support system, reproduction steps without private data, current customer impact, and the next owner. Link to the [Operations snapshot](/manage/operations), [Intake recovery](/manage/intake), or incident evidence rather than attaching an invoice.

## Escalation and closure

Escalate immediately for security, data loss, duplicate external action, or an ambiguous provider effect. Pause the affected workflow when necessary. Close only after the customer-visible state, authoritative database state, audit trail, and provider state agree. Packet 09 must fill in the owner, channel, hours, and response target before the pilot is represented as fully supported.
