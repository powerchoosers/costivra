import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const operator = await requireInternalOperator();
    const { id } = await context.params;
    const { data: invoice, error: invoiceError } = await operator.db.from("invoices")
      .select("document_id").eq("id", id).maybeSingle();
    if (invoiceError) throw invoiceError;
    if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    const { data: document, error: documentError } = await operator.db.from("documents")
      .select("storage_path,original_filename,mime_type").eq("id", invoice.document_id).maybeSingle();
    if (documentError) throw documentError;
    if (!document) return NextResponse.json({ error: "Source document not found." }, { status: 404 });
    const { data: file, error: downloadError } = await operator.db.storage.from("costivra-documents").download(document.storage_path);
    if (downloadError) throw downloadError;
    return new NextResponse(file, {
      headers: {
        "Content-Type": document.mime_type,
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(document.original_filename)}`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
