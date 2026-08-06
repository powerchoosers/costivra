import type { DocumentUploadCompletion } from "@/lib/documents/client-upload";

export type UploadToastNotice = {
  tone: "success" | "warning" | "info";
  title: string;
  message: string;
  action: "breakdown" | "document";
  documentId: string | null;
  duration: number;
};

export function getUploadToastNotice(
  completion: DocumentUploadCompletion,
): UploadToastNotice | null {
  if (completion.kind === "rejected") return null;

  if (completion.kind === "duplicate") {
    return {
      tone: "info",
      title: "This bill is already in your workspace",
      message: completion.message,
      action: "document",
      documentId: completion.documentId,
      duration: 15_000,
    };
  }

  if (completion.kind === "quarantined") {
    return {
      tone: "warning",
      title: "Bill safely quarantined",
      message:
        completion.warning ||
        "The security check could not finish. Costivra has not analyzed the file.",
      action: "document",
      documentId: completion.documentId,
      duration: 15_000,
    };
  }

  if (completion.breakdownReady && completion.documentId) {
    const needsReview =
      completion.payload.status === "needs_review" ||
      completion.payload.invoiceRecord?.reviewStatus === "needs_review";
    return {
      tone: needsReview ? "warning" : "success",
      title: needsReview
        ? "Bill breakdown ready for review"
        : "Bill breakdown ready",
      message: needsReview
        ? "Costivra extracted the bill and found one or more fields that need confirmation."
        : "Security checks and extraction are complete.",
      action: "breakdown",
      documentId: completion.documentId,
      duration: 15_000,
    };
  }

  return {
    tone: "info",
    title: "Bill uploaded",
    message: "Costivra is still preparing the breakdown.",
    action: "document",
    documentId: completion.documentId,
    duration: 12_000,
  };
}
