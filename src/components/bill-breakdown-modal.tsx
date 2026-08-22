import { useCallback, useEffect, useMemo, useRef, useState, type AnimationEvent } from "react";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ExternalLink,
  FileText,
  MessageCircle,
  ShieldCheck,
  TrendingUp,
  X,
} from "@/lib/icons";
import { formatFinancialDate } from "@/lib/ui/date-format";
import { useClientAssistant } from "@/components/client-assistant/client-assistant-provider";

function BillBreakdownLoadingState({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`bill-breakdown-loading-state${compact ? " is-compact" : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className={`bill-breakdown-loading-visual${compact ? " is-compact" : ""}`} aria-hidden="true">
        <div className="bill-breakdown-loading-document">
          <div className="bill-breakdown-loading-document__header">
            <FileText size={compact ? 18 : 20} strokeWidth={1.6} />
            <span />
          </div>
          <div className="bill-breakdown-loading-document__rows">
            <i /><i /><i /><i />
          </div>
          <span className="bill-breakdown-loading-cursor" />
        </div>
      </div>
      <div className="bill-breakdown-loading-copy">
        <p className="bill-breakdown-loading-eyebrow">Preparing review</p>
        <p className="bill-breakdown-loading-title">
          {compact ? "Opening protected source" : "Organizing the bill for review"}
        </p>
        {!compact ? (
          <p className="bill-breakdown-loading-description">
            Separating current charges, account history, and source evidence into one reviewable record.
          </p>
        ) : null}
      </div>
      {!compact ? (
        <ol className="bill-breakdown-loading-steps" aria-hidden="true">
          <span className="bill-breakdown-loading-step-line"><i /></span>
          <li><span>01</span><div><strong>Source</strong><small>Reading the bill</small></div></li>
          <li><span>02</span><div><strong>Charges</strong><small>Structuring bill activity</small></div></li>
          <li><span>03</span><div><strong>Evidence</strong><small>Connecting source</small></div></li>
        </ol>
      ) : null}
    </div>
  );
}

const BreakdownPdfViewer = dynamic(() => import("@/components/breakdown-pdf-viewer"), {
  ssr: false,
  loading: () => <BillBreakdownLoadingState compact />,
});

export type BreakdownData = {
  document: {
    id: string;
    filename: string;
    mimeType: string;
    byteSize: number;
    status: string;
    extractionSummary: string | null;
    createdAt: string;
    securityScanStatus: string;
    securityScannedAt: string | null;
    sha256: string | null;
    downloadUrl: string | null;
  };
  invoice: {
    id: string;
    invoiceNumber: string | null;
    invoiceDate: string | null;
    dueDate: string | null;
    totalAmount: number | null;
    subtotalAmount: number | null;
    taxAmount: number | null;
    currency: string;
    reviewStatus: string;
    vendorMatchStatus: string;
    reconciliationStatus: string;
  } | null;
  vendor: {
    id: string;
    name: string;
    category: string;
    website: string | null;
    catalogStatus: string;
    logoUrl: string | null;
    annualizedSpend: number;
  } | null;
  category?: {
    key: string;
    displayName: string;
    confidence: number;
    expertPackVersion: string | null;
  };
  lineItems: Array<{
    id: string;
    lineNumber: number;
    description: string;
    amount: number;
    quantity?: number;
    unitPrice?: number;
  }>;
  lineItemExplanations?: Array<{
    lineItemId: string;
    canonicalCode: string | null;
    label: string;
    originalDescription: string;
    explanation: string;
    chargeClass: string;
    confidence: number;
    reviewRequired: boolean;
    matchedAlias: string | null;
    evidenceIds: string[];
  }>;
  billComposition?: Array<{
    chargeClass: string;
    total: number;
    itemCount: number;
  }>;
  invoiceSummary?: {
    currentCharges: number | null;
    previousBalance: number | null;
    paymentsAndCredits: number | null;
    amountDue: number | null;
  };
  priorRecordedBill?: {
    invoiceNumber: string | null;
    invoiceDate: string | null;
    totalAmount: number;
    changeAmount: number;
    changePercentage: number | null;
  } | null;
  serviceFacts?: Array<{
    label: string;
    value: number;
    unit: string;
  }>;
  energyServices?: Array<{
    customerName: string | null;
    serviceAddress: string | null;
    serviceIdentifier: string | null;
    meterId: string | null;
    productName: string | null;
    utilityTerritory: string | null;
    billingDays: number | null;
    readStatus: string | null;
    previousMeterRead: string | null;
    currentMeterRead: string | null;
    meterReadUnit: string | null;
    usageKwh: string | null;
    deliveredKwh: string | null;
    receivedKwh: string | null;
    netUsageKwh: string | null;
    generationKwh: string | null;
    actualDemandKw: string | null;
    billedDemandKw: string | null;
    powerFactor: string | null;
    meterMultiplier: string | null;
    averagePricePerKwh: string | null;
    readDateStart: string | null;
    readDateEnd: string | null;
    assignedRateCode: string | null;
    serviceVoltage: string | null;
    meteringConfiguration: string | null;
    serviceClass: string | null;
    historicalDemandKw: string | null;
    ratchetApplies: boolean | null;
    persistedMeter: {
      meterIdentifier: string | null;
      serviceIdentifier: string | null;
      utilityTerritory: string | null;
      displayName: string | null;
      isPrimary: boolean;
    } | null;
  }>;
  serviceDetails?: {
    planName: string | null;
    productFamily: string | null;
    serviceAddresses: string[];
    serviceIdentifiers: string[];
    phoneNumbers: string[];
    circuitIds: string[];
    subscriptionIdentifiers: string[];
    resourceIdentifiers: string[];
    cloudAccountIdentifiers: string[];
    region: string | null;
    bandwidthQuantity: string | null;
    bandwidthUnit: string | null;
    lineCount: number | null;
    deviceCount: number | null;
    seatCount: number | null;
    usageQuantity: string | null;
    usageUnit: string | null;
    includedUsageQuantity: string | null;
    includedUsageUnit: string | null;
    commitmentType: string | null;
    commitmentTermMonths: number | null;
  } | null;
  sourceChargeSummaries?: Array<{
    label: string;
    amount: string;
    servicePeriodStart: string | null;
    servicePeriodEnd: string | null;
  }>;
  categoryFacts?: Array<{
    key: string;
    value: string | null;
    unit: string | null;
    sourceKey: string | null;
  }>;
  categoryReviewLens?: Array<{
    label: string;
    fields: string[];
  }>;
  evidence: Array<{
    id: string;
    pageNumber: number | null;
    textExcerpt: string;
    fieldPath: string | null;
    sourceKey: string | null;
  }>;
  evidenceCounts?: {
    invoiceField: number;
    lineItem: number;
    opportunity: number;
  };
  anomalies: Array<{
    type: "warning" | "alert" | "info";
    title: string;
    message: string;
    state?: "evidence_backed" | "needs_evidence";
  }>;
  billQuality?: {
    status: string;
    score: number | null;
    missingFields: string[];
  };
  marketBenchmark: {
    category: string;
    billedAmount: number;
    estimatedMarketRate: number | null;
    variancePercentage: number | null;
    potentialAnnualSavings: number | null;
    benchmarkSource: string;
    benchmarkStatus:
      | "comparable"
      | "directional"
      | "quote_required"
      | "insufficient_data"
      | "unsupported";
    comparisonRange: {
      low: number;
      median: number;
      high: number;
    } | null;
    missingDimensions: string[];
    caveats: string[];
    asOf: string | null;
  };
  guidance: Array<{
    title: string;
    action: string;
    priority: string;
  }>;
};

const money = (value: number | null | undefined, currency = "USD") =>
  value == null
    ? "Not available"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(value);

const titleCase = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const chargeClassLabel = (value: string) => {
  if (value === "unknown") return "Needs classification";
  if (value === "pass_through") return "Pass-through delivery";
  if (value === "one_time") return "One-time charges";
  return titleCase(value);
};

const formatServiceFact = (fact: NonNullable<BreakdownData["serviceFacts"]>[number]) => {
  if (fact.unit === "USD/kWh") {
    return `${fact.value.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 6 })} / kWh`;
  }
  return `${fact.value.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${fact.unit}`;
};

function detailRows(entries: Array<[string, string | null | undefined]>) {
  return entries.filter(([, value]) => value != null && value !== "");
}

function energyServiceDetailRows(service: NonNullable<BreakdownData["energyServices"]>[number]) {
  const persistedMeter = service.persistedMeter
    ? service.persistedMeter.displayName
      || service.persistedMeter.meterIdentifier
      || service.persistedMeter.serviceIdentifier
      || "Stored meter link"
    : null;
  return detailRows([
    ["Service address", service.serviceAddress],
    ["Meter", service.meterId],
    ["Service ID", service.serviceIdentifier],
    ["Stored meter link", persistedMeter],
    ["Product / supply", service.productName],
    ["Utility territory", service.utilityTerritory],
    ["Read status", service.readStatus],
    ["Read dates", service.readDateStart && service.readDateEnd ? `${service.readDateStart} → ${service.readDateEnd}` : service.readDateStart || service.readDateEnd],
    ["Previous / current read", service.previousMeterRead && service.currentMeterRead ? `${service.previousMeterRead} / ${service.currentMeterRead}${service.meterReadUnit ? ` ${service.meterReadUnit}` : ""}` : service.previousMeterRead || service.currentMeterRead],
    ["Usage", service.usageKwh ? `${service.usageKwh} kWh` : null],
    ["Delivered / received", service.deliveredKwh || service.receivedKwh ? `${service.deliveredKwh ?? "—"} / ${service.receivedKwh ?? "—"} kWh` : null],
    ["Net / generation", service.netUsageKwh || service.generationKwh ? `${service.netUsageKwh ?? "—"} / ${service.generationKwh ?? "—"} kWh` : null],
    ["Actual / billed demand", service.actualDemandKw || service.billedDemandKw ? `${service.actualDemandKw ?? "—"} / ${service.billedDemandKw ?? "—"} kW` : null],
    ["Power factor", service.powerFactor],
    ["Meter multiplier", service.meterMultiplier],
    ["Average price", service.averagePricePerKwh ? `${service.averagePricePerKwh} / kWh` : null],
    ["Assigned rate", service.assignedRateCode],
    ["Voltage / configuration", service.serviceVoltage || service.meteringConfiguration ? `${service.serviceVoltage ?? "—"} / ${service.meteringConfiguration ?? "—"}` : null],
    ["Service class", service.serviceClass],
    ["Historical demand", service.historicalDemandKw ? `${service.historicalDemandKw} kW` : null],
    ["Ratchet", service.ratchetApplies == null ? null : service.ratchetApplies ? "Applies" : "Does not apply"],
  ]);
}

function serviceDetailRows(details: NonNullable<BreakdownData["serviceDetails"]>) {
  return detailRows([
    ["Plan", details.planName],
    ["Product family", details.productFamily],
    ["Service addresses", details.serviceAddresses.length ? details.serviceAddresses.join(" · ") : null],
    ["Service identifiers", details.serviceIdentifiers.length ? details.serviceIdentifiers.join(" · ") : null],
    ["Phone numbers", details.phoneNumbers.length ? details.phoneNumbers.join(" · ") : null],
    ["Circuits", details.circuitIds.length ? details.circuitIds.join(" · ") : null],
    ["Subscriptions", details.subscriptionIdentifiers.length ? details.subscriptionIdentifiers.join(" · ") : null],
    ["Cloud accounts", details.cloudAccountIdentifiers.length ? details.cloudAccountIdentifiers.join(" · ") : null],
    ["Resources", details.resourceIdentifiers.length ? details.resourceIdentifiers.join(" · ") : null],
    ["Region", details.region],
    ["Bandwidth", details.bandwidthQuantity && details.bandwidthUnit ? `${details.bandwidthQuantity} ${details.bandwidthUnit}` : details.bandwidthQuantity],
    ["Lines / devices / seats", details.lineCount != null || details.deviceCount != null || details.seatCount != null ? `${details.lineCount ?? "—"} / ${details.deviceCount ?? "—"} / ${details.seatCount ?? "—"}` : null],
    ["Usage", details.usageQuantity && details.usageUnit ? `${details.usageQuantity} ${details.usageUnit}` : details.usageQuantity],
    ["Included usage", details.includedUsageQuantity && details.includedUsageUnit ? `${details.includedUsageQuantity} ${details.includedUsageUnit}` : details.includedUsageQuantity],
    ["Commitment", details.commitmentType || details.commitmentTermMonths != null ? `${details.commitmentType ?? "Term"}${details.commitmentTermMonths != null ? ` · ${details.commitmentTermMonths} months` : ""}` : null],
  ]);
}

function categoryFactRows(facts: NonNullable<BreakdownData["categoryFacts"]>) {
  return facts.flatMap((fact) => {
    if (!fact.value) return [];
    const label = fact.key
      .split("_")
      .map((part) => part ? part[0].toUpperCase() + part.slice(1) : part)
      .join(" ");
    return [[label, fact.unit ? `${fact.value} ${fact.unit}` : fact.value] as [string, string]];
  });
}

interface BillBreakdownContentProps {
  documentId: string;
  documentIds: string[];
  onRequestClose: () => void;
  onNavigateDocument?: (documentId: string) => void;
}

function BillBreakdownContent({
  documentId,
  documentIds,
  onRequestClose,
  onNavigateDocument,
}: BillBreakdownContentProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BreakdownData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);
  const [targetPdfPage, setTargetPdfPage] = useState<number | null>(null);
  const [showAllEvidence, setShowAllEvidence] = useState(false);
  const { openDrawer, setContext } = useClientAssistant();

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/portal/documents/${documentId}/breakdown`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.status === 202) {
          const payload = await response.json().catch(() => null);
          setProcessingMessage(
            payload?.message || "Costivra is still preparing this bill breakdown.",
          );
          setLoading(false);
          return null;
        }
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error || "Failed to load document analysis.");
        }
        return response.json() as Promise<BreakdownData>;
      })
      .then((payload) => {
        if (!payload) return;
        setData(payload);
        setLoading(false);
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          caught instanceof Error ? caught.message : "Error loading document.",
        );
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [documentId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onRequestClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onRequestClose]);

  const explanationsByLineItem = useMemo(
    () =>
      new Map(
        (data?.lineItemExplanations ?? []).map((explanation) => [
          explanation.lineItemId,
          explanation,
        ]),
      ),
    [data?.lineItemExplanations],
  );

  const classificationSummary = useMemo(() => {
    const explanations = data?.lineItemExplanations ?? [];
    const classified = explanations.filter((item) => item.canonicalCode).length;
    const reviewRequired = explanations.filter((item) => item.reviewRequired).length;
    return { classified, reviewRequired, total: data?.lineItems.length ?? 0 };
  }, [data?.lineItemExplanations, data?.lineItems]);

  const currentIndex = useMemo(() => {
    if (!documentId || !documentIds.length) return -1;
    return documentIds.indexOf(documentId);
  }, [documentId, documentIds]);

  const askAssistant = () => {
    if (!data?.document.id) return;
    setContext({ kind: "document", id: data.document.id });
    onRequestClose();
    openDrawer();
  };

  const isPdf =
    data?.document.mimeType === "application/pdf" ||
    Boolean(data?.document.filename.toLowerCase().endsWith(".pdf"));
  const isImage =
    Boolean(data?.document.mimeType.startsWith("image/")) ||
    /\.(png|jpg|jpeg|webp)$/i.test(data?.document.filename || "");
  const benchmarkAvailable =
    data?.marketBenchmark.benchmarkStatus === "comparable" &&
    data.marketBenchmark.estimatedMarketRate != null &&
    data.marketBenchmark.variancePercentage != null;
  const currency = data?.invoice?.currency ?? "USD";
  const balanceRows = [
    { label: "Previous balance", value: data?.invoiceSummary?.previousBalance },
    { label: "Payments & credits", value: data?.invoiceSummary?.paymentsAndCredits },
    { label: "Current charges", value: data?.invoiceSummary?.currentCharges },
    { label: "Amount due", value: data?.invoiceSummary?.amountDue ?? data?.invoice?.totalAmount },
  ].filter((row) => row.value != null);
  const reviewAgenda = [...(data?.guidance ?? [])]
    .sort((left, right) => {
      const priority = { high: 0, medium: 1, low: 2 } as const;
      return (priority[left.priority as keyof typeof priority] ?? 3) - (priority[right.priority as keyof typeof priority] ?? 3);
    })
    .slice(0, 3);
  const visibleEvidence = showAllEvidence ? data?.evidence ?? [] : (data?.evidence ?? []).slice(0, 8);
  const marketRequirements = data?.marketBenchmark.missingDimensions
    .map((dimension) => titleCase(dimension))
    .slice(0, 4) ?? [];
  const marketPosition = !benchmarkAvailable
    ? null
    : data.marketBenchmark.variancePercentage! > 0
      ? "Above comparable median"
      : data.marketBenchmark.variancePercentage! < 0
        ? "Below comparable median"
        : "At comparable median";
  const marketPositionClass =
    data?.marketBenchmark.variancePercentage == null
      ? ""
      : data.marketBenchmark.variancePercentage > 0
        ? "is-above"
      : "is-below";
  const priorBillIncreased = (data?.priorRecordedBill?.changeAmount ?? 0) > 0;

  return (
    <>
      <header className="bill-breakdown-header">
        <div className="bill-breakdown-title-row">
          <span className="bill-breakdown-file-icon">
            <FileText size={21} />
          </span>
          <div>
            <div className="bill-breakdown-title-line">
              <h2 id="bill-breakdown-title">
                {data?.vendor?.name
                  ? `${data.vendor.name} — Bill Breakdown`
                  : data?.document.filename ?? "Document Breakdown"}
              </h2>
              {data?.document.securityScanStatus === "clean" && (
                <span className="bill-breakdown-clean-status">
                  <ShieldCheck size={13} /> Security scan clean
                </span>
              )}
            </div>
            <p>
              {data?.document.filename ?? "Loading document"}
              {data?.document.byteSize != null
                ? ` · ${(data.document.byteSize / 1024).toFixed(1)} KB`
                : ""}
              {data?.document.sha256 ? " · SHA-256 recorded" : ""}
            </p>
          </div>
        </div>

        <div className="bill-breakdown-header-actions">
          {documentIds.length > 1 && currentIndex >= 0 && (
            <div className="bill-breakdown-cycler" aria-label="Cycle vendor bills">
              <button
                type="button"
                className="bill-breakdown-cycle-btn"
                disabled={currentIndex <= 0}
                onClick={() => onNavigateDocument?.(documentIds[currentIndex - 1])}
                aria-label="View newer bill"
                title="View newer bill"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="bill-breakdown-cycle-label">
                {currentIndex === 0 ? "Latest bill" : `Bill ${currentIndex + 1}`} <small>of {documentIds.length}</small>
              </span>
              <button
                type="button"
                className="bill-breakdown-cycle-btn"
                disabled={currentIndex >= documentIds.length - 1}
                onClick={() => onNavigateDocument?.(documentIds[currentIndex + 1])}
                aria-label="View older bill"
                title="View older bill"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          )}
          <button type="button" className="bill-breakdown-ask" onClick={askAssistant}>
            <MessageCircle size={15} /> Ask Costivra
          </button>
          <button
            type="button"
            className="workspace-close-button bill-breakdown-close"
            onClick={onRequestClose}
            aria-label="Close bill breakdown"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {loading ? (
        <div className="bill-breakdown-state"><BillBreakdownLoadingState /></div>
      ) : processingMessage ? (
        <div className="bill-breakdown-state">
          <CircleHelp size={36} />
          <p>{processingMessage}</p>
          <button type="button" onClick={onRequestClose}>Close</button>
        </div>
      ) : error ? (
        <div className="bill-breakdown-state bill-breakdown-error">
          <AlertTriangle size={36} />
          <p>{error}</p>
          <button type="button" onClick={onRequestClose}>Close</button>
        </div>
      ) : data ? (
        <div className="bill-breakdown-body">
          <div className="bill-breakdown-preview">
            <div className="bill-breakdown-preview-bar">
              <span>Source file · {data.document.filename}</span>
              <span>
                {data.document.securityScanStatus === "clean" ? (
                  <><CheckCircle2 size={13} /> Clean</>
                ) : (
                  <><CircleHelp size={13} /> {titleCase(data.document.securityScanStatus)}</>
                )}
              </span>
            </div>
            <div className="bill-breakdown-preview-content">
              {data.document.downloadUrl ? (
                isPdf ? (
                  <BreakdownPdfViewer
                    sourceUrl={data.document.downloadUrl}
                    filename={data.document.filename}
                    initialPage={targetPdfPage}
                  />
                ) : isImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.document.downloadUrl} alt={data.document.filename} />
                ) : (
                  <div className="bill-breakdown-no-preview">
                    <FileText size={46} />
                    <p>A browser preview is not available for this file type.</p>
                    <a href={data.document.downloadUrl} target="_blank" rel="noreferrer">
                      Open source file <ExternalLink size={14} />
                    </a>
                  </div>
                )
              ) : (
                <div className="bill-breakdown-no-preview">
                  <CircleHelp size={46} />
                  <p>The protected source file is not available for preview yet.</p>
                </div>
              )}
            </div>
          </div>

          <div className="bill-breakdown-analysis" data-workspace-scrollbar="">
            <article className="bill-breakdown-overview">
              <div className="bill-breakdown-overview__intro">
                <div>
                  <span className="bill-breakdown-label">Bill at a glance</span>
                  <h3>{data.vendor?.name ?? "Vendor not matched"}</h3>
                  <p>
                    {data.invoice?.dueDate
                      ? `Due ${formatFinancialDate(data.invoice.dueDate)}`
                      : "Due date not extracted"}
                    {data.invoice?.reconciliationStatus
                      ? ` · ${titleCase(data.invoice.reconciliationStatus)} against recorded bill data`
                      : ""}
                  </p>
                </div>
                <span className={`bill-breakdown-confidence ${data.billQuality?.status === "review" ? "needs-review" : ""}`}>
                  {data.billQuality?.status === "review" ? "Review needed" : "Record ready"}
                </span>
              </div>
              <div className="bill-breakdown-overview__amount">
                <span>Amount due</span>
                <strong>{money(data.invoiceSummary?.amountDue ?? data.invoice?.totalAmount, currency)}</strong>
              </div>
              <div className="bill-breakdown-overview__facts">
                <div><span>Invoice</span><strong>{data.invoice?.invoiceNumber ?? "Not extracted"}</strong></div>
                <div><span>Bill date</span><strong>{formatFinancialDate(data.invoice?.invoiceDate, "Not extracted")}</strong></div>
                <div><span>Evidence</span><strong>{data.evidence.length} references</strong></div>
              </div>
            </article>

            {data.priorRecordedBill ? (
              <article className="bill-breakdown-card bill-breakdown-movement-card">
                <div className="bill-breakdown-card-heading">
                  <div>
                    <span className="bill-breakdown-label">Bill movement</span>
                    <h3>Compared with the prior recorded bill</h3>
                  </div>
                </div>
                <div className="bill-breakdown-movement-grid">
                  <div>
                    <span>Prior bill</span>
                    <strong>{money(data.priorRecordedBill.totalAmount, currency)}</strong>
                    <small>{formatFinancialDate(data.priorRecordedBill.invoiceDate, "Date not recorded")}</small>
                  </div>
                  <div>
                    <span>This bill</span>
                    <strong>{money(data.invoice?.totalAmount, currency)}</strong>
                    <small>Recorded bill total</small>
                  </div>
                  <div className={priorBillIncreased ? "is-increase" : "is-decrease"}>
                    <span>Change</span>
                    <strong>{priorBillIncreased ? "+" : ""}{money(data.priorRecordedBill.changeAmount, currency)}</strong>
                    <small>{data.priorRecordedBill.changePercentage == null ? "Prior total was zero" : `${priorBillIncreased ? "+" : ""}${data.priorRecordedBill.changePercentage}% vs. prior bill`}</small>
                  </div>
                </div>
                <p className="bill-breakdown-movement-note">This is a historical bill-to-bill comparison, not a market-price or savings conclusion.</p>
              </article>
            ) : null}

            <article className="bill-breakdown-card bill-breakdown-decision-card">
              <div className="bill-breakdown-card-heading">
                <div>
                  <span className="bill-breakdown-label">Cost position</span>
                  <h3>{marketPosition ?? "Market comparison not ready"}</h3>
                </div>
                <TrendingUp size={18} />
              </div>
              {benchmarkAvailable ? (
                <div className="bill-breakdown-market-readout">
                  <div className={`bill-breakdown-market-status ${marketPositionClass}`}>
                    <span>{marketPosition}</span>
                    <strong>{data.marketBenchmark.variancePercentage! > 0 ? "+" : ""}{data.marketBenchmark.variancePercentage}%</strong>
                    <small>compared with the reviewed median</small>
                  </div>
                  <div className="bill-breakdown-market-facts">
                    <div><span>This bill</span><strong>{money(data.marketBenchmark.billedAmount, currency)}</strong></div>
                    <div><span>Comparable median</span><strong>{money(data.marketBenchmark.estimatedMarketRate, currency)}</strong></div>
                  </div>
                </div>
              ) : (
                <div className="bill-breakdown-unavailable">
                  <CircleHelp size={20} />
                  <div>
                    <strong>{data.marketBenchmark.benchmarkStatus === "quote_required" ? "A live quote is required" : "More bill detail is needed"}</strong>
                    <p>{data.marketBenchmark.benchmarkStatus === "quote_required" ? "Public benchmarks are not comparable enough for this service. Review current quotes with the same scope and commercial terms." : "Costivra will not estimate a market position from an invoice total alone. It needs service, location, usage, term, and comparable-offer details."}</p>
                    {marketRequirements.length > 0 ? (
                      <p className="bill-breakdown-market-requirements">
                        Missing comparison inputs: {marketRequirements.join(" · ")}
                      </p>
                    ) : null}
                  </div>
                </div>
              )}
              {data.marketBenchmark.potentialAnnualSavings != null && data.marketBenchmark.potentialAnnualSavings > 0 && (
                <div className="bill-breakdown-savings"><span>Estimated annual opportunity</span><strong>{money(data.marketBenchmark.potentialAnnualSavings, currency)}</strong></div>
              )}
              <p className="bill-breakdown-source-note">{data.marketBenchmark.benchmarkSource}{data.marketBenchmark.asOf ? ` · As of ${formatFinancialDate(data.marketBenchmark.asOf)}` : ""}</p>
            </article>

            {reviewAgenda.length > 0 ? (
            <article className="bill-breakdown-card bill-breakdown-agenda-card">
              <div className="bill-breakdown-card-heading">
                <div>
                  <span className="bill-breakdown-label">Review agenda</span>
                  <h3>Start with the decisions that change the record</h3>
                </div>
              </div>
              <div className="bill-breakdown-agenda">
                {reviewAgenda.map((item, index) => (
                  <div key={`${item.title}-${index}`}>
                    <span className={`bill-breakdown-agenda-priority is-${item.priority}`}>{item.priority}</span>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.action}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>
            ) : null}

            {balanceRows.length > 1 ? (
              <article className="bill-breakdown-card bill-breakdown-balance-card">
                <div className="bill-breakdown-card-heading">
                  <div>
                    <span className="bill-breakdown-label">Balance reconciliation</span>
                    <h3>How the amount due is formed</h3>
                  </div>
                </div>
                <dl className="bill-breakdown-balance-list">
                  {balanceRows.map((row) => (
                    <div key={row.label} className={row.label === "Amount due" ? "is-total" : ""}>
                      <dt>{row.label}</dt>
                      <dd>{money(row.value, currency)}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            ) : null}

            {(data.serviceFacts?.length || data.billComposition?.length) ? (
              <article className="bill-breakdown-card bill-breakdown-anatomy-card">
                <div className="bill-breakdown-card-heading">
                  <div>
                    <span className="bill-breakdown-label">Bill anatomy</span>
                    <h3>What makes up this charge</h3>
                  </div>
                </div>
                {data.serviceFacts?.length ? (
                  <dl className="bill-breakdown-service-facts">
                    {data.serviceFacts.map((fact) => (
                      <div key={fact.label}>
                        <dt>{fact.label}</dt>
                        <dd>{formatServiceFact(fact)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                {data.billComposition?.length ? (
                  <div className="bill-breakdown-composition" aria-label="Charge composition">
                    {data.billComposition.map((group) => (
                      <div key={group.chargeClass}>
                        <span>{chargeClassLabel(group.chargeClass)}</span>
                        <strong>{money(group.total, currency)}</strong>
                        <small>{group.itemCount} {group.itemCount === 1 ? "line" : "lines"}</small>
                      </div>
                    ))}
                  </div>
                ) : null}
                {data.invoiceSummary?.currentCharges != null && data.invoiceSummary.amountDue != null && data.invoiceSummary.currentCharges !== data.invoiceSummary.amountDue ? (
                  <p className="bill-breakdown-reconciliation-note">Current charges are {money(data.invoiceSummary.currentCharges, currency)}; the amount due includes the bill’s recorded balance and payment activity.</p>
                ) : null}
              </article>
            ) : null}

            {(data.energyServices?.length || data.serviceDetails || data.sourceChargeSummaries?.length || data.categoryFacts?.length) ? (
              <article className="bill-breakdown-card bill-breakdown-service-coverage-card">
                <div className="bill-breakdown-card-heading">
                  <div>
                    <span className="bill-breakdown-label">Service coverage</span>
                    <h3>{data.energyServices?.length ? `${data.energyServices.length} energy service point${data.energyServices.length === 1 ? "" : "s"}` : data.categoryFacts?.length ? `${data.categoryFacts.length} source fact${data.categoryFacts.length === 1 ? "" : "s"}` : "Category-specific service details"}</h3>
                    <p className="bill-breakdown-card-subtitle">Physical service identity stays separate from the bill-to account and charge totals.</p>
                  </div>
                </div>
                {data.energyServices?.length ? (
                  <div className="bill-breakdown-service-points">
                    {data.energyServices.map((service, index) => {
                      const rows = energyServiceDetailRows(service);
                      return (
                        <section className="bill-breakdown-service-point" key={`${service.serviceIdentifier ?? service.meterId ?? "service"}-${index}`}>
                          <div className="bill-breakdown-service-point-heading">
                            <div>
                              <span>Service point {index + 1}</span>
                              <strong>{service.serviceAddress ?? service.productName ?? "Address not recorded"}</strong>
                            </div>
                            <small className={service.persistedMeter ? "is-linked" : "is-review"}>
                              {service.persistedMeter ? `${service.persistedMeter.isPrimary ? "Primary · " : ""}meter linked` : "Meter link needs review"}
                            </small>
                          </div>
                          <dl className="bill-breakdown-detail-grid">
                            {rows.map(([label, value]) => (
                              <div key={label}>
                                <dt>{label}</dt>
                                <dd>{value}</dd>
                              </div>
                            ))}
                          </dl>
                        </section>
                      );
                    })}
                  </div>
                ) : null}
                {data.serviceDetails ? (
                  <dl className="bill-breakdown-detail-grid bill-breakdown-category-service-details">
                    {serviceDetailRows(data.serviceDetails).map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                {data.categoryFacts?.length ? (
                  <div>
                    <span className="bill-breakdown-label">Source facts</span>
                    <p className="bill-breakdown-card-subtitle">Visible category fields retained from the document; confirm them against the source before relying on them.</p>
                    <dl className="bill-breakdown-detail-grid bill-breakdown-category-facts">
                      {categoryFactRows(data.categoryFacts).map(([label, value]) => (
                        <div key={`${label}-${value}`}>
                          <dt>{label}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ) : null}
                {data.sourceChargeSummaries?.length ? (
                  <div className="bill-breakdown-source-summaries">
                    <span className="bill-breakdown-label">Source-labelled charge groups</span>
                    {data.sourceChargeSummaries.map((summary, index) => {
                      const numericAmount = Number(summary.amount);
                      return (
                        <div key={`${summary.label}-${index}`}>
                          <span>{summary.label}</span>
                          <strong>{Number.isFinite(numericAmount) ? money(numericAmount, currency) : summary.amount}</strong>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </article>
            ) : null}

            {data.categoryReviewLens?.length ? (
              <article className="bill-breakdown-card bill-breakdown-category-lens">
                <div className="bill-breakdown-card-heading">
                  <div>
                    <span className="bill-breakdown-label">Category lens</span>
                    <h3>What this {data.category?.displayName ?? "bill"} review checks</h3>
                  </div>
                </div>
                <div className="bill-breakdown-category-lens-grid">
                  {data.categoryReviewLens.map((group) => (
                    <div key={group.label}>
                      <strong>{group.label}</strong>
                      <span>{group.fields.join(" · ")}</span>
                    </div>
                  ))}
                </div>
              </article>
            ) : null}

            {data.lineItems.length > 0 && (
              <article className="bill-breakdown-card">
                <div className="bill-breakdown-card-heading">
                  <div>
                    <span className="bill-breakdown-label">Line-item interpretation</span>
                    <h3>{data.lineItems.length} categorized line items</h3>
                    <p className="bill-breakdown-card-subtitle">
                      {classificationSummary.classified} of {classificationSummary.total} mapped to the {data.category?.displayName ?? "category"} review lens
                      {classificationSummary.reviewRequired > 0
                        ? ` · ${classificationSummary.reviewRequired} flagged for confirmation`
                        : " · no classification exceptions"}
                    </p>
                  </div>
                </div>
                <div className="bill-breakdown-line-items">
                  {data.lineItems.map((item) => {
                    const explanation = explanationsByLineItem.get(item.id);
                    const lineEvidence = (explanation?.evidenceIds ?? [])
                      .map((id) => data.evidence.find((reference) => reference.id === id))
                      .filter((reference): reference is BreakdownData["evidence"][number] => Boolean(reference));
                    const primaryEvidence = lineEvidence[0];
                    return (
                      <div className="bill-breakdown-line-item" key={item.id}>
                        <div>
                          <strong>{item.description}</strong>
                          <span>
                            {explanation?.canonicalCode
                              ? `${explanation.label} · ${explanation.reviewRequired ? "Confirm classification" : chargeClassLabel(explanation.chargeClass)}`
                              : "Unclassified · review required"}
                          </span>
                          {explanation?.explanation && (
                            <p>{explanation.explanation}</p>
                          )}
                          {primaryEvidence ? (
                            <div className="bill-breakdown-line-evidence">
                              <span>
                                {primaryEvidence.pageNumber == null
                                  ? "Source page unknown"
                                  : `Source page ${primaryEvidence.pageNumber}`}
                              </span>
                              <p>“{primaryEvidence.textExcerpt}”</p>
                              {isPdf && primaryEvidence.pageNumber != null ? (
                                <>
                                  <button
                                    type="button"
                                    className="bill-breakdown-page-jump-btn"
                                    onClick={() => setTargetPdfPage(primaryEvidence.pageNumber)}
                                  >
                                    Jump to page {primaryEvidence.pageNumber} <ExternalLink size={11} />
                                  </button>
                                  <a
                                    className="bill-breakdown-mobile-page-link"
                                    href={`${data.document.downloadUrl}#page=${primaryEvidence.pageNumber}`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Open source page <ExternalLink size={11} />
                                  </a>
                                </>
                              ) : data.document.downloadUrl && primaryEvidence.pageNumber != null ? (
                                <a
                                  href={`${data.document.downloadUrl}#page=${primaryEvidence.pageNumber}`}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Open source page <ExternalLink size={11} />
                                </a>
                              ) : null}
                            </div>
                          ) : (
                            <div className="bill-breakdown-line-evidence missing">
                              <span>Source evidence needs review</span>
                            </div>
                          )}
                        </div>
                        <div className="bill-breakdown-line-amount">
                          {money(item.amount, currency)}
                          {explanation?.reviewRequired && <em>Review</em>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            )}

            {data.anomalies.length > 0 && (
              <article className="bill-breakdown-card bill-breakdown-warning-card">
                <div className="bill-breakdown-card-heading">
                  <div>
                    <span className="bill-breakdown-label">Review findings</span>
                    <h3>Items that need attention</h3>
                  </div>
                  <AlertTriangle size={18} />
                </div>
                <div className="bill-breakdown-findings">
                  {data.anomalies.map((finding, index) => (
                    <div key={`${finding.title}-${index}`}>
                      <strong>{finding.title}</strong>
                      <p>{finding.message}</p>
                      {finding.state === "needs_evidence" && (
                        <span className="bill-breakdown-finding-state">Needs source evidence</span>
                      )}
                    </div>
                  ))}
                </div>
              </article>
            )}

            {data.evidence.length > 0 && (
              <article className="bill-breakdown-card">
                <div className="bill-breakdown-card-heading">
                  <div>
                    <span className="bill-breakdown-label">Source evidence</span>
                    <h3>{data.evidence.length} references</h3>
                    <p className="bill-breakdown-source-counts">
                      {data.evidenceCounts?.invoiceField ?? data.evidence.length} invoice fields · {data.evidenceCounts?.lineItem ?? 0} line-item links · opportunity evidence separate
                    </p>
                  </div>
                </div>
                <div className="bill-breakdown-evidence">
                  {visibleEvidence.map((item) => (
                    <blockquote key={item.id}>
                      <span>
                        {item.pageNumber == null ? "Source page unknown" : `Page ${item.pageNumber}`}
                        {item.fieldPath ? ` · ${item.fieldPath}` : ""}
                      </span>
                      <p>“{item.textExcerpt}”</p>
                      {isPdf && item.pageNumber != null && (
                        <>
                          <button
                            type="button"
                            className="bill-breakdown-page-jump-btn"
                            onClick={() => setTargetPdfPage(item.pageNumber)}
                          >
                            Jump to page {item.pageNumber} <ExternalLink size={11} />
                          </button>
                          <a
                            className="bill-breakdown-mobile-page-link"
                            href={`${data.document.downloadUrl}#page=${item.pageNumber}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open source page <ExternalLink size={11} />
                          </a>
                        </>
                      )}
                    </blockquote>
                  ))}
                </div>
                {data.evidence.length > visibleEvidence.length ? (
                  <button
                    type="button"
                    className="bill-breakdown-evidence-toggle"
                    onClick={() => setShowAllEvidence(true)}
                  >
                    Show all {data.evidence.length} references
                  </button>
                ) : showAllEvidence && data.evidence.length > 8 ? (
                  <button
                    type="button"
                    className="bill-breakdown-evidence-toggle"
                    onClick={() => setShowAllEvidence(false)}
                  >
                    Show fewer references
                  </button>
                ) : null}
              </article>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

export function BillBreakdownModal({
  documentId,
  documentIds = [],
  onClose,
  onNavigateDocument,
}: {
  documentId: string | null;
  documentIds?: string[];
  onClose: () => void;
  onNavigateDocument?: (documentId: string) => void;
}) {
  const [closingId, setClosingId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    return () => triggerRef.current?.focus();
  }, []);

  const requestClose = useCallback(() => {
    if (closingId) return;
    const currentId = documentId || closingId;
    if (!currentId) return;
    setClosingId(currentId);
  }, [closingId, documentId]);

  const finishClose = useCallback((event: AnimationEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || !closingId || event.animationName !== "billModalFadeOut") return;
    setClosingId(null);
    onClose();
  }, [closingId, onClose]);

  const activeId = documentId || closingId;
  const isClosing = Boolean(closingId);

  if (!activeId) return null;

  return (
    <div
      className={`bill-breakdown-backdrop ${isClosing ? "is-closing" : ""}`}
      role="presentation"
      onAnimationEnd={finishClose}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <section
        className={`bill-breakdown-dialog ${isClosing ? "is-closing" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bill-breakdown-title"
        aria-busy={isClosing}
        ref={dialogRef}
        tabIndex={-1}
      >
        <BillBreakdownContent
          key={activeId}
          documentId={activeId}
          documentIds={documentIds}
          onRequestClose={requestClose}
          onNavigateDocument={onNavigateDocument}
        />
      </section>

      <style>{`
        .bill-breakdown-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(10, 15, 29, 0.78);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          animation: billModalFadeIn 0.22s cubic-bezier(0.23, 1, 0.32, 1) both;
        }
        .bill-breakdown-backdrop.is-closing {
          animation: billModalFadeOut 0.22s cubic-bezier(0.23, 1, 0.32, 1) both;
          pointer-events: none;
        }
        .bill-breakdown-dialog {
          width: min(1680px, calc(100vw - 48px));
          height: min(920px, calc(100dvh - 48px));
          max-height: calc(100dvh - 48px);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 22px;
          color: #f8fafc;
          background: #0f172a;
          box-shadow: 0 32px 92px rgba(0, 0, 0, 0.52);
          animation: billModalSlideIn 0.26s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .bill-breakdown-dialog.is-closing {
          animation: billModalSlideOut 0.22s cubic-bezier(0.4, 0, 1, 1) both;
          pointer-events: none;
        }
        @keyframes billModalFadeIn {
          0% {
            opacity: 0;
            backdrop-filter: blur(0px);
            -webkit-backdrop-filter: blur(0px);
          }
          100% {
            opacity: 1;
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
          }
        }
        @keyframes billModalFadeOut {
          0% {
            opacity: 1;
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
          }
          100% {
            opacity: 0;
            backdrop-filter: blur(0px);
            -webkit-backdrop-filter: blur(0px);
          }
        }
        @keyframes billModalSlideIn {
          0% {
            opacity: 0;
          transform: scale(0.985) translateY(12px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes billModalSlideOut {
          0% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          100% {
            opacity: 0;
            transform: scale(0.985) translateY(8px);
          }
        }
        @keyframes billLoadingEnter {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes billLoadingCursor {
          0% { opacity: 0; transform: translateY(0); }
          12% { opacity: 1; }
          78% { opacity: 1; }
          100% { opacity: 0; transform: translateY(28px); }
        }
        @keyframes billLoadingTrace {
          0% { transform: translateX(-100%); }
          56%, 100% { transform: translateX(260%); }
        }
        @keyframes billLoadingStage {
          0%, 18% { border-color: rgba(148, 163, 184, 0.18); color: #64748b; background: rgba(15, 23, 42, 0.44); }
          24%, 46% { border-color: rgba(125, 211, 252, 0.5); color: #bae6fd; background: rgba(14, 116, 144, 0.16); }
          52%, 100% { border-color: rgba(94, 234, 212, 0.3); color: #99f6e4; background: rgba(13, 148, 136, 0.1); }
        }
        .bill-breakdown-header {
          flex: 0 0 72px;
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 0 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.09);
          background: rgba(15, 23, 42, 0.74);
        }
        .bill-breakdown-title-row,
        .bill-breakdown-title-line,
        .bill-breakdown-header-actions,
        .bill-breakdown-preview-bar span,
        .bill-breakdown-card-heading {
          display: flex;
          align-items: center;
        }
        .bill-breakdown-title-row { min-width: 0; gap: 13px; }
        .bill-breakdown-file-icon {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border: 1px solid rgba(96, 165, 250, 0.32);
          border-radius: 13px;
          color: #93c5fd;
          background: rgba(37, 99, 235, 0.16);
        }
        .bill-breakdown-title-line { gap: 10px; }
        .bill-breakdown-title-line h2 {
          overflow: hidden;
          margin: 0;
          color: #fff;
          font-size: 1.03rem;
          font-weight: 680;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .bill-breakdown-title-row p { margin: 3px 0 0; color: #94a3b8; font-size: 0.76rem; }
        .bill-breakdown-clean-status {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border: 1px solid rgba(52, 211, 153, 0.28);
          border-radius: 999px;
          color: #6ee7b7;
          background: rgba(16, 185, 129, 0.12);
          font-size: 0.68rem;
          white-space: nowrap;
        }
        .bill-breakdown-header-actions { gap: 9px; }
        .bill-breakdown-header-actions button,
        .bill-breakdown-header-actions a {
          min-height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 0 12px;
          border-radius: 10px;
          font: 600 0.76rem/1 inherit;
          text-decoration: none;
          cursor: pointer;
        }
        .bill-breakdown-ask { border: 0; color: #fff; background: #315bd6; transition: background-color 0.16s ease, transform 0.16s ease; }
        .bill-breakdown-ask:hover { background: #3b67e2; transform: translateY(-1px); }
        .bill-breakdown-close {
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #cbd5e1;
          background: rgba(255, 255, 255, 0.07);
        }
        .bill-breakdown-close { width: 36px; padding: 0 !important; }
        .bill-breakdown-cycler {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 3px 6px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 9px;
          background: rgba(15, 23, 42, 0.72);
        }
        .bill-breakdown-cycle-btn {
          width: 26px;
          height: 26px;
          min-height: 26px !important;
          display: grid;
          place-items: center;
          padding: 0 !important;
          border: 0;
          border-radius: 6px;
          background: transparent;
          color: #cbd5e1;
          cursor: pointer;
          transition: color 0.15s ease, background-color 0.15s ease;
        }
        .bill-breakdown-cycle-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.12);
          color: #fff;
        }
        .bill-breakdown-cycle-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .bill-breakdown-cycle-label {
          padding: 0 6px;
          color: #cbd5e1;
          font-size: 0.72rem;
          font-weight: 600;
          white-space: nowrap;
        }
        .bill-breakdown-state {
          flex: 1 1 0%;
          min-height: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
          color: #94a3b8;
        }
        .bill-breakdown-loading-state {
          width: min(100%, 430px);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          color: #cbd5e1;
          animation: billLoadingEnter 0.38s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .bill-breakdown-loading-visual {
          width: 184px;
          height: 104px;
          position: relative;
          display: grid;
          place-items: center;
        }
        .bill-breakdown-loading-document {
          width: 78px;
          height: 96px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          position: relative;
          overflow: hidden;
          z-index: 2;
          padding: 15px 13px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 17px;
          background: #0f172a;
          box-shadow: 0 18px 42px rgba(2, 6, 23, 0.24);
        }
        .bill-breakdown-loading-document__header {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #bae6fd;
        }
        .bill-breakdown-loading-document__header span {
          width: 24px;
          height: 4px;
          border-radius: 999px;
          background: rgba(186, 230, 253, 0.34);
        }
        .bill-breakdown-loading-document__rows { display: grid; gap: 8px; }
        .bill-breakdown-loading-document__rows i {
          display: block;
          height: 3px;
          border-radius: 999px;
          background: rgba(148, 163, 184, 0.2);
        }
        .bill-breakdown-loading-document__rows i:nth-child(2) { width: 76%; }
        .bill-breakdown-loading-document__rows i:nth-child(3) { width: 88%; }
        .bill-breakdown-loading-document__rows i:nth-child(4) { width: 58%; }
        .bill-breakdown-loading-cursor {
          position: absolute;
          z-index: 3;
          top: 49px;
          right: 10px;
          width: 14px;
          height: 3px;
          border-radius: 999px;
          background: rgba(125, 211, 252, 0.92);
          box-shadow: 0 0 10px rgba(56, 189, 248, 0.28);
          animation: billLoadingCursor 2.4s cubic-bezier(0.45, 0, 0.55, 1) infinite;
        }
        .bill-breakdown-loading-step-line {
          position: absolute;
          top: 0;
          right: 0;
          left: 0;
          height: 1px;
          overflow: hidden;
          background: rgba(148, 163, 184, 0.12);
        }
        .bill-breakdown-loading-step-line i {
          display: block;
          width: 42%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(125, 211, 252, 0.82), transparent);
          animation: billLoadingTrace 2.4s cubic-bezier(0.45, 0, 0.55, 1) infinite;
        }
        .bill-breakdown-loading-visual.is-compact {
          width: auto;
          height: auto;
        }
        .bill-breakdown-loading-copy { margin-top: 17px; }
        .bill-breakdown-loading-eyebrow {
          margin: 0;
          color: #7dd3fc;
          font-size: 0.66rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .bill-breakdown-loading-title {
          margin: 8px 0 0;
          color: #f8fafc;
          font-size: 1.04rem;
          font-weight: 650;
          letter-spacing: -0.012em;
        }
        .bill-breakdown-loading-description {
          max-width: 330px;
          margin: 7px 0 0;
          color: #94a3b8;
          font-size: 0.8rem;
          line-height: 1.55;
        }
        .bill-breakdown-loading-steps {
          position: relative;
          width: 100%;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin: 22px 0 0;
          padding: 16px 0 0;
          list-style: none;
          text-align: left;
        }
        .bill-breakdown-loading-steps li {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
        .bill-breakdown-loading-steps li > span {
          display: grid;
          flex: 0 0 28px;
          width: 28px;
          height: 28px;
          place-items: center;
          border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 9px;
          color: #64748b;
          background: rgba(15, 23, 42, 0.44);
          font-size: 0.58rem;
          font-variant-numeric: tabular-nums;
          animation: billLoadingStage 4.2s linear infinite;
        }
        .bill-breakdown-loading-steps li:nth-of-type(2) > span { animation-delay: 1.4s; }
        .bill-breakdown-loading-steps li:nth-of-type(3) > span { animation-delay: 2.8s; }
        .bill-breakdown-loading-steps div { min-width: 0; }
        .bill-breakdown-loading-steps strong,
        .bill-breakdown-loading-steps small { display: block; }
        .bill-breakdown-loading-steps strong { color: #cbd5e1; font-size: 0.67rem; font-weight: 650; }
        .bill-breakdown-loading-steps small { margin-top: 2px; color: #64748b; font-size: 0.58rem; line-height: 1.35; }
        .bill-breakdown-loading-state.is-compact {
          width: auto;
          padding: 22px;
        }
        .bill-breakdown-loading-state.is-compact .bill-breakdown-loading-document {
          width: 58px;
          height: 70px;
          gap: 8px;
          padding: 11px 10px;
          border-radius: 13px;
        }
        .bill-breakdown-loading-state.is-compact .bill-breakdown-loading-document__rows { gap: 5px; }
        .bill-breakdown-loading-state.is-compact .bill-breakdown-loading-cursor { top: 36px; }
        .bill-breakdown-loading-state.is-compact .bill-breakdown-loading-copy { margin-top: 12px; }
        .bill-breakdown-loading-state.is-compact .bill-breakdown-loading-title { font-size: 0.8rem; }
        .bill-breakdown-error { color: #fca5a5; }
        .bill-breakdown-error button {
          padding: 8px 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          color: #fff;
          background: rgba(255, 255, 255, 0.08);
        }
        .bill-breakdown-body {
          flex: 1 1 0%;
          min-height: 0;
          width: 100%;
          display: flex;
          flex-direction: row;
          overflow: hidden;
        }
        .bill-breakdown-preview {
          flex: 1 1 54%;
          min-width: 0;
          min-height: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          background: #020617;
        }
        .bill-breakdown-preview-bar {
          flex: 0 0 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 15px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
          color: #94a3b8;
          background: rgba(15, 23, 42, 0.88);
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .bill-breakdown-preview-bar span { gap: 4px; }
        .bill-breakdown-preview-content {
          flex: 1 1 0%;
          min-height: 0;
          width: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
          background: #020617;
        }
        .bill-breakdown-preview-content img {
          max-width: 100%;
          max-height: 100%;
          margin: auto;
          object-fit: contain;
        }
        .bill-breakdown-preview-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          height: 100%;
          color: #94a3b8;
          font-size: 0.78rem;
        }
        .bill-breakdown-no-preview {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: #94a3b8;
          margin: auto;
          padding: 24px;
        }
        .bill-breakdown-no-preview a {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: #93c5fd;
        }
        .bill-breakdown-analysis {
          flex: 1 1 46%;
          min-width: 380px;
          max-width: 700px;
          min-height: 0;
          overflow-y: auto !important;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-y;
          padding: 22px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: #0c1424;
        }
        .bill-breakdown-overview {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 18px;
          padding: 18px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 18px;
          background: rgba(30, 41, 59, 0.62);
        }
        .bill-breakdown-overview__intro { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; min-width: 0; }
        .bill-breakdown-overview h3 { margin: 4px 0 0; color: #f8fafc; font-size: 1.08rem; letter-spacing: -0.02em; }
        .bill-breakdown-overview__intro p { margin: 5px 0 0; color: #94a3b8; font-size: 0.72rem; line-height: 1.45; }
        .bill-breakdown-confidence { flex: 0 0 auto; padding: 4px 8px; border: 1px solid rgba(74, 222, 128, 0.24); border-radius: 999px; color: #86efac; font-size: 0.64rem; font-weight: 650; white-space: nowrap; }
        .bill-breakdown-confidence.needs-review { border-color: rgba(251, 191, 36, 0.26); color: #fcd34d; }
        .bill-breakdown-overview__amount { text-align: right; }
        .bill-breakdown-overview__amount span, .bill-breakdown-overview__facts span, .bill-breakdown-market-facts span { display: block; color: #94a3b8; font-size: 0.64rem; }
        .bill-breakdown-overview__amount strong { display: block; margin-top: 4px; color: #fff; font-size: 1.6rem; letter-spacing: -0.04em; }
        .bill-breakdown-overview__facts { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; padding-top: 14px; border-top: 1px solid rgba(148, 163, 184, 0.14); }
        .bill-breakdown-overview__facts strong, .bill-breakdown-market-facts strong { display: block; overflow: hidden; margin-top: 4px; color: #e2e8f0; font-size: 0.76rem; text-overflow: ellipsis; white-space: nowrap; }
        .bill-breakdown-card {
          padding: 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          background: rgba(30, 41, 59, 0.42);
        }
        .bill-breakdown-card-heading {
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 13px;
        }
        .bill-breakdown-card-heading h3 { margin: 3px 0 0; color: #f8fafc; font-size: 0.92rem; }
        .bill-breakdown-decision-card { background: rgba(30, 41, 59, 0.54); }
        .bill-breakdown-decision-card .bill-breakdown-card-heading > svg { color: #94a3b8; }
        .bill-breakdown-market-readout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; }
        .bill-breakdown-market-status { padding: 13px; border: 1px solid rgba(148, 163, 184, 0.18); border-radius: 12px; background: rgba(15, 23, 42, 0.5); }
        .bill-breakdown-market-status span { display: block; color: #cbd5e1; font-size: 0.7rem; font-weight: 620; }
        .bill-breakdown-market-status strong { display: block; margin-top: 6px; color: #f8fafc; font-size: 1.25rem; letter-spacing: -0.03em; }
        .bill-breakdown-market-status small { display: block; margin-top: 3px; color: #94a3b8; font-size: 0.64rem; }
        .bill-breakdown-market-status.is-above { border-color: rgba(251, 191, 36, 0.26); }
        .bill-breakdown-market-status.is-above strong { color: #fcd34d; }
        .bill-breakdown-market-status.is-below { border-color: rgba(74, 222, 128, 0.24); }
        .bill-breakdown-market-status.is-below strong { color: #86efac; }
        .bill-breakdown-market-facts { display: grid; gap: 8px; align-content: center; }
        .bill-breakdown-market-facts > div { padding: 9px 10px; border-radius: 10px; background: rgba(15, 23, 42, 0.38); }
        .bill-breakdown-anatomy-card { padding-bottom: 14px; }
        .bill-breakdown-balance-list { display: grid; gap: 0; margin: 0; }
        .bill-breakdown-balance-list > div { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 9px 0; border-bottom: 1px solid rgba(148, 163, 184, 0.1); }
        .bill-breakdown-balance-list > div:last-child { border-bottom: 0; }
        .bill-breakdown-balance-list dt { color: #94a3b8; font-size: 0.72rem; }
        .bill-breakdown-balance-list dd { margin: 0; color: #e2e8f0; font-size: 0.76rem; font-weight: 620; }
        .bill-breakdown-balance-list .is-total { margin-top: 3px; padding-top: 12px; }
        .bill-breakdown-balance-list .is-total dt, .bill-breakdown-balance-list .is-total dd { color: #fff; font-size: 0.84rem; font-weight: 700; }
        .bill-breakdown-movement-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }
        .bill-breakdown-movement-grid > div {
          min-width: 0;
          padding: 10px;
          border: 1px solid rgba(148, 163, 184, 0.12);
          border-radius: 11px;
          background: rgba(15, 23, 42, 0.3);
        }
        .bill-breakdown-movement-grid span,
        .bill-breakdown-movement-grid small { display: block; color: #94a3b8; font-size: 0.64rem; }
        .bill-breakdown-movement-grid strong { display: block; margin: 4px 0; overflow: hidden; color: #f8fafc; font-size: 0.82rem; font-weight: 680; text-overflow: ellipsis; white-space: nowrap; }
        .bill-breakdown-movement-grid .is-increase strong { color: #fbbf24; }
        .bill-breakdown-movement-grid .is-decrease strong { color: #6ee7b7; }
        .bill-breakdown-movement-note { margin: 10px 0 0; color: #748196; font-size: 0.65rem; line-height: 1.45; }
        .bill-breakdown-service-facts {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(116px, 1fr));
          gap: 8px;
          margin: 0 0 12px;
        }
        .bill-breakdown-service-facts > div,
        .bill-breakdown-composition > div {
          min-width: 0;
          padding: 10px;
          border: 1px solid rgba(148, 163, 184, 0.12);
          border-radius: 11px;
          background: rgba(15, 23, 42, 0.34);
        }
        .bill-breakdown-service-facts dt,
        .bill-breakdown-composition span {
          color: #94a3b8;
          font-size: 0.64rem;
        }
        .bill-breakdown-service-facts dd,
        .bill-breakdown-composition strong {
          display: block;
          overflow: hidden;
          margin: 4px 0 0;
          color: #e2e8f0;
          font-size: 0.76rem;
          font-weight: 650;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .bill-breakdown-composition { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
        .bill-breakdown-composition small { display: block; margin-top: 3px; color: #64748b; font-size: 0.62rem; }
        .bill-breakdown-service-coverage-card { padding-bottom: 14px; }
        .bill-breakdown-card-subtitle { margin: 5px 0 0; color: #94a3b8; font-size: 0.68rem; line-height: 1.45; }
        .bill-breakdown-service-points { display: grid; gap: 10px; }
        .bill-breakdown-service-point { padding: 12px; border: 1px solid rgba(148, 163, 184, 0.14); border-radius: 12px; background: rgba(15, 23, 42, 0.3); }
        .bill-breakdown-service-point-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
        .bill-breakdown-service-point-heading span { display: block; color: #94a3b8; font-size: 0.63rem; text-transform: uppercase; letter-spacing: 0.06em; }
        .bill-breakdown-service-point-heading strong { display: block; max-width: 100%; margin-top: 4px; color: #f8fafc; font-size: 0.78rem; font-weight: 650; }
        .bill-breakdown-service-point-heading small { flex: 0 0 auto; padding: 4px 7px; border: 1px solid rgba(251, 191, 36, 0.22); border-radius: 999px; color: #fcd34d; background: rgba(146, 64, 14, 0.14); font-size: 0.61rem; white-space: nowrap; }
        .bill-breakdown-service-point-heading small.is-linked { border-color: rgba(52, 211, 153, 0.22); color: #6ee7b7; background: rgba(16, 185, 129, 0.1); }
        .bill-breakdown-detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin: 0; }
        .bill-breakdown-detail-grid > div { min-width: 0; padding: 8px 9px; border-radius: 9px; background: rgba(30, 41, 59, 0.34); }
        .bill-breakdown-detail-grid dt { color: #94a3b8; font-size: 0.62rem; }
        .bill-breakdown-detail-grid dd { overflow-wrap: anywhere; margin: 3px 0 0; color: #e2e8f0; font-size: 0.7rem; line-height: 1.35; }
        .bill-breakdown-category-service-details { margin-top: 10px; }
        .bill-breakdown-source-summaries { display: grid; gap: 0; margin-top: 12px; border-top: 1px solid rgba(148, 163, 184, 0.12); }
        .bill-breakdown-source-summaries > .bill-breakdown-label { padding: 11px 0 5px; }
        .bill-breakdown-source-summaries > div { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 0; border-top: 1px solid rgba(148, 163, 184, 0.1); }
        .bill-breakdown-source-summaries > div span { color: #94a3b8; font-size: 0.68rem; }
        .bill-breakdown-source-summaries > div strong { color: #e2e8f0; font-size: 0.73rem; }
        .bill-breakdown-reconciliation-note { margin: 11px 0 0; color: #94a3b8; font-size: 0.68rem; line-height: 1.45; }
        .bill-breakdown-category-lens-grid { display: grid; gap: 0; }
        .bill-breakdown-category-lens-grid > div {
          display: grid;
          grid-template-columns: minmax(110px, 0.8fr) minmax(0, 1.6fr);
          gap: 12px;
          padding: 10px 0;
          border-top: 1px solid rgba(148, 163, 184, 0.12);
        }
        .bill-breakdown-category-lens-grid > div:first-child { padding-top: 0; border-top: 0; }
        .bill-breakdown-category-lens-grid > div:last-child { padding-bottom: 0; }
        .bill-breakdown-category-lens-grid strong { color: #cbd5e1; font-size: 0.72rem; }
        .bill-breakdown-category-lens-grid span { color: #94a3b8; font-size: 0.69rem; line-height: 1.45; }
        .bill-breakdown-label {
          color: #94a3b8;
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }
        .bill-breakdown-category {
          max-width: 52%;
          overflow: hidden;
          padding: 4px 9px;
          border: 1px solid rgba(96, 165, 250, 0.25);
          border-radius: 999px;
          color: #bfdbfe;
          background: rgba(59, 130, 246, 0.12);
          font-size: 0.7rem;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .bill-breakdown-metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }
        .bill-breakdown-metrics.two-column { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .bill-breakdown-metrics > div {
          min-width: 0;
          padding: 10px 11px;
          border-radius: 9px;
          background: rgba(15, 23, 42, 0.62);
        }
        .bill-breakdown-metrics span {
          display: block;
          margin-bottom: 3px;
          color: #94a3b8;
          font-size: 0.68rem;
        }
        .bill-breakdown-metrics strong {
          display: block;
          overflow: hidden;
          color: #f8fafc;
          font-size: 0.9rem;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .bill-breakdown-line-items,
        .bill-breakdown-findings,
        .bill-breakdown-agenda,
        .bill-breakdown-evidence {
          display: grid;
          gap: 8px;
        }
        .bill-breakdown-line-item {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          padding: 10px;
          border-radius: 9px;
          background: rgba(15, 23, 42, 0.48);
        }
        .bill-breakdown-line-item > div:first-child { min-width: 0; }
        .bill-breakdown-line-item strong { color: #f8fafc; font-size: 0.78rem; }
        .bill-breakdown-line-item span {
          display: block;
          margin-top: 3px;
          color: #94a3b8;
          font-size: 0.66rem;
          text-transform: capitalize;
        }
        .bill-breakdown-line-item p { margin: 6px 0 0; color: #aebbd0; font-size: 0.7rem; line-height: 1.45; }
        .bill-breakdown-line-evidence {
          margin-top: 8px;
          padding: 8px;
          border: 1px solid rgba(96, 165, 250, 0.16);
          border-radius: 8px;
          background: rgba(30, 64, 175, 0.11);
        }
        .bill-breakdown-line-evidence span { margin: 0; color: #93c5fd; font-size: 0.62rem; }
        .bill-breakdown-line-evidence p { margin: 4px 0 0; color: #cbd5e1; font-size: 0.68rem; }
        .bill-breakdown-line-evidence a {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-top: 6px;
          color: #93c5fd;
          font-size: 0.64rem;
          text-decoration: none;
        }
        .bill-breakdown-line-evidence.missing {
          border-color: rgba(251, 191, 36, 0.2);
          background: rgba(120, 76, 10, 0.12);
        }
        .bill-breakdown-line-evidence.missing span { color: #fbbf24; }
        .bill-breakdown-line-amount {
          flex: 0 0 auto;
          color: #fff;
          font-size: 0.78rem;
          font-weight: 700;
          text-align: right;
        }
        .bill-breakdown-line-amount em {
          display: block;
          margin-top: 4px;
          color: #fbbf24;
          font-size: 0.62rem;
          font-style: normal;
          font-weight: 600;
        }
        .bill-breakdown-page-jump-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-top: 6px;
          padding: 0;
          border: 0;
          background: transparent;
          color: #93c5fd;
          font-size: 0.64rem;
          font-weight: 600;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .bill-breakdown-page-jump-btn:hover { color: #bfdbfe; }
        .bill-breakdown-mobile-page-link { display: none; }
        .bill-breakdown-warning-card {
          border-color: rgba(245, 158, 11, 0.22);
          background: rgba(120, 76, 10, 0.14);
        }
        .bill-breakdown-warning-card .bill-breakdown-card-heading > svg { color: #fbbf24; }
        .bill-breakdown-findings > div {
          padding: 9px 10px;
          border-radius: 8px;
          background: rgba(15, 23, 42, 0.38);
        }
        .bill-breakdown-findings strong { color: #f8fafc; font-size: 0.76rem; }
        .bill-breakdown-findings p,
        .bill-breakdown-agenda p {
          margin: 4px 0 0;
          color: #cbd5e1;
          font-size: 0.72rem;
          line-height: 1.45;
        }
        .bill-breakdown-finding-state {
          display: block;
          margin-top: 6px;
          color: #fbbf24 !important;
          font-size: 0.62rem !important;
          text-transform: none !important;
        }
        .bill-breakdown-market-card { border-color: rgba(59, 130, 246, 0.22); }
        .bill-breakdown-market-card .bill-breakdown-card-heading > svg { color: #60a5fa; }
        .bill-breakdown-unavailable {
          display: flex;
          gap: 11px;
          padding: 12px;
          border: 1px solid rgba(148, 163, 184, 0.16);
          border-radius: 10px;
          color: #cbd5e1;
          background: rgba(15, 23, 42, 0.52);
        }
        .bill-breakdown-unavailable > svg { flex: 0 0 auto; color: #93c5fd; }
        .bill-breakdown-unavailable strong { color: #f8fafc; font-size: 0.78rem; }
        .bill-breakdown-unavailable p { margin: 4px 0; color: #aebbd0; font-size: 0.72rem; line-height: 1.45; }
        .bill-breakdown-unavailable .bill-breakdown-market-requirements { margin-top: 9px; color: #93c5fd; font-size: 0.65rem; font-weight: 600; }
        .bill-breakdown-unavailable ul {
          margin: 8px 0 0;
          padding-left: 18px;
          color: #94a3b8;
          font-size: 0.68rem;
        }
        .bill-breakdown-source-note { margin: 10px 0 0; color: #748196; font-size: 0.64rem; }
        .bill-breakdown-savings {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 10px;
          padding: 10px 12px;
          border: 1px solid rgba(52, 211, 153, 0.22);
          border-radius: 999px;
          color: #a7f3d0;
          background: rgba(16, 185, 129, 0.09);
          font-size: 0.72rem;
        }
        .bill-breakdown-savings strong { color: #6ee7b7; font-size: 0.9rem; }
        .bill-breakdown-agenda > div {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          padding: 11px 0;
          border-top: 1px solid rgba(148, 163, 184, 0.12);
        }
        .bill-breakdown-agenda > div:first-child { padding-top: 0; border-top: 0; }
        .bill-breakdown-agenda-priority {
          min-width: 44px;
          padding: 4px 6px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          flex: 0 0 auto;
          border-radius: 999px;
          color: #cbd5e1;
          background: rgba(148, 163, 184, 0.08);
          font-size: 0.59rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          line-height: 1;
          text-align: center;
          text-transform: uppercase;
        }
        .bill-breakdown-agenda-priority.is-high { color: #fecaca; border-color: rgba(248, 113, 113, 0.24); background: rgba(248, 113, 113, 0.08); }
        .bill-breakdown-agenda-priority.is-medium { color: #fde68a; border-color: rgba(251, 191, 36, 0.22); background: rgba(251, 191, 36, 0.07); }
        .bill-breakdown-agenda strong { color: #f8fafc; font-size: 0.77rem; }
        .bill-breakdown-evidence blockquote {
          margin: 0;
          padding: 10px;
          border: 1px solid rgba(148, 163, 184, 0.13);
          border-radius: 10px;
          background: rgba(15, 23, 42, 0.3);
        }
        .bill-breakdown-evidence blockquote span { color: #93c5fd; font-size: 0.64rem; }
        .bill-breakdown-evidence blockquote p { margin: 5px 0 0; color: #cbd5e1; font-size: 0.7rem; line-height: 1.45; }
        .bill-breakdown-source-counts { margin: 4px 0 0; color: #748196; font-size: 0.62rem; }
        .bill-breakdown-evidence-toggle {
          align-self: flex-start;
          margin-top: 4px;
          padding: 7px 10px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 8px;
          color: #cbd5e1;
          background: transparent;
          font-size: 0.7rem;
          font-weight: 650;
          cursor: pointer;
          transition: color 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
        }
        .bill-breakdown-evidence-toggle:hover { color: #f8fafc; border-color: rgba(148, 163, 184, 0.34); background: rgba(148, 163, 184, 0.08); }
        @media (max-width: 980px) {
          .bill-breakdown-backdrop { padding: 0; }
          .bill-breakdown-dialog { width: 100vw; height: 100dvh; max-height: 100dvh; border: 0; border-radius: 0; }
          .bill-breakdown-body { flex-direction: column; }
          .bill-breakdown-preview { display: none; }
          .bill-breakdown-header { align-items: flex-start; padding: 12px 14px; }
          .bill-breakdown-header-actions { gap: 6px; }
          .bill-breakdown-mobile-page-link {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            margin-top: 6px;
            color: #93c5fd;
            font-size: 0.64rem;
            font-weight: 600;
            text-decoration: underline;
            text-underline-offset: 2px;
          }
          .bill-breakdown-page-jump-btn { display: none; }
          .bill-breakdown-title-line { align-items: flex-start; flex-direction: column; gap: 4px; }
          .bill-breakdown-analysis { padding: 14px; max-width: 100%; min-width: 0; }
          .bill-breakdown-metrics { grid-template-columns: 1fr 1fr; }
          .bill-breakdown-metrics > div:first-child { grid-column: 1 / -1; }
          .bill-breakdown-overview { border-radius: 0; border-inline: 0; }
        }
        @media (max-width: 620px) {
          .bill-breakdown-loading-state:not(.is-compact) { padding: 0 20px; }
          .bill-breakdown-loading-steps { grid-template-columns: 1fr; gap: 10px; }
          .bill-breakdown-file-icon { display: none; }
          .bill-breakdown-title-row p { max-width: 52vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .bill-breakdown-ask { font-size: 0 !important; width: 36px; padding: 0 !important; }
          .bill-breakdown-ask svg { width: 16px; }
          .bill-breakdown-category { max-width: 44%; }
          .bill-breakdown-overview { grid-template-columns: 1fr; gap: 14px; padding: 16px 0; }
          .bill-breakdown-overview__amount { text-align: left; }
          .bill-breakdown-overview__facts, .bill-breakdown-market-readout { grid-template-columns: 1fr; }
          .bill-breakdown-composition { grid-template-columns: 1fr; }
          .bill-breakdown-detail-grid { grid-template-columns: 1fr; }
          .bill-breakdown-service-point-heading { flex-direction: column; }
          .bill-breakdown-movement-grid { grid-template-columns: 1fr; }
          .bill-breakdown-category-lens-grid > div { grid-template-columns: 1fr; gap: 3px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .bill-breakdown-backdrop,
          .bill-breakdown-backdrop.is-closing,
          .bill-breakdown-dialog,
          .bill-breakdown-dialog.is-closing,
          .bill-breakdown-loading-state,
          .bill-breakdown-loading-cursor,
          .bill-breakdown-loading-step-line i,
          .bill-breakdown-loading-steps li > span {
            animation: none !important;
          }
          .bill-breakdown-loading-cursor { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
