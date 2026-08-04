import type { AssistantBlockRequest } from "./types";

export type ClientAssistantModelOutputV1 = {
  version: "client-assistant-v1";
  answer: string;
  citationIds: string[];
  blockRequests: AssistantBlockRequest[];
  followUps: string[];
  missingInformation: string[];
};

/**
 * Validates and parses structured JSON output returned by the LLM.
 */
export function parseClientAssistantModelOutput(rawText: string): ClientAssistantModelOutputV1 {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    // If not JSON, treat entire raw text as narrative answer
    return {
      version: "client-assistant-v1",
      answer: rawText.slice(0, 8000),
      citationIds: [],
      blockRequests: [],
      followUps: [],
      missingInformation: [],
    };
  }

  const answer = typeof parsed.answer === "string" ? parsed.answer.slice(0, 8000) : "No narrative answer generated.";
  
  const citationIds = Array.isArray(parsed.citationIds)
    ? parsed.citationIds.filter((id): id is string => typeof id === "string").slice(0, 10)
    : [];

  const followUps = Array.isArray(parsed.followUps)
    ? parsed.followUps.filter((item): item is string => typeof item === "string").slice(0, 4)
    : [];

  const missingInformation = Array.isArray(parsed.missingInformation)
    ? parsed.missingInformation.filter((item): item is string => typeof item === "string").slice(0, 8)
    : [];

  const rawBlocks = Array.isArray(parsed.blockRequests) ? parsed.blockRequests : [];
  const blockRequests: AssistantBlockRequest[] = [];

  for (const block of rawBlocks.slice(0, 6)) {
    if (block && typeof block === "object" && typeof block.type === "string") {
      const b = block as Record<string, unknown>;
      switch (b.type) {
        case "invoice_summary":
          if (typeof b.invoiceId === "string") {
            blockRequests.push({ type: "invoice_summary", invoiceId: b.invoiceId });
          }
          break;
        case "invoice_comparison":
          if (Array.isArray(b.invoiceIds) && b.invoiceIds.length >= 2 && typeof b.invoiceIds[0] === "string" && typeof b.invoiceIds[1] === "string") {
            blockRequests.push({ type: "invoice_comparison", invoiceIds: [b.invoiceIds[0], b.invoiceIds[1]] });
          }
          break;
        case "vendor_summary":
          if (typeof b.vendorRelationshipId === "string") {
            blockRequests.push({ type: "vendor_summary", vendorRelationshipId: b.vendorRelationshipId });
          }
          break;
        case "spend_trend":
          blockRequests.push({
            type: "spend_trend",
            vendorRelationshipId: typeof b.vendorRelationshipId === "string" ? b.vendorRelationshipId : undefined,
            category: typeof b.category === "string" ? b.category : undefined,
          });
          break;
        case "renewal_timeline":
          if (Array.isArray(b.contractIds)) {
            blockRequests.push({ type: "renewal_timeline", contractIds: b.contractIds.filter((id): id is string => typeof id === "string") });
          }
          break;
        case "opportunity":
          if (typeof b.opportunityId === "string") {
            blockRequests.push({ type: "opportunity", opportunityId: b.opportunityId });
          }
          break;
        case "approval_queue":
          if (Array.isArray(b.actionIds)) {
            blockRequests.push({ type: "approval_queue", actionIds: b.actionIds.filter((id): id is string => typeof id === "string") });
          }
          break;
        case "document_ingestion":
          if (typeof b.documentId === "string") {
            blockRequests.push({ type: "document_ingestion", documentId: b.documentId });
          }
          break;
        case "vendor_candidate":
          if (typeof b.vendorId === "string" && typeof b.organizationVendorId === "string") {
            blockRequests.push({ type: "vendor_candidate", vendorId: b.vendorId, organizationVendorId: b.organizationVendorId });
          }
          break;
        case "evidence_list":
          if (Array.isArray(b.evidenceIds)) {
            blockRequests.push({ type: "evidence_list", evidenceIds: b.evidenceIds.filter((id): id is string => typeof id === "string") });
          }
          break;
        case "notice":
          if (typeof b.code === "string" && typeof b.title === "string" && typeof b.message === "string") {
            blockRequests.push({
              type: "notice",
              severity: ["info", "warning", "error"].includes(String(b.severity)) ? (b.severity as "info" | "warning" | "error") : "info",
              code: b.code,
              title: b.title,
              message: b.message,
            });
          }
          break;
      }
    }
  }

  return {
    version: "client-assistant-v1",
    answer,
    citationIds,
    blockRequests,
    followUps,
    missingInformation,
  };
}
