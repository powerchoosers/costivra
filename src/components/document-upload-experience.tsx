"use client";

import { useRef, useState, type DragEvent, type FormEvent } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  File,
  FileText,
  FileType2,
  LoaderCircle,
  MagnifyingGlass,
  ShieldCheck,
  UploadCloud,
  X,
} from "@/lib/icons";
import {
  submitDocumentUpload,
  waitForDocumentBreakdown,
  type DocumentUploadCompletion,
} from "@/lib/documents/client-upload";
import { DocumentUploadRequestError } from "@/lib/documents/client-upload";

type UploadVendor = {
  relationshipId: string;
  vendorId: string;
  name: string;
};

type CatalogVendor = {
  id: string;
  name: string;
  category: string;
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
  if (extension === "PNG") return "PNG image";
  if (extension === "JPG" || extension === "JPEG") return "JPEG image";
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
  vendorCatalog,
  presetVendor,
  onComplete,
  onCancel,
  onBusyChange,
}: {
  vendors: UploadVendor[];
  vendorCatalog: CatalogVendor[];
  presetVendor?: string;
  onComplete: (completion: DocumentUploadCompletion) => void;
  onCancel: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [vendorId, setVendorId] = useState(presetVendor ?? "");
  const [selectedVendorLabel, setSelectedVendorLabel] = useState<string | null>(null);
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorSearchMode, setVendorSearchMode] = useState(false);
  const [vendorPickerOpen, setVendorPickerOpen] = useState(false);
  const [vendorPickerBusy, setVendorPickerBusy] = useState(false);
  const [flowState, setFlowState] = useState<UploadState>("idle");
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState<UploadStage | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const busy = flowState === "submitting";
  const selectedVendorName =
    selectedVendorLabel ??
    vendors.find((vendor) => vendor.relationshipId === vendorId)?.name ??
    "Unassigned";
  const filteredCatalog = vendorCatalog
    .filter((vendor) => {
      const query = vendorSearch.trim().toLowerCase();
      return !query || `${vendor.name} ${vendor.category}`.toLowerCase().includes(query);
    })
    .slice(0, 30);

  async function chooseVendor(catalogVendor: CatalogVendor) {
    const existing = vendors.find((vendor) => vendor.vendorId === catalogVendor.id);
    if (existing) {
      setVendorId(existing.relationshipId);
      setSelectedVendorLabel(existing.name);
      setVendorPickerOpen(false);
      return;
    }
    setVendorPickerBusy(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/portal/vendors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ vendorId: catalogVendor.id }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || typeof body.relationshipId !== "string") {
        throw new Error(typeof body.error === "string" ? body.error : "That vendor could not be added to this workspace.");
      }
      setVendorId(body.relationshipId);
      setSelectedVendorLabel(catalogVendor.name);
      setVendorPickerOpen(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "That vendor could not be selected.");
    } finally {
      setVendorPickerBusy(false);
    }
  }

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
    setErrorCode(null);
    setVendorId(presetVendor ?? "");
    setSelectedVendorLabel(null);
    setVendorSearch("");
    setVendorSearchMode(false);
    setVendorPickerOpen(false);
    setFlow(nextState);
  };

  const resetForNewUpload = () => {
    clearSelectedFile();
    setDragging(false);
    setStage(null);
    setErrorMessage(null);
    setErrorCode(null);
    setVendorId(presetVendor ?? "");
    setSelectedVendorLabel(null);
    setVendorSearch("");
    setVendorSearchMode(false);
    setVendorPickerOpen(false);
    setFlow("idle");
  };

  const chooseFile = (file: File | null) => {
    if (busy) return;
    setErrorMessage(null);
    setErrorCode(null);
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
      setErrorCode(error instanceof DocumentUploadRequestError ? error.code : null);
    }
  }

  const activeStage = stage ? stageCopy[stage] : null;

  return (
    <form className="document-upload-experience" onSubmit={submit}>
      <div className="portal-field document-upload-vendor-picker">
        <span>Vendor</span>
        <input type="hidden" name="organizationVendorId" value={vendorId} />
        <div className="document-upload-vendor-control">
          {vendorSearchMode ? (
            <input
              className="document-upload-vendor-search"
              autoFocus
              value={vendorSearch}
              disabled={busy || vendorPickerBusy}
              onChange={(event) => { setVendorSearch(event.target.value); setVendorPickerOpen(Boolean(event.target.value.trim())); }}
              placeholder="Search all vendors"
              aria-label="Search all vendors"
            />
          ) : (
            <button type="button" className="document-upload-vendor-trigger" disabled={busy || vendorPickerBusy} onClick={() => setVendorPickerOpen((open) => !open)} aria-haspopup="listbox" aria-expanded={vendorPickerOpen}>
              {selectedVendorName}
            </button>
          )}
          <button type="button" className={`document-upload-vendor-search-button${vendorSearchMode ? " is-active" : ""}`} disabled={busy || vendorPickerBusy} onClick={() => { setVendorSearchMode((active) => !active); setVendorSearch(""); setVendorPickerOpen(false); }} aria-label={vendorSearchMode ? "Show existing vendors" : "Search all vendors"} title={vendorSearchMode ? "Show existing vendors" : "Search all vendors"}>
            <MagnifyingGlass size={16} />
          </button>
        </div>
        {vendorPickerOpen && !busy && (
          <div className="document-upload-vendor-results" role="listbox" aria-label="Available vendors">
            <button type="button" className="document-upload-vendor-clear" onClick={() => { setVendorId(""); setSelectedVendorLabel(null); setVendorSearch(""); setVendorPickerOpen(false); }}>No vendor selected</button>
            {!vendorSearchMode && vendors.map((vendor) => (
              <button type="button" role="option" aria-selected={vendor.relationshipId === vendorId} key={vendor.relationshipId} onClick={() => { setVendorId(vendor.relationshipId); setSelectedVendorLabel(vendor.name); setVendorPickerOpen(false); }} disabled={vendorPickerBusy}>
                <strong>{vendor.name}</strong>
              </button>
            ))}
            {vendorSearchMode && vendorSearch.trim() && filteredCatalog.map((vendor) => (
              <button type="button" role="option" aria-selected={vendor.id === vendorId} key={vendor.id} onClick={() => void chooseVendor(vendor)} disabled={vendorPickerBusy}>
                <strong>{vendor.name}</strong><small>{vendor.category}</small>
              </button>
            ))}
            {vendorSearchMode && vendorSearch.trim() && filteredCatalog.length === 0 && <small className="document-upload-vendor-empty">No shared vendor matches that search.</small>}
          </div>
        )}
      </div>

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
          accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,image/png,image/jpeg"
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
            <span>PDF, DOCX, TXT, PNG, or JPG · 20 MB maximum</span>
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
      ) : errorCode === "FREE_REVIEW_LIMIT_REACHED" ? (
        <div className="document-upload-upgrade-state" role="status">
          <span className="document-upload-upgrade-mark"><ShieldCheck size={22} /></span>
          <strong>Your free review is complete.</strong>
          <p>You’ve reached the three-bill limit. Subscribe to keep analyzing bills, retain the full evidence history, and unlock ongoing monitoring.</p>
          <Link className="button button-primary" href="/pricing?from=free-review">See paid plans <UploadCloud size={15} /></Link>
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
        .document-upload-vendor-picker { position: relative; display: grid; gap: 7px; }
        .document-upload-vendor-control { display: flex; min-height: 42px; border: 1px solid rgba(15, 23, 42, .14); border-radius: 11px; background: #fff; }
        .document-upload-vendor-search { width: 100%; min-height: 40px; border: 0; border-radius: 11px; padding: 0 13px; outline: 0; background: #fff; color: #172033; font: inherit; }
        .document-upload-vendor-trigger { min-width: 0; flex: 1; overflow: hidden; border: 0; border-radius: 11px; padding: 0 13px; background: transparent; color: #172033; font: inherit; text-align: left; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
        .document-upload-vendor-search-button { display: grid; width: 42px; flex: 0 0 auto; place-items: center; border: 0; border-left: 1px solid rgba(15, 23, 42, .08); border-radius: 0 10px 10px 0; background: transparent; color: #65748b; cursor: pointer; }
        .document-upload-vendor-search-button:hover, .document-upload-vendor-search-button.is-active { color: #1749b5; background: #f1f5ff; }
        .document-upload-vendor-search:focus { outline: 2px solid rgba(0, 47, 167, .2); border-color: #1749b5; }
        .document-upload-vendor-results { position: absolute; z-index: 8; top: 68px; left: 0; right: 0; max-height: 260px; overflow: auto; overscroll-behavior: contain; padding: 6px; border: 1px solid rgba(15, 23, 42, .12); border-radius: 14px; background: #fff; box-shadow: 0 18px 40px rgba(15, 23, 42, .16); }
        .document-upload-vendor-results button { width: 100%; display: grid; gap: 2px; border: 0; border-radius: 9px; padding: 9px 10px; background: transparent; color: #172033; text-align: left; cursor: pointer; }
        .document-upload-vendor-results button:hover, .document-upload-vendor-results button[aria-selected="true"] { background: #f0f4ff; }
        .document-upload-vendor-results small, .document-upload-vendor-empty { color: #6b7280; font-size: 11px; }
        .document-upload-vendor-clear { border-bottom: 1px solid rgba(15, 23, 42, .08) !important; color: #5b6473 !important; }
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
        .document-upload-upgrade-state { display:grid; gap:8px; padding:17px; border:1px solid #d5e5aa; border-radius:16px; color:#405b12; background:#fbfff2; }
        .document-upload-upgrade-mark { display:grid; width:40px; height:40px; place-items:center; border-radius:13px; color:#52770b; background:#efffc9; }
        .document-upload-upgrade-state strong { color:#365707; font-size:.9rem; }
        .document-upload-upgrade-state p { margin:0; color:#65783b; font-size:.76rem; line-height:1.5; }
        .document-upload-upgrade-state a { width:max-content; margin-top:4px; }
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
