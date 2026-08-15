# Public Software, Telecom, and Internet Sample Inventory

**Purpose:** parser and template regression only. These documents are public sample/template files and do **not** satisfy the approved de-identified/consented invoice golden-set requirement.

Downloaded August 15, 2026 into the ignored path:

`private-evaluation/invoices/public-samples/`

| Local file | Category | Official source | SHA-256 |
|---|---|---|---|
| `software/adobe-proforma-invoice-template.pdf` | Software-shaped invoice template | [Adobe proforma invoice template](https://www.adobe.com/dc-shared/assets/pdf/acrobat/business/resources/proforma-invoice-template.pdf) | `6fbb52abf5b15c0cf80b43c06e0e7fd41685f560050ec441fe4a4833a0d98001` |
| `telecom/att-small-business-sample-bill.pdf` | Telecom / combined business bill | [AT&T Small Business sample bill](https://www.att.com/scmsassets/images/support/smb/pdf/SampleBillGuide-SmallBiz.pdf) | `901e6f9916f7e2917b624125385e4d19da78bff7f46839bbbe4eca431499d0019` |
| `internet/att-internet-air-sample-bill.pdf` | Internet service bill | [AT&T Internet Air sample bill](https://www.att.com/scmsassets/support/internet/att-internet-air-sample-bill.pdf) | `5b949d6c72075b9bc7ea3e41280925304e2aec631b00b09201ddc4702117516a` |

## Parser verification

The same `src/lib/documents/text-extraction.ts` PDF path used by production intake parsed all three new files successfully under Node 24.19.0:

| File | Pages | Extracted text characters | Result |
|---|---:|---:|---|
| Adobe template | 1 | 252 | PASS |
| AT&T Small Business | 2 | 5,901 | PASS |
| AT&T Internet Air | 3 | 1,617 | PASS |

The software/telecom/internet test group now has 11 public PDFs spanning software, cloud/software, telecom, VoIP, and internet formats. The separate energy inventory contains five additional public PDFs. All remain engineering coverage only. They must not be placed in an approved private manifest or used to promote a category to `verified_for_pilot`.

Run the reproducible parser check with:

```powershell
npm run eval:public-invoice-samples
```
