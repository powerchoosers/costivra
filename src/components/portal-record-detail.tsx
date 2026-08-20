"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Copy, FileText, LockKeyhole, Pencil, X } from "@/lib/icons";
import { useEffect, useState } from "react";
import { useToast } from "@/components/toast-provider";
import { WorkspaceDecisionSummary, WorkspaceStatusBadge, WorkspaceViewTabs } from "@/components/ui/workspace-primitives";
import { SkeletonBlock } from "@/components/ui/skeletons";
import { RecordFilesWorkspace } from "@/components/record-files-workspace";
import { GlobalBackControl } from "@/components/navigation-history";
import { PageBreadcrumbs, PageScopeIndicator } from "@/components/page-scope-indicator";
import type { PortalData } from "@/lib/portal/types";
import { opportunityTrustLabel } from "@/lib/domain/opportunity-trust";
import { canShowFindingCalculationOutput, describeFindingReadiness, hasFindingCalculation, presentFindingEvidence } from "@/lib/portal/finding-presentation";
import { invoiceIdentityMatchLabel, invoiceReconciliationLabel, invoiceVendorMatchLabel } from "@/lib/portal/invoice-presentation";
import { resultIsVerified, resultNeedsVerificationReview, resultVerificationStatus } from "@/lib/portal/workflow-workspaces";
import {
  portalRecordContext,
  type PortalRecordKind,
} from "@/lib/portal/record-context";
import { formatFinancialDate } from "@/lib/ui/date-format";
import { getMotionSafeScrollBehavior } from "@/lib/ui/motion";

type Kind = PortalRecordKind;
type FieldOption = string | { value: string; label: string };
type Field = { key: string; label: string; value: unknown; display?: string; editable?: boolean; type?: "text" | "textarea" | "date" | "datetime-local" | "number" | "checkbox" | "select"; options?: FieldOption[]; note?: string };

type RecordFieldGroupDefinition = {
  description: string;
  id: string;
  keys: readonly string[];
  label: string;
};

export type RecordFieldGroup<T extends { key: string }> = Omit<RecordFieldGroupDefinition, "keys"> & {
  fields: T[];
};

const recordFieldGroups: Record<Kind, readonly RecordFieldGroupDefinition[]> = {
  vendor: [
    { id: "relationship", label: "Relationship", description: "The workspace-specific identity and lifecycle for this vendor.", keys: ["name", "category", "website", "relationshipStatus"] },
    { id: "spend", label: "Spend context", description: "The recurring-cost information used to understand this relationship.", keys: ["annualizedSpend", "spendCadence"] },
  ],
  expense: [
    { id: "coverage", label: "Coverage & assignment", description: "Who this expense belongs to and the period it covers.", keys: ["vendorName", "category", "locationId", "periodStart", "periodEnd"] },
    { id: "financial", label: "Financial record", description: "Protected amounts retained from the reviewed source record.", keys: ["amount", "priorPeriodAmount"] },
    { id: "review", label: "Review status", description: "Where this expense is in the current review workflow.", keys: ["status"] },
  ],
  contract: [
    { id: "agreement", label: "Agreement", description: "The contract identity, coverage, and renewal terms to confirm before acting.", keys: ["title", "category", "locationId", "startDate", "endDate", "noticePeriodDays", "autoRenews"] },
    { id: "financial", label: "Financial & ownership", description: "The recorded value and internal owner responsible for this agreement.", keys: ["annualValue", "ownerName", "status"] },
  ],
  document: [
    { id: "source", label: "Source & extraction", description: "The immutable source identity and the current extraction record for this file.", keys: ["originalFilename", "documentType", "summary", "mimeType", "byteSize", "pageCount", "confidence", "sha256"] },
  ],
  invoice: [
    { id: "reference", label: "Invoice reference", description: "The supplier, timing, purchase, and internal-review details for this invoice.", keys: ["invoiceNumber", "invoiceDate", "dueDate", "servicePeriodStart", "servicePeriodEnd", "purchaseOrderNumber", "expenseCategory", "reviewPriority", "reviewNotes"] },
    { id: "amounts", label: "Amounts", description: "Source-derived totals, balances, credits, and charges shown in the invoice currency.", keys: ["totalAmount", "subtotal", "currentCharges", "previousBalance", "paymentsAndCredits", "balanceForward", "currentPeriodCredits", "taxTotal", "amountDue"] },
    { id: "quality", label: "Matching & quality", description: "Deterministic reconciliation and identity checks that determine whether a review is needed.", keys: ["reconciliationStatus", "vendorMatchStatus", "workspaceCustomerMatchStatus", "expenseAccountMatchStatus", "serviceLocationMatchStatus", "extractionConfidence"] },
  ],
  opportunity: [
    { id: "finding", label: "Finding", description: "The operational issue, priority, and timing that need attention.", keys: ["title", "summary", "priority", "deadlineAt"] },
    { id: "assessment", label: "Assessment", description: "The trust and calculation context behind the recorded opportunity.", keys: ["trustState", "estimatedAnnualValue", "confidence", "generatedBy", "ruleVersion"] },
    { id: "source", label: "Evidence & source", description: "The records and location that anchor this finding to a real operating cost.", keys: ["evidenceCount", "sourceDocumentId", "expenseAccountReference", "locationName", "lastEvaluatedAt"] },
  ],
  action: [
    { id: "plan", label: "Action plan", description: "What must happen, when it is due, and the intended operating outcome.", keys: ["title", "description", "actionType", "priority", "dueAt"] },
    { id: "approval", label: "Approval & execution", description: "The guarded workflow state that controls whether this action can advance.", keys: ["status", "approvalDecision"] },
  ],
  savings: [
    { id: "result", label: "Recorded result", description: "The outcome record and the value state currently supported by evidence.", keys: ["title", "valueType", "amount"] },
    { id: "method", label: "Method", description: "The recorded verification method and version used for this result.", keys: ["method", "methodVersion"] },
    { id: "comparison", label: "Baseline & comparison", description: "The accepted baseline and later comparison needed before value is verified.", keys: ["baselineAmount", "comparisonAmount", "baselineAcceptedAt", "verifiedAt"] },
  ],
};

/**
 * Keeps dense record fields in small, domain-specific groups without ever
 * dropping a newly added field that is not yet mapped to a group.
 */
export function groupRecordFields<T extends { key: string }>(kind: Kind, fields: readonly T[]): RecordFieldGroup<T>[] {
  const assigned = new Set<string>();
  const groups = recordFieldGroups[kind]
    .map((group) => {
      const groupKeys = new Set(group.keys);
      const groupedFields = fields.filter((field) => groupKeys.has(field.key));
      groupedFields.forEach((field) => assigned.add(field.key));
      return { id: group.id, label: group.label, description: group.description, fields: groupedFields };
    })
    .filter((group) => group.fields.length > 0);
  const remainingFields = fields.filter((field) => !assigned.has(field.key));

  return remainingFields.length
    ? [...groups, { id: "additional", label: "Additional record details", description: "Other recorded fields available for this item.", fields: remainingFields }]
    : groups;
}

const labels: Record<Kind, { plural: string; noun: string }> = {
  vendor: { plural: "vendors", noun: "Vendor" }, expense: { plural: "expenses", noun: "Expense" }, contract: { plural: "contracts", noun: "Contract" }, document: { plural: "documents", noun: "Document" }, invoice: { plural: "documents", noun: "Invoice" }, opportunity: { plural: "findings", noun: "Finding" }, action: { plural: "actions", noun: "Action" }, savings: { plural: "results", noun: "Result" },
};
export const formatRecordMoney = (value: number | null | undefined, currency = "USD") => value == null ? "Not recorded" : new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
const money = formatRecordMoney;
export const resolveRecordDetailCurrency = (workspaceCurrency: string | null | undefined, invoiceCurrency?: string | null) => invoiceCurrency || workspaceCurrency || "USD";
const date = (value: string | null | undefined) => formatFinancialDate(value, "Not recorded");
const text = (value: unknown) => value === null || value === undefined || value === "" ? "Not recorded" : String(value).replaceAll("_", " ").replaceAll(".", " ").replace(/([a-z])([A-Z])/g, "$1 $2");

function build(data: PortalData, kind: Kind, id: string) {
  const editable = data.currentUser.role !== "viewer";
  const workspaceCurrency = resolveRecordDetailCurrency(data.organization.currency);
  if (kind === "vendor") {
    const record = data.vendors.find((x) => x.id === id);
    if (!record) return null;
    return { record, updateId: record.relationshipId, title: record.name, subtitle: record.category, status: record.relationshipStatus, updatedAt: record.updatedAt, fields: [
      { key: "name", label: "Canonical vendor", value: record.name, note: "Shared directory value; contact support to correct it." },
      { key: "category", label: "Category", value: record.category }, { key: "website", label: "Website", value: record.website },
      { key: "annualizedSpend", label: "Annualized spend", value: record.annualizedSpend, display: money(record.annualizedSpend, workspaceCurrency), editable, type: "number" as const },
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
    { key: "amount", label: "Recorded amount", value: record.amount, display: money(record.amount as number, workspaceCurrency), note: "Protected financial fact from the source record." }, { key: "priorPeriodAmount", label: "Prior period", value: record.priorPeriodAmount, display: money(record.priorPeriodAmount as number | null, workspaceCurrency) },
    { key: "status", label: "Review status", value: record.status, editable, type: "select", options: ["processing", "needs_review", "reviewed", "archived"] },
  ] as Field[] };
  if (kind === "contract") return { ...common, title: String(record.title), subtitle: String(record.vendorName), status: String(record.status), fields: [
    { key: "title", label: "Contract title", value: record.title, editable, type: "text" }, { key: "category", label: "Category", value: record.category, editable, type: "text" },
    { key: "locationId", label: "Location", value: record.locationId ?? "", display: String(record.locationName ?? "All locations / not assigned"), editable, type: "select", options: [{ value: "", label: "All locations / not assigned" }, ...data.locations.map((location) => ({ value: location.id, label: `${location.name}${location.status === "inactive" ? " · archived" : ""}` }))] },
    { key: "startDate", label: "Start date", value: record.startDate, display: date(record.startDate as string | null), editable, type: "date" }, { key: "endDate", label: "End date", value: record.endDate, display: date(record.endDate as string | null), editable, type: "date" },
    { key: "noticePeriodDays", label: "Notice period", value: record.noticePeriodDays, display: record.noticePeriodDays == null ? "Not recorded" : `${record.noticePeriodDays} days`, editable, type: "number" }, { key: "annualValue", label: "Annual value", value: record.annualValue, display: money(record.annualValue as number | null, workspaceCurrency), editable, type: "number", note: "Manual contract value; edits are audited." },
    { key: "ownerName", label: "Internal owner", value: record.ownerName, editable, type: "text" }, { key: "autoRenews", label: "Auto-renews", value: record.autoRenews, display: record.autoRenews ? "Yes" : "No", editable, type: "checkbox" },
    { key: "status", label: "Status", value: record.status, editable, type: "select", options: ["draft", "active", "expired", "terminated"] },
  ] as Field[] };
  if (kind === "document") return { ...common, title: String(record.originalFilename), subtitle: String(record.vendorName), status: String(record.status), fields: [
    { key: "originalFilename", label: "Original filename", value: record.originalFilename, note: "Immutable source identity." }, { key: "documentType", label: "Document type", value: record.documentType, editable, type: "text" },
    { key: "summary", label: "Extraction summary", value: record.summary, editable, type: "textarea" }, { key: "mimeType", label: "File type", value: record.mimeType }, { key: "byteSize", label: "File size", value: record.byteSize, display: `${((record.byteSize as number) / 1024).toFixed(1)} KB` },
    { key: "pageCount", label: "Pages", value: record.pageCount }, { key: "confidence", label: "Extraction confidence", value: record.confidence, display: record.confidence == null ? "Unknown" : `${Math.round((record.confidence as number) * 100)}%` }, { key: "sha256", label: "SHA-256 provenance", value: record.sha256 },
  ] as Field[] };
  if (kind === "invoice") {
    const invoiceCurrency = resolveRecordDetailCurrency(workspaceCurrency, typeof record.currency === "string" ? record.currency : null);
    return { ...common, title: record.invoiceNumber ? `Invoice ${record.invoiceNumber}` : "Invoice awaiting number", subtitle: String(record.vendorName), status: String(record.reviewStatus), fields: [
    { key: "invoiceNumber", label: "Invoice number", value: record.invoiceNumber, editable, type: "text" }, { key: "invoiceDate", label: "Invoice date", value: record.invoiceDate, display: date(record.invoiceDate as string | null), editable, type: "date" }, { key: "dueDate", label: "Due date", value: record.dueDate, display: date(record.dueDate as string | null), editable, type: "date" },
    { key: "servicePeriodStart", label: "Service start", value: record.servicePeriodStart, display: date(record.servicePeriodStart as string | null), editable, type: "date" }, { key: "servicePeriodEnd", label: "Service end", value: record.servicePeriodEnd, display: date(record.servicePeriodEnd as string | null), editable, type: "date" },
    { key: "purchaseOrderNumber", label: "Purchase order", value: record.purchaseOrderNumber, editable, type: "text" }, { key: "expenseCategory", label: "Expense category", value: record.expenseCategory, editable, type: "text" }, { key: "reviewPriority", label: "Review priority", value: record.reviewPriority, editable, type: "select", options: ["low", "normal", "high", "urgent"] },
    { key: "reviewNotes", label: "Reviewer notes", value: record.reviewNotes, editable, type: "textarea" }, { key: "totalAmount", label: "Reconciled total", value: record.totalAmount, display: money(record.totalAmount as number | null, invoiceCurrency), note: "Protected extracted financial fact." },
    { key: "subtotal", label: "Subtotal", value: record.subtotal, display: money(record.subtotal as number | null, invoiceCurrency) }, { key: "currentCharges", label: "Current charges", value: record.currentCharges, display: money(record.currentCharges as number | null, invoiceCurrency), note: "Source-labeled current-period charges; not a carried balance." }, { key: "previousBalance", label: "Previous balance", value: record.previousBalance, display: money(record.previousBalance as number | null, invoiceCurrency) }, { key: "paymentsAndCredits", label: "Payments and credits", value: record.paymentsAndCredits, display: money(record.paymentsAndCredits as number | null, invoiceCurrency) }, { key: "balanceForward", label: "Balance forward", value: record.balanceForward, display: money(record.balanceForward as number | null, invoiceCurrency) }, { key: "currentPeriodCredits", label: "Current-period credits", value: record.currentPeriodCredits, display: money(record.currentPeriodCredits as number | null, invoiceCurrency) }, { key: "taxTotal", label: "Tax", value: record.taxTotal, display: money(record.taxTotal as number | null, invoiceCurrency) }, { key: "amountDue", label: "Amount due", value: record.amountDue, display: money(record.amountDue as number | null, invoiceCurrency) },
    { key: "reconciliationStatus", label: "Reconciliation", value: record.reconciliationStatus, display: invoiceReconciliationLabel(record.reconciliationStatus as string | null) }, { key: "vendorMatchStatus", label: "Vendor match", value: record.vendorMatchStatus, display: invoiceVendorMatchLabel(record.vendorMatchStatus as string | null) }, { key: "workspaceCustomerMatchStatus", label: "Customer identity", value: record.workspaceCustomerMatchStatus, display: invoiceIdentityMatchLabel(record.workspaceCustomerMatchStatus as string | null) }, { key: "expenseAccountMatchStatus", label: "Account match", value: record.expenseAccountMatchStatus, display: invoiceIdentityMatchLabel(record.expenseAccountMatchStatus as string | null) }, { key: "serviceLocationMatchStatus", label: "Location match", value: record.serviceLocationMatchStatus, display: invoiceIdentityMatchLabel(record.serviceLocationMatchStatus as string | null) }, { key: "extractionConfidence", label: "Confidence", value: record.extractionConfidence, display: record.extractionConfidence == null ? "Unknown" : `${Math.round((record.extractionConfidence as number) * 100)}%` },
    ] as Field[] };
  }
  if (kind === "opportunity") {
    const trustState = record.trustState as PortalData["opportunities"][number]["trustState"];
    const evidence = presentFindingEvidence({
      recordedEvidenceCount: Number(record.evidenceCount ?? 0),
      accessibleEvidenceCount: data.evidenceReferences.filter((item) => item.opportunityId === String(record.id)).length,
    });
    return { ...common, title: String(record.title), subtitle: String(record.vendorName), status: String(record.status), fields: [
      { key: "title", label: "Finding", value: record.title, editable, type: "text" }, { key: "summary", label: "Summary", value: record.summary, editable, type: "textarea" }, { key: "priority", label: "Priority", value: record.priority, editable, type: "select", options: ["low", "medium", "high"] }, { key: "deadlineAt", label: "Deadline", value: record.deadlineAt, display: date(record.deadlineAt as string | null), editable, type: "datetime-local" },
      { key: "trustState", label: "Trust state", value: record.trustState, display: opportunityTrustLabel(trustState), note: "This state controls what can be shown as a customer-facing financial claim." }, { key: "estimatedAnnualValue", label: "Estimated annual value", value: record.estimatedAnnualValue, display: record.monetaryClaimAllowed ? money(record.estimatedAnnualValue as number | null, workspaceCurrency) : trustState === "demo_example" ? "Sample only" : "Not shown until evidence and calculation are complete", note: record.monetaryClaimAllowed ? "Calculated by deterministic code from linked evidence." : "No customer-facing amount is shown without linked evidence and a deterministic calculation." }, { key: "confidence", label: "Confidence", value: record.confidence, display: record.confidence == null ? "Unknown" : `${Math.round((record.confidence as number) * 100)}%` }, { key: "generatedBy", label: "Generated by", value: record.generatedBy }, { key: "ruleVersion", label: "Calculation rule", value: record.ruleVersion }, { key: "evidenceCount", label: "Evidence references", value: record.evidenceCount, display: evidence.label }, { key: "sourceDocumentId", label: "Source document", value: record.sourceDocumentId, display: record.sourceDocumentId ? "Linked source document" : "Not linked" }, { key: "expenseAccountReference", label: "Expense account", value: record.expenseAccountReference }, { key: "locationName", label: "Service location", value: record.locationName }, { key: "lastEvaluatedAt", label: "Last evaluated", value: record.lastEvaluatedAt, display: date(record.lastEvaluatedAt as string | null) },
    ] as Field[] };
  }
  if (kind === "action") return { ...common, title: String(record.title), subtitle: String(record.vendorName), status: String(record.status), fields: [
    { key: "title", label: "Action title", value: record.title, editable, type: "text" }, { key: "description", label: "Instructions", value: record.description, editable, type: "textarea" }, { key: "actionType", label: "Action type", value: record.actionType }, { key: "priority", label: "Priority", value: record.priority, editable, type: "select", options: ["low", "medium", "high", "urgent"] }, { key: "dueAt", label: "Due date", value: record.dueAt, display: date(record.dueAt as string | null), editable, type: "datetime-local" },
    { key: "status", label: "Execution state", value: record.status, note: "Changed only through the approval and execution controls." }, { key: "approvalDecision", label: "Approval", value: record.approvalDecision },
  ] as Field[] };
  const outcome = record as unknown as PortalData["savings"][number];
  const verified = resultIsVerified(outcome);
  return { ...common, title: String(record.title), subtitle: String(record.method), status: resultVerificationStatus(outcome), fields: [
    { key: "title", label: "Outcome title", value: record.title, editable, type: "text" }, { key: "valueType", label: "Value type", value: record.valueType }, { key: "amount", label: "Verified value", value: record.amount, display: verified ? money(record.amount as number, workspaceCurrency) : "Not verified", note: verified ? "Protected deterministic result." : "This amount does not count as verified until its baseline, comparison, method, and calculation evidence are complete." }, { key: "method", label: "Method", value: record.method }, { key: "methodVersion", label: "Method version", value: record.methodVersion },
    { key: "baselineAmount", label: "Accepted baseline", value: record.baselineAmount, display: money(record.baselineAmount as number | null, workspaceCurrency) }, { key: "comparisonAmount", label: "Comparison amount", value: record.comparisonAmount, display: money(record.comparisonAmount as number | null, workspaceCurrency) }, { key: "baselineAcceptedAt", label: "Baseline accepted", value: record.baselineAcceptedAt, display: date(record.baselineAcceptedAt as string | null) }, { key: "verifiedAt", label: "Verified at", value: record.verifiedAt, display: verified ? date(record.verifiedAt as string | null) : "Not verified" },
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
      {busy ? (
        <SkeletonBlock height="1.25rem" width="120px" />
      ) : editing ? <>
        {field.type === "textarea" ? <textarea value={String(value)} onChange={(e) => setValue(e.target.value)} autoFocus /> : field.type === "select" ? <select value={String(value)} onChange={(e) => setValue(e.target.value)} autoFocus>{field.options?.map((option) => { const value = typeof option === "string" ? option : option.value; const label = typeof option === "string" ? text(option) : option.label; return <option key={value || "empty"} value={value}>{label}</option>; })}</select> : field.type === "checkbox" ? <label className="record-check"><input type="checkbox" checked={Boolean(value)} onChange={(e) => setValue(e.target.checked)} /> {value ? "Yes" : "No"}</label> : <input type={field.type ?? "text"} value={String(value)} onChange={(e) => setValue(e.target.value)} autoFocus />}
        <button className="record-icon-button confirm" aria-label={`Save ${field.label}`} disabled={busy} onClick={() => void save()}><Check /></button><button className="record-icon-button" aria-label={`Cancel editing ${field.label}`} onClick={() => { setValue(field.value ?? ""); setEditing(false); }}><X /></button>
      </> : <><strong>{shown}</strong>{field.editable && canEdit ? <button className="record-icon-button" aria-label={`Edit ${field.label}`} title={`Edit ${field.label}`} onClick={() => setEditing(true)}><Pencil /></button> : <span className="record-protected" title="Protected field"><LockKeyhole /></span>}<button className="record-icon-button" aria-label={`Copy ${field.label}`} title={`Copy ${field.label}`} onClick={() => void copy()}><Copy /></button></>}
    </div>
  </div>;
}

function SavingsReviewPanel({ outcome, currency, canDecide }: { outcome: PortalData["savings"][number]; currency: string; canDecide: boolean }) {
  const [confirmed, setConfirmed] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const verified = resultIsVerified(outcome);
  const needsVerificationReview = resultNeedsVerificationReview(outcome);
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
    <div className="record-section-heading"><div><h2>Verification review</h2><p>Potential value becomes verified only after a human reviews the evidence and deterministic method.</p></div><span className="record-section-count">{text(resultVerificationStatus(outcome))}</span></div>
    <div className="savings-review-grid">
      <div><span>Method</span><strong>{outcome.method}</strong><small>{outcome.methodVersion ?? "Method version not recorded"}</small></div>
      <div><span>Baseline</span><strong>{money(outcome.baselineAmount, currency)}</strong><small>{outcome.baselineAcceptedAt ? `Accepted ${date(outcome.baselineAcceptedAt)}` : "Awaiting acceptance"}</small></div>
      <div><span>Later comparison</span><strong>{money(outcome.comparisonAmount, currency)}</strong><small>{outcome.comparisonAmount == null ? "A later approved invoice is required" : "Recorded from the later approved expense"}</small></div>
      <div><span>Calculated annual value</span><strong>{verified ? money(outcome.amount, currency) : "Not verified"}</strong><small>{verified ? `Verified ${date(outcome.verifiedAt)}` : needsVerificationReview ? "Baseline, comparison, method, or calculation evidence is incomplete" : "Not yet verified"}</small></div>
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
    {needsVerificationReview && <p className="savings-review-readonly">This record has a legacy verified status but does not contain the baseline, comparison, method, and calculation evidence Costivra requires. It is not counted as verified value.</p>}
  </section>;
}

type RecordSectionTab = { id: string; label: string };

export function resolveRecordDetailSection(tabIds: string[], hash: string) {
  const requested = hash.replace(/^#/, "");
  return tabIds.includes(requested) ? requested : (tabIds[0] ?? "");
}

function RecordSectionTabs({ label, tabs }: { label: string; tabs: RecordSectionTab[] }) {
  const tabKey = tabs.map((tab) => tab.id).join("|");
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? "");

  useEffect(() => {
    const tabIds = tabKey ? tabKey.split("|") : [];
    const syncFromHash = () => setActiveId(resolveRecordDetailSection(tabIds, window.location.hash));
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [tabKey]);

  const showSection = (id: string) => {
    setActiveId(id);
    const nextHash = `#${id}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}${nextHash}`);
    }
    document.getElementById(id)?.scrollIntoView({
      behavior: getMotionSafeScrollBehavior(),
      block: "start",
    });
  };

  return <WorkspaceViewTabs activeId={activeId} ariaLabel={`${label} detail sections`} className="record-tabs" onChange={showSection} recordNavigation tabs={tabs} />;
}

const decisionFactKeys: Record<Kind, readonly string[]> = {
  vendor: ["annualizedSpend", "spendCadence", "relationshipStatus"],
  expense: ["amount", "periodEnd", "status"],
  contract: ["annualValue", "endDate", "noticePeriodDays"],
  document: ["documentType", "pageCount", "confidence"],
  invoice: ["totalAmount", "dueDate", "reconciliationStatus"],
  opportunity: ["trustState", "evidenceCount", "deadlineAt"],
  action: ["approvalDecision", "priority", "dueAt"],
  savings: ["amount", "valueType", "verifiedAt"],
};

const decisionBriefCopy: Record<Kind, { heading: string; fallback: string; narrativeKeys: readonly string[] }> = {
  vendor: { heading: "Relationship context", fallback: "Review the relationship record, source facts, and next step before making a change.", narrativeKeys: [] },
  expense: { heading: "Expense context", fallback: "Confirm the recorded amount, covered period, and account assignment before relying on this expense.", narrativeKeys: [] },
  contract: { heading: "Renewal context", fallback: "Review the term, notice window, and linked source before changing this agreement.", narrativeKeys: [] },
  document: { heading: "Source document", fallback: "Confirm the document type, extraction quality, and source provenance before using this file in a decision.", narrativeKeys: ["summary"] },
  invoice: { heading: "Invoice review", fallback: "Confirm the reconciled total, due date, and source before approving this invoice for the next workflow step.", narrativeKeys: ["reviewNotes"] },
  opportunity: { heading: "What needs attention", fallback: "Review the linked evidence and calculation before taking action on this finding.", narrativeKeys: ["summary"] },
  action: { heading: "What this work is for", fallback: "Review the approval state, owner, and due date before advancing this work.", narrativeKeys: ["description"] },
  savings: { heading: "Verification context", fallback: "Review the accepted baseline, comparison, and evidence before relying on this recorded result.", narrativeKeys: [] },
};

function fieldDisplay(field: Field) {
  if (field.display) return field.display;
  if (typeof field.value === "boolean") return field.value ? "Yes" : "No";
  return text(field.value);
}

type RecordDecisionAction = { href: string; label: string };

function RecordDecisionBrief({ kind, fields, action }: { kind: Kind; fields: Field[]; action: RecordDecisionAction | null }) {
  const copy = decisionBriefCopy[kind];
  const narrative = fields.find((field) => copy.narrativeKeys.includes(field.key));
  const narrativeValue = narrative ? fieldDisplay(narrative) : null;
  const facts = decisionFactKeys[kind]
    .map((key) => fields.find((field) => field.key === key))
    .filter((field): field is Field => Boolean(field))
    .map((field) => ({ label: field.label, value: fieldDisplay(field) }))
    .filter((fact) => fact.value !== "Not recorded");
  const description = narrativeValue && narrativeValue !== "Not recorded" ? narrativeValue : copy.fallback;

  return <WorkspaceDecisionSummary
    ariaLabel={copy.heading}
    className={`workspace-decision-summary--${kind}`}
    description={description}
    facts={facts}
    heading={copy.heading}
    actions={action ? <a className="button button-primary" href={action.href}>{action.label}</a> : undefined}
  />;
}

function FindingDecisionBrief({
  finding,
  accessibleEvidenceCount,
  sourceHref,
  vendorHref,
}: {
  finding: PortalData["opportunities"][number];
  accessibleEvidenceCount: number;
  sourceHref: string | null;
  vendorHref: string | null;
}) {
  const evidence = presentFindingEvidence({
    recordedEvidenceCount: finding.evidenceCount,
    accessibleEvidenceCount,
  });
  const hasCalculation = hasFindingCalculation(finding.ruleVersion, finding.calculationResult);
  const readiness = describeFindingReadiness({
    trustState: finding.trustState,
    evidence,
    hasCalculation,
  });
  const action = accessibleEvidenceCount > 0
    ? { href: "#evidence", label: "Review source evidence", anchor: true }
    : sourceHref
      ? { href: sourceHref, label: "Open source record", anchor: false }
      : vendorHref
        ? { href: vendorHref, label: "Review vendor records", anchor: false }
        : { href: "/app/bills?view=review", label: "Review source bills", anchor: false };

  return <WorkspaceDecisionSummary
    ariaLabel={readiness.heading}
    className="workspace-decision-summary--finding"
    eyebrow="Finding readiness"
    description={readiness.description}
    facts={[
      { label: "Trust state", value: opportunityTrustLabel(finding.trustState) },
      { label: "Source evidence", value: evidence.compactLabel },
      { label: "Calculation", value: hasCalculation ? "Recorded" : "Needed" },
    ]}
    heading={readiness.heading}
    actions={<>
      {action.anchor ? <a className="button button-primary" href={action.href}>{action.label}</a> : <Link className="button button-primary" href={action.href}>{action.label}</Link>}
      <a className="button button-secondary" href="#related">View related records</a>
    </>}
  />;
}

function displayFindingCalculationValue(value: unknown) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return text(value);
  if (Array.isArray(value)) {
    const values = value
      .filter((item) => typeof item === "string" || typeof item === "number" || typeof item === "boolean")
      .map((item) => text(item));
    return values.length ? values.join(", ") : "Not recorded";
  }
  return value == null ? "Not recorded" : "Structured value recorded";
}

function FindingCalculationRecord({
  finding,
  currency,
}: {
  finding: PortalData["opportunities"][number];
  currency: string;
}) {
  const calculationRecorded = hasFindingCalculation(finding.ruleVersion, finding.calculationResult);
  const canShowOutput = canShowFindingCalculationOutput({
    monetaryClaimAllowed: finding.monetaryClaimAllowed,
    ruleVersion: finding.ruleVersion,
    calculationResult: finding.calculationResult,
  });
  const calculationInputs = Object.entries(finding.calculationInputs)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .slice(0, 8);
  const calculationResults = Object.entries(finding.calculationResult).slice(0, 8);
  const assumptions = finding.assumptions.slice(0, 8);
  const calculationStatus = calculationRecorded
    ? canShowOutput ? "Available for review" : "Recorded, still under review"
    : finding.ruleVersion ? "Result needed" : "Method needed";
  const visibleValue = canShowOutput && finding.estimatedAnnualValue != null
    ? money(finding.estimatedAnnualValue, currency)
    : "Not shown";

  return <section className="record-section finding-calculation-record" id="calculation">
    <div className="record-section-heading">
      <div>
        <h2>Method & assumptions</h2>
        <p>See the deterministic record behind this finding. Inputs and output remain protected until this finding is customer-ready.</p>
      </div>
      <span className={`finding-calculation-record__status${canShowOutput ? " is-ready" : ""}`}>{calculationStatus}</span>
    </div>
    <dl className="finding-calculation-record__summary">
      <div><dt>Calculation method</dt><dd>{finding.ruleVersion ?? "Not recorded"}</dd></div>
      <div><dt>Potential annual value</dt><dd>{visibleValue}</dd></div>
      <div><dt>Calculation inputs</dt><dd>{calculationInputs.length ? `${calculationInputs.length} recorded` : "None recorded"}</dd></div>
      <div><dt>Assumptions</dt><dd>{assumptions.length ? `${assumptions.length} recorded` : "None recorded"}</dd></div>
    </dl>
    {canShowOutput ? <div className="finding-calculation-record__details">
      <div className="finding-calculation-record__group">
        <h3>Calculation inputs</h3>
        {calculationInputs.length ? <dl>{calculationInputs.map(([key, value]) => <div key={key}><dt>{text(key)}</dt><dd>{displayFindingCalculationValue(value)}</dd></div>)}</dl> : <p>No calculation inputs were recorded.</p>}
      </div>
      <div className="finding-calculation-record__group">
        <h3>Calculation output</h3>
        {calculationResults.length ? <dl>{calculationResults.map(([key, value]) => <div key={key}><dt>{text(key)}</dt><dd>{displayFindingCalculationValue(value)}</dd></div>)}</dl> : <p>No calculation output was recorded.</p>}
      </div>
      <div className="finding-calculation-record__group finding-calculation-record__group--assumptions">
        <h3>Recorded assumptions</h3>
        {assumptions.length ? <ul>{assumptions.map((assumption, index) => <li key={`${index}-${assumption}`}>{assumption}</li>)}</ul> : <p>No assumptions were recorded with this finding.</p>}
      </div>
    </div> : <p className="finding-calculation-record__notice">Costivra has not made the calculation inputs or output customer-visible. Link usable source evidence and complete the deterministic calculation before relying on a financial amount.</p>}
  </section>;
}

export function selectRecordFiles<T extends { id: string; vendorId: string | null }>(
  kind: Kind,
  documents: readonly T[],
  relatedDocumentIds: ReadonlySet<string>,
  vendorId: string | null,
) {
  return documents.filter((item) =>
    relatedDocumentIds.has(item.id) || (kind !== "opportunity" && vendorId !== null && item.vendorId === vendorId),
  );
}

export function shouldShowRecordFiles(kind: Kind, recordFileCount: number) {
  return kind !== "opportunity" || recordFileCount > 0;
}

export function getRecordDecisionAction(kind: Kind, hasRecordFiles: boolean, relatedRecordCount: number): RecordDecisionAction | null {
  if (hasRecordFiles) {
    return {
      href: "#files",
      label: kind === "document" ? "Review source file" : kind === "invoice" ? "Review source documents" : "Review related files",
    };
  }

  return relatedRecordCount > 0 ? { href: "#related", label: "View related records" } : null;
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
  const recordFiles = selectRecordFiles(kind, data.documents, relatedDocumentIds, vendorId);
  const savingsOutcome = kind === "savings" ? data.savings.find((item) => item.id === id) ?? null : null;
  const vendor = vendorId ? data.vendors.find((item) => item.id === vendorId) : null;
  const finding = kind === "opportunity" ? data.opportunities.find((item) => item.id === id) ?? null : null;
  const sourceInvoice = finding?.sourceDocumentId ? data.invoices.find((item) => item.documentId === finding.sourceDocumentId) : null;
  const sourceDocument = finding?.sourceDocumentId ? data.documents.find((item) => item.id === finding.sourceDocumentId) : null;
  const sourceExpense = finding?.sourceExpenseId ? data.expenses.find((item) => item.id === finding.sourceExpenseId) : null;
  const sourceHref = sourceInvoice
    ? `/app/bills/${sourceInvoice.id}`
    : sourceDocument
      ? `/app/bills/${sourceDocument.id}`
      : sourceExpense
        ? `/app/expenses/${sourceExpense.id}`
        : null;
  const showRecordFiles = shouldShowRecordFiles(kind, recordFiles.length);
  const recordDecisionAction = finding ? null : getRecordDecisionAction(kind, recordFiles.length > 0, related.length);
  const fieldGroups = groupRecordFields(kind, detail.fields);
  const recordFilesTitle = finding ? "Finding evidence files" : `${meta.noun} files`;
  const recordFilesDescription = finding
    ? "Only source files directly linked to this finding are available here."
    : "A protected workspace for original source files and evidence connected to this record.";
  const parent = kind === "vendor" ? { label: "Vendors", href: "/app/vendors" } : kind === "contract" ? { label: "Contracts & Renewals", href: "/app/contracts" } : kind === "opportunity" ? { label: "Findings", href: "/app/findings" } : kind === "action" ? { label: "Actions", href: "/app/actions" } : kind === "savings" ? { label: "Results", href: "/app/results" } : { label: "Bills & Spend", href: "/app/bills" };
  const breadcrumbs = [parent, ...(vendor && kind !== "vendor" ? [{ label: vendor.name, href: `/app/vendors/${vendor.id}` }] : []), { label: detail.title }];
  const isInvoiceReview = kind === "invoice";
  const recordCurrency = resolveRecordDetailCurrency(
    data.organization.currency,
    isInvoiceReview ? (detail.record as PortalData["invoices"][number]).currency : null,
  );
  const invoiceScope = isInvoiceReview ? <PageScopeIndicator mode="invoice" detailLabel={detail.title.replace(/^Invoice\s*/, "")} /> : null;
  const recordStatus = <span className="record-status"><i />{text(detail.status)}</span>;
  const headerStatus = finding ? <div className="record-header-state">{recordStatus}<WorkspaceStatusBadge className={`portal-status trust-${finding.trustState}`}>{opportunityTrustLabel(finding.trustState)}</WorkspaceStatusBadge></div> : recordStatus;
  const tabs: RecordSectionTab[] = [
    ...(savingsOutcome ? [{ id: "verification", label: "Verification" }] : []),
    { id: "overview", label: "Overview" },
    ...(finding ? [{ id: "calculation", label: "Method & assumptions" }] : []),
    ...(lineItems.length > 0 ? [{ id: "line-items", label: "Line items" }] : []),
    ...(showRecordFiles ? [{ id: "files", label: "Files" }] : []),
    { id: "quality", label: "Data quality" },
    { id: "related", label: "Related records" },
    ...(evidence.length > 0 ? [{ id: "evidence", label: "Evidence" }] : []),
    { id: "history", label: "History" },
  ];
  return <div className={`record-detail record-detail--${kind}`} data-record-detail-root="true">
    <div className={`record-detail-topline${isInvoiceReview ? " record-detail-topline--invoice" : ""}`}><GlobalBackControl className="record-back" />{invoiceScope}</div>
    <div className={`record-detail-heading${isInvoiceReview ? " record-detail-heading--invoice" : ""}`}>
      <header className="record-detail-header"><div>{!isInvoiceReview && <PageBreadcrumbs items={breadcrumbs} />}{!isInvoiceReview && <div className="record-detail-context"><PageScopeIndicator mode={vendor ? "vendor" : "global"} vendorName={vendor?.name} vendorHref={vendor ? `/app/vendors/${vendor.id}` : undefined} /></div>}<span className="record-eyebrow">{meta.noun} record</span><div className="record-title-row"><h1>{detail.title}</h1>{isInvoiceReview && headerStatus}</div><p>{detail.subtitle}</p></div>{!isInvoiceReview && headerStatus}</header>
      <RecordSectionTabs label={meta.noun} tabs={tabs} />
    </div>
    <div className="record-detail-layout"><main>
      {savingsOutcome && <SavingsReviewPanel outcome={savingsOutcome} currency={recordCurrency} canDecide={["owner", "admin"].includes(data.currentUser.role)} />}
      <div className="record-overview-anchor" id="overview">
        {finding ? <FindingDecisionBrief finding={finding} accessibleEvidenceCount={evidence.length} sourceHref={sourceHref} vendorHref={vendor ? `/app/vendors/${vendor.id}?tab=bills` : null} /> : <RecordDecisionBrief kind={kind} fields={detail.fields} action={recordDecisionAction} />}
      </div>
      {finding && <FindingCalculationRecord finding={finding} currency={recordCurrency} />}
      <section className="record-section">
        <div className="record-section-heading"><div><h2>Record details</h2><p>Review related information in small groups. Every saved change is attributed and audited.</p></div></div>
        <div className="record-field-groups">
          {fieldGroups.map((group) => (
            <section className="record-field-group" key={group.id} aria-label={group.label}>
              <header className="record-field-group__heading">
                <div>
                  <h3>{group.label}</h3>
                  <p>{group.description}</p>
                </div>
              </header>
              <div className="record-fields">
                {group.fields.map((field) => <FieldRow key={field.key} kind={kind} updateId={detail.updateId} expectedUpdatedAt={detail.updatedAt} field={field} canEdit={data.currentUser.role !== "viewer"} />)}
              </div>
            </section>
          ))}
        </div>
      </section>
      {lineItems.length > 0 && <section className="record-section" id="line-items"><div className="record-section-heading"><div><h2>Invoice line items</h2><p>Normalized charges and credits retained from the reviewed invoice.</p></div><span className="record-section-count">{lineItems.length}</span></div><div className="record-line-items" data-workspace-scrollbar=""><div className="record-line-item record-line-item--heading"><span>Line</span><span>Description</span><span>Quantity</span><span>Unit price</span><span>Amount</span></div>{lineItems.map((item) => <div className="record-line-item" key={item.id}><span>{item.lineNumber}</span><span><strong>{item.description}</strong><small>{[item.category, item.servicePeriodStart && item.servicePeriodEnd ? `${date(item.servicePeriodStart)} – ${date(item.servicePeriodEnd)}` : null].filter(Boolean).join(" · ") || "No additional classification"}</small></span><span>{item.quantity ?? "—"}</span><span>{item.unitPrice == null ? "—" : money(item.unitPrice, recordCurrency)}</span><span>{money(item.amount, recordCurrency)}</span></div>)}</div></section>}
      {showRecordFiles && <div id="files" className="record-files-anchor"><RecordFilesWorkspace files={recordFiles.map((item) => ({ id: item.id, name: item.originalFilename, documentType: item.documentType, mimeType: item.mimeType, status: item.status, createdAt: item.createdAt, updatedAt: item.updatedAt, byteSize: item.byteSize, pageCount: item.pageCount, summary: item.summary, confidence: item.confidence, evidenceCount: data.evidenceReferences.filter((reference) => reference.documentId === item.id).length, contextLabel: item.vendorName, href: `/api/portal/documents/${item.id}/download`, sourceAvailable: !item.sourcePurgedAt }))} title={recordFilesTitle} description={recordFilesDescription} /></div>}
      {evidence.length > 0 && <section className="record-section" id="evidence"><div className="record-section-heading"><div><h2>Source evidence</h2><p>Exact excerpts retained from the private source document.</p></div></div><div className="record-evidence-list">{evidence.map((item) => <article key={item.id}><span>Page {item.pageNumber}{item.fieldPath ? ` · ${item.fieldPath}` : ""}</span><blockquote>{item.textExcerpt}</blockquote><Link href={`/api/portal/documents/${item.documentId}/download`}>Open source <FileText /></Link></article>)}</div></section>}
    </main><aside>
      <section className="record-side-section" id="quality"><h2>Data quality</h2><div className="record-quality-list">{quality.map((item) => <div key={item.label} className={`record-quality record-quality--${item.status}`}><i /><span><strong>{item.label}</strong><small>{item.value}</small></span></div>)}</div></section>
      <section className="record-side-section" id="related"><h2>Related records</h2>{related.length ? related.map((item) => <Link className="record-related" href={item.href} key={`${item.type}-${item.href}`}><span><small>{item.type}</small><strong>{item.title}</strong>{item.detail && <em>{text(item.detail)}</em>}</span><ChevronRight /></Link>) : <p>No related records yet.</p>}</section>
      <section className="record-side-section" id="history"><h2>Recent activity</h2>{audits.length ? audits.map((event) => <div className="record-audit" key={event.id}><i /><span><strong>{text(event.action)}</strong><small>{event.actorName} · {date(event.createdAt)}</small></span></div>) : <p>No recorded changes yet.</p>}</section>
    </aside></div>
  </div>;
}
