import { describe, expect, it } from "vitest";
import { isStaleDocumentProcessing, STALE_EXTRACTION_AFTER_MS } from "@/lib/documents/retry-extraction";

describe("stale document processing policy", () => {
  const now = Date.parse("2026-08-03T04:00:00.000Z");

  it("does not recover active processing work", () => {
    expect(isStaleDocumentProcessing("processing", new Date(now - STALE_EXTRACTION_AFTER_MS + 1).toISOString(), now)).toBe(false);
  });

  it("recovers processing work at the stale boundary", () => {
    expect(isStaleDocumentProcessing("processing", new Date(now - STALE_EXTRACTION_AFTER_MS).toISOString(), now)).toBe(true);
  });

  it("never treats an ordinary review record as stalled", () => {
    expect(isStaleDocumentProcessing("needs_review", new Date(0).toISOString(), now)).toBe(false);
  });
});
