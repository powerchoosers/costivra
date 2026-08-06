export type CategoryReportRow = {
  metric: string;
  value: string;
  status: "draft" | "review_required" | "not_used" | "estimated" | "verified";
  detail: string;
};

type InvoiceRecord = {
  id: string;
  expenseCategory: string | null;
  metadata: unknown;
};

type AnalysisRecord = {
  invoiceId: string | null;
  packVersion: string | null;
  missingDimensions: unknown;
  liveSourcesUsed: unknown;
};

type OpportunityRecord = { estimatedAnnualValue: unknown };
type SavingsRecord = { amount: unknown; status: string | null };

type CategoryTrace = { categoryKey?: unknown; packVersion?: unknown };

function categoryTrace(metadata: unknown): CategoryTrace | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const trace = (metadata as Record<string, unknown>).categoryIntelligence;
  return trace && typeof trace === "object" && !Array.isArray(trace)
    ? (trace as CategoryTrace)
    : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function amount(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function money(value: number): string {
  return value.toFixed(2);
}

/**
 * Creates export-safe report rows from persisted records. It deliberately keeps
 * estimated opportunity value separate from human-verified savings.
 */
export function buildCategoryIntelligenceReportRows(input: {
  invoices: InvoiceRecord[];
  analyses: AnalysisRecord[];
  opportunities: OpportunityRecord[];
  savings: SavingsRecord[];
  packStatusByKey: ReadonlyMap<string, string>;
}): CategoryReportRow[] {
  const traces = input.invoices.map((invoice) => ({
    invoice,
    trace: categoryTrace(invoice.metadata),
  }));
  const resolved = traces.filter(({ trace }) => text(trace?.categoryKey));
  const unresolved = input.invoices.length - resolved.length;
  const versions = new Set(
    resolved.flatMap(({ trace }) => {
      const key = text(trace?.categoryKey);
      const version = text(trace?.packVersion);
      return key ? [`${key}@${version ?? "unknown"}`] : [];
    }),
  );
  const draftCount = resolved.filter(({ trace }) => {
    const key = text(trace?.categoryKey);
    return !key || input.packStatusByKey.get(key) !== "verified";
  }).length;
  const analysesWithMissingDimensions = input.analyses.filter(
    (analysis) => list(analysis.missingDimensions).length > 0,
  ).length;
  const analysesWithCurrentSources = input.analyses.filter(
    (analysis) => list(analysis.liveSourcesUsed).length > 0,
  ).length;
  const estimatedValue = input.opportunities.reduce(
    (total, opportunity) => total + amount(opportunity.estimatedAnnualValue),
    0,
  );
  const verifiedValue = input.savings
    .filter((outcome) => outcome.status === "verified")
    .reduce((total, outcome) => total + amount(outcome.amount), 0);

  return [
    {
      metric: "Invoices with a resolved category trace",
      value: `${resolved.length}/${input.invoices.length}`,
      status: draftCount > 0 ? "draft" : "verified",
      detail: versions.size ? [...versions].sort().join("; ") : "No category pack trace recorded.",
    },
    {
      metric: "Invoices requiring category review",
      value: String(unresolved),
      status: "review_required",
      detail: "No resolved category trace is treated as unknown, not assigned by guesswork.",
    },
    {
      metric: "Analyses with missing benchmark dimensions",
      value: String(analysesWithMissingDimensions),
      status: "review_required",
      detail: "A missing dimension prevents a comparable benchmark claim.",
    },
    {
      metric: "Analyses using current-market sources",
      value: String(analysesWithCurrentSources),
      status: analysesWithCurrentSources ? "draft" : "not_used",
      detail: analysesWithCurrentSources
        ? "Current-source facts remain draft until the pack's release gate is cleared."
        : "No current-market source was used in these analyses.",
    },
    {
      metric: "Estimated opportunity value",
      value: money(estimatedValue),
      status: "estimated",
      detail: "Estimated value is not verified savings.",
    },
    {
      metric: "Verified savings value",
      value: money(verifiedValue),
      status: "verified",
      detail: "Only outcomes in the verified workflow state are included.",
    },
  ];
}
