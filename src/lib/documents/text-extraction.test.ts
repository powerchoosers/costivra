import { describe, expect, it } from "vitest";
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
});
