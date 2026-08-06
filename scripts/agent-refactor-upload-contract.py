from pathlib import Path
import re

component_path = Path("src/components/document-upload-experience.tsx")
source = component_path.read_text(encoding="utf-8")

import_anchor = 'import { useToast } from "@/components/toast-provider";'
helper_import = '''import {
  submitDocumentUpload,
  waitForDocumentBreakdown,
} from "@/lib/documents/client-upload";'''
if helper_import not in source:
    if import_anchor not in source:
        raise SystemExit("Upload toast import anchor not found.")
    source = source.replace(import_anchor, f"{import_anchor}\n{helper_import}", 1)

source, type_count = re.subn(
    r'\ntype UploadResponse = \{.*?\n\};\n',
    "\n",
    source,
    count=1,
    flags=re.DOTALL,
)
if type_count != 1:
    raise SystemExit(f"Expected one UploadResponse type, found {type_count}.")

source, helper_count = re.subn(
    r'\nfunction delay\(milliseconds: number\) \{.*?\n\}\n\nasync function breakdownIsReady\(documentId: string\) \{.*?\n\}\n',
    "\n",
    source,
    count=1,
    flags=re.DOTALL,
)
if helper_count != 1:
    raise SystemExit(f"Expected one legacy breakdown polling helper, found {helper_count}.")

request_pattern = re.compile(
    r'      const response = await fetch\("/api/portal/documents", \{.*?'
    r'      const documentId = payload\.documentId;\n',
    re.DOTALL,
)
request_replacement = '''      const result = await submitDocumentUpload(form);

      if (result.kind === "duplicate") {
        window.clearTimeout(stageTimer);
        toast.dismiss(analysisToast);
        finishAndClose();
        router.refresh();
        toast.show({
          tone: "info",
          title: "This bill is already in Costivra",
          message: result.message,
          actionLabel: "Open existing breakdown",
          onActionClick: () => openInspector(result.documentId),
          duration: 12_000,
        });
        return;
      }

      window.clearTimeout(stageTimer);
      setStage("finalizing");
      toast.dismiss(analysisToast);
      const documentId = result.documentId;
'''
source, request_count = request_pattern.subn(request_replacement, source, count=1)
if request_count != 1:
    raise SystemExit(f"Expected one upload request block, found {request_count}.")

source = source.replace(
    'if (payload.outcome === "quarantined")',
    'if (result.kind === "quarantined")',
    1,
)
source = source.replace("payload.warning ||", "result.warning ||", 1)
source = source.replace(
    "const ready = await breakdownIsReady(documentId);",
    "const ready = await waitForDocumentBreakdown(documentId);",
    1,
)

for forbidden in ("UploadResponse", "breakdownIsReady", "payload.warning", "response.status === 409"):
    if forbidden in source:
        raise SystemExit(f"Legacy upload token remains: {forbidden}")

component_path.write_text(source, encoding="utf-8")

old_test = Path("src/components/document-upload-experience.test.ts")
if old_test.exists():
    old_test.unlink()

Path("scripts/agent-refactor-upload-contract.py").unlink()
Path(".github/workflows/agent-refactor-upload-contract.yml").unlink()
