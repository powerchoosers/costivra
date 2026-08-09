import {
  parseDocumentIntelligence,
  type DocumentClassification,
  type DocumentIntelligence,
} from "@/lib/ai/document-intelligence";
import {
  normalizeDecimal,
  normalizeMoney,
  normalizeVendorName,
  reconcileInvoice,
} from "@/lib/domain/invoices";
import { classifyInvoiceReview } from "@/lib/domain/invoice-review";

export const GOLDEN_INVOICE_SCHEMA_VERSION = "costivra-golden-invoice-v1";
export const GOLDEN_PREDICTION_SCHEMA_VERSION =
  "costivra-invoice-predictions-v1";

export const criticalInvoiceFields = [
  "invoiceNumber",
  "invoiceDate",
  "dueDate",
  "servicePeriodStart",
  "servicePeriodEnd",
  "accountNumberLast4",
  "purchaseOrderNumber",
  "subtotal",
  "taxTotal",
  "feeTotal",
  "creditTotal",
  "totalAmount",
  "amountDue",
] as const;

export type CriticalInvoiceField = (typeof criticalInvoiceFields)[number];
export type ScoredFieldPath =
  | "vendorName"
  | "currency"
  | `invoice.${CriticalInvoiceField}`;
export type EvidenceFieldPath = ScoredFieldPath | "invoice.lineItems";

export type GoldenLineItem = {
  description: string;
  quantity: string | null;
  unitPrice: string | null;
  amount: string;
  category: string | null;
  servicePeriodStart: string | null;
  servicePeriodEnd: string | null;
};

export type GoldenInvoiceExpectation = Record<
  CriticalInvoiceField,
  string | null
> & {
  lineItems?: GoldenLineItem[];
};

export type GoldenInvoiceCase = {
  id: string;
  file: string;
  mimeType: string;
  scanned: boolean;
  dataClassification: "synthetic_smoke" | "deidentified_real" | "consented_real" | "adversarial" | "scanned_real";
  reviewReference: string;
  provenanceReference: string;
  segment: "software" | "telecom_internet" | "utility" | "other";
  expected: {
    classification: DocumentClassification;
    vendorName: string | null;
    currency: string | null;
    invoice: GoldenInvoiceExpectation | null;
    reconciliationStatus: "reconciled" | "mismatch" | "incomplete" | null;
    needsReview: boolean | null;
    requiredEvidenceFields?: EvidenceFieldPath[];
    evidenceSnippets?: Partial<Record<EvidenceFieldPath, string[]>>;
  };
};

export type InvoiceEvaluationThresholds = {
  classificationAccuracy: number;
  criticalFieldPrecision: number;
  criticalFieldRecall: number;
  lineItemPrecision: number;
  lineItemRecall: number;
  evidenceCitationRecall: number;
  evidenceGroundedPrecision: number;
  reconciliationAccuracy: number;
  reviewRoutingAccuracy: number;
  maximumExtractionErrors: number;
};

export type InvoiceEvaluationCoverageRequirements = {
  software: number;
  telecomInternet: number;
  utility: number;
  scanned: number;
};

export type GoldenInvoiceManifest = {
  schemaVersion: typeof GOLDEN_INVOICE_SCHEMA_VERSION;
  name: string;
  coverageRequirements: InvoiceEvaluationCoverageRequirements;
  thresholds: InvoiceEvaluationThresholds;
  cases: GoldenInvoiceCase[];
};

export type GoldenPrediction = {
  id: string;
  result?: DocumentIntelligence;
  error?: string;
};

export type GoldenPredictionSet = {
  schemaVersion: typeof GOLDEN_PREDICTION_SCHEMA_VERSION;
  generatedAt: string;
  model: string;
  cases: GoldenPrediction[];
};

type CountMetric = { truePositive: number; falsePositive: number; falseNegative: number };
type AccuracyMetric = { correct: number; total: number };

export type InvoiceEvaluationCaseResult = {
  id: string;
  segment: GoldenInvoiceCase["segment"];
  extractionError: string | null;
  fieldCounts: CountMetric;
  lineItemCounts: CountMetric;
  classification: AccuracyMetric;
  evidence: {
    required: number;
    cited: number;
    predicted: number;
    grounded: number;
  };
  reconciliation: AccuracyMetric;
  reviewRouting: AccuracyMetric;
  failures: string[];
};

export type InvoiceEvaluationReport = {
  schemaVersion: "costivra-invoice-evaluation-report-v1";
  manifestName: string;
  generatedAt: string;
  caseCount: number;
  extractionErrors: number;
  coverage: {
    actual: InvoiceEvaluationCoverageRequirements;
    required: InvoiceEvaluationCoverageRequirements;
  };
  metrics: Omit<InvoiceEvaluationThresholds, "maximumExtractionErrors">;
  thresholds: InvoiceEvaluationThresholds;
  passed: boolean;
  failedGates: string[];
  cases: InvoiceEvaluationCaseResult[];
};

const defaultThresholds: InvoiceEvaluationThresholds = {
  classificationAccuracy: 0.98,
  criticalFieldPrecision: 0.97,
  criticalFieldRecall: 0.95,
  lineItemPrecision: 0.95,
  lineItemRecall: 0.95,
  evidenceCitationRecall: 0.9,
  evidenceGroundedPrecision: 1,
  reconciliationAccuracy: 0.98,
  reviewRoutingAccuracy: 1,
  maximumExtractionErrors: 0,
};

const defaultCoverageRequirements: InvoiceEvaluationCoverageRequirements = {
  software: 20,
  telecomInternet: 20,
  utility: 20,
  scanned: 10,
};

const moneyFields = new Set<CriticalInvoiceField>([
  "subtotal",
  "taxTotal",
  "feeTotal",
  "creditTotal",
  "totalAmount",
  "amountDue",
]);

const evidenceAllowedFields = new Set<EvidenceFieldPath>([
  "vendorName",
  "currency",
  ...criticalInvoiceFields.map(
    (field) => `invoice.${field}` as EvidenceFieldPath,
  ),
  "invoice.lineItems",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeText(value: string) {
  return value.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeComparable(path: ScoredFieldPath, value: string | null) {
  if (value === null) return null;
  if (path === "vendorName") return normalizeVendorName(value);
  if (path === "currency") return value.trim().toUpperCase();
  const field = path.slice("invoice.".length) as CriticalInvoiceField;
  if (moneyFields.has(field)) return normalizeMoney(value);
  return normalizeText(value);
}

function expectedValue(caseData: GoldenInvoiceCase, path: ScoredFieldPath) {
  if (path === "vendorName") return caseData.expected.vendorName;
  if (path === "currency") return caseData.expected.currency;
  if (!caseData.expected.invoice) return null;
  return caseData.expected.invoice[
    path.slice("invoice.".length) as CriticalInvoiceField
  ];
}

function actualValue(
  result: DocumentIntelligence | undefined,
  path: ScoredFieldPath,
) {
  if (!result) return null;
  if (path === "vendorName") return result.vendorName;
  if (path === "currency") return result.currency;
  if (!result.invoice) return null;
  return result.invoice[
    path.slice("invoice.".length) as CriticalInvoiceField
  ];
}

function addFieldResult(
  counts: CountMetric,
  expected: string | null,
  actual: string | null,
  correct: boolean,
) {
  if (expected !== null && correct) counts.truePositive += 1;
  else if (expected !== null && actual === null) counts.falseNegative += 1;
  else if (expected !== null) {
    counts.falsePositive += 1;
    counts.falseNegative += 1;
  } else if (actual !== null) counts.falsePositive += 1;
}

function lineItemKey(item: GoldenLineItem) {
  return JSON.stringify({
    description: normalizeText(item.description),
    quantity: item.quantity === null ? null : normalizeText(item.quantity),
    unitPrice: item.unitPrice === null ? null : normalizeMoney(item.unitPrice),
    amount: normalizeMoney(item.amount),
    category: item.category === null ? null : normalizeText(item.category),
    servicePeriodStart: item.servicePeriodStart,
    servicePeriodEnd: item.servicePeriodEnd,
  });
}

function scoreLineItems(
  expected: GoldenLineItem[] | undefined,
  result: DocumentIntelligence | undefined,
): CountMetric {
  if (expected === undefined) return { truePositive: 0, falsePositive: 0, falseNegative: 0 };
  const remaining = new Map<string, number>();
  for (const item of expected) {
    const key = lineItemKey(item);
    remaining.set(key, (remaining.get(key) ?? 0) + 1);
  }
  let truePositive = 0;
  let falsePositive = 0;
  for (const item of result?.invoice?.lineItems ?? []) {
    const key = lineItemKey(item);
    const count = remaining.get(key) ?? 0;
    if (count > 0) {
      truePositive += 1;
      if (count === 1) remaining.delete(key);
      else remaining.set(key, count - 1);
    } else falsePositive += 1;
  }
  const falseNegative = [...remaining.values()].reduce(
    (sum, count) => sum + count,
    0,
  );
  return { truePositive, falsePositive, falseNegative };
}

function defaultRequiredEvidenceFields(caseData: GoldenInvoiceCase) {
  const paths: EvidenceFieldPath[] = [];
  if (caseData.expected.vendorName !== null) paths.push("vendorName");
  if (caseData.expected.currency !== null) paths.push("currency");
  if (caseData.expected.invoice) {
    for (const field of criticalInvoiceFields) {
      if (caseData.expected.invoice[field] !== null) {
        paths.push(`invoice.${field}`);
      }
    }
    if (caseData.expected.invoice.lineItems?.length) {
      paths.push("invoice.lineItems");
    }
  }
  return paths;
}

function quoteMatchesSnippets(quote: string, snippets: string[] | undefined) {
  if (!snippets?.length) return true;
  const normalizedQuote = normalizeText(quote);
  return snippets.some((snippet) => {
    const normalizedSnippet = normalizeText(snippet);
    return normalizedQuote.includes(normalizedSnippet);
  });
}

function isQuoteGrounded(
  quote: string,
  sourceText: string,
  snippets: string[] | undefined,
) {
  if (!quoteMatchesSnippets(quote, snippets)) return false;
  if (!sourceText.trim()) return Boolean(snippets?.length);
  return normalizeText(sourceText).includes(normalizeText(quote));
}

function scoreCase(
  caseData: GoldenInvoiceCase,
  prediction: GoldenPrediction | undefined,
  sourceText: string,
): InvoiceEvaluationCaseResult {
  const result = prediction?.result;
  const failures: string[] = [];
  const fieldCounts: CountMetric = {
    truePositive: 0,
    falsePositive: 0,
    falseNegative: 0,
  };
  const fieldPaths: ScoredFieldPath[] = [
    "vendorName",
    "currency",
    ...criticalInvoiceFields.map(
      (field) => `invoice.${field}` as ScoredFieldPath,
    ),
  ];

  for (const path of fieldPaths) {
    const expected = expectedValue(caseData, path);
    const actual = actualValue(result, path);
    const correct =
      normalizeComparable(path, expected) === normalizeComparable(path, actual);
    addFieldResult(fieldCounts, expected, actual, correct);
    if (!correct) failures.push(`${path}: expected ${String(expected)}, received ${String(actual)}`);
  }

  const classificationCorrect =
    result?.classification === caseData.expected.classification;
  if (!classificationCorrect) {
    failures.push(
      `classification: expected ${caseData.expected.classification}, received ${result?.classification ?? "error"}`,
    );
  }

  const lineItemCounts = scoreLineItems(
    caseData.expected.invoice?.lineItems,
    result,
  );
  if (lineItemCounts.falsePositive || lineItemCounts.falseNegative) {
    failures.push(
      `lineItems: ${lineItemCounts.falsePositive} unexpected, ${lineItemCounts.falseNegative} missing`,
    );
  }

  const requiredEvidence = new Set(
    caseData.expected.requiredEvidenceFields ??
      defaultRequiredEvidenceFields(caseData),
  );
  const validRequiredFields = new Set<EvidenceFieldPath>();
  let groundedEvidence = 0;
  const predictedEvidence = result?.evidence ?? [];
  for (const evidence of predictedEvidence) {
    const path = evidence.field as EvidenceFieldPath;
    const snippets = caseData.expected.evidenceSnippets?.[path];
    const grounded =
      evidenceAllowedFields.has(path) &&
      isQuoteGrounded(evidence.quote, sourceText, snippets);
    if (grounded) groundedEvidence += 1;
    if (grounded && requiredEvidence.has(path)) validRequiredFields.add(path);
  }
  for (const path of requiredEvidence) {
    if (!validRequiredFields.has(path)) failures.push(`evidence missing or ungrounded: ${path}`);
  }

  const actualReconciliation = result?.invoice
    ? reconcileInvoice(result.invoice).status
    : null;
  const reconciliationTotal =
    caseData.expected.reconciliationStatus === null ? 0 : 1;
  const reconciliationCorrect =
    reconciliationTotal === 0 ||
    actualReconciliation === caseData.expected.reconciliationStatus;
  if (!reconciliationCorrect) {
    failures.push(
      `reconciliation: expected ${caseData.expected.reconciliationStatus}, received ${actualReconciliation}`,
    );
  }

  let actualNeedsReview: boolean | null = null;
  if (result?.invoice) {
    const review = classifyInvoiceReview({
      hasVendor: Boolean(result.vendorName),
      invoiceNumber: result.invoice.invoiceNumber,
      invoiceDate: result.invoice.invoiceDate,
      servicePeriodStart: result.invoice.servicePeriodStart,
      servicePeriodEnd: result.invoice.servicePeriodEnd,
      currency: result.currency,
      totalAmount: result.invoice.totalAmount,
      expenseCategory: "evaluation",
      reconciliationStatus: reconcileInvoice(result.invoice).status,
      confidence: result.confidence,
    });
    actualNeedsReview = review.reviewStatus === "needs_review";
  }
  const reviewTotal = caseData.expected.needsReview === null ? 0 : 1;
  const reviewCorrect =
    reviewTotal === 0 || actualNeedsReview === caseData.expected.needsReview;
  if (!reviewCorrect) {
    failures.push(
      `review routing: expected ${String(caseData.expected.needsReview)}, received ${String(actualNeedsReview)}`,
    );
  }

  return {
    id: caseData.id,
    segment: caseData.segment,
    extractionError: prediction?.error ?? (!prediction ? "Prediction missing." : null),
    fieldCounts,
    lineItemCounts,
    classification: { correct: classificationCorrect ? 1 : 0, total: 1 },
    evidence: {
      required: requiredEvidence.size,
      cited: validRequiredFields.size,
      predicted: predictedEvidence.length,
      grounded: groundedEvidence,
    },
    reconciliation: {
      correct: reconciliationCorrect && reconciliationTotal ? 1 : 0,
      total: reconciliationTotal,
    },
    reviewRouting: {
      correct: reviewCorrect && reviewTotal ? 1 : 0,
      total: reviewTotal,
    },
    failures,
  };
}

function precision(counts: CountMetric) {
  const denominator = counts.truePositive + counts.falsePositive;
  return denominator ? counts.truePositive / denominator : 1;
}

function recall(counts: CountMetric) {
  const denominator = counts.truePositive + counts.falseNegative;
  return denominator ? counts.truePositive / denominator : 1;
}

function accuracy(metric: AccuracyMetric) {
  return metric.total ? metric.correct / metric.total : 1;
}

function sumCounts(
  results: InvoiceEvaluationCaseResult[],
  key: "fieldCounts" | "lineItemCounts",
): CountMetric {
  return results.reduce(
    (sum, result) => ({
      truePositive: sum.truePositive + result[key].truePositive,
      falsePositive: sum.falsePositive + result[key].falsePositive,
      falseNegative: sum.falseNegative + result[key].falseNegative,
    }),
    { truePositive: 0, falsePositive: 0, falseNegative: 0 },
  );
}

function sumAccuracy(
  results: InvoiceEvaluationCaseResult[],
  key: "classification" | "reconciliation" | "reviewRouting",
): AccuracyMetric {
  return results.reduce(
    (sum, result) => ({
      correct: sum.correct + result[key].correct,
      total: sum.total + result[key].total,
    }),
    { correct: 0, total: 0 },
  );
}

export function evaluateGoldenInvoices(input: {
  manifest: GoldenInvoiceManifest;
  predictions: GoldenPrediction[];
  sourceTextByCaseId?: ReadonlyMap<string, string>;
}): InvoiceEvaluationReport {
  const predictionById = new Map(
    input.predictions.map((prediction) => [prediction.id, prediction]),
  );
  const cases = input.manifest.cases.map((caseData) =>
    scoreCase(
      caseData,
      predictionById.get(caseData.id),
      input.sourceTextByCaseId?.get(caseData.id) ?? "",
    ),
  );
  const fieldCounts = sumCounts(cases, "fieldCounts");
  const lineItemCounts = sumCounts(cases, "lineItemCounts");
  const classification = sumAccuracy(cases, "classification");
  const reconciliation = sumAccuracy(cases, "reconciliation");
  const reviewRouting = sumAccuracy(cases, "reviewRouting");
  const evidence = cases.reduce(
    (sum, result) => ({
      required: sum.required + result.evidence.required,
      cited: sum.cited + result.evidence.cited,
      predicted: sum.predicted + result.evidence.predicted,
      grounded: sum.grounded + result.evidence.grounded,
    }),
    { required: 0, cited: 0, predicted: 0, grounded: 0 },
  );
  const extractionErrors = cases.filter((result) => result.extractionError).length;
  const coverage: InvoiceEvaluationCoverageRequirements = {
    software: input.manifest.cases.filter((item) => item.segment === "software")
      .length,
    telecomInternet: input.manifest.cases.filter(
      (item) => item.segment === "telecom_internet",
    ).length,
    utility: input.manifest.cases.filter((item) => item.segment === "utility")
      .length,
    scanned: input.manifest.cases.filter((item) => item.scanned).length,
  };
  const metrics = {
    classificationAccuracy: accuracy(classification),
    criticalFieldPrecision: precision(fieldCounts),
    criticalFieldRecall: recall(fieldCounts),
    lineItemPrecision: precision(lineItemCounts),
    lineItemRecall: recall(lineItemCounts),
    evidenceCitationRecall: evidence.required
      ? evidence.cited / evidence.required
      : 1,
    evidenceGroundedPrecision: evidence.predicted
      ? evidence.grounded / evidence.predicted
      : 1,
    reconciliationAccuracy: accuracy(reconciliation),
    reviewRoutingAccuracy: accuracy(reviewRouting),
  };
  const failedGates = Object.entries(metrics).flatMap(([name, value]) => {
    const threshold = input.manifest.thresholds[
      name as keyof Omit<InvoiceEvaluationThresholds, "maximumExtractionErrors">
    ];
    return value < threshold
      ? [`${name} ${value.toFixed(4)} is below ${threshold.toFixed(4)}`]
      : [];
  });
  if (extractionErrors > input.manifest.thresholds.maximumExtractionErrors) {
    failedGates.push(
      `extractionErrors ${extractionErrors} exceeds ${input.manifest.thresholds.maximumExtractionErrors}`,
    );
  }
  for (const key of Object.keys(coverage) as Array<
    keyof InvoiceEvaluationCoverageRequirements
  >) {
    const required = input.manifest.coverageRequirements[key];
    if (coverage[key] < required) {
      failedGates.push(`coverage.${key} ${coverage[key]} is below ${required}`);
    }
  }
  return {
    schemaVersion: "costivra-invoice-evaluation-report-v1",
    manifestName: input.manifest.name,
    generatedAt: new Date().toISOString(),
    caseCount: cases.length,
    extractionErrors,
    coverage: {
      actual: coverage,
      required: input.manifest.coverageRequirements,
    },
    metrics,
    thresholds: input.manifest.thresholds,
    passed: failedGates.length === 0,
    failedGates,
    cases,
  };
}

function requiredString(
  object: Record<string, unknown>,
  key: string,
  location: string,
) {
  const value = object[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${location}.${key} must be a non-empty string.`);
  }
  return value.trim();
}

function nullableStringField(
  object: Record<string, unknown>,
  key: string,
  location: string,
) {
  if (!(key in object)) throw new Error(`${location}.${key} is required (use null when absent).`);
  const value = object[key];
  if (value !== null && (typeof value !== "string" || !value.trim())) {
    throw new Error(`${location}.${key} must be a non-empty string or null.`);
  }
  return value === null ? null : (value as string).trim();
}

function parseThresholds(value: unknown): InvoiceEvaluationThresholds {
  if (!isRecord(value)) return { ...defaultThresholds };
  const thresholds = { ...defaultThresholds };
  for (const key of Object.keys(defaultThresholds) as Array<
    keyof InvoiceEvaluationThresholds
  >) {
    if (!(key in value)) continue;
    const next = value[key];
    if (
      typeof next !== "number" ||
      !Number.isFinite(next) ||
      next < 0 ||
      (key !== "maximumExtractionErrors" && next > 1) ||
      (key === "maximumExtractionErrors" && !Number.isInteger(next))
    ) {
      throw new Error(`thresholds.${key} is invalid.`);
    }
    thresholds[key] = next;
  }
  return thresholds;
}

function parseCoverageRequirements(
  value: unknown,
): InvoiceEvaluationCoverageRequirements {
  if (!isRecord(value)) return { ...defaultCoverageRequirements };
  const coverage = { ...defaultCoverageRequirements };
  for (const key of Object.keys(coverage) as Array<
    keyof InvoiceEvaluationCoverageRequirements
  >) {
    if (!(key in value)) continue;
    const next = value[key];
    if (typeof next !== "number" || !Number.isInteger(next) || next < 0) {
      throw new Error(
        `coverageRequirements.${key} must be a non-negative integer.`,
      );
    }
    coverage[key] = next;
  }
  return coverage;
}

function parseLineItem(value: unknown, location: string): GoldenLineItem {
  if (!isRecord(value)) throw new Error(`${location} must be an object.`);
  const lineItem = {
    description: requiredString(value, "description", location),
    quantity: nullableStringField(value, "quantity", location),
    unitPrice: nullableStringField(value, "unitPrice", location),
    amount: requiredString(value, "amount", location),
    category: nullableStringField(value, "category", location),
    servicePeriodStart: nullableStringField(value, "servicePeriodStart", location),
    servicePeriodEnd: nullableStringField(value, "servicePeriodEnd", location),
  };
  if (normalizeMoney(lineItem.amount) !== lineItem.amount) {
    throw new Error(`${location}.amount must be a canonical decimal money string.`);
  }
  if (
    lineItem.unitPrice !== null &&
    normalizeMoney(lineItem.unitPrice) !== lineItem.unitPrice
  ) {
    throw new Error(`${location}.unitPrice must be a canonical decimal money string or null.`);
  }
  if (
    lineItem.quantity !== null &&
    normalizeDecimal(lineItem.quantity) !== lineItem.quantity
  ) {
    throw new Error(`${location}.quantity must be a canonical decimal string or null.`);
  }
  return lineItem;
}

function parseInvoiceExpectation(
  value: unknown,
  location: string,
): GoldenInvoiceExpectation | null {
  if (value === null) return null;
  if (!isRecord(value)) throw new Error(`${location} must be an object or null.`);
  const invoice = Object.fromEntries(
    criticalInvoiceFields.map((field) => [
      field,
      nullableStringField(value, field, location),
    ]),
  ) as Record<CriticalInvoiceField, string | null>;
  const lineItems = value.lineItems;
  for (const field of moneyFields) {
    const fieldValue = invoice[field];
    if (fieldValue !== null && normalizeMoney(fieldValue) !== fieldValue) {
      throw new Error(
        `${location}.${field} must be a canonical decimal money string or null.`,
      );
    }
  }
  for (const field of [
    "invoiceDate",
    "dueDate",
    "servicePeriodStart",
    "servicePeriodEnd",
  ] as const) {
    const fieldValue = invoice[field];
    if (fieldValue !== null && !/^\d{4}-\d{2}-\d{2}$/.test(fieldValue)) {
      throw new Error(`${location}.${field} must use YYYY-MM-DD or null.`);
    }
  }
  return {
    ...invoice,
    ...(lineItems === undefined
      ? {}
      : {
          lineItems: Array.isArray(lineItems)
            ? lineItems.map((item, index) =>
                parseLineItem(item, `${location}.lineItems[${index}]`),
              )
            : (() => {
                throw new Error(`${location}.lineItems must be an array.`);
              })(),
        }),
  };
}

function parseCase(value: unknown, index: number): GoldenInvoiceCase {
  const location = `cases[${index}]`;
  if (!isRecord(value)) throw new Error(`${location} must be an object.`);
  if (!isRecord(value.expected)) throw new Error(`${location}.expected must be an object.`);
  const expected = value.expected;
  const classification = requiredString(
    expected,
    "classification",
    `${location}.expected`,
  );
  if (!(["contract", "invoice", "statement", "order_form", "other"] as string[]).includes(classification)) {
    throw new Error(`${location}.expected.classification is invalid.`);
  }
  const segment = requiredString(value, "segment", location);
  if (!(["software", "telecom_internet", "utility", "other"] as string[]).includes(segment)) {
    throw new Error(`${location}.segment is invalid.`);
  }
  const scanned = value.scanned;
  if (typeof scanned !== "boolean") throw new Error(`${location}.scanned must be a boolean.`);
  const dataClassification = requiredString(value, "dataClassification", location);
  const allowedClassifications = [
    "synthetic_smoke",
    "deidentified_real",
    "consented_real",
    "adversarial",
    "scanned_real",
  ];
  if (!allowedClassifications.includes(dataClassification)) {
    throw new Error(`${location}.dataClassification is invalid.`);
  }
  const reviewReference = requiredString(value, "reviewReference", location);
  const provenanceReference = requiredString(value, "provenanceReference", location);
  if (dataClassification === "scanned_real" && !scanned) {
    throw new Error(`${location}.scanned_real cases must set scanned=true.`);
  }
  const reconciliationStatus = expected.reconciliationStatus;
  if (
    reconciliationStatus !== null &&
    !["reconciled", "mismatch", "incomplete"].includes(
      String(reconciliationStatus),
    )
  ) {
    throw new Error(`${location}.expected.reconciliationStatus is invalid.`);
  }
  const needsReview = expected.needsReview;
  if (needsReview !== null && typeof needsReview !== "boolean") {
    throw new Error(`${location}.expected.needsReview must be boolean or null.`);
  }
  const requiredEvidenceFields = expected.requiredEvidenceFields;
  if (
    requiredEvidenceFields !== undefined &&
    (!Array.isArray(requiredEvidenceFields) ||
      requiredEvidenceFields.some(
        (field) =>
          typeof field !== "string" ||
          !evidenceAllowedFields.has(field as EvidenceFieldPath),
      ))
  ) {
    throw new Error(`${location}.expected.requiredEvidenceFields is invalid.`);
  }
  const evidenceSnippets = expected.evidenceSnippets;
  if (evidenceSnippets !== undefined && !isRecord(evidenceSnippets)) {
    throw new Error(`${location}.expected.evidenceSnippets must be an object.`);
  }
  const parsedSnippets: Partial<Record<EvidenceFieldPath, string[]>> = {};
  for (const [field, snippets] of Object.entries(evidenceSnippets ?? {})) {
    if (
      !evidenceAllowedFields.has(field as EvidenceFieldPath) ||
      !Array.isArray(snippets) ||
      snippets.some((snippet) => typeof snippet !== "string" || !snippet.trim())
    ) {
      throw new Error(`${location}.expected.evidenceSnippets.${field} is invalid.`);
    }
    parsedSnippets[field as EvidenceFieldPath] = snippets.map((snippet) =>
      (snippet as string).trim(),
    );
  }
  const parsedCase: GoldenInvoiceCase = {
    id: requiredString(value, "id", location),
    file: requiredString(value, "file", location),
    mimeType: requiredString(value, "mimeType", location),
    scanned,
    dataClassification: dataClassification as GoldenInvoiceCase["dataClassification"],
    reviewReference,
    provenanceReference,
    segment: segment as GoldenInvoiceCase["segment"],
    expected: {
      classification: classification as DocumentClassification,
      vendorName: nullableStringField(expected, "vendorName", `${location}.expected`),
      currency: nullableStringField(expected, "currency", `${location}.expected`),
      invoice: parseInvoiceExpectation(
        expected.invoice,
        `${location}.expected.invoice`,
      ),
      reconciliationStatus: reconciliationStatus as GoldenInvoiceCase["expected"]["reconciliationStatus"],
      needsReview: needsReview as boolean | null,
      ...(requiredEvidenceFields === undefined
        ? {}
        : { requiredEvidenceFields: requiredEvidenceFields as EvidenceFieldPath[] }),
      ...(Object.keys(parsedSnippets).length
        ? { evidenceSnippets: parsedSnippets }
        : {}),
    },
  };
  if (/^(?:[A-Za-z]:[\\/]|[\\/]{1,2})/.test(parsedCase.file)) {
    throw new Error(`${location}.file must be relative; absolute paths are not allowed.`);
  }
  const invoiceClassification = ["invoice", "statement"].includes(
    parsedCase.expected.classification,
  );
  if (invoiceClassification !== Boolean(parsedCase.expected.invoice)) {
    throw new Error(
      `${location}.expected.invoice must be an object for invoice/statement classifications and null otherwise.`,
    );
  }
  if (
    parsedCase.expected.currency !== null &&
    !/^[A-Z]{3}$/.test(parsedCase.expected.currency)
  ) {
    throw new Error(`${location}.expected.currency must be an uppercase ISO code or null.`);
  }
  if (
    invoiceClassification &&
    (parsedCase.expected.reconciliationStatus === null ||
      parsedCase.expected.needsReview === null)
  ) {
    throw new Error(
      `${location} invoice cases require reconciliationStatus and needsReview truth.`,
    );
  }
  const expectedInvoice = parsedCase.expected.invoice;
  if (expectedInvoice) {
    const arithmeticFields = [
      expectedInvoice.subtotal,
      expectedInvoice.taxTotal,
      expectedInvoice.feeTotal,
      expectedInvoice.creditTotal,
      expectedInvoice.totalAmount,
    ];
    if (arithmeticFields.every((field) => field !== null)) {
      const [subtotal, tax, fees, credits, total] = arithmeticFields.map(Number);
      if ([subtotal, tax, fees, credits, total].every(Number.isFinite)) {
        const calculated = subtotal + tax + fees - credits;
        if (Math.abs(calculated - total) > 0.01) {
          throw new Error(`${location}.expected.invoice totals do not reconcile.`);
        }
      }
    }
  }
  const required =
    parsedCase.expected.requiredEvidenceFields ??
    defaultRequiredEvidenceFields(parsedCase);
  if (new Set(required).size !== required.length) {
    throw new Error(`${location}.expected.requiredEvidenceFields contains duplicates.`);
  }
  for (const field of required) {
    const hasExpectedValue =
      field === "invoice.lineItems"
        ? Boolean(parsedCase.expected.invoice?.lineItems?.length)
        : expectedValue(parsedCase, field as ScoredFieldPath) !== null;
    if (!hasExpectedValue) {
      throw new Error(
        `${location}.expected.requiredEvidenceFields includes ${field}, but that expected value is absent.`,
      );
    }
  }
  if (
    scanned &&
    required.some(
      (field) => !parsedCase.expected.evidenceSnippets?.[field]?.length,
    )
  ) {
    throw new Error(
      `${location} is scanned, so every required evidence field needs an evidenceSnippets entry.`,
    );
  }
  return parsedCase;
}

export function parseGoldenInvoiceManifest(value: unknown): GoldenInvoiceManifest {
  if (!isRecord(value)) throw new Error("The golden manifest must be an object.");
  if (value.schemaVersion !== GOLDEN_INVOICE_SCHEMA_VERSION) {
    throw new Error(`schemaVersion must be ${GOLDEN_INVOICE_SCHEMA_VERSION}.`);
  }
  if (!Array.isArray(value.cases) || !value.cases.length) {
    throw new Error("The golden manifest must contain at least one case.");
  }
  const serialized = JSON.stringify(value);
  if (/-----BEGIN .*PRIVATE KEY-----|\b(?:sk|rk)_(?:live|test)_|\bsb_secret_|\bsk-or-v1-/.test(serialized)) {
    throw new Error("The golden manifest contains a likely secret or private key.");
  }
  const cases = value.cases.map(parseCase);
  const ids = new Set<string>();
  for (const caseData of cases) {
    if (ids.has(caseData.id)) throw new Error(`Duplicate case id: ${caseData.id}.`);
    ids.add(caseData.id);
  }
  return {
    schemaVersion: GOLDEN_INVOICE_SCHEMA_VERSION,
    name: requiredString(value, "name", "manifest"),
    coverageRequirements: parseCoverageRequirements(
      value.coverageRequirements,
    ),
    thresholds: parseThresholds(value.thresholds),
    cases,
  };
}

export function parseGoldenPredictionSet(value: unknown): GoldenPredictionSet {
  if (!isRecord(value) || value.schemaVersion !== GOLDEN_PREDICTION_SCHEMA_VERSION) {
    throw new Error(`Prediction schemaVersion must be ${GOLDEN_PREDICTION_SCHEMA_VERSION}.`);
  }
  if (!Array.isArray(value.cases)) throw new Error("Prediction cases must be an array.");
  const cases = value.cases.map((item, index) => {
    if (!isRecord(item)) throw new Error(`Prediction cases[${index}] must be an object.`);
    const id = requiredString(item, "id", `prediction cases[${index}]`);
    const error = item.error;
    if (error !== undefined && (typeof error !== "string" || !error.trim())) {
      throw new Error(`Prediction cases[${index}].error is invalid.`);
    }
    if (item.result === undefined && error === undefined) {
      throw new Error(`Prediction cases[${index}] requires result or error.`);
    }
    if (item.result !== undefined && error !== undefined) {
      throw new Error(`Prediction cases[${index}] cannot contain both result and error.`);
    }
    return {
      id,
      ...(item.result === undefined
        ? {}
        : { result: parseDocumentIntelligence(item.result) }),
      ...(typeof error === "string" ? { error: error.trim() } : {}),
    };
  });
  const ids = new Set<string>();
  for (const prediction of cases) {
    if (ids.has(prediction.id)) {
      throw new Error(`Duplicate prediction id: ${prediction.id}.`);
    }
    ids.add(prediction.id);
  }
  return {
    schemaVersion: GOLDEN_PREDICTION_SCHEMA_VERSION,
    generatedAt: requiredString(value, "generatedAt", "predictions"),
    model: requiredString(value, "model", "predictions"),
    cases,
  };
}
