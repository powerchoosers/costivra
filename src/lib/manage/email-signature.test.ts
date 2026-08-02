import { describe, expect, it } from "vitest";
import { appendEmailSignatureHtml, buildEmailSignatureHtml, normalizeLinkedInUrl } from "./email-signature";

describe("email signatures", () => {
  it("uses available profile details and leaves blank fields out", () => {
    const html = buildEmailSignatureHtml({
      fullName: "Lewis Patterson",
      jobTitle: "Owner",
      phone: "469-555-0123",
      linkedinUrl: "https://www.linkedin.com/in/lewis-patterson",
    });
    expect(html).toContain("Lewis Patterson");
    expect(html).toContain("Owner");
    expect(html).toContain("469-555-0123");
    expect(html).toContain("LinkedIn");
    expect(html).not.toContain("Business cost intelligence");
    expect(html).toContain("costivra.ai");
    expect(html).toContain("Electronic Communications Privacy Act (ECPA)");
    expect(html).toContain("18 U.S.C. §§ 2510–2521");
    expect(html).toContain(">LP<");
  });

  it("uses a CID image only when one is provided", () => {
    expect(buildEmailSignatureHtml({ fullName: "Lewis Patterson", avatarCid: "profile" }))
      .toContain('src="cid:profile"');
    const appended = appendEmailSignatureHtml("<p>Hello</p>", { fullName: "Lewis Patterson" });
    expect(appended).toContain("<p>Hello</p><br>");
    expect(appended).toContain("<table");
    expect(appended).toContain("@media (prefers-color-scheme: dark)");
  });

  it("allows only https LinkedIn profile URLs", () => {
    expect(normalizeLinkedInUrl("http://linkedin.com/in/lewis")).toBeNull();
    expect(normalizeLinkedInUrl("https://example.com/lewis")).toBeNull();
    expect(normalizeLinkedInUrl("https://www.linkedin.com/in/lewis")).toBe("https://www.linkedin.com/in/lewis");
  });
});
