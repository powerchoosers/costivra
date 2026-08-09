const allowedEmailTags = new Set([
  "a", "b", "blockquote", "br", "code", "div", "em", "h1", "h2", "h3",
  "font", "hr", "i", "li", "ol", "p", "pre", "s", "span", "strike", "strong", "u", "ul",
]);

/**
 * Keep the email preview and outbound renderer on the same conservative HTML
 * contract. This module has no Node-only imports so it can safely run in the
 * browser preview as well as on the server.
 */
export function sanitizeEmailHtml(value: string) {
  return value
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object|embed|form|input|button|meta|link)[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(script|style|iframe|object|embed|form|input|button|meta|link)\b[^>]*\/?\s*>/gi, "")
    .replace(/<\/?([a-z0-9-]+)([^>]*)>/gi, (match, rawTag: string, rawAttributes: string) => {
      const tag = rawTag.toLowerCase();
      if (!allowedEmailTags.has(tag)) return "";
      if (match.startsWith("</")) return `</${tag}>`;
      if (tag === "font") {
        const colorMatch = rawAttributes.match(/color\s*=\s*["']?(#[0-9a-f]{3,6})["']?/i);
        return colorMatch ? `<font color="${colorMatch[1]}">` : "<font>";
      }
      if (tag !== "a") {
        const safeStyles: string[] = [];
        const styleMatch = rawAttributes.match(/style\s*=\s*["']([^"']+)["']/i);
        for (const declaration of styleMatch?.[1]?.split(";") ?? []) {
          const [rawProperty, rawValue] = declaration.split(":");
          const property = rawProperty?.trim().toLowerCase();
          const cssValue = rawValue?.trim().toLowerCase();
          if (property === "text-align" && /^(left|center|right|justify)$/.test(cssValue)) safeStyles.push(`text-align:${cssValue}`);
          if (property === "margin-left" && /^(?:[0-9]|[1-5][0-9]|60)(?:px)?$/.test(cssValue)) safeStyles.push(`margin-left:${cssValue}`);
        }
        const alignMatch = rawAttributes.match(/align\s*=\s*["']?(left|center|right|justify)["']?/i);
        if (alignMatch && !safeStyles.some((style) => style.startsWith("text-align:"))) safeStyles.push(`text-align:${alignMatch[1].toLowerCase()}`);
        return safeStyles.length ? `<${tag} style="${safeStyles.join(";")}">` : `<${tag}>`;
      }
      const hrefMatch = rawAttributes.match(/href\s*=\s*["']([^"']+)["']/i);
      const href = hrefMatch?.[1]?.trim() ?? "";
      if (!/^(https?:|mailto:)/i.test(href)) return "<a>";
      const safeHref = href.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
      return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">`;
    })
    .trim();
}
