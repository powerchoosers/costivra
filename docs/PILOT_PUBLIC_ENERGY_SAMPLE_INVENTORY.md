# Public Electricity Sample Inventory

**Purpose:** parser/template coverage only. These documents are public illustrative samples and do **not** satisfy the real de-identified/consented invoice golden-set gate.

Downloaded August 15, 2026 into the ignored path:

`private-evaluation/invoices/energy/public-samples/`

| Local file | Source | Use | SHA-256 |
|---|---|---|---|
| `coned-sample-electric-bill.pdf` | [Con Edison sample bill](https://www.coned.com/-/media/files/coned/documents/accountandbilling/your-bill/bill-credit/sample-bill.pdf) | Utility bill with supply/delivery charges and meter detail | `213696ba5f873ea453b23150d0f7753f7cd8894c970e960c270c46068bac0b6b` |
| `comed-bill-format-samples.pdf` | [ComEd bill-format tariff](https://www.comed.com/cdn/assets/v3/assets/blt3ebb3fed6084be2a/blt0f3895eef5405d4b/65398183d25def000df16b0e/Bill_Format_Tariff.pdf?branch=prod_alias) | Illustrative residential and nonresidential bill formats | `25350b358dac111a498ef7f70d2220159af29ffaad8cb3e77a21554a7a882903` |
| `florida-commercial-electric-bill-calculations-2026.pdf` | [Florida Public Service Commission commercial calculations](https://www.floridapsc.com/pscfiles/website-files/PDF/Utilities/Electricgas/BillCalculations/bill_calc-2026.pdf) | Commercial/industrial rate-class examples for FPL, Duke Florida, TECO, and FPUC | `86be21bd4ba36a3781e473ccbf30ce442d564b52e5552a70114705634576f1ca` |
| `austin-energy-solar-sample-bill.pdf` | [Austin Energy solar sample bill](https://austinenergy.com/-/media/project/websites/shared/pdfs/green-power/billexplainer_solar.pdf?hash=8EECFEC51D610C6A698CA787852D7DDC&rev=5d38f20f340d4252bc190367883736a4&sc_lang=en) | Solar generation, net usage, credits, tiered charges | `6a5e1ac07f6c15ebcf68c4f987ac43f4b66ec4a13dd2b2f53023bdaba42b61ad` |
| `ohio-electric-bill-made-easy.pdf` | [Ohio Consumers' Counsel bill guide](https://occ.ohio.gov/sites/default/files/2026-06/OCC-Electric-Bill-Made-Easy_0.pdf) | Educational bill structure and common charge categories | `50bb71aac38cc9652113fa406ef36d478825c78349b68b0aaca071f3e2a2ddf5` |

## Handling decision

These files may be used for local parser/OCR/template regression after independent labels are created. They are not customer records, but they are still not a substitute for representative customer-authorized documents. Do not promote commercial-energy extraction based only on these examples.

## Vendor-catalog decision

The live Costivra catalog now includes these seven electricity providers as `candidate` customer options under `Commercial Energy`, with common-name search aliases:

- Con Edison
- ComEd
- Austin Energy
- Florida Power & Light
- Duke Energy Florida
- Tampa Electric Company
- Florida Public Utilities Company

They are candidates because the sources establish that these are real providers, not because Costivra has a partnership with them or because each provider serves every customer location. The Florida Public Service Commission and Ohio Consumers' Counsel remain excluded because they are regulator/education sources, not vendors.

The two local files supplied separately by Lewis—`PIR Invoice Bilhartz.pdf` and `TXU Bill For Main Meter.png`—remain outside this downloaded public sample set. They appear to be customer/business records and require de-identification and a reviewer/provenance reference before entering the private golden corpus.
