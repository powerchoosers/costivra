import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf-8");

describe("document upload experience integration", () => {
  it("uses the attachment-aware upload experience and does not auto-open analysis", () => {
    const portal = readSource("src/components/portal-pages.tsx");
    const upload = readSource("src/components/document-upload-experience.tsx");

    expect(portal).toContain("<DocumentUploadExperience");
    expect(portal).not.toContain("handleDocumentUpload");
    expect(portal).not.toContain("openInspector(docId)");
    expect(upload).toContain("Bill breakdown ready");
    expect(upload).toContain("Open breakdown");
    expect(upload).toContain("Uploading securely");
    expect(upload).toContain("Security scan and bill analysis");
  });

  it("queries only live document columns for the breakdown", () => {
    const route = readSource(
      "src/app/api/portal/documents/[id]/breakdown/route.ts",
    );

    expect(route).toContain("storage_path, sha256");
    expect(route).not.toContain("security_scan_status");
    expect(route).not.toContain("security_scanned_at");
    expect(route).not.toContain("sha256_digest");
    expect(route).toContain("Document analysis could not be loaded.");
  });
});
