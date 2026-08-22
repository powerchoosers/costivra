import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { extractDocumentText, hasMeaningfulExtractedText } from "@/lib/documents/text-extraction";

describe("extractDocumentText", () => {
  it("uses the shared production parser for plain text", async () => {
    await expect(
      extractDocumentText(Buffer.from("Invoice INV-42"), "text/plain"),
    ).resolves.toEqual({ text: "Invoice INV-42", pageCount: 1 });
  });

  it("returns no text for an unsupported type", async () => {
    await expect(
      extractDocumentText(Buffer.from("binary"), "application/octet-stream"),
    ).resolves.toEqual({ text: "", pageCount: null });
  });

  it("does not treat page-boundary markers as readable document text", () => {
    expect(hasMeaningfulExtractedText("\n[[COSTIVRA_PAGE 1 of 3]]\n[[COSTIVRA_PAGE 2 of 3]]\n")).toBe(false);
    expect(hasMeaningfulExtractedText("[[COSTIVRA_PAGE 1 of 1]]\nInvoice INV-42")).toBe(true);
  });

  it("recognizes the image-based Azure sample PDFs as OCR candidates", async () => {
    const pdf = await readFile(new URL("../../../tests/fixtures/invoices/sample-azure-payg-invoice.pdf", import.meta.url));
    const result = await extractDocumentText(pdf, "application/pdf");
    expect(result.pageCount).toBe(3);
    expect(hasMeaningfulExtractedText(result.text)).toBe(false);
  }, 15_000);

  it("preserves PDF page boundaries for page-aware evidence", async () => {
    const pdf = await readFile(new URL("../../../tests/fixtures/invoices/sample-utility-bill-crwwd.pdf", import.meta.url));
    const result = await extractDocumentText(pdf, "application/pdf");
    expect(result.pageCount).toBeGreaterThan(0);
    expect(result.text).toContain("[[COSTIVRA_PAGE 1 of");
  }, 15_000);
});
