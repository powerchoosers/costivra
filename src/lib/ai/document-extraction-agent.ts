import {
  analyzeDocument,
  analyzeImageDocument,
  analyzeScannedPdf,
  type DocumentIntelligence,
} from "@/lib/ai/document-intelligence";
import {
  defineGovernedAgentContract,
  runGovernedAgent,
} from "@/lib/ai/governed-agent";
import type { DocumentExtractionInputMode } from "@/lib/documents/extraction-failure";

export const DOCUMENT_EXTRACTION_AGENT = defineGovernedAgentContract({
  id: "document-extraction",
  displayName: "Document Extraction Agent",
  contractVersion: "document-extraction-agent-v1",
  instructionsVersion: "cost-document-v2",
  modelConfigurationVersion: "openrouter-document-extraction-v1",
  allowedActions: ["classify_document", "extract_source_backed_candidate_facts"],
  prohibitedActions: [
    "calculate_savings",
    "change_structured_records",
    "approve_work",
    "send_external_communication",
    "execute_external_action",
  ],
  maxSteps: 1,
  maxTokens: 4_000,
  timeoutMs: 45_000,
  maxRetries: 0,
  externalSideEffectsAllowed: false,
  escalationConditions: [
    "document_is_unreadable",
    "structured_output_is_invalid",
    "source_evidence_is_missing",
    "extraction_confidence_is_below_threshold",
  ],
});

export async function runDocumentExtractionAgent(input: {
  organizationId: string;
  documentId: string;
  documentName: string;
  mimeType: string;
  inputMode: DocumentExtractionInputMode;
  extractedText: string;
  pageCount: number | null;
  buffer: Buffer;
  traceId?: string;
}) {
  return runGovernedAgent<DocumentIntelligence>({
    contract: DOCUMENT_EXTRACTION_AGENT,
    scope: {
      organizationId: input.organizationId,
      documentId: input.documentId,
      traceId: input.traceId,
    },
    execute: async (signal) => {
      if (input.inputMode === "image_vision") {
        if (input.mimeType !== "image/png" && input.mimeType !== "image/jpeg") {
          throw new Error("Image extraction requires a supported image MIME type.");
        }
        return analyzeImageDocument({
          documentName: input.documentName,
          mimeType: input.mimeType,
          buffer: input.buffer,
          signal,
        });
      }
      if (input.inputMode === "pdf_ocr") {
        return analyzeScannedPdf({
          documentName: input.documentName,
          buffer: input.buffer,
          pageCount: input.pageCount,
          signal,
        });
      }
      return analyzeDocument({
        documentName: input.documentName,
        mimeType: input.mimeType,
        extractedText: input.extractedText,
        pageCount: input.pageCount,
        signal,
      });
    },
  });
}
