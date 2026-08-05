/**
 * Shared types for Costivra Client Assistant V2.
 */

export type AssistantMode = "closed" | "drawer" | "fullscreen";

export type AssistantContextRef =
  | { kind: "vendor"; id: string }
  | { kind: "invoice"; id: string }
  | { kind: "document"; id: string }
  | { kind: "expense"; id: string }
  | { kind: "contract"; id: string }
  | { kind: "opportunity"; id: string }
  | { kind: "action"; id: string }
  | { kind: "savings"; id: string };

export type ChatSessionSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  pinnedAt: string | null;
  archivedAt: string | null;
  lastMessagePreview: string | null;
  messageCount: number;
};

export type ClientCitation = {
  id: string;
  documentId?: string | null;
  recordId?: string | null;
  recordType?: string | null;
  title: string;
  excerpt?: string | null;
  pageNumber?: number | null;
  href?: string | null;
};

export type AssistantBlockRequest =
  | { type: "spend_overview"; vendorRelationshipIds?: string[] }
  | { type: "invoice_summary"; invoiceId: string }
  | { type: "invoice_comparison"; invoiceIds: [string, string] }
  | { type: "vendor_summary"; vendorRelationshipId: string }
  | { type: "spend_trend"; vendorRelationshipId?: string; category?: string; periodCount?: number }
  | { type: "renewal_timeline"; contractIds?: string[] }
  | { type: "opportunity"; opportunityId: string }
  | { type: "savings_summary"; savingsIds?: string[] }
  | { type: "approval_queue"; actionIds?: string[] }
  | { type: "document_ingestion"; documentId: string }
  | { type: "vendor_candidate"; vendorId?: string; organizationVendorId: string }
  | { type: "evidence_list"; evidenceIds?: string[] }
  | { type: "notice"; severity: "info" | "warning" | "error" | "success"; code: string; title: string; message: string };

export type AssistantBlockV1 = {
  id: string;
  type: AssistantBlockRequest["type"];
  payload: Record<string, unknown>;
};

export type ClientChatMessage = {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  status: "pending" | "complete" | "failed" | "cancelled";
  createdAt: string;
  completedAt?: string | null;
  clientRequestId?: string | null;
  citations?: ClientCitation[];
  blocks?: AssistantBlockV1[];
  followUps?: string[];
  missingInformation?: string[];
  attachedDocumentIds?: string[];
};

export type ClientAssistantAttachment = {
  clientUploadId: string;
  file?: File;
  documentId?: string;
  filename: string;
  byteSize: number;
  mimeType: string;
  status: "uploading" | "processed" | "duplicate" | "quarantined" | "rejected" | "failed";
  vendorIdHint?: string;
  invoiceId?: string | null;
  reviewStatus?: string | null;
  warning?: string;
};
