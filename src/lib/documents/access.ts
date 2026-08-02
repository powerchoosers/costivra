/**
 * A document becomes downloadable only after malware scanning and intake have
 * moved it to one of the two terminal source-file states used by Costivra.
 * Keep this as an allowlist so new or misspelled statuses fail closed.
 */
export function isDocumentDownloadableStatus(status: unknown) {
  return status === "ready" || status === "needs_review";
}
