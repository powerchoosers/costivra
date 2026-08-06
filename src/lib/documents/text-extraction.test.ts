import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { extractDocumentText } from "@/lib/documents/text-extraction";

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

  it("preserves PDF page boundaries for page-aware evidence", async () => {
    const pdf = await readFile(new URL("../../../tests/fixtures/invoices/sample-utility-bill-crwwd.pdf", import.meta.url));
    const result = await extractDocumentText(pdf, "application/pdf");
    expect(result.pageCount).toBeGreaterThan(0);
    expect(result.text).toContain("[[COSTIVRA_PAGE 1 of");
  }, 15_000);
});
