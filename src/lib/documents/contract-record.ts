import type { DocumentIntelligence } from "@/lib/ai/document-intelligence";
import { categoryIntelligence } from "@/lib/category-intelligence/service";
import { resolveKnownVendorIdentity } from "@/lib/vendors/normalize";
import { resolveVendorAndCategory } from "@/lib/vendors/resolve";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type DatabaseClient = ReturnType<typeof createServerSupabaseClient>;

type SourceLocationResolution = {
  address: string;
  sourceField: string;
  resolution: {
    locationId: string | null;
    serviceLocationMatchStatus: string;
    createdLocationId: string | null;
    issueCodes: string[];
  };
};

export type ContractRecordResult = {
  contractId: string | null;
  needsReview: boolean;
  issueCodes: string[];
  vendorMatchStatus: string;
  locationIds: string[];
};

function generatedTitle(intelligence: DocumentIntelligence, filename: string): string {
  const vendorName = intelligence.vendorName?.trim();
  if (vendorName) return `${vendorName} agreement`.slice(0, 200);
  const withoutExtension = filename.replace(/\.[A-Za-z0-9]+$/, "").trim();
  return (withoutExtension || "Unreviewed agreement").slice(0, 200);
}

function sourceCurrency(intelligence: DocumentIntelligence, organizationCurrency: unknown): string | null {
  const extracted = intelligence.currency?.trim().toUpperCase();
  if (extracted && /^[A-Z]{3}$/.test(extracted)) return extracted;
  const workspace = typeof organizationCurrency === "string" ? organizationCurrency.trim().toUpperCase() : "";
  return /^[A-Z]{3}$/.test(workspace) ? workspace : null;
}

function explicitAnnualValue(details: DocumentIntelligence["contractDetails"]): string | null {
  if (!details?.rateOrPrice || !details.pricingUnit) return null;
  return /\bannual(?:ly)?\b|\byearly\b|\bper\s+year\b|\/\s*(?:yr|year)\b/i.test(details.pricingUnit)
    ? details.rateOrPrice
    : null;
}

export async function createContractRecordFromExtraction(input: {
  db: DatabaseClient;
  organizationId: string;
  documentId: string;
  filename: string;
  providedRelationshipId?: string | null;
  intelligence: DocumentIntelligence;
  locationIds: string[];
  locationResolutions: SourceLocationResolution[];
}): Promise<ContractRecordResult | null> {
  if (!(["contract", "order_form"] as string[]).includes(input.intelligence.classification)) return null;

  const knownVendor = resolveKnownVendorIdentity(input.intelligence.vendorName || "");
  const vendorResult = await resolveVendorAndCategory({
    db: input.db,
    organizationId: input.organizationId,
    extractedName: knownVendor?.canonicalName || input.intelligence.vendorName || "Unknown Vendor",
    providedRelationshipId: input.providedRelationshipId,
    categoryHint: knownVendor?.categoryName,
    documentId: input.documentId,
  });
  const issueCodes: string[] = [];
  if (!vendorResult.organizationVendorId) {
    issueCodes.push("contract_vendor_unmatched");
    return {
      contractId: null,
      needsReview: true,
      issueCodes,
      vendorMatchStatus: vendorResult.matchStatus,
      locationIds: input.locationIds,
    };
  }

  const categoryResolution = await categoryIntelligence.resolveCategory({
    rawCategory: vendorResult.categoryName,
    vendorName: input.intelligence.vendorName,
    lineItemDescriptions: [],
  });
  const { data: organization, error: organizationError } = await input.db
    .from("organizations")
    .select("currency")
    .eq("id", input.organizationId)
    .maybeSingle();
  if (organizationError) throw organizationError;
  const currency = sourceCurrency(input.intelligence, organization?.currency);
  if (!currency) {
    issueCodes.push("contract_currency_unknown");
    return {
      contractId: null,
      needsReview: true,
      issueCodes,
      vendorMatchStatus: vendorResult.matchStatus,
      locationIds: input.locationIds,
    };
  }

  const details = input.intelligence.contractDetails;
  const currencySource = input.intelligence.currency ? "source" : "organization_default";
  const sourceAddresses = input.locationResolutions.map((entry) => ({
    address: entry.address,
    sourceField: entry.sourceField,
    locationId: entry.resolution.locationId,
    status: entry.resolution.serviceLocationMatchStatus,
    issueCodes: entry.resolution.issueCodes,
  }));
  const inserted = await input.db
    .from("contracts")
    .insert({
      organization_id: input.organizationId,
      organization_vendor_id: vendorResult.organizationVendorId,
      document_id: input.documentId,
      location_id: input.locationIds[0] ?? null,
      title: generatedTitle(input.intelligence, input.filename),
      category: categoryResolution.displayName || vendorResult.categoryName || "Other",
      start_date: details?.effectiveDate ?? null,
      end_date: details?.expirationDate ?? null,
      notice_period_days: input.intelligence.noticePeriodDays ?? null,
      annual_value: explicitAnnualValue(details),
      currency,
      status: "draft",
      auto_renews: details?.autoRenewal ?? false,
      owner_name: null,
      metadata: {
        schemaVersion: "contract-v1",
        sourceAddresses,
        locationIds: input.locationIds,
        currencySource,
        extractionFacts: {
          customerName: input.intelligence.customerName ?? null,
          serviceAddress: input.intelligence.serviceAddress ?? null,
          noticePeriodDays: input.intelligence.noticePeriodDays ?? null,
          contractDetails: details ?? null,
          categoryFacts: input.intelligence.categoryFacts ?? [],
        },
        categoryIntelligence: {
          categoryKey: categoryResolution.key,
          packVersion: categoryResolution.expertPackVersion,
          resolutionSource: categoryResolution.source,
          confidence: categoryResolution.confidence,
        },
        reviewIssueCodes: issueCodes,
      },
    })
    .select("id")
    .single();
  if (inserted.error) throw inserted.error;

  return {
    contractId: typeof inserted.data?.id === "string" ? inserted.data.id : null,
    needsReview: true,
    issueCodes,
    vendorMatchStatus: vendorResult.matchStatus,
    locationIds: input.locationIds,
  };
}
