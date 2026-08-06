"use client";

import { useRef, useState, type DragEvent, type FormEvent } from "react";
import {
  CheckCircle2,
  File,
  FileText,
  FileType2,
  LoaderCircle,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";
import {
  submitDocumentUpload,
  waitForDocumentBreakdown,
  type DocumentUploadCompletion,
} from "@/lib/documents/client-upload";

type UploadVendor = {
  relationshipId: string;
  name: string;
};

type UploadState =
  | "idle"
  | "selected"
  | "submitting"
  | "complete"
  | "quarantined"
  | "duplicate"
  | "error";

type UploadStage = "uploading" | "analyzing" | "finalizing";

const stageCopy: Record<UploadStage, { title: string; detail: string }> = {
  uploading: {
    title: "Reading your bill",
    detail:
      "Costivra is securely checking the file and preparing the extracted record.",
  },
  analyzing: {
    title: "Reading your bill",
    detail:
      "Costivra is securely checking the file and preparing the extracted record.",
  },
  finalizing: {
    title: "Reading your bill",
    detail:
      "Costivra is securely checking the file and preparing the extracted record.",
  },
};

function fileExtension(file: File) {
  return file.name.split(".").pop()?.toUpperCase() || "FILE";
}

function fileLabel(file: File) {
  const extension = fileExtension(file);
  if (extension === "PDF") return "PDF document";
  if (extension === "DOCX") return "Word document";
  if (extension === "TXT") return "Text document";
  return file.type || "Document";
}

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileKindIcon({ file }: { file: File }) {
  const extension = fileExtension(file);
  if (extension === "PDF" || extension === "DOCX") {
    return <FileType2 size={24} />;
  }
  if (extension === "TXT") return <FileText size={24} />;
  return <File size={24} />;
}

export function DocumentUploadExperience({
  vendors,
  presetVendor,
  onComplete,
  onCancel,
  onBusyChange,
}: {
  vendors: UploadVendor[];
  presetVendor?: string;
  onComplete: (completion: DocumentUploadCompletion) => void;
  onCancel: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [vendorId, setVendorId] = useState(presetVendor ?? "");
  const [flowState, setFlowState] = useState<UploadState>("idle");
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState<UploadStage | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const busy = flowState === "submitting";
  const selectedVendorName =
    vendors.find((vendor) => vendor.relationshipId === vendorId)?.name ??
    "Unassigned";

  const setFlow = (next: UploadState) => {
    setFlowState(next);
    onBusyChange?.(next === "submitting");
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const resetForClose = (nextState: Extract<UploadState, "complete" | "duplicate" | "quarantined">) => {
    clearSelectedFile();
    setDragging(false);
    setStage(null);
    setErrorMessage(null);
    setVendorId(presetVendor ?? "");
    setFlow(nextState);
  };

  const resetForNewUpload = () => {
    clearSelectedFile();
    setDragging(false);
    setStage(null);
    setErrorMessage(null);
    setVendorId(presetVendor ?? "");
    setFlow("idle");
  };

  const chooseFile = (file: File | null) => {
    if (busy) return;
    setErrorMessage(null);
    setSelectedFile(file);
    setFlow(file ? "selected" : "idle");
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files.item(0));
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile || busy) return;

    const fileForUpload = selectedFile;
    setErrorMessage(null);
    setFlow("submitting");
    setStage("uploading");
    const stageTimer = window.setTimeout(() => setStage("analyzing"), 550);

    try {
      const form = new FormData();
      form.set("file", fileForUpload);
      if (vendorId) form.set("organizationVendorId", vendorId);

      const result = await submitDocumentUpload(form);
      window.clearTimeout(stageTimer);

      if (result.kind === "rejected") {
        clearSelectedFile();
        setStage(null);
        setFlow("error");
        setErrorMessage(
          "File blocked by the security check. The file was not analyzed.",
        );
        return;
      }

      if (result.kind === "duplicate") {
        resetForClose("duplicate");
        onComplete(result);
        return;
      }

      if (result.kind === "quarantined") {
        resetForClose("quarantined");
        onComplete(result);
        return;
      }

      setStage("finalizing");
      const breakdownReady = result.documentId
        ? await waitForDocumentBreakdown(result.documentId)
        : false;
      resetForClose("complete");
      onComplete({ ...result, breakdownReady });
    } catch (error) {
      window.clearTimeout(stageTimer);
      setStage(null);
      setFlow("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  }

  const activeStage = stage ? stageCopy[stage] : null;

  return (
    <form className="document-upload-experience" onSubmit={submit}>
      <label className="portal-field">
        <span>Vendor</span>
        <select
          name="organizationVendorId"
          value={vendorId}
          disabled={busy}
          onChange={(event) => setVendorId(event.target.value)}
        >
          <option value="">No vendor selected</option>
          {vendors.map((vendor) => (
            <option key={vendor.relationshipId} value={vendor.relationshipId}>
              {vendor.name}
            </option>
          ))}
        </select>
      </label>

      <label
        className={`document-upload-dropzone${dragging ? " is-dragging" : ""}${selectedFile ? " has-file" : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          name="file"
          accept=".pdf,.docx,.txt"
          aria-label="Choose a bill file"
          required={!selectedFile}
          disabled={busy}
          onChange={(event) => chooseFile(event.target.files?.item(0) ?? null)}
        />
        {selectedFile ? (
          <div className="document-upload-attachment" role="group" aria-label={`Selected ${selectedFile.name}`}>
            {busy && <span className="document-upload-scan-line" aria-hidden="true" />}
            <span className="document-upload-file-icon" aria-hidden="true">
              <FileKindIcon file={selectedFile} />
              <em>{fileExtension(selectedFile)}</em>
            </span>
            <span className="document-upload-file-copy">
              <strong>{selectedFile.name}</strong>
              <small>
                {fileLabel(selectedFile)} · {fileSize(selectedFile.size)}
              </small>
              <small className="document-upload-vendor">
                Vendor · {selectedVendorName}
              </small>
              {!busy && (
                <span className="document-upload-file-actions">
                  <button
                    type="button"
                    className="document-upload-change"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      inputRef.current?.click();
                    }}
                  >
                    Change file
                  </button>
                </span>
              )}
            </span>
            {!busy ? (
              <button
                type="button"
                className="document-upload-remove"
                aria-label={`Remove ${selectedFile.name}`}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  chooseFile(null);
                }}
              >
                <X size={16} />
              </button>
            ) : null}
          </div>
        ) : (
          <div className="document-upload-empty">
            <span className="document-upload-cloud" aria-hidden="true">
              <UploadCloud size={26} />
            </span>
            <strong>Choose or drop a bill</strong>
            <span>PDF, DOCX, or TXT · 20 MB maximum</span>
          </div>
        )}
      </label>

      {activeStage ? (
        <div className="document-upload-progress" role="status" aria-live="polite">
          <span className="document-upload-orbit" aria-hidden="true">
            <ShieldCheck size={19} />
          </span>
          <div>
            <strong>{activeStage.title}</strong>
            <p>{activeStage.detail}</p>
            <div className="document-upload-progress-line" aria-hidden="true">
              <i />
            </div>
            <ol className="document-upload-status-nodes" aria-label="Upload preparation steps">
              <li className={stage === "uploading" ? "is-current" : ""}>Secure upload</li>
              <li className={stage === "analyzing" ? "is-current" : ""}>Security and integrity check</li>
              <li className={stage === "finalizing" ? "is-current" : ""}>Reading bill details</li>
            </ol>
          </div>
        </div>
      ) : errorMessage ? (
        <div className="document-upload-error" role="alert">
          <strong>{flowState === "error" && !selectedFile ? "File blocked by the security check" : "Upload could not be completed"}</strong>
          <span>{errorMessage}</span>
        </div>
      ) : selectedFile ? (
        <div className="document-upload-ready-note">
          <CheckCircle2 size={17} aria-hidden="true" />
          <span>The attachment is ready for secure upload.</span>
        </div>
      ) : null}

      <div className="portal-form-actions">
        <button
          type="button"
          className="button button-quiet"
          disabled={busy}
          onClick={() => {
            resetForNewUpload();
            onCancel();
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="button button-primary"
          disabled={busy || !selectedFile}
        >
          {busy ? <LoaderCircle className="spin" size={16} /> : <UploadCloud size={16} />}
          {busy ? "Reading your bill…" : "Upload bill"}
        </button>
      </div>

      <style jsx>{`
        .document-upload-experience { display: grid; gap: 16px; }
        .document-upload-dropzone { position: relative; display: block; min-height: 148px; border: 1px dashed rgba(15, 23, 42, .22); border-radius: 18px; background: linear-gradient(145deg, #fbfdff 0%, #f4f7ff 100%); cursor: pointer; overflow: hidden; transition: border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease; }
        .document-upload-dropzone:hover, .document-upload-dropzone:focus-within, .document-upload-dropzone.is-dragging { border-color: rgba(0, 47, 167, .55); box-shadow: 0 18px 45px rgba(15, 44, 104, .1); transform: translateY(-1px); }
        .document-upload-dropzone input { position: absolute; inset: 0; z-index: 1; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
        .document-upload-empty { min-height: 148px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px; color: #475569; text-align: center; padding: 24px; }
        .document-upload-empty strong { color: #0f172a; font-size: .98rem; }
        .document-upload-empty span:last-child { font-size: .8rem; }
        .document-upload-cloud { width: 50px; height: 50px; display: inline-flex; align-items: center; justify-content: center; border-radius: 16px; color: #002fa7; background: rgba(0, 47, 167, .08); box-shadow: inset 0 0 0 1px rgba(0, 47, 167, .08); }
        .document-upload-attachment { position: relative; min-height: 122px; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 14px; padding: 18px; overflow: hidden; }
        .document-upload-scan-line { position: absolute; z-index: 0; top: 0; bottom: 0; left: -20%; width: 22%; background: linear-gradient(90deg, transparent, rgba(0, 47, 167, .14), transparent); animation: documentUploadScan 1.7s ease-in-out infinite; pointer-events: none; }
        .document-upload-file-icon, .document-upload-file-copy, .document-upload-remove { position: relative; z-index: 2; }
        .document-upload-file-icon { width: 54px; height: 62px; display: inline-flex; align-items: center; justify-content: center; border-radius: 14px; color: #002fa7; background: #fff; box-shadow: 0 10px 24px rgba(15, 44, 104, .12), inset 0 0 0 1px rgba(0, 47, 167, .1); }
        .document-upload-file-icon em { position: absolute; bottom: -5px; right: -7px; padding: 3px 5px; border-radius: 6px; background: #002fa7; color: #fff; font-size: .56rem; font-style: normal; font-weight: 800; letter-spacing: .04em; }
        .document-upload-file-copy { min-width: 0; display: grid; gap: 5px; }
        .document-upload-file-copy strong { overflow: hidden; color: #0f172a; font-size: .91rem; text-overflow: ellipsis; white-space: nowrap; }
        .document-upload-file-copy small { color: #64748b; font-size: .76rem; }
        .document-upload-vendor { color: #405a80 !important; font-weight: 650; }
        .document-upload-file-actions { display: flex; }
        .document-upload-change { position: relative; z-index: 3; border: 0; padding: 0; color: #1746c8; background: transparent; font: 700 .72rem/1.2 inherit; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
        .document-upload-remove { width: 34px; height: 34px; display: inline-flex; align-items: center; justify-content: center; border: 1px solid transparent; border-radius: 10px; background: transparent; color: #64748b; cursor: pointer; }
        .document-upload-remove:hover, .document-upload-remove:focus-visible { border-color: rgba(15, 23, 42, .1); background: #fff; color: #0f172a; }
        .document-upload-progress { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 13px; align-items: center; padding: 14px 15px; border: 1px solid rgba(0, 47, 167, .12); border-radius: 15px; background: rgba(0, 47, 167, .045); }
        .document-upload-progress strong { display: block; color: #0f172a; font-size: .85rem; }
        .document-upload-progress p { margin: 3px 0 9px; color: #64748b; font-size: .75rem; line-height: 1.45; }
        .document-upload-orbit { position: relative; width: 43px; height: 43px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; color: #002fa7; background: #fff; }
        .document-upload-orbit::before { content: ""; position: absolute; inset: -3px; border-radius: inherit; background: conic-gradient(from 0deg, transparent 0 20%, #002fa7 48%, #7c9cff 70%, transparent 92%); mask: radial-gradient(circle, transparent 61%, #000 63%); animation: documentUploadOrbit 1.15s linear infinite; }
        .document-upload-progress-line { height: 4px; overflow: hidden; border-radius: 999px; background: rgba(0, 47, 167, .1); }
        .document-upload-progress-line i { display: block; width: 42%; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #002fa7, #7c9cff, #002fa7); animation: documentUploadSweep 1.3s ease-in-out infinite; }
        .document-upload-status-nodes { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin: 10px 0 0; padding: 0; list-style: none; color: #667892; font-size: .62rem; line-height: 1.3; }
        .document-upload-status-nodes li { position: relative; padding-left: 13px; }
        .document-upload-status-nodes li::before { content: ""; position: absolute; top: .34em; left: 0; width: 7px; height: 7px; border: 1px solid #91a4c4; border-radius: 50%; background: #fff; }
        .document-upload-status-nodes li.is-current { color: #1746c8; font-weight: 700; }
        .document-upload-status-nodes li.is-current::before { border-color: #1746c8; background: #1746c8; box-shadow: 0 0 0 3px rgba(23, 70, 200, .1); }
        .document-upload-ready-note { display: flex; align-items: center; gap: 8px; color: #1f6b48; font-size: .8rem; }
        .document-upload-error { display: grid; gap: 4px; padding: 12px 14px; border: 1px solid rgba(180, 50, 35, .2); border-radius: 13px; color: #7f1d1d; background: rgba(254, 226, 226, .62); font-size: .78rem; line-height: 1.45; }
        .document-upload-error strong { font-size: .82rem; }
        .portal-form-actions button { gap: 7px; }
        @keyframes documentUploadOrbit { to { transform: rotate(360deg); } }
        @keyframes documentUploadSweep { 0% { transform: translateX(-115%); } 55%, 100% { transform: translateX(275%); } }
        @keyframes documentUploadScan { 0% { transform: translateX(0); } 100% { transform: translateX(650%); } }
        @media (prefers-reduced-motion: reduce) { .document-upload-dropzone, .document-upload-orbit::before, .document-upload-progress-line i, .document-upload-scan-line { animation: none; transition: none; } }
        @media (max-width: 560px) { .document-upload-attachment { grid-template-columns: auto minmax(0, 1fr); padding: 16px; } .document-upload-remove { position: absolute; z-index: 4; top: 9px; right: 9px; } .document-upload-status-nodes { grid-template-columns: 1fr; gap: 5px; } }
      `}</style>
    </form>
  );
}
