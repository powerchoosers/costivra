import type { ManageData } from "@/lib/manage/types";

export type ManageAssistantEmailEvent = {
  eventType: string;
  occurredAt: string;
};

export type ManageAssistantSuggestion = {
  id: string;
  kind: "account" | "contact" | "mail" | "task" | "activity";
  label: string;
  detail: string;
  prompt: string;
};

export type ManageAssistantSource = {
  id: string;
  label: string;
  detail: string;
  href: string;
  kind: ManageAssistantSuggestion["kind"];
};

const openTaskStatuses = new Set(["open", "in_progress"]);
const counted = (count: number, singular: string, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;

function uniqueSuggestions(suggestions: ManageAssistantSuggestion[]) {
  return suggestions.filter(
    (suggestion, index) =>
      suggestions.findIndex((candidate) => candidate.id === suggestion.id) === index,
  );
}

export function buildManageAssistantSuggestions(
  data: ManageData,
  section: string,
  events: ManageAssistantEmailEvent[],
  now = new Date(),
) {
  const openTasks = data.tasks.filter((task) => openTaskStatuses.has(task.status));
  const overdueTasks = openTasks.filter(
    (task) => task.dueAt && new Date(task.dueAt).getTime() < now.getTime(),
  );
  const missingNextStep = data.accounts.filter((account) => !account.nextStep);
  const unclassifiedAccounts = data.accounts.filter((account) => !account.stage);
  const recentInboundEvents = events.filter(
    (event) =>
      event.eventType.toLowerCase().includes("received") ||
      event.eventType.toLowerCase().includes("inbound"),
  );
  const unreadCount = data.mail.unreadCount;

  const suggestions: ManageAssistantSuggestion[] = [];
  const addSectionSuggestion = () => {
    if (section === "mail") {
      suggestions.push({
        id: "mail-inbound",
        kind: "mail",
        label: "Summarize new inbound mail",
        detail: `${unreadCount} unread · ${counted(recentInboundEvents.length, "recent receiving event")}`,
        prompt: "Summarize the newest inbound email threads and tell me what needs a response.",
      });
    } else if (section === "outreach") {
      suggestions.push({
        id: "tasks-overdue",
        kind: "task",
        label: "Review overdue follow-ups",
        detail: `${overdueTasks.length} overdue · ${openTasks.length} open`,
        prompt: "Which follow-up tasks are overdue, and what should I review first?",
      });
    } else if (section === "contacts") {
      suggestions.push({
        id: "contacts-context",
        kind: "contact",
        label: "Review contact coverage",
        detail: `${counted(data.contacts.length, "contact")} across ${counted(data.accounts.length, "account")}`,
        prompt: "Which accounts have weak contact coverage or no clear primary contact?",
      });
    } else if (section === "accounts") {
      suggestions.push({
        id: "accounts-next-step",
        kind: "account",
        label: "Find accounts missing a next step",
        detail: `${counted(missingNextStep.length, "account")} ${missingNextStep.length === 1 ? "needs" : "need"} a recorded next step`,
        prompt: "Which accounts are missing a next step, and what context do we already have for each?",
      });
    }
  };

  addSectionSuggestion();
  suggestions.push(
    {
      id: "tasks-overdue",
      kind: "task",
      label: "Review overdue follow-ups",
      detail: `${overdueTasks.length} overdue · ${openTasks.length} open`,
      prompt: "Which follow-up tasks are overdue, and what should I review first?",
    },
    {
      id: "mail-inbound",
      kind: "mail",
      label: "Summarize new inbound mail",
      detail: `${unreadCount} unread · ${counted(recentInboundEvents.length, "recent receiving event")}`,
      prompt: "Summarize the newest inbound email threads and tell me what needs a response.",
    },
    {
      id: "accounts-next-step",
      kind: "account",
      label: "Find accounts missing a next step",
      detail: `${counted(missingNextStep.length, "account")} ${missingNextStep.length === 1 ? "needs" : "need"} a recorded next step`,
      prompt: "Which accounts are missing a next step, and what context do we already have for each?",
    },
    {
      id: "accounts-stage",
      kind: "account",
      label: "Review unclassified accounts",
      detail: `${counted(unclassifiedAccounts.length, "account")} ${unclassifiedAccounts.length === 1 ? "has" : "have"} no lifecycle stage`,
      prompt: "Show me the accounts without a lifecycle stage and the evidence available to classify them.",
    },
  );

  return uniqueSuggestions(suggestions).slice(0, 3);
}

export function buildManageAssistantSources(data: ManageData): ManageAssistantSource[] {
  return [
    ...data.accounts.map((account) => ({
      id: `account:${account.id}`,
      label: account.name,
      detail: account.nextStep || account.stage || "Account record",
      href: `/manage/accounts/${account.id}`,
      kind: "account" as const,
    })),
    ...data.contacts
      .filter((contact) => contact.source === "crm")
      .map((contact) => ({
        id: `contact:${contact.id}`,
        label: contact.fullName,
        detail: contact.organizationName,
        href: `/manage/contacts/${contact.id}`,
        kind: "contact" as const,
      })),
    ...data.tasks.map((task) => ({
      id: `task:${task.id}`,
      label: task.title,
      detail: task.organizationName,
      href: "/manage/outreach",
      kind: "task" as const,
    })),
    ...data.activities.map((activity) => ({
      id: `activity:${activity.id}`,
      label: activity.subject,
      detail: activity.organizationName,
      href: "/manage/activity",
      kind: "activity" as const,
    })),
    ...data.mail.threads.map((thread) => ({
      id: `mail:${thread.id}`,
      label: thread.subject,
      detail: thread.organizationName || thread.contactName || "Mail thread",
      href: `/manage/mail?thread=${encodeURIComponent(thread.id)}`,
      kind: "mail" as const,
    })),
  ];
}

export function buildManageAssistantSnapshot(
  data: ManageData,
  events: ManageAssistantEmailEvent[],
) {
  return {
    accounts: data.accounts.slice(0, 60).map((account) => ({
      id: `account:${account.id}`,
      name: account.name,
      industry: account.industry,
      stage: account.stage,
      primaryContact: account.primaryContact,
      openTaskCount: account.openTaskCount,
      lastContactedAt: account.lastContactedAt,
      nextFollowUpAt: account.nextFollowUpAt,
      nextStep: account.nextStep,
      documentCount: account.documentCount,
      opportunityCount: account.opportunityCount,
    })),
    contacts: data.contacts.slice(0, 80).map((contact) => ({
      id: contact.source === "crm" ? `contact:${contact.id}` : null,
      name: contact.fullName,
      account: contact.organizationName,
      title: contact.title,
      email: contact.email,
      isPrimary: contact.isPrimary,
      marketingStatus: contact.marketingStatus,
    })),
    tasks: data.tasks.slice(0, 80).map((task) => ({
      id: `task:${task.id}`,
      account: task.organizationName,
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueAt: task.dueAt,
      notes: task.notes,
    })),
    recentActivity: data.activities.slice(0, 50).map((activity) => ({
      id: `activity:${activity.id}`,
      account: activity.organizationName,
      kind: activity.kind,
      subject: activity.subject,
      summary: activity.summary,
      occurredAt: activity.occurredAt,
    })),
    recentMail: data.mail.threads.slice(0, 50).map((thread) => ({
      id: `mail:${thread.id}`,
      account: thread.organizationName,
      contact: thread.contactName,
      subject: thread.subject,
      snippet: thread.snippet,
      unreadCount: thread.unreadCount,
      latestDirection: thread.latestDirection,
      latestStatus: thread.latestStatus,
      lastMessageAt: thread.lastMessageAt,
    })),
    webhookEvents: events.slice(0, 50),
  };
}
