import { describe, expect, it } from "vitest";
import {
  classifyDocumentExtractionFailure,
  documentExtractionReviewSummary,
  safeExtractionError,
} from "@/lib/documents/extraction-failure";

describe("document extraction failure classification", () => {
  it("distinguishes OCR availability from native-text AI availability", () => {
    const error = new Error("AI request failed (503).");
    expect(classifyDocumentExtractionFailure(error, "pdf_ocr")).toBe("ocr_unavailable");
    expect(classifyDocumentExtractionFailure(error, "native_text")).toBe("ai_unavailable");
  });

  it("identifies invalid structured output", () => {
    expect(classifyDocumentExtractionFailure(new Error("The AI service returned malformed structured data."), "native_text")).toBe("invalid_ai_output");
  });

  it("treats provider authentication problems as service availability failures", () => {
    expect(classifyDocumentExtractionFailure(new Error("Missing Authentication header"), "native_text")).toBe("ai_unavailable");
  });

  it("provides customer-safe recovery copy", () => {
    expect(documentExtractionReviewSummary("ocr_unavailable")).toContain("OCR retry");
    expect(documentExtractionReviewSummary("invalid_ai_output")).not.toContain("OpenRouter");
  });

  it("redacts token-shaped secrets from stored diagnostics", () => {
    expect(safeExtractionError(new Error("Bearer secret-token-value and sk-abcdefghijklmnopqrstuvwxyz"))).toBe("Bearer [redacted] and [redacted]");
  });
});
