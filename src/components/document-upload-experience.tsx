"use client";

import { useRef, useState, type DragEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  FileText,
  LoaderCircle,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";
import { useBillInspector } from "@/components/bill-inspector-provider";
import { useToast } from "@/components/toast-provider";
import {
  submitDocumentUpload,
  waitForDocumentBreakdown,
} from "@/lib/documents/client-upload";

type UploadVendor = {
  relationshipId: string;
  name: string;
};


type UploadStage = "idle" | "uploading" | "analyzing" | "finalizing";

const stageCopy: Record<Exclude<UploadStage, "idle">, { title: string; detail: string }> = {
  uploading: {
    title: "Uploading securely",
    detail: "Sending the original file into your private Costivra workspace.",
  },
  analyzing: {
    title: "Security scan and bill analysis",
    detail: "Costivra is checking the file, extracting fields, and preserving source evidence.",
  },
  finalizing: {
    title: "Preparing your breakdown",
    detail: "The document is saved. Costivra is making the reviewed record available.",
  },
};

function fileLabel(file: File) {
  const extension = file.name.split(".").pop()?.toUpperCase();
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


export function DocumentUploadExperience({
  vendors,
  presetVendor,
  onComplete,
  onBusyChange,
}: {
  vendors: UploadVendor[];
  presetVendor?: string;
  onComplete: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const { openInspector } = useBillInspector();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [vendorId, setVendorId] = useState(presetVendor ?? "");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState<UploadStage>("idle");

  const setUploadBusy = (value: boolean) => {
    setBusy(value);
    onBusyChange?.(value);
  };

  const chooseFile = (file: File | null) => {
    if (busy) return;
    setSelectedFile(file);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files.item(0));
  };

  const finishAndClose = () => {
    setUploadBusy(false);
    onComplete();
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile || busy) return;

    setUploadBusy(true);
    setStage("uploading");
    const analysisToast = toast.show({
      tone: "info",
      title: "Uploading your bill",
      message: `${selectedFile.name} is being securely scanned and analyzed.`,
      duration: 20_000,
    });

    const stageTimer = window.setTimeout(() => setStage("analyzing"), 550);

    try {
      const form = new FormData();
      form.set("file", selectedFile);
      if (vendorId) form.set("organizationVendorId", vendorId);

      const result = await submitDocumentUpload(form);

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

      if (result.kind === "quarantined") {
        finishAndClose();
        router.refresh();
        toast.show({
          tone: "warning",
          title: "Bill safely quarantined",
          message:
            result.warning ||
            "The security scan could not finish. The file is private and has not been analyzed.",
          actionHref: documentId ? `/app/documents/${documentId}` : "/app/documents",
          actionLabel: "View document status",
          duration: 12_000,
        });
        return;
      }

      finishAndClose();
      router.refresh();

      if (!documentId) {
        toast.success(
          "Bill uploaded",
          "The source document is saved. Open Documents to review its processing status.",
        );
        return;
      }

      const finalizingToast = toast.show({
        tone: "info",
        title: "Bill uploaded",
        message: "Costivra is finalizing the document breakdown.",
        duration: 12_000,
      });
      const ready = await waitForDocumentBreakdown(documentId);
      toast.dismiss(finalizingToast);
      router.refresh();

      if (ready) {
        toast.show({
          tone: "success",
          title: "Bill breakdown ready",
          message: `${selectedFile.name} is ready to review.`,
          actionLabel: "Open breakdown",
          onActionClick: () => openInspector(documentId),
          duration: 14_000,
        });
      } else {
        toast.show({
          tone: "info",
          title: "Bill saved and still processing",
          message:
            "The document is in your workspace. Costivra will keep its status visible in Documents while review finishes.",
          actionHref: `/app/documents/${documentId}`,
          actionLabel: "View document",
          duration: 12_000,
        });
      }
    } catch (error) {
      window.clearTimeout(stageTimer);
      toast.dismiss(analysisToast);
      setStage("idle");
      setUploadBusy(false);
      toast.error(
        "Upload failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  }

  const activeStage = stage === "idle" ? null : stageCopy[stage];

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
          required
          disabled={busy}
          onChange={(event) => chooseFile(event.target.files?.item(0) ?? null)}
        />
        {selectedFile ? (
          <div className="document-upload-attachment">
            <span className="document-upload-file-icon" aria-hidden="true">
              <FileText size={24} />
              <em>{selectedFile.name.split(".").pop()?.toUpperCase() || "FILE"}</em>
            </span>
            <span className="document-upload-file-copy">
              <strong>{selectedFile.name}</strong>
              <small>
                {fileLabel(selectedFile)} · {fileSize(selectedFile.size)}
              </small>
            </span>
            {!busy ? (
              <button
                type="button"
                aria-label={`Remove ${selectedFile.name}`}
                onClick={(event) => {
                  event.preventDefault();
                  chooseFile(null);
                  if (inputRef.current) inputRef.current.value = "";
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
          </div>
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
          onClick={onComplete}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="button button-primary"
          disabled={busy || !selectedFile}
        >
          {busy ? <LoaderCircle className="spin" size={16} /> : <UploadCloud size={16} />}
          {busy ? "Analyzing bill…" : "Upload and analyze bill"}
        </button>
      </div>

      <style jsx>{`
        .document-upload-experience {
          display: grid;
          gap: 16px;
        }
        .document-upload-dropzone {
          position: relative;
          display: block;
          min-height: 148px;
          border: 1px dashed rgba(15, 23, 42, 0.22);
          border-radius: 18px;
          background: linear-gradient(145deg, #fbfdff 0%, #f4f7ff 100%);
          cursor: pointer;
          overflow: hidden;
          transition: border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease;
        }
        .document-upload-dropzone:hover,
        .document-upload-dropzone:focus-within,
        .document-upload-dropzone.is-dragging {
          border-color: rgba(0, 47, 167, 0.55);
          box-shadow: 0 18px 45px rgba(15, 44, 104, 0.1);
          transform: translateY(-1px);
        }
        .document-upload-dropzone input {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
        }
        .document-upload-empty {
          min-height: 148px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 7px;
          color: #475569;
          text-align: center;
          padding: 24px;
        }
        .document-upload-empty strong {
          color: #0f172a;
          font-size: 0.98rem;
        }
        .document-upload-empty span:last-child {
          font-size: 0.8rem;
        }
        .document-upload-cloud {
          width: 50px;
          height: 50px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          color: #002fa7;
          background: rgba(0, 47, 167, 0.08);
          box-shadow: inset 0 0 0 1px rgba(0, 47, 167, 0.08);
        }
        .document-upload-attachment {
          min-height: 112px;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 14px;
          padding: 18px;
        }
        .document-upload-file-icon {
          position: relative;
          width: 54px;
          height: 62px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          color: #002fa7;
          background: #ffffff;
          box-shadow: 0 10px 24px rgba(15, 44, 104, 0.12), inset 0 0 0 1px rgba(0, 47, 167, 0.1);
        }
        .document-upload-file-icon em {
          position: absolute;
          bottom: -5px;
          right: -7px;
          padding: 3px 5px;
          border-radius: 6px;
          background: #002fa7;
          color: #ffffff;
          font-size: 0.56rem;
          font-style: normal;
          font-weight: 800;
          letter-spacing: 0.04em;
        }
        .document-upload-file-copy {
          min-width: 0;
          display: grid;
          gap: 5px;
        }
        .document-upload-file-copy strong {
          overflow: hidden;
          color: #0f172a;
          font-size: 0.91rem;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .document-upload-file-copy small {
          color: #64748b;
          font-size: 0.76rem;
        }
        .document-upload-attachment button {
          position: relative;
          z-index: 2;
          width: 34px;
          height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid transparent;
          border-radius: 10px;
          background: transparent;
          color: #64748b;
          cursor: pointer;
        }
        .document-upload-attachment button:hover,
        .document-upload-attachment button:focus-visible {
          border-color: rgba(15, 23, 42, 0.1);
          background: #ffffff;
          color: #0f172a;
        }
        .document-upload-progress {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 13px;
          align-items: center;
          padding: 14px 15px;
          border: 1px solid rgba(0, 47, 167, 0.12);
          border-radius: 15px;
          background: rgba(0, 47, 167, 0.045);
        }
        .document-upload-progress strong {
          display: block;
          color: #0f172a;
          font-size: 0.85rem;
        }
        .document-upload-progress p {
          margin: 3px 0 9px;
          color: #64748b;
          font-size: 0.75rem;
          line-height: 1.45;
        }
        .document-upload-orbit {
          position: relative;
          width: 43px;
          height: 43px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          color: #002fa7;
          background: #ffffff;
        }
        .document-upload-orbit::before {
          content: "";
          position: absolute;
          inset: -3px;
          border-radius: inherit;
          background: conic-gradient(from 0deg, transparent 0 20%, #002fa7 48%, #7c9cff 70%, transparent 92%);
          mask: radial-gradient(circle, transparent 61%, #000 63%);
          animation: documentUploadOrbit 1.15s linear infinite;
        }
        .document-upload-progress-line {
          height: 4px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(0, 47, 167, 0.1);
        }
        .document-upload-progress-line i {
          display: block;
          width: 42%;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #002fa7, #7c9cff, #002fa7);
          animation: documentUploadSweep 1.3s ease-in-out infinite;
        }
        .document-upload-ready-note {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #1f6b48;
          font-size: 0.8rem;
        }
        .portal-form-actions button {
          gap: 7px;
        }
        @keyframes documentUploadOrbit {
          to { transform: rotate(360deg); }
        }
        @keyframes documentUploadSweep {
          0% { transform: translateX(-115%); }
          55%, 100% { transform: translateX(275%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .document-upload-dropzone,
          .document-upload-orbit::before,
          .document-upload-progress-line i {
            animation: none;
            transition: none;
          }
        }
        @media (max-width: 560px) {
          .document-upload-attachment {
            grid-template-columns: auto minmax(0, 1fr);
          }
          .document-upload-attachment button {
            position: absolute;
            top: 10px;
            right: 10px;
          }
        }
      `}</style>
    </form>
  );
}
