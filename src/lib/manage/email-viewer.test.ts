import { describe, expect, it } from "vitest";
import { buildEmailViewerDocument } from "./email-viewer";

describe("email viewer document", () => {
  it("keeps email HTML isolated while blocking remote images by default", () => {
    const document = buildEmailViewerDocument({
      htmlBody: '<img src="https://tracker.example/pixel"><table><tr><td>Hello</td></tr></table>',
      textBody: null,
      blockExternalImages: true,
    });

    expect(document).toContain('<img src="https://tracker.example/pixel">');
    expect(document).toContain("img-src data: cid:");
    expect(document).toContain("default-src 'none'");
    expect(document).toContain('<base target="_blank">');
  });

  it("allows an operator to load remote images and falls back to escaped text", () => {
    const document = buildEmailViewerDocument({
      htmlBody: null,
      textBody: "<Invoice received>",
      blockExternalImages: false,
    });

    expect(document).toContain("img-src data: cid: https: http:");
    expect(document).toContain("&lt;Invoice received&gt;");
  });

  it("removes markup that can alter the viewer document itself", () => {
    const document = buildEmailViewerDocument({
      htmlBody: '<base href="https://unsafe.example"><meta http-equiv="refresh" content="0"><p>Safe</p>',
      textBody: null,
      blockExternalImages: true,
    });

    expect(document).not.toContain("unsafe.example");
    expect(document).not.toContain('content="0"');
    expect(document).toContain("<p>Safe</p>");
  });
});
