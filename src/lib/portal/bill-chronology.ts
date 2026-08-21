type BillDocumentForChronology = {
  id: string;
  createdAt: string;
};

type BillInvoiceForChronology = {
  documentId: string;
  invoiceDate: string | null;
  servicePeriodEnd: string | null;
  updatedAt: string;
};

/**
 * Orders reviewable source documents newest first. A bill date is preferred to
 * the service-period end, then to the recorded update and file creation time.
 */
export function getChronologicalBillDocumentIds(
  documents: readonly BillDocumentForChronology[],
  invoices: readonly BillInvoiceForChronology[],
) {
  const invoiceDateByDocumentId = new Map(
    invoices
      .filter((invoice) => Boolean(invoice.documentId))
      .map((invoice) => [
        invoice.documentId,
        invoice.invoiceDate ?? invoice.servicePeriodEnd ?? invoice.updatedAt,
      ]),
  );
  const createdAtByDocumentId = new Map(
    documents.map((document) => [document.id, document.createdAt]),
  );

  return Array.from(
    new Set([...documents.map((document) => document.id), ...invoiceDateByDocumentId.keys()]),
  ).sort((left, right) => {
    const rightDate = invoiceDateByDocumentId.get(right) ?? createdAtByDocumentId.get(right) ?? "";
    const leftDate = invoiceDateByDocumentId.get(left) ?? createdAtByDocumentId.get(left) ?? "";
    return rightDate.localeCompare(leftDate) || right.localeCompare(left);
  });
}
