export type ExtractedDocumentText = {
  text: string;
  pageCount: number | null;
};

/**
 * Extracts text without persisting or analyzing a document. Keeping this in a
 * small shared module makes production intake and the golden-data evaluator
 * exercise the same parser instead of drifting into separate code paths.
 */
export async function extractDocumentText(
  buffer: Buffer,
  mimeType: string,
): Promise<ExtractedDocumentText> {
  if (mimeType === "text/plain") {
    return { text: buffer.toString("utf8"), pageCount: 1 };
  }

  if (mimeType === "application/pdf") {
    const { PDFParse } = await import("pdf-parse");
    await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      return { text: result.text, pageCount: result.total };
    } finally {
      await parser.destroy();
    }
  }

  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value, pageCount: null };
  }

  return { text: "", pageCount: null };
}
