import "server-only";

import { requireInternalOperator } from "@/lib/manage/auth";
import type {
  ManageContact,
  ManageData,
  ManageExpense,
  ManageMailbox,
  ManageMailMessage,
  ManageMailThread,
  ManageStaffMember,
  ManageVendorContract,
  ManageVendorRelationship,
} from "@/lib/manage/types";
import { canUseMailbox, formatMailboxSender } from "@/lib/manage/mailboxes";
import { hiddenOrganizationIds } from "@/lib/manage/visibility";
import { recordedSpendTotal } from "@/lib/manage/vendor-costs";
import { isConfiguredSecret } from "@/lib/env/secrets";

type Row = Record<string, unknown>;
const rows = (value: unknown): Row[] =>
  Array.isArray(value) ? (value as Row[]) : [];
const text = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;
const nullable = (value: unknown) =>
  typeof value === "string" && value ? value : null;
const nullableNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const numericValue = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^-?\d+(?:\.\d+)?$/.test(value.trim())) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};
const countBy = (items: Row[], key: string) => {
  const counts = new Map<string, number>();
  for (const item of items) {
    const id = text(item[key]);
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
};

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export async function getManageData(input?: {
  folder?: string;
  threadId?: string | null;
  mailboxId?: string | null;
  accountId?: string | null;
}): Promise<ManageData> {
  const operator = await requireInternalOperator();
  const { db } = operator;
  const scopedAccountId =
    typeof input?.accountId === "string" &&
    /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(input.accountId)
      ? input.accountId
      : null;
  const [
    organizationsResult,
    overlaysResult,
    membershipsResult,
    profilesResult,
    staffResult,
    crmContactsResult,
    marketingConsentsResult,
    tasksResult,
    activitiesResult,
    mailboxesResult,
    documentsResult,
    extractionVersionsResult,
    opportunitiesResult,
    vendorsResult,
    vendorRelationshipsResult,
    expensesResult,
    contractsResult,
    threadsResult,
    messagesResult,
  ] = await Promise.all([
    db
      .from("organizations")
      .select("id,name,legal_name,industry,currency,primary_contact_name,created_at,logo_url")
      .order("created_at", { ascending: false }),
    db
      .from("crm_account_profiles")
      .select("*")
      .order("updated_at", { ascending: false }),
    db.from("organization_memberships").select("organization_id,user_id,role"),
    db.from("profiles").select("id,email,full_name,avatar_path,job_title,phone,linkedin_url"),
    db.from("internal_staff_users").select("user_id,role,status"),
    db
      .from("crm_contacts")
      .select("*")
      .order("created_at", { ascending: false }),
    db
      .from("crm_marketing_consents")
      .select("organization_id,contact_id,status,recorded_at")
      .order("recorded_at", { ascending: false }),
    db
      .from("crm_tasks")
      .select("*")
      .order("due_at", { ascending: true, nullsFirst: false }),
    db
      .from("crm_activities")
      .select("*")
      .order("occurred_at", { ascending: false })
      .limit(120),
    db
      .from("crm_mailboxes")
      .select("*")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true }),
    db
      .from("documents")
      .select("id,organization_id,organization_vendor_id,original_filename,mime_type,byte_size,status,document_type,extraction_summary,created_at,updated_at,page_count,source_purged_at")
      .order("created_at", { ascending: false }),
    db.from("document_extraction_versions")
      .select("document_id,confidence,status,input_mode,failure_code,created_at")
      .order("created_at", { ascending: false })
      .limit(2500),
    db.from("opportunities").select("id,organization_id"),
    scopedAccountId
      ? db.from("vendors").select("id,canonical_name,category,website,logo_url")
      : Promise.resolve({ data: [], error: null }),
    scopedAccountId
      ? db.from("organization_vendors").select("id,organization_id,vendor_id,relationship_status,annualized_spend,spend_cadence,updated_at").eq("organization_id", scopedAccountId)
      : Promise.resolve({ data: [], error: null }),
    scopedAccountId
      ? db.from("expenses").select("id,organization_id,organization_vendor_id,category,period_start,period_end,amount,currency,status").eq("organization_id", scopedAccountId).order("period_end", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    scopedAccountId
      ? db.from("contracts").select("id,organization_id,organization_vendor_id,title,category,end_date,annual_value,currency,status,auto_renews").eq("organization_id", scopedAccountId).order("end_date", { ascending: true, nullsFirst: false })
      : Promise.resolve({ data: [], error: null }),
    db
      .from("crm_email_threads")
      .select("*")
      .order("last_message_at", { ascending: false })
      .limit(250),
    db
      .from("crm_email_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(750),
  ]);
  const results = [
    organizationsResult,
    overlaysResult,
    membershipsResult,
    profilesResult,
    staffResult,
    crmContactsResult,
    marketingConsentsResult,
    tasksResult,
    activitiesResult,
    mailboxesResult,
    documentsResult,
    extractionVersionsResult,
    opportunitiesResult,
    vendorsResult,
    vendorRelationshipsResult,
    expensesResult,
    contractsResult,
    threadsResult,
    messagesResult,
  ];
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;

  // Enrichment is intentionally optional during the rollout: the internal CRM
  // remains usable until its reviewed migration has been applied.
  const accountEnrichmentsResult = await db
    .from("crm_account_enrichments")
    .select("organization_id,provider,name,short_description,industry,website,logo_url,linkedin_url,phone,location,employee_count,founded_year,technology_names,status,fetched_at,attempted_at");
  const enrichmentAvailable = !accountEnrichmentsResult.error;

  const overlayRows = rows(overlaysResult.data);
  const hiddenOrganizations = hiddenOrganizationIds(overlayRows);
  const isVisibleOrganization = (organizationId: string) =>
    Boolean(organizationId) && !hiddenOrganizations.has(organizationId);
  const organizations = rows(organizationsResult.data).filter((row) =>
    isVisibleOrganization(text(row.id)),
  );
  const overlays = new Map(
    overlayRows
      .filter((row) => isVisibleOrganization(text(row.organization_id)))
      .map((row) => [text(row.organization_id), row]),
  );
  const organizationsById = new Map(
    organizations.map((row) => [text(row.id), row]),
  );
  const accountEnrichmentsByOrganization = new Map(
    (enrichmentAvailable ? rows(accountEnrichmentsResult.data) : [])
      .filter((row) => isVisibleOrganization(text(row.organization_id)))
      .map((row) => [text(row.organization_id), row]),
  );
  const latestExtractionByDocument = new Map<string, Row>();
  for (const extraction of rows(extractionVersionsResult.data)) {
    const documentId = text(extraction.document_id);
    if (documentId && !latestExtractionByDocument.has(documentId))
      latestExtractionByDocument.set(documentId, extraction);
  }
  const documents = rows(documentsResult.data)
    .filter((document) => isVisibleOrganization(text(document.organization_id)))
    .map((document) => {
      const extraction = latestExtractionByDocument.get(text(document.id));
      const inputMode = nullable(extraction?.input_mode);
      return ({
      id: text(document.id),
      organizationId: text(document.organization_id),
      vendorRelationshipId: nullable(document.organization_vendor_id),
      organizationName: text(
        organizationsById.get(text(document.organization_id))?.name,
        "Unknown account",
      ),
      originalFilename: text(document.original_filename, "Untitled source file"),
      mimeType: text(document.mime_type, "application/octet-stream"),
      byteSize: nullableNumber(document.byte_size) ?? 0,
      status: text(document.status, "processing"),
      documentType: nullable(document.document_type),
      summary: nullable(document.extraction_summary),
      confidence: nullableNumber(extraction?.confidence),
      extractionStatus: nullable(extraction?.status),
      extractionInputMode: inputMode === "native_text" || inputMode === "pdf_ocr" ? (inputMode as "native_text" | "pdf_ocr") : null,
      extractionFailureCode: nullable(extraction?.failure_code),
      createdAt: text(document.created_at),
      updatedAt: text(document.updated_at),
      pageCount: nullableNumber(document.page_count),
      sourcePurgedAt: nullable(document.source_purged_at),
      });
    });
  const profilesById = new Map(
    rows(profilesResult.data).map((row) => [text(row.id), row]),
  );
  const vendorsById = new Map(
    rows(vendorsResult.data).map((vendor) => [text(vendor.id), vendor]),
  );
  const expenses: ManageExpense[] = rows(expensesResult.data)
    .filter((expense) => isVisibleOrganization(text(expense.organization_id)))
    .map((expense) => ({
      id: text(expense.id),
      organizationId: text(expense.organization_id),
      vendorRelationshipId: nullable(expense.organization_vendor_id),
      category: text(expense.category, "Other"),
      periodStart: text(expense.period_start),
      periodEnd: text(expense.period_end),
      amount: numericValue(expense.amount),
      currency: text(expense.currency, "USD"),
      status: text(expense.status, "recorded"),
    }));
  const vendorContracts: ManageVendorContract[] = rows(contractsResult.data)
    .filter((contract) => isVisibleOrganization(text(contract.organization_id)))
    .map((contract) => ({
      id: text(contract.id),
      organizationId: text(contract.organization_id),
      vendorRelationshipId: nullable(contract.organization_vendor_id),
      title: text(contract.title, "Untitled contract"),
      category: text(contract.category, "Other"),
      endDate: nullable(contract.end_date),
      annualValue: contract.annual_value == null ? null : numericValue(contract.annual_value),
      currency: text(contract.currency, "USD"),
      status: text(contract.status, "unknown"),
      autoRenews: Boolean(contract.auto_renews),
    }));
  const expensesByRelationship = new Map<string, ManageExpense[]>();
  for (const expense of expenses) {
    if (!expense.vendorRelationshipId) continue;
    const matching = expensesByRelationship.get(expense.vendorRelationshipId) ?? [];
    matching.push(expense);
    expensesByRelationship.set(expense.vendorRelationshipId, matching);
  }
  const contractsByRelationship = new Map<string, ManageVendorContract[]>();
  for (const contract of vendorContracts) {
    if (!contract.vendorRelationshipId) continue;
    const matching = contractsByRelationship.get(contract.vendorRelationshipId) ?? [];
    matching.push(contract);
    contractsByRelationship.set(contract.vendorRelationshipId, matching);
  }
  const vendorRelationships: ManageVendorRelationship[] = rows(vendorRelationshipsResult.data)
    .filter((relationship) => isVisibleOrganization(text(relationship.organization_id)))
    .map((relationship) => {
      const id = text(relationship.id);
      const vendor = vendorsById.get(text(relationship.vendor_id));
      const relationshipExpenses = expensesByRelationship.get(id) ?? [];
      const relationshipContracts = contractsByRelationship.get(id) ?? [];
      const accountCurrency = text(
        organizationsById.get(text(relationship.organization_id))?.currency,
        "USD",
      );
      const nextContractEnd = relationshipContracts
        .map((contract) => contract.endDate)
        .filter((endDate): endDate is string => Boolean(endDate))
        .sort()[0] ?? null;
      return {
        id,
        organizationId: text(relationship.organization_id),
        vendorId: text(relationship.vendor_id),
        name: text(vendor?.canonical_name, "Unknown vendor"),
        category: text(vendor?.category, "Other"),
        website: nullable(vendor?.website),
        logoUrl: nullable(vendor?.logo_url),
        relationshipStatus: text(relationship.relationship_status, "unknown"),
        spendCadence: text(relationship.spend_cadence, "not set"),
        annualizedSpend: relationship.annualized_spend == null ? null : numericValue(relationship.annualized_spend),
        recordedSpend: recordedSpendTotal(relationshipExpenses, accountCurrency),
        expenseCount: relationshipExpenses.length,
        contractCount: relationshipContracts.length,
        nextContractEnd,
        updatedAt: text(relationship.updated_at),
      };
    })
    .sort((a, b) => b.recordedSpend - a.recordedSpend || a.name.localeCompare(b.name));
  const staff: ManageStaffMember[] = rows(staffResult.data)
    .filter((staffMember) => text(staffMember.status) === "active")
    .map((staffMember) => {
      const id = text(staffMember.user_id);
      const profile = profilesById.get(id);
      return {
        id,
        email: text(profile?.email),
        fullName: text(profile?.full_name, text(profile?.email)),
        role: (staffMember.role === "owner" ? "owner" : "operator") as ManageStaffMember["role"],
      };
    })
    .filter((staffMember) => Boolean(staffMember.id && staffMember.email));
  const memberships = rows(membershipsResult.data).filter((row) =>
    isVisibleOrganization(text(row.organization_id)),
  );
  const memberCount = countBy(memberships, "organization_id");
  const documentCount = countBy(rows(documentsResult.data), "organization_id");
  const opportunityCount = countBy(
    rows(opportunitiesResult.data),
    "organization_id",
  );
  const visibleTasks = rows(tasksResult.data).filter((task) =>
    isVisibleOrganization(text(task.organization_id)),
  );
  const openTasks = visibleTasks.filter((task) =>
    ["open", "in_progress"].includes(text(task.status)),
  );
  const openTaskCount = countBy(openTasks, "organization_id");
  const latestConsentByContact = new Map<string, Row>();
  for (const consent of rows(marketingConsentsResult.data)) {
    const contactId = text(consent.contact_id);
    if (contactId && !latestConsentByContact.has(contactId))
      latestConsentByContact.set(contactId, consent);
  }
  const optedInByOrganization = new Map<
    string,
    { count: number; latestAt: string | null }
  >();
  for (const consent of latestConsentByContact.values()) {
    if (text(consent.status) !== "opted_in") continue;
    const organizationId = text(consent.organization_id);
    if (!isVisibleOrganization(organizationId)) continue;
    const current = optedInByOrganization.get(organizationId);
    const recordedAt = nullable(consent.recorded_at);
    optedInByOrganization.set(organizationId, {
      count: (current?.count ?? 0) + 1,
      latestAt:
        !current?.latestAt || (recordedAt && recordedAt > current.latestAt)
          ? recordedAt
          : current.latestAt,
    });
  }
  const mailboxes: ManageMailbox[] = rows(mailboxesResult.data).map(
    (mailbox) => {
      const assignedProfile = profilesById.get(text(mailbox.assigned_to));
      return {
        id: text(mailbox.id),
        displayName: text(mailbox.display_name),
        localPart: text(mailbox.local_part),
        domain: text(mailbox.domain),
        address: text(mailbox.address),
        mailboxType:
          mailbox.mailbox_type === "shared" ? "shared" : "personal",
        assignedTo: nullable(mailbox.assigned_to),
        assignedToName: assignedProfile
          ? text(assignedProfile.full_name, text(assignedProfile.email))
          : null,
        status: mailbox.status === "disabled" ? "disabled" : "active",
        canSend: Boolean(mailbox.can_send),
        canReceive: Boolean(mailbox.can_receive),
        isDefault: Boolean(mailbox.is_default),
        createdAt: text(mailbox.created_at),
      };
    },
  );
  const visibleMailboxes =
    operator.role === "owner"
      ? mailboxes
      : mailboxes.filter((mailbox) =>
          canUseMailbox(operator.role, operator.userId, mailbox),
        );
  const usableMailboxes = visibleMailboxes.filter((mailbox) =>
    canUseMailbox(operator.role, operator.userId, mailbox),
  );
  const selectedMailbox =
    usableMailboxes.find((mailbox) => mailbox.id === input?.mailboxId) ??
    usableMailboxes.find((mailbox) => mailbox.isDefault) ??
    usableMailboxes[0] ??
    null;

  const contacts: ManageContact[] = rows(crmContactsResult.data)
    .filter((contact) =>
      isVisibleOrganization(text(contact.organization_id)),
    )
    .map((contact) => ({
      ...(() => {
        const consent = latestConsentByContact.get(text(contact.id));
        const status = text(consent?.status);
        return {
          marketingStatus:
            status === "opted_in" || status === "opted_out" ? status : null,
          marketingConsentAt: nullable(consent?.recorded_at),
        };
      })(),
      id: text(contact.id),
      organizationId: text(contact.organization_id),
      organizationName: text(
        organizationsById.get(text(contact.organization_id))?.name,
        "Unknown account",
      ),
      fullName: text(contact.full_name),
      email: text(contact.email),
      title: nullable(contact.title),
      phone: nullable(contact.phone),
      isPrimary: Boolean(contact.is_primary),
      status: text(contact.status, "active"),
      source: "crm" as const,
    }));
  const explicitEmails = new Set(
    contacts.map(
      (contact) => `${contact.organizationId}:${contact.email.toLowerCase()}`,
    ),
  );
  for (const membership of memberships) {
    const profile = profilesById.get(text(membership.user_id));
    const organizationId = text(membership.organization_id);
    const email = text(profile?.email).toLowerCase();
    if (!email || explicitEmails.has(`${organizationId}:${email}`)) continue;
    contacts.push({
      id: `workspace:${organizationId}:${text(membership.user_id)}`,
      organizationId,
      organizationName: text(
        organizationsById.get(organizationId)?.name,
        "Unknown account",
      ),
      fullName: text(profile?.full_name, email),
      email,
      title: text(membership.role) || null,
      phone: null,
      isPrimary: text(membership.role) === "owner",
      status: "active",
      source: "workspace",
      marketingStatus: null,
      marketingConsentAt: null,
    });
  }

  const primaryContactByOrganization = new Map<string, ManageContact>();
  for (const contact of contacts) {
    const current = primaryContactByOrganization.get(contact.organizationId);
    if (!current || contact.isPrimary)
      primaryContactByOrganization.set(contact.organizationId, contact);
  }

  const accounts = organizations.map((organization) => {
    const id = text(organization.id);
    const overlay = overlays.get(id);
    const primary = primaryContactByOrganization.get(id);
    const marketing = optedInByOrganization.get(id);
    const enrichment = accountEnrichmentsByOrganization.get(id);
    return {
      id,
      name: text(organization.name),
      legalName: nullable(organization.legal_name),
      industry: nullable(organization.industry),
      currency: text(organization.currency, "USD"),
      website: nullable(overlay?.website),
      stage: nullable(overlay?.lifecycle_stage),
      primaryContact:
        primary?.fullName ?? nullable(organization.primary_contact_name),
      primaryEmail: primary?.email ?? null,
      memberCount: memberCount.get(id) ?? 0,
      documentCount: documentCount.get(id) ?? 0,
      opportunityCount: opportunityCount.get(id) ?? 0,
      openTaskCount: openTaskCount.get(id) ?? 0,
      marketingOptInCount: marketing?.count ?? 0,
      latestMarketingConsentAt: marketing?.latestAt ?? null,
      lastContactedAt: nullable(overlay?.last_contacted_at),
      nextFollowUpAt: nullable(overlay?.next_follow_up_at),
      nextStep: nullable(overlay?.next_step),
      privateNotes: nullable(overlay?.private_notes),
      createdAt: text(organization.created_at),
      logoUrl: nullable(organization.logo_url),
      enrichment: enrichment
        ? {
            provider: "apollo" as const,
            name: nullable(enrichment.name),
            shortDescription: nullable(enrichment.short_description),
            industry: nullable(enrichment.industry),
            website: nullable(enrichment.website),
            logoUrl: nullable(enrichment.logo_url),
            linkedinUrl: nullable(enrichment.linkedin_url),
            phone: nullable(enrichment.phone),
            location: nullable(enrichment.location),
            employeeCount: nullableNumber(enrichment.employee_count),
            foundedYear: nullableNumber(enrichment.founded_year),
            technologies: Array.isArray(enrichment.technology_names)
              ? enrichment.technology_names.filter((value): value is string => typeof value === "string")
              : [],
            status: text(enrichment.status, "stale"),
            fetchedAt: nullable(enrichment.fetched_at),
            attemptedAt: nullable(enrichment.attempted_at),
          }
        : null,
    };
  });

  const contactsById = new Map(
    contacts
      .filter((contact) => contact.source === "crm")
      .map((contact) => [contact.id, contact]),
  );
  const rawMessages = rows(messagesResult.data).filter((message) => {
    const organizationId = nullable(message.organization_id);
    return (
      (!organizationId || isVisibleOrganization(organizationId)) &&
      (!selectedMailbox || text(message.mailbox_id) === selectedMailbox.id)
    );
  });
  const latestMessageByThread = new Map<string, Row>();
  for (const message of rawMessages) {
    const threadId = text(message.thread_id);
    if (!latestMessageByThread.has(threadId))
      latestMessageByThread.set(threadId, message);
  }
  const allThreads: ManageMailThread[] = rows(threadsResult.data)
    .filter((thread) => {
      const organizationId = nullable(thread.organization_id);
      return (
        (!organizationId || isVisibleOrganization(organizationId)) &&
        Boolean(selectedMailbox) &&
        text(thread.mailbox_id) === selectedMailbox?.id
      );
    })
    .map((thread) => {
      const organizationId = nullable(thread.organization_id);
      const contact = contactsById.get(text(thread.contact_id));
      const latest = latestMessageByThread.get(text(thread.id));
      return {
        id: text(thread.id),
        organizationId,
        mailboxId: nullable(thread.mailbox_id),
        mailboxAddress: selectedMailbox?.address ?? null,
        organizationName: organizationId
          ? text(organizationsById.get(organizationId)?.name) || null
          : null,
        contactId: nullable(thread.contact_id),
        contactName: contact?.fullName ?? null,
        contactEmail: contact?.email ?? null,
        subject: text(thread.subject, "(no subject)"),
        participants: stringArray(thread.participants),
        snippet: nullable(thread.snippet),
        status: text(thread.status, "open"),
        isStarred: Boolean(thread.is_starred),
        unreadCount: Number(thread.unread_count ?? 0),
        lastMessageAt: text(thread.last_message_at),
        folder: text(latest?.folder, "inbox"),
        latestDirection:
          latest?.direction === "inbound" || latest?.direction === "outbound"
            ? latest.direction
            : null,
        latestStatus: nullable(latest?.provider_status),
      };
    });
  const folder = input?.folder ?? "inbox";
  const belongsToFolder = (thread: ManageMailThread, targetFolder: string) => {
    if (targetFolder === "starred")
      return thread.isStarred && thread.status !== "trashed";
    if (targetFolder === "archive") return thread.status === "archived";
    if (targetFolder === "trash") return thread.status === "trashed";
    if (thread.status !== "open") return false;
    if (targetFolder === "sent")
      return thread.folder === "sent" || thread.latestDirection === "outbound";
    if (targetFolder === "drafts") return thread.folder === "draft";
    if (targetFolder === "scheduled") return thread.folder === "scheduled";
    return thread.folder === "inbox" || thread.latestDirection === "inbound";
  };
  const threads = allThreads.filter((thread) => belongsToFolder(thread, folder));
  const folderCounts = Object.fromEntries(
    ["inbox", "starred", "sent", "drafts", "scheduled", "archive", "trash"].map(
      (targetFolder) => [targetFolder, allThreads.filter((thread) => belongsToFolder(thread, targetFolder)).length],
    ),
  );
  const selectedThread =
    (input?.threadId
      ? allThreads.find((thread) => thread.id === input.threadId)
      : threads[0]) ?? null;
  const messages: ManageMailMessage[] = selectedThread
    ? rawMessages
        .filter((message) => text(message.thread_id) === selectedThread.id)
        .reverse()
        .map((message) => ({
          id: text(message.id),
          threadId: text(message.thread_id),
          organizationId: nullable(message.organization_id),
          mailboxId: nullable(message.mailbox_id),
          direction: message.direction === "inbound" ? "inbound" : "outbound",
          folder: text(message.folder),
          fromAddress: text(message.from_address),
          toAddresses: stringArray(message.to_addresses),
          ccAddresses: stringArray(message.cc_addresses),
          subject: text(message.subject),
          textBody: nullable(message.text_body),
          htmlBody: nullable(message.html_body),
          providerStatus: text(message.provider_status),
          attachments: Array.isArray(message.attachments)
            ? message.attachments.filter(
                (
                  item,
                ): item is {
                  filename: string;
                  contentType?: string;
                  size?: number;
                  id?: string;
                  status?: "pending" | "clean" | "infected" | "unavailable" | "failed";
                  disposition?: "inline" | "attachment";
                } =>
                  Boolean(item) &&
                  typeof item === "object" &&
                  typeof (item as { filename?: unknown }).filename === "string",
              )
            : [],
          sentAt: nullable(message.sent_at),
          receivedAt: nullable(message.received_at),
          createdAt: text(message.created_at),
        }))
    : [];

  const operatorProfile = profilesById.get(operator.userId);
  const avatarPath = nullable(operatorProfile?.avatar_path);
  let avatarUrl: string | null = null;
  if (avatarPath) {
    const { data: signedAvatar } = await db.storage
      .from("costivra-avatars")
      .createSignedUrl(avatarPath, 60 * 60);
    avatarUrl = signedAvatar?.signedUrl ?? null;
  }

  return {
    operator: {
      id: operator.userId,
      email: operator.email,
      fullName: operator.fullName,
      role: operator.role,
      avatarUrl,
      jobTitle: nullable(operatorProfile?.job_title),
      phone: nullable(operatorProfile?.phone),
      linkedinUrl: nullable(operatorProfile?.linkedin_url),
      notificationSoundEnabled: operatorProfile?.notification_sound_enabled !== false,
    },
    staff,
    accounts,
    contacts: contacts.sort(
      (a, b) =>
        a.organizationName.localeCompare(b.organizationName) ||
        a.fullName.localeCompare(b.fullName),
    ),
    documents,
    vendorRelationships,
    expenses,
    vendorContracts,
    enrichmentAvailable,
    enrichmentConfigured: Boolean(isConfiguredSecret(process.env.APOLLO_API_KEY)),
    tasks: visibleTasks.map((task) => ({
      id: text(task.id),
      organizationId: text(task.organization_id),
      organizationName: text(
        organizationsById.get(text(task.organization_id))?.name,
        "Unknown account",
      ),
      contactId: nullable(task.contact_id),
      title: text(task.title),
      taskType: text(task.task_type),
      priority: text(task.priority),
      status: text(task.status),
      dueAt: nullable(task.due_at),
      notes: nullable(task.notes),
      createdAt: text(task.created_at),
    })),
    activities: rows(activitiesResult.data)
      .filter((activity) =>
        isVisibleOrganization(text(activity.organization_id)),
      )
      .map((activity) => ({
      id: text(activity.id),
      organizationId: text(activity.organization_id),
      organizationName: text(
        organizationsById.get(text(activity.organization_id))?.name,
        "Unknown account",
      ),
      kind: text(activity.kind),
      direction: nullable(activity.direction),
      subject: text(activity.subject),
      summary: nullable(activity.summary),
      occurredAt: text(activity.occurred_at),
      })),
    mail: {
      folder,
      threads,
      folderCounts,
      selectedThread,
      messages,
      unreadCount: allThreads.reduce(
        (sum, thread) => sum + thread.unreadCount,
        0,
      ),
      mailboxes: visibleMailboxes,
      selectedMailboxId: selectedMailbox?.id ?? null,
      fromAddress: selectedMailbox
        ? formatMailboxSender(
            selectedMailbox.displayName,
            selectedMailbox.address,
          )
        : "No active mailbox",
      inboxAddress: selectedMailbox?.address ?? "No active mailbox",
      inboundReady: Boolean(
        isConfiguredSecret(process.env.RESEND_API_KEY) &&
          isConfiguredSecret(process.env.RESEND_WEBHOOK_SECRET) &&
          selectedMailbox?.canReceive,
      ),
    },
  };
}
