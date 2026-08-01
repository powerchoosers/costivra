export type ManageOperator = {
  id: string;
  email: string;
  fullName: string;
  role: "owner" | "operator";
  avatarUrl: string | null;
};

export type ManageStaffMember = {
  id: string;
  email: string;
  fullName: string;
  role: "owner" | "operator";
};

export type ManageAccount = {
  id: string;
  name: string;
  legalName: string | null;
  industry: string | null;
  stage: string | null;
  primaryContact: string | null;
  primaryEmail: string | null;
  memberCount: number;
  documentCount: number;
  opportunityCount: number;
  openTaskCount: number;
  marketingOptInCount: number;
  latestMarketingConsentAt: string | null;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  nextStep: string | null;
  privateNotes: string | null;
  createdAt: string;
  logoUrl: string | null;
};

export type ManageContact = {
  id: string;
  organizationId: string;
  organizationName: string;
  fullName: string;
  email: string;
  title: string | null;
  phone: string | null;
  isPrimary: boolean;
  status: string;
  source: "crm" | "workspace";
  marketingStatus: "opted_in" | "opted_out" | null;
  marketingConsentAt: string | null;
};

export type ManageTask = {
  id: string;
  organizationId: string;
  organizationName: string;
  contactId: string | null;
  title: string;
  taskType: string;
  priority: string;
  status: string;
  dueAt: string | null;
  notes: string | null;
  createdAt: string;
};

export type ManageActivity = {
  id: string;
  organizationId: string;
  organizationName: string;
  kind: string;
  direction: string | null;
  subject: string;
  summary: string | null;
  occurredAt: string;
};

export type ManageMailbox = {
  id: string;
  displayName: string;
  localPart: string;
  domain: string;
  address: string;
  mailboxType: "personal" | "shared";
  assignedTo: string | null;
  assignedToName: string | null;
  status: "active" | "disabled";
  canSend: boolean;
  canReceive: boolean;
  isDefault: boolean;
  createdAt: string;
};

export type ManageMailMessage = {
  id: string;
  threadId: string;
  organizationId: string | null;
  mailboxId: string | null;
  direction: "inbound" | "outbound";
  folder: string;
  fromAddress: string;
  toAddresses: string[];
  ccAddresses: string[];
  subject: string;
  textBody: string | null;
  providerStatus: string;
  attachments: Array<{ filename: string; contentType?: string; size?: number }>;
  sentAt: string | null;
  receivedAt: string | null;
  createdAt: string;
};

export type ManageMailThread = {
  id: string;
  organizationId: string | null;
  mailboxId: string | null;
  mailboxAddress: string | null;
  organizationName: string | null;
  contactId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  subject: string;
  participants: string[];
  snippet: string | null;
  status: string;
  isStarred: boolean;
  unreadCount: number;
  lastMessageAt: string;
  folder: string;
  latestDirection: "inbound" | "outbound" | null;
  latestStatus: string | null;
};

export type ManageData = {
  operator: ManageOperator;
  staff: ManageStaffMember[];
  accounts: ManageAccount[];
  contacts: ManageContact[];
  tasks: ManageTask[];
  activities: ManageActivity[];
  mail: {
    folder: string;
    threads: ManageMailThread[];
    selectedThread: ManageMailThread | null;
    messages: ManageMailMessage[];
    unreadCount: number;
    mailboxes: ManageMailbox[];
    selectedMailboxId: string | null;
    fromAddress: string;
    inboxAddress: string;
    inboundReady: boolean;
  };
};
