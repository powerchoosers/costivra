# Bill and contract field ontology

Status: working extraction contract, 2026-08-22

This document defines the source facts Costivra should look for when it reads a bill, statement, order form, or service contract. It is an extraction and review contract, not a pricing conclusion or a substitute for a current tariff, contract, or professional advice.

## Core rule

Models may identify and quote source facts. Deterministic code calculates totals, reconciliation, thresholds, and verified value. A missing field remains unknown. A field is not authoritative until it has source evidence and passes the applicable review rules.

Every invoice or statement should try to capture:

- Supplier identity: vendor, invoice/statement number, account reference (masked when displayed), currency, bill-to/customer name.
- Physical service identity: service address, location, service period, billing date, due date, payment terms, purchase order, and renewal/notice facts when present.
- Account history: previous balance, payments/credits, balance forward, adjustments, and current charges. These are not interchangeable.
- Current money: subtotal, taxes, fees/surcharges, credits/discounts, total current charges, amount due, and any separately labelled charge summaries.
- Detail: line description, source key, quantity, unit, unit price/rate, amount, category candidate, and line-level service period.
- Category-specific service facts: plan/product family, phone numbers, circuit IDs, subscription/resource/cloud-account IDs, region, bandwidth, active lines/devices/seats, usage quantity/unit, included allowance, and commitment term when visibly stated.
- Registered-pack facts not covered by the common shape: a bounded `categoryFacts[]` array preserves an allowlisted field key, source-visible value, source-visible unit, and source key. It covers fields such as policy limits/deductibles, processing volumes and fee dimensions, waste container/pickup facts, benefits enrollment/tier facts, cloud/API dimensions, and contract-specific pricing or renewal facts. It never calculates, normalizes, infers, or creates a location or meter.
- Evidence: exact quote, page number when available, source key, and the field path it supports.

`serviceAddress` means the physical location receiving the service. A mailing or bill-to address must not silently become a service location. `customerName` means the account owner or legal entity named on the source; it is used as a tenant-safety signal, not as proof of ownership.

## Energy and utility

Energy bills need a repeated service-point model. A single account or summary bill can contain several meters under one service address, or several service addresses. Each visible service point should be retained as its own row and linked to a physical location.

Identity and measurement fields:

- service address, account number, ESI ID/service identifier, meter number, premise number, utility territory, product/supply name, rate code/class, service voltage, metering configuration, and customer name;
- service period, billing days, read dates, actual/estimated read status, previous/current meter reads and read unit, meter multiplier, kWh usage, delivered/received/net/generation kWh, kW demand (actual and billed), power factor, and any historical demand or ratchet language;
- current charges, prior balance/payment history, amount due, and due date.

Common line-item families:

- generation, supply, energy, or actual consumption;
- peak demand or kW demand;
- transmission, TDU, TDSP, delivery, distribution, or local delivery;
- customer/basic/metering service;
- market securitization, ancillary services, ERCOT administration/CIL, capacity/4CP, and cost-recovery riders such as DCRF, EECRF, TCRF, or storm recovery;
- late charges, gross receipts/PUC assessments, sales tax, and other government fees;
- credits, adjustments, prior-period charges, and payments.

Do not infer annual usage from one bill. Do not infer a tariff error from an aggregate delivery charge. A tariff review needs the service identifier, territory, assigned rate, metering configuration, demand information, and the applicable current tariff.

The EPA sample bill shows service address, meter number, service period, actual meter readings, rate, kWh usage, generation charge, supplier services, and balance. Oncor's commercial example adds multiplier, kW demand, power factor, TDU delivery, tax, and total. Reliant explicitly notes that an ESI ID is unique to a distinct meter location and that service and billing addresses can differ. [EPA sample electric bill](https://www.epa.gov/sites/default/files/2015-05/documents/sample-elec-bill.pdf), [Oncor REP workshop sample](https://www.oncor.com/content/dam/oncorwww/documents/partners/rep/2019%20REP%20Workshop_Main%20deck_CRIP.pdf), [Reliant business bill guide](https://www.reliant.com/en/business/small-business/help-support/small-business-resources/understanding-your-bill).

## Telecom, broadband, and VoIP

Identity and contract fields:

- corporate/account number, service address or location, telephone/fax numbers, circuit or local-loop identifier, package/plan, service period, next renewal date, due date, and payment terms;
- user/line count, phone number count, included minutes/data, usage quantity, and device or equipment identifiers when shown.

Common line-item families:

- monthly recurring or base plan charges;
- one-time, installation, activation, equipment, or non-recurring charges;
- prorated additions, changes, credits, and adjustments;
- usage, minutes, data, overage, international, roaming, or call-detail charges;
- local loop/access, port/network access, circuit, and managed-service charges;
- USF/FUSF, E-911, FCC/regulatory recovery, property-tax recovery, state/local telecom taxes, and other surcharges;
- previous balance, payments, balance forward, current charges, and total amount due.

The upload schema keeps voice/UCaaS as its own draft expert pack rather than
forcing a Nextiva-style invoice into broadband. `voice-ucaas` recognizes plan
and seat charges, minutes usage, additional lines, analytics/recording/fax
add-ons, FUSF, E-911, FCC/regulatory recovery, telecom taxes, one-time charges,
and late payment lines. Phone numbers and other identifiers remain source-backed
facts for authorized review; they are not evidence that a line is inactive or
that a plan should be changed.

The AT&T business guide separates recurring, one-time/prorated, usage, taxes, surcharges, credits/adjustments, previous balance, and current amount due. The public Nextiva and TimelyBill samples in `tests/fixtures/invoices/` show the same pattern in a small-business VoIP context, including phone/fax numbers, plan fees, minutes, USF, E-911, regulatory fees, late fees, and balance-forward sections. [AT&T business invoice guide](https://www.corp.att.com/new-bill/standard/), [AT&T sample bill](https://www.att.com/support_media/images/pdf/uverse/Sample_Bill.pdf), [Nextiva sample invoice](https://www.nextiva.com/wp-content/uploads/legacy/downloads/sample-nextiva-invoice.pdf), [TimelyBill sample VoIP invoice](https://timelybill.com/pdf/sample-voip-invoice.pdf).

For reconciliation, taxes and fee lines must not be blindly added to a subtotal check when the source labels them separately. They remain current charges for a current-charge check when the source structure supports that conclusion. If the grouping is ambiguous, the check should be incomplete and routed to review instead of reporting a false mismatch.

## Wireless and mobility

Capture the account, billing profile, service period, renewal/due facts, each line or device identifier, line access charge, plan allowance, actual usage and unit, overage, roaming, hotspot, device installment, insurance/protection, equipment, credits, USF/E-911, taxes, and amount due. The common typed service-fact fields now include phone numbers, line/device counts, plan name, usage quantity/unit, and included allowance. Do not treat a pooled allowance as actual usage or assume that a line with no usage is inactive.

The current public wireless reference is AT&T's wireless sample-bill guide,
which separates account summary, wireless service totals, line number/user,
plan, device/equipment, add-ons, company fees/surcharges, government fees and
taxes, and line total. AT&T's business usage guidance also separates data,
talk, text, and mobile purchases; those are usage facts, not automatically
billable overages. [AT&T wireless sample-bill guide](https://www.att.com/idpassets/images/support/pdf/Wireless-Sample-Bill-Guide1.pdf), [AT&T business usage records](https://www.att.com/support/smallbusiness/article/smb-wireless/KM1255173/), [Verizon business wireless reporting](https://www.verizon.com/business/en-sg/support/account-maintenance-and-management/my-business-wireless-reporting/run-and-download-reports/).

## Software, SaaS, cloud, and AI APIs

Identity and commercial fields:

- billing account/profile, customer and bill-to address, invoice number/date/due date, service period, order/subscription/PO number, renewal date, and payment terms;
- product or service family, subscription/plan, quantity, seat/user count, usage unit, unit price, discounts, credits, support, implementation, marketplace, tax, and amount due.

Cloud-specific line-item families:

- compute, GPU, storage, database, serverless, data transfer/egress, API requests/tokens, support, marketplace, reserved-instance/commitment usage, and provider credits;
- usage date or charge date, subscription/resource identifier, region, unit of measure, quantity, unit price, net charge, tax rate/amount, and total.

The Microsoft invoice guide distinguishes billing period, charges, credits, Azure credits, subtotal, tax, total, and detail lines by product/service family with charge dates, unit price, quantity, tax, and total. AWS describes bills as usage charges plus recurring fees and supports PDF invoice detail. The Sliced Invoices and Stripe samples in the repository cover invoice/order number, bill-to, quantity, service, rate/price, subtotal, tax, total, and payment details. [Microsoft invoice guide](https://learn.microsoft.com/en-us/microsoft-365/commerce/billing-and-payments/understand-your-invoice?view=o365-worldwide), [AWS billing guide](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/getting-viewing-bill.html), [Stripe invoice example](https://stripe.com/docs/invoicing/invoice-template).

Payment terms are not contract notice periods. `paymentTermsDays` belongs to an invoice or order form; `noticePeriodDays` belongs to a contract notice/renewal clause.

## Contracts and order forms

Contracts and order forms use the same source-backed identity fields as bills,
but their commercial terms must remain separate from invoice math. When shown,
 capture governed service addresses, effective and expiration dates, term length, auto-renewal, notice
period, termination fee, rate or price, pricing unit, minimum commitment, and
service identifiers. Do not turn a contract rate into a bill total, infer a
renewal date from a term length, or treat an early-termination clause as an
approved action. These facts remain reviewable candidates with exact source
evidence.

During intake, a recognized contract or order form is saved as a draft contract
record when the supplier can be matched to an organization relationship. The
first resolved service location is linked through `contracts.location_id`; all
resolved locations, source fields, service identifiers, and contract terms are
retained in contract metadata. An unmatched supplier leaves the document and
extraction available for review without inventing a vendor relationship. The
location resolver runs before contract persistence, so a source-backed address
can still create a Settings location even when the contract itself cannot yet
be promoted to a complete record.

The agreement references used for this contract shape include AT&T's public
[Business Services Agreement](https://www.corp.att.com/agreement/), a New York
Department of Public Service [commercial electricity sales agreement](https://documents.dps.ny.gov/public/Common/ViewDoc.aspx?DocRefId=%7BFB31380D-D2B3-4B38-AFCA-17289E7964FE%7D), and a Texas commercial electricity
[service agreement](https://meetings.boardbook.org/Documents/DownloadPDF/1b905725-4e42-41ec-9826-d77e49bc2f8f?org=2273). They expose the exact shapes that matter here: customer/service address, account or ESI identifiers, fixed or variable pricing units, initial term, renewal behavior, notice/termination language, and agreements governing more than one service point.

## Registered category coverage

The extraction contract derives the `categoryFacts` key allowlist from every
registered expert pack. This closes the prior loss point where a field outside
the common invoice, energy, telecom, or SaaS shape could survive only inside a
summary or an untyped line-item description. The registry currently contains 14
categories; every pack is still `draft`, so these fields support review and
questions rather than pricing, legal, insurance, tax, or savings conclusions.

| Registered pack | Source fields retained when visible | Real-world shape checked |
| --- | --- | --- |
| Commercial electricity supply | ESI/meter/account identity, read period, kWh/kW/power factor, rate, demand, taxes/assessments, supplier and contract end | EPA/Oncor/Reliant examples above; existing Costivra energy PDFs |
| SaaS subscriptions | tenant/account/invoice identity, seats vs. active licenses, per-seat/platform fees, discounts, tax, auto-renewal and notice | Microsoft, AWS, Stripe invoice examples above |
| Commercial property | policy/carrier, covered premises, building/contents values, limits, deductible, premium, fees/taxes, endorsements | [Travelers commercial declarations PDF](https://apps.travelers.com/iwcm/NorthfieldUWGuide/Documents/S2dcr.pdf) and [sample property declarations](https://www.ses-ins.com/media/gemhgbdl/ses_sample-policy_ces_042025-3.pdf) |
| General liability / BOP | policy period, operations/revenue/payroll/area, each-occurrence and aggregate limits, SIR, premium, endorsements and fees | Commercial declarations-page structure; limits and deductible remain source facts, not coverage advice |
| Workers compensation | class/payroll, experience modification, manual/carrier rates, schedule credit/debit, assessments, expense constant, audit/minimum premium terms | Carrier policy declarations and audit statements; require a reviewed carrier-specific fixture before conclusions |
| Group health | carrier/group, coverage month, enrollment by tier, employee/employer rates, admin fees, plan/network/funding/contribution facts | [New York State sample premium invoice PDF](https://info.nystateofhealth.ny.gov/sites/default/files/Sample%20Invoice.pdf) and [UHA premium billing sample](https://www.uhahealth.com/uploads/forms/sample_Premium-Billing.pdf) |
| Stop-loss / PBM / benefits administration | vendor/group, service period/basis, participants/eligibility, stop-loss premium, PBM/admin fees, deductibles, attachment, rebates and compensation disclosure | Employer premium-billing examples above; stop-loss/PBM fields remain review-only until a consented fixture is approved |
| Business broadband / DIA | circuit/account/location, bandwidth/CIR/burst, recurring/port/local-loop charges, USF/E911/regulatory recovery, term/notice/ETF | AT&T business examples above and existing Costivra broadband PDFs |
| Merchant processing | merchant/processing account, gross volume, transactions/refunds/chargebacks, interchange/network/markup/per-item/monthly fees, PCI/card-brand fees and pricing term | [Stripe margin report fields](https://docs.stripe.com/connect/margin-reports) and [Stripe IC+ fee guide](https://support.stripe.com/questions/reviewing-ic-fees-stripe-fees-and-network-costs) |
| Solid waste / recycling | account/site/container, service period, size/frequency/actual pickups, haul/rental/recycling, fuel/environmental/franchise fees, escalation/notice | [Waste Management sample invoice guide PDF](https://www.wm.com/location/california/north-county/_documents/HowtoReadComm.pdf) |
| Wireless mobility | account/profile/invoice, lines/data/roaming/devices, line/plan/installment/overage charges, USF/E911/recovery, ETF/discount terms | AT&T wireless sample-bill guide above |
| Cloud IaaS / PaaS | billing account, period/reservation, vCPU/storage/egress/requests/GPU, rates/discounts/spot/effective cost, marketplace/digital tax, commitment utilization | AWS/Microsoft examples above |
| AI API consumption | org/API account, input/output/cached tokens, requests/images/audio/fine-tuning, model/rate/batch discount, provisioned throughput and enterprise term | Provider usage invoices and cloud billing examples; retain tokens and units as source facts, never a model-calculated total |
| Voice / UCaaS | account/site/phone/extension, active lines/seats/minutes/recording/fax, plan/line/minute/add-on/device charges, FUSF/E911/taxes, renewal/ETF | Nextiva and TimelyBill sample PDFs above |

These examples establish field families, not market rates. A provider's public
sample can contain synthetic or illustrative values, and a declaration page is
not a legal coverage interpretation. The parser therefore preserves the quote
and source key, masks identifiers in customer-facing responses, and routes
missing, contradictory, or ambiguous fields to review.

## Current fixture coverage and remaining evaluation gap

The repository has public/sample fixtures for AWS receipts and VAT invoices, Azure invoices, SaaS, Nextiva, TimelyBill VoIP, a CRWWD utility bill, and additional private-evaluation samples for AT&T internet, AT&T combined small-business telecom, and an Adobe pro-forma invoice template. The current live records also include TXU and Reliant commercial-energy bills with Texas-specific supply, TDU/TDSP, ERCOT, ECRS, EECRF, DCRF, TCRF, tax, and balance-history lines. The private-evaluation examples are parser/template coverage only; they are not customer evidence or a substitute for an approved de-identified golden set.

The public samples are useful shape fixtures, not proof that the model extracts every field correctly. The parser now preserves line units and typed cross-category service facts, and the golden evaluator can assert structured fields with indexed evidence. The repository still needs an approved de-identified or consented golden set and provider-backed predictions before these shapes can become accuracy claims. The next evaluation milestone should create reviewed expected field assertions from these existing public fixtures, including:

1. one multi-page utility bill with meter/read/multiplier/demand fields;
2. one Texas energy statement with supply, TDU/TDSP, ERCOT/rider, tax, and balance-history lines;
3. one VoIP/telecom bill with recurring, usage, prorated, USF/E-911, tax, and amount-due sections;
4. one software/cloud invoice with product family, quantity, unit price, credits, tax, and payment terms;
5. one summary bill containing two service points at the same address and one with multiple addresses.

The assertions should check exact critical fields, structured fields, and evidence paths, not just whether an invoice object exists. They should also prove that uncertain fields stay null and that a source customer mismatch blocks automatic location creation. A controlled re-extraction must write a new extraction version or an ignored prediction artifact; it must never overwrite the existing live extraction as part of evaluation.
