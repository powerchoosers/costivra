import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSessionSupabaseClient } from "@/lib/supabase/session";
import { isInboundEmailPlatformReady } from "@/lib/email/resend";
import { portalRoleCanWrite } from "@/lib/portal/access";
import {
  canShowCustomerMonetaryClaim,
  deriveOpportunityTrustState,
  isOpportunityTrustState,
} from "@/lib/domain/opportunity-trust";
import type { PortalData, PortalVendorContact } from "@/lib/portal/types";
import { isAllowedCategoryFactKey } from "@/lib/category-intelligence/category-facts";

type Row = Record<string, unknown>;

function numberValue(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function maskIdentifier(value: unknown): string | null {
  const raw = nullableString(value);
  return raw ? `•••• ${raw.slice(-4)}` : null;
}

function maskedIdentifierList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.flatMap((item) => {
        const masked = maskIdentifier(item);
        return masked ? [masked] : [];
      })
    : [];
}

function contractCategoryFacts(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const row = item as Row;
    const key = typeof row.key === "string" ? row.key.trim() : "";
    const rawValue = typeof row.value === "string" ? row.value.trim() : "";
    if (!key || !rawValue || !isAllowedCategoryFactKey(key)) return [];
    const needsMask = /(?:account|customer|group|merchant|policy|circuit|phone|identifier|number|id|profile|org|api|extension|location)/i.test(key);
    return [{
      key,
      value: needsMask ? `•••• ${rawValue.slice(-4)}` : rawValue,
      unit: typeof row.unit === "string" && row.unit.trim() ? row.unit.trim() : null,
      sourceKey: typeof row.sourceKey === "string" && row.sourceKey.trim() ? row.sourceKey.trim() : null,
    }];
  }).slice(0, 200);
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim())
    : [];
}

function contractSourceFacts(contract: Row) {
  const metadata = contract.metadata && typeof contract.metadata === "object" && !Array.isArray(contract.metadata)
    ? contract.metadata as Row
    : {};
  const sourceAddresses = Array.isArray(metadata.sourceAddresses)
    ? metadata.sourceAddresses.flatMap((item) => {
        if (typeof item === "string" && item.trim()) return [item.trim()];
        if (!item || typeof item !== "object" || Array.isArray(item)) return [];
        const address = (item as Row).address;
        return typeof address === "string" && address.trim() ? [address.trim()] : [];
      })
    : [];
  const extractionFacts = metadata.extractionFacts && typeof metadata.extractionFacts === "object" && !Array.isArray(metadata.extractionFacts)
    ? metadata.extractionFacts as Row
    : {};
  const details = extractionFacts.contractDetails && typeof extractionFacts.contractDetails === "object" && !Array.isArray(extractionFacts.contractDetails)
    ? extractionFacts.contractDetails as Row
    : {};
  const addresses = sourceAddresses.length > 0 ? sourceAddresses : stringList(details.serviceAddresses);
  const termMonths = details.termMonths == null ? null : Number(details.termMonths);
  return {
    sourceAddresses: Array.from(new Set(addresses)).slice(0, 100),
    serviceIdentifiers: maskedIdentifierList(details.serviceIdentifiers),
    termMonths: termMonths !== null && Number.isFinite(termMonths) && termMonths >= 0 ? termMonths : null,
    sourceRateOrPrice: nullableString(details.rateOrPrice),
    sourcePricingUnit: nullableString(details.pricingUnit),
    minimumCommitmentQuantity: nullableString(details.minimumCommitmentQuantity),
    minimumCommitmentUnit: nullableString(details.minimumCommitmentUnit),
    currency: nullableString(contract.currency),
    categoryFacts: contractCategoryFacts(extractionFacts.categoryFacts),
  };
}

function rows(data: unknown): Row[] {
  return Array.isArray(data) ? data as Row[] : [];
}

async function requireUserId(): Promise<string> {
  const session = await createSessionSupabaseClient();
  const { data, error } = await session.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || typeof userId !== "string") throw new Error("AUTH_REQUIRED");
  return userId;
}

export async function getPortalData(): Promise<PortalData> {
  const userId = await requireUserId();
  const db = createServerSupabaseClient();

  const { data: membership, error: membershipError } = await db
    .from("organization_memberships")
    .select("organization_id, role, permissions")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership) throw new Error("NO_ORGANIZATION_MEMBERSHIP");
  const organizationId = membership.organization_id as string;

  const [
    organizationResult, profileResult, locationsResult, energyMetersResult, vendorsResult,
    relationshipsResult, vendorContactsResult, accountsResult, expensesResult, contractsResult,
    documentsResult, extractionsResult, opportunitiesResult, opportunityEvidenceResult,
    actionsResult, approvalsResult, approvalPoliciesResult, savingsResult, integrationsResult,
    reportsResult, membershipsResult, profilesResult, notificationsResult,
    emailIntakeResult, inboundEmailEventsResult, invoicesResult, invoiceLineItemsResult,
    auditEventsResult,
  ] = await Promise.all([
    db.from("organizations").select("*").eq("id", organizationId).single(),
    db.from("profiles").select("id,email,full_name,avatar_url").eq("id", userId).single(),
    db.from("locations").select("*").eq("organization_id", organizationId).order("name"),
    db.from("energy_meters").select("id,location_id,meter_identifier,service_identifier,account_number_last4,utility_territory,status,display_name,last_seen_at").eq("organization_id", organizationId).order("created_at"),
    db.from("vendors").select("id,canonical_name,category,website,search_aliases,logo_url").order("canonical_name"),
    db.from("organization_vendors").select("*").eq("organization_id", organizationId),
    db.from("organization_vendor_contacts").select("*").eq("organization_id", organizationId).order("contact_type").order("contact_name"),
    db.from("expense_accounts").select("*").eq("organization_id", organizationId),
    db.from("expenses").select("*").eq("organization_id", organizationId).order("period_end", { ascending: false }),
    db.from("contracts").select("*").eq("organization_id", organizationId).order("end_date"),
    db.from("documents").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    db.from("document_extraction_versions").select("document_id,confidence,status,completed_at").order("created_at", { ascending: false }),
    // Keep the read path usable while the forward trust migration is being
    // rolled out. Once present, customer_visible is enforced in memory below;
    // querying it here would make an older schema fail the entire portal load.
    db.from("opportunities").select("*").eq("organization_id", organizationId).order("deadline_at"),
    db.from("opportunity_evidence").select("opportunity_id,evidence_reference_id"),
    db.from("action_plans").select("*").order("due_at"),
    db.from("approvals").select("*").eq("organization_id", organizationId),
    db.from("approval_policies").select("*").eq("organization_id", organizationId).order("created_at"),
    db.from("savings_outcomes").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    db.from("integrations").select("*").eq("organization_id", organizationId).order("display_name"),
    db.from("report_definitions").select("*").eq("organization_id", organizationId).order("name"),
    db.from("organization_memberships").select("*").eq("organization_id", organizationId),
    db.from("profiles").select("id,email,full_name,avatar_url"),
    db.from("notifications").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    db.from("inbound_email_addresses").select("id,local_part,domain,status,trusted_senders").eq("organization_id", organizationId).maybeSingle(),
    db.from("inbound_email_events").select("id,sender_address,subject,status,attachment_count,processed_attachment_count,error_message,received_at").eq("organization_id", organizationId).order("received_at", { ascending: false }).limit(12),
    db.from("invoices").select("*").eq("organization_id", organizationId).order("invoice_date", { ascending: false }),
    db.from("invoice_line_items").select("*").eq("organization_id", organizationId).order("line_number"),
    db.from("audit_events").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(250),
  ]);

  const results = [organizationResult, profileResult, locationsResult, energyMetersResult, vendorsResult,
    relationshipsResult, vendorContactsResult, accountsResult, expensesResult, contractsResult, documentsResult,
    extractionsResult, opportunitiesResult, opportunityEvidenceResult, actionsResult,
    approvalsResult, approvalPoliciesResult, savingsResult, integrationsResult, reportsResult, membershipsResult,
    profilesResult, notificationsResult, emailIntakeResult, inboundEmailEventsResult,
    invoicesResult, invoiceLineItemsResult, auditEventsResult];
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;

  const documentIds = rows(documentsResult.data).map((item) => stringValue(item.id)).filter(Boolean);
  const evidenceReferencesResult = documentIds.length
    ? await db.from("evidence_references").select("*").in("document_id", documentIds)
    : { data: [], error: null };
  if (evidenceReferencesResult.error) throw evidenceReferencesResult.error;

  const evidenceCountByDocument = new Map<string, number>();
  for (const evidence of rows(evidenceReferencesResult.data)) {
    const documentId = stringValue(evidence.document_id);
    evidenceCountByDocument.set(documentId, (evidenceCountByDocument.get(documentId) ?? 0) + 1);
  }

  const organization = organizationResult.data as Row;
  const profile = profileResult.data as Row;
  const vendorById = new Map(rows(vendorsResult.data).map((vendor) => [stringValue(vendor.id), vendor]));
  const relationshipById = new Map(rows(relationshipsResult.data).map((relationship) => [stringValue(relationship.id), relationship]));
  const vendorContacts = rows(vendorContactsResult.data).map((contact): PortalVendorContact => ({
    id: stringValue(contact.id),
    relationshipId: stringValue(contact.organization_vendor_id),
    contactType: stringValue(contact.contact_type, "other") as PortalVendorContact["contactType"],
    companyName: nullableString(contact.company_name),
    contactName: stringValue(contact.contact_name),
    title: nullableString(contact.title),
    email: nullableString(contact.email),
    phone: nullableString(contact.phone),
    phoneExtension: nullableString(contact.phone_extension),
    websiteUrl: nullableString(contact.website_url),
    preferredChannel: stringValue(contact.preferred_channel, "email") as PortalVendorContact["preferredChannel"],
    isPrimary: Boolean(contact.is_primary),
    status: stringValue(contact.status, "active") as PortalVendorContact["status"],
    notes: nullableString(contact.notes),
    lastVerifiedAt: nullableString(contact.last_verified_at),
    createdAt: stringValue(contact.created_at),
    updatedAt: stringValue(contact.updated_at),
  }));
  const accountById = new Map(rows(accountsResult.data).map((account) => [stringValue(account.id), account]));
  const extractionByDocument = new Map<string, Row>();
  for (const extraction of rows(extractionsResult.data)) {
    const documentId = stringValue(extraction.document_id);
    if (!extractionByDocument.has(documentId)) extractionByDocument.set(documentId, extraction);
  }
  const evidenceCount = new Map<string, number>();
  const opportunityByEvidence = new Map<string, string>();
  for (const evidence of rows(opportunityEvidenceResult.data)) {
    const id = stringValue(evidence.opportunity_id);
    evidenceCount.set(id, (evidenceCount.get(id) ?? 0) + 1);
    opportunityByEvidence.set(stringValue(evidence.evidence_reference_id), id);
  }
  const invoiceLineItemCount = new Map<string, number>();
  for (const line of rows(invoiceLineItemsResult.data)) {
    const invoiceId = stringValue(line.invoice_id);
    invoiceLineItemCount.set(invoiceId, (invoiceLineItemCount.get(invoiceId) ?? 0) + 1);
  }
  const visibleOpportunityRows = rows(opportunitiesResult.data).filter((opportunity) => opportunity.customer_visible !== false);
  const opportunityById = new Map(visibleOpportunityRows.map((opportunity) => [stringValue(opportunity.id), opportunity]));
  const approvalsByResource = new Map<string, Row[]>();
  for (const approval of rows(approvalsResult.data)) {
    const resourceId = stringValue(approval.resource_id);
    approvalsByResource.set(resourceId, [...(approvalsByResource.get(resourceId) ?? []), approval]);
  }
  const policyById = new Map(rows(approvalPoliciesResult.data).map((policy) => [stringValue(policy.id), policy]));
  const locationById = new Map(rows(locationsResult.data).map((location) => [stringValue(location.id), location]));
  const energyMeters = rows(energyMetersResult.data).map((meter) => ({
    id: stringValue(meter.id),
    locationId: stringValue(meter.location_id),
    meterIdentifier: maskIdentifier(meter.meter_identifier),
    serviceIdentifier: maskIdentifier(meter.service_identifier),
    accountNumberLast4: nullableString(meter.account_number_last4),
    utilityTerritory: nullableString(meter.utility_territory),
    status: stringValue(meter.status, "active"),
    displayName: nullableString(meter.display_name),
    lastSeenAt: nullableString(meter.last_seen_at),
  }));
  const meterCountByLocation = new Map<string, number>();
  for (const meter of energyMeters) {
    meterCountByLocation.set(meter.locationId, (meterCountByLocation.get(meter.locationId) ?? 0) + 1);
  }
  const expenseById = new Map(rows(expensesResult.data).map((expense) => [stringValue(expense.id), expense]));
  const invoiceById = new Map(rows(invoicesResult.data).map((invoice) => [stringValue(invoice.id), invoice]));
  const profileById = new Map(rows(profilesResult.data).map((entry) => [stringValue(entry.id), entry]));

  const resolveVendor = (organizationVendorId: string | null) => {
    const relationship = organizationVendorId ? relationshipById.get(organizationVendorId) : undefined;
    const vendor = relationship ? vendorById.get(stringValue(relationship.vendor_id)) : undefined;
    return { relationship, vendor };
  };
  const vendorForAccount = (expenseAccountId: unknown) => {
    const account = accountById.get(stringValue(expenseAccountId));
    return resolveVendor(account ? stringValue(account.organization_vendor_id) : null).vendor;
  };

  return {
    organization: {
      id: stringValue(organization.id), name: stringValue(organization.name), legalName: nullableString(organization.legal_name),
      industry: nullableString(organization.industry), timezone: stringValue(organization.timezone, "America/Chicago"),
      currency: stringValue(organization.currency, "USD"), primaryContactName: nullableString(organization.primary_contact_name),
      reviewThreshold: numberValue(organization.review_threshold), settings: (organization.settings as Record<string, boolean>) ?? {}, logoUrl: nullableString(organization.logo_url), isSampleWorkspace: Boolean(organization.is_sample_workspace),
    },
    currentUser: {
      id: userId, email: stringValue(profile.email), fullName: stringValue(profile.full_name, stringValue(profile.email)), role: stringValue(membership.role), avatarUrl: nullableString(profile.avatar_url),
    },
    locations: rows(locationsResult.data).map((location) => ({
      id: stringValue(location.id), name: stringValue(location.name), status: stringValue(location.status), address: (location.address as Record<string, string>) ?? null,
      meterCount: meterCountByLocation.get(stringValue(location.id)) ?? 0,
    })),
    energyMeters,
    expenseAccounts: rows(accountsResult.data).map((account) => {
      const relationshipId = nullableString(account.organization_vendor_id);
      const vendor = resolveVendor(relationshipId).vendor;
      const location = account.location_id ? locationById.get(stringValue(account.location_id)) : undefined;
      return {
        id: stringValue(account.id),
        vendorId: vendor ? stringValue(vendor.id) : null,
        relationshipId,
        accountName: nullableString(account.account_name),
        externalAccountReference: nullableString(account.external_account_reference),
        accountNumberLast4: nullableString(account.account_number_last4),
        category: stringValue(account.category, "General"),
        status: stringValue(account.status, "active"),
        locationId: nullableString(account.location_id),
        locationName: location ? stringValue(location.name) : null,
        serviceStartDate: nullableString(account.service_start_date),
        serviceEndDate: nullableString(account.service_end_date),
        createdAt: stringValue(account.created_at),
        updatedAt: stringValue(account.updated_at),
      };
    }),
    vendors: rows(relationshipsResult.data).map((relationship) => {
      const vendor = vendorById.get(stringValue(relationship.vendor_id));
      const displayNameOverride = nullableString(relationship.display_name_override);
      const categoryOverride = nullableString(relationship.category_override);
      const websiteOverride = nullableString(relationship.website_override);
      return {
        id: stringValue(vendor?.id),
        relationshipId: stringValue(relationship.id),
        name: displayNameOverride || stringValue(vendor?.canonical_name),
        category: categoryOverride || stringValue(vendor?.category, "Other"),
        website: websiteOverride ?? nullableString(vendor?.website),
        canonicalName: stringValue(vendor?.canonical_name),
        canonicalCategory: stringValue(vendor?.category, "Other"),
        canonicalWebsite: nullableString(vendor?.website),
        annualizedSpend: numberValue(relationship.annualized_spend),
        annualizedSpendKnown: relationship.annualized_spend != null,
        annualizedSpendBasis: relationship.annualized_spend_basis as import("./types").PortalVendor["annualizedSpendBasis"] ?? null,
        relationshipStatus: stringValue(relationship.relationship_status),
        spendCadence: stringValue(relationship.spend_cadence, "monthly"),
        createdAt: stringValue(relationship.created_at),
        updatedAt: stringValue(relationship.updated_at),
        logoUrl: nullableString(vendor?.logo_url),
        displayNameOverride,
        categoryOverride,
        websiteOverride,
        endedAt: nullableString(relationship.ended_at),
        endedBy: nullableString(relationship.ended_by),
      };
    }),
    vendorContacts,
    vendorCatalog: rows(vendorsResult.data).map((vendor) => ({
      id: stringValue(vendor.id),
      name: stringValue(vendor.canonical_name),
      category: stringValue(vendor.category, "Other"),
      website: nullableString(vendor.website),
      aliases: Array.isArray(vendor.search_aliases) ? vendor.search_aliases.filter((value): value is string => typeof value === "string") : [],
      logoUrl: nullableString(vendor.logo_url),
    })),
    expenses: rows(expensesResult.data).map((expense) => {
      const { vendor } = resolveVendor(stringValue(expense.organization_vendor_id));
      const location = locationById.get(stringValue(expense.location_id));
      return { id: stringValue(expense.id), vendorId: stringValue(vendor?.id), vendorName: stringValue(vendor?.canonical_name, "Unknown vendor"), category: stringValue(expense.category), periodStart: stringValue(expense.period_start), periodEnd: stringValue(expense.period_end), amount: numberValue(expense.amount), priorPeriodAmount: expense.prior_period_amount == null ? null : numberValue(expense.prior_period_amount), status: stringValue(expense.status), documentId: nullableString(expense.document_id), invoiceId: nullableString(expense.invoice_id), expenseAccountId: nullableString(expense.expense_account_id), locationId: nullableString(expense.location_id), locationName: location ? stringValue(location.name) : null, updatedAt: stringValue(expense.updated_at) };
    }),
    contracts: rows(contractsResult.data).map((contract) => {
      const { vendor } = resolveVendor(stringValue(contract.organization_vendor_id));
      const location = locationById.get(stringValue(contract.location_id));
      return { id: stringValue(contract.id), vendorId: stringValue(vendor?.id), vendorName: stringValue(vendor?.canonical_name, "Unknown vendor"), title: stringValue(contract.title), category: stringValue(contract.category), startDate: nullableString(contract.start_date), endDate: nullableString(contract.end_date), noticePeriodDays: contract.notice_period_days == null ? null : numberValue(contract.notice_period_days), annualValue: contract.annual_value == null ? null : numberValue(contract.annual_value), status: stringValue(contract.status), autoRenews: Boolean(contract.auto_renews), ownerName: nullableString(contract.owner_name), documentId: nullableString(contract.document_id), expenseAccountId: nullableString(contract.expense_account_id), locationId: nullableString(contract.location_id), locationName: location ? stringValue(location.name) : null, ...contractSourceFacts(contract), updatedAt: stringValue(contract.updated_at) };
    }),
    documents: rows(documentsResult.data).map((document) => {
      const { vendor } = resolveVendor(nullableString(document.organization_vendor_id));
      const extraction = extractionByDocument.get(stringValue(document.id));
      const documentStatus = stringValue(document.status, "unknown");
      const securityStatus = stringValue(document.security_scan_status, "not_recorded");
      const extractionStatus = stringValue(extraction?.status) || (
        documentStatus === "ready" ? "completed" :
        documentStatus === "processing" ? "processing" :
        documentStatus === "needs_review" ? "needs_review" :
        documentStatus === "failed" ? "failed" :
        "not_recorded"
      );
      return { id: stringValue(document.id), vendorId: vendor ? stringValue(vendor.id) : null, vendorName: stringValue(vendor?.canonical_name, "Unassigned"), originalFilename: stringValue(document.original_filename), mimeType: stringValue(document.mime_type), byteSize: numberValue(document.byte_size), status: documentStatus, securityStatus, extractionStatus, documentType: nullableString(document.document_type), summary: nullableString(document.extraction_summary), confidence: extraction?.confidence == null ? null : numberValue(extraction.confidence), createdAt: stringValue(document.created_at), pageCount: document.page_count == null ? null : numberValue(document.page_count), sha256: stringValue(document.sha256), evidenceCount: evidenceCountByDocument.get(stringValue(document.id)) ?? 0, updatedAt: stringValue(document.updated_at), sourcePurgedAt: nullableString(document.source_purged_at) };
    }),
    invoices: rows(invoicesResult.data).map((invoice) => {
      const { vendor } = resolveVendor(nullableString(invoice.organization_vendor_id));
      const id = stringValue(invoice.id);
      const service = invoice.energy_service && typeof invoice.energy_service === "object" && !Array.isArray(invoice.energy_service)
        ? invoice.energy_service as Record<string, unknown>
        : null;
      const location = locationById.get(stringValue(invoice.location_id));
      return { id, documentId: stringValue(invoice.document_id), vendorId: vendor ? stringValue(vendor.id) : null, vendorName: stringValue(vendor?.canonical_name, "Unassigned"), invoiceNumber: nullableString(invoice.invoice_number), invoiceDate: nullableString(invoice.invoice_date), dueDate: nullableString(invoice.due_date), servicePeriodStart: nullableString(invoice.service_period_start), servicePeriodEnd: nullableString(invoice.service_period_end), accountNumberLast4: nullableString(invoice.account_number_last4), purchaseOrderNumber: nullableString(invoice.purchase_order_number), currency: nullableString(invoice.currency), subtotal: invoice.subtotal == null ? null : numberValue(invoice.subtotal), taxTotal: invoice.tax_total == null ? null : numberValue(invoice.tax_total), feeTotal: invoice.fee_total == null ? null : numberValue(invoice.fee_total), creditTotal: invoice.credit_total == null ? null : numberValue(invoice.credit_total), previousBalance: invoice.previous_balance == null ? null : numberValue(invoice.previous_balance), paymentsAndCredits: invoice.payments_and_credits == null ? null : numberValue(invoice.payments_and_credits), balanceForward: invoice.balance_forward == null ? null : numberValue(invoice.balance_forward), currentCharges: invoice.current_charges == null ? null : numberValue(invoice.current_charges), currentPeriodCredits: invoice.current_period_credits == null ? null : numberValue(invoice.current_period_credits), totalAmount: invoice.total_amount == null ? null : numberValue(invoice.total_amount), amountDue: invoice.amount_due == null ? null : numberValue(invoice.amount_due), extractionConfidence: invoice.extraction_confidence == null ? null : numberValue(invoice.extraction_confidence), reviewStatus: stringValue(invoice.review_status), vendorMatchStatus: stringValue(invoice.vendor_match_status), workspaceCustomerMatchStatus: stringValue(invoice.workspace_customer_match_status, "unknown"), expenseAccountMatchStatus: stringValue(invoice.expense_account_match_status, "unknown"), serviceLocationMatchStatus: stringValue(invoice.service_location_match_status, "unknown"), reconciliationStatus: stringValue(invoice.reconciliation_status), reconciliationDifference: invoice.reconciliation_difference == null ? null : numberValue(invoice.reconciliation_difference), reviewPriority: stringValue(invoice.review_priority, "normal"), reviewNotes: nullableString(invoice.review_notes), expenseCategory: nullableString(invoice.expense_category), expenseAccountId: nullableString(invoice.expense_account_id), locationId: nullableString(invoice.location_id), locationName: location ? stringValue(location.name) : null, energyService: service ? { customerName: nullableString(service.customerName), serviceAddress: nullableString(service.serviceAddress), serviceIdentifier: maskIdentifier(service.serviceIdentifier), meterId: maskIdentifier(service.meterId), productName: nullableString(service.productName), utilityTerritory: nullableString(service.utilityTerritory), billingDays: service.billingDays == null ? null : numberValue(service.billingDays), usageKwh: service.usageKwh == null ? null : numberValue(service.usageKwh), actualDemandKw: service.actualDemandKw == null ? null : numberValue(service.actualDemandKw), billedDemandKw: service.billedDemandKw == null ? null : numberValue(service.billedDemandKw), meterMultiplier: service.meterMultiplier == null ? null : numberValue(service.meterMultiplier), averagePricePerKwh: service.averagePricePerKwh == null ? null : numberValue(service.averagePricePerKwh), readDateStart: nullableString(service.readDateStart), readDateEnd: nullableString(service.readDateEnd) } : null, lineItemCount: invoiceLineItemCount.get(id) ?? 0, updatedAt: stringValue(invoice.updated_at) };
    }),
    invoiceLineItems: rows(invoiceLineItemsResult.data).map((line) => ({
      id: stringValue(line.id),
      invoiceId: stringValue(line.invoice_id),
      lineNumber: numberValue(line.line_number),
      description: stringValue(line.description),
      quantity: line.quantity == null ? null : numberValue(line.quantity),
      unitPrice: line.unit_price == null ? null : numberValue(line.unit_price),
      amount: numberValue(line.amount),
      category: nullableString(line.category),
      servicePeriodStart: nullableString(line.service_period_start),
      servicePeriodEnd: nullableString(line.service_period_end),
    })),
    opportunities: visibleOpportunityRows.map((opportunity) => {
      const sourceExpenseId = nullableString(opportunity.source_expense_id);
      const sourceExpense = sourceExpenseId ? expenseById.get(sourceExpenseId) : undefined;
      const expenseAccountId = nullableString(opportunity.expense_account_id) ?? nullableString(sourceExpense?.expense_account_id);
      const account = expenseAccountId ? accountById.get(expenseAccountId) : undefined;
      const vendor = vendorForAccount(expenseAccountId);
      const locationId = nullableString(sourceExpense?.location_id);
      const location = locationId ? locationById.get(locationId) : undefined;
      const sourceDocumentId = nullableString(opportunity.source_document_id) ?? nullableString(sourceExpense?.document_id);
      const sourceInvoice = sourceExpense?.invoice_id ? invoiceById.get(stringValue(sourceExpense.invoice_id)) : undefined;
      const evidenceTotal = evidenceCount.get(stringValue(opportunity.id)) ?? 0;
      const calculationInputs = (opportunity.calculation_inputs as Record<string, unknown>) ?? {};
      const calculationResult = (opportunity.calculation_result as Record<string, string>) ?? {};
      const generatedBy = stringValue(opportunity.generated_by, "manual");
      const explicitTrustState = isOpportunityTrustState(opportunity.trust_state) ? opportunity.trust_state : null;
      const trustState = deriveOpportunityTrustState({
        generatedBy,
        explicitTrustState,
        sourceRecordId: sourceExpenseId ?? sourceDocumentId,
        evidenceCount: evidenceTotal,
        ruleKey: nullableString(opportunity.rule_key),
        ruleVersion: nullableString(opportunity.rule_version),
        calculationInputs,
        calculationResult,
      });
      const monetaryClaimAllowed = canShowCustomerMonetaryClaim({
        trustState,
        estimatedAnnualValue: opportunity.estimated_annual_value == null ? null : numberValue(opportunity.estimated_annual_value),
        evidenceCount: evidenceTotal,
        ruleVersion: nullableString(opportunity.rule_version),
        calculationInputs,
        calculationResult,
      });
      return {
        id: stringValue(opportunity.id), title: stringValue(opportunity.title), summary: stringValue(opportunity.summary), type: stringValue(opportunity.type), category: nullableString(opportunity.category), status: stringValue(opportunity.status), priority: stringValue(opportunity.priority, "medium") as "high" | "medium" | "low", confidence: opportunity.confidence == null ? null : numberValue(opportunity.confidence), estimatedAnnualValue: monetaryClaimAllowed && opportunity.estimated_annual_value != null ? numberValue(opportunity.estimated_annual_value) : null, deadlineAt: nullableString(opportunity.deadline_at), vendorName: stringValue(vendor?.canonical_name, "Unknown vendor"), vendorId: vendor ? stringValue(vendor.id) : null, evidenceCount: evidenceTotal, ruleVersion: nullableString(opportunity.rule_version), calculationInputs, calculationResult, assumptions: Array.isArray(opportunity.assumptions) ? opportunity.assumptions.filter((item): item is string => typeof item === "string") : [], trustState, generatedBy, customerVisible: opportunity.customer_visible !== false, monetaryClaimAllowed, sourceDocumentId, sourceExpenseId, baselineExpenseId: nullableString(opportunity.baseline_expense_id), expenseAccountId, expenseAccountReference: nullableString(account?.external_account_reference), locationId, locationName: location ? stringValue(location.name) : null, accountNumberLast4: nullableString(sourceInvoice?.account_number_last4), lastEvaluatedAt: nullableString(opportunity.last_evaluated_at), updatedAt: stringValue(opportunity.updated_at),
      };
    }),
    actions: rows(actionsResult.data).flatMap((action) => {
      const opportunity = opportunityById.get(stringValue(action.opportunity_id));
      if (!opportunity || stringValue(opportunity.organization_id) !== organizationId) return [];
      const vendor = vendorForAccount(opportunity.expense_account_id);
      const actionApprovals = approvalsByResource.get(stringValue(action.id)) ?? [];
      const currentApproval = actionApprovals.find((approval) => stringValue(approval.requested_from) === userId);
      const policy = policyById.get(stringValue(action.required_approval_policy_id));
      const rule = (policy?.rule as Record<string, unknown>) ?? {};
      const requiredApprovals = Math.max(1, Math.min(5, numberValue(rule.minimum_approvers) || 1));
      return [{ id: stringValue(action.id), opportunityId: stringValue(action.opportunity_id), title: stringValue(action.title), description: stringValue(action.description), actionType: stringValue(action.action_type), priority: stringValue(action.priority), status: stringValue(action.status), dueAt: nullableString(action.due_at), vendorName: stringValue(vendor?.canonical_name, "Unknown vendor"), vendorId: vendor ? stringValue(vendor.id) : null, approvalId: currentApproval ? stringValue(currentApproval.id) : null, approvalDecision: currentApproval ? stringValue(currentApproval.decision) : null, approvalPolicyId: policy ? stringValue(policy.id) : null, approvalPolicyName: policy ? stringValue(policy.name) : null, requiredApprovals, approvedCount: actionApprovals.filter((approval) => stringValue(approval.decision) === "approved").length, currentUserDecision: currentApproval ? stringValue(currentApproval.decision) : null, updatedAt: stringValue(action.updated_at) }];
    }),
    approvalPolicies: rows(approvalPoliciesResult.data).map((policy) => {
      const rule = (policy.rule as Record<string, unknown>) ?? {};
      return { id: stringValue(policy.id), name: stringValue(policy.name), isActive: Boolean(policy.is_active), actionType: stringValue(rule.action_type, "all"), minimumApprovers: Math.max(1, Math.min(5, numberValue(rule.minimum_approvers) || 1)), annualValueThreshold: rule.annual_value_gte == null ? null : numberValue(rule.annual_value_gte), category: nullableString(rule.category), explicitConsent: Boolean(rule.explicit_consent), updatedAt: stringValue(policy.updated_at) };
    }),
    savings: rows(savingsResult.data).map((outcome) => ({ id: stringValue(outcome.id), title: stringValue(outcome.title), valueType: stringValue(outcome.value_type), amount: numberValue(outcome.amount), method: stringValue(outcome.method), status: stringValue(outcome.status), verifiedAt: nullableString(outcome.verified_at), baselineAmount: outcome.baseline_amount == null ? null : numberValue(outcome.baseline_amount), comparisonAmount: outcome.comparison_amount == null ? null : numberValue(outcome.comparison_amount), baselineAcceptedAt: nullableString(outcome.baseline_accepted_at), baselineExpenseId: nullableString(outcome.baseline_expense_id), comparisonExpenseId: nullableString(outcome.comparison_expense_id), methodVersion: nullableString(outcome.method_version), calculationResult: (outcome.calculation_result as Record<string, string>) ?? {}, opportunityId: nullableString(outcome.opportunity_id), assumptions: Array.isArray(outcome.assumptions) ? outcome.assumptions.filter((item): item is string => typeof item === "string") : [], exclusions: Array.isArray(outcome.exclusions) ? outcome.exclusions.filter((item): item is string => typeof item === "string") : [] })),
    integrations: rows(integrationsResult.data).map((integration) => ({ id: stringValue(integration.id), provider: stringValue(integration.provider), displayName: stringValue(integration.display_name), description: stringValue(integration.description), status: stringValue(integration.status), lastSyncedAt: nullableString(integration.last_synced_at) })),
    emailIntake: emailIntakeResult.data ? {
      id: stringValue(emailIntakeResult.data.id),
      address: `${stringValue(emailIntakeResult.data.local_part)}@${stringValue(emailIntakeResult.data.domain)}`,
      status: stringValue(emailIntakeResult.data.status),
      trustedSenders: Array.isArray(emailIntakeResult.data.trusted_senders) ? emailIntakeResult.data.trusted_senders.filter((value): value is string => typeof value === "string") : [],
      platformReady: isInboundEmailPlatformReady(),
    } : null,
    inboundEmailEvents: rows(inboundEmailEventsResult.data).map((event) => ({ id: stringValue(event.id), senderAddress: stringValue(event.sender_address), subject: stringValue(event.subject), status: stringValue(event.status), attachmentCount: numberValue(event.attachment_count), processedAttachmentCount: numberValue(event.processed_attachment_count), errorMessage: nullableString(event.error_message), receivedAt: stringValue(event.received_at) })),
    reports: rows(reportsResult.data).map((report) => ({ id: stringValue(report.id), name: stringValue(report.name), description: stringValue(report.description), reportType: stringValue(report.report_type), status: stringValue(report.status), lastGeneratedAt: nullableString(report.last_generated_at) })),
    team: rows(membershipsResult.data).map((member) => { const person = profileById.get(stringValue(member.user_id)); return { id: stringValue(member.user_id), fullName: stringValue(person?.full_name, stringValue(person?.email)), email: stringValue(person?.email), role: stringValue(member.role), permissions: Array.isArray(member.permissions) ? member.permissions.filter((item): item is string => typeof item === "string") : [] }; }),
    notifications: rows(notificationsResult.data).map((notification) => ({ id: stringValue(notification.id), title: stringValue(notification.title), body: stringValue(notification.body), resourceType: nullableString(notification.resource_type), resourceId: nullableString(notification.resource_id), readAt: nullableString(notification.read_at), createdAt: stringValue(notification.created_at) })),
    auditEvents: rows(auditEventsResult.data).map((event) => ({ id: stringValue(event.id), action: stringValue(event.action), resourceType: stringValue(event.resource_type), resourceId: nullableString(event.resource_id), actorType: stringValue(event.actor_type), actorName: event.actor_id ? stringValue(profileById.get(stringValue(event.actor_id))?.full_name, "Workspace member") : stringValue(event.actor_type, "System"), createdAt: stringValue(event.created_at) })),
    evidenceReferences: rows(evidenceReferencesResult.data).map((evidence) => ({ id: stringValue(evidence.id), documentId: stringValue(evidence.document_id), opportunityId: opportunityByEvidence.get(stringValue(evidence.id)) ?? null, pageNumber: numberValue(evidence.page_number), fieldPath: nullableString(evidence.field_path), textExcerpt: stringValue(evidence.text_excerpt), sourceKey: nullableString(evidence.source_key) })),
  };
}

export async function requirePortalContext() {
  const userId = await requireUserId();
  const db = createServerSupabaseClient();
  const { data: membership, error } = await db.from("organization_memberships").select("organization_id,role").eq("user_id", userId).limit(1).single();
  if (error || !membership) throw new Error("NO_ORGANIZATION_MEMBERSHIP");
  return { db, userId, organizationId: membership.organization_id as string, role: membership.role as string };
}

export async function requirePortalEditor() {
  const context = await requirePortalContext();
  if (!portalRoleCanWrite(context.role)) throw new Error("PORTAL_READ_ONLY");
  return context;
}
