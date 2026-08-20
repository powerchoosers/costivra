type InvoiceAccountIdentity = {
  accountNumberLast4: string | null;
  energyService: { meterId: string | null } | null;
  expenseCategory?: string | null;
  expenseAccountId: string | null;
  id: string;
  locationId: string | null;
  locationName: string | null;
};

export type VendorInvoiceAccountGroup<T extends InvoiceAccountIdentity> = {
  key: string;
  invoices: T[];
};

function accountKey(invoice: InvoiceAccountIdentity) {
  if (invoice.expenseAccountId) return `expense-account:${invoice.expenseAccountId}`;

  const location = invoice.locationId ?? invoice.locationName ?? "unassigned";
  if (invoice.energyService?.meterId) {
    return `meter:${invoice.energyService.meterId}:location:${location}`;
  }
  if (invoice.accountNumberLast4) {
    return `account-last4:${invoice.accountNumberLast4}:location:${location}:category:${invoice.expenseCategory ?? "unclassified"}`;
  }
  return `unidentified-invoice:${invoice.id}`;
}

/**
 * Groups bills only when the saved account identity supports it. When source
 * data lacks an account or meter identifier, each bill stays separate instead
 * of inventing a shared service account from a vendor relationship alone.
 */
export function groupVendorInvoicesByAccount<T extends InvoiceAccountIdentity>(
  invoices: readonly T[],
): VendorInvoiceAccountGroup<T>[] {
  const groups = new Map<string, VendorInvoiceAccountGroup<T>>();

  for (const invoice of invoices) {
    const key = accountKey(invoice);
    const group = groups.get(key);
    if (group) {
      group.invoices.push(invoice);
      continue;
    }
    groups.set(key, { key, invoices: [invoice] });
  }

  return Array.from(groups.values());
}
