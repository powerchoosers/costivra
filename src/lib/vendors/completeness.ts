export interface VendorCompletenessInput {
  name?: string | null;
  category?: string | null;
  locationId?: string | null;
  ownerName?: string | null;
  monitoringState?: string | null;
  documentCount: number;
  hasReconciledDocument: boolean;
  hasExpenseRecord: boolean;
  hasContractTerms: boolean;
  hasEvaluatedOpportunity: boolean;
}

export interface VendorCompletenessResult {
  score: number;
  totalComponents: number;
  completedCount: number;
  percentage: number;
  missingComponents: string[];
  components: Array<{
    id: string;
    label: string;
    complete: boolean;
  }>;
}

export function evaluateVendorCompleteness(input: VendorCompletenessInput): VendorCompletenessResult {
  const components = [
    {
      id: "name",
      label: "Authoritative vendor name verified",
      complete: Boolean(input.name && input.name.trim().length > 0),
    },
    {
      id: "category",
      label: "Expense category assigned",
      complete: Boolean(input.category && input.category.trim().length > 0),
    },
    {
      id: "location",
      label: "Primary location assigned",
      complete: Boolean(input.locationId && input.locationId.trim().length > 0),
    },
    {
      id: "owner",
      label: "Account owner designated",
      complete: Boolean(input.ownerName && input.ownerName.trim().length > 0),
    },
    {
      id: "monitoring_config",
      label: "Bill monitoring configured",
      complete: Boolean(input.monitoringState && input.monitoringState !== "not_configured" && input.monitoringState !== "not_set_up"),
    },
    {
      id: "monitoring_active",
      label: "Forwarding test passed & active",
      complete: Boolean(input.monitoringState === "active"),
    },
    {
      id: "source_document",
      label: "At least 1 source bill uploaded",
      complete: input.documentCount > 0,
    },
    {
      id: "document_reconciled",
      label: "Document extracted & reconciled",
      complete: input.hasReconciledDocument,
    },
    {
      id: "expense_normalized",
      label: "Normalized expense record present",
      complete: input.hasExpenseRecord,
    },
    {
      id: "contract_terms",
      label: "Contract & renewal terms recorded",
      complete: input.hasContractTerms,
    },
    {
      id: "opportunity_evaluated",
      label: "Cost opportunity rules evaluated",
      complete: input.hasEvaluatedOpportunity,
    },
  ];

  const completedCount = components.filter((c) => c.complete).length;
  const totalComponents = components.length; // 11
  const percentage = Math.round((completedCount / totalComponents) * 100);
  const missingComponents = components.filter((c) => !c.complete).map((c) => c.label);

  return {
    score: percentage,
    totalComponents,
    completedCount,
    percentage,
    missingComponents,
    components,
  };
}
