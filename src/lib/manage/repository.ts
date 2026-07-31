import "server-only";

import { requireInternalOperator } from "@/lib/manage/auth";
import type {
  ManageContact,
  ManageData,
  ManageMailMessage,
  ManageMailThread,
} from "@/lib/manage/types";
import { hiddenOrganizationIds } from "@/lib/manage/visibility";

type Row = Record<string, unknown>;
const rows = (value: unknown): Row[] =>
  Array.isArray(value) ? (value as Row[]) : [];
const text = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;
const nullable = (value: unknown) =>
  typeof value === "string" && value ? value : null;
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
}): Promise<ManageData> {
  const operator = await requireInternalOperator();
  const { db } = operator;
  const [
    organizationsResult,
    overlaysResult,
    membershipsResult,
    profilesResult,
    crmContactsResult,
    tasksResult,
    activitiesResult,
    documentsResult,
    opportunitiesResult,
    threadsResult,
    messagesResult,
  ] = await Promise.all([
    db
      .from("organizations")
      .select("id,name,legal_name,industry,primary_contact_name,created_at")
      .order("created_at", { ascending: false }),
    db
      .from("crm_account_profiles")
      .select("*")
      .order("updated_at", { ascending: false }),
    db.from("organization_memberships").select("organization_id,user_id,role"),
    db.from("profiles").select("id,email,full_name"),
    db
      .from("crm_contacts")
      .select("*")
      .order("created_at", { ascending: false }),
    db
      .from("crm_tasks")
      .select("*")
      .order("due_at", { ascending: true, nullsFirst: false }),
    db
      .from("crm_activities")
      .select("*")
      .order("occurred_at", { ascending: false })
      .limit(120),
    db.from("documents").select("id,organization_id"),
    db.from("opportunities").select("id,organization_id"),
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
    crmContactsResult,
    tasksResult,
    activitiesResult,
    documentsResult,
    opportunitiesResult,
    threadsResult,
    messagesResult,
  ];
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;

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
  const profilesById = new Map(
    rows(profilesResult.data).map((row) => [text(row.id), row]),
  );
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

  const contacts: ManageContact[] = rows(crmContactsResult.data)
    .filter((contact) =>
      isVisibleOrganization(text(contact.organization_id)),
    )
    .map((contact) => ({
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
    return {
      id,
      name: text(organization.name),
      legalName: nullable(organization.legal_name),
      industry: nullable(organization.industry),
      stage: nullable(overlay?.lifecycle_stage),
      primaryContact:
        primary?.fullName ?? nullable(organization.primary_contact_name),
      primaryEmail: primary?.email ?? null,
      memberCount: memberCount.get(id) ?? 0,
      documentCount: documentCount.get(id) ?? 0,
      opportunityCount: opportunityCount.get(id) ?? 0,
      openTaskCount: openTaskCount.get(id) ?? 0,
      lastContactedAt: nullable(overlay?.last_contacted_at),
      nextFollowUpAt: nullable(overlay?.next_follow_up_at),
      nextStep: nullable(overlay?.next_step),
      privateNotes: nullable(overlay?.private_notes),
      createdAt: text(organization.created_at),
    };
  });

  const contactsById = new Map(
    contacts
      .filter((contact) => contact.source === "crm")
      .map((contact) => [contact.id, contact]),
  );
  const rawMessages = rows(messagesResult.data).filter((message) => {
    const organizationId = nullable(message.organization_id);
    return !organizationId || isVisibleOrganization(organizationId);
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
      return !organizationId || isVisibleOrganization(organizationId);
    })
    .map((thread) => {
      const organizationId = nullable(thread.organization_id);
      const contact = contactsById.get(text(thread.contact_id));
      const latest = latestMessageByThread.get(text(thread.id));
      return {
        id: text(thread.id),
        organizationId,
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
  const threads = allThreads.filter((thread) => {
    if (folder === "starred")
      return thread.isStarred && thread.status !== "trashed";
    if (folder === "archive") return thread.status === "archived";
    if (folder === "trash") return thread.status === "trashed";
    if (thread.status !== "open") return false;
    if (folder === "sent")
      return thread.folder === "sent" || thread.latestDirection === "outbound";
    if (folder === "drafts") return thread.folder === "draft";
    if (folder === "scheduled") return thread.folder === "scheduled";
    return thread.folder === "inbox" || thread.latestDirection === "inbound";
  });
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
          direction: message.direction === "inbound" ? "inbound" : "outbound",
          folder: text(message.folder),
          fromAddress: text(message.from_address),
          toAddresses: stringArray(message.to_addresses),
          ccAddresses: stringArray(message.cc_addresses),
          subject: text(message.subject),
          textBody: nullable(message.text_body),
          providerStatus: text(message.provider_status),
          attachments: Array.isArray(message.attachments)
            ? message.attachments.filter(
                (
                  item,
                ): item is {
                  filename: string;
                  contentType?: string;
                  size?: number;
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

  return {
    operator: {
      id: operator.userId,
      email: operator.email,
      fullName: operator.fullName,
      role: operator.role,
    },
    accounts,
    contacts: contacts.sort(
      (a, b) =>
        a.organizationName.localeCompare(b.organizationName) ||
        a.fullName.localeCompare(b.fullName),
    ),
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
      selectedThread,
      messages,
      unreadCount: allThreads.reduce(
        (sum, thread) => sum + thread.unreadCount,
        0,
      ),
      fromAddress:
        process.env.RESEND_FROM_EMAIL || "Costivra <hello@costivra.ai>",
      inboxAddress:
        process.env.RESEND_OWNER_INBOX || "mail@inbound.costivra.ai",
      inboundReady: Boolean(
        process.env.RESEND_API_KEY &&
          process.env.RESEND_WEBHOOK_SECRET &&
          process.env.RESEND_OWNER_INBOX,
      ),
    },
  };
}
