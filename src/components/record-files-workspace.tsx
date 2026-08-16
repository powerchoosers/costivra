"use client";

import {
  AlertCircle,
  ChevronRight,
  Download,
  FileCheck2,
  FileClock,
  FileSignature,
  FileText,
  Folder,
  FolderOpen,
  Grid2X2,
  LayoutList,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldCheck,
} from "@/lib/icons";
import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { isDocumentDownloadableStatus } from "@/lib/documents/access";
import { useToast } from "@/components/toast-provider";

export type RecordFile = {
  id: string;
  name: string;
  documentType: string | null;
  mimeType?: string | null;
  status: string;
  createdAt: string;
  updatedAt?: string | null;
  byteSize?: number | null;
  pageCount?: number | null;
  summary?: string | null;
  confidence?: number | null;
  extractionStatus?: string | null;
  extractionInputMode?: "native_text" | "pdf_ocr" | null;
  extractionFailureCode?: string | null;
  evidenceCount?: number;
  contextLabel?: string | null;
  href?: string | null;
  retryHref?: string | null;
  sourceAvailable?: boolean;
};

type Collection = "all" | "evidence" | "invoices" | "contracts" | "other";
type View = "list" | "grid";

const collections: Array<{
  id: Collection;
  label: string;
  description: string;
  Icon: typeof Folder;
}> = [
  { id: "all", label: "All files", description: "Every linked file", Icon: FolderOpen },
  { id: "evidence", label: "Evidence", description: "Used in a finding", Icon: FileCheck2 },
  { id: "invoices", label: "Invoices", description: "Bills and statements", Icon: ReceiptText },
  { id: "contracts", label: "Contracts", description: "Terms and renewals", Icon: FileSignature },
  { id: "other", label: "Other files", description: "Supporting material", Icon: Folder },
];

function fileCategory(file: RecordFile): Exclude<Collection, "all" | "evidence"> {
  const description = `${file.documentType ?? ""} ${file.name} ${file.mimeType ?? ""}`.toLowerCase();
  if (description.includes("invoice") || description.includes("bill") || description.includes("statement"))
    return "invoices";
  if (description.includes("contract") || description.includes("agreement") || description.includes("renewal"))
    return "contracts";
  return "other";
}

export function recordFileCanOpen(file: RecordFile) {
  return file.sourceAvailable !== false && Boolean(file.href) && isDocumentDownloadableStatus(file.status);
}

function matchesCollection(file: RecordFile, collection: Collection) {
  if (collection === "all") return true;
  if (collection === "evidence") return Boolean(file.evidenceCount);
  return fileCategory(file) === collection;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatBytes(value?: number | null) {
  if (!value || value < 1) return null;
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(value >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function fileTypeLabel(file: RecordFile) {
  return file.documentType?.replaceAll("_", " ") || "Source document";
}

function FileTypeIcon({ file }: { file: RecordFile }) {
  const category = fileCategory(file);
  if (category === "invoices") return <ReceiptText aria-hidden="true" />;
  if (category === "contracts") return <FileSignature aria-hidden="true" />;
  if (file.evidenceCount) return <FileCheck2 aria-hidden="true" />;
  return <FileText aria-hidden="true" />;
}

export function RecordFilesWorkspace({
  files,
  title = "Files",
  description = "Private source files stay immutable. These views organize them without changing storage or provenance.",
  emptyTitle = "No files linked yet",
  emptyCopy = "When a source file is added, it will appear here with its review status and evidence links.",
}: {
  files: RecordFile[];
  title?: string;
  description?: string;
  emptyTitle?: string;
  emptyCopy?: string;
}) {
  const titleId = useId();
  const router = useRouter();
  const toast = useToast();
  const [collection, setCollection] = useState<Collection>("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("list");
  const [selectedId, setSelectedId] = useState<string | null>(files[0]?.id ?? null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  async function retryExtraction(file: RecordFile) {
    if (!file.retryHref || retryingId) return;
    setRetryingId(file.id);
    try {
      const response = await fetch(file.retryHref, { method: "PATCH" });
      const payload = await response.json().catch(() => ({})) as { error?: string; warning?: string | null };
      if (!response.ok) throw new Error(payload.error || "Extraction could not be retried.");
      if (payload.warning) toast.warning("Still needs review", payload.warning);
      else toast.success("Extraction completed", "The source file has been processed again and its record is ready to review.");
      router.refresh();
    } catch (error) {
      toast.error("Retry failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setRetryingId(null);
    }
  }

  const collectionCounts = useMemo(() => {
    const counts = new Map<Collection, number>([["all", files.length], ["evidence", 0], ["invoices", 0], ["contracts", 0], ["other", 0]]);
    for (const file of files) {
      const category = fileCategory(file);
      counts.set(category, (counts.get(category) ?? 0) + 1);
      if (file.evidenceCount)
        counts.set("evidence", (counts.get("evidence") ?? 0) + 1);
    }
    return counts;
  }, [files]);

  const filteredFiles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return files.filter((file) => {
      const inCollection = matchesCollection(file, collection);
      const matchesQuery = !normalizedQuery ||
        `${file.name} ${file.documentType ?? ""} ${file.contextLabel ?? ""}`.toLowerCase().includes(normalizedQuery);
      return inCollection && matchesQuery;
    });
  }, [collection, files, query]);

  const selectedFile = filteredFiles.find((file) => file.id === selectedId) ?? filteredFiles[0] ?? null;
  const selectFile = (id: string) => setSelectedId(id);

  return (
    <section className="record-files-workspace" aria-labelledby={titleId}>
      <header className="record-files-workspace__header">
        <div>
          <span className="record-files-workspace__eyebrow">Document library</span>
          <h2 id={titleId}>{title}</h2>
          <p>{description}</p>
        </div>
        <span className="record-files-workspace__count">{files.length} {files.length === 1 ? "file" : "files"}</span>
      </header>

      <div className="record-files-workspace__body">
        <aside className="record-files-workspace__collections" aria-label="File collections">
          <span className="record-files-workspace__collections-label">Collections</span>
          {collections.map(({ id, label, description: collectionDescription, Icon }) => {
            const active = collection === id;
            return (
              <button
                className={active ? "is-active" : ""}
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => setCollection(id)}
              >
                <Icon aria-hidden="true" />
                <span><strong>{label}</strong><small>{collectionDescription}</small></span>
                <em>{collectionCounts.get(id) ?? 0}</em>
              </button>
            );
          })}
        </aside>

        <div className="record-files-workspace__content">
          <div className="record-files-workspace__toolbar">
            <label className="record-files-workspace__search">
              <Search aria-hidden="true" />
              <span className="sr-only">Search files</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search files"
              />
            </label>
            <div className="record-files-workspace__view-toggle" aria-label="File view">
              <button type="button" className={view === "list" ? "is-active" : ""} aria-pressed={view === "list"} onClick={() => setView("list")}><LayoutList aria-hidden="true" /><span className="sr-only">List view</span></button>
              <button type="button" className={view === "grid" ? "is-active" : ""} aria-pressed={view === "grid"} onClick={() => setView("grid")}><Grid2X2 aria-hidden="true" /><span className="sr-only">Grid view</span></button>
            </div>
          </div>

          {filteredFiles.length ? (
            view === "list" ? (
              <div className="record-files-workspace__table" role="table" aria-label="Files" data-workspace-scrollbar="">
                <div className="record-files-workspace__table-head" role="row">
                  <span role="columnheader">Name</span>
                  <span role="columnheader">Type</span>
                  <span role="columnheader">Added</span>
                  <span role="columnheader">Status</span>
                  <span className="sr-only" role="columnheader">Actions</span>
                </div>
                {filteredFiles.map((file) => (
                  <div className={`record-files-workspace__file-row${selectedFile?.id === file.id ? " is-selected" : ""}`} role="row" key={file.id}>
                    <div role="cell" className="record-files-workspace__file-primary"><button type="button" onClick={() => selectFile(file.id)} aria-label={`Inspect ${file.name}`}>
                      <span className="record-files-workspace__file-icon"><FileTypeIcon file={file} /></span>
                      <span className="record-files-workspace__file-name"><strong>{file.name}</strong><small>{file.contextLabel || [formatBytes(file.byteSize), file.pageCount ? `${file.pageCount} pages` : null].filter(Boolean).join(" · ") || "Private source file"}</small></span>
                    </button></div>
                    <span role="cell" className="record-files-workspace__type">{fileTypeLabel(file)}</span>
                    <span role="cell" className="record-files-workspace__date">{formatDate(file.createdAt)}</span>
                    <span role="cell"><span className={`record-files-workspace__status status-${file.status}`}>{formatStatus(file.status)}</span></span>
                    <span role="cell" className="record-files-workspace__actions">
                      {recordFileCanOpen(file) ? <a href={file.href!} aria-label={`Open ${file.name}`} title="Open secure file"><Download aria-hidden="true" /></a> : <span aria-label={`${file.name} is not available to open`} title={file.sourceAvailable === false ? "The original file reached its retention limit; extracted records remain available." : "Available after security and processing checks"}><FileClock aria-hidden="true" /></span>}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="record-files-workspace__grid" aria-label="Files as cards">
                {filteredFiles.map((file) => (
                  <article className={`record-files-workspace__file-card${selectedFile?.id === file.id ? " is-selected" : ""}`} key={file.id}>
                    <button type="button" onClick={() => selectFile(file.id)} aria-label={`Inspect ${file.name}`}>
                      <span className="record-files-workspace__file-icon"><FileTypeIcon file={file} /></span>
                      <span className={`record-files-workspace__status status-${file.status}`}>{formatStatus(file.status)}</span>
                      <strong>{file.name}</strong>
                      <small>{fileTypeLabel(file)} · {formatDate(file.createdAt)}</small>
                    </button>
                    {recordFileCanOpen(file) && <a href={file.href!} aria-label={`Open ${file.name}`} title="Open secure file"><Download aria-hidden="true" /></a>}
                  </article>
                ))}
              </div>
            )
          ) : (
            <div className="record-files-workspace__empty">
              <FolderOpen aria-hidden="true" />
              <strong>{query ? "No files match that search" : emptyTitle}</strong>
              <p>{query ? "Try a different file name, type, or linked record." : emptyCopy}</p>
            </div>
          )}
        </div>

        <aside className="record-files-workspace__inspector" aria-live="polite">
          {selectedFile ? (
            <>
              <div className="record-files-workspace__inspector-icon"><FileTypeIcon file={selectedFile} /></div>
              <span className="record-files-workspace__eyebrow">Selected file</span>
              <h3>{selectedFile.name}</h3>
              <p>{selectedFile.summary || "The original file is private. Its status and source context are shown here without changing the evidence record."}</p>
              <dl>
                <div><dt>Type</dt><dd>{fileTypeLabel(selectedFile)}</dd></div>
                <div><dt>Status</dt><dd>{formatStatus(selectedFile.status)}</dd></div>
                <div><dt>Added</dt><dd>{formatDate(selectedFile.createdAt)}</dd></div>
                {selectedFile.contextLabel && <div><dt>Linked to</dt><dd>{selectedFile.contextLabel}</dd></div>}
                {selectedFile.pageCount && <div><dt>Pages</dt><dd>{selectedFile.pageCount}</dd></div>}
                {selectedFile.extractionInputMode && <div><dt>Read with</dt><dd>{selectedFile.extractionInputMode === "pdf_ocr" ? "Image OCR" : "Embedded text"}</dd></div>}
                {selectedFile.extractionFailureCode && <div><dt>Recovery reason</dt><dd>{formatStatus(selectedFile.extractionFailureCode)}</dd></div>}
                {selectedFile.evidenceCount ? <div><dt>Evidence links</dt><dd>{selectedFile.evidenceCount}</dd></div> : null}
              </dl>
              <div className="record-files-workspace__trust-note"><ShieldCheck aria-hidden="true" /> <span>{selectedFile.sourceAvailable === false ? "The retained metadata, extraction, and provenance remain protected." : "Original file and provenance remain protected."}</span></div>
              {recordFileCanOpen(selectedFile) ? <a className="record-files-workspace__open" href={selectedFile.href!}>Open secure file <ChevronRight aria-hidden="true" /></a> : <span className="record-files-workspace__unavailable"><FileClock aria-hidden="true" /> {selectedFile.sourceAvailable === false ? "Original removed under the retention policy" : "Available after security and processing checks"}</span>}
              {selectedFile.retryHref && <button className="record-files-workspace__open" type="button" disabled={retryingId !== null} onClick={() => void retryExtraction(selectedFile)}><RefreshCw aria-hidden="true" className={retryingId === selectedFile.id ? "is-spinning" : ""} />{retryingId === selectedFile.id ? "Retrying extraction…" : "Retry automatic extraction"}</button>}
            </>
          ) : (
            <div className="record-files-workspace__inspector-empty"><AlertCircle aria-hidden="true" /><strong>Choose a file</strong><p>Select a file to see its source context.</p></div>
          )}
        </aside>
      </div>
    </section>
  );
}
