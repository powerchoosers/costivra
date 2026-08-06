"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FormEvent,
  ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Info,
  LoaderCircle,
  Mail,
  MapPin,
  Pause,
  Pencil,
  Plus,
  ReceiptText,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import type { PortalApprovalPolicy, PortalContract, PortalData, PortalLocation, PortalTeamMember, PortalVendor } from "@/lib/portal/types";
import { useToast } from "@/components/toast-provider";
import { CostivraSelect, SelectOption } from "@/components/ui/costivra-select";
import { CostivraDatePicker } from "@/components/ui/costivra-date-picker";
import { formatMoneyInput } from "@/lib/vendors/spend";
import { PortalRecordDetail } from "@/components/portal-record-detail";
import { CompanyLogo } from "@/components/company-logo";
import { RecordFilesWorkspace } from "@/components/record-files-workspace";
import { actionOperationConfirmation } from "@/lib/portal/workflow-copy";
import { approvalActionLabel } from "@/lib/portal/approval-policies";
import { getMonitoringStateLabel, getDynamicPrimaryAction, type MonitoringState } from "@/lib/vendors/monitoring";
import { useClientAssistant } from "@/components/client-assistant/client-assistant-provider";
import { useBillInspector } from "@/components/bill-inspector-provider";
import { RecordOverflowMenu } from "@/components/records/record-overflow-menu";
import { EditRecordSheet } from "@/components/records/edit-record-sheet";
import { RecordDangerDialog, DependencyPreview } from "@/components/records/record-danger-dialog";
import { recordDraftChanged } from "@/lib/records/draft-state";

type ApiOptions = {
  method?: string;
  body?: BodyInit | Record<string, unknown>;
};
type ModalState = null | "expense" | "contract" | "invite" | "upload" | "monitor";

async function api(url: string, options: ApiOptions = {}) {
  const body =
    options.body && !(options.body instanceof FormData)
      ? JSON.stringify(options.body)
      : options.body;
  const response = await fetch(url, {
    method: options.method ?? (body ? "POST" : "GET"),
    body: body as BodyInit | undefined,
    headers:
      body && !(body instanceof FormData)
        ? { "content-type": "application/json" }
        : undefined,
  });
  const payload = response.headers.get("content-type")?.includes("json")
    ? await response.json()
    : null;
  if (!response.ok) {
    const error = new Error(payload?.error ?? "The request could not be completed.");
    Object.assign(error, { code: payload?.code, status: response.status });
    throw error;
  }
  return payload;
}

const money = (value: number, compact = false) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: compact ? 0 : 2,
    notation: compact ? "compact" : "standard",
  }).format(value);
const date = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(value))
    : "Not set";
const titleCase = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="portal-page-header">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}

function Empty({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="portal-empty">
      <FileText size={24} aria-hidden="true" />
      <strong>{title}</strong>
      <span>{copy}</span>
    </div>
  );
}

function Status({ value }: { value: string }) {
  return (
    <span className={`portal-status status-${value}`}>{titleCase(value)}</span>
  );
}

function PortalModal({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(open);
  const [leaving, setLeaving] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    let closeTimer: number | undefined;
    const stateTimer = window.setTimeout(() => {
      if (open) {
        setMounted(true);
        setLeaving(false);
      } else if (mounted) {
        setLeaving(true);
        closeTimer = window.setTimeout(() => {
          setMounted(false);
          setLeaving(false);
        }, 190);
      }
    }, 0);
    return () => {
      window.clearTimeout(stateTimer);
      if (closeTimer) window.clearTimeout(closeTimer);
    };
  }, [open, mounted]);
  useEffect(() => {
    if (!mounted) return;
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const bodyWasLocked = document.body.classList.contains("modal-open");
    document.body.classList.add("modal-open");
    const focusTimer = window.requestAnimationFrame(() => {
      const initial = dialogRef.current?.querySelector<HTMLElement>(
        ".portal-modal-body input:not([type='hidden']), .portal-modal-body select, .portal-modal-body textarea, .portal-modal-body button, .portal-modal-body [href]",
      );
      (initial ?? dialogRef.current)?.focus();
    });
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), [href], input:not([disabled]):not([type='hidden']), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
        ),
      );
      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      window.cancelAnimationFrame(focusTimer);
      document.removeEventListener("keydown", key);
      if (!bodyWasLocked) document.body.classList.remove("modal-open");
      previousFocusRef.current?.focus();
    };
  }, [mounted]);
  if (!mounted || typeof document === "undefined") return null;
  return createPortal(
    <div
      className={`portal-modal-layer${leaving ? " is-leaving" : ""}`}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeRef.current();
      }}
    >
      <section
        ref={dialogRef}
        className="portal-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
      >
        <header>
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={() => closeRef.current()}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </header>
        <div className="portal-modal-body">{children}</div>
      </section>
    </div>,
    document.body,
  );
}

function FormActions({
  busy,
  onCancel,
  label = "Save",
}: {
  busy: boolean;
  onCancel: () => void;
  label?: string;
}) {
  return (
    <div className="portal-form-actions">
      <button type="button" className="button button-quiet" onClick={onCancel}>
        Cancel
      </button>
      <button className="button button-primary" disabled={busy}>
        {busy && <LoaderCircle className="spin" size={16} />}{" "}
        {busy ? "Working…" : label}
      </button>
    </div>
  );
}

export function PortalPage({
  slug,
  data,
}: {
  slug?: string[];
  data: PortalData;
}) {
  const page = slug?.[0] ?? "home";
  const [modal, setModal] = useState<ModalState>(null);
  const [presetVendor, setPresetVendor] = useState<string | undefined>();
  const [vendorPanelOpen, setVendorPanelOpen] = useState(false);
  const router = useRouter();
  const toast = useToast();
  useEffect(() => {
    const wasOpen = sessionStorage.getItem("costivra.vendor-panel.open") === "true";
    queueMicrotask(() => setVendorPanelOpen(wasOpen));
  }, []);
  const openVendorPanel = () => {
    sessionStorage.setItem("costivra.vendor-panel.open", "true");
    setVendorPanelOpen(true);
  };
  const closeVendorPanel = () => {
    sessionStorage.removeItem("costivra.vendor-panel.open");
    sessionStorage.removeItem("costivra.vendor-panel.draft");
    setVendorPanelOpen(false);
  };
  const openModal = (kind: Exclude<ModalState, null>) => {
    setPresetVendor(undefined);
    setModal(kind);
  };
  const openVendorModal = (
    kind: Exclude<ModalState, null>,
    relationshipId: string,
  ) => {
    setPresetVendor(relationshipId);
    setModal(kind);
  };
  const run = async (
    work: () => Promise<unknown>,
    success: string,
  ): Promise<void> => {
    try {
      await work();
      router.refresh();
      toast.success(success);
    } catch (error) {
      toast.error(
        "That didn’t work",
        error instanceof Error ? error.message : "Please try again.",
      );
      throw error;
    }
  };
  const pages: Record<string, ReactNode> = {
    home: <CommandCenter data={data} />,
    expenses: slug?.[1] ? <PortalRecordDetail data={data} kind="expense" id={slug[1]} /> : <Expenses data={data} onAdd={() => openModal("expense")} />,
    opportunities: slug?.[1] ? <PortalRecordDetail data={data} kind="opportunity" id={slug[1]} /> : <Opportunities data={data} run={run} />,
    contracts: slug?.[1] ? <PortalRecordDetail data={data} kind="contract" id={slug[1]} /> : <Contracts data={data} onAdd={() => openModal("contract")} />,
    documents: (
      slug?.[1] ? (data.invoices.some((item) => item.id === slug[1]) ? <PortalRecordDetail data={data} kind="invoice" id={slug[1]} /> : <PortalRecordDetail data={data} kind="document" id={slug[1]} />) : <Documents data={data} onUpload={() => openModal("upload")} run={run} />
    ),
    actions: slug?.[1] ? <PortalRecordDetail data={data} kind="action" id={slug[1]} /> : <Actions data={data} run={run} />,
    savings: slug?.[1] ? <PortalRecordDetail data={data} kind="savings" id={slug[1]} /> : <Savings data={data} run={run} />,
    vendors: slug?.[1] ? (
      <VendorDetail data={data} vendorId={slug[1]} onAdd={openVendorModal} />
    ) : (
      <Vendors data={data} onAdd={openVendorPanel} />
    ),
    integrations: <Settings data={data} run={run} onInvite={() => openModal("invite")} initialTab="integrations" />,
    reports: <Reports data={data} />,
    team: <Settings data={data} run={run} onInvite={() => openModal("invite")} initialTab="team" />,
    ask: <Ask />,
    settings: <Settings data={data} run={run} onInvite={() => openModal("invite")} />,
  };
  return (
    <>
      <div
        key={slug?.join("/") ?? page}
        className={
          page === "ask"
            ? "app-content app-content-chat motion-page"
            : "app-content motion-page"
        }
      >
        {pages[page] ?? (
          <Empty
            title="Page not found"
            copy="Use the workspace navigation to continue."
          />
        )}
      </div>
      <CreateModals
        kind={modal}
        setKind={setModal}
        data={data}
        run={run}
        presetVendor={presetVendor}
      />
      <VendorSidePanel
        open={vendorPanelOpen}
        onClose={closeVendorPanel}
        data={data}
      />
    </>
  );
}

function CommandCenter({ data }: { data: PortalData }) {
  const verified = data.savings
    .filter((item) => item.status === "verified")
    .reduce((sum, item) => sum + item.amount, 0);
  const underReviewCount = data.opportunities.filter((item) =>
    ["open", "under_review"].includes(item.status),
  ).length;
  const spend = data.vendors.reduce(
    (sum, item) => sum + item.annualizedSpend,
    0,
  );
  const pendingApprovalCount = data.actions.filter((item) =>
    ["pending_approval", "draft"].includes(item.status),
  ).length;
  return (
    <>
      <PageHeader
        title="Command Center"
        description={`A live operating view of ${data.organization.name}'s recurring costs.`}
      />
      <div className="portal-metrics">
        <Metric
          label="Monitored spend"
          value={money(spend, true)}
          note={`${data.vendors.length} vendor relationships`}
          icon={<ReceiptText />}
        />
        <Metric
          label="Findings under review"
          value={String(underReviewCount)}
          note={`${data.opportunities.length} total findings`}
          icon={<CircleDollarSign />}
        />
        <Metric
          label="Actions pending approval"
          value={String(pendingApprovalCount)}
          note="Decisions needing authorization"
          icon={<CalendarClock />}
        />
        <Metric
          label="Verified value"
          value={money(verified, true)}
          note={`${data.savings.filter((x) => x.status === "verified").length} proven outcomes`}
          icon={<CheckCircle2 />}
        />
      </div>
      <ActivationChecklist data={data} />
      <section className="portal-panel">
        <div className="portal-panel-heading">
          <div>
            <h2>Priority work</h2>
            <p>Highest-value findings that still require a decision.</p>
          </div>
        </div>
        {data.opportunities.length ? (
          <div className="portal-list">
            {data.opportunities.slice(0, 5).map((item) => (
              <a
                href={`/app/opportunities#${item.id}`}
                className="portal-list-row"
                key={item.id}
              >
                <span className={`priority-dot priority-${item.priority}`} />
                <div className="grow">
                  <strong>{item.title}</strong>
                  <span>
                    {item.vendorName} · {item.evidenceCount} evidence reference
                    {item.evidenceCount === 1 ? "" : "s"}
                  </span>
                </div>
                <strong className="money-value">
                  {money(item.estimatedAnnualValue ?? 0, true)}
                </strong>
                <Status value={item.status} />
              </a>
            ))}
          </div>
        ) : (
          <Empty
            title="No opportunities yet"
            copy="Upload current bills or contracts to begin detection."
          />
        )}
      </section>
    </>
  );
}

function ActivationChecklist({ data }: { data: PortalData }) {
  const docCount = data.documents.length;
  const locationCount = data.locations.length;
  const monitoredCount = data.vendors.filter((v) =>
    ["active", "test_needed"].includes(String((v as unknown as Record<string, unknown>).monitoringState ?? "")),
  ).length;
  const needsReviewInvoices = data.invoices.filter(
    (i) => i.reviewStatus === "needs_review",
  ).length;

  const steps = [
    { id: "workspace", title: "Create workspace", done: true, copy: "Organization workspace created.", href: undefined },
    { id: "details", title: "Add company & location details", done: locationCount > 0, copy: locationCount > 0 ? `${locationCount} location(s) assigned.` : "Add your primary business location.", href: "/app/settings?tab=locations" },
    { id: "documents", title: "Upload 3 bills or contracts", done: docCount >= 3, copy: docCount >= 3 ? `${docCount} documents uploaded.` : `${docCount} of 3 uploaded. Add your recurring bills.`, href: "/app/documents" },
    { id: "review", title: "Review extracted facts & invoices", done: docCount > 0 && needsReviewInvoices === 0, copy: needsReviewInvoices > 0 ? `${needsReviewInvoices} invoice(s) waiting for human review.` : "No pending invoice exceptions.", href: "/app/documents" },
    { id: "monitoring", title: "Select first vendor to monitor", done: monitoredCount > 0, copy: monitoredCount > 0 ? `${monitoredCount} vendor(s) monitored.` : "Set up continuous monitoring for one vendor.", href: "/app/vendors" },
  ];

  const completedCount = steps.filter((s) => s.done).length;

  return (
    <section className="portal-panel activation-panel" style={{ marginBottom: 24, padding: "20px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>Activation Checklist</h2>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: "0.85rem" }}>Complete these steps to set up cost control and bill monitoring.</p>
        </div>
        <span style={{ fontSize: "0.82rem", fontWeight: 700, padding: "4px 12px", borderRadius: 12, background: completedCount === steps.length ? "rgba(16,185,129,0.12)" : "rgba(0,47,167,0.08)", color: completedCount === steps.length ? "#059669" : "#002FA7" }}>
          {completedCount} of {steps.length} completed
        </span>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {steps.map((step, idx) => (
          <div key={step.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 10, background: step.done ? "rgba(0,0,0,0.015)" : "var(--bg-subtle, #f8fafc)", border: "1px solid var(--border-color, #e2e8f0)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: "50%", background: step.done ? "#10b981" : "var(--blue, #002FA7)", color: "#fff", fontSize: "0.75rem", fontWeight: 700, flexShrink: 0 }}>
              {step.done ? <Check size={14} /> : idx + 1}
            </span>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: "0.92rem", color: step.done ? "var(--text-muted)" : "inherit" }}>{step.title}</strong>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>{step.copy}</div>
            </div>
            {!step.done && step.href && (
              <Link className="button button-quiet button-sm" href={step.href} style={{ fontSize: "0.8rem", padding: "6px 12px", gap: 4 }}>
                Action <ChevronRight size={14} />
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
function Metric({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: ReactNode;
}) {
  return (
    <article className="portal-metric">
      <span className="portal-metric-icon">{icon}</span>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function Expenses({ data, onAdd }: { data: PortalData; onAdd: () => void }) {
  const [query, setQuery] = useState("");
  const canWrite = data.currentUser.role !== "viewer";
  const filtered = data.expenses.filter((x) =>
    `${x.vendorName} ${x.category}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        title="Expenses"
        description="Normalized recurring charges from your connected source records."
        action={canWrite ? (
          <button className="button button-primary" onClick={onAdd}>
            <Plus size={16} /> Add expense
          </button>
        ) : null}
      />
      <Toolbar
        query={query}
        setQuery={setQuery}
        placeholder="Search vendor or category"
      />
      <section className="portal-panel">
        {filtered.length ? (
          <div className="table-wrap">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Category</th>
                  <th>Period</th>
                  <th>Amount</th>
                  <th>Change</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const change = item.priorPeriodAmount
                    ? ((item.amount - item.priorPeriodAmount) /
                        item.priorPeriodAmount) *
                      100
                    : null;
                  return (
                    <tr key={item.id}>
                      <td>
                        <Link className="record-link" href={`/app/expenses/${item.id}`}><strong>{item.vendorName}</strong></Link>
                      </td>
                      <td>{item.category}</td>
                      <td>{date(item.periodEnd)}</td>
                      <td>{money(item.amount)}</td>
                      <td>
                        {change == null ? (
                          "—"
                        ) : (
                          <span
                            className={change > 0 ? "change-up" : "change-down"}
                          >
                            {change > 0 ? <ArrowUpRight /> : <ArrowDownRight />}
                            {Math.abs(change).toFixed(1)}%
                          </span>
                        )}
                      </td>
                      <td>
                        <Status value={item.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="No expenses match"
            copy="Clear the search or add the first expense record."
          />
        )}
      </section>
    </>
  );
}
function Opportunities({
  data,
  run,
}: {
  data: PortalData;
  run: (work: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const filtered = data.opportunities.filter((x) =>
    `${x.title} ${x.vendorName} ${x.summary}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const update = (id: string, status: string) =>
    run(
      () =>
        api(`/api/portal/opportunities/${id}`, {
          method: "PATCH",
          body: { status },
        }),
      "Opportunity updated.",
    );
  const statusOptions = (status: string) => {
    if (status === "open") return [{ value: "open", label: "Open" }, { value: "under_review", label: "Review" }, { value: "declined", label: "Decline" }];
    if (status === "under_review") return [{ value: "under_review", label: "Under review" }, { value: "approved", label: "Approve plan" }, { value: "declined", label: "Decline" }];
    return [{ value: status, label: status.replaceAll("_", " ") }];
  };
  return (
    <>
      <PageHeader
        title="Opportunities"
        description="Evidence-backed findings, prioritized for deliberate review."
      />
      <Toolbar
        query={query}
        setQuery={setQuery}
        placeholder="Search findings or vendors"
      />
      <div className="portal-card-grid">
        {filtered.map((item) => (
          <article className="portal-card" id={item.id} key={item.id}>
            <header>
              <Status value={item.priority} />
              <span>
                {Math.round((item.confidence ?? 0) * 100)}% confidence
              </span>
            </header>
            <h2><Link className="record-link" href={`/app/opportunities/${item.id}`}>{item.title}</Link></h2>
            <p>{item.summary}</p>
            <dl>
              <div>
                <dt>Vendor</dt>
                <dd>{item.vendorName}</dd>
              </div>
              <div>
                <dt>Annual value</dt>
                <dd>{money(item.estimatedAnnualValue ?? 0)}</dd>
              </div>
              <div>
                <dt>Evidence</dt>
                <dd>{item.evidenceCount} references</dd>
              </div>
              <div>
                <dt>Calculation</dt>
                <dd>{item.ruleVersion ?? "Human-entered"}</dd>
              </div>
              <div>
                <dt>Deadline</dt>
                <dd>{date(item.deadlineAt)}</dd>
              </div>
            </dl>
            <footer>
              <Status value={item.status} />
              <CostivraSelect
                aria-label={`Update ${item.title} status`}
                value={item.status}
                variant="badge"
                size="sm"
                onChange={(newStatus) => void update(item.id, newStatus)}
                options={statusOptions(item.status)}
              />
            </footer>
          </article>
        ))}
        {!filtered.length && (
          <Empty
            title="No opportunities match"
            copy="Try a broader search or upload new source documents."
          />
        )}
      </div>
    </>
  );
}
function Contracts({ data, onAdd }: { data: PortalData; onAdd: () => void }) {
  const [query, setQuery] = useState("");
  const canWrite = data.currentUser.role !== "viewer";
  const rows = data.contracts.filter((x) =>
    `${x.title} ${x.vendorName} ${x.category}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        title="Contracts"
        description="Renewal, notice, value, and ownership in one reliable record."
        action={canWrite ? (
          <button className="button button-primary" onClick={onAdd}>
            <Plus size={16} /> Add contract
          </button>
        ) : null}
      />
      <Toolbar
        query={query}
        setQuery={setQuery}
        placeholder="Search contracts"
      />
      <section className="portal-panel">
        {rows.length ? (
          <div className="table-wrap">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Contract</th>
                  <th>Vendor</th>
                  <th>Annual value</th>
                  <th>End date</th>
                  <th>Notice</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link className="record-link" href={`/app/contracts/${item.id}`}><strong>{item.title}</strong></Link>
                      <small>{item.category}</small>
                    </td>
                    <td>{item.vendorName}</td>
                    <td>
                      {item.annualValue == null ? "—" : money(item.annualValue)}
                    </td>
                    <td>{date(item.endDate)}</td>
                    <td>
                      {item.noticePeriodDays == null
                        ? "—"
                        : `${item.noticePeriodDays} days`}
                    </td>
                    <td>
                      <Status value={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="No contracts match"
            copy="Add a contract or clear your search."
          />
        )}
      </section>
    </>
  );
}

function Documents({
  data,
  onUpload,
  run,
}: {
  data: PortalData;
  onUpload: () => void;
  run: (work: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const canWrite = data.currentUser.role !== "viewer";
  const rows = data.documents.filter((x) =>
    `${x.originalFilename} ${x.vendorName} ${x.summary ?? ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const invoiceByDocument = new Map(
    data.invoices.map((invoice) => [invoice.documentId, invoice]),
  );
  const remove = (id: string) => {
    if (confirm("Delete this document and its extracted evidence?"))
      void run(
        () => api(`/api/portal/documents/${id}`, { method: "DELETE" }),
        "Document deleted.",
      );
  };
  const rescan = (id: string) =>
    void run(
      () => api(`/api/portal/documents/${id}`, { method: "PATCH" }),
      "Security scan passed. Extraction has resumed.",
    );
  return (
    <>
      <PageHeader
        title="Documents"
        description="Private source files with extraction status and traceable evidence."
        action={canWrite ? (
          <button className="button button-primary" onClick={onUpload}>
            <Upload size={16} /> Upload documents
          </button>
        ) : null}
      />
      <Toolbar
        query={query}
        setQuery={setQuery}
        placeholder="Search files, vendors, or summaries"
      />
      <section className="portal-panel">
        {rows.length ? (
          <div className="portal-document-grid">
            {rows.map((item) => (
              <article className="document-card" key={item.id}>
                <div className="document-icon">
                  <FileText />
                </div>
                <div className="grow">
                  <h3><Link className="record-link" href={`/app/documents/${item.id}`}>{item.originalFilename}</Link></h3>
                  <p>
                    {item.summary || "No extraction summary is available yet."}
                  </p>
                  <span>
                    {item.vendorName} · {(item.byteSize / 1024).toFixed(1)} KB ·{" "}
                    {date(item.createdAt)}
                  </span>
                  {invoiceByDocument.get(item.id) && (() => {
                    const invoice = invoiceByDocument.get(item.id)!;
                    return (
                      <div className="document-invoice-facts" aria-label="Extracted invoice record">
                        <Link className="document-invoice-link" href={`/app/documents/${invoice.id}`}><span><strong>{invoice.invoiceNumber ?? "Number missing"}</strong>Invoice</span></Link>
                        <span><strong>{invoice.totalAmount == null ? "Amount missing" : new Intl.NumberFormat("en-US", { style: "currency", currency: invoice.currency ?? "USD" }).format(invoice.totalAmount)}</strong>Total</span>
                        <span><strong>{invoice.lineItemCount}</strong>Line items</span>
                        <Status value={invoice.reconciliationStatus} />
                        <Status value={invoice.reviewStatus} />
                      </div>
                    );
                  })()}
                </div>
                <div className="document-actions">
                  <Status value={item.status} />
                  {canWrite && item.status === "quarantined" ? (
                    <button
                      className="icon-button"
                      onClick={() => rescan(item.id)}
                      aria-label={`Retry security scan for ${item.originalFilename}`}
                      title="Retry security scan"
                    >
                      <RotateCcw size={17} />
                    </button>
                  ) : null}
                  {["quarantined", "rejected", "pending_upload", "processing"].includes(item.status) ? (
                    <span
                      className="icon-button is-disabled"
                      aria-label={`${item.originalFilename} is not available for download yet`}
                      title="Available after security and processing checks"
                    >
                      <ShieldCheck size={17} />
                    </span>
                  ) : (
                    <a
                      className="icon-button"
                      href={`/api/portal/documents/${item.id}/download`}
                      aria-label={`Download ${item.originalFilename}`}
                    >
                      <Download size={17} />
                    </a>
                  )}
                  {canWrite ? (
                    <button
                      className="icon-button danger"
                      onClick={() => remove(item.id)}
                      aria-label={`Delete ${item.originalFilename}`}
                    >
                      <Trash2 size={17} />
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty
            title="No documents match"
            copy="Upload a PDF, DOCX, or text file to begin extraction."
          />
        )}
      </section>
    </>
  );
}

function Actions({
  data,
  run,
}: {
  data: PortalData;
  run: (work: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const execute = (id: string, operation: string) =>
    run(
      () =>
        api(`/api/portal/actions/${id}`, {
          method: "PATCH",
          body: { operation },
        }),
      actionOperationConfirmation(operation),
    );
  return (
    <>
      <PageHeader
        title="Actions"
        description="Approval and execution steps remain explicit, attributable, and reversible where possible."
      />
      <div className="portal-card-grid">
        {data.actions.map((item) => (
          <article className="portal-card action-card" key={item.id}>
            <header>
              <Status value={item.priority} />
              <Status value={item.status} />
            </header>
            <h2><Link className="record-link" href={`/app/actions/${item.id}`}>{item.title}</Link></h2>
            <p>{item.description}</p>
            <dl>
              <div>
                <dt>Vendor</dt>
                <dd>{item.vendorName}</dd>
              </div>
              <div>
                <dt>Due</dt>
                <dd>{date(item.dueAt)}</dd>
              </div>
              <div>
                <dt>Approval</dt>
                <dd>{item.approvedCount} of {item.requiredApprovals} recorded</dd>
              </div>
            </dl>
            {item.approvalPolicyName && <p className="action-policy-note"><ShieldCheck size={15} /> {item.approvalPolicyName}</p>}
            <footer className="action-buttons">
              {item.status === "pending_approval" && (
                item.currentUserDecision === "pending" ? <>
                  <button
                    className="button button-quiet"
                    onClick={() => void execute(item.id, "decline")}
                  >
                    Decline
                  </button>
                  <button
                    className="button button-primary"
                    onClick={() => void execute(item.id, "approve")}
                  >
                    <Check size={16} /> Approve
                  </button>
                </> : <span className="action-approval-waiting">{item.currentUserDecision === "approved" ? "Your approval is recorded. Waiting for the remaining approver." : "This decision is assigned to another administrator."}</span>
              )}
              {item.status === "approved" && (
                <button
                  className="button button-primary"
                  onClick={() => void execute(item.id, "start")}
                >
                  Start work
                </button>
              )}
              {item.status === "in_progress" && (
                <button
                  className="button button-primary"
                  onClick={() => void execute(item.id, "complete")}
                >
                  <Check size={16} /> Mark complete
                </button>
              )}
            </footer>
          </article>
        ))}
        {!data.actions.length && (
          <Empty
            title="No actions pending"
            copy="Approved opportunities will appear here as executable work."
          />
        )}
      </div>
    </>
  );
}

function Savings({ data }: { data: PortalData; run: (work: () => Promise<unknown>, success: string) => Promise<void> }) {
  const total = data.savings.reduce((s, x) => s + x.amount, 0);
  const verified = data.savings
    .filter((x) => x.status === "verified")
    .reduce((s, x) => s + x.amount, 0);
  return (
    <>
      <PageHeader
        title="Savings"
        description="Only supported outcomes move from potential value to verified value."
      />
      <div className="portal-metrics">
        <Metric
          label="Recorded value"
          value={money(total, true)}
          note={`${data.savings.length} outcomes`}
          icon={<CircleDollarSign />}
        />
        <Metric
          label="Verified value"
          value={money(verified, true)}
          note="Supported by later source evidence"
          icon={<ShieldCheck />}
        />
      </div>
      <section className="portal-panel">
        {data.savings.length ? (
          <div className="portal-list">
            {data.savings.map((item) => (
              <div className="portal-list-row savings-workflow-row" key={item.id}>
                <CheckCircle2 />
                <div className="grow">
                  <Link className="record-link" href={`/app/savings/${item.id}`}><strong>{item.title}</strong></Link>
                  <span>{item.method}</span>
                  {item.baselineAmount !== null ? <small>Baseline {money(item.baselineAmount)}{item.comparisonAmount !== null ? ` · Later invoice ${money(item.comparisonAmount)}` : " · Waiting for a later approved invoice"}</small> : null}
                </div>
                <strong className="money-value">{money(item.amount)}</strong>
                <Status value={item.status} />
                {item.status === "baseline_review" ? <Link className="button button-secondary button-compact" href={`/app/savings/${item.id}`}>Review baseline</Link> : null}
                {item.status === "ready_for_review" ? <Link className="button button-primary button-compact" href={`/app/savings/${item.id}`}><ShieldCheck size={15} /> Review evidence</Link> : null}
              </div>
            ))}
          </div>
        ) : (
          <Empty
            title="No savings recorded"
            copy="Verified outcomes will appear after supporting evidence is reviewed."
          />
        )}
      </section>
    </>
  );
}

function Vendors({ data, onAdd }: { data: PortalData; onAdd: () => void }) {
  const [query, setQuery] = useState("");
  const canAddVendor = ["owner", "admin", "member"].includes(data.currentUser.role);
  const rows = data.vendors.filter((x) =>
    `${x.name} ${x.category} ${x.website ?? ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        title="Vendors"
        description="Every supplier relationship, its source records, and the next important date."
        action={canAddVendor ? (
          <button className="button button-primary" onClick={onAdd}>
            <Plus size={16} /> Add vendor
          </button>
        ) : undefined}
      />
      <Toolbar
        query={query}
        setQuery={setQuery}
        placeholder="Search vendors, categories, or websites"
      />
      <section className="portal-panel vendor-directory">
        {rows.length ? (
          <div className="table-wrap">
            <table className="portal-table vendor-table">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Category</th>
                  <th>Annualized spend</th>
                  <th>Records</th>
                  <th>Next contract end</th>
                  <th>Relationship</th>
                  <th>
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => {
                  const contracts = data.contracts
                    .filter(
                      (contract) =>
                        contract.vendorId === item.id && contract.endDate,
                    )
                    .sort((a, b) =>
                      String(a.endDate).localeCompare(String(b.endDate)),
                    );
                  const records =
                    data.expenses.filter(
                      (expense) => expense.vendorId === item.id,
                    ).length +
                    data.documents.filter(
                      (document) => document.vendorId === item.id,
                    ).length;
                  return (
                    <tr key={item.id}>
                      <td>
                        <Link
                          className="vendor-name-cell"
                          href={`/app/vendors/${item.id}`}
                        >
                          <CompanyLogo entity="vendor" id={item.id} name={item.name} className="vendor-monogram" />
                          <span>
                            <strong>{item.name}</strong>
                            <small>
                              {item.website
                                ? new URL(item.website).hostname.replace(
                                    /^www\./,
                                    "",
                                  )
                                : "Website not recorded"}
                            </small>
                          </span>
                        </Link>
                      </td>
                      <td>{item.category}</td>
                      <td>
                        <strong>{money(item.annualizedSpend)}</strong>
                      </td>
                      <td>{records}</td>
                      <td>{date(contracts[0]?.endDate ?? null)}</td>
                      <td>
                        <Status value={item.relationshipStatus} />
                      </td>
                      <td>
                        <Link
                          className="row-chevron"
                          href={`/app/vendors/${item.id}`}
                          aria-label={`Open ${item.name}`}
                        >
                          <ChevronRight size={17} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="No vendors match"
            copy="Try a broader search or add a new vendor relationship."
          />
        )}
      </section>
    </>
  );
}

export function VendorDetail({
  data,
  vendorId,
  onAdd,
}: {
  data: PortalData;
  vendorId: string;
  onAdd: (kind: Exclude<ModalState, null>, relationshipId: string) => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const vendor = data.vendors.find((item) => item.id === vendorId);

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("tab") || "overview";
    }
    return "overview";
  });
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [dangerDialogOpen, setDangerDialogOpen] = useState(false);
  const [dangerMode, setDangerMode] = useState<"end" | "remove">("end");
  const [deletionPreview, setDeletionPreview] = useState<DependencyPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Edit form state
  const [displayNameOverride, setDisplayNameOverride] = useState(vendor?.name ?? "");
  const [categoryOverride, setCategoryOverride] = useState(vendor?.category ?? "");
  const [websiteOverride, setWebsiteOverride] = useState(vendor?.website ?? "");
  const [relationshipStatus, setRelationshipStatus] = useState(vendor?.relationshipStatus ?? "active");
  const [annualizedSpend, setAnnualizedSpend] = useState(vendor?.annualizedSpend?.toString() ?? "0");
  const [spendCadence, setSpendCadence] = useState(vendor?.spendCadence ?? "monthly");

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.pushState({}, "", url.toString());
    }
  };

  if (!vendor)
    return (
      <div className="vendor-not-found">
        <Link href="/app/vendors">
          <ArrowLeft size={15} /> Back to vendors
        </Link>
        <Empty
          title="Vendor not found"
          copy="This vendor is not part of your organization, or the link is no longer valid."
        />
      </div>
    );

  const canWrite = data.currentUser.role !== "viewer";
  const vendorDraftDirty = recordDraftChanged(
    { displayNameOverride: vendor.name, categoryOverride: vendor.category, websiteOverride: vendor.website ?? "", relationshipStatus: vendor.relationshipStatus, annualizedSpend: vendor.annualizedSpend ?? 0, spendCadence: vendor.spendCadence ?? "monthly" },
    { displayNameOverride, categoryOverride, websiteOverride, relationshipStatus, annualizedSpend, spendCadence },
    ["displayNameOverride", "categoryOverride", "websiteOverride", "relationshipStatus", "annualizedSpend", "spendCadence"],
  );
  const expenses = data.expenses
    .filter((item) => item.vendorId === vendorId)
    .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd));
  const contracts = data.contracts
    .filter((item) => item.vendorId === vendorId)
    .sort((a, b) =>
      String(a.endDate ?? "9999").localeCompare(String(b.endDate ?? "9999")),
    );
  const documents = data.documents.filter((item) => item.vendorId === vendorId);
  const opportunities = data.opportunities.filter(
    (item) => item.vendorId === vendorId,
  );
  const actions = data.actions.filter((item) => item.vendorId === vendorId);
  const contract = contracts[0];
  const latest = expenses[0];
  const rawMonitoringState = (vendor as unknown as Record<string, unknown>).monitoringState as MonitoringState || "not_set_up";
  const hasPendingReviewInvoice = data.invoices.some((i) => i.vendorId === vendorId && i.reviewStatus === "needs_review");
  const hasOpenFinding = opportunities.some((o) => !["closed", "declined"].includes(o.status));
  const hasPendingAction = actions.some((a) => !["complete", "cancelled"].includes(a.status));

  const primaryAction = getDynamicPrimaryAction({
    documentCount: documents.length,
    hasPendingReviewInvoice,
    monitoringState: rawMonitoringState,
    hasOpenFinding,
    hasPendingAction,
  });

  const handleOpenEditSheet = () => {
    setDisplayNameOverride(vendor.name);
    setCategoryOverride(vendor.category);
    setWebsiteOverride(vendor.website ?? "");
    setRelationshipStatus(vendor.relationshipStatus);
    setAnnualizedSpend(vendor.annualizedSpend?.toString() ?? "0");
    setSpendCadence(vendor.spendCadence ?? "monthly");
    setEditError(null);
    setEditSheetOpen(true);
  };

  const handleSaveEditSheet = async () => {
    setSavingEdit(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/portal/vendors/${vendor.relationshipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayNameOverride,
          categoryOverride,
          websiteOverride,
          relationshipStatus,
          annualizedSpend: Number(annualizedSpend) || 0,
          spendCadence,
          expectedUpdatedAt: vendor.updatedAt,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save relationship changes.");
      }
      toast.success("Vendor relationship updated.");
      setEditSheetOpen(false);
      router.refresh();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleOpenDangerDialog = async (mode: "end" | "remove") => {
    setDangerMode(mode);
    setDangerDialogOpen(true);
    if (mode === "remove") {
      setLoadingPreview(true);
      try {
        const res = await fetch(`/api/portal/vendors/${vendor.relationshipId}/deletion-preview`);
        if (res.ok) {
          const preview = await res.json();
          setDeletionPreview(preview);
        }
      } catch {
        setDeletionPreview({
          blocked: true,
          blockReason: "Failed to load deletion preview.",
          counts: [],
        });
      } finally {
        setLoadingPreview(false);
      }
    } else {
      setDeletionPreview(null);
    }
  };

  const handleConfirmDangerAction = async (reason?: string) => {
    if (dangerMode === "end") {
      const res = await fetch(`/api/portal/vendors/${vendor.relationshipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relationshipStatus: "ended", reason }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to end vendor relationship.");
      }
      toast.success("Vendor relationship ended.");
      router.refresh();
    } else {
      const res = await fetch(`/api/portal/vendors/${vendor.relationshipId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to remove vendor relationship.");
      }
      toast.success("Vendor relationship removed from workspace.");
      router.push("/app/vendors");
    }
  };

  const menuItems = [
    {
      id: "edit",
      label: "Edit vendor relationship",
      icon: <Pencil size={15} />,
      disabled: !canWrite,
      onSelect: handleOpenEditSheet,
    },
    {
      id: "monitor",
      label: "Configure monitoring",
      icon: <Mail size={15} />,
      disabled: !canWrite,
      onSelect: () => onAdd("monitor", vendor.relationshipId),
    },
    {
      id: "upload",
      label: "Add bill or contract",
      icon: <Plus size={15} />,
      disabled: !canWrite,
      onSelect: () => onAdd("upload", vendor.relationshipId),
    },
    {
      id: "copy",
      label: "Copy vendor information",
      icon: <Copy size={15} />,
      onSelect: async () => {
        const info = `${vendor.name}\nCategory: ${vendor.category}\nWebsite: ${vendor.website || "N/A"}\nAnnualized Spend: $${vendor.annualizedSpend}`;
        await navigator.clipboard.writeText(info);
        toast.success("Vendor details copied to clipboard.");
      },
    },
    {
      id: "end",
      label: vendor.relationshipStatus === "ended" ? "Reactivate relationship" : "End vendor relationship",
      icon: <Pause size={15} />,
      disabled: !canWrite,
      onSelect: () => handleOpenDangerDialog("end"),
    },
    {
      id: "remove",
      label: "Remove vendor from workspace…",
      icon: <Trash2 size={15} />,
      destructive: true,
      separatorBefore: true,
      disabled: !canWrite || (data.currentUser.role !== "owner" && data.currentUser.role !== "admin"),
      onSelect: () => handleOpenDangerDialog("remove"),
    },
  ];

  const vendorTabs = [
    { id: "overview", label: "Overview" },
    { id: "bills", label: "Bills", count: expenses.length },
    { id: "contracts", label: "Contracts", count: contracts.length },
    { id: "findings", label: "Findings", count: opportunities.length },
    { id: "actions", label: "Actions", count: actions.length },
    { id: "files", label: "Files", count: documents.length },
  ];

  return (
    <div className="vendor-detail">
      <Link className="vendor-back" href="/app/vendors">
        <ArrowLeft size={15} /> Back to vendors
      </Link>
      <header className="vendor-detail-header" style={{ position: "relative" }}>
        <div>
          <div className="vendor-detail-title">
            <CompanyLogo entity="vendor" id={vendor.id} name={vendor.name} className="vendor-monogram large" />
            <div>
              <h1>{vendor.name}</h1>
              <p>
                {vendor.category}
                {vendor.website && (
                  <>
                    {" "}
                    ·{" "}
                    <a href={vendor.website} target="_blank" rel="noreferrer">
                      {new URL(vendor.website).hostname.replace(/^www\./, "")}
                      <ExternalLink size={12} />
                    </a>
                  </>
                )}
              </p>
            </div>
          </div>
          <Status value={vendor.relationshipStatus} />
        </div>
        <div className="vendor-detail-actions" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {canWrite && (
            primaryAction.actionKind === "upload" ? (
              <button className="button button-primary" onClick={() => onAdd("upload", vendor.relationshipId)}>
                <Plus size={16} /> {primaryAction.label}
              </button>
            ) : primaryAction.actionKind === "monitor" || primaryAction.actionKind === "test_forwarding" ? (
              <button className="button button-primary" onClick={() => onAdd("monitor", vendor.relationshipId)}>
                <Mail size={16} /> {primaryAction.label}
              </button>
            ) : primaryAction.href ? (
              <Link className="button button-primary" href={primaryAction.href}>
                {primaryAction.label} <ArrowUpRight size={16} />
              </Link>
            ) : (
              <button className="button button-primary" onClick={() => onAdd("expense", vendor.relationshipId)}>
                <Plus size={16} /> {primaryAction.label}
              </button>
            )
          )}
          {canWrite && (
            <>
              <button className="button button-quiet" onClick={() => onAdd("contract", vendor.relationshipId)}>
                Add contract
              </button>
              <button className="button button-quiet" onClick={() => onAdd("upload", vendor.relationshipId)}>
                Upload file
              </button>
            </>
          )}
          <RecordOverflowMenu items={menuItems} ariaLabel="More vendor actions" />
        </div>
      </header>

      {/* URL-Persisted Tabs Header */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid rgba(30, 41, 59, 0.10)", margin: "16px 0 20px" }}>
        {vendorTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabChange(tab.id)}
            style={{
              padding: "8px 14px",
              fontSize: "0.85rem",
              fontWeight: activeTab === tab.id ? 600 : 500,
              color: activeTab === tab.id ? "var(--assistant-accent, #002FA7)" : "var(--assistant-muted, #64748b)",
              borderBottom: activeTab === tab.id ? "2px solid var(--assistant-accent, #002FA7)" : "2px solid transparent",
              background: "transparent",
              borderTop: 0, borderLeft: 0, borderRight: 0,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {tab.label}
            {tab.count != null && (
              <span style={{ fontSize: "0.74rem", padding: "1px 6px", borderRadius: 10, background: "rgba(30, 41, 59, 0.06)" }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <>
          <section className="vendor-summary-band">
            <div className="vendor-spend-stat">
              <span>Annualized spend</span>
              <strong>{money(vendor.annualizedSpend)}</strong>
              <small>Current relationship record</small>
            </div>
            <div className="vendor-spend-stat">
              <span>Latest expense</span>
              <strong>{latest ? money(latest.amount) : "Not recorded"}</strong>
              <small>
                {latest
                  ? `Period ending ${date(latest.periodEnd)}`
                  : "Add an expense or source document"}
              </small>
            </div>
            <SpendSparkline expenses={expenses} />
            <VendorCount label="Documents" value={documents.length} />
            <VendorCount label="Expenses" value={expenses.length} />
            <VendorCount
              label="Open findings"
              value={opportunities.filter((item) => !["closed", "declined"].includes(item.status)).length}
            />
            <VendorCount label="Actions" value={actions.length} />
          </section>
          <VendorMonitoringCard
            vendor={vendor}
            organizationId={data.organization.id}
            canWrite={canWrite}
            onMonitor={() => onAdd("monitor", vendor.relationshipId)}
          />
          <DataCompletenessChecklist
            documentsCount={documents.length}
            expensesCount={expenses.length}
            contract={contract}
            monitoringActive={rawMonitoringState === "active"}
          />
        </>
      )}

      {/* Edit Record Sheet */}
      <EditRecordSheet
        title={`Edit ${vendor.name}`}
        subtitle="These changes affect only your Costivra workspace."
        isOpen={editSheetOpen}
        onClose={() => setEditSheetOpen(false)}
        onSave={handleSaveEditSheet}
        isDirty={vendorDraftDirty}
        saving={savingEdit}
        error={editError}
        onReloadLatest={() => router.refresh()}
        onKeepDraft={() => setEditError(null)}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--assistant-text-secondary, #475569)" }}>
              Workspace Display Name
            </label>
            <input
              type="text"
              value={displayNameOverride}
              onChange={(e) => setDisplayNameOverride(e.target.value)}
              placeholder={vendor.name}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(30, 41, 59, 0.2)" }}
            />
          </div>

          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--assistant-text-secondary, #475569)" }}>
              Category
            </label>
            <input
              type="text"
              value={categoryOverride}
              onChange={(e) => setCategoryOverride(e.target.value)}
              placeholder={vendor.category}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(30, 41, 59, 0.2)" }}
            />
          </div>

          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--assistant-text-secondary, #475569)" }}>
              Website URL
            </label>
            <input
              type="url"
              value={websiteOverride}
              onChange={(e) => setWebsiteOverride(e.target.value)}
              placeholder="https://..."
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(30, 41, 59, 0.2)" }}
            />
          </div>

          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--assistant-text-secondary, #475569)" }}>
              Relationship Status
            </label>
            <select
              value={relationshipStatus}
              onChange={(e) => setRelationshipStatus(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(30, 41, 59, 0.2)" }}
            >
              <option value="active">Active</option>
              <option value="under_review">Under Review</option>
              <option value="paused">Paused</option>
              <option value="ended">Ended</option>
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--assistant-text-secondary, #475569)" }}>
                Annualized Spend ($)
              </label>
              <input
                type="number"
                value={annualizedSpend}
                onChange={(e) => setAnnualizedSpend(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(30, 41, 59, 0.2)" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--assistant-text-secondary, #475569)" }}>
                Spend Cadence
              </label>
              <select
                value={spendCadence}
                onChange={(e) => setSpendCadence(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(30, 41, 59, 0.2)" }}
              >
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
                <option value="quarterly">Quarterly</option>
                <option value="usage_based">Usage Based</option>
              </select>
            </div>
          </div>
        </div>
      </EditRecordSheet>

      {/* Danger Dialog */}
      <RecordDangerDialog
        isOpen={dangerDialogOpen}
        mode={dangerMode}
        recordTitle={vendor.name}
        onClose={() => setDangerDialogOpen(false)}
        onConfirm={handleConfirmDangerAction}
        dependencyPreview={deletionPreview}
        loadingPreview={loadingPreview}
        requiredConfirmationText={dangerMode === "remove" ? vendor.name : undefined}
      />
      <div className="vendor-detail-grid">
        <section className="portal-panel vendor-contract-summary">
          <div className="portal-panel-heading">
            <div>
              <h2>Contract summary</h2>
              <p>Dates come from saved contract records.</p>
            </div>
            {canWrite ? <button
              className="text-button"
              onClick={() => onAdd("contract", vendor.relationshipId)}
            >
              Add contract
            </button> : null}
          </div>
          {contract ? (
            <dl>
              <div>
                <dt>Primary contract</dt>
                <dd>{contract.title}</dd>
              </div>
              <div>
                <dt>Contract end</dt>
                <dd>{date(contract.endDate)}</dd>
              </div>
              <div>
                <dt>Notice period</dt>
                <dd>
                  {contract.noticePeriodDays == null
                    ? "Not recorded"
                    : `${contract.noticePeriodDays} days`}
                </dd>
              </div>
              <div>
                <dt>Auto-renewal</dt>
                <dd>{contract.autoRenews ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt>Owner</dt>
                <dd>{contract.ownerName ?? "Not recorded"}</dd>
              </div>
              <div>
                <dt>Annual value</dt>
                <dd>
                  {contract.annualValue == null
                    ? "Not recorded"
                    : money(contract.annualValue)}
                </dd>
              </div>
            </dl>
          ) : (
            <Empty
              title="No contract recorded"
              copy="Add the agreement and its dates so Costivra can monitor the notice window."
            />
          )}
        </section>
        <section className="portal-panel vendor-opportunities">
          <div className="portal-panel-heading">
            <div>
              <h2>Active opportunities</h2>
              <p>Findings remain separate from verified outcomes.</p>
            </div>
          </div>
          {opportunities.length ? (
            <div className="portal-list">
              {opportunities.map((item) => (
                <Link
                  className="portal-list-row"
                  href={`/app/opportunities#${item.id}`}
                  key={item.id}
                >
                  <span className={`priority-dot priority-${item.priority}`} />
                  <div className="grow">
                    <strong>{item.title}</strong>
                    <span>
                      {item.evidenceCount} evidence reference
                      {item.evidenceCount === 1 ? "" : "s"} ·{" "}
                      {Math.round((item.confidence ?? 0) * 100)}% confidence
                    </span>
                  </div>
                  <Status value={item.status} />
                  <ChevronRight size={16} />
                </Link>
              ))}
            </div>
          ) : (
            <Empty
              title="No active findings"
              copy="Costivra has not created an evidence-backed opportunity for this vendor."
            />
          )}
        </section>
      </div>
      <div className="vendor-record-grid">
        <section className="portal-panel">
          <div className="portal-panel-heading">
            <div>
              <h2>Expenses & invoice periods</h2>
              <p>
                Normalized records only; missing invoice numbers are not
                invented.
              </p>
            </div>
            {canWrite ? <button
              className="text-button"
              onClick={() => onAdd("expense", vendor.relationshipId)}
            >
              Add expense
            </button> : null}
          </div>
          {expenses.length ? (
            <div className="table-wrap">
              <table className="portal-table vendor-records-table">
                <thead>
                  <tr>
                    <th>Period end</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Change</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((item) => {
                    const change = item.priorPeriodAmount
                      ? ((item.amount - item.priorPeriodAmount) /
                          item.priorPeriodAmount) *
                        100
                      : null;
                    return (
                      <tr key={item.id}>
                        <td>{date(item.periodEnd)}</td>
                        <td>{item.category}</td>
                        <td>
                          <strong>{money(item.amount)}</strong>
                        </td>
                        <td>
                          {change == null
                            ? "—"
                            : `${change > 0 ? "+" : ""}${change.toFixed(1)}%`}
                        </td>
                        <td>
                          <Status value={item.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="No expense history"
              copy="Add an expense or upload an invoice to begin the spend timeline."
            />
          )}
        </section>
      </div>
      <RecordFilesWorkspace
        title="Vendor files"
        description="Original source files, invoices, contracts, and evidence collected for this vendor relationship."
        emptyCopy="Upload a bill or contract to preserve the source evidence for this vendor relationship."
        files={documents.map((item) => ({
          id: item.id,
          name: item.originalFilename,
          documentType: item.documentType,
          mimeType: item.mimeType,
          status: item.status,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          byteSize: item.byteSize,
          pageCount: item.pageCount,
          summary: item.summary,
          confidence: item.confidence,
          evidenceCount: data.evidenceReferences.filter((reference) => reference.documentId === item.id).length,
          contextLabel: vendor.name,
          href: `/api/portal/documents/${item.id}/download`,
          sourceAvailable: !item.sourcePurgedAt,
        }))}
      />
    </div>
  );
}

function VendorMonitoringCard({
  vendor,
  organizationId,
  canWrite,
  onMonitor,
}: {
  vendor: PortalVendor;
  organizationId: string;
  canWrite: boolean;
  onMonitor: () => void;
}) {
  const rawState = (vendor as unknown as Record<string, unknown>).monitoringState as MonitoringState || "not_set_up";
  const { label, copy, badgeClass } = getMonitoringStateLabel(rawState);
  const privateAddress = `inbox-${organizationId.slice(0, 8)}@costivra.ai`;

  return (
    <section className="portal-panel vendor-monitoring-card" style={{ marginBottom: 24, padding: "20px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>Continuous Bill Monitoring</h2>
            <span className={`portal-status ${badgeClass}`}>{label}</span>
          </div>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: "0.85rem" }}>{copy}</p>
        </div>
        {canWrite && (
          <button className="button button-primary button-sm" onClick={onMonitor}>
            <Mail size={14} /> {rawState === "not_set_up" ? "Monitor this vendor" : "Configure rule"}
          </button>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, background: "var(--bg-subtle, #f8fafc)", padding: "16px", borderRadius: 10, border: "1px solid var(--border-color, #e2e8f0)" }}>
        <div>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block" }}>Approved forwarding sender</span>
          <strong style={{ fontSize: "0.9rem" }}>{vendor.approvedForwardingEmail ?? "Not configured"}</strong>
        </div>
        <div>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block" }}>Private intake address</span>
          <code style={{ fontSize: "0.85rem", background: "rgba(0,0,0,0.04)", padding: "2px 6px", borderRadius: 4 }}>{privateAddress}</code>
        </div>
        <div>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block" }}>Expected cadence</span>
          <strong style={{ fontSize: "0.9rem" }}>Monthly (30 days)</strong>
        </div>
      </div>
      <p className="muted" style={{ fontSize: "0.78rem", margin: "14px 0 0", display: "flex", alignItems: "center", gap: 6 }}>
        <ShieldCheck size={14} style={{ color: "#002FA7" }} /> Costivra receives only messages sent to your private workspace address. Costivra does not read the rest of your inbox.
      </p>
    </section>
  );
}

function DataCompletenessChecklist({
  documentsCount,
  expensesCount,
  contract,
  monitoringActive,
}: {
  documentsCount: number;
  expensesCount: number;
  contract?: PortalContract;
  monitoringActive: boolean;
}) {
  const items = [
    { label: "Recent invoice", done: expensesCount > 0 || documentsCount > 0 },
    { label: "Vendor matched", done: true },
    { label: "Totals reconciled", done: expensesCount > 0 },
    { label: "Contract recorded", done: Boolean(contract) },
    { label: "Renewal date recorded", done: Boolean(contract?.endDate) },
    { label: "Location assigned", done: Boolean(contract?.locationId) },
    { label: "Monitoring active", done: monitoringActive },
  ];
  const score = Math.round((items.filter((i) => i.done).length / items.length) * 100);

  return (
    <section className="portal-panel" style={{ marginBottom: 24, padding: "20px 24px" }}>
      <div className="portal-panel-heading" style={{ marginBottom: 12 }}>
        <div>
          <h2>Data Completeness</h2>
          <p>{score}% of recommended relationship fields recorded.</p>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        {items.map((item) => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem" }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: "50%", background: item.done ? "#10b981" : "#cbd5e1", color: "#fff", flexShrink: 0 }}>
              {item.done ? <Check size={12} /> : <X size={12} />}
            </span>
            <span style={{ color: item.done ? "inherit" : "var(--text-muted)" }}>{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function VendorCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="vendor-count">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
function SpendSparkline({ expenses }: { expenses: PortalData["expenses"] }) {
  const points = expenses.slice(0, 6).reverse();
  const max = Math.max(...points.map((item) => item.amount), 1);
  const path = points
    .map(
      (item, index) =>
        `${index === 0 ? "M" : "L"} ${8 + index * (120 / Math.max(points.length - 1, 1))} ${48 - (item.amount / max) * 34}`,
    )
    .join(" ");
  return (
    <div className="vendor-spend-trend">
      <span>
        <TrendingUp size={15} /> Expense trend
      </span>
      {points.length > 1 ? (
        <svg
          viewBox="0 0 136 56"
          role="img"
          aria-label="Recent expense amount trend"
        >
          <path d={path} />
          {points.map((item, index) => (
            <circle
              key={item.id}
              cx={8 + index * (120 / Math.max(points.length - 1, 1))}
              cy={48 - (item.amount / max) * 34}
              r="2.5"
            />
          ))}
        </svg>
      ) : (
        <small>Two expense periods are needed for a trend.</small>
      )}
    </div>
  );
}

function Integrations({
  data,
  run,
  embedded = false,
}: {
  data: PortalData;
  run: (work: () => Promise<unknown>, success: string) => Promise<void>;
  embedded?: boolean;
}) {
  const [sender, setSender] = useState("");
  const toast = useToast();
  const intake = data.emailIntake;
  const canManage = ["owner", "admin"].includes(data.currentUser.role);
  const providerIntegrations = data.integrations.filter(
    (item) => item.provider !== "resend_inbound",
  );
  const intakeOperation = (operation: string, email?: string, eventId?: string) =>
    run(
      () =>
        api("/api/portal/email-intake", {
          method: "PATCH",
          body: { operation, sender: email, eventId },
        }),
      operation === "activate"
        ? "Automatic email intake is active."
        : operation === "pause"
          ? "Automatic email intake is paused."
          : operation === "retry"
            ? "Quarantined files were checked again."
            : operation === "retry_failed"
              ? "The email was queued for another safe attempt."
            : operation === "add_sender"
              ? "Forwarding address approved."
              : "Forwarding address removed.",
    );
  const copyAddress = async () => {
    if (!intake) return;
    try {
      await navigator.clipboard.writeText(intake.address);
      toast.success("Intake address copied.");
    } catch {
      toast.error(
        "Couldn’t copy automatically",
        `Copy ${intake.address} manually.`,
      );
    }
  };
  const addSender = async (event: FormEvent) => {
    event.preventDefault();
    const value = sender.trim().toLowerCase();
    if (!value) return;
    try {
      await intakeOperation("add_sender", value);
      setSender("");
    } catch {}
  };
  const quarantined = data.inboundEmailEvents.some(
    (item) => item.status === "quarantined",
  );
  return (
    <>
      {!embedded && <PageHeader
        title="Integrations"
        description="Connect the systems that supply Costivra with trusted, organization-owned records."
      />}
      <section className="email-intake portal-panel">
        <div className="email-intake-header">
          <div className="email-intake-title">
            <span className="email-intake-icon">
              <Mail />
            </span>
            <div>
              <span className="eyebrow">AUTOMATIC DOCUMENT INTAKE</span>
              <h2>Forward bills and contracts from work email</h2>
              <p>
                Give vendors this workspace address or create a forwarding rule
                in your current mailbox. Approved attachments become private,
                traceable Costivra records.
              </p>
            </div>
          </div>
          <Status value={intake?.status ?? "unavailable"} />
        </div>
        {intake ? (
          <>
            <div className="email-intake-address">
              <div>
                <small>Your private workspace address</small>
                <strong>{intake.address}</strong>
              </div>
              <button
                className="button button-quiet"
                type="button"
                onClick={() => void copyAddress()}
              >
                <Copy size={16} /> Copy address
              </button>
            </div>
            {!intake.platformReady && (
              <div className="email-intake-notice">
                <ShieldCheck />
                <div>
                  <strong>
                    Costivra platform setup is still being completed.
                  </strong>
                  <span>
                    You can approve forwarding addresses now. Activation will
                    unlock after the receiving domain, signed webhook, and
                    malware scanner are verified.
                  </span>
                </div>
              </div>
            )}
            <div className="email-intake-layout">
              <div className="email-intake-setup">
                <h3>Set up in three steps</h3>
                <ol>
                  <li>
                    <span>1</span>
                    <div>
                      <strong>Approve your forwarding address</strong>
                      <p>
                        Add the exact work email that will send or forward
                        documents. Workspace member emails are trusted
                        automatically.
                      </p>
                    </div>
                  </li>
                  <li>
                    <span>2</span>
                    <div>
                      <strong>Create a mailbox rule</strong>
                      <p>
                        In Outlook or Google Workspace, forward vendor invoices
                        and contracts to the private address above. You can also
                        give this address directly to vendors.
                      </p>
                    </div>
                  </li>
                  <li>
                    <span>3</span>
                    <div>
                      <strong>Send one test document</strong>
                      <p>
                        Attach a PDF, DOCX, or TXT file. Costivra verifies the
                        sender, scans the file, prevents duplicates, and
                        preserves the source.
                      </p>
                    </div>
                  </li>
                </ol>
              </div>
              <div className="trusted-senders">
                <h3>Approved forwarding addresses</h3>
                {canManage ? (
                  <>
                    <form onSubmit={addSender} className="trusted-sender-form">
                      <label>
                        <span>Work email</span>
                        <input
                          type="email"
                          required
                          value={sender}
                          onChange={(event) => setSender(event.target.value)}
                          placeholder="billing@yourcompany.com"
                        />
                      </label>
                      <button
                        className="button button-primary"
                        type="submit"
                        disabled={!sender.trim()}
                      >
                        <Plus size={16} /> Approve
                      </button>
                    </form>
                    <div className="trusted-sender-list">
                      {intake.trustedSenders.length ? (
                        intake.trustedSenders.map((email) => (
                          <div key={email}>
                            <span>
                              <Mail size={15} />
                              {email}
                            </span>
                            <button
                              type="button"
                              className="icon-button"
                              aria-label={`Remove ${email}`}
                              onClick={() =>
                                void intakeOperation("remove_sender", email)
                              }
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ))
                      ) : (
                        <p>
                          No additional forwarding addresses are approved yet.
                        </p>
                      )}
                    </div>
                    <div className="email-intake-controls">
                      {intake.status === "active" ? (
                        <button
                          className="button button-quiet"
                          type="button"
                          onClick={() => void intakeOperation("pause")}
                        >
                          <Pause size={16} /> Pause intake
                        </button>
                      ) : (
                        <button
                          className="button button-primary"
                          type="button"
                          disabled={!intake.platformReady}
                          onClick={() => void intakeOperation("activate")}
                        >
                          <Check size={16} /> Activate intake
                        </button>
                      )}
                      {quarantined && (
                        <button
                          className="button button-quiet"
                          type="button"
                          onClick={() => void intakeOperation("retry")}
                        >
                          <RotateCcw size={16} /> Retry quarantine
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="email-intake-readonly">
                    An owner or administrator manages forwarding access for this
                    workspace.
                  </p>
                )}
              </div>
            </div>
            <div className="email-intake-events">
              <div className="portal-panel-heading">
                <div>
                  <h3>Recent inbound activity</h3>
                  <p>
                    A visible record of what Costivra accepted, quarantined, or
                    rejected.
                  </p>
                </div>
              </div>
              {data.inboundEmailEvents.length ? (
                <div>
                  {data.inboundEmailEvents.map((event) => (
                    <article className="email-intake-event" key={event.id}>
                      <span className="email-event-icon">
                        <Mail size={17} />
                      </span>
                      <div className="grow">
                        <strong>{event.subject || "No subject"}</strong>
                        <span>
                          From {event.senderAddress} · {date(event.receivedAt)}
                        </span>
                        {event.errorMessage && (
                          <small>{event.errorMessage}</small>
                        )}
                      </div>
                      <div className="email-event-result">
                        <Status value={event.status} />
                        <small>
                          {event.status === "queued"
                            ? "Waiting for secure processing"
                            : event.status === "processing"
                              ? "Scanning and reading attachments"
                              : event.status === "retrying"
                                ? "Retry scheduled automatically"
                                : event.status === "dead_letter"
                                  ? "Manual review required"
                                  : `${event.processedAttachmentCount}/${event.attachmentCount} files processed`}
                        </small>
                        {canManage && event.status === "dead_letter" && (
                          <button
                            className="button button-quiet"
                            type="button"
                            onClick={() => void intakeOperation("retry_failed", undefined, event.id)}
                          >
                            <RotateCcw size={15} /> Retry
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <Empty
                  title="No inbound messages yet"
                  copy="After activation, send a test document from an approved work email."
                />
              )}
            </div>
          </>
        ) : (
          <div className="email-intake-notice">
            <ShieldCheck />
            <div>
              <strong>
                Email intake is not provisioned for this workspace.
              </strong>
              <span>
                An owner can contact Costivra support to repair the organization
                setup.
              </span>
            </div>
          </div>
        )}
      </section>
      {providerIntegrations.length > 0 && (
        <>
          <div className="portal-section-heading">
            <h2>Other connections</h2>
            <p>
              Planned provider adapters are shown for roadmap clarity. They do
              not claim to be connected until authorization and verified sync
              are implemented.
            </p>
          </div>
          <div className="portal-card-grid">
            {providerIntegrations.map((item) => (
              <article className="portal-card integration-card" key={item.id}>
                <header>
                  <div className="integration-symbol">
                    {item.displayName.slice(0, 2).toUpperCase()}
                  </div>
                  <Status value={item.status} />
                </header>
                <h2>{item.displayName}</h2>
                <p>{item.description}</p>
                <small>
                  {item.lastSyncedAt
                    ? `Last synchronized ${date(item.lastSyncedAt)}`
                    : "No live synchronization is configured"}
                </small>
                <footer>
                  <span className="integration-availability">
                    {item.status === "restricted"
                      ? "Requires a reviewed consent workflow"
                      : "Planned · not connected"}
                  </span>
                </footer>
              </article>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function Reports({ data }: { data: PortalData }) {
  return (
    <>
      <PageHeader
        title="Reports"
        description="Exports generated from the current organization records at download time."
      />
      <div className="portal-card-grid">
        {data.reports.map((item) => (
          <article className="portal-card" key={item.id}>
            <FileText className="card-icon" />
            <h2>{item.name}</h2>
            <p>{item.description}</p>
            <small>
              {item.lastGeneratedAt
                ? `Last generated ${date(item.lastGeneratedAt)}`
                : "Not generated yet"}
            </small>
            <footer>
              <a
                className="button button-primary"
                href={`/api/portal/reports/${item.id}`}
              >
                <Download size={16} /> Download CSV
              </a>
            </footer>
          </article>
        ))}
        {!data.reports.length && (
          <Empty
            title="No reports configured"
            copy="Report definitions created for this organization will appear here."
          />
        )}
      </div>
    </>
  );
}

function Team({ data, onInvite, run, embedded = false }: {
  data: PortalData;
  onInvite: () => void;
  run: (work: () => Promise<unknown>, success: string) => Promise<void>;
  embedded?: boolean;
}) {
  const [selected, setSelected] = useState<PortalTeamMember | null>(null);
  const [role, setRole] = useState("member");
  const [busy, setBusy] = useState(false);
  const canManage = ["owner", "admin"].includes(data.currentUser.role);
  const openMember = (member: PortalTeamMember) => {
    setRole(member.role);
    setSelected(member);
  };
  const save = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await run(
        () => api(`/api/portal/team/${selected.id}`, { method: "PATCH", body: { role } }),
        `${selected.fullName}'s role was updated.`,
      );
      setSelected(null);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await run(
        () => api(`/api/portal/team/${selected.id}`, { method: "DELETE" }),
        `${selected.fullName}'s workspace access was removed.`,
      );
      setSelected(null);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      {!embedded && <PageHeader
        title="Team & approvals"
        description="Access and decision authority are visible at the organization level."
        action={
          ["owner", "admin"].includes(data.currentUser.role) ? (
            <button className="button button-primary" onClick={onInvite}>
              <Plus size={16} /> Invite member
            </button>
          ) : undefined
        }
      />}
      {embedded && (
        <header className="settings-section-header settings-team-header">
          <div>
            <span>People and authority</span>
            <h2>Team members</h2>
            <p>Invite colleagues, keep roles current, and remove access when responsibilities change.</p>
          </div>
          {canManage && (
            <button className="button button-primary" type="button" onClick={onInvite}>
              <Plus size={16} /> Invite member
            </button>
          )}
        </header>
      )}
      <section className="portal-panel">
        {data.team.length ? (
          <div className="portal-list">
            {data.team.map((item) => (
              <div className="portal-list-row" key={item.id}>
                <span className="member-avatar">
                  {item.fullName
                    .split(/\s+/)
                    .map((x) => x[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </span>
                <div className="grow">
                  <strong>{item.fullName}</strong>
                  <span>{item.email}</span>
                </div>
                <Status value={item.role} />
                {canManage && item.role !== "owner" && (
                  <button className="icon-button" type="button" onClick={() => openMember(item)} aria-label={`Manage ${item.fullName}`}>
                    <Pencil size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <Empty
            title="No team members"
            copy="Invite a colleague to establish your approval path."
          />
        )}
      </section>
      <PortalModal
        open={selected !== null}
        title="Manage team member"
        description="Role changes apply immediately. Removing access does not delete the person's profile or audit history."
        onClose={() => !busy && setSelected(null)}
      >
        {selected && (
          <div className="team-member-editor">
            <div className="team-member-editor__identity">
              <span className="member-avatar">{selected.fullName.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span>
              <div><strong>{selected.fullName}</strong><small>{selected.email}</small></div>
            </div>
            <label className="portal-field">
              <span>Workspace role</span>
              <CostivraSelect
                value={role}
                onChange={setRole}
                options={[
                  { value: "viewer", label: "Viewer · read only" },
                  { value: "member", label: "Member · standard work" },
                  { value: "admin", label: "Administrator · settings and team" },
                ]}
              />
            </label>
            <div className="team-member-editor__actions">
              <button className="settings-location-archive" type="button" disabled={busy || selected.id === data.currentUser.id} onClick={remove}>
                <Trash2 size={15} /> Remove workspace access
              </button>
              <div className="portal-form-actions">
                <button className="button button-quiet" type="button" disabled={busy} onClick={() => setSelected(null)}>Cancel</button>
                <button className="button button-primary" type="button" disabled={busy || role === selected.role} onClick={save}>
                  {busy && <LoaderCircle className="spin" size={16} />} {busy ? "Working…" : "Save role"}
                </button>
              </div>
            </div>
          </div>
        )}
      </PortalModal>
    </>
  );
}

function Ask() {
  const { openFullscreen } = useClientAssistant();
  useEffect(() => {
    openFullscreen();
  }, [openFullscreen]);

  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <p className="muted">Opening Ask Costivra in Fullscreen Mode...</p>
    </div>
  );
}

function Settings({
  data,
  run,
  onInvite,
  initialTab = "organization",
}: {
  data: PortalData;
  run: (work: () => Promise<unknown>, success: string) => Promise<void>;
  onInvite: () => void;
  initialTab?: "organization" | "integrations" | "team";
}) {
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState(initialTab);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      await run(
        () =>
          api("/api/portal/settings", {
            method: "PATCH",
            body: {
              name: form.get("name"),
              industry: form.get("industry"),
              timezone: form.get("timezone"),
              currency: form.get("currency"),
              primaryContactName: form.get("primaryContactName"),
              reviewThreshold: form.get("reviewThreshold"),
              settings: {
                weeklyDigest: form.get("weeklyDigest") === "on",
                renewalAlerts: form.get("renewalAlerts") === "on",
              },
            },
          }),
        "Settings saved.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeader
        title="Settings"
        description="Organization profile, alert preferences, and review thresholds."
      />
      <div className="settings-tabs" role="tablist" aria-label="Settings sections">
        <button type="button" role="tab" aria-selected={tab === "organization"} className={tab === "organization" ? "active" : ""} onClick={() => setTab("organization")}>Organization</button>
        <button type="button" role="tab" aria-selected={tab === "integrations"} className={tab === "integrations" ? "active" : ""} onClick={() => setTab("integrations")}>Integrations</button>
        <button type="button" role="tab" aria-selected={tab === "team"} className={tab === "team" ? "active" : ""} onClick={() => setTab("team")}>Team & approvals</button>
      </div>
      {tab === "organization" && <>
      <form className="portal-panel settings-form" onSubmit={submit}>
        <div className="form-grid">
          <Field
            label="Organization name"
            name="name"
            defaultValue={data.organization.name}
          />
          <Field
            label="Industry"
            name="industry"
            defaultValue={data.organization.industry ?? ""}
          />
          <Field
            label="Primary contact"
            name="primaryContactName"
            defaultValue={data.organization.primaryContactName ?? ""}
          />
          <Field
            label="Review threshold"
            name="reviewThreshold"
            type="number"
            defaultValue={String(data.organization.reviewThreshold)}
          />
          <Field
            label="Timezone"
            name="timezone"
            defaultValue={data.organization.timezone}
          />
          <Field
            label="Currency"
            name="currency"
            defaultValue={data.organization.currency}
          />
        </div>
        <div className="preference-list">
          <label>
            <span>
              <strong>Weekly operating digest</strong>
              <small>
                Summarize new findings, approvals, and upcoming renewals.
              </small>
            </span>
            <input
              type="checkbox"
              name="weeklyDigest"
              defaultChecked={Boolean(data.organization.settings.weeklyDigest)}
            />
          </label>
          <label>
            <span>
              <strong>Renewal alerts</strong>
              <small>
                Notify the team before contract notice windows close.
              </small>
            </span>
            <input
              type="checkbox"
              name="renewalAlerts"
              defaultChecked={Boolean(data.organization.settings.renewalAlerts)}
            />
          </label>
        </div>
        <div className="portal-form-actions">
          <button className="button button-primary" disabled={busy}>
            {busy ? "Saving…" : "Save settings"}
          </button>
        </div>
      </form>
      <LocationManager data={data} run={run} />
      {["owner", "admin"].includes(data.currentUser.role) && (
        <section className="portal-panel settings-data-export">
          <div>
            <span>Data portability</span>
            <h2>Workspace export</h2>
            <p>Download the structured records, evidence references, decisions, and audit history available to your organization. Private source-file bytes are not bundled into this export.</p>
          </div>
          <a className="button button-secondary" href="/api/portal/export" download>
            <Download size={16} /> Download JSON
          </a>
        </section>
      )}
      </>}
      {tab === "integrations" && <div className="settings-tab-panel"><Integrations data={data} run={run} embedded /></div>}
      {tab === "team" && <div className="settings-tab-panel"><Team data={data} onInvite={onInvite} run={run} embedded /><ApprovalPolicyManager data={data} run={run} /></div>}
    </>
  );
}

function ApprovalPolicyManager({
  data,
  run,
}: {
  data: PortalData;
  run: (work: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const canManage = ["owner", "admin"].includes(data.currentUser.role);
  const availableApprovers = data.team.filter((member) =>
    ["owner", "admin"].includes(member.role),
  ).length;
  const [selected, setSelected] = useState<PortalApprovalPolicy | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const policy = selected && selected !== "new" ? selected : null;
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      await run(
        () => api(
          policy ? `/api/portal/approval-policies/${policy.id}` : "/api/portal/approval-policies",
          {
            method: policy ? "PATCH" : "POST",
            body: {
              name: form.get("name"),
              actionType: form.get("actionType"),
              minimumApprovers: form.get("minimumApprovers"),
              annualValueThreshold: form.get("annualValueThreshold"),
              category: form.get("category"),
              explicitConsent: form.get("explicitConsent") === "on",
              isActive: form.get("isActive") === "on",
            },
          },
        ),
        policy ? "Approval policy updated." : "Approval policy added.",
      );
      setSelected(null);
    } finally {
      setBusy(false);
    }
  };
  const disable = async () => {
    if (!policy) return;
    setBusy(true);
    try {
      await run(
        () => api(`/api/portal/approval-policies/${policy.id}`, { method: "DELETE" }),
        "Approval policy disabled. Existing decisions keep their history.",
      );
      setSelected(null);
    } finally {
      setBusy(false);
    }
  };
  return <>
    <section className="portal-panel approval-policy-panel">
      <header className="settings-section-header">
        <div>
          <span>Decision authority</span>
          <h2>Approval policies</h2>
          <p>Choose which consequential actions need one or more people before work can begin.</p>
        </div>
        {canManage && <button className="button button-secondary" type="button" onClick={() => setSelected("new")}><Plus size={16} /> Add policy</button>}
      </header>
      <div className="approval-policy-safety">
        <ShieldCheck size={17} />
        <div><strong>Costivra never changes bank or payment details.</strong><span>External communication and account changes remain approval-gated and attributable.</span></div>
      </div>
      {data.approvalPolicies.length ? <div className="approval-policy-list">
        {data.approvalPolicies.map((item) => <article key={item.id} className={!item.isActive ? "is-inactive" : ""}>
          <div className="approval-policy-identity">
            <span className="approval-policy-icon"><ShieldCheck size={17} /></span>
            <div><strong>{item.name}</strong><small>{approvalActionLabel(item.actionType as Parameters<typeof approvalActionLabel>[0])}</small></div>
          </div>
          <div className="approval-policy-facts">
            <span>{item.minimumApprovers} approver{item.minimumApprovers === 1 ? "" : "s"}</span>
            {item.annualValueThreshold !== null && <span>{money(item.annualValueThreshold)} or more</span>}
            {item.category && <span>{item.category}</span>}
            {item.explicitConsent && <span>Explicit consent</span>}
          </div>
          {item.isActive && item.minimumApprovers > availableApprovers && <span className="approval-policy-gap">Add {item.minimumApprovers - availableApprovers} administrator{item.minimumApprovers - availableApprovers === 1 ? "" : "s"}</span>}
          <Status value={item.isActive ? "active" : "inactive"} />
          {canManage && <button className="icon-button" type="button" aria-label={`Edit ${item.name}`} onClick={() => setSelected(item)}><Pencil size={15} /></button>}
        </article>)}
      </div> : <Empty title="No approval policies" copy="Add a policy before Costivra prepares consequential work." />}
    </section>
    <PortalModal open={selected !== null} title={policy ? "Edit approval policy" : "Add approval policy"} description="The strictest matching active policy controls each new action." onClose={() => !busy && setSelected(null)}>
      {selected && <form key={policy?.id ?? "new"} onSubmit={submit}>
        <div className="form-grid">
          <Field label="Policy name" name="name" defaultValue={policy?.name ?? ""} />
          <SelectField label="Action type" name="actionType" defaultValue={policy?.actionType ?? "all"} options={[
            { value: "all", label: "All consequential actions" },
            { value: "review_vendor_cost", label: "Vendor cost review" },
            { value: "external_email", label: "External email" },
            { value: "account_change", label: "Vendor account change" },
            { value: "contract_cancellation", label: "Contract cancellation" },
            { value: "prepare_energy_review", label: "Energy review preparation" },
            { value: "expert_handoff", label: "Expert handoff" },
          ]} />
          <SelectField label="Required approvers" name="minimumApprovers" defaultValue={String(policy?.minimumApprovers ?? 1)} options={[1,2,3,4,5].map((value) => ({ value: String(value), label: `${value} person${value === 1 ? "" : "s"}` }))} />
          <Field label="Annual value threshold" name="annualValueThreshold" type="number" required={false} defaultValue={policy?.annualValueThreshold == null ? "" : String(policy.annualValueThreshold)} />
          <Field label="Category" name="category" required={false} defaultValue={policy?.category ?? ""} />
        </div>
        <div className="preference-list approval-policy-toggles">
          <label><span><strong>Explicit consent</strong><small>Require a deliberate recorded decision for this action.</small></span><input type="checkbox" name="explicitConsent" defaultChecked={policy?.explicitConsent ?? false} /></label>
          <label><span><strong>Policy active</strong><small>Inactive policies remain visible for historical decisions but do not govern new actions.</small></span><input type="checkbox" name="isActive" defaultChecked={policy?.isActive ?? true} /></label>
        </div>
        {policy?.isActive && <button className="settings-location-archive" type="button" disabled={busy} onClick={() => void disable()}><Pause size={15} /> Disable policy</button>}
        <FormActions busy={busy} onCancel={() => setSelected(null)} label={policy ? "Save policy" : "Add policy"} />
      </form>}
    </PortalModal>
  </>;
}

function LocationManager({
  data,
  run,
}: {
  data: PortalData;
  run: (work: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const canManage = ["owner", "admin"].includes(data.currentUser.role);
  const [selected, setSelected] = useState<PortalLocation | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const location = selected === "new" ? null : selected;
  const address = location?.address ?? {};
  const addressLine = (item: PortalLocation) => {
    const parts = [
      item.address?.line1,
      item.address?.city,
      item.address?.state,
      item.address?.postal_code,
    ].filter(Boolean);
    return parts.length ? parts.join(", ") : "Address not added";
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form);
    try {
      await run(
        () => api(
          location ? `/api/portal/locations/${location.id}` : "/api/portal/locations",
          { method: location ? "PATCH" : "POST", body },
        ),
        location ? "Location updated." : "Location added.",
      );
      setSelected(null);
    } finally {
      setBusy(false);
    }
  };
  const archive = async () => {
    if (!location) return;
    setBusy(true);
    try {
      await run(
        () => api(`/api/portal/locations/${location.id}`, { method: "DELETE" }),
        "Location archived. Historical records remain connected.",
      );
      setSelected(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="portal-panel settings-locations">
      <header className="settings-section-header">
        <div>
          <span>Operating footprint</span>
          <h2>Locations</h2>
          <p>Keep bills, contracts, and future comparisons tied to the site they serve.</p>
        </div>
        {canManage && (
          <button className="button button-secondary" type="button" onClick={() => setSelected("new")}>
            <Plus size={16} /> Add location
          </button>
        )}
      </header>
      {data.locations.length ? (
        <div className="settings-location-grid">
          {data.locations.map((item) => (
            <article className={`settings-location-card${item.status === "inactive" ? " is-inactive" : ""}`} key={item.id}>
              <span className="settings-location-icon"><MapPin size={17} /></span>
              <div>
                <strong>{item.name}</strong>
                <small>{addressLine(item)}</small>
              </div>
              <Status value={item.status} />
              {addressLine(item) !== "Address not added" && <a className="settings-location-map-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.name}, ${addressLine(item)}`)}`} target="_blank" rel="noreferrer">Open map</a>}
              {canManage && (
                <button className="icon-button" type="button" onClick={() => setSelected(item)} aria-label={`Edit ${item.name}`}>
                  <Pencil size={15} />
                </button>
              )}
            </article>
          ))}
        </div>
      ) : (
        <Empty title="No locations yet" copy="Add the first office, property, or service location to organize recurring costs." />
      )}
      <PortalModal
        open={selected !== null}
        title={location ? "Edit location" : "Add location"}
        description="Use a recognizable operating name. Archiving preserves historical records."
        onClose={() => !busy && setSelected(null)}
      >
        <form onSubmit={submit}>
          <div className="form-grid">
            <Field label="Location name" name="name" defaultValue={location?.name ?? ""} />
            <SelectField
              label="Status"
              name="status"
              defaultValue={location?.status ?? "active"}
              options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]}
            />
            <Field label="Address line 1" name="line1" defaultValue={address.line1 ?? ""} required={false} />
            <Field label="Address line 2" name="line2" defaultValue={address.line2 ?? ""} required={false} />
            <Field label="City" name="city" defaultValue={address.city ?? ""} required={false} />
            <Field label="State / region" name="state" defaultValue={address.state ?? ""} required={false} />
            <Field label="Postal code" name="postalCode" defaultValue={address.postal_code ?? ""} required={false} />
            <Field label="Country code" name="country" defaultValue={address.country ?? "US"} required={false} />
          </div>
          {location && location.status !== "inactive" && (
            <button className="settings-location-archive" type="button" disabled={busy} onClick={archive}>
              <Trash2 size={15} /> Archive location
            </button>
          )}
          <FormActions busy={busy} onCancel={() => setSelected(null)} label={location ? "Save location" : "Add location"} />
        </form>
      </PortalModal>
    </section>
  );
}

function Toolbar({
  query,
  setQuery,
  placeholder,
}: {
  query: string;
  setQuery: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="portal-toolbar">
      <Search size={17} />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
      />
      {query && (
        <button onClick={() => setQuery("")} aria-label="Clear search">
          <X size={15} />
        </button>
      )}
    </div>
  );
}
function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="portal-field">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
      />
    </label>
  );
}
function SelectField({
  label,
  name,
  options,
  defaultValue,
  required = true,
}: {
  label: string;
  name: string;
  options: SelectOption[];
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="portal-field">
      <span>{label}</span>
      <CostivraSelect
        name={name}
        options={options}
        defaultValue={defaultValue}
        required={required}
      />
    </label>
  );
}
function DateField({
  label,
  name,
  defaultValue,
  required = false,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="portal-field">
      <span>{label}</span>
      <CostivraDatePicker
        name={name}
        defaultValue={defaultValue}
        required={required}
      />
    </label>
  );
}

type VendorDraft = {
  vendorId: string;
  name: string;
  category: string;
  website: string;
  spendAmount: string;
  spendCadence: "monthly" | "annual";
  relationshipStatus: string;
};
const emptyVendorDraft: VendorDraft = {
  vendorId: "",
  name: "",
  category: "",
  website: "",
  spendAmount: "0.00",
  spendCadence: "annual",
  relationshipStatus: "active",
};

function VendorSidePanel({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: PortalData;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [draft, setDraft] = useState<VendorDraft>(emptyVendorDraft);
  useEffect(() => {
    if (!open) return;
    try {
      const saved = sessionStorage.getItem("costivra.vendor-panel.draft");
      if (saved) {
        const restored = { ...emptyVendorDraft, ...JSON.parse(saved) };
        queueMicrotask(() => setDraft(restored));
      }
    } catch {}
  }, [open]);
  useEffect(() => {
    if (!open) return;
    sessionStorage.setItem(
      "costivra.vendor-panel.draft",
      JSON.stringify(draft),
    );
  }, [draft, open]);
  useEffect(() => {
    if (!open) return;
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  const q = draft.name.trim().toLowerCase();
  const suggestions = q ? data.vendorCatalog
    .filter(
      (item) =>
        !data.vendors.some((existing) => existing.id === item.id) &&
        (!q ||
          `${item.name} ${item.category} ${item.website ?? ""} ${item.aliases.join(" ")}`
            .toLowerCase()
            .includes(q)),
    )
    .slice(0, 6) : [];
  const selectVendor = (id: string) => {
    const item = data.vendorCatalog.find((entry) => entry.id === id);
    if (!item) return;
    setDraft((current) => ({
      ...current,
      vendorId: item.id,
      name: item.name,
      category: item.category,
      website: item.website ?? "",
    }));
    setShowSuggestions(false);
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await api("/api/portal/vendors", { body: draft });
      sessionStorage.removeItem("costivra.vendor-panel.draft");
      sessionStorage.removeItem("costivra.vendor-panel.open");
      setDraft(emptyVendorDraft);
      toast.success(
        `${result.name} added.`,
        `Costivra will use the ${draft.spendCadence} amount as the source for annualized spend.`,
      );
      onClose();
      router.push(`/app/vendors/${result.vendorId}`);
      router.refresh();
    } catch (error) {
      toast.error(
        "Vendor wasn’t added",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  return createPortal(
    <aside className="vendor-side-panel" aria-labelledby="vendor-panel-title">
      <header>
        <div>
          <span>New relationship</span>
          <h2 id="vendor-panel-title">Add vendor</h2>
          <p>Your draft stays open while you move around the workspace.</p>
        </div>
        <button
          className="icon-button"
          type="button"
          onClick={onClose}
          aria-label="Close add vendor panel"
        >
          <X size={18} />
        </button>
      </header>
      <form onSubmit={submit}>
        <div className="vendor-panel-scroll">
          <label className="portal-field vendor-combobox">
            <span>Vendor</span>
            <div className="vendor-search-input">
              <Search size={17} />
              <input
                autoFocus
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={showSuggestions}
                aria-controls="vendor-suggestions"
                value={draft.name}
                onFocus={() => setShowSuggestions(true)}
                onChange={(event) => {
                  const name = event.target.value;
                  setDraft((current) => ({
                    ...current,
                    vendorId: "",
                    name,
                    category: current.vendorId ? "" : current.category,
                    website: current.vendorId ? "" : current.website,
                  }));
                  setShowSuggestions(true);
                }}
                placeholder="Search the vendor directory…"
                required
              />
            </div>
            {showSuggestions && q && (
              <div
                className="vendor-suggestions"
                id="vendor-suggestions"
                role="listbox"
              >
                {suggestions.length ? (
                  suggestions.map((item) => (
                    <button
                      type="button"
                      role="option"
                      aria-selected={draft.vendorId === item.id}
                      key={item.id}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectVendor(item.id)}
                    >
                      <CompanyLogo entity="vendor" id={item.id} name={item.name} className="vendor-monogram" />
                      <span>
                        <strong>{item.name}</strong>
                        <small>
                          {item.category} ·{" "}
                          {item.website
                            ? new URL(item.website).hostname.replace(
                                /^www\./,
                                "",
                              )
                            : "Website not recorded"}
                        </small>
                      </span>
                      <ChevronRight size={15} />
                    </button>
                  ))
                ) : (
                  <div className="vendor-custom-option">
                    <strong>Add “{draft.name}” as a custom vendor</strong>
                    <span>
                      Category and website will need to be entered below.
                    </span>
                  </div>
                )}
              </div>
            )}
          </label>
          <div className="vendor-autofill-note">
            <Info size={15} />
            <span>
              {draft.vendorId
                ? "Matched to Costivra’s canonical vendor directory. Category and website came from the verified directory record."
                : "Choose a match to autofill details, or enter a custom vendor."}
            </span>
          </div>
          <div className="vendor-panel-fields">
            <label className="portal-field">
              <span>Category</span>
              <input
                value={draft.category}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
                placeholder="Software, telecom, energy…"
                required
              />
            </label>
            <label className="portal-field">
              <span>Website</span>
              <input
                value={draft.website}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    website: event.target.value,
                  }))
                }
                placeholder="https://vendor.com"
                inputMode="url"
              />
            </label>
            <div className="vendor-spend-row">
              <label className="portal-field">
                <span>
                  {draft.spendCadence === "monthly"
                    ? "Monthly spend"
                    : "Annual spend"}
                </span>
                <div className="money-input">
                  <span>$</span>
                  <input
                    value={draft.spendAmount}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        spendAmount: event.target.value.replace(
                          /[^0-9.,]/g,
                          "",
                        ),
                      }))
                    }
                    onBlur={(event) => {
                      const formatted = formatMoneyInput(event.currentTarget.value);
                      setDraft((current) => ({
                        ...current,
                        spendAmount: formatted,
                      }));
                    }}
                    inputMode="decimal"
                    aria-describedby="spend-help"
                    required
                  />
                </div>
              </label>
              <label className="portal-field">
                <span>Billing cadence</span>
                <select
                  value={draft.spendCadence}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      spendCadence: event.target
                        .value as VendorDraft["spendCadence"],
                    }))
                  }
                >
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                </select>
              </label>
            </div>
            <p id="spend-help" className="field-help">
              {draft.spendCadence === "monthly"
                ? "Costivra multiplies this amount by 12 for annualized spend."
                : "Costivra stores this amount as annualized spend."}
            </p>
            <label className="portal-field">
              <span>Relationship status</span>
              <select
                value={draft.relationshipStatus}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    relationshipStatus: event.target.value,
                  }))
                }
              >
                <option value="active">Active vendor</option>
                <option value="prospect">Prospective vendor</option>
                <option value="inactive">Inactive vendor</option>
                <option value="terminated">Terminated relationship</option>
              </select>
            </label>
          </div>
          <div className="vendor-monitor-note">
            <Building2 size={18} />
            <div>
              <strong>What Costivra will monitor</strong>
              <span>
                Spend records, source documents, contract dates, and
                evidence-backed findings. Costivra will not invent missing
                terms.
              </span>
            </div>
          </div>
        </div>
        <footer>
          <button
            type="button"
            className="button button-quiet"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="button button-primary"
            disabled={busy || !draft.name.trim() || !draft.category.trim()}
          >
            {busy && <LoaderCircle className="spin" size={16} />}{" "}
            {busy ? "Adding…" : "Add vendor"}
          </button>
        </footer>
      </form>
    </aside>,
    document.body,
  );
}

function CreateModals({
  kind,
  setKind,
  data,
  run,
  presetVendor,
}: {
  kind: ModalState;
  setKind: (kind: ModalState) => void;
  data: PortalData;
  run: (work: () => Promise<unknown>, success: string) => Promise<void>;
  presetVendor?: string;
}) {
  const [busy, setBusy] = useState(false);
  const close = () => !busy && setKind(null);
  const selectedVendor = data.vendors.find(
    (v) => v.relationshipId === presetVendor,
  );
  const submit =
    (
      url: string,
      success: string,
      serialize?: (form: FormData) => BodyInit | Record<string, unknown>,
    ) =>
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setBusy(true);
      const form = new FormData(e.currentTarget);
      try {
        await run(
          () =>
            api(url, {
              body: serialize ? serialize(form) : Object.fromEntries(form),
            }),
          success,
        );
        setKind(null);
      } catch {
      } finally {
        setBusy(false);
      }
    };

  const toast = useToast();
  const { openInspector } = useBillInspector();

  async function handleDocumentUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const toastId = toast.info("Analyzing bill...", "Running security scan and extraction...");
    try {
      const res = (await api("/api/portal/documents", { body: form })) as {
        ok?: boolean;
        documentId?: string;
      };
      setKind(null);
      toast.dismiss(toastId);
      if (res?.documentId) {
        const docId = res.documentId;
        toast.show({
          tone: "success",
          title: "Bill Processed",
          message: "Extraction & security scan complete.",
          actionLabel: "View Analysis",
          onActionClick: () => openInspector(docId),
        });
        openInspector(docId);
        await run(() => Promise.resolve(res), "Document received. Check its security and extraction status.");
      } else {
        toast.success("Document received.", "Check its security and extraction status.");
      }
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Upload failed", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PortalModal
        open={kind === "contract"}
        title="Add contract"
        description="Track a signed agreement and its decision dates."
        onClose={close}
      >
        <form onSubmit={submit("/api/portal/contracts", "Contract added.")}>
          <div className="form-grid">
            <SelectField
              label="Vendor"
              name="organizationVendorId"
              options={data.vendors.map((v) => ({
                value: v.relationshipId,
                label: v.name,
              }))}
              defaultValue={presetVendor}
            />
            <Field label="Contract title" name="title" />
            <SelectField
              label="Location"
              name="locationId"
              required={false}
              options={[
                { value: "", label: "All locations / not assigned" },
                ...data.locations.filter((location) => location.status === "active").map((location) => ({ value: location.id, label: location.name })),
              ]}
            />
            <Field
              label="Category"
              name="category"
              defaultValue={selectedVendor?.category}
            />
            <Field label="Annual value" name="annualValue" type="number" />
            <DateField label="Start date" name="startDate" />
            <DateField label="End date" name="endDate" />
            <Field
              label="Notice period (days)"
              name="noticePeriodDays"
              type="number"
              defaultValue="30"
            />
            <Field
              label="Owner"
              name="ownerName"
              defaultValue={data.currentUser.fullName}
              required={false}
            />
          </div>
          <label className="check-field">
            <input type="checkbox" name="autoRenews" /> This agreement renews
            automatically
          </label>
          <FormActions busy={busy} onCancel={close} label="Add contract" />
        </form>
      </PortalModal>
      <PortalModal
        open={kind === "invite"}
        title="Invite team member"
        description="They will receive a secure Supabase invitation email."
        onClose={close}
      >
        <form onSubmit={submit("/api/portal/team", "Invitation sent.")}>
          <div className="form-grid">
            <Field label="Full name" name="fullName" />
            <Field label="Work email" name="email" type="email" />
            <SelectField
              label="Role"
              name="role"
              options={[
                { value: "member", label: "Member" },
                { value: "viewer", label: "Viewer" },
                { value: "admin", label: "Administrator" },
              ]}
            />
          </div>
          <FormActions busy={busy} onCancel={close} label="Send invitation" />
        </form>
      </PortalModal>
      <PortalModal
        open={kind === "upload"}
        title="Upload source document"
        description="PDF, DOCX, or text up to 20 MB. Every file passes a security scan before extraction."
        onClose={close}
      >
        <form onSubmit={handleDocumentUpload}>
          <SelectField
            label="Vendor (optional)"
            name="organizationVendorId"
            options={[
              { value: "", label: "Unassigned" },
              ...data.vendors.map((v) => ({
                value: v.relationshipId,
                label: v.name,
              })),
            ]}
            defaultValue={presetVendor}
            required={false}
          />
          <label className="upload-field">
            <Upload />
            <strong>Choose a source file</strong>
            <span>PDF, DOCX, or TXT · 20 MB maximum</span>
            <input type="file" name="file" accept=".pdf,.docx,.txt" required />
          </label>
          <FormActions
            busy={busy}
            onCancel={close}
            label="Upload and security check"
          />
        </form>
      </PortalModal>
      <PortalModal
        open={kind === "expense"}
        title="Add expense"
        description="Record a normalized recurring charge from a source period."
        onClose={close}
      >
        <form onSubmit={submit("/api/portal/expenses", "Expense added.")}>
          <div className="form-grid">
            <SelectField
              label="Vendor"
              name="organizationVendorId"
              options={data.vendors.map((v) => ({
                value: v.relationshipId,
                label: v.name,
              }))}
              defaultValue={presetVendor}
            />
            <Field
              label="Category"
              name="category"
              defaultValue={selectedVendor?.category}
            />
            <SelectField
              label="Location"
              name="locationId"
              required={false}
              options={[
                { value: "", label: "All locations / not assigned" },
                ...data.locations.filter((location) => location.status === "active").map((location) => ({ value: location.id, label: location.name })),
              ]}
            />
            <DateField
              label="Period start"
              name="periodStart"
              required={true}
            />
            <DateField label="Period end" name="periodEnd" required={true} />
            <Field label="Amount" name="amount" type="number" />
            <Field
              label="Prior period amount"
              name="priorPeriodAmount"
              type="number"
              required={false}
            />
          </div>
          <FormActions busy={busy} onCancel={close} label="Add expense" />
        </form>
      </PortalModal>
      <PortalModal
        open={kind === "monitor"}
        title={`Monitor ${selectedVendor?.name ?? "vendor"}`}
        description="Set up automatic bill forwarding or manual forwarding rules for this vendor."
        onClose={close}
      >
        <form onSubmit={submit(`/api/portal/vendors/${selectedVendor?.relationshipId ?? ""}/monitoring`, "Vendor monitoring updated.")}>
          <div className="form-grid">
            <Field
              label="Approved forwarding email sender"
              name="approvedForwardingEmail"
              defaultValue={selectedVendor?.approvedForwardingEmail || data.currentUser.email}
              required={true}
            />
            <SelectField
              label="Forwarding method"
              name="sourceMethod"
              options={[
                { value: "email_forwarding", label: "Automatic Email Rule (Gmail / Outlook)" },
                { value: "manual_forwarding", label: "Manual Forwarding per Invoice" },
                { value: "manual_upload", label: "Manual File Upload" },
              ]}
            />
          </div>
          <div style={{ background: "var(--bg-subtle, #f8fafc)", padding: 14, borderRadius: 8, marginTop: 14, border: "1px solid var(--border-color, #e2e8f0)" }}>
            <strong style={{ fontSize: "0.85rem", display: "block", marginBottom: 6 }}>Your Private Intake Address:</strong>
            <code style={{ fontSize: "0.85rem", background: "rgba(0,0,0,0.06)", padding: "4px 8px", borderRadius: 4, display: "inline-block" }}>
              inbox-{data.organization.id.slice(0, 8)}@costivra.ai
            </code>
            <p className="muted" style={{ fontSize: "0.78rem", margin: "8px 0 0" }}>
              Set up a forwarding rule in Gmail or Outlook from <strong>{selectedVendor?.name ?? "this vendor"}</strong> to your private intake address.
            </p>
          </div>
          <p className="muted" style={{ fontSize: "0.78rem", marginTop: 12, display: "flex", gap: 6, alignItems: "center" }}>
            <ShieldCheck size={14} style={{ color: "#002FA7" }} /> Costivra receives only messages sent to your private workspace address.
          </p>
          <FormActions busy={busy} onCancel={close} label="Save monitoring rule" />
        </form>
      </PortalModal>
    </>
  );
}
