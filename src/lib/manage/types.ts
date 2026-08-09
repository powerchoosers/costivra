export type ManageOperator = {
  id: string;
  email: string;
  fullName: string;
  role: "owner" | "operator";
  avatarUrl: string | null;
  jobTitle: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  notificationSoundEnabled: boolean;
};

export type ManageOpportunityTrustReviewItem = {
  id: string;
  organizationId: string;
  organizationName: string;
  vendorName: string;
  title: string;
  category: string | null;
  estimatedAnnualValue: number;
  generatedBy: string;
  trustState: string;
  customerVisible: boolean;
  evidenceCount: number;
  expenseAccountReference: string | null;
  locationName: string | null;
  issue: string;
  evidenceOptions: ManageOpportunityEvidenceOption[];
};

export type ManageOpportunityEvidenceOption = {
  id: string;
  documentId: string;
  filename: string;
  pageNumber: number | null;
  fieldPath: string | null;
  excerpt: string;
};

export type ManageOpportunityTrustReviewData = {
  items: ManageOpportunityTrustReviewItem[];
  generatedAt: string;
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
  employeeCountRange?: string | null;
  annualRevenueRange?: string | null;
  timezone?: string | null;
  currency: string;
  website: string | null;
  phone?: string | null;
  stage: string | null;
  primaryContact: string | null;
  primaryEmail: string | null;
  primaryContactId?: string | null;
  assignedTo?: string | null;
  assignedToName?: string | null;
  visibleInCrm?: boolean;
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
  updatedAt?: string;
  logoUrl: string | null;
  parentAccountId: string | null;
  enrichment: ManageAccountEnrichment | null;
};

export type ManageLocation = {
  id: string;
  organizationId: string;
  name: string;
  status: string;
  address: Record<string, string> | null;
};

export type ManageAccountEnrichment = {
  provider: "apollo";
  name: string | null;
  shortDescription: string | null;
  industry: string | null;
  website: string | null;
  logoUrl: string | null;
  linkedinUrl: string | null;
  phone: string | null;
  location: string | null;
  employeeCount: number | null;
  foundedYear: number | null;
  technologies: string[];
  status: string;
  fetchedAt: string | null;
  attemptedAt: string | null;
};

export type ManageApolloSearchResult = {
  providerOrganizationId: string;
  name: string;
  shortDescription: string | null;
  website: string | null;
  logoUrl: string | null;
  linkedinUrl: string | null;
  phone: string | null;
  industry: string | null;
  location: string | null;
  employeeCount: number | null;
  foundedYear: number | null;
  technologies: string[];
  exact: boolean;
  detailsLoaded: boolean;
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
  /** A server-resolved reason the contact is not eligible for outreach, when known. */
  outreachSuppressionReason?: string | null;
  archivedAt?: string | null;
  archivedBy?: string | null;
  updatedAt?: string | null;
};

export type ManageDocument = {
  id: string;
  organizationId: string;
  vendorRelationshipId: string | null;
  organizationName: string;
  originalFilename: string;
  mimeType: string;
  byteSize: number;
  status: string;
  documentType: string | null;
  summary: string | null;
  confidence: number | null;
  extractionStatus: string | null;
  extractionInputMode: "native_text" | "pdf_ocr" | null;
  extractionFailureCode: string | null;
  createdAt: string;
  updatedAt: string;
  pageCount: number | null;
  sourcePurgedAt: string | null;
};

export type ManageVendorRelationship = {
  id: string;
  organizationId: string;
  vendorId: string;
  name: string;
  category: string;
  website: string | null;
  logoUrl: string | null;
  relationshipStatus: string;
  spendCadence: string;
  annualizedSpend: number | null;
  recordedSpend: number;
  expenseCount: number;
  contractCount: number;
  nextContractEnd: string | null;
  updatedAt: string;
  displayNameOverride?: string | null;
  categoryOverride?: string | null;
  websiteOverride?: string | null;
  endedAt?: string | null;
  endedBy?: string | null;
};

export type ManageExpense = {
  id: string;
  organizationId: string;
  vendorRelationshipId: string | null;
  category: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
  currency: string;
  status: string;
};

export type ManageVendorContract = {
  id: string;
  organizationId: string;
  vendorRelationshipId: string | null;
  title: string;
  category: string;
  endDate: string | null;
  annualValue: number | null;
  currency: string;
  status: string;
  autoRenews: boolean;
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
  origin?: "manual" | "sequence";
  sequenceId?: string | null;
  sequenceEnrollmentId?: string | null;
  sequenceStepId?: string | null;
  sequenceStepPosition?: number | null;
};

export type ManageActivity = {
  id: string;
  organizationId: string;
  organizationName: string;
  contactId?: string | null;
  kind: string;
  direction: string | null;
  subject: string;
  summary: string | null;
  occurredAt: string;
  createdAt?: string;
  actorName?: string | null;
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
  htmlBody: string | null;
  providerStatus: string;
  attachments: Array<{
    id?: string;
    filename: string;
    contentType?: string;
    size?: number;
    status?: "pending" | "scanning" | "clean" | "infected" | "unavailable" | "failed";
    disposition?: "inline" | "attachment";
  }>;
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
  locations: ManageLocation[];
  contacts: ManageContact[];
  documents: ManageDocument[];
  vendorRelationships: ManageVendorRelationship[];
  expenses: ManageExpense[];
  vendorContracts: ManageVendorContract[];
  enrichmentAvailable: boolean;
  enrichmentConfigured: boolean;
  tasks: ManageTask[];
  activities: ManageActivity[];
  mail: {
    folder: string;
    threads: ManageMailThread[];
    folderCounts: Record<string, number>;
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
