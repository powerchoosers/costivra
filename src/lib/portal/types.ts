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
};

export type PortalDocument = {
  id: string;
  vendorName: string;
  originalFilename: string;
  mimeType: string;
  byteSize: number;
  status: string;
  documentType: string | null;
  summary: string | null;
  confidence: number | null;
  createdAt: string;
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
  evidenceCount: number;
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
  approvalId: string | null;
  approvalDecision: string | null;
};

export type PortalSavingsOutcome = {
  id: string;
  title: string;
  valueType: string;
  amount: number;
  method: string;
  status: string;
  verifiedAt: string | null;
};

export type PortalIntegration = {
  id: string;
  provider: string;
  displayName: string;
  description: string;
  status: string;
  lastSyncedAt: string | null;
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
  expenses: PortalExpense[];
  contracts: PortalContract[];
  documents: PortalDocument[];
  opportunities: PortalOpportunity[];
  actions: PortalAction[];
  savings: PortalSavingsOutcome[];
  integrations: PortalIntegration[];
  reports: PortalReport[];
  team: PortalTeamMember[];
  notifications: PortalNotification[];
};
