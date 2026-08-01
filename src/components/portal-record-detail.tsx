"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Copy, FileText, LockKeyhole, Pencil, X } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/toast-provider";
import type { PortalData } from "@/lib/portal/types";

type Kind = "vendor" | "expense" | "contract" | "document" | "invoice" | "opportunity" | "action" | "savings";
type Field = { key: string; label: string; value: unknown; display?: string; editable?: boolean; type?: "text" | "textarea" | "date" | "datetime-local" | "number" | "checkbox" | "select"; options?: string[]; note?: string };

const labels: Record<Kind, { plural: string; noun: string }> = {
  vendor: { plural: "vendors", noun: "Vendor" }, expense: { plural: "expenses", noun: "Expense" }, contract: { plural: "contracts", noun: "Contract" }, document: { plural: "documents", noun: "Document" }, invoice: { plural: "documents", noun: "Invoice" }, opportunity: { plural: "opportunities", noun: "Opportunity" }, action: { plural: "actions", noun: "Action" }, savings: { plural: "savings", noun: "Savings outcome" },
};
const money = (value: number | null | undefined, currency = "USD") => value == null ? "Not recorded" : new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
const date = (value: string | null | undefined) => value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(`${value.length === 10 ? `${value}T12:00:00` : value}`)) : "Not recorded";
const text = (value: unknown) => value === null || value === undefined || value === "" ? "Not recorded" : String(value).replaceAll("_", " ").replaceAll(".", " ").replace(/([a-z])([A-Z])/g, "$1 $2");

function build(data: PortalData, kind: Kind, id: string) {
  const editable = data.currentUser.role !== "viewer";
  if (kind === "vendor") {
    const record = data.vendors.find((x) => x.id === id);
    if (!record) return null;
    return { record, updateId: record.relationshipId, title: record.name, subtitle: record.category, status: record.relationshipStatus, updatedAt: record.updatedAt, fields: [
      { key: "name", label: "Canonical vendor", value: record.name, note: "Shared directory value; contact support to correct it." },
      { key: "category", label: "Category", value: record.category }, { key: "website", label: "Website", value: record.website },
      { key: "annualizedSpend", label: "Annualized spend", value: record.annualizedSpend, display: money(record.annualizedSpend), editable, type: "number" as const },
      { key: "spendCadence", label: "Spend cadence", value: record.spendCadence, editable, type: "select" as const, options: ["monthly", "quarterly", "annual", "variable"] },
      { key: "relationshipStatus", label: "Relationship", value: record.relationshipStatus, editable, type: "select" as const, options: ["active", "paused", "ended"] },
    ] as Field[] };
  }
  const collection = kind === "savings" ? data.savings : kind === "action" ? data.actions : kind === "opportunity" ? data.opportunities : kind === "invoice" ? data.invoices : kind === "document" ? data.documents : kind === "contract" ? data.contracts : data.expenses;
  const record = collection.find((item) => item.id === id) as Record<string, unknown> | undefined;
  if (!record) return null;
  const common = { record, updateId: id, updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : null };
  if (kind === "expense") return { ...common, title: `${record.vendorName} expense`, subtitle: `${date(record.periodStart as string)} – ${date(record.periodEnd as string)}`, status: String(record.status), fields: [
    { key: "vendorName", label: "Vendor", value: record.vendorName }, { key: "category", label: "Category", value: record.category, editable, type: "text" },
    { key: "periodStart", label: "Period start", value: record.periodStart, display: date(record.periodStart as string), editable, type: "date" }, { key: "periodEnd", label: "Period end", value: record.periodEnd, display: date(record.periodEnd as string), editable, type: "date" },
    { key: "amount", label: "Recorded amount", value: record.amount, display: money(record.amount as number), note: "Protected financial fact from the source record." }, { key: "priorPeriodAmount", label: "Prior period", value: record.priorPeriodAmount, display: money(record.priorPeriodAmount as number | null) },
    { key: "status", label: "Review status", value: record.status, editable, type: "select", options: ["processing", "needs_review", "reviewed", "archived"] },
  ] as Field[] };
  if (kind === "contract") return { ...common, title: String(record.title), subtitle: String(record.vendorName), status: String(record.status), fields: [
    { key: "title", label: "Contract title", value: record.title, editable, type: "text" }, { key: "category", label: "Category", value: record.category, editable, type: "text" },
    { key: "startDate", label: "Start date", value: record.startDate, display: date(record.startDate as string | null), editable, type: "date" }, { key: "endDate", label: "End date", value: record.endDate, display: date(record.endDate as string | null), editable, type: "date" },
    { key: "noticePeriodDays", label: "Notice period", value: record.noticePeriodDays, display: record.noticePeriodDays == null ? "Not recorded" : `${record.noticePeriodDays} days`, editable, type: "number" }, { key: "annualValue", label: "Annual value", value: record.annualValue, display: money(record.annualValue as number | null), editable, type: "number", note: "Manual contract value; edits are audited." },
    { key: "ownerName", label: "Internal owner", value: record.ownerName, editable, type: "text" }, { key: "autoRenews", label: "Auto-renews", value: record.autoRenews, display: record.autoRenews ? "Yes" : "No", editable, type: "checkbox" },
    { key: "status", label: "Status", value: record.status, editable, type: "select", options: ["draft", "active", "expired", "terminated"] },
  ] as Field[] };
  if (kind === "document") return { ...common, title: String(record.originalFilename), subtitle: String(record.vendorName), status: String(record.status), fields: [
    { key: "originalFilename", label: "Original filename", value: record.originalFilename, note: "Immutable source identity." }, { key: "documentType", label: "Document type", value: record.documentType, editable, type: "text" },
    { key: "summary", label: "Extraction summary", value: record.summary, editable, type: "textarea" }, { key: "mimeType", label: "File type", value: record.mimeType }, { key: "byteSize", label: "File size", value: record.byteSize, display: `${((record.byteSize as number) / 1024).toFixed(1)} KB` },
    { key: "pageCount", label: "Pages", value: record.pageCount }, { key: "confidence", label: "Extraction confidence", value: record.confidence, display: record.confidence == null ? "Unknown" : `${Math.round((record.confidence as number) * 100)}%` }, { key: "sha256", label: "SHA-256 provenance", value: record.sha256 },
  ] as Field[] };
  if (kind === "invoice") return { ...common, title: record.invoiceNumber ? `Invoice ${record.invoiceNumber}` : "Invoice awaiting number", subtitle: String(record.vendorName), status: String(record.reviewStatus), fields: [
    { key: "invoiceNumber", label: "Invoice number", value: record.invoiceNumber, editable, type: "text" }, { key: "invoiceDate", label: "Invoice date", value: record.invoiceDate, display: date(record.invoiceDate as string | null), editable, type: "date" }, { key: "dueDate", label: "Due date", value: record.dueDate, display: date(record.dueDate as string | null), editable, type: "date" },
    { key: "servicePeriodStart", label: "Service start", value: record.servicePeriodStart, display: date(record.servicePeriodStart as string | null), editable, type: "date" }, { key: "servicePeriodEnd", label: "Service end", value: record.servicePeriodEnd, display: date(record.servicePeriodEnd as string | null), editable, type: "date" },
    { key: "purchaseOrderNumber", label: "Purchase order", value: record.purchaseOrderNumber, editable, type: "text" }, { key: "expenseCategory", label: "Expense category", value: record.expenseCategory, editable, type: "text" }, { key: "reviewPriority", label: "Review priority", value: record.reviewPriority, editable, type: "select", options: ["low", "normal", "high", "urgent"] },
    { key: "reviewNotes", label: "Reviewer notes", value: record.reviewNotes, editable, type: "textarea" }, { key: "totalAmount", label: "Reconciled total", value: record.totalAmount, display: money(record.totalAmount as number | null, (record.currency as string) ?? "USD"), note: "Protected extracted financial fact." },
    { key: "subtotal", label: "Subtotal", value: record.subtotal, display: money(record.subtotal as number | null) }, { key: "taxTotal", label: "Tax", value: record.taxTotal, display: money(record.taxTotal as number | null) }, { key: "amountDue", label: "Amount due", value: record.amountDue, display: money(record.amountDue as number | null) },
    { key: "reconciliationStatus", label: "Reconciliation", value: record.reconciliationStatus }, { key: "vendorMatchStatus", label: "Vendor match", value: record.vendorMatchStatus }, { key: "extractionConfidence", label: "Confidence", value: record.extractionConfidence, display: record.extractionConfidence == null ? "Unknown" : `${Math.round((record.extractionConfidence as number) * 100)}%` },
  ] as Field[] };
  if (kind === "opportunity") return { ...common, title: String(record.title), subtitle: String(record.vendorName), status: String(record.status), fields: [
    { key: "title", label: "Finding", value: record.title, editable, type: "text" }, { key: "summary", label: "Summary", value: record.summary, editable, type: "textarea" }, { key: "priority", label: "Priority", value: record.priority, editable, type: "select", options: ["low", "medium", "high"] }, { key: "deadlineAt", label: "Deadline", value: record.deadlineAt, display: date(record.deadlineAt as string | null), editable, type: "datetime-local" },
    { key: "estimatedAnnualValue", label: "Estimated annual value", value: record.estimatedAnnualValue, display: money(record.estimatedAnnualValue as number | null), note: "Calculated by deterministic code; not editable here." }, { key: "confidence", label: "Confidence", value: record.confidence, display: record.confidence == null ? "Unknown" : `${Math.round((record.confidence as number) * 100)}%` }, { key: "ruleVersion", label: "Calculation rule", value: record.ruleVersion }, { key: "evidenceCount", label: "Evidence references", value: record.evidenceCount },
  ] as Field[] };
  if (kind === "action") return { ...common, title: String(record.title), subtitle: String(record.vendorName), status: String(record.status), fields: [
    { key: "title", label: "Action title", value: record.title, editable, type: "text" }, { key: "description", label: "Instructions", value: record.description, editable, type: "textarea" }, { key: "actionType", label: "Action type", value: record.actionType }, { key: "priority", label: "Priority", value: record.priority, editable, type: "select", options: ["low", "medium", "high", "urgent"] }, { key: "dueAt", label: "Due date", value: record.dueAt, display: date(record.dueAt as string | null), editable, type: "datetime-local" },
    { key: "status", label: "Execution state", value: record.status, note: "Changed only through the approval and execution controls." }, { key: "approvalDecision", label: "Approval", value: record.approvalDecision },
  ] as Field[] };
  return { ...common, title: String(record.title), subtitle: String(record.method), status: String(record.status), fields: [
    { key: "title", label: "Outcome title", value: record.title, editable, type: "text" }, { key: "valueType", label: "Value type", value: record.valueType }, { key: "amount", label: "Recorded value", value: record.amount, display: money(record.amount as number), note: "Protected deterministic result." }, { key: "method", label: "Method", value: record.method }, { key: "methodVersion", label: "Method version", value: record.methodVersion },
    { key: "baselineAmount", label: "Accepted baseline", value: record.baselineAmount, display: money(record.baselineAmount as number | null) }, { key: "comparisonAmount", label: "Comparison amount", value: record.comparisonAmount, display: money(record.comparisonAmount as number | null) }, { key: "baselineAcceptedAt", label: "Baseline accepted", value: record.baselineAcceptedAt, display: date(record.baselineAcceptedAt as string | null) }, { key: "verifiedAt", label: "Verified at", value: record.verifiedAt, display: date(record.verifiedAt as string | null) },
  ] as Field[] };
}

function FieldRow({ kind, updateId, expectedUpdatedAt, field, canEdit }: { kind: Kind; updateId: string; expectedUpdatedAt: string | null; field: Field; canEdit: boolean }) {
  const [editing, setEditing] = useState(false); const [value, setValue] = useState(field.value ?? ""); const [busy, setBusy] = useState(false);
  const toast = useToast(); const router = useRouter(); const shown = field.display ?? text(field.value);
  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(shown);
      else {
        const input = document.createElement("textarea");
        input.value = shown; input.style.position = "fixed"; input.style.opacity = "0";
        document.body.appendChild(input); input.select();
        if (!document.execCommand("copy")) throw new Error("Copy was blocked by the browser.");
        input.remove();
      }
      toast.success(`${field.label} copied.`);
    } catch {
      toast.error("Copy was blocked", "Select the value and copy it manually.");
    }
  };
  const save = async () => { setBusy(true); try { const response = await fetch(`/api/portal/records/${kind}/${updateId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ field: field.key, value, expectedUpdatedAt }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error); setEditing(false); toast.success(`${field.label} updated.`); router.refresh(); } catch (error) { toast.error("Couldn’t save that field", error instanceof Error ? error.message : "Try again."); } finally { setBusy(false); } };
  return <div className={`record-field ${editing ? "is-editing" : ""}`}>
    <div className="record-field-label"><span>{field.label}</span>{field.note && <small>{field.note}</small>}</div>
    <div className="record-field-value">
      {editing ? <>
        {field.type === "textarea" ? <textarea value={String(value)} onChange={(e) => setValue(e.target.value)} autoFocus /> : field.type === "select" ? <select value={String(value)} onChange={(e) => setValue(e.target.value)} autoFocus>{field.options?.map((option) => <option key={option} value={option}>{text(option)}</option>)}</select> : field.type === "checkbox" ? <label className="record-check"><input type="checkbox" checked={Boolean(value)} onChange={(e) => setValue(e.target.checked)} /> {value ? "Yes" : "No"}</label> : <input type={field.type ?? "text"} value={String(value)} onChange={(e) => setValue(e.target.value)} autoFocus />}
        <button className="record-icon-button confirm" aria-label={`Save ${field.label}`} disabled={busy} onClick={() => void save()}><Check /></button><button className="record-icon-button" aria-label={`Cancel editing ${field.label}`} onClick={() => { setValue(field.value ?? ""); setEditing(false); }}><X /></button>
      </> : <><strong>{shown}</strong>{field.editable && canEdit ? <button className="record-icon-button" aria-label={`Edit ${field.label}`} title={`Edit ${field.label}`} onClick={() => setEditing(true)}><Pencil /></button> : <span className="record-protected" title="Protected field"><LockKeyhole /></span>}<button className="record-icon-button" aria-label={`Copy ${field.label}`} title={`Copy ${field.label}`} onClick={() => void copy()}><Copy /></button></>}
    </div>
  </div>;
}

export function PortalRecordDetail({ data, kind, id }: { data: PortalData; kind: Kind; id: string }) {
  const detail = build(data, kind, id); const meta = labels[kind];
  if (!detail) return <div className="record-detail"><Link className="record-back" href={`/app/${meta.plural}`}>← Back to {meta.plural}</Link><section className="record-empty"><h1>{meta.noun} not found</h1><p>This record is not part of your workspace, or it no longer exists.</p></section></div>;
  const recordId = String((detail.record as Record<string, unknown>).id); const vendorId = (detail.record as Record<string, unknown>).vendorId as string | null;
  const audits = data.auditEvents.filter((event) => event.resourceId === detail.updateId || event.resourceId === recordId).slice(0, 8);
  const related = [
    ...data.documents.filter((item) => item.id !== recordId && (item.vendorId === vendorId || item.vendorId === id)).slice(0, 4).map((item) => ({ type: "Document", title: item.originalFilename, href: `/app/documents/${item.id}` })),
    ...data.opportunities.filter((item) => item.id !== recordId && (item.vendorId === vendorId || item.vendorId === id)).slice(0, 4).map((item) => ({ type: "Opportunity", title: item.title, href: `/app/opportunities/${item.id}` })),
    ...data.contracts.filter((item) => item.id !== recordId && (item.vendorId === vendorId || item.vendorId === id)).slice(0, 3).map((item) => ({ type: "Contract", title: item.title, href: `/app/contracts/${item.id}` })),
  ].slice(0, 8);
  const evidence = kind === "document" ? data.evidenceReferences.filter((item) => item.documentId === id) : kind === "opportunity" ? data.evidenceReferences.filter((item) => item.opportunityId === id) : [];
  return <div className="record-detail">
    <Link className="record-back" href={`/app/${meta.plural}`}>← Back to {meta.plural}</Link>
    <header className="record-detail-header"><div><span className="record-eyebrow">{meta.noun} record</span><h1>{detail.title}</h1><p>{detail.subtitle}</p></div><span className="record-status"><i />{text(detail.status)}</span></header>
    <nav className="record-tabs" aria-label={`${meta.noun} detail sections`}><a href="#overview">Overview</a><a href="#related">Related records</a>{evidence.length > 0 && <a href="#evidence">Evidence</a>}<a href="#history">History</a></nav>
    <div className="record-detail-layout"><main>
      <section className="record-section" id="overview"><div className="record-section-heading"><div><h2>Record details</h2><p>Edit one field at a time. Every saved change is attributed and audited.</p></div></div><div className="record-fields">{detail.fields.map((field) => <FieldRow key={field.key} kind={kind} updateId={detail.updateId} expectedUpdatedAt={detail.updatedAt} field={field} canEdit={data.currentUser.role !== "viewer"} />)}</div></section>
      {evidence.length > 0 && <section className="record-section" id="evidence"><div className="record-section-heading"><div><h2>Source evidence</h2><p>Exact excerpts retained from the private source document.</p></div></div><div className="record-evidence-list">{evidence.map((item) => <article key={item.id}><span>Page {item.pageNumber}{item.fieldPath ? ` · ${item.fieldPath}` : ""}</span><blockquote>{item.textExcerpt}</blockquote><Link href={`/api/portal/documents/${item.documentId}/download`}>Open source <FileText /></Link></article>)}</div></section>}
    </main><aside>
      <section className="record-side-section" id="related"><h2>Related records</h2>{related.length ? related.map((item) => <Link className="record-related" href={item.href} key={`${item.type}-${item.href}`}><span><small>{item.type}</small><strong>{item.title}</strong></span><ChevronRight /></Link>) : <p>No related records yet.</p>}</section>
      <section className="record-side-section" id="history"><h2>Recent activity</h2>{audits.length ? audits.map((event) => <div className="record-audit" key={event.id}><i /><span><strong>{text(event.action)}</strong><small>{event.actorName} · {date(event.createdAt)}</small></span></div>) : <p>No recorded changes yet.</p>}</section>
    </aside></div>
  </div>;
}
