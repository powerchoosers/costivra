import { describe, expect, it } from "vitest";
import { getChronologicalBillDocumentIds } from "./bill-chronology";

describe("getChronologicalBillDocumentIds", () => {
  it("puts the newest invoice first and falls back through the recorded date fields", () => {
    expect(getChronologicalBillDocumentIds(
      [
        { id: "uploaded-only", createdAt: "2026-04-17T10:00:00.000Z" },
        { id: "march-bill", createdAt: "2026-03-18T10:00:00.000Z" },
      ],
      [
        { documentId: "march-bill", invoiceDate: "2026-03-11", servicePeriodEnd: null, updatedAt: "2026-03-18T10:00:00.000Z" },
        { documentId: "april-bill", invoiceDate: null, servicePeriodEnd: "2026-04-15", updatedAt: "2026-04-16T10:00:00.000Z" },
      ],
    )).toEqual(["uploaded-only", "april-bill", "march-bill"]);
  });

  it("deduplicates document ids and keeps equal timestamps deterministic", () => {
    expect(getChronologicalBillDocumentIds(
      [
        { id: "b", createdAt: "2026-01-01T00:00:00.000Z" },
        { id: "a", createdAt: "2026-01-01T00:00:00.000Z" },
      ],
      [
        { documentId: "a", invoiceDate: null, servicePeriodEnd: null, updatedAt: "2026-01-01T00:00:00.000Z" },
      ],
    )).toEqual(["b", "a"]);
  });
});
