/**
 * Deterministic vendor name, text, and domain normalization utilities.
 */

const COMMON_COMPANY_SUFFIXES = [
  /\binc(orporated)?\.?\b/gi,
  /\bcorp(oration)?\.?\b/gi,
  /\bllc\.?\b/gi,
  /\bltd\.?\b/gi,
  /\bco(mpany)?\.?\b/gi,
  /\bgroup\.?\b/gi,
  /\bservices\.?\b/gi,
  /\bsolutions\.?\b/gi,
  /\btechnologies\.?\b/gi,
  /\bholdings\.?\b/gi,
  /\bplc\.?\b/gi,
];

/**
 * Normalizes a vendor name for matching comparisons.
 * Strips punctuation, normalizes whitespace, converts to lowercase, and optionally strips company suffixes.
 */
export function normalizeVendorName(rawName: string, stripSuffixes = true): string {
  if (!rawName) return "";
  let name = rawName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .toLowerCase()
    .trim();

  if (stripSuffixes) {
    for (const suffix of COMMON_COMPANY_SUFFIXES) {
      name = name.replace(suffix, "");
    }
  }

  return name
    .replace(/[^a-z0-9\s]/gi, " ") // Remove non-alphanumeric
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalizes a URL or domain string into a clean host domain (e.g., "www.sub.att.com" -> "att.com").
 */
export function normalizeDomain(rawDomainOrUrl: string): string {
  if (!rawDomainOrUrl) return "";
  let cleaned = rawDomainOrUrl.trim().toLowerCase();
  
  // If full URL, extract hostname
  if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
    try {
      cleaned = new URL(cleaned).hostname;
    } catch {
      // Fallback regex strip
      cleaned = cleaned.replace(/^https?:\/\//, "").split("/")[0];
    }
  }

  // Strip port if present
  cleaned = cleaned.split(":")[0];

  // Strip leading www.
  cleaned = cleaned.replace(/^www\./, "");

  // Basic registrable domain extraction for common TLDs
  const parts = cleaned.split(".");
  if (parts.length > 2) {
    const secondToLast = parts[parts.length - 2];
    const last = parts[parts.length - 1];
    // Check 2-letter country TLD combos like .co.uk or .com.au
    if (secondToLast.length <= 3 && last.length === 2 && parts.length >= 3) {
      return parts.slice(-3).join(".");
    }
    return parts.slice(-2).join(".");
  }

  return cleaned;
}

/**
 * Normalizes a category string to a URL-friendly slug.
 */
export function normalizeCategorySlug(rawCategory: string): string {
  if (!rawCategory) return "other";
  return rawCategory
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "other";
}
