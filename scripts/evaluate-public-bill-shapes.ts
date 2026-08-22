import { readFile } from "node:fs/promises";
import path from "node:path";
import { analyzeDocument, analyzeScannedPdf, type DocumentIntelligence } from "@/lib/ai/document-intelligence";
import { extractDocumentText, hasMeaningfulExtractedText } from "@/lib/documents/text-extraction";

type SampleCase = {
  id: string;
  file: string;
  category: "energy" | "telecom" | "software" | "cloud";
};

const samples: SampleCase[] = [
  { id: "austin-energy-solar", file: "private-evaluation/invoices/energy/public-samples/austin-energy-solar-sample-bill.pdf", category: "energy" },
  { id: "coned-electric", file: "private-evaluation/invoices/energy/public-samples/coned-sample-electric-bill.pdf", category: "energy" },
  { id: "crwwd-utility", file: "tests/fixtures/invoices/sample-utility-bill-crwwd.pdf", category: "energy" },
  { id: "nextiva-voice", file: "tests/fixtures/invoices/sample-telecom-invoice-nextiva.pdf", category: "telecom" },
  { id: "timelybill-voice", file: "tests/fixtures/invoices/sample-voip-invoice-timelybill.pdf", category: "telecom" },
  { id: "att-small-business", file: "private-evaluation/invoices/public-samples/telecom/att-small-business-sample-bill.pdf", category: "telecom" },
  { id: "att-internet-air", file: "private-evaluation/invoices/public-samples/internet/att-internet-air-sample-bill.pdf", category: "telecom" },
  { id: "sliced-software", file: "tests/fixtures/invoices/sample-software-invoice-sliced.pdf", category: "software" },
  { id: "adobe-proforma", file: "private-evaluation/invoices/public-samples/software/adobe-proforma-invoice-template.pdf", category: "software" },
  { id: "aws-vat", file: "tests/fixtures/invoices/sample-aws-vat-invoice.pdf", category: "cloud" },
];

function maskIdentifier(value: string | null | undefined): string | null {
  if (!value) return null;
  return `***${value.slice(-4)}`;
}

function maskArray(values: string[] | undefined): string[] {
  return (values ?? []).map((value) => maskIdentifier(value) ?? "");
}

function summarizeCategoryFacts(facts: DocumentIntelligence["categoryFacts"] = []) {
  return (facts ?? []).map((fact) => ({
    key: fact.key,
    value: /(?:account|customer|group|merchant|policy|circuit|phone|identifier|number|id|profile|org|api|extension|location)/i.test(fact.key)
      ? maskIdentifier(fact.value)
      : fact.value,
    unit: fact.unit,
    sourceKey: fact.sourceKey,
  }));
}

function shapeSummary(result: DocumentIntelligence) {
  const invoice = result.invoice;
  return {
    classification: result.classification,
    vendorName: result.vendorName,
    customerName: result.customerName ?? null,
    serviceAddress: result.serviceAddress ?? null,
    contractServiceAddresses: result.contractDetails?.serviceAddresses ?? [],
    contractServiceIdentifiers: maskArray(result.contractDetails?.serviceIdentifiers),
    categoryFacts: summarizeCategoryFacts(result.categoryFacts),
    invoice: invoice
      ? {
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate,
          dueDate: invoice.dueDate,
          servicePeriodStart: invoice.servicePeriodStart,
          servicePeriodEnd: invoice.servicePeriodEnd,
          accountNumberLast4: maskIdentifier(invoice.accountNumberLast4),
          subtotal: invoice.subtotal,
          taxTotal: invoice.taxTotal,
          feeTotal: invoice.feeTotal,
          creditTotal: invoice.creditTotal,
          previousBalance: invoice.previousBalance,
          paymentsAndCredits: invoice.paymentsAndCredits,
          balanceForward: invoice.balanceForward,
          currentCharges: invoice.currentCharges,
          currentPeriodCredits: invoice.currentPeriodCredits,
          totalAmount: invoice.totalAmount,
          amountDue: invoice.amountDue,
          energyServices: (invoice.energyServices ?? []).map((service) => ({
            customerName: service.customerName,
            serviceAddress: service.serviceAddress,
            serviceIdentifier: maskIdentifier(service.serviceIdentifier),
            meterId: maskIdentifier(service.meterId),
            utilityTerritory: service.utilityTerritory,
            billingDays: service.billingDays,
            readStatus: service.readStatus ?? null,
            previousMeterRead: service.previousMeterRead ?? null,
            currentMeterRead: service.currentMeterRead ?? null,
            meterReadUnit: service.meterReadUnit ?? null,
            usageKwh: service.usageKwh,
            deliveredKwh: service.deliveredKwh ?? null,
            receivedKwh: service.receivedKwh ?? null,
            netUsageKwh: service.netUsageKwh ?? null,
            generationKwh: service.generationKwh ?? null,
            actualDemandKw: service.actualDemandKw,
            billedDemandKw: service.billedDemandKw,
            powerFactor: service.powerFactor ?? null,
            meterMultiplier: service.meterMultiplier,
            averagePricePerKwh: service.averagePricePerKwh,
            readDateStart: service.readDateStart,
            readDateEnd: service.readDateEnd,
          })),
          chargeSummaries: {
            count: invoice.chargeSummaries?.length ?? 0,
            labels: (invoice.chargeSummaries ?? []).slice(0, 30).map((summary) => summary.label),
          },
          serviceDetails: invoice.serviceDetails
            ? {
                planName: invoice.serviceDetails.planName,
                productFamily: invoice.serviceDetails.productFamily,
                serviceAddresses: invoice.serviceDetails.serviceAddresses,
                serviceIdentifiers: maskArray(invoice.serviceDetails.serviceIdentifiers),
                phoneNumbers: maskArray(invoice.serviceDetails.phoneNumbers),
                circuitIds: maskArray(invoice.serviceDetails.circuitIds),
                subscriptionIdentifiers: maskArray(invoice.serviceDetails.subscriptionIdentifiers),
                resourceIdentifiers: maskArray(invoice.serviceDetails.resourceIdentifiers),
                cloudAccountIdentifiers: maskArray(invoice.serviceDetails.cloudAccountIdentifiers),
                region: invoice.serviceDetails.region,
                bandwidthQuantity: invoice.serviceDetails.bandwidthQuantity,
                bandwidthUnit: invoice.serviceDetails.bandwidthUnit,
                lineCount: invoice.serviceDetails.lineCount,
                deviceCount: invoice.serviceDetails.deviceCount,
                seatCount: invoice.serviceDetails.seatCount,
                usageQuantity: invoice.serviceDetails.usageQuantity,
                usageUnit: invoice.serviceDetails.usageUnit,
                includedUsageQuantity: invoice.serviceDetails.includedUsageQuantity,
                includedUsageUnit: invoice.serviceDetails.includedUsageUnit,
                commitmentType: invoice.serviceDetails.commitmentType,
                commitmentTermMonths: invoice.serviceDetails.commitmentTermMonths,
              }
            : null,
          lineItems: {
            count: invoice.lineItems.length,
            units: Array.from(new Set(invoice.lineItems.map((line) => line.unit).filter((unit): unit is string => Boolean(unit)))),
            taxRateCount: invoice.lineItems.filter((line) => line.taxRate !== null && line.taxRate !== undefined).length,
            descriptions: invoice.lineItems.slice(0, 20).map((line) => line.description),
          },
        }
      : null,
    evidenceCount: result.evidence.length,
  };
}

async function analyzeSample(sample: SampleCase) {
  const filePath = path.resolve(process.cwd(), sample.file);
  const buffer = await readFile(filePath);
  const extracted = await extractDocumentText(buffer, "application/pdf");
  const requiresOcr = !hasMeaningfulExtractedText(extracted.text);
  const result = requiresOcr
    ? await analyzeScannedPdf({ documentName: path.basename(sample.file), buffer, pageCount: extracted.pageCount })
    : await analyzeDocument({
        documentName: path.basename(sample.file),
        mimeType: "application/pdf",
        extractedText: extracted.text,
        pageCount: extracted.pageCount,
      });
  return {
    id: sample.id,
    category: sample.category,
    file: sample.file,
    inputMode: requiresOcr ? "pdf_ocr" : "native_text",
    pages: extracted.pageCount,
    textCharacters: extracted.text.length,
    result: shapeSummary(result),
  };
}

async function main() {
  const configuredKey = process.env.OPEN_ROUTER_API_KEY ?? process.env.OPENROUTER_API_KEY ?? "";
  if (!configuredKey.startsWith("sk-or-") || configuredKey.length < 20) {
    throw new Error("A configured OpenRouter key is required for this public-sample smoke.");
  }

  const requestedIds = new Set(
    (process.env.PUBLIC_BILL_SHAPE_IDS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  const selectedSamples = requestedIds.size > 0 ? samples.filter((sample) => requestedIds.has(sample.id)) : samples;
  const results: Array<Record<string, unknown>> = [];
  for (const sample of selectedSamples) {
    try {
      results.push(await analyzeSample(sample));
    } catch (error) {
      results.push({
        id: sample.id,
        category: sample.category,
        file: sample.file,
        error: error instanceof Error ? error.message.slice(0, 500) : "Unknown provider error",
      });
    }
  }

  const failures = results.filter((result) => "error" in result);
  console.log(JSON.stringify({ model: process.env.OPENROUTER_MODEL ?? "openai/gpt-4.1-mini", total: results.length, failures: failures.length, results }, null, 2));
  if (failures.length > 0) process.exitCode = 1;
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
