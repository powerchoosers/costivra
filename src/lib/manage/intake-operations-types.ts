export type IntakeOperationStatus =
  | "received"
  | "queued"
  | "processing"
  | "retrying"
  | "quarantined"
  | "processed"
  | "needs_review"
  | "rejected"
  | "failed"
  | "dead_letter"
  | "duplicate";

export type IntakeAttachment = {
  id: string;
  filename: string;
  contentType: string;
  byteSize: number;
  scanStatus: string;
  processingStatus: string;
  errorMessage: string | null;
  documentId: string | null;
  invoiceId: string | null;
  createdAt: string;
};

export type IntakeOperationEvent = {
  id: string;
  organizationId: string;
  organizationName: string;
  senderAddress: string;
  subject: string;
  bodyPreview: string | null;
  status: IntakeOperationStatus;
  attachmentCount: number;
  processedAttachmentCount: number;
  attemptCount: number;
  maxAttempts: number;
  nextAttemptAt: string | null;
  lastAttemptAt: string | null;
  errorMessage: string | null;
  receivedAt: string;
  updatedAt: string;
  processedAt: string | null;
  attachments: IntakeAttachment[];
};

export type ManageIntakeOperationsData = {
  events: IntakeOperationEvent[];
  selectedEvent: IntakeOperationEvent | null;
  scannerConfigured: boolean;
  recoveryDocuments: Array<{
    id: string;
    organizationId: string;
    organizationName: string;
    filename: string;
    summary: string | null;
    failureCode: string;
    inputMode: "native_text" | "pdf_ocr" | null;
    createdAt: string;
    sourceAvailable: boolean;
  }>;
};
