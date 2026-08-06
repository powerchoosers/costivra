/**
 * Removes common private identifiers before a query can reach a public search
 * provider. This module stays dependency-free so deterministic evaluation can
 * exercise the privacy boundary without loading the server-only adapter.
 */
export function sanitizeSearchQuery(query: string): string {
  return query
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN-REDACTED]")
    .replace(/\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, "[CARD-REDACTED]")
    .replace(
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
      "[EMAIL-REDACTED]",
    )
    .replace(
      /\b(account|invoice|policy|claim|member)\s*#?\s*[A-Za-z0-9-]+/gi,
      "$1 [REDACTED]",
    )
    .replace(/\b\d{8,}\b/g, "[IDENTIFIER-REDACTED]")
    .slice(0, 500);
}
