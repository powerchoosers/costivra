from pathlib import Path
import re

portal_path = Path("src/components/portal-pages.tsx")
source = portal_path.read_text(encoding="utf-8")

old_import = 'import { useBillInspector } from "@/components/bill-inspector-provider";'
new_import = 'import { DocumentUploadExperience } from "@/components/document-upload-experience";'
if old_import not in source:
    raise SystemExit("Expected bill inspector import was not found.")
source = source.replace(old_import, new_import, 1)

handler_pattern = re.compile(
    r'\n  const toast = useToast\(\);\n'
    r'  const \{ openInspector \} = useBillInspector\(\);\n\n'
    r'  async function handleDocumentUpload\(e: FormEvent<HTMLFormElement>\) \{.*?\n'
    r'  \}\n\n'
    r'  return \(',
    re.DOTALL,
)
source, handler_count = handler_pattern.subn("\n  return (", source, count=1)
if handler_count != 1:
    raise SystemExit(f"Expected one legacy upload handler, found {handler_count}.")

form_pattern = re.compile(
    r'        <form onSubmit=\{handleDocumentUpload\}>.*?        </form>',
    re.DOTALL,
)
replacement = '''        <DocumentUploadExperience
          vendors={data.vendors.map((vendor) => ({
            relationshipId: vendor.relationshipId,
            name: vendor.name,
          }))}
          presetVendor={presetVendor}
          onBusyChange={setBusy}
          onComplete={() => setKind(null)}
        />'''
source, form_count = form_pattern.subn(replacement, source, count=1)
if form_count != 1:
    raise SystemExit(f"Expected one legacy upload form, found {form_count}.")

for forbidden in ("handleDocumentUpload", "useBillInspector", "openInspector(docId)"):
    if forbidden in source:
        raise SystemExit(f"Legacy upload token remains: {forbidden}")

portal_path.write_text(source, encoding="utf-8")

test_path = Path("src/components/document-upload-experience.test.ts")
test_path.write_text(
    '''import { readFileSync } from "node:fs";\nimport { join } from "node:path";\nimport { describe, expect, it } from "vitest";\n\nconst readSource = (path: string) =>\n  readFileSync(join(process.cwd(), path), "utf-8");\n\ndescribe("document upload experience integration", () => {\n  it("uses the attachment-aware upload experience and does not auto-open analysis", () => {\n    const portal = readSource("src/components/portal-pages.tsx");\n    const upload = readSource("src/components/document-upload-experience.tsx");\n\n    expect(portal).toContain("<DocumentUploadExperience");\n    expect(portal).not.toContain("handleDocumentUpload");\n    expect(portal).not.toContain("openInspector(docId)");\n    expect(upload).toContain("Bill breakdown ready");\n    expect(upload).toContain("Open breakdown");\n    expect(upload).toContain("Uploading securely");\n    expect(upload).toContain("Security scan and bill analysis");\n  });\n\n  it("queries only live document columns for the breakdown", () => {\n    const route = readSource(\n      "src/app/api/portal/documents/[id]/breakdown/route.ts",\n    );\n\n    expect(route).toContain("storage_path, sha256");\n    expect(route).not.toContain("security_scan_status");\n    expect(route).not.toContain("security_scanned_at");\n    expect(route).not.toContain("sha256_digest");\n    expect(route).toContain("Document analysis could not be loaded.");\n  });\n});\n''',
    encoding="utf-8",
)

Path("scripts/agent-apply-bill-upload-fix.py").unlink()
Path(".github/workflows/agent-apply-bill-upload-fix.yml").unlink()
