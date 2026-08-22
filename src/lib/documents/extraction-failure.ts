export type DocumentExtractionInputMode = "native_text" | "pdf_ocr" | "image_vision";

export type DocumentExtractionFailureCode =
  | "no_readable_text"
  | "ocr_unavailable"
  | "ai_unavailable"
  | "invalid_ai_output"
  | "extraction_failed";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Document extraction failed.";
}

export function classifyDocumentExtractionFailure(
  error: unknown,
  inputMode: DocumentExtractionInputMode,
): DocumentExtractionFailureCode {
  const message = errorMessage(error).toLowerCase();
  if (message.includes("no readable text")) return "no_readable_text";
  if (
    message.includes("malformed structured data") ||
    message.includes("invalid document analysis") ||
    message.includes("incomplete document analysis") ||
    message.includes("classified an invoice without invoice fields")
  ) return "invalid_ai_output";
  if (
    message.includes("not configured") ||
    message.includes("authentication") ||
    message.includes("unauthorized") ||
    message.includes("invalid api key") ||
    message.includes("request failed") ||
    message.includes("no usable response") ||
    message.includes("fetch failed") ||
    message.includes("timed out") ||
    message.includes("timeout") ||
    message.includes("aborted") ||
    /\b(408|429|5\d\d)\b/.test(message)
  ) return inputMode === "pdf_ocr" || inputMode === "image_vision" ? "ocr_unavailable" : "ai_unavailable";
  return "extraction_failed";
}

export function documentExtractionReviewSummary(
  code: DocumentExtractionFailureCode,
) {
  if (code === "no_readable_text")
    return "No readable text was found. A clearer source file is required.";
  if (code === "ocr_unavailable")
    return "This image-based PDF could not be read automatically. OCR retry is available to an operator.";
  if (code === "ai_unavailable")
    return "The document text is available, but structured extraction could not finish. Operator retry is available.";
  if (code === "invalid_ai_output")
    return "The document was read, but its extracted fields did not pass validation. Operator review is required.";
  return "Automatic extraction could not finish. Operator review is required.";
}

export function safeExtractionError(error: unknown) {
  return errorMessage(error)
    .replace(/\b(?:sk|re|key)-[A-Za-z0-9_-]{12,}\b/gi, "[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, "Bearer [redacted]")
    .slice(0, 1000);
}
