import { describe, expect, it } from "vitest";
import type { DocumentIntelligence } from "@/lib/ai/document-intelligence";
import {
  evaluateGoldenInvoices,
  parseGoldenInvoiceManifest,
  parseGoldenPredictionSet,
  type GoldenInvoiceManifest,
} from "@/lib/ai/invoice-evaluation";

const expectedInvoice = {
  invoiceNumber: "INV-1",
  invoiceDate: "2026-07-01",
  dueDate: null,
  servicePeriodStart: "2026-06-01",
  servicePeriodEnd: "2026-06-30",
  accountNumberLast4: null,
  purchaseOrderNumber: null,
  subtotal: "100.00",
  taxTotal: "8.00",
  feeTotal: "0.00",
  creditTotal: "0.00",
  previousBalance: null,
  paymentsAndCredits: null,
  balanceForward: null,
  currentCharges: "100.00",
  currentPeriodCredits: "0.00",
  totalAmount: "108.00",
  amountDue: "108.00",
  energyService: null,
  lineItems: [
    {
      description: "Fiber service",
      quantity: "1",
      unitPrice: "100.00",
      amount: "100.00",
      category: "internet",
      servicePeriodStart: null,
      servicePeriodEnd: null,
    },
  ],
};

function manifest(): GoldenInvoiceManifest {
  return parseGoldenInvoiceManifest({
    schemaVersion: "costivra-golden-invoice-v1",
    name: "Unit evaluation",
    coverageRequirements: { software: 0, telecomInternet: 1, utility: 0, scanned: 0 },
    thresholds: {
      classificationAccuracy: 1,
      criticalFieldPrecision: 1,
      criticalFieldRecall: 1,
      lineItemPrecision: 1,
      lineItemRecall: 1,
      evidenceCitationRecall: 1,
      evidenceGroundedPrecision: 1,
      reconciliationAccuracy: 1,
      reviewRoutingAccuracy: 1,
      maximumExtractionErrors: 0,
    },
    cases: [
      {
        id: "telecom-clean-1",
        file: "telecom-clean-1.txt",
        mimeType: "text/plain",
        scanned: false,
        dataClassification: "synthetic_smoke",
        reviewReference: "unit-fixture-review",
        provenanceReference: "unit-fixture-provenance",
        segment: "telecom_internet",
        expected: {
          classification: "invoice",
          vendorName: "Acme Telecom, Inc.",
          currency: "USD",
          invoice: expectedInvoice,
          reconciliationStatus: "reconciled",
          needsReview: false,
          requiredEvidenceFields: ["vendorName", "invoice.totalAmount"],
        },
      },
    ],
  });
}

function prediction(): DocumentIntelligence {
  return {
    classification: "invoice",
    summary: "Monthly fiber invoice.",
    vendorName: "ACME Telecom",
    currency: "USD",
    totalAmount: "108.00",
    renewalDate: null,
    noticePeriodDays: null,
    confidence: 0.96,
    invoice: { ...expectedInvoice },
    evidence: [
      { field: "vendorName", quote: "ACME Telecom" },
      { field: "invoice.totalAmount", quote: "Total 108.00" },
    ],
  };
}

const sourceText =
  "ACME Telecom monthly invoice. Fiber service 100.00. Total 108.00.";

describe("golden invoice evaluation", () => {
  it("passes a fully correct, grounded, reconciled extraction", () => {
    const report = evaluateGoldenInvoices({
      manifest: manifest(),
      predictions: [{ id: "telecom-clean-1", result: prediction() }],
      sourceTextByCaseId: new Map([["telecom-clean-1", sourceText]]),
    });

    expect(report.passed).toBe(true);
    expect(report.failedGates).toEqual([]);
    expect(report.metrics).toEqual({
      classificationAccuracy: 1,
      criticalFieldPrecision: 1,
      criticalFieldRecall: 1,
      lineItemPrecision: 1,
      lineItemRecall: 1,
      evidenceCitationRecall: 1,
      evidenceGroundedPrecision: 1,
      reconciliationAccuracy: 1,
      reviewRoutingAccuracy: 1,
    });
  });

  it("fails wrong money, invented evidence, arithmetic, and review routing", () => {
    const result = prediction();
    result.invoice = { ...result.invoice!, totalAmount: "999.00" };
    result.totalAmount = "999.00";
    result.evidence = [
      { field: "vendorName", quote: "ACME Telecom" },
      { field: "invoice.totalAmount", quote: "Fabricated total 999.00" },
    ];

    const report = evaluateGoldenInvoices({
      manifest: manifest(),
      predictions: [{ id: "telecom-clean-1", result }],
      sourceTextByCaseId: new Map([["telecom-clean-1", sourceText]]),
    });

    expect(report.passed).toBe(false);
    expect(report.metrics.criticalFieldPrecision).toBeLessThan(1);
    expect(report.metrics.criticalFieldRecall).toBeLessThan(1);
    expect(report.metrics.evidenceCitationRecall).toBe(0.5);
    expect(report.metrics.evidenceGroundedPrecision).toBe(0.5);
    expect(report.metrics.reconciliationAccuracy).toBe(0);
    expect(report.metrics.reviewRoutingAccuracy).toBe(0);
    expect(report.cases[0].failures).toEqual(
      expect.arrayContaining([
        expect.stringContaining("invoice.totalAmount"),
        expect.stringContaining("evidence missing or ungrounded"),
        expect.stringContaining("reconciliation"),
        expect.stringContaining("review routing"),
      ]),
    );
  });

  it("treats a missing prediction as an extraction error and failed gate", () => {
    const report = evaluateGoldenInvoices({
      manifest: manifest(),
      predictions: [],
    });
    expect(report.extractionErrors).toBe(1);
    expect(report.passed).toBe(false);
    expect(report.failedGates).toContain("extractionErrors 1 exceeds 0");
  });

  it("requires exact ground-truth fields and snippets for scanned evidence", () => {
    const raw = JSON.parse(JSON.stringify(manifest())) as Record<string, unknown>;
    const cases = raw.cases as Array<Record<string, unknown>>;
    cases[0].scanned = true;
    expect(() => parseGoldenInvoiceManifest(raw)).toThrow(
      "every required evidence field needs an evidenceSnippets entry",
    );
  });

  it("requires an explicit data classification and review reference", () => {
    const raw = JSON.parse(JSON.stringify(manifest())) as Record<string, unknown>;
    const cases = raw.cases as Array<Record<string, unknown>>;
    delete cases[0].dataClassification;
    expect(() => parseGoldenInvoiceManifest(raw)).toThrow("dataClassification must be a non-empty string");

    cases[0].dataClassification = "deidentified_real";
    delete cases[0].reviewReference;
    expect(() => parseGoldenInvoiceManifest(raw)).toThrow("reviewReference must be a non-empty string");

    cases[0].reviewReference = "unit-fixture-review";
    delete cases[0].provenanceReference;
    expect(() => parseGoldenInvoiceManifest(raw)).toThrow("provenanceReference must be a non-empty string");
  });

  it("rejects absolute source paths and impossible expected totals", () => {
    const absolute = JSON.parse(JSON.stringify(manifest())) as Record<string, unknown>;
    const absoluteCase = (absolute.cases as Array<Record<string, unknown>>)[0];
    absoluteCase.file = "C:\\private\\invoice.pdf";
    expect(() => parseGoldenInvoiceManifest(absolute)).toThrow("absolute paths are not allowed");

    const impossible = JSON.parse(JSON.stringify(manifest())) as Record<string, unknown>;
    const impossibleCase = (impossible.cases as Array<Record<string, unknown>>)[0];
    const impossibleExpected = impossibleCase.expected as Record<string, unknown>;
    const invoice = impossibleExpected.invoice as Record<string, unknown>;
    invoice.totalAmount = "999.00";
    invoice.amountDue = "999.00";
    expect(() => parseGoldenInvoiceManifest(impossible)).toThrow("totals do not reconcile");
  });

  it("validates saved predictions through the production output parser", () => {
    const parsed = parseGoldenPredictionSet({
      schemaVersion: "costivra-invoice-predictions-v1",
      generatedAt: "2026-08-02T00:00:00.000Z",
      model: "test-model",
      cases: [
        {
          id: "telecom-clean-1",
          result: { ...prediction(), externalAction: "pay_invoice" },
        },
      ],
    });
    expect(parsed.cases[0].result).not.toHaveProperty("externalAction");
  });
});
