"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Copy, FileText, LockKeyhole, Pencil, X } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/toast-provider";
import { RecordFilesWorkspace } from "@/components/record-files-workspace";
import { GlobalBackControl } from "@/components/navigation-history";
import type { PortalData } from "@/lib/portal/types";
import {
  portalRecordContext,
  type PortalRecordKind,
} from "@/lib/portal/record-context";

type Kind = PortalRecordKind;
type FieldOption = string | { value: string; label: string };
type Field = { key: string; label: string; value: unknown; display?: string; editable?: boolean; type?: "text" | "textarea" | "date" | "datetime-local" | "number" | "checkbox" | "select"; options?: FieldOption[]; note?: string };

const labels: Record<Kind, { plural: string; noun: string }> = {
  vendor: { plural: "vendors", noun: "Vendor" }, expense: { plural: "expenses", noun: "Expense" }, contract: { plural: "contracts", noun: "Contract" }, document: { plural: "documents", noun: "Document" }, invoice: { plural: "documents", noun: "Invoice" }, opportunity: { plural: "findings", noun: "Finding" }, action: { plural: "actions", noun: "Action" }, savings: { plural: "results", noun: "Result" },
};
const money = (value: number | null | undefined, currency = "USD") => value == null ? "Not recorded" : new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
const date = (value: string | null | undefined) => value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value.length === 10 ? `${value}T12:00:00Z` : value}`)) : "Not recorded";
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
    { key: "locationId", label: "Location", value: record.locationId ?? "", display: String(record.locationName ?? "All locations / not assigned"), editable, type: "select", options: [{ value: "", label: "All locations / not assigned" }, ...data.locations.map((location) => ({ value: location.id, label: `${location.name}${location.status === "inactive" ? " · archived" : ""}` }))] },
    { key: "periodStart", label: "Period start", value: record.periodStart, display: date(record.periodStart as string), editable, type: "date" }, { key: "periodEnd", label: "Period end", value: record.periodEnd, display: date(record.periodEnd as string), editable, type: "date" },
    { key: "amount", label: "Recorded amount", value: record.amount, display: money(record.amount as number), note: "Protected financial fact from the source record." }, { key: "priorPeriodAmount", label: "Prior period", value: record.priorPeriodAmount, display: money(record.priorPeriodAmount as number | null) },
    { key: "status", label: "Review status", value: record.status, editable, type: "select", options: ["processing", "needs_review", "reviewed", "archived"] },
  ] as Field[] };
  if (kind === "contract") return { ...common, title: String(record.title), subtitle: String(record.vendorName), status: String(record.status), fields: [
    { key: "title", label: "Contract title", value: record.title, editable, type: "text" }, { key: "category", label: "Category", value: record.category, editable, type: "text" },
    { key: "locationId", label: "Location", value: record.locationId ?? "", display: String(record.locationName ?? "All locations / not assigned"), editable, type: "select", options: [{ value: "", label: "All locations / not assigned" }, ...data.locations.map((location) => ({ value: location.id, label: `${location.name}${location.status === "inactive" ? " · archived" : ""}` }))] },
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
    { key: "subtotal", label: "Subtotal", value: record.subtotal, display: money(record.subtotal as number | null) }, { key: "currentCharges", label: "Current charges", value: record.currentCharges, display: money(record.currentCharges as number | null), note: "Source-labeled current-period charges; not a carried balance." }, { key: "previousBalance", label: "Previous balance", value: record.previousBalance, display: money(record.previousBalance as number | null) }, { key: "paymentsAndCredits", label: "Payments and credits", value: record.paymentsAndCredits, display: money(record.paymentsAndCredits as number | null) }, { key: "balanceForward", label: "Balance forward", value: record.balanceForward, display: money(record.balanceForward as number | null) }, { key: "currentPeriodCredits", label: "Current-period credits", value: record.currentPeriodCredits, display: money(record.currentPeriodCredits as number | null) }, { key: "taxTotal", label: "Tax", value: record.taxTotal, display: money(record.taxTotal as number | null) }, { key: "amountDue", label: "Amount due", value: record.amountDue, display: money(record.amountDue as number | null) },
    { key: "reconciliationStatus", label: "Reconciliation", value: record.reconciliationStatus }, { key: "vendorMatchStatus", label: "Vendor match", value: record.vendorMatchStatus, display: ["exact", "provided", "catalog_exact"].includes(String(record.vendorMatchStatus)) ? "Matched" : "Needs review" }, { key: "workspaceCustomerMatchStatus", label: "Customer identity", value: record.workspaceCustomerMatchStatus, display: record.workspaceCustomerMatchStatus === "matched" ? "Matched" : record.workspaceCustomerMatchStatus === "unmatched" ? "Mismatch" : "Needs review" }, { key: "expenseAccountMatchStatus", label: "Account match", value: record.expenseAccountMatchStatus, display: record.expenseAccountMatchStatus === "matched" ? "Matched" : "Needs review" }, { key: "serviceLocationMatchStatus", label: "Location match", value: record.serviceLocationMatchStatus, display: record.serviceLocationMatchStatus === "matched" ? "Matched" : "Needs review" }, { key: "extractionConfidence", label: "Confidence", value: record.extractionConfidence, display: record.extractionConfidence == null ? "Unknown" : `${Math.round((record.extractionConfidence as number) * 100)}%` },
  ] as Field[] };
  if (kind === "opportunity") return { ...common, title: String(record.title), subtitle: String(record.vendorName), status: String(record.status), fields: [
    { key: "title", label: "Finding", value: record.title, editable, type: "text" }, { key: "summary", label: "Summary", value: record.summary, editable, type: "textarea" }, { key: "priority", label: "Priority", value: record.priority, editable, type: "select", options: ["low", "medium", "high"] }, { key: "deadlineAt", label: "Deadline", value: record.deadlineAt, display: date(record.deadlineAt as string | null), editable, type: "datetime-local" },
    { key: "trustState", label: "Trust state", value: record.trustState, display: record.trustState === "evidence_backed" ? "Evidence backed" : record.trustState === "demo_example" ? "Sample record" : record.trustState === "manual_note" ? "Internal note" : record.trustState === "deprecated" ? "Deprecated" : "Needs evidence", note: "This state controls what can be shown as a customer-facing financial claim." }, { key: "estimatedAnnualValue", label: "Estimated annual value", value: record.estimatedAnnualValue, display: record.monetaryClaimAllowed ? money(record.estimatedAnnualValue as number | null) : record.trustState === "demo_example" ? "Sample only" : "Not shown until evidence and calculation are complete", note: record.monetaryClaimAllowed ? "Calculated by deterministic code from linked evidence." : "No customer-facing amount is shown without linked evidence and a deterministic calculation." }, { key: "confidence", label: "Confidence", value: record.confidence, display: record.confidence == null ? "Unknown" : `${Math.round((record.confidence as number) * 100)}%` }, { key: "generatedBy", label: "Generated by", value: record.generatedBy }, { key: "ruleVersion", label: "Calculation rule", value: record.ruleVersion }, { key: "evidenceCount", label: "Evidence references", value: record.evidenceCount }, { key: "sourceDocumentId", label: "Source document", value: record.sourceDocumentId, display: record.sourceDocumentId ? "Linked source document" : "Not linked" }, { key: "expenseAccountReference", label: "Expense account", value: record.expenseAccountReference }, { key: "locationName", label: "Service location", value: record.locationName }, { key: "lastEvaluatedAt", label: "Last evaluated", value: record.lastEvaluatedAt, display: date(record.lastEvaluatedAt as string | null) },
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
        {field.type === "textarea" ? <textarea value={String(value)} onChange={(e) => setValue(e.target.value)} autoFocus /> : field.type === "select" ? <select value={String(value)} onChange={(e) => setValue(e.target.value)} autoFocus>{field.options?.map((option) => { const value = typeof option === "string" ? option : option.value; const label = typeof option === "string" ? text(option) : option.label; return <option key={value || "empty"} value={value}>{label}</option>; })}</select> : field.type === "checkbox" ? <label className="record-check"><input type="checkbox" checked={Boolean(value)} onChange={(e) => setValue(e.target.checked)} /> {value ? "Yes" : "No"}</label> : <input type={field.type ?? "text"} value={String(value)} onChange={(e) => setValue(e.target.value)} autoFocus />}
        <button className="record-icon-button confirm" aria-label={`Save ${field.label}`} disabled={busy} onClick={() => void save()}><Check /></button><button className="record-icon-button" aria-label={`Cancel editing ${field.label}`} onClick={() => { setValue(field.value ?? ""); setEditing(false); }}><X /></button>
      </> : <><strong>{shown}</strong>{field.editable && canEdit ? <button className="record-icon-button" aria-label={`Edit ${field.label}`} title={`Edit ${field.label}`} onClick={() => setEditing(true)}><Pencil /></button> : <span className="record-protected" title="Protected field"><LockKeyhole /></span>}<button className="record-icon-button" aria-label={`Copy ${field.label}`} title={`Copy ${field.label}`} onClick={() => void copy()}><Copy /></button></>}
    </div>
  </div>;
}

function SavingsReviewPanel({ outcome, canDecide }: { outcome: PortalData["savings"][number]; canDecide: boolean }) {
  const [confirmed, setConfirmed] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const operation = outcome.status === "baseline_review" ? "accept_baseline" : outcome.status === "ready_for_review" ? "verify" : null;
  const decisionLabel = operation === "accept_baseline" ? "Accept reviewed baseline" : "Verify reviewed outcome";
  const reviewCopy = operation === "accept_baseline"
    ? "Confirm that the baseline source, period, amount, method, and stated assumptions are appropriate before work begins."
    : "Confirm that the later source, comparison method, calculation, assumptions, and known exclusions support the recorded result.";

  const submit = async (nextOperation: "accept_baseline" | "verify" | "reject") => {
    if (nextOperation !== "reject" && !confirmed) return;
    if (nextOperation === "reject" && reason.trim().length < 3) {
      toast.error("Add a rejection reason", "Explain what is wrong or what evidence is missing.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/portal/savings/${outcome.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ operation: nextOperation, reason: nextOperation === "reject" ? reason.trim() : undefined }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "The result decision could not be saved.");
      toast.success(nextOperation === "accept_baseline" ? "Baseline accepted." : nextOperation === "verify" ? "Result verified." : "Result rejected.");
      setConfirmed(false);
      setRejecting(false);
      setReason("");
      router.refresh();
    } catch (error) {
      toast.error("Couldn’t save this decision", error instanceof Error ? error.message : "Try again.");
    } finally {
      setBusy(false);
    }
  };

  return <section className="record-section savings-review" id="verification">
    <div className="record-section-heading"><div><h2>Verification review</h2><p>Potential value becomes verified only after a human reviews the evidence and deterministic method.</p></div><span className="record-section-count">{text(outcome.status)}</span></div>
    <div className="savings-review-grid">
      <div><span>Method</span><strong>{outcome.method}</strong><small>{outcome.methodVersion ?? "Method version not recorded"}</small></div>
      <div><span>Baseline</span><strong>{money(outcome.baselineAmount)}</strong><small>{outcome.baselineAcceptedAt ? `Accepted ${date(outcome.baselineAcceptedAt)}` : "Awaiting acceptance"}</small></div>
      <div><span>Later comparison</span><strong>{money(outcome.comparisonAmount)}</strong><small>{outcome.comparisonAmount == null ? "A later approved invoice is required" : "Recorded from the later approved expense"}</small></div>
      <div><span>Calculated annual value</span><strong>{money(outcome.amount)}</strong><small>{outcome.status === "verified" ? `Verified ${date(outcome.verifiedAt)}` : "Not yet verified"}</small></div>
    </div>
    {Object.keys(outcome.calculationResult).length > 0 && <div className="savings-review-calculation"><span>Deterministic calculation</span><dl>{Object.entries(outcome.calculationResult).map(([key, value]) => <div key={key}><dt>{text(key)}</dt><dd>{text(value)}</dd></div>)}</dl></div>}
    <div className="savings-review-notes">
      <div><span>Assumptions to review</span>{outcome.assumptions.length ? <ul>{outcome.assumptions.map((item) => <li key={item}>{item}</li>)}</ul> : <p>No assumptions were recorded.</p>}</div>
      <div><span>Known exclusions or confounding factors</span>{outcome.exclusions.length ? <ul>{outcome.exclusions.map((item) => <li key={item}>{item}</li>)}</ul> : <p>No exclusions are recorded. Confirm that service scope, usage, credits, taxes, and timing do not explain the change.</p>}</div>
    </div>
    {operation && canDecide && <div className="savings-review-decision">
      <label><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> <span><strong>I reviewed the supporting records and method.</strong><small>{reviewCopy}</small></span></label>
      <div><button className="button button-secondary" type="button" disabled={busy} onClick={() => setRejecting((current) => !current)}>{rejecting ? "Cancel rejection" : "Reject"}</button><button className="button button-primary" type="button" disabled={busy || !confirmed} onClick={() => void submit(operation)}><Check /> {decisionLabel}</button></div>
      {rejecting && <div className="savings-review-reject"><label htmlFor="savings-rejection-reason">Reason for rejection</label><textarea id="savings-rejection-reason" value={reason} maxLength={1000} rows={3} autoFocus placeholder="Explain the incorrect baseline, missing evidence, or confounding factor." onChange={(event) => setReason(event.target.value)} /><button className="button button-secondary" type="button" disabled={busy || reason.trim().length < 3} onClick={() => void submit("reject")}><X /> Record rejection</button></div>}
    </div>}
    {operation && !canDecide && <p className="savings-review-readonly">An owner or administrator must make this financial decision.</p>}
    {outcome.status === "evidence_pending" && <p className="savings-review-readonly">The baseline is accepted. This record will return for review after a later approved invoice and completed action produce a valid comparison.</p>}
  </section>;
}

export function PortalRecordDetail({ data, kind, id }: { data: PortalData; kind: Kind; id: string }) {
  const detail = build(data, kind, id); const meta = labels[kind];
  if (!detail) return <div className="record-detail"><GlobalBackControl className="record-back" /><section className="record-empty"><h1>{meta.noun} not found</h1><p>This record is not part of your workspace, or it no longer exists.</p></section></div>;
  const recordId = String((detail.record as Record<string, unknown>).id); const vendorId = (detail.record as Record<string, unknown>).vendorId as string | null;
  const audits = data.auditEvents.filter((event) => event.resourceId === detail.updateId || event.resourceId === recordId).slice(0, 8);
  const context = portalRecordContext(data, kind, id);
  const { related, evidence, lineItems, quality } = context;
  const relatedDocumentIds = new Set<string>([
    ...context.evidenceDocumentIds,
    ...evidence.map((item) => item.documentId),
  ].filter(Boolean));
  const recordFiles = data.documents.filter((item) =>
    relatedDocumentIds.has(item.id) || (vendorId ? item.vendorId === vendorId : false),
  );
  const savingsOutcome = kind === "savings" ? data.savings.find((item) => item.id === id) ?? null : null;
  return <div className="record-detail">
    <GlobalBackControl className="record-back" />
    <header className="record-detail-header"><div><span className="record-eyebrow">{meta.noun} record</span><h1>{detail.title}</h1><p>{detail.subtitle}</p></div><span className="record-status"><i />{text(detail.status)}</span></header>
    <nav className="record-tabs" aria-label={`${meta.noun} detail sections`}>{savingsOutcome && <a href="#verification">Verification</a>}<a href="#overview">Overview</a>{lineItems.length > 0 && <a href="#line-items">Line items</a>}<a href="#files">Files</a><a href="#quality">Data quality</a><a href="#related">Related records</a>{evidence.length > 0 && <a href="#evidence">Evidence</a>}<a href="#history">History</a></nav>
    <div className="record-detail-layout"><main>
      {savingsOutcome && <SavingsReviewPanel outcome={savingsOutcome} canDecide={["owner", "admin"].includes(data.currentUser.role)} />}
      <section className="record-section" id="overview"><div className="record-section-heading"><div><h2>Record details</h2><p>Edit one field at a time. Every saved change is attributed and audited.</p></div></div><div className="record-fields">{detail.fields.map((field) => <FieldRow key={field.key} kind={kind} updateId={detail.updateId} expectedUpdatedAt={detail.updatedAt} field={field} canEdit={data.currentUser.role !== "viewer"} />)}</div></section>
      {lineItems.length > 0 && <section className="record-section" id="line-items"><div className="record-section-heading"><div><h2>Invoice line items</h2><p>Normalized charges and credits retained from the reviewed invoice.</p></div><span className="record-section-count">{lineItems.length}</span></div><div className="record-line-items"><div className="record-line-item record-line-item--heading"><span>Line</span><span>Description</span><span>Quantity</span><span>Unit price</span><span>Amount</span></div>{lineItems.map((item) => <div className="record-line-item" key={item.id}><span>{item.lineNumber}</span><span><strong>{item.description}</strong><small>{[item.category, item.servicePeriodStart && item.servicePeriodEnd ? `${date(item.servicePeriodStart)} – ${date(item.servicePeriodEnd)}` : null].filter(Boolean).join(" · ") || "No additional classification"}</small></span><span>{item.quantity ?? "—"}</span><span>{item.unitPrice == null ? "—" : money(item.unitPrice)}</span><span>{money(item.amount)}</span></div>)}</div></section>}
      <div id="files" className="record-files-anchor"><RecordFilesWorkspace files={recordFiles.map((item) => ({ id: item.id, name: item.originalFilename, documentType: item.documentType, mimeType: item.mimeType, status: item.status, createdAt: item.createdAt, updatedAt: item.updatedAt, byteSize: item.byteSize, pageCount: item.pageCount, summary: item.summary, confidence: item.confidence, evidenceCount: data.evidenceReferences.filter((reference) => reference.documentId === item.id).length, contextLabel: item.vendorName, href: `/api/portal/documents/${item.id}/download`, sourceAvailable: !item.sourcePurgedAt }))} title={`${meta.noun} files`} description="A protected workspace for original source files and evidence connected to this record." /></div>
      {evidence.length > 0 && <section className="record-section" id="evidence"><div className="record-section-heading"><div><h2>Source evidence</h2><p>Exact excerpts retained from the private source document.</p></div></div><div className="record-evidence-list">{evidence.map((item) => <article key={item.id}><span>Page {item.pageNumber}{item.fieldPath ? ` · ${item.fieldPath}` : ""}</span><blockquote>{item.textExcerpt}</blockquote><Link href={`/api/portal/documents/${item.documentId}/download`}>Open source <FileText /></Link></article>)}</div></section>}
    </main><aside>
      <section className="record-side-section" id="quality"><h2>Data quality</h2><div className="record-quality-list">{quality.map((item) => <div key={item.label} className={`record-quality record-quality--${item.status}`}><i /><span><strong>{item.label}</strong><small>{item.value}</small></span></div>)}</div></section>
      <section className="record-side-section" id="related"><h2>Related records</h2>{related.length ? related.map((item) => <Link className="record-related" href={item.href} key={`${item.type}-${item.href}`}><span><small>{item.type}</small><strong>{item.title}</strong>{item.detail && <em>{text(item.detail)}</em>}</span><ChevronRight /></Link>) : <p>No related records yet.</p>}</section>
      <section className="record-side-section" id="history"><h2>Recent activity</h2>{audits.length ? audits.map((event) => <div className="record-audit" key={event.id}><i /><span><strong>{text(event.action)}</strong><small>{event.actorName} · {date(event.createdAt)}</small></span></div>) : <p>No recorded changes yet.</p>}</section>
    </aside></div>
  </div>;
}
