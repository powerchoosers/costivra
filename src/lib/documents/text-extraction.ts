export type ExtractedDocumentText = {
  text: string;
  pageCount: number | null;
};

const pageBoundaryMarkerPattern = /\[\[COSTIVRA_PAGE\s+\d+\s+of\s+\d+\]\]/g;

/**
 * PDF parsing preserves page markers even when every page has no readable
 * native text. Those markers are useful evidence delimiters, but they must
 * not be mistaken for document content or bypass the OCR recovery path.
 */
export function hasMeaningfulExtractedText(value: string): boolean {
  return value.replace(pageBoundaryMarkerPattern, "").trim().length > 0;
}

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
      const result = await parser.getText({
        pageJoiner: "\n\n[[COSTIVRA_PAGE page_number of total_number]]\n",
      });
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
