# Public invoice fixtures

These PDFs are public sample/template documents downloaded for local extraction and review-queue tests. They are not customer records and must never be treated as production evidence.

| File | Category | Source |
| --- | --- | --- |
| `sample-voip-invoice-timelybill.pdf` | Telecom / VoIP | https://timelybill.com/pdf/sample-voip-invoice.pdf |
| `sample-telecom-invoice-nextiva.pdf` | Telecom | https://www.nextiva.com/wp-content/uploads/legacy/downloads/sample-nextiva-invoice.pdf |
| `sample-utility-bill-crwwd.pdf` | Commercial utility / energy-shaped bill | https://www.crwwd.com/wp-content/uploads/bsk-pdf-manager/2019/09/Sample_Utility_Bill.pdf |
| `sample-software-invoice-sliced.pdf` | Generic software/service invoice | https://slicedinvoices.com/pdf/wordpress-pdf-invoice-plugin-sample.pdf |
| `sample-azure-msdn-invoice.pdf` | Microsoft Azure / cloud | https://www.microsoft.com/en-us/download/details.aspx?id=38805 |
| `sample-azure-payg-invoice.pdf` | Microsoft Azure / cloud | https://www.microsoft.com/en-us/download/details.aspx?id=38805 |
| `sample-aws-vat-invoice.pdf` | Amazon Web Services / cloud | https://d1.awsstatic.com/aws-answers/answers-images/AWSEurope_Mocks_Website_VATinvoice.pdf |
| `adversarial-invoice-prompt-injection.txt` | Security regression fixture | Synthetic Costivra test data |
| `sample-aws-receipt.pdf` | Amazon Web Services / cloud receipt | https://d1.awsstatic.com/aws-answers/answers-images/AWSEurope_Mocks_Website_Receipt.pdf |

Additional public energy samples are kept in the ignored `private-evaluation/invoices/energy/public-samples/` directory so customer-like bill layouts do not enter the committed fixture set:

| File | Category | Source |
| --- | --- | --- |
| `austin-energy-solar-sample-bill.pdf` | Utility / solar meter bill | https://austinenergy.com/-/media/project/websites/shared/pdfs/green-power/billexplainer_solar.pdf |
| `coned-sample-electric-bill.pdf` | Electric and gas utility bill | https://www.coned.com/en/accounts-billing/your-bill |
| `ohio-electric-bill-made-easy.pdf` | Electric bill structure guide | https://www.occ.ohio.gov/factsheet/electric-bill-made-easy |
| `florida-commercial-electric-bill-calculations-2026.pdf` | Commercial electricity rate calculations | https://www.floridapsc.com/ |
| `comed-bill-format-samples.pdf` | Utility tariff and bill terminology | https://www.comed.com/MyAccount/MyBillUsage/Pages/UnderstandingYourBill.aspx |

For wireless structure, the authoritative public reference used by the
ontology is AT&T's [Wireless sample bill guide](https://www.att.com/idpassets/images/support/pdf/Wireless-Sample-Bill-Guide1.pdf). It is referenced in the ontology but is not copied into the repository; obtain it only in an approved private evaluation directory if a local PDF fixture is needed.

For contract and order-form structure, the ontology references public PDFs and
agreement pages rather than copying legal documents into committed fixtures:

| Reference | Shape covered | Source |
| --- | --- | --- |
| AT&T Business Services Agreement | service scope, terms, renewal, notices, charges | https://www.corp.att.com/agreement/ |
| NY DPS commercial electricity sales agreement | service address, utility account, rate unit, term, renewal, termination | https://documents.dps.ny.gov/public/Common/ViewDoc.aspx?DocRefId=%7BFB31380D-D2B3-4B38-AFCA-17289E7964FE%7D |
| Texas commercial electricity service agreement | multiple ESI IDs, term, renewal, pricing, service changes | https://meetings.boardbook.org/Documents/DownloadPDF/1b905725-4e42-41ec-9826-d77e49bc2f8f?org=2273 |

Downloaded 2026-08-01 for Costivra extraction evaluation. Microsoft and AWS files are official sample/mock documents. Verify each source and license before redistributing these files outside the repository.

`golden-manifest.smoke.json` and `golden-predictions.smoke.json` exercise the
deterministic evaluation command without calling an AI provider. They prove the
scorer is wired correctly, not that extraction quality is launch-ready. See
`docs/INVOICE_EXTRACTION_EVALUATION.md` for the private golden-set process.
