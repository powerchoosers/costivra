function compact(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/**
 * Matches the human/category-pack vocabulary used by organization records to
 * the looser labels currently present in the supplier directory.
 */
export function supplierCategoryMatches(requested: string | null | undefined, candidate: string | null | undefined): boolean {
  if (!requested || !candidate) return false;
  const requestedValue = compact(requested);
  const candidateValue = compact(candidate);
  if (!requestedValue || !candidateValue) return false;
  if (requestedValue.includes(candidateValue) || candidateValue.includes(requestedValue)) return true;

  const groups = [
    ["energy", "commercialenergy", "commercialelectricitysupply", "electricity", "utility", "power"],
    ["telecom", "telecommunications", "telecominternet", "internet", "broadband"],
    ["software", "softwaresubscriptions", "saas", "saassubscriptions"],
    ["waste", "wastemanagement", "wastewater", "solidwaste"],
  ];
  return groups.some((group) => {
    const requestedMatches = group.some((term) => requestedValue.includes(term) || term.includes(requestedValue));
    const candidateMatches = group.some((term) => candidateValue.includes(term) || term.includes(candidateValue));
    return requestedMatches && candidateMatches;
  });
}
