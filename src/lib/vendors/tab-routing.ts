const vendorTabIds = new Set([
  "overview",
  "accounts",
  "bills",
  "contracts",
  "findings",
  "activity",
]);

export type VendorDetailTab =
  | "overview"
  | "accounts"
  | "bills"
  | "contracts"
  | "findings"
  | "activity";

/**
 * Keeps old vendor deep links useful while limiting new navigation to the
 * current, task-oriented sections.
 */
export function resolveVendorDetailTab(requestedTab: string | null): VendorDetailTab {
  if (!requestedTab) return "overview";
  if (vendorTabIds.has(requestedTab)) return requestedTab as VendorDetailTab;
  if (requestedTab === "actions" || requestedTab === "results") return "findings";
  if (requestedTab === "files") return "bills";
  if (requestedTab === "monitoring") return "overview";
  if (requestedTab === "history") return "activity";
  return "overview";
}

/**
 * Builds a stable, shareable vendor-section URL. Account selection is useful
 * only inside the Accounts section, so it is deliberately cleared when the
 * operator moves into a different workflow.
 */
export function getVendorDetailTabHref(
  vendorId: string,
  tab: VendorDetailTab,
  currentSearch = "",
) {
  const params = new URLSearchParams(currentSearch);

  if (tab === "overview") {
    params.delete("tab");
  } else {
    params.set("tab", tab);
  }

  if (tab !== "accounts") {
    params.delete("account");
  }

  const query = params.toString();
  return query ? `/app/vendors/${vendorId}?${query}` : `/app/vendors/${vendorId}`;
}
