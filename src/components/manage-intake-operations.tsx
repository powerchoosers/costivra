"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileWarning,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useToast } from "@/components/toast-provider";
import {
  canRescanInboundEvent,
  canRetryInboundEvent,
  intakeStatusGroup,
} from "@/lib/manage/intake-operations-policy";
import type {
  IntakeOperationEvent,
  ManageIntakeOperationsData,
} from "@/lib/manage/intake-operations-types";
import { formatManageDateTime } from "@/lib/manage/date-format";

const dateTime = formatManageDateTime;
const fileSize = (bytes: number) => bytes < 1024 * 1024
  ? `${Math.max(1, Math.round(bytes / 1024))} KB`
  : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

async function runEventAction(id: string, action: "retry" | "rescan") {
  const response = await fetch(`/api/manage/intake/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  const payload = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(payload.error || "The intake event could not be updated.");
}

async function retryDocumentExtraction(id: string) {
  const response = await fetch(`/api/manage/documents/${id}/retry-extraction`, { method: "PATCH" });
  const payload = await response.json().catch(() => ({})) as { error?: string; warning?: string | null };
  if (!response.ok) throw new Error(payload.error || "Extraction could not be retried.");
  return payload.warning ?? null;
}

export function ManageIntakeOperations({ data }: { data: ManageIntakeOperationsData }) {
  if (data.selectedEvent) return <IntakeEventDetail event={data.selectedEvent} scannerConfigured={data.scannerConfigured} />;
  return <IntakeEventQueue data={data} />;
}

function IntakeEventQueue({ data }: { data: ManageIntakeOperationsData }) {
  const [view, setView] = useState<"attention" | "active" | "all">("attention");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => data.events.filter((event) => {
    if (view !== "all" && intakeStatusGroup(event.status) !== view) return false;
    const term = query.trim().toLowerCase();
    return !term || `${event.organizationName} ${event.senderAddress} ${event.subject} ${event.status}`.toLowerCase().includes(term);
  }), [data.events, query, view]);
  const attention = data.events.filter((event) => intakeStatusGroup(event.status) === "attention").length + data.recoveryDocuments.length;
  const active = data.events.filter((event) => intakeStatusGroup(event.status) === "active").length;
  const quarantine = data.events.filter((event) => event.status === "quarantined").length;
  const completed = data.events.filter((event) => intakeStatusGroup(event.status) === "complete").length;

  return <section className="intake-operations">
    <header className="invoice-review-heading">
      <div><p className="manage-eyebrow">DOCUMENT INTAKE</p><h2>Intake operations</h2><p>Follow every forwarded bill from receipt through scanning, extraction, and human review.</p></div>
    </header>
    {!data.scannerConfigured && <div className="intake-scanner-notice"><FileWarning size={19} /><div><strong>Malware scanner not connected</strong><p>Inbound files remain private and quarantined. Rescan controls will unlock after the server key is configured.</p></div></div>}
    <div className="invoice-review-summary" aria-label="Intake queue summary">
      <Summary label="Needs attention" value={attention} note="Review or recovery" />
      <Summary label="In progress" value={active} note="Queue or processing" />
      <Summary label="Quarantined" value={quarantine} note="Awaiting clean scan" />
      <Summary label="Completed" value={completed} note="Finished intake" />
    </div>
    {data.recoveryDocuments.length > 0 && <DocumentRecoveryQueue documents={data.recoveryDocuments} />}
    <div className="invoice-review-controls">
      <div className="invoice-review-tabs" role="tablist" aria-label="Intake event views">
        {([["attention", "Needs attention"], ["active", "In progress"], ["all", "All events"]] as const).map(([value, copy]) => <button key={value} type="button" role="tab" aria-selected={view === value} onClick={() => setView(value)}>{copy}</button>)}
      </div>
      <label className="invoice-review-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search client, sender, or subject" /></label>
    </div>
    <div className="invoice-review-table-wrap">
      <table className="invoice-review-table intake-operations-table">
        <thead><tr><th>Status</th><th>Client</th><th>Message</th><th>Files</th><th>Attempts</th><th>Received</th><th>Last update</th></tr></thead>
        <tbody>{filtered.map((event) => <tr key={event.id}>
          <td><Status status={event.status} /></td>
          <td><strong>{event.organizationName}</strong></td>
          <td><Link href={`/manage/intake/${event.id}`}><strong>{event.subject}</strong><small>{event.senderAddress}</small></Link></td>
          <td>{event.processedAttachmentCount}/{event.attachmentCount}</td>
          <td>{event.attemptCount}/{event.maxAttempts}</td>
          <td>{dateTime(event.receivedAt)}</td>
          <td>{dateTime(event.updatedAt)}</td>
        </tr>)}</tbody>
      </table>
      {!filtered.length && <div className="invoice-review-empty"><CheckCircle2 size={24} /><strong>{data.events.length ? "Nothing matches this view" : "No forwarded emails yet"}</strong><p>{data.events.length ? "Choose another view or clear the search." : "The first message sent to a client intake address will appear here."}</p></div>}
    </div>
  </section>;
}

function DocumentRecoveryQueue({ documents }: { documents: ManageIntakeOperationsData["recoveryDocuments"] }) {
  const router = useRouter();
  const toast = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  async function retry(id: string) {
    setBusyId(id);
    try {
      const warning = await retryDocumentExtraction(id);
      if (warning) toast.warning("Still needs review", warning);
      else toast.success("Extraction completed", "The document has returned to the normal review workflow.");
      router.refresh();
    } catch (error) {
      toast.error("Retry failed", error instanceof Error ? error.message : "Please try again.");
    } finally { setBusyId(null); }
  }
  return <section className="manage-panel intake-recovery-queue">
    <header><div><span>EXTRACTION RECOVERY</span><h3>Documents automation could not finish</h3><p>These files never became invoice records. Retry provider failures here; use human review when the source itself is unclear.</p></div><strong>{documents.length}</strong></header>
    <div className="invoice-review-table-wrap"><table className="invoice-review-table"><thead><tr><th>Client</th><th>Source file</th><th>Reading path</th><th>Reason</th><th>Received</th><th>Action</th></tr></thead><tbody>
      {documents.map((document) => <tr key={document.id}><td><strong>{document.organizationName}</strong></td><td><strong>{document.filename}</strong><small>{document.summary}</small></td><td>{document.inputMode === "pdf_ocr" ? "Image OCR" : "Embedded text"}</td><td>{label(document.failureCode)}</td><td>{dateTime(document.createdAt)}</td><td><button className="manage-button" type="button" disabled={busyId !== null || !document.sourceAvailable} onClick={() => void retry(document.id)}><RefreshCw size={15} />{busyId === document.id ? "Retrying…" : document.sourceAvailable ? "Retry extraction" : "Source expired"}</button></td></tr>)}
    </tbody></table></div>
  </section>;
}

function IntakeEventDetail({ event, scannerConfigured }: { event: IntakeOperationEvent; scannerConfigured: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<"retry" | "rescan" | null>(null);
  const hasQuarantine = event.attachments.some((attachment) => attachment.processingStatus === "quarantined");
  async function act(action: "retry" | "rescan") {
    setBusy(action);
    try {
      await runEventAction(event.id, action);
      toast.success(action === "retry" ? "Event returned to the queue." : "Quarantined files checked again.", action === "retry" ? "The background worker will claim it shortly." : "Refresh completed without bypassing the security boundary.");
      router.refresh();
    } catch (error) {
      toast.error(action === "retry" ? "Retry failed" : "Rescan failed", error instanceof Error ? error.message : "Please try again.");
    } finally { setBusy(null); }
  }
  return <section className="intake-event-detail">
    <header className="invoice-detail-heading">
      <div><Link href="/manage/intake"><ArrowLeft size={16} />Intake operations</Link><h2>Intake event</h2><p>{event.organizationName} · {event.subject}</p></div>
      <div className="intake-event-actions">
        {canRetryInboundEvent(event.status) && <button className="manage-button manage-button--primary" type="button" disabled={busy !== null} onClick={() => void act("retry")}><RefreshCw size={16} />{busy === "retry" ? "Queueing…" : "Retry event"}</button>}
        {event.status === "quarantined" && <button className="manage-button manage-button--primary" type="button" disabled={busy !== null || !canRescanInboundEvent(event.status, hasQuarantine, scannerConfigured)} onClick={() => void act("rescan")} title={!scannerConfigured ? "Connect the malware scanner first" : undefined}><ShieldCheck size={16} />{busy === "rescan" ? "Scanning…" : "Rescan files"}</button>}
      </div>
    </header>
    <div className="intake-event-layout">
      <section className="manage-panel intake-event-overview">
        <div className="intake-event-title"><Status status={event.status} /><span>{event.attemptCount} of {event.maxAttempts} attempts</span></div>
        <dl className="intake-event-facts">
          <div><dt>Client</dt><dd>{event.organizationName}</dd></div>
          <div><dt>Sender</dt><dd>{event.senderAddress}</dd></div>
          <div><dt>Received</dt><dd>{dateTime(event.receivedAt)}</dd></div>
          <div><dt>Last updated</dt><dd>{dateTime(event.updatedAt)}</dd></div>
          <div><dt>Next attempt</dt><dd>{dateTime(event.nextAttemptAt)}</dd></div>
          <div><dt>Processed</dt><dd>{event.processedAttachmentCount} of {event.attachmentCount} files</dd></div>
        </dl>
        {event.bodyPreview && <div className="intake-event-preview"><span>Message preview</span><p>{event.bodyPreview}</p></div>}
        {event.errorMessage && <div className="intake-event-error"><AlertTriangle size={17} /><div><strong>Latest processing error</strong><p>{event.errorMessage}</p></div></div>}
      </section>
      <section className="manage-panel intake-event-files">
        <header><div><span>ATTACHMENTS</span><h3>Source files</h3></div><strong>{event.attachments.length}</strong></header>
        {event.attachments.length ? <div>{event.attachments.map((attachment) => <article key={attachment.id}>
          <FileCheck2 size={19} />
          <div><strong>{attachment.filename}</strong><small>{fileSize(attachment.byteSize)} · {attachment.contentType}</small>{attachment.errorMessage && <p>{attachment.errorMessage}</p>}</div>
          <div className="intake-attachment-status"><span>{label(attachment.scanStatus)} scan</span><span>{label(attachment.processingStatus)}</span>{attachment.invoiceId && <Link href={`/manage/invoice-review/${attachment.invoiceId}`}>Review invoice</Link>}</div>
        </article>)}</div> : <div className="invoice-review-empty"><Clock3 size={22} /><strong>No attachment records</strong><p>This message may not have included a supported source file.</p></div>}
      </section>
    </div>
  </section>;
}

function Summary({ label: copy, value, note }: { label: string; value: number; note: string }) {
  return <div><span>{copy}</span><strong>{value}</strong><small>{note}</small></div>;
}

function Status({ status }: { status: IntakeOperationEvent["status"] }) {
  return <span className={`intake-status intake-status--${intakeStatusGroup(status)}`}>{label(status)}</span>;
}
