export type LegacyWorkspacePage = "expenses" | "documents" | "opportunities" | "savings" | "reports";

const legacyWorkspaceRedirects: Record<LegacyWorkspacePage, string> = {
  expenses: "/app/bills?view=spend",
  documents: "/app/bills?view=files",
  opportunities: "/app/findings",
  savings: "/app/results?view=verified",
  reports: "/app/results?view=reports",
};

export function getLegacyWorkspaceRedirect(page: string, hasDetail: boolean): string | null {
  if (hasDetail || !(page in legacyWorkspaceRedirects)) return null;
  return legacyWorkspaceRedirects[page as LegacyWorkspacePage];
}

export function getCanonicalParentPath(page: string): string {
  if (page === "expenses" || page === "documents") return "/app/bills";
  if (page === "opportunities") return "/app/findings";
  if (page === "savings" || page === "reports") return "/app/results";
  if (page === "vendors") return "/app/vendors";
  return `/app/${page}`;
}
