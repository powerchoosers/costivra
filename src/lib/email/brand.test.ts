import { describe, expect, it } from "vitest";
import {
  brandedEmailHtml,
  COSTIVRA_EMAIL_LOGO_URL,
  escapeEmailHtml,
} from "./brand";

describe("Costivra email branding", () => {
  it("uses the production logo and Costivra brand shell", () => {
    const html = brandedEmailHtml({
      preview: "Inquiry received",
      heading: "We received your inquiry.",
      bodyHtml: "<p>Safe content</p>",
    });

    expect(html).toContain(COSTIVRA_EMAIL_LOGO_URL);
    expect(html).toContain('alt="Costivra"');
    expect(html).toContain("Every recurring cost, under command.");
  });

  it("escapes untrusted text used in headings and links", () => {
    const html = brandedEmailHtml({
      preview: "<unsafe>",
      heading: 'A & B "review"',
      bodyHtml: "<p>Trusted template content</p>",
      cta: { label: "Open & review", href: 'https://costivra.ai/?q="x"' },
    });

    expect(html).toContain("&lt;unsafe&gt;");
    expect(html).toContain("A &amp; B &quot;review&quot;");
    expect(html).toContain("Open &amp; review");
    expect(escapeEmailHtml("<script>")).toBe("&lt;script&gt;");
  });
});
