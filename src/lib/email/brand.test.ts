import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
    expect(html).toContain("Find the leak. Prove the value. Recover with confidence.");
    expect(html).toContain('href="https://costivra.ai/privacy"');
    expect(html).toContain('href="https://costivra.ai/security"');
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

  it("keeps the Supabase recovery template on the scanner-safe Costivra flow", () => {
    const template = readFileSync(
      resolve(process.cwd(), "docs/SUPABASE_RECOVERY_EMAIL_TEMPLATE.html"),
      "utf8",
    );

    expect(template).toContain("{{ .SiteURL }}/confirm-recovery?token_hash={{ .TokenHash }}");
    expect(template).not.toContain("{{ .ConfirmationURL }}");
    expect(template).not.toContain("confirm=1");
    expect(template).toContain("Find the leak. Prove the value. Recover with confidence.");
    expect(template).toContain("costivra-circuit-mark-cropped.png");
  });
});
