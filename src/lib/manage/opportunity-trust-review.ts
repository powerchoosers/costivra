import "server-only";

import { requireInternalOwner } from "@/lib/manage/auth";
import type { ManageOpportunityTrustReviewData } from "@/lib/manage/types";
import { deriveOpportunityTrustState, isOpportunityTrustState } from "@/lib/domain/opportunity-trust";

type Row = Record<string, unknown>;

const rows = (value: unknown): Row[] => (Array.isArray(value) ? value as Row[] : []);
const stringValue = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const nullableString = (value: unknown) => typeof value === "string" && value ? value : null;
const numberValue = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};
const hasCalculation = (value: unknown) => Boolean(value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length);

export async function getManageOpportunityTrustReviewData(): Promise<ManageOpportunityTrustReviewData> {
  const owner = await requireInternalOwner();
  const modernOpportunitiesResult = await owner.db.from("opportunities").select("id,organization_id,expense_account_id,title,category,estimated_annual_value,generated_by,trust_state,customer_visible,calculation_result").eq("generated_by", "manual").gt("estimated_annual_value", 0).order("updated_at", { ascending: false });
  const opportunitiesResult = modernOpportunitiesResult.error?.code === "42703"
    ? await owner.db.from("opportunities").select("id,organization_id,expense_account_id,title,category,estimated_annual_value,generated_by,calculation_result").eq("generated_by", "manual").gt("estimated_annual_value", 0).order("updated_at", { ascending: false })
    : modernOpportunitiesResult;
  if (opportunitiesResult.error) throw opportunitiesResult.error;
  const [organizationsResult, vendorsResult, relationshipsResult, accountsResult, expensesResult, locationsResult, evidenceResult] = await Promise.all([
    owner.db.from("organizations").select("id,name"),
    owner.db.from("vendors").select("id,canonical_name"),
    owner.db.from("organization_vendors").select("id,vendor_id"),
    owner.db.from("expense_accounts").select("id,organization_vendor_id,external_account_reference"),
    owner.db.from("expenses").select("id,organization_id,expense_account_id,location_id,document_id"),
    owner.db.from("locations").select("id,name"),
    owner.db.from("opportunity_evidence").select("opportunity_id"),
  ]);
  const failed = [organizationsResult, vendorsResult, relationshipsResult, accountsResult, expensesResult, locationsResult, evidenceResult].find((result) => result.error);
  if (failed?.error) throw failed.error;

  const organizationById = new Map(rows(organizationsResult.data).map((item) => [stringValue(item.id), item]));
  const vendorById = new Map(rows(vendorsResult.data).map((item) => [stringValue(item.id), item]));
  const relationshipById = new Map(rows(relationshipsResult.data).map((item) => [stringValue(item.id), item]));
  const accountById = new Map(rows(accountsResult.data).map((item) => [stringValue(item.id), item]));
  const locationById = new Map(rows(locationsResult.data).map((item) => [stringValue(item.id), item]));
  const expensesByAccount = new Map<string, Row[]>();
  for (const expense of rows(expensesResult.data)) {
    const accountId = stringValue(expense.expense_account_id);
    if (accountId) expensesByAccount.set(accountId, [...(expensesByAccount.get(accountId) ?? []), expense]);
  }
  const evidenceCounts = new Map<string, number>();
  for (const evidence of rows(evidenceResult.data)) {
    const opportunityId = stringValue(evidence.opportunity_id);
    evidenceCounts.set(opportunityId, (evidenceCounts.get(opportunityId) ?? 0) + 1);
  }

  const sourceDocumentIds = rows(expensesResult.data)
    .map((expense) => stringValue(expense.document_id))
    .filter(Boolean);
  const [sourceDocumentsResult, sourceEvidenceResult] = sourceDocumentIds.length
    ? await Promise.all([
        owner.db.from("documents").select("id,original_filename").in("id", sourceDocumentIds),
        owner.db.from("evidence_references").select("id,document_id,page_number,field_path,text_excerpt").in("document_id", sourceDocumentIds).order("page_number", { ascending: true, nullsFirst: false }).order("created_at", { ascending: true }),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  const sourceFailure = [sourceDocumentsResult, sourceEvidenceResult].find((result) => result.error);
  if (sourceFailure?.error) throw sourceFailure.error;
  const documentById = new Map(rows(sourceDocumentsResult.data).map((item) => [stringValue(item.id), item]));
  const evidenceByDocumentId = new Map<string, Row[]>();
  for (const evidence of rows(sourceEvidenceResult.data)) {
    const documentId = stringValue(evidence.document_id);
    if (documentId) evidenceByDocumentId.set(documentId, [...(evidenceByDocumentId.get(documentId) ?? []), evidence]);
  }

  const items = rows(opportunitiesResult.data).flatMap((opportunity) => {
    if (hasCalculation(opportunity.calculation_result) || evidenceCounts.get(stringValue(opportunity.id))) return [];
    const account = accountById.get(stringValue(opportunity.expense_account_id));
    const relatedExpenses = expensesByAccount.get(stringValue(opportunity.expense_account_id)) ?? [];
    const expense = relatedExpenses[0];
    const relationship = relationshipById.get(stringValue(account?.organization_vendor_id));
    const vendor = vendorById.get(stringValue(relationship?.vendor_id));
    const location = locationById.get(stringValue(expense?.location_id));
    const organization = organizationById.get(stringValue(opportunity.organization_id));
    const generatedBy = stringValue(opportunity.generated_by, "manual");
    const evidenceCount = evidenceCounts.get(stringValue(opportunity.id)) ?? 0;
    const evidenceOptions = relatedExpenses
      .map((relatedExpense) => stringValue(relatedExpense.document_id))
      .flatMap((documentId) => (evidenceByDocumentId.get(documentId) ?? []).map((evidence) => {
        const document = documentById.get(documentId);
        return {
          id: stringValue(evidence.id),
          documentId,
          filename: stringValue(document?.original_filename, "Source document"),
          pageNumber: evidence.page_number == null ? null : numberValue(evidence.page_number),
          fieldPath: nullableString(evidence.field_path),
          excerpt: stringValue(evidence.text_excerpt, "Source evidence without a stored excerpt.").slice(0, 240),
        };
      }));
    const explicitTrustState = isOpportunityTrustState(opportunity.trust_state) ? opportunity.trust_state : null;
    return [{
      id: stringValue(opportunity.id),
      organizationId: stringValue(opportunity.organization_id),
      organizationName: stringValue(organization?.name, "Unknown workspace"),
      vendorName: stringValue(vendor?.canonical_name, "Unknown vendor"),
      title: stringValue(opportunity.title),
      category: nullableString(opportunity.category),
      estimatedAnnualValue: numberValue(opportunity.estimated_annual_value),
      generatedBy,
      trustState: deriveOpportunityTrustState({ generatedBy, explicitTrustState, sourceRecordId: null, evidenceCount, calculationInputs: {}, calculationResult: {} }),
      customerVisible: opportunity.customer_visible !== false,
      evidenceCount,
      expenseAccountReference: nullableString(account?.external_account_reference),
      locationName: location ? stringValue(location.name) : null,
      issue: "Manual opportunity with a monetary claim but no evidence or deterministic calculation.",
      evidenceOptions,
    }];
  });
  return { items, generatedAt: new Date().toISOString() };
}
