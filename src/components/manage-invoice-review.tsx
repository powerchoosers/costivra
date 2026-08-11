"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useRef, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, CircleAlert, Copy, FileSearch, Pencil, Search, UserRoundCheck } from "@/lib/icons";
import type { InvoiceReviewDetail, InvoiceReviewQueueItem, ManageInvoiceReviewData } from "@/lib/manage/invoice-review-types";
import { CostivraSelect } from "@/components/ui/costivra-select";
import { useToast } from "@/components/toast-provider";

const InvoicePdfViewer = dynamic(() => import("@/components/invoice-pdf-viewer"), {
  ssr: false,
  loading: () => <div className="invoice-pdf-state">Loading the document viewer…</div>,
});

const issueLabels: Record<string, string> = {
  vendor_unmatched: "Vendor not matched",
  invoice_number_missing: "Invoice number missing",
  invoice_date_missing: "Invoice date missing",
  service_period_missing: "Service period missing",
  total_missing: "Total missing",
  currency_missing: "Currency missing",
  category_missing: "Category missing",
  arithmetic_mismatch: "Arithmetic mismatch",
  reconciliation_incomplete: "Reconciliation incomplete",
  low_confidence: "Low confidence",
  workspace_customer_name_mismatch: "Bill customer does not match workspace",
  expense_account_unmatched: "Expense account needs review",
  service_identifier_unmatched: "Service identifier needs review",
  service_location_unmatched: "Service location needs review",
};

const formatMoney = (amount: string | null, currency: string | null) => amount == null
  ? "—"
  : new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(Number(amount));
const formatDate = (value: string | null) => value
  ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T12:00:00`))
  : "—";

type InvoicePatchResponse = {
  updated?: boolean;
  status?: string;
  warning?: string;
  expenseId?: string;
  evaluation?: unknown;
  error?: string;
};

async function requestJson<T = unknown>(url: string, init: RequestInit) {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init.headers } });
  const payload = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "The request could not be completed.");
  return payload;
}

export function ManageInvoiceReview({ data, currentOperatorId, owner }: { data: ManageInvoiceReviewData; currentOperatorId: string; owner: boolean }) {
  if (data.selectedInvoice) return <InvoiceReviewDetailPage data={data} invoice={data.selectedInvoice} />;
  return <InvoiceReviewQueue data={data} currentOperatorId={currentOperatorId} owner={owner} />;
}

function InvoiceReviewQueue({ data, currentOperatorId, owner }: { data: ManageInvoiceReviewData; currentOperatorId: string; owner: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [view, setView] = useState<"needs_review" | "mine" | "all">("needs_review");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [reviewer, setReviewer] = useState("");
  const [priority, setPriority] = useState("normal");
  const [busy, setBusy] = useState(false);
  const [reviewWindowEnd] = useState(() => Date.now() + 86_400_000);
  const filtered = useMemo(() => data.invoices.filter((invoice) => {
    if (view === "needs_review" && invoice.reviewStatus !== "needs_review") return false;
    if (view === "mine" && invoice.assignedTo !== currentOperatorId) return false;
    const term = query.trim().toLowerCase();
    return !term || `${invoice.organizationName} ${invoice.vendorName} ${invoice.invoiceNumber ?? ""} ${invoice.documentName}`.toLowerCase().includes(term);
  }), [currentOperatorId, data.invoices, query, view]);
  const needsReview = data.invoices.filter((invoice) => invoice.reviewStatus === "needs_review");
  const unassigned = needsReview.filter((invoice) => !invoice.assignedTo).length;
  const dueToday = needsReview.filter((invoice) => invoice.reviewDueAt && new Date(invoice.reviewDueAt).getTime() <= reviewWindowEnd).length;
  const ready = data.invoices.filter((invoice) => invoice.reviewStatus === "ready").length;
  const allVisibleSelected = filtered.length > 0 && filtered.every((invoice) => selected.includes(invoice.id));

  async function assignSelected() {
    if (!selected.length || !owner) return;
    setBusy(true);
    try {
      await requestJson("/api/manage/invoices", { method: "PATCH", body: JSON.stringify({ invoiceIds: selected, assignedTo: reviewer || null, priority }) });
      toast.success(reviewer ? "Invoices assigned." : "Assignments cleared.", `${selected.length} review${selected.length === 1 ? "" : "s"} updated.`);
      setSelected([]);
      router.refresh();
    } catch (error) {
      toast.error("Assignment failed", error instanceof Error ? error.message : "Please try again.");
    } finally { setBusy(false); }
  }

  return (
    <section className="invoice-review-queue">
      <header className="invoice-review-heading">
        <div><p className="manage-eyebrow">DOCUMENT OPERATIONS</p><h2>Invoice review</h2><p>Questionable records appear here by default. Clean, reconciled invoices continue without manual queue work.</p></div>
      </header>
      <div className="invoice-review-summary" aria-label="Review queue summary">
        <Summary label="Needs review" value={needsReview.length} note="Requires a person" />
        <Summary label="Unassigned" value={unassigned} note="Ready to delegate" />
        <Summary label="Due soon" value={dueToday} note="Within 24 hours" />
        <Summary label="Ready" value={ready} note="No exception found" />
      </div>
      <div className="invoice-review-controls">
        <div className="invoice-review-tabs" role="tablist" aria-label="Invoice views">
          {[['needs_review','Needs review'],['mine','Assigned to me'],['all','All invoices']].map(([value,label]) => <button key={value} type="button" role="tab" aria-selected={view === value} onClick={() => setView(value as typeof view)}>{label}</button>)}
        </div>
        <label className="invoice-review-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search client, vendor, or invoice" /></label>
      </div>
      {selected.length > 0 && (
        <div className="invoice-review-bulk motion-panel" role="region" aria-label="Bulk review actions">
          <strong>{selected.length} selected</strong>
          {owner ? <>
            <CostivraSelect value={reviewer} onChange={setReviewer} aria-label="Assign reviewer" placeholder="Clear assignment" options={[{ value: "", label: "Unassigned" }, ...data.reviewers.map((item) => ({ value: item.id, label: item.name }))]} size="sm" />
            <CostivraSelect value={priority} onChange={setPriority} aria-label="Set priority" options={['normal','high','urgent','low'].map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }))} size="sm" />
            <button className="manage-button manage-button--primary" type="button" onClick={() => void assignSelected()} disabled={busy}><UserRoundCheck size={16} />{busy ? "Assigning…" : "Apply"}</button>
          </> : <span>Only owners can delegate reviews in bulk.</span>}
          <button className="manage-button manage-button--quiet" type="button" onClick={() => setSelected([])}>Clear</button>
        </div>
      )}
      <div className="invoice-review-table-wrap">
        <table className="invoice-review-table">
          <thead><tr><th><input type="checkbox" aria-label="Select all visible invoices" checked={allVisibleSelected} onChange={(event) => setSelected(event.target.checked ? filtered.map((invoice) => invoice.id) : [])} /></th><th>Priority</th><th>Client</th><th>Vendor / invoice</th><th>Amount</th><th>Issue</th><th>Confidence</th><th>Assignee</th><th>Received</th><th>Status</th></tr></thead>
          <tbody>{filtered.map((invoice) => <InvoiceRow key={invoice.id} invoice={invoice} checked={selected.includes(invoice.id)} onChecked={(checked) => setSelected((current) => checked ? [...new Set([...current, invoice.id])] : current.filter((id) => id !== invoice.id))} />)}</tbody>
        </table>
        {!filtered.length && <div className="invoice-review-empty"><CheckCircle2 size={24} /><strong>{data.invoices.length ? "Nothing matches this view" : "No invoices have reached the queue yet"}</strong><p>{data.invoices.length ? "Adjust the filter or search term." : "New uploads and forwarded bills will appear here after extraction. Only exceptions require manual review."}</p></div>}
      </div>
    </section>
  );
}

function Summary({ label, value, note }: { label: string; value: number; note: string }) {
  return <div><span>{label}</span><strong>{value}</strong><small>{note}</small></div>;
}

function InvoiceRow({ invoice, checked, onChecked }: { invoice: InvoiceReviewQueueItem; checked: boolean; onChecked: (checked: boolean) => void }) {
  const primaryIssue = invoice.issueCodes[0];
  return <tr>
    <td><input type="checkbox" checked={checked} onChange={(event) => onChecked(event.target.checked)} aria-label={`Select ${invoice.vendorName} invoice`} /></td>
    <td><span className={`invoice-priority invoice-priority--${invoice.reviewPriority}`}>{invoice.reviewPriority}</span></td>
    <td><strong>{invoice.organizationName}</strong></td>
    <td><Link href={`/manage/invoice-review/${invoice.id}`}><strong>{invoice.vendorName}</strong><small>{invoice.invoiceNumber || invoice.documentName}</small></Link></td>
    <td className="invoice-review-amount">{formatMoney(invoice.totalAmount, invoice.currency)}</td>
    <td><span className="invoice-issue"><CircleAlert size={14} />{primaryIssue ? issueLabels[primaryIssue] || primaryIssue.replaceAll('_',' ') : "No exception"}</span></td>
    <td>{invoice.confidence == null ? "—" : `${Math.round(invoice.confidence * 100)}%`}</td>
    <td>{invoice.assignedToName || <span className="manage-muted">Unassigned</span>}</td>
    <td>{formatDate(invoice.createdAt.slice(0, 10))}</td>
    <td><span className={`invoice-status invoice-status--${invoice.reviewStatus}`}>{invoice.reviewStatus.replaceAll('_',' ')}</span></td>
  </tr>;
}

function InvoiceReviewDetailPage({ data, invoice }: { data: ManageInvoiceReviewData; invoice: InvoiceReviewDetail }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const queue = data.invoices.filter((item) => item.reviewStatus === "needs_review");
  const index = queue.findIndex((item) => item.id === invoice.id);
  const previous = index > 0 ? queue[index - 1] : null;
  const next = index >= 0 && index < queue.length - 1 ? queue[index + 1] : null;
  const sourceUrl = `/api/manage/invoices/${invoice.id}/source`;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const reason = String(form.get("reason") || "");
    const changes = Object.fromEntries([...form.entries()].filter(([key]) => key !== "reason").map(([key,value]) => [key, String(value)]));
    setBusy("save");
    try {
      const payload = await requestJson<InvoicePatchResponse>(
        `/api/manage/invoices/${invoice.id}`,
        { method: "PATCH", body: JSON.stringify({ action: "update", reason, changes }) },
      );
      if (!payload.updated) {
        toast.success("No changes to save", "The values are already stored for this review.");
      } else {
        toast.success("Corrections saved.", "The client record and reconciliation status are now current.");
        router.refresh();
      }
      if (!payload.updated) return;
    } catch (error) { toast.error("Could not save corrections", error instanceof Error ? error.message : "Please try again."); }
    finally { setBusy(null); }
  }
  async function runAction(action: "approve" | "follow_up", notes?: string) {
    setBusy(action);
    try {
      const payload = await requestJson<InvoicePatchResponse>(`/api/manage/invoices/${invoice.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action, notes }),
      });
      if (action === "approve") {
        if (payload.warning) toast.warning("Invoice approved with review note", payload.warning);
        else toast.success("Invoice approved.", "The review record is now updated.");
      } else {
        toast.success("Follow-up recorded.", "The invoice remains in the review queue.");
      }
      router.refresh();
    } catch (error) { toast.error(action === "approve" ? "Approval blocked" : "Could not record follow-up", error instanceof Error ? error.message : "Please try again."); }
    finally { setBusy(null); }
  }

  return <section className="invoice-review-detail">
    <header className="invoice-detail-heading">
      <div><Link href="/manage/invoice-review"><ArrowLeft size={16} />Review queue</Link><h2>Verify invoice</h2><p>{invoice.organizationName} · {invoice.vendorName} · {invoice.invoiceNumber || "Number missing"}</p></div>
      <div className="invoice-detail-pagination">{previous ? <Link href={`/manage/invoice-review/${previous.id}`}><ArrowLeft size={15} />Previous</Link> : <span />} {next ? <Link href={`/manage/invoice-review/${next.id}`}>Next<ArrowRight size={15} /></Link> : null}</div>
    </header>
    <div className="invoice-detail-layout">
      <div className="invoice-detail-source">
        {invoice.mimeType === "application/pdf" ? <InvoicePdfViewer sourceUrl={sourceUrl} filename={invoice.documentName} /> : <div className="invoice-source-fallback"><FileSearch size={34} /><strong>{invoice.documentName}</strong><p>This source is not a PDF, so it stays in its native format.</p><a className="manage-button manage-button--quiet" href={sourceUrl} target="_blank" rel="noreferrer">Open source document</a></div>}
      </div>
      <form className="invoice-inspector" onSubmit={submit}>
        <section className="invoice-inspector-section invoice-review-reason"><div><span>Review reason</span><strong>{invoice.issueCodes.map((code) => issueLabels[code] || code.replaceAll('_',' ')).join(' · ') || "Manual verification"}</strong></div><span className={`invoice-priority invoice-priority--${invoice.reviewPriority}`}>{invoice.reviewPriority}</span></section>
        <section className="invoice-inspector-section"><header><div><span>Extracted fields</span><h3>Invoice details</h3></div><small>{invoice.confidence == null ? "No confidence score" : `${Math.round(invoice.confidence * 100)}% extraction confidence`}</small></header>
          <div className="invoice-field-grid">
            <Field name="invoice_number" label="Invoice number" value={invoice.invoiceNumber} />
            <Field name="invoice_date" label="Invoice date" value={invoice.invoiceDate} type="date" />
            <Field name="due_date" label="Due date" value={invoice.dueDate} type="date" />
            <Field name="currency" label="Currency" value={invoice.currency} />
            <Field name="service_period_start" label="Service start" value={invoice.servicePeriodStart} type="date" />
            <Field name="service_period_end" label="Service end" value={invoice.servicePeriodEnd} type="date" />
            <label><span>Client vendor</span><CostivraSelect name="organization_vendor_id" defaultValue={invoice.organizationVendorId || ""} placeholder="Choose vendor" options={[{value:"",label:"Unmatched"},...invoice.vendorOptions.map((option) => ({ value: option.relationshipId, label: option.name }))]} /></label>
            <label><span>Expense account</span><CostivraSelect name="expense_account_id" defaultValue={invoice.expenseAccountId || ""} placeholder="Optional account" options={[{value:"",label:"No account"},...invoice.accountOptions.map((option) => ({ value: option.id, label: option.label }))]} /></label>
            <Field name="expense_category" label="Expense category" value={invoice.expenseCategory} />
            <Field name="account_number_last4" label="Account last 4" value={invoice.accountNumberLast4} />
          </div>
        </section>
        <section className="invoice-inspector-section"><header><div><span>Deterministic check</span><h3>Reconciliation</h3></div><span className={`invoice-reconcile invoice-reconcile--${invoice.reconciliationStatus}`}>{invoice.reconciliationStatus}</span></header>
          <div className="invoice-money-grid"><Field name="subtotal" label="Subtotal" value={invoice.subtotal} inputMode="decimal" /><Field name="current_charges" label="Current charges" value={invoice.currentCharges} inputMode="decimal" /><Field name="previous_balance" label="Previous balance" value={invoice.previousBalance} inputMode="decimal" /><Field name="payments_and_credits" label="Payments and credits" value={invoice.paymentsAndCredits} inputMode="decimal" /><Field name="balance_forward" label="Balance forward" value={invoice.balanceForward} inputMode="decimal" /><Field name="current_period_credits" label="Current-period credits" value={invoice.currentPeriodCredits} inputMode="decimal" /><Field name="tax_total" label="Tax" value={invoice.taxTotal} inputMode="decimal" /><Field name="fee_total" label="Fees" value={invoice.feeTotal} inputMode="decimal" /><Field name="credit_total" label="Credits" value={invoice.creditTotal} inputMode="decimal" /><Field name="total_amount" label="Invoice total" value={invoice.totalAmount} inputMode="decimal" /><Field name="amount_due" label="Amount due" value={invoice.amountDue} inputMode="decimal" /></div>
          <div className="invoice-match-summary" aria-label="Identity matching"><span>Customer: <strong>{invoice.workspaceCustomerMatchStatus === "matched" ? "Matched" : "Needs review"}</strong></span><span>Account: <strong>{invoice.expenseAccountMatchStatus === "matched" ? "Matched" : "Needs review"}</strong></span><span>Location: <strong>{invoice.serviceLocationMatchStatus === "matched" ? "Matched" : "Needs review"}</strong></span></div>
          {invoice.reconciliationDifference && invoice.reconciliationDifference !== "0.00" && <p className="invoice-reconciliation-warning"><CircleAlert size={15} />Difference: {formatMoney(invoice.reconciliationDifference, invoice.currency)}</p>}
        </section>
        {invoice.lineItems.length > 0 && <section className="invoice-inspector-section"><header><div><span>Source structure</span><h3>Line items</h3></div><small>{invoice.lineItems.length} extracted</small></header><div className="invoice-line-items">{invoice.lineItems.map((line) => <div key={line.id}><span>{line.lineNumber}</span><p><strong>{line.description}</strong><small>{line.category || "Uncategorized"}</small></p><b>{formatMoney(line.amount, invoice.currency)}</b></div>)}</div></section>}
        {invoice.evidence.length > 0 && <section className="invoice-inspector-section"><header><div><span>Field-level proof</span><h3>Evidence</h3></div></header><div className="invoice-evidence">{invoice.evidence.map((item) => <blockquote key={item.id}><span>{item.fieldPath.replaceAll('_',' ')}{item.pageNumber ? ` · page ${item.pageNumber}` : ""}</span><p>“{item.excerpt}”</p></blockquote>)}</div></section>}
        <section className="invoice-inspector-section"><label className="invoice-notes"><span>Internal review note</span><textarea name="review_notes" defaultValue={invoice.reviewNotes || ""} placeholder="What should the next reviewer know?" rows={3} /></label><label className="invoice-notes"><span>Reason for correction</span><textarea name="reason" required placeholder="Example: Confirmed against page 2 of the source invoice." rows={2} /></label></section>
        {invoice.corrections.length > 0 && <section className="invoice-inspector-section"><header><div><span>Append-only history</span><h3>Corrections</h3></div></header><div className="invoice-corrections">{invoice.corrections.slice(0,8).map((item) => <div key={item.id}><strong>{item.fieldPath.replaceAll('_',' ')}</strong><p>{item.reason}</p><small>{item.correctedByName} · {formatDate(item.createdAt.slice(0,10))}</small></div>)}</div></section>}
        <footer className="invoice-inspector-actions"><button className="manage-button manage-button--quiet" type="submit" disabled={Boolean(busy)}>{busy === "save" ? "Saving…" : "Save corrections"}</button><button className="manage-button manage-button--quiet" type="button" disabled={Boolean(busy)} onClick={() => { const notes = window.prompt("What needs follow-up?", invoice.reviewNotes || ""); if (notes) void runAction("follow_up", notes); }}>Needs follow-up</button><button className="manage-button manage-button--primary" type="button" disabled={Boolean(busy) || invoice.reviewStatus === "approved"} onClick={() => void runAction("approve")}><Check size={16} />{busy === "approve" ? "Approving…" : invoice.reviewStatus === "approved" ? "Approved" : "Approve invoice"}</button></footer>
      </form>
    </div>
  </section>;
}

function Field({ name, label, value, type = "text", inputMode }: { name: string; label: string; value: string | null; type?: string; inputMode?: "decimal" }) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const displayValue = value || "";
  const hasValue = Boolean(displayValue.trim());

  async function copyField() {
    if (!displayValue) {
      toast.success("Nothing to copy", "This field has no value.");
      return;
    }
    try {
      await navigator.clipboard.writeText(displayValue);
      toast.success("Field copied", `${label} copied to clipboard.`);
    } catch {
      const fallback = document.createElement("textarea");
      fallback.value = displayValue;
      fallback.style.position = "fixed";
      fallback.style.opacity = "0";
      document.body.appendChild(fallback);
      fallback.focus();
      fallback.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(fallback);
      if (ok) toast.success("Field copied", `${label} copied to clipboard.`);
      else throw new Error("copy blocked");
    }
    return;
  }

  function focusField() {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }

  return (
    <label>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
        <span>{label}</span>
        <span style={{ display: "inline-flex", gap: "6px" }}>
          <button className="manage-icon-button" type="button" aria-label={`Edit ${label}`} title={`Edit ${label}`} onClick={focusField}>
            <Pencil size={14} />
          </button>
          <button className="manage-icon-button" type="button" aria-label={`Copy ${label}`} title={`Copy ${label}`} disabled={!hasValue} onClick={() => void copyField().catch((error) => toast.error("Copy failed", error instanceof Error ? error.message : "Try copying manually."))}>
            <Copy size={14} />
          </button>
        </span>
      </div>
      <input
        ref={inputRef}
        id={name}
        name={name}
        type={type}
        inputMode={inputMode}
        defaultValue={displayValue}
      />
    </label>
  );
}
