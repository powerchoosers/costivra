export type PortalOrganization = {
  id: string;
  name: string;
  legalName: string | null;
  industry: string | null;
  timezone: string;
  currency: string;
  primaryContactName: string | null;
  reviewThreshold: number;
  settings: Record<string, boolean>;
  logoUrl: string | null;
};

export type PortalUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
};

export type PortalVendor = {
  id: string;
  relationshipId: string;
  name: string;
  category: string;
  website: string | null;
  annualizedSpend: number;
  relationshipStatus: string;
  spendCadence: string;
  updatedAt: string;
  logoUrl: string | null;
  approvedForwardingEmail?: string | null;
  monitoringState?: string;
};

export type PortalVendorCatalogEntry = {
  id: string;
  name: string;
  category: string;
  website: string | null;
  aliases: string[];
  logoUrl: string | null;
};

export type PortalExpense = {
  id: string;
  vendorId: string;
  vendorName: string;
  category: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
  priorPeriodAmount: number | null;
  status: string;
  documentId: string | null;
  invoiceId: string | null;
  locationId: string | null;
  locationName: string | null;
  updatedAt: string;
};

export type PortalContract = {
  id: string;
  vendorId: string;
  vendorName: string;
  title: string;
  category: string;
  startDate: string | null;
  endDate: string | null;
  noticePeriodDays: number | null;
  annualValue: number | null;
  status: string;
  autoRenews: boolean;
  ownerName: string | null;
  documentId: string | null;
  locationId: string | null;
  locationName: string | null;
  updatedAt: string;
};

export type PortalDocument = {
  id: string;
  vendorId: string | null;
  vendorName: string;
  originalFilename: string;
  mimeType: string;
  byteSize: number;
  status: string;
  documentType: string | null;
  summary: string | null;
  confidence: number | null;
  createdAt: string;
  pageCount: number | null;
  sha256: string;
  updatedAt: string;
  sourcePurgedAt: string | null;
};

export type PortalInvoice = {
  id: string;
  documentId: string;
  vendorName: string;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  currency: string | null;
  totalAmount: number | null;
  reviewStatus: string;
  vendorMatchStatus: string;
  reconciliationStatus: string;
  lineItemCount: number;
  vendorId: string | null;
  servicePeriodStart: string | null;
  servicePeriodEnd: string | null;
  accountNumberLast4: string | null;
  purchaseOrderNumber: string | null;
  subtotal: number | null;
  taxTotal: number | null;
  feeTotal: number | null;
  creditTotal: number | null;
  amountDue: number | null;
  extractionConfidence: number | null;
  reconciliationDifference: number | null;
  reviewPriority: string;
  reviewNotes: string | null;
  expenseCategory: string | null;
  updatedAt: string;
};

export type PortalInvoiceLineItem = {
  id: string;
  invoiceId: string;
  lineNumber: number;
  description: string;
  quantity: number | null;
  unitPrice: number | null;
  amount: number;
  category: string | null;
  servicePeriodStart: string | null;
  servicePeriodEnd: string | null;
};

export type PortalOpportunity = {
  id: string;
  title: string;
  summary: string;
  type: string;
  category: string | null;
  status: string;
  priority: "high" | "medium" | "low";
  confidence: number | null;
  estimatedAnnualValue: number | null;
  deadlineAt: string | null;
  vendorName: string;
  vendorId: string | null;
  evidenceCount: number;
  ruleVersion: string | null;
  calculationResult: Record<string, string>;
  assumptions: string[];
  calculationInputs: Record<string, unknown>;
  updatedAt: string;
};

export type PortalAction = {
  id: string;
  opportunityId: string;
  title: string;
  description: string;
  actionType: string;
  priority: string;
  status: string;
  dueAt: string | null;
  vendorName: string;
  vendorId: string | null;
  approvalId: string | null;
  approvalDecision: string | null;
  approvalPolicyId: string | null;
  approvalPolicyName: string | null;
  requiredApprovals: number;
  approvedCount: number;
  currentUserDecision: string | null;
  updatedAt: string;
};

export type PortalApprovalPolicy = {
  id: string;
  name: string;
  isActive: boolean;
  actionType: string;
  minimumApprovers: number;
  annualValueThreshold: number | null;
  category: string | null;
  explicitConsent: boolean;
  updatedAt: string;
};

export type PortalSavingsOutcome = {
  id: string;
  title: string;
  valueType: string;
  amount: number;
  method: string;
  status: string;
  verifiedAt: string | null;
  baselineAmount: number | null;
  comparisonAmount: number | null;
  baselineAcceptedAt: string | null;
  baselineExpenseId: string | null;
  comparisonExpenseId: string | null;
  methodVersion: string | null;
  calculationResult: Record<string, string>;
  opportunityId: string | null;
  assumptions: string[];
  exclusions: string[];
};

export type PortalAuditEvent = {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  actorType: string;
  actorName: string;
  createdAt: string;
};

export type PortalEvidenceReference = {
  id: string;
  documentId: string;
  opportunityId: string | null;
  pageNumber: number;
  fieldPath: string | null;
  textExcerpt: string;
};

export type PortalIntegration = {
  id: string;
  provider: string;
  displayName: string;
  description: string;
  status: string;
  lastSyncedAt: string | null;
};

export type PortalEmailIntake = {
  id: string;
  address: string;
  status: string;
  trustedSenders: string[];
  platformReady: boolean;
};

export type PortalInboundEmailEvent = {
  id: string;
  senderAddress: string;
  subject: string;
  status: string;
  attachmentCount: number;
  processedAttachmentCount: number;
  errorMessage: string | null;
  receivedAt: string;
};

export type PortalReport = {
  id: string;
  name: string;
  description: string;
  reportType: string;
  status: string;
  lastGeneratedAt: string | null;
};

export type PortalNotification = {
  id: string;
  title: string;
  body: string;
  resourceType: string | null;
  resourceId: string | null;
  readAt: string | null;
  createdAt: string;
};

export type PortalTeamMember = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  permissions: string[];
};

export type PortalLocation = {
  id: string;
  name: string;
  status: string;
  address: Record<string, string> | null;
};

export type PortalData = {
  organization: PortalOrganization;
  currentUser: PortalUser;
  locations: PortalLocation[];
  vendors: PortalVendor[];
  vendorCatalog: PortalVendorCatalogEntry[];
  expenses: PortalExpense[];
  contracts: PortalContract[];
  documents: PortalDocument[];
  invoices: PortalInvoice[];
  invoiceLineItems: PortalInvoiceLineItem[];
  opportunities: PortalOpportunity[];
  actions: PortalAction[];
  approvalPolicies: PortalApprovalPolicy[];
  savings: PortalSavingsOutcome[];
  integrations: PortalIntegration[];
  emailIntake: PortalEmailIntake | null;
  inboundEmailEvents: PortalInboundEmailEvent[];
  reports: PortalReport[];
  team: PortalTeamMember[];
  notifications: PortalNotification[];
  auditEvents: PortalAuditEvent[];
  evidenceReferences: PortalEvidenceReference[];
};
