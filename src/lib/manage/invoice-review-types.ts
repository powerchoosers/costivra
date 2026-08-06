export type InvoiceReviewStatus = "needs_review" | "ready" | "approved" | "rejected";
export type InvoiceReviewPriority = "low" | "normal" | "high" | "urgent";

export type InvoiceReviewer = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "operator";
};

export type InvoiceReviewQueueItem = {
  id: string;
  organizationId: string;
  organizationName: string;
  documentId: string;
  documentName: string;
  mimeType: string;
  vendorName: string;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  currency: string | null;
  totalAmount: string | null;
  confidence: number | null;
  vendorMatchStatus: string;
  reconciliationStatus: string;
  reviewStatus: InvoiceReviewStatus;
  reviewPriority: InvoiceReviewPriority;
  reviewDueAt: string | null;
  issueCodes: string[];
  assignedTo: string | null;
  assignedToName: string | null;
  createdAt: string;
};

export type InvoiceReviewLineItem = {
  id: string;
  lineNumber: number;
  description: string;
  quantity: string | null;
  unitPrice: string | null;
  amount: string;
  category: string | null;
};

export type InvoiceEvidence = {
  id: string;
  fieldPath: string;
  pageNumber: number | null;
  excerpt: string;
};

export type InvoiceCorrection = {
  id: string;
  fieldPath: string;
  originalValue: unknown;
  correctedValue: unknown;
  reason: string;
  correctedByName: string;
  createdAt: string;
};

export type InvoiceVendorOption = {
  relationshipId: string;
  name: string;
  category: string | null;
};

export type InvoiceAccountOption = {
  id: string;
  label: string;
};

export type InvoiceReviewDetail = InvoiceReviewQueueItem & {
  expenseAccountId: string | null;
  organizationVendorId: string | null;
  servicePeriodStart: string | null;
  servicePeriodEnd: string | null;
  accountNumberLast4: string | null;
  purchaseOrderNumber: string | null;
  subtotal: string | null;
  taxTotal: string | null;
  feeTotal: string | null;
  creditTotal: string | null;
  amountDue: string | null;
  expenseCategory: string | null;
  reviewNotes: string | null;
  reconciliationDifference: string | null;
  workspaceCustomerMatchStatus: string;
  expenseAccountMatchStatus: string;
  serviceLocationMatchStatus: string;
  previousBalance: string | null;
  paymentsAndCredits: string | null;
  balanceForward: string | null;
  currentCharges: string | null;
  currentPeriodCredits: string | null;
  lineItems: InvoiceReviewLineItem[];
  evidence: InvoiceEvidence[];
  corrections: InvoiceCorrection[];
  vendorOptions: InvoiceVendorOption[];
  accountOptions: InvoiceAccountOption[];
};

export type ManageInvoiceReviewData = {
  invoices: InvoiceReviewQueueItem[];
  selectedInvoice: InvoiceReviewDetail | null;
  reviewers: InvoiceReviewer[];
};
