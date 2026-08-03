import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSessionSupabaseClient } from "@/lib/supabase/session";
import { isInboundEmailPlatformReady } from "@/lib/email/resend";
import { portalRoleCanWrite } from "@/lib/portal/access";
import type { PortalData } from "@/lib/portal/types";

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
    organizationResult, profileResult, locationsResult, vendorsResult,
    relationshipsResult, accountsResult, expensesResult, contractsResult,
    documentsResult, extractionsResult, opportunitiesResult, opportunityEvidenceResult,
    actionsResult, approvalsResult, savingsResult, integrationsResult,
    reportsResult, membershipsResult, profilesResult, notificationsResult,
    emailIntakeResult, inboundEmailEventsResult, invoicesResult, invoiceLineItemsResult,
    auditEventsResult,
  ] = await Promise.all([
    db.from("organizations").select("*").eq("id", organizationId).single(),
    db.from("profiles").select("id,email,full_name").eq("id", userId).single(),
    db.from("locations").select("*").eq("organization_id", organizationId).order("name"),
    db.from("vendors").select("id,canonical_name,category,website,search_aliases,logo_url").order("canonical_name"),
    db.from("organization_vendors").select("*").eq("organization_id", organizationId),
    db.from("expense_accounts").select("*").eq("organization_id", organizationId),
    db.from("expenses").select("*").eq("organization_id", organizationId).order("period_end", { ascending: false }),
    db.from("contracts").select("*").eq("organization_id", organizationId).order("end_date"),
    db.from("documents").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    db.from("document_extraction_versions").select("document_id,confidence,status,completed_at").order("created_at", { ascending: false }),
    db.from("opportunities").select("*").eq("organization_id", organizationId).order("deadline_at"),
    db.from("opportunity_evidence").select("opportunity_id,evidence_reference_id"),
    db.from("action_plans").select("*").order("due_at"),
    db.from("approvals").select("*").eq("organization_id", organizationId),
    db.from("savings_outcomes").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    db.from("integrations").select("*").eq("organization_id", organizationId).order("display_name"),
    db.from("report_definitions").select("*").eq("organization_id", organizationId).order("name"),
    db.from("organization_memberships").select("*").eq("organization_id", organizationId),
    db.from("profiles").select("id,email,full_name"),
    db.from("notifications").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    db.from("inbound_email_addresses").select("id,local_part,domain,status,trusted_senders").eq("organization_id", organizationId).maybeSingle(),
    db.from("inbound_email_events").select("id,sender_address,subject,status,attachment_count,processed_attachment_count,error_message,received_at").eq("organization_id", organizationId).order("received_at", { ascending: false }).limit(12),
    db.from("invoices").select("*").eq("organization_id", organizationId).order("invoice_date", { ascending: false }),
    db.from("invoice_line_items").select("invoice_id").eq("organization_id", organizationId),
    db.from("audit_events").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(250),
  ]);

  const results = [organizationResult, profileResult, locationsResult, vendorsResult,
    relationshipsResult, accountsResult, expensesResult, contractsResult, documentsResult,
    extractionsResult, opportunitiesResult, opportunityEvidenceResult, actionsResult,
    approvalsResult, savingsResult, integrationsResult, reportsResult, membershipsResult,
    profilesResult, notificationsResult, emailIntakeResult, inboundEmailEventsResult,
    invoicesResult, invoiceLineItemsResult, auditEventsResult];
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;

  const documentIds = rows(documentsResult.data).map((item) => stringValue(item.id)).filter(Boolean);
  const evidenceReferencesResult = documentIds.length
    ? await db.from("evidence_references").select("*").in("document_id", documentIds)
    : { data: [], error: null };
  if (evidenceReferencesResult.error) throw evidenceReferencesResult.error;

  const organization = organizationResult.data as Row;
  const profile = profileResult.data as Row;
  const vendorById = new Map(rows(vendorsResult.data).map((vendor) => [stringValue(vendor.id), vendor]));
  const relationshipById = new Map(rows(relationshipsResult.data).map((relationship) => [stringValue(relationship.id), relationship]));
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
  const opportunityById = new Map(rows(opportunitiesResult.data).map((opportunity) => [stringValue(opportunity.id), opportunity]));
  const approvalByResource = new Map(rows(approvalsResult.data).map((approval) => [stringValue(approval.resource_id), approval]));
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
      reviewThreshold: numberValue(organization.review_threshold), settings: (organization.settings as Record<string, boolean>) ?? {}, logoUrl: nullableString(organization.logo_url),
    },
    currentUser: {
      id: userId, email: stringValue(profile.email), fullName: stringValue(profile.full_name, stringValue(profile.email)), role: stringValue(membership.role),
    },
    locations: rows(locationsResult.data).map((location) => ({
      id: stringValue(location.id), name: stringValue(location.name), status: stringValue(location.status), address: (location.address as Record<string, string>) ?? null,
    })),
    vendors: rows(relationshipsResult.data).map((relationship) => {
      const vendor = vendorById.get(stringValue(relationship.vendor_id));
      return { id: stringValue(vendor?.id), relationshipId: stringValue(relationship.id), name: stringValue(vendor?.canonical_name), category: stringValue(vendor?.category, "Other"), website: nullableString(vendor?.website), annualizedSpend: numberValue(relationship.annualized_spend), relationshipStatus: stringValue(relationship.relationship_status), spendCadence: stringValue(relationship.spend_cadence, "monthly"), updatedAt: stringValue(relationship.updated_at), logoUrl: nullableString(vendor?.logo_url) };
    }),
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
      return { id: stringValue(expense.id), vendorId: stringValue(vendor?.id), vendorName: stringValue(vendor?.canonical_name, "Unknown vendor"), category: stringValue(expense.category), periodStart: stringValue(expense.period_start), periodEnd: stringValue(expense.period_end), amount: numberValue(expense.amount), priorPeriodAmount: expense.prior_period_amount == null ? null : numberValue(expense.prior_period_amount), status: stringValue(expense.status), documentId: nullableString(expense.document_id), invoiceId: nullableString(expense.invoice_id), updatedAt: stringValue(expense.updated_at) };
    }),
    contracts: rows(contractsResult.data).map((contract) => {
      const { vendor } = resolveVendor(stringValue(contract.organization_vendor_id));
      return { id: stringValue(contract.id), vendorId: stringValue(vendor?.id), vendorName: stringValue(vendor?.canonical_name, "Unknown vendor"), title: stringValue(contract.title), category: stringValue(contract.category), startDate: nullableString(contract.start_date), endDate: nullableString(contract.end_date), noticePeriodDays: contract.notice_period_days == null ? null : numberValue(contract.notice_period_days), annualValue: contract.annual_value == null ? null : numberValue(contract.annual_value), status: stringValue(contract.status), autoRenews: Boolean(contract.auto_renews), ownerName: nullableString(contract.owner_name), documentId: nullableString(contract.document_id), updatedAt: stringValue(contract.updated_at) };
    }),
    documents: rows(documentsResult.data).map((document) => {
      const { vendor } = resolveVendor(nullableString(document.organization_vendor_id));
      const extraction = extractionByDocument.get(stringValue(document.id));
      return { id: stringValue(document.id), vendorId: vendor ? stringValue(vendor.id) : null, vendorName: stringValue(vendor?.canonical_name, "Unassigned"), originalFilename: stringValue(document.original_filename), mimeType: stringValue(document.mime_type), byteSize: numberValue(document.byte_size), status: stringValue(document.status), documentType: nullableString(document.document_type), summary: nullableString(document.extraction_summary), confidence: extraction?.confidence == null ? null : numberValue(extraction.confidence), createdAt: stringValue(document.created_at), pageCount: document.page_count == null ? null : numberValue(document.page_count), sha256: stringValue(document.sha256), updatedAt: stringValue(document.updated_at), sourcePurgedAt: nullableString(document.source_purged_at) };
    }),
    invoices: rows(invoicesResult.data).map((invoice) => {
      const { vendor } = resolveVendor(nullableString(invoice.organization_vendor_id));
      const id = stringValue(invoice.id);
      return { id, documentId: stringValue(invoice.document_id), vendorId: vendor ? stringValue(vendor.id) : null, vendorName: stringValue(vendor?.canonical_name, "Unassigned"), invoiceNumber: nullableString(invoice.invoice_number), invoiceDate: nullableString(invoice.invoice_date), dueDate: nullableString(invoice.due_date), servicePeriodStart: nullableString(invoice.service_period_start), servicePeriodEnd: nullableString(invoice.service_period_end), accountNumberLast4: nullableString(invoice.account_number_last4), purchaseOrderNumber: nullableString(invoice.purchase_order_number), currency: nullableString(invoice.currency), subtotal: invoice.subtotal == null ? null : numberValue(invoice.subtotal), taxTotal: invoice.tax_total == null ? null : numberValue(invoice.tax_total), feeTotal: invoice.fee_total == null ? null : numberValue(invoice.fee_total), creditTotal: invoice.credit_total == null ? null : numberValue(invoice.credit_total), totalAmount: invoice.total_amount == null ? null : numberValue(invoice.total_amount), amountDue: invoice.amount_due == null ? null : numberValue(invoice.amount_due), extractionConfidence: invoice.extraction_confidence == null ? null : numberValue(invoice.extraction_confidence), reviewStatus: stringValue(invoice.review_status), vendorMatchStatus: stringValue(invoice.vendor_match_status), reconciliationStatus: stringValue(invoice.reconciliation_status), reconciliationDifference: invoice.reconciliation_difference == null ? null : numberValue(invoice.reconciliation_difference), reviewPriority: stringValue(invoice.review_priority, "normal"), reviewNotes: nullableString(invoice.review_notes), expenseCategory: nullableString(invoice.expense_category), lineItemCount: invoiceLineItemCount.get(id) ?? 0, updatedAt: stringValue(invoice.updated_at) };
    }),
    opportunities: rows(opportunitiesResult.data).map((opportunity) => {
      const vendor = vendorForAccount(opportunity.expense_account_id);
      return { id: stringValue(opportunity.id), title: stringValue(opportunity.title), summary: stringValue(opportunity.summary), type: stringValue(opportunity.type), category: nullableString(opportunity.category), status: stringValue(opportunity.status), priority: stringValue(opportunity.priority, "medium") as "high" | "medium" | "low", confidence: opportunity.confidence == null ? null : numberValue(opportunity.confidence), estimatedAnnualValue: opportunity.estimated_annual_value == null ? null : numberValue(opportunity.estimated_annual_value), deadlineAt: nullableString(opportunity.deadline_at), vendorName: stringValue(vendor?.canonical_name, "Unknown vendor"), vendorId: vendor ? stringValue(vendor.id) : null, evidenceCount: evidenceCount.get(stringValue(opportunity.id)) ?? 0, ruleVersion: nullableString(opportunity.rule_version), calculationInputs: (opportunity.calculation_inputs as Record<string, unknown>) ?? {}, calculationResult: (opportunity.calculation_result as Record<string, string>) ?? {}, assumptions: Array.isArray(opportunity.assumptions) ? opportunity.assumptions.filter((item): item is string => typeof item === "string") : [], updatedAt: stringValue(opportunity.updated_at) };
    }),
    actions: rows(actionsResult.data).flatMap((action) => {
      const opportunity = opportunityById.get(stringValue(action.opportunity_id));
      if (!opportunity || stringValue(opportunity.organization_id) !== organizationId) return [];
      const vendor = vendorForAccount(opportunity.expense_account_id);
      const approval = approvalByResource.get(stringValue(action.id));
      return [{ id: stringValue(action.id), opportunityId: stringValue(action.opportunity_id), title: stringValue(action.title), description: stringValue(action.description), actionType: stringValue(action.action_type), priority: stringValue(action.priority), status: stringValue(action.status), dueAt: nullableString(action.due_at), vendorName: stringValue(vendor?.canonical_name, "Unknown vendor"), vendorId: vendor ? stringValue(vendor.id) : null, approvalId: approval ? stringValue(approval.id) : null, approvalDecision: approval ? stringValue(approval.decision) : null, updatedAt: stringValue(action.updated_at) }];
    }),
    savings: rows(savingsResult.data).map((outcome) => ({ id: stringValue(outcome.id), title: stringValue(outcome.title), valueType: stringValue(outcome.value_type), amount: numberValue(outcome.amount), method: stringValue(outcome.method), status: stringValue(outcome.status), verifiedAt: nullableString(outcome.verified_at), baselineAmount: outcome.baseline_amount == null ? null : numberValue(outcome.baseline_amount), comparisonAmount: outcome.comparison_amount == null ? null : numberValue(outcome.comparison_amount), baselineAcceptedAt: nullableString(outcome.baseline_accepted_at), methodVersion: nullableString(outcome.method_version), calculationResult: (outcome.calculation_result as Record<string, string>) ?? {}, opportunityId: nullableString(outcome.opportunity_id), assumptions: Array.isArray(outcome.assumptions) ? outcome.assumptions.filter((item): item is string => typeof item === "string") : [], exclusions: Array.isArray(outcome.exclusions) ? outcome.exclusions.filter((item): item is string => typeof item === "string") : [] })),
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
    evidenceReferences: rows(evidenceReferencesResult.data).map((evidence) => ({ id: stringValue(evidence.id), documentId: stringValue(evidence.document_id), opportunityId: opportunityByEvidence.get(stringValue(evidence.id)) ?? null, pageNumber: numberValue(evidence.page_number), fieldPath: nullableString(evidence.field_path), textExcerpt: stringValue(evidence.text_excerpt) })),
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
