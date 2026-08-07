"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  FormEvent,
  ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import {
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
  MoreHorizontal,
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
import type { PortalApprovalPolicy, PortalContract, PortalData, PortalInvoice, PortalLocation, PortalTeamMember, PortalVendor } from "@/lib/portal/types";
import { useToast } from "@/components/toast-provider";
import { useBillInspector } from "@/components/bill-inspector-provider";
import { CostivraSelect, SelectOption } from "@/components/ui/costivra-select";
import { CostivraDatePicker } from "@/components/ui/costivra-date-picker";
import { formatMoneyInput } from "@/lib/vendors/spend";
import { PortalRecordDetail } from "@/components/portal-record-detail";
import { CompanyLogo } from "@/components/company-logo";
import { GlobalBackControl, useNavigationLabel } from "@/components/navigation-history";
import { RecordFilesWorkspace } from "@/components/record-files-workspace";
import { actionOperationConfirmation } from "@/lib/portal/workflow-copy";
import { approvalActionLabel } from "@/lib/portal/approval-policies";
import { getMonitoringStateLabel, getDynamicPrimaryAction, type MonitoringState, type VendorMonitoringRecord } from "@/lib/vendors/monitoring";
import { useClientAssistant } from "@/components/client-assistant/client-assistant-provider";
import { DocumentUploadExperience } from "@/components/document-upload-experience";
import type { DocumentUploadCompletion } from "@/lib/documents/client-upload";
import { getUploadToastNotice } from "@/lib/documents/upload-notifications";
import { RecordOverflowMenu } from "@/components/records/record-overflow-menu";
import { EditRecordSheet } from "@/components/records/edit-record-sheet";
import { RecordDangerDialog, DependencyPreview } from "@/components/records/record-danger-dialog";
import { RecordChangeHistory, type AuditHistoryItem } from "@/components/records/record-change-history";
import { recordDraftChanged } from "@/lib/records/draft-state";
import { opportunityTrustLabel } from "@/lib/domain/opportunity-trust";
import { getPlainLanguageReviewReasons, resolveBillsView } from "@/lib/portal/bills-workspace";
import {
  actionAssignedToUser,
  actionIsCompleted,
  actionIsInProgress,
  actionNeedsApproval,
  contractNeedsDetails,
  findingHasEvidence,
  findingIsDismissed,
  findingNeedsEvidence,
  findingNeedsReview,
  isExpiredContract,
  isUpcomingContract,
  resolveActionView,
  resolveContractView,
  resolveFindingView,
  resolveResultsView,
  resultIsInProgress,
  resultIsVerified,
} from "@/lib/portal/workflow-workspaces";

type ModalState = null | "expense" | "contract" | "invite" | "upload" | "monitor";

type ApiOptions = {
  method?: string;
  body?: BodyInit | Record<string, unknown>;
};
const vendorTabIds = new Set(["overview", "accounts", "bills", "contracts", "findings", "activity"]);

function resolveVendorTab(requestedTab: string | null): string {
  if (!requestedTab) return "overview";
  if (vendorTabIds.has(requestedTab)) return requestedTab;
  if (requestedTab === "actions" || requestedTab === "results") return "findings";
  if (requestedTab === "files") return "bills";
  if (requestedTab === "monitoring") return "overview";
  if (requestedTab === "history") return "activity";
  return "overview";
}

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

function Empty({ title, copy, action }: { title: string; copy: string; action?: ReactNode }) {
  return (
    <div className="portal-empty">
      <FileText size={24} aria-hidden="true" />
      <strong>{title}</strong>
      <span>{copy}</span>
      {action ? <div style={{ marginTop: 8 }}>{action}</div> : null}
    </div>
  );
}

function Status({ value }: { value: string }) {
  return (
    <span className={`portal-status status-${value}`}>{titleCase(value)}</span>
  );
}

function TrustBadge({ state }: { state: PortalData["opportunities"][number]["trustState"] }) {
  return <span className={`portal-status trust-${state}`}>{opportunityTrustLabel(state)}</span>;
}

function SampleWorkspaceBanner() {
  return (
    <div className="portal-sample-banner" role="note">
      <strong>Sample workspace</strong>
      <span>This workspace contains demonstration records that are not based on your uploaded documents.</span>
    </div>
  );
}

function PortalModal({
  open,
  title,
  description,
  onClose,
  onClosed,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  onClosed?: () => void;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(open);
  const [leaving, setLeaving] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  const closedRef = useRef(onClosed);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    closedRef.current = onClosed;
  }, [onClosed]);
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
          closedRef.current?.();
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
  const detailId = slug?.[1];
  const pageNames: Record<string, string> = {
    home: "Command Center",
    vendors: "Vendors",
    bills: "Bills & Spend",
    contracts: "Contracts",
    findings: "Findings",
    actions: "Actions",
    results: "Results",
    settings: "Settings",
    expenses: "Spend record",
    documents: "Source file",
    opportunities: "Finding",
    savings: "Result",
    reports: "Report",
    integrations: "Integrations",
    team: "Team & approvals",
    ask: "Ask Costivra",
  };
  const detailName = detailId
    ? page === "vendors"
      ? data.vendors.find((item) => item.id === detailId)?.name
      : page === "expenses" || page === "bills"
      ? data.expenses.find((item) => item.id === detailId)?.vendorName ?? data.invoices.find((item) => item.id === detailId)?.invoiceNumber
      : page === "opportunities" || page === "findings"
      ? data.opportunities.find((item) => item.id === detailId)?.title
      : page === "contracts"
      ? data.contracts.find((item) => item.id === detailId)?.title
      : page === "documents"
      ? data.documents.find((item) => item.id === detailId)?.originalFilename ?? data.invoices.find((item) => item.id === detailId)?.invoiceNumber
      : page === "actions"
      ? data.actions.find((item) => item.id === detailId)?.title
      : page === "savings" || page === "results"
      ? data.savings.find((item) => item.id === detailId)?.title
      : undefined
    : undefined;
  const fallbackHref = detailId ? `/app/${page}` : "/app";
  const fallbackLabel = detailId ? pageNames[page] ?? "Command Center" : "Command Center";
  useNavigationLabel(detailName ?? pageNames[page] ?? "Command Center", fallbackHref, fallbackLabel);
  const [modal, setModal] = useState<ModalState>(null);
  const [presetVendor, setPresetVendor] = useState<string | undefined>();
  const [vendorPanelOpen, setVendorPanelOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const action = searchParams?.get("action");
  useEffect(() => {
    if (!action || detailId) return;

    let handled = false;
    if (page === "bills" && action === "upload") {
      handled = true;
    } else if (page === "contracts" && action === "add") {
      handled = true;
    } else if (page === "vendors" && action === "add") {
      handled = true;
    }

    if (handled) {
      queueMicrotask(() => {
        if (page === "bills" && action === "upload") {
          setPresetVendor(undefined);
          setModal("upload");
        } else if (page === "contracts" && action === "add") {
          setPresetVendor(undefined);
          setModal("contract");
        } else if (page === "vendors" && action === "add") {
          openVendorPanel();
        }
      });
      router.replace(`/app/${page}`);
    }
  }, [action, detailId, page, router]);
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
    expenses: slug?.[1] ? <PortalRecordDetail data={data} kind="expense" id={slug[1]} /> : <BillsWorkspace data={data} initialView="spend" onUpload={() => openModal("upload")} onAddExpense={() => openModal("expense")} onAddContract={() => openModal("contract")} />,
    documents: (
      slug?.[1] ? (data.invoices.some((item) => item.id === slug[1]) ? <PortalRecordDetail data={data} kind="invoice" id={slug[1]} /> : <PortalRecordDetail data={data} kind="document" id={slug[1]} />) : <BillsWorkspace data={data} initialView="files" onUpload={() => openModal("upload")} onAddExpense={() => openModal("expense")} onAddContract={() => openModal("contract")} />
    ),
    bills: (
      slug?.[1] ? (data.invoices.some((item) => item.id === slug[1]) ? <PortalRecordDetail data={data} kind="invoice" id={slug[1]} /> : <PortalRecordDetail data={data} kind="document" id={slug[1]} />) : <BillsWorkspace data={data} onUpload={() => openModal("upload")} onAddExpense={() => openModal("expense")} onAddContract={() => openModal("contract")} />
    ),
    opportunities: slug?.[1] ? <PortalRecordDetail data={data} kind="opportunity" id={slug[1]} /> : <FindingsWorkspace data={data} run={run} />,
    findings: slug?.[1] ? <PortalRecordDetail data={data} kind="opportunity" id={slug[1]} /> : <FindingsWorkspace data={data} run={run} />,
    contracts: slug?.[1] ? <PortalRecordDetail data={data} kind="contract" id={slug[1]} /> : <Contracts data={data} onAdd={() => openModal("contract")} />,
    actions: slug?.[1] ? <PortalRecordDetail data={data} kind="action" id={slug[1]} /> : <Actions data={data} run={run} />,
    savings: slug?.[1] ? <PortalRecordDetail data={data} kind="savings" id={slug[1]} /> : <ResultsWorkspace data={data} />,
    results: slug?.[1] ? <PortalRecordDetail data={data} kind="savings" id={slug[1]} /> : <ResultsWorkspace data={data} />,
    vendors: slug?.[1] ? (
      <VendorDetail data={data} vendorId={slug[1]} onAdd={openVendorModal} />
    ) : (
      <Vendors data={data} onAdd={openVendorPanel} />
    ),
    integrations: <Settings data={data} run={run} onInvite={() => openModal("invite")} initialTab="integrations" />,
    reports: <ResultsWorkspace data={data} initialView="reports" />,
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
        {data.organization.isSampleWorkspace && <SampleWorkspaceBanner />}
        {page !== "home" && !detailId && <GlobalBackControl className="app-global-back" />}
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
                href={`/app/findings#${item.id}`}
                className="portal-list-row"
                key={item.id}
              >
                <span className={`priority-dot priority-${item.priority}`} />
                <div className="grow">
                  <strong>{item.title}</strong>
                  <span>
                    {item.vendorName} · {opportunityTrustLabel(item.trustState)} · {item.evidenceCount} evidence reference
                    {item.evidenceCount === 1 ? "" : "s"}
                  </span>
                </div>
                {item.monetaryClaimAllowed && item.estimatedAnnualValue != null ? <strong className="money-value">{money(item.estimatedAnnualValue, true)}</strong> : <span className="money-value">Value not shown</span>}
                <TrustBadge state={item.trustState} />
                <Status value={item.status} />
              </a>
            ))}
          </div>
        ) : (
          <Empty
            title="No findings yet"
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

function displayPeriod(start: string | null, end: string | null) {
  if (!start && !end) return "Not recorded";
  if (start && end) return `${date(start)} – ${date(end)}`;
  return date(start ?? end);
}

function matchesWorkspaceQuery(value: string, query: string) {
  return value.toLowerCase().includes(query.trim().toLowerCase());
}

function matchesDateRange(value: string | null, from: string, to: string) {
  if (!from && !to) return true;
  if (!value) return false;
  const day = value.slice(0, 10);
  return (!from || day >= from) && (!to || day <= to);
}

function matchesAmountRange(value: number | null, minimum: number, maximum: number) {
  if (!Number.isFinite(minimum) && !Number.isFinite(maximum)) return true;
  if (value == null) return false;
  return (!Number.isFinite(minimum) || value >= minimum) && (!Number.isFinite(maximum) || value <= maximum);
}

function BillsWorkspace({
  data,
  initialView,
  onUpload,
  onAddExpense,
  onAddContract,
}: {
  data: PortalData;
  initialView?: "review" | "all" | "spend" | "files";
  onUpload: () => void;
  onAddExpense: () => void;
  onAddContract: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const canWrite = data.currentUser.role !== "viewer";

  const requestedView = searchParams?.get("view");
  const query = searchParams?.get("q") ?? "";
  const selectedVendorId = searchParams?.get("vendor") ?? "all";
  const selectedAccountId = searchParams?.get("account") ?? "all";
  const selectedLocationId = searchParams?.get("location") ?? "all";
  const selectedStatus = searchParams?.get("status") ?? "all";
  const dateFrom = searchParams?.get("from") ?? "";
  const dateTo = searchParams?.get("to") ?? "";
  const amountMinimum = searchParams?.get("min") ? Number(searchParams.get("min")) : Number.NEGATIVE_INFINITY;
  const amountMaximum = searchParams?.get("max") ? Number(searchParams.get("max")) : Number.POSITIVE_INFINITY;
  const selectedDocumentType = searchParams?.get("type") ?? "all";

  const updateParams = (updates: Record<string, string | null>, history: "push" | "replace" = "replace") => {
    const next = new URLSearchParams(searchParams?.toString() ?? "");
    for (const [key, value] of Object.entries(updates)) {
      if (value == null || value === "") next.delete(key);
      else next.set(key, value);
    }
    const nextUrl = next.toString() ? `/app/bills?${next.toString()}` : "/app/bills";
    if (history === "push") router.push(nextUrl);
    else router.replace(nextUrl);
  };

  const documentMap = useMemo(() => new Map(data.documents.map((d) => [d.id, d])), [data.documents]);
  const invoiceByDocumentId = useMemo(() => new Map(data.invoices.map((invoice) => [invoice.documentId, invoice])), [data.invoices]);

  const reviewInvoices = data.invoices.filter(
    (i) =>
      i.reviewStatus === "needs_review" ||
      i.vendorMatchStatus !== "exact" ||
      i.workspaceCustomerMatchStatus !== "matched" ||
      i.expenseAccountMatchStatus !== "matched" ||
      i.serviceLocationMatchStatus !== "matched" ||
      i.reconciliationStatus !== "reconciled" ||
      ["failed", "needs_review"].includes(documentMap.get(i.documentId)?.extractionStatus ?? "") ||
      ["quarantined", "scanning", "pending"].includes(documentMap.get(i.documentId)?.securityStatus ?? "")
  );

  const defaultView = initialView ?? (reviewInvoices.length > 0 ? "review" : "all");
  const activeView = resolveBillsView(requestedView, defaultView);
  const [overflowOpen, setOverflowOpen] = useState(false);

  const handleTabChange = (view: string) => {
    updateParams({ view }, "push");
  };

  const handleExportList = () => {
    const header = "Invoice Number,Vendor,Date,Amount,Status\n";
    const rowsStr = data.invoices
      .map((i) => `"${i.invoiceNumber ?? ""}","${i.vendorName}","${i.invoiceDate ?? ""}","${i.totalAmount ?? 0}","${i.reviewStatus}"`)
      .join("\n");
    const blob = new Blob([header + rowsStr], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `costivra_bills_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Bill list exported as CSV.");
  };

  const matchesInvoiceFilters = (inv: PortalInvoice, requireReview = false) => {
    const doc = documentMap.get(inv.documentId);
    const matchesVendor = selectedVendorId === "all" || inv.vendorId === selectedVendorId;
    const matchesAccount = selectedAccountId === "all" || inv.expenseAccountId === selectedAccountId;
    const matchesLocation = selectedLocationId === "all" || inv.locationId === selectedLocationId;
    const matchesStatus = selectedStatus === "all" || inv.reviewStatus === selectedStatus;
    const matchesType = selectedDocumentType === "all" || doc?.documentType === selectedDocumentType;
    const matchesText = matchesWorkspaceQuery(`${inv.invoiceNumber ?? ""} ${inv.vendorName} ${inv.expenseCategory ?? ""} ${inv.locationName ?? ""}`, query);
    const matchesDate = matchesDateRange(inv.servicePeriodEnd ?? inv.invoiceDate, dateFrom, dateTo);
    const matchesAmount = matchesAmountRange(inv.amountDue ?? inv.totalAmount, amountMinimum, amountMaximum);
    return matchesVendor && matchesAccount && matchesLocation && matchesStatus && matchesType && matchesText && matchesDate && matchesAmount && (!requireReview || reviewInvoices.includes(inv));
  };

  const filteredReviewInvoices = reviewInvoices.filter((inv) => matchesInvoiceFilters(inv, true));
  const filteredAllInvoices = data.invoices.filter((inv) => matchesInvoiceFilters(inv));
  const filteredExpenses = data.expenses.filter((exp) => {
    const doc = exp.documentId ? documentMap.get(exp.documentId) : undefined;
    const invoice = exp.invoiceId ? data.invoices.find((item) => item.id === exp.invoiceId) : exp.documentId ? invoiceByDocumentId.get(exp.documentId) : undefined;
    const matchesVendor = selectedVendorId === "all" || exp.vendorId === selectedVendorId;
    const matchesAccount = selectedAccountId === "all" || exp.expenseAccountId === selectedAccountId;
    const matchesLocation = selectedLocationId === "all" || exp.locationId === selectedLocationId;
    const matchesStatus = selectedStatus === "all" || exp.status === selectedStatus;
    const matchesType = selectedDocumentType === "all" || doc?.documentType === selectedDocumentType;
    const matchesText = matchesWorkspaceQuery(`${exp.vendorName} ${exp.category} ${exp.locationName ?? ""}`, query);
    const matchesDate = matchesDateRange(exp.periodEnd, dateFrom, dateTo);
    const matchesAmount = matchesAmountRange(exp.amount, amountMinimum, amountMaximum);
    const matchesInvoiceContext = !invoice || selectedVendorId === "all" || invoice.vendorId === selectedVendorId;
    return matchesVendor && matchesAccount && matchesLocation && matchesStatus && matchesType && matchesText && matchesDate && matchesAmount && matchesInvoiceContext;
  });

  const filteredDocuments = data.documents.filter((doc) => {
    const invoice = invoiceByDocumentId.get(doc.id);
    const matchesVendor = selectedVendorId === "all" || doc.vendorId === selectedVendorId;
    const matchesAccount = selectedAccountId === "all" || invoice?.expenseAccountId === selectedAccountId;
    const matchesLocation = selectedLocationId === "all" || invoice?.locationId === selectedLocationId;
    const matchesStatus = selectedStatus === "all" || doc.status === selectedStatus || doc.extractionStatus === selectedStatus || doc.securityStatus === selectedStatus;
    const matchesType = selectedDocumentType === "all" || doc.documentType === selectedDocumentType;
    const matchesText = matchesWorkspaceQuery(`${doc.originalFilename} ${doc.vendorName} ${doc.summary ?? ""}`, query);
    const matchesDate = matchesDateRange(doc.createdAt, dateFrom, dateTo);
    const matchesAmount = matchesAmountRange(invoice?.amountDue ?? invoice?.totalAmount ?? null, amountMinimum, amountMaximum);
    return matchesVendor && matchesAccount && matchesLocation && matchesStatus && matchesType && matchesText && matchesDate && matchesAmount;
  });

  const statusOptions = Array.from(new Set([
    ...data.invoices.map((invoice) => invoice.reviewStatus),
    ...data.expenses.map((expense) => expense.status),
    ...data.documents.flatMap((document) => [document.status, document.extractionStatus, document.securityStatus]),
  ].filter(Boolean))).sort();
  const documentTypeOptions = Array.from(new Set(data.documents.map((document) => document.documentType).filter((value): value is string => Boolean(value)))).sort();
  const hasFilters = Boolean(query || selectedVendorId !== "all" || selectedAccountId !== "all" || selectedLocationId !== "all" || selectedStatus !== "all" || dateFrom || dateTo || searchParams?.get("min") || searchParams?.get("max") || selectedDocumentType !== "all");
  const clearFilters = () => updateParams({ q: null, vendor: null, account: null, location: null, status: null, from: null, to: null, min: null, max: null, type: null });

  const tabs = [
    { id: "review", label: "Needs Review", count: reviewInvoices.length },
    { id: "all", label: "All Bills", count: data.invoices.length },
    { id: "spend", label: "Spend", count: data.expenses.length },
    { id: "files", label: "Source Files", count: data.documents.length },
  ];

  return (
    <>
      <PageHeader
        title="Bills & Spend"
        description="Upload, review, track, and prove operating expenses across all vendor relationships."
        action={
          <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
            {canWrite && (
              <button type="button" className="button button-primary" onClick={onUpload}>
                <Upload size={16} /> Upload bill or document
              </button>
            )}
            <button
              type="button"
              className="button button-quiet"
              onClick={() => setOverflowOpen(!overflowOpen)}
              style={{ padding: "8px 12px" }}
              aria-label="More actions"
            >
              <MoreHorizontal size={16} />
            </button>
            {overflowOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: 4,
                  width: 200,
                  background: "var(--card-bg, #ffffff)",
                  border: "1px solid rgba(30, 41, 59, 0.12)",
                  borderRadius: 12,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                  zIndex: 50,
                  padding: "6px 0",
                }}
              >
                {canWrite && (
                  <button
                    type="button"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                      padding: "8px 14px",
                      border: "none",
                      background: "none",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                    }}
                    onClick={() => {
                      setOverflowOpen(false);
                      onAddExpense();
                    }}
                  >
                    <Plus size={14} /> Add spend manually
                  </button>
                )}
                {canWrite && (
                  <button
                    type="button"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                      padding: "8px 14px",
                      border: "none",
                      background: "none",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                    }}
                    onClick={() => {
                      setOverflowOpen(false);
                      onAddContract();
                    }}
                  >
                    <FileText size={14} /> Upload contract
                  </button>
                )}
                <button
                  type="button"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "8px 14px",
                    border: "none",
                    background: "none",
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                  }}
                  onClick={() => {
                    setOverflowOpen(false);
                    handleExportList();
                  }}
                >
                  <Download size={14} /> Export bill list
                </button>
              </div>
            )}
          </div>
        }
      />

      <div className="portal-tab-bar" style={{ marginBottom: 16 }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`portal-tab ${activeView === tab.id ? "is-active" : ""}`}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                style={{
                  fontSize: "0.74rem",
                  padding: "1px 6px",
                  borderRadius: 10,
                  background:
                    tab.id === "review" && tab.count > 0
                      ? "rgba(245, 158, 11, 0.15)"
                      : "rgba(30, 41, 59, 0.06)",
                  color: tab.id === "review" && tab.count > 0 ? "#b45309" : "inherit",
                  fontWeight: 600,
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <Toolbar query={query} setQuery={(value) => updateParams({ q: value || null })} placeholder="Search bills, vendors, invoice #s, or files..." />
        </div>
        {hasFilters && <button type="button" className="button button-quiet button-sm" onClick={clearFilters}>Clear filters</button>}
      </div>

      <div className="bills-filter-grid" aria-label="Bills and spend filters">
        <label><span>Vendor</span><select value={selectedVendorId} onChange={(event) => updateParams({ vendor: event.target.value === "all" ? null : event.target.value })}><option value="all">All vendors</option>{data.vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select></label>
        <label><span>Account</span><select value={selectedAccountId} onChange={(event) => updateParams({ account: event.target.value === "all" ? null : event.target.value })}><option value="all">All accounts</option>{data.expenseAccounts.map((account) => <option key={account.id} value={account.id}>{account.accountName ?? account.accountNumberLast4 ? `${account.accountName ?? "Account"}${account.accountNumberLast4 ? ` · …${account.accountNumberLast4}` : ""}` : "Vendor account"}</option>)}</select></label>
        <label><span>Location</span><select value={selectedLocationId} onChange={(event) => updateParams({ location: event.target.value === "all" ? null : event.target.value })}><option value="all">All locations</option>{data.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
        <label><span>Status</span><select value={selectedStatus} onChange={(event) => updateParams({ status: event.target.value === "all" ? null : event.target.value })}><option value="all">All statuses</option>{statusOptions.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}</select></label>
        <label><span>From</span><input type="date" value={dateFrom} onChange={(event) => updateParams({ from: event.target.value || null })} /></label>
        <label><span>To</span><input type="date" value={dateTo} onChange={(event) => updateParams({ to: event.target.value || null })} /></label>
        <label><span>Minimum amount</span><input type="number" min="0" step="0.01" value={searchParams?.get("min") ?? ""} onChange={(event) => updateParams({ min: event.target.value || null })} placeholder="Any" /></label>
        <label><span>Maximum amount</span><input type="number" min="0" step="0.01" value={searchParams?.get("max") ?? ""} onChange={(event) => updateParams({ max: event.target.value || null })} placeholder="Any" /></label>
        <label><span>Document type</span><select value={selectedDocumentType} onChange={(event) => updateParams({ type: event.target.value === "all" ? null : event.target.value })}><option value="all">All document types</option>{documentTypeOptions.map((type) => <option key={type} value={type}>{titleCase(type)}</option>)}</select></label>
      </div>

      {activeView === "review" && (
        <section className="portal-panel">
          {filteredReviewInvoices.length ? (
            <div className="portal-list">
              {filteredReviewInvoices.map((inv) => {
                const doc = documentMap.get(inv.documentId);
                const reasons = getPlainLanguageReviewReasons(inv, doc?.status);
                return (
                  <div key={inv.id} className="portal-list-row">
                    <div className="grow">
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <strong>{inv.invoiceNumber ?? "Bill without invoice #"}</strong>
                        {inv.vendorId && (
                          <Link
                            className="record-link"
                            href={`/app/vendors/${inv.vendorId}`}
                            title={`Open ${inv.vendorName} workspace`}
                            style={{ fontSize: "0.85rem" }}
                          >
                            Open {inv.vendorName} workspace →
                          </Link>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: "0.82rem",
                          color: "var(--assistant-muted, #64748b)",
                          marginTop: 4,
                          display: "flex",
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <span>Billing period: {displayPeriod(inv.servicePeriodStart, inv.servicePeriodEnd)}</span>
                        <span>Current charges: {inv.currentCharges != null ? money(inv.currentCharges) : "Not recorded"}</span>
                        <span>Amount due: {inv.amountDue != null ? money(inv.amountDue) : "Not recorded"}</span>
                        <span>Due: {date(inv.dueDate)}</span>
                        <span>Account: {inv.accountNumberLast4 ? `...${inv.accountNumberLast4}` : "Unassigned"}</span>
                        <span>Location: {inv.locationName ?? "Not assigned"}</span>
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                        {reasons.map((reason, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: "0.74rem",
                              padding: "2px 8px",
                              borderRadius: 10,
                              background: "rgba(245, 158, 11, 0.12)",
                              color: "#b45309",
                              fontWeight: 600,
                            }}
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Link className="button button-quiet button-sm" href={`/app/bills/${inv.id}`}>
                        Review bill <ChevronRight size={14} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Empty title="Nothing needs review" copy="All current bills have cleared the available checks." />
          )}
        </section>
      )}

      {activeView === "all" && (
        <section className="portal-panel">
          {filteredAllInvoices.length ? (
            <div className="table-wrap">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Invoice / Bill</th>
                    <th>Billing Period</th>
                    <th>Current Charges</th>
                    <th>Amount Due</th>
                    <th>Due Date</th>
                    <th>Account</th>
                    <th>Location</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAllInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td>
                        {inv.vendorId ? (
                          <Link
                            className="record-link"
                            href={`/app/vendors/${inv.vendorId}`}
                            title={`Open ${inv.vendorName} workspace`}
                          >
                            <strong>{inv.vendorName}</strong>
                          </Link>
                        ) : (
                          <strong>{inv.vendorName}</strong>
                        )}
                      </td>
                      <td>
                        <Link className="record-link" href={`/app/bills/${inv.id}`}>
                          {inv.invoiceNumber ?? "Bill record"}
                        </Link>
                      </td>
                      <td>{displayPeriod(inv.servicePeriodStart, inv.servicePeriodEnd)}</td>
                      <td><strong>{inv.currentCharges != null ? money(inv.currentCharges) : "Not recorded"}</strong></td>
                      <td><strong>{inv.amountDue != null ? money(inv.amountDue) : "Not recorded"}</strong></td>
                      <td>{date(inv.dueDate)}</td>
                      <td>{inv.accountNumberLast4 ? `...${inv.accountNumberLast4}` : "Not assigned"}</td>
                      <td>{inv.locationName ?? "Not assigned"}</td>
                      <td>
                        <Status value={inv.reviewStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="Upload your first bill"
              copy="Costivra will securely scan it, extract the details, and keep the source file."
              action={
                canWrite ? (
                  <button type="button" className="button button-primary" onClick={onUpload}>
                    <Upload size={14} /> Upload bill
                  </button>
                ) : null
              }
            />
          )}
        </section>
      )}

      {activeView === "spend" && (
        <section className="portal-panel">
          <div className="portal-panel-heading">
            <div>
              <h2>Spend ledger</h2>
              <p>Normalized recurring charges from your connected source bills.</p>
            </div>
          </div>
          {filteredExpenses.length ? (
            <div className="table-wrap">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Category</th>
                    <th>Period</th>
                    <th>Amount</th>
                    <th>Prior Period</th>
                    <th>Source Bill</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((exp) => (
                    <tr key={exp.id}>
                      <td>
                        {exp.vendorId ? (
                          <Link className="record-link" href={`/app/vendors/${exp.vendorId}`}>
                            <strong>{exp.vendorName}</strong>
                          </Link>
                        ) : (
                          <strong>{exp.vendorName}</strong>
                        )}
                      </td>
                      <td>{exp.category}</td>
                      <td>{date(exp.periodEnd)}</td>
                      <td>
                        <strong>{money(exp.amount)}</strong>
                      </td>
                      <td>{exp.priorPeriodAmount != null ? money(exp.priorPeriodAmount) : "—"}</td>
                      <td>
                        {exp.invoiceId || exp.documentId ? (
                          <Link className="record-link" href={`/app/bills/${exp.invoiceId ?? exp.documentId}`}>
                            View source bill →
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <Status value={exp.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="No normalized spend yet" copy="Approved bills will appear here after review." />
          )}
        </section>
      )}

      {activeView === "files" && (
        <section className="portal-panel">
          <div className="portal-panel-heading">
            <div>
              <h2>Original files and supporting documents</h2>
              <p>Private source files and extracted evidence stored securely for auditability.</p>
            </div>
          </div>
          {filteredDocuments.length ? (
            <div className="portal-document-grid">
              {filteredDocuments.map((item) => (
                <article className="document-card" key={item.id}>
                  <div className="document-icon">
                    <FileText />
                  </div>
                  <div className="grow">
                    <h3>
                      <Link className="record-link" href={`/app/bills/${item.id}`}>
                        {item.originalFilename}
                      </Link>
                    </h3>
                    <p>{item.summary || "Source file evidence record."}</p>
                    <span>{item.documentType ? titleCase(item.documentType) : "Document type not recorded"} · {(item.byteSize / 1024).toFixed(1)} KB · Uploaded {date(item.createdAt)}</span>
                    <span className="document-card-meta">Security: {titleCase(item.securityStatus)} · Extraction: {titleCase(item.extractionStatus)} · Evidence: {item.evidenceCount}</span>
                  </div>
                  {item.vendorId ? <Link className="record-link" href={`/app/vendors/${item.vendorId}`}>Open {item.vendorName} workspace</Link> : null}
                  <div className="document-actions">
                    <Status value={item.status} />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Empty
              title="No source files"
              copy="Upload a document or bill to build your document evidence store."
            />
          )}
        </section>
      )}
    </>
  );
}


function FindingsWorkspace({
  data,
  run,
}: {
  data: PortalData;
  run: (work: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams?.get("q") ?? "";
  const requestedView = searchParams?.get("view");
  const updateParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams?.toString() ?? "");
    for (const [key, value] of Object.entries(updates)) {
      if (!value) next.delete(key); else next.set(key, value);
    }
    router.replace(`/app/findings${next.toString() ? `?${next.toString()}` : ""}`);
  };
  const update = (id: string, status: string) =>
    run(
      () =>
        api(`/api/portal/opportunities/${id}`, {
          method: "PATCH",
          body: { status },
        }),
      "Finding updated.",
    );
  const statusOptions = (status: string) => {
    if (status === "open") return [{ value: "open", label: "Open" }, { value: "under_review", label: "Review" }, { value: "declined", label: "Decline" }];
    if (status === "under_review") return [{ value: "under_review", label: "Under review" }, { value: "approved", label: "Approve plan" }, { value: "declined", label: "Decline" }];
    return [{ value: status, label: status.replaceAll("_", " ") }];
  };
  const activeView = resolveFindingView(requestedView);
  const filtered = data.opportunities.filter((finding) => {
    if (query && !`${finding.title} ${finding.vendorName} ${finding.summary} ${finding.category ?? ""}`.toLowerCase().includes(query.toLowerCase())) return false;
    if (activeView === "review") return findingNeedsReview(finding);
    if (activeView === "evidence_backed") return findingHasEvidence(finding);
    if (activeView === "needs_evidence") return findingNeedsEvidence(finding);
    return findingIsDismissed(finding);
  });
  const counts = {
    review: data.opportunities.filter(findingNeedsReview).length,
    evidence_backed: data.opportunities.filter(findingHasEvidence).length,
    needs_evidence: data.opportunities.filter(findingNeedsEvidence).length,
    dismissed: data.opportunities.filter(findingIsDismissed).length,
  };
  return (
    <>
      <PageHeader
        title="Findings"
        description="What Costivra discovered across every vendor, with evidence and limits visible."
      />
      <div className="portal-tab-bar" style={{ marginBottom: 16 }}>
        {([
          ["review", "Needs Review"],
          ["evidence_backed", "Evidence Backed"],
          ["needs_evidence", "Needs Evidence"],
          ["dismissed", "Dismissed"],
        ] as const).map(([id, label]) => (
          <button key={id} type="button" className={`portal-tab ${activeView === id ? "is-active" : ""}`} onClick={() => updateParams({ view: id })}>
            {label} {counts[id] > 0 && <span>{counts[id]}</span>}
          </button>
        ))}
      </div>
      <Toolbar
        query={query}
        setQuery={(value) => updateParams({ q: value || null })}
        placeholder="Search findings or vendors"
      />
      <section className="portal-panel">
        {filtered.map((item) => (
          <div className="portal-list-row workflow-list-row" id={item.id} key={item.id}>
            <div className="grow">
              <strong><Link className="record-link" href={`/app/findings/${item.id}`}>{item.title}</Link></strong>
              <span>{item.vendorName} · {item.expenseAccountReference ?? "Account not assigned"} · {item.locationName ?? "Location not assigned"}</span>
              <small>{item.summary}</small>
            </div>
            <div><span className="table-label">Source bill</span>{(() => {
              const invoice = data.invoices.find((candidate) => candidate.documentId === item.sourceDocumentId);
              const expense = data.expenses.find((candidate) => candidate.id === item.sourceExpenseId);
              const sourceId = invoice?.id ?? expense?.invoiceId ?? expense?.documentId;
              return sourceId ? <Link className="record-link" href={`/app/bills/${sourceId}`}>Open bill</Link> : <span>Not linked</span>;
            })()}</div>
            <div><span className="table-label">Trust</span><TrustBadge state={item.trustState} /></div>
            <div><span className="table-label">Evidence</span>{item.evidenceCount} reference{item.evidenceCount === 1 ? "" : "s"}</div>
            <div><span className="table-label">Potential value</span>{item.monetaryClaimAllowed && item.estimatedAnnualValue != null ? money(item.estimatedAnnualValue) : "Not shown"}</div>
            <Status value={item.status} />
            <CostivraSelect aria-label={`Update ${item.title} status`} value={item.status} variant="badge" size="sm" onChange={(newStatus) => void update(item.id, newStatus)} options={statusOptions(item.status)} />
          </div>
        ))}
        {!filtered.length && (
          <Empty
            title={activeView === "needs_evidence" ? "No findings need evidence" : "No findings match"}
            copy="Try a broader search or upload new source documents."
          />
        )}
      </section>
    </>
  );
}
function Contracts({ data, onAdd }: { data: PortalData; onAdd: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams?.get("q") ?? "";
  const activeView = resolveContractView(searchParams?.get("view"));
  const canWrite = data.currentUser.role !== "viewer";
  const updateParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams?.toString() ?? "");
    for (const [key, value] of Object.entries(updates)) {
      if (!value) next.delete(key); else next.set(key, value);
    }
    router.replace(`/app/contracts${next.toString() ? `?${next.toString()}` : ""}`);
  };
  const rows = data.contracts.filter((contract) => {
    if (query && !`${contract.title} ${contract.vendorName} ${contract.category}`.toLowerCase().includes(query.toLowerCase())) return false;
    if (activeView === "upcoming") return isUpcomingContract(contract);
    if (activeView === "needs_details") return contractNeedsDetails(contract);
    if (activeView === "expired") return isExpiredContract(contract);
    return true;
  });
  const counts = {
    upcoming: data.contracts.filter((contract) => isUpcomingContract(contract)).length,
    all: data.contracts.length,
    needs_details: data.contracts.filter(contractNeedsDetails).length,
    expired: data.contracts.filter((contract) => isExpiredContract(contract)).length,
  };
  return (
    <>
      {data.organization.isSampleWorkspace && (
        <div className="portal-upload-warning" role="note">
          <strong>This bill will be stored beside sample records.</strong>
          <span>Create a clean pilot workspace for customer testing.</span>
        </div>
      )}
      <PageHeader
        title="Contracts & Renewals"
        description="Deadlines, notice periods, auto-renewals, and agreement risk across every vendor."
        action={canWrite ? (
          <button className="button button-primary" onClick={onAdd}>
            <Plus size={16} /> Add contract
          </button>
        ) : null}
      />
      <div className="portal-tab-bar" style={{ marginBottom: 16 }}>
        {([
          ["upcoming", "Upcoming"],
          ["all", "All Contracts"],
          ["needs_details", "Needs Details"],
          ["expired", "Expired"],
        ] as const).map(([id, label]) => (
          <button key={id} type="button" className={`portal-tab ${activeView === id ? "is-active" : ""}`} onClick={() => updateParams({ view: id })}>
            {label} {counts[id] > 0 && <span>{counts[id]}</span>}
          </button>
        ))}
      </div>
      <Toolbar
        query={query}
        setQuery={(value) => updateParams({ q: value || null })}
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
                  <th>Account / location</th>
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
                    <td>{item.vendorId ? <Link className="record-link" href={`/app/vendors/${item.vendorId}`}>{item.vendorName}</Link> : item.vendorName}</td>
                    <td>{item.vendorId && item.expenseAccountId ? <Link className="record-link" href={`/app/vendors/${item.vendorId}?tab=accounts&account=${item.expenseAccountId}`}>{item.locationName ?? "Open account"}</Link> : item.locationName ?? "Not assigned"}</td>
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



function Actions({
  data,
  run,
}: {
  data: PortalData;
  run: (work: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams?.get("q") ?? "";
  const activeView = resolveActionView(searchParams?.get("view"));
  const updateParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams?.toString() ?? "");
    for (const [key, value] of Object.entries(updates)) {
      if (!value) next.delete(key); else next.set(key, value);
    }
    router.replace(`/app/actions${next.toString() ? `?${next.toString()}` : ""}`);
  };
  const execute = (id: string, operation: string) =>
    run(
      () =>
        api(`/api/portal/actions/${id}`, {
          method: "PATCH",
          body: { operation },
        }),
      actionOperationConfirmation(operation),
    );
  const filtered = data.actions.filter((action) => {
    if (query && !`${action.title} ${action.description} ${action.vendorName}`.toLowerCase().includes(query.toLowerCase())) return false;
    if (activeView === "approval") return actionNeedsApproval(action);
    if (activeView === "assigned") return actionAssignedToUser(action);
    if (activeView === "in_progress") return actionIsInProgress(action);
    return actionIsCompleted(action);
  });
  const counts = {
    approval: data.actions.filter(actionNeedsApproval).length,
    assigned: data.actions.filter(actionAssignedToUser).length,
    in_progress: data.actions.filter(actionIsInProgress).length,
    completed: data.actions.filter(actionIsCompleted).length,
  };
  return (
    <>
      <PageHeader
        title="Actions"
        description="Work across all vendor relationships that requires approval, execution, or follow-up, with ownership and evidence attached."
      />
      <div className="portal-tab-bar" style={{ marginBottom: 16 }}>
        {([
          ["approval", "Needs Approval"],
          ["assigned", "Assigned to Me"],
          ["in_progress", "In Progress"],
          ["completed", "Completed"],
        ] as const).map(([id, label]) => (
          <button key={id} type="button" className={`portal-tab ${activeView === id ? "is-active" : ""}`} onClick={() => updateParams({ view: id })}>
            {label} {counts[id] > 0 && <span>{counts[id]}</span>}
          </button>
        ))}
      </div>
      <Toolbar query={query} setQuery={(value) => updateParams({ q: value || null })} placeholder="Search actions, findings, or vendors" />
      <div className="portal-card-grid">
        {filtered.map((item) => {
          const finding = data.opportunities.find((candidate) => candidate.id === item.opportunityId);
          const invoice = finding?.sourceDocumentId ? data.invoices.find((candidate) => candidate.documentId === finding.sourceDocumentId) : undefined;
          const expense = finding?.sourceExpenseId ? data.expenses.find((candidate) => candidate.id === finding.sourceExpenseId) : undefined;
          const sourceId = invoice?.id ?? expense?.invoiceId ?? expense?.documentId;
          return (
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
                <dd>{item.vendorId ? <Link className="record-link" href={`/app/vendors/${item.vendorId}`}>{item.vendorName}</Link> : item.vendorName}</dd>
              </div>
              <div><dt>Finding</dt><dd><Link className="record-link" href={`/app/findings/${item.opportunityId}`}>{finding?.title ?? "Open finding"}</Link></dd></div>
              <div><dt>Source evidence</dt><dd>{sourceId ? <Link className="record-link" href={`/app/bills/${sourceId}`}>Open source bill</Link> : "Not linked"}</dd></div>
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
          );
        })}
        {!filtered.length && (
          <Empty
            title="No actions match"
            copy="Approved findings will appear here as executable work."
          />
        )}
      </div>
    </>
  );
}

function ResultsWorkspace({ data, initialView = "verified" }: { data: PortalData; initialView?: "verified" | "in_progress" | "reports" | "summary" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeView = resolveResultsView(searchParams?.get("view"), initialView);
  const updateView = (view: string) => router.replace(`/app/results?view=${view}`);
  const verified = data.savings.filter(resultIsVerified).reduce((sum, item) => sum + item.amount, 0);
  const inProgress = data.savings.filter(resultIsInProgress);
  const potentialValue = data.opportunities.filter((item) => item.monetaryClaimAllowed && item.estimatedAnnualValue != null).reduce((sum, item) => sum + (item.estimatedAnnualValue ?? 0), 0);
  const actionsInProgress = data.actions.filter(actionIsInProgress).length;
  const renewalsApproaching = data.contracts.filter((contract) => isUpcomingContract(contract)).length;
  return (
    <>
      <PageHeader
        title="Results"
        description="See verified value, work still in progress, and reports across all vendor relationships."
      />
      <div className="portal-tab-bar" style={{ marginBottom: 16 }}>
        {([
          ["verified", "Verified Value"],
          ["in_progress", "In Progress"],
          ["reports", "Reports"],
          ["summary", "Executive Summary"],
        ] as const).map(([id, label]) => (
          <button key={id} type="button" className={`portal-tab ${activeView === id ? "is-active" : ""}`} onClick={() => updateView(id)}>
            {label}
          </button>
        ))}
      </div>
      {activeView === "verified" && <section className="portal-panel">
        <div className="portal-panel-heading"><div><h2>Verified value</h2><p>Only results supported by an accepted method and later source evidence appear here.</p></div><strong className="money-value">{money(verified, true)}</strong></div>
        {data.savings.filter(resultIsVerified).length ? <div className="portal-list">{data.savings.filter(resultIsVerified).map((item) => <div className="portal-list-row savings-workflow-row" key={item.id}><CheckCircle2 /><div className="grow"><Link className="record-link" href={`/app/results/${item.id}`}><strong>{item.title}</strong></Link><span>{item.method} · Verified {date(item.verifiedAt)}</span><small>Baseline {item.baselineAmount == null ? "not recorded" : money(item.baselineAmount)} · Later comparison {item.comparisonAmount == null ? "not recorded" : money(item.comparisonAmount)}</small></div><strong className="money-value">{money(item.amount)}</strong><Status value="verified" /></div>)}</div> : <Empty title="No verified value yet" copy="Verified results will appear after a baseline and later source evidence are reviewed." />}
      </section>}
      {activeView === "in_progress" && <section className="portal-panel">
        <div className="portal-panel-heading"><div><h2>Results in progress</h2><p>These values are not verified yet. Each row shows what evidence is still missing.</p></div></div>
        {inProgress.length ? <div className="portal-list">{inProgress.map((item) => <div className="portal-list-row savings-workflow-row" key={item.id}><CircleDollarSign /><div className="grow"><Link className="record-link" href={`/app/results/${item.id}`}><strong>{item.title}</strong></Link><span>{item.status === "baseline_review" ? "Baseline awaiting acceptance" : item.comparisonAmount == null ? "Awaiting comparison" : "Awaiting verification"}</span><small>Potential result only · Method: {item.method}</small></div><strong className="money-value">{money(item.amount)}</strong><Status value={item.status} /></div>)}</div> : <Empty title="No results in progress" copy="Accepted baselines and pending comparisons will appear here." />}
      </section>}
      {activeView === "reports" && <section className="portal-card-grid">{data.reports.map((item) => <article className="portal-card" key={item.id}><FileText className="card-icon" /><h2>{item.name}</h2><p>{item.description}</p><small>{item.lastGeneratedAt ? `Last generated ${date(item.lastGeneratedAt)}` : "Not generated yet"}</small><footer><a className="button button-primary" href={`/api/portal/reports/${item.id}`}><Download size={16} /> Download report</a></footer></article>)}{!data.reports.length && <Empty title="No reports configured" copy="Report definitions created for this organization will appear here." />}</section>}
      {activeView === "summary" && <>
        <div className="portal-metrics"><Metric label="Recorded spend" value={money(data.vendors.reduce((sum, item) => sum + item.annualizedSpend, 0), true)} note="Annualized vendor relationship records" icon={<ReceiptText />} /><Metric label="Potential value" value={money(potentialValue, true)} note="Rule-based estimate, not verified" icon={<CircleDollarSign />} /><Metric label="Actions in progress" value={String(actionsInProgress)} note="Active work items" icon={<CalendarClock />} /><Metric label="Verified value" value={money(verified, true)} note="Supported by later source evidence" icon={<ShieldCheck />} /></div>
        <section className="portal-panel"><div className="portal-panel-heading"><div><h2>Executive summary</h2><p>A concise operating view across all vendor relationships.</p></div></div><dl className="record-summary-list"><div><dt>Recorded spend</dt><dd>{money(data.vendors.reduce((sum, item) => sum + item.annualizedSpend, 0), true)}</dd></div><div><dt>Potential value</dt><dd>{money(potentialValue, true)} <small>Estimate only</small></dd></div><div><dt>Actions in progress</dt><dd>{actionsInProgress}</dd></div><div><dt>Verified value</dt><dd>{money(verified, true)}</dd></div><div><dt>Renewals approaching</dt><dd>{renewalsApproaching}</dd></div></dl></section>
      </>}
    </>
  );
}

function getVendorAttentionDetails(vendor: PortalVendor, data: PortalData) {
  const reasons: string[] = [];
  const vendorInvoices = data.invoices.filter((i) => i.vendorId === vendor.id);
  const needsReviewCount = vendorInvoices.filter((i) => i.reviewStatus === "needs_review").length;
  if (needsReviewCount > 0) {
    reasons.push(`${needsReviewCount} bill${needsReviewCount > 1 ? "s" : ""} needing review`);
  }

  const rawMonitoringState = vendor.monitoringState ?? "not_set_up";
  const isMonitoringAttention = rawMonitoringState === "attention_needed" || rawMonitoringState === "failing";
  if (isMonitoringAttention) {
    reasons.push("Monitoring attention required");
  }

  const vendorContracts = data.contracts.filter((c) => c.vendorId === vendor.id && c.endDate);
  const now = Date.now();
  const urgentContract = vendorContracts.find((c) => {
    if (!c.endDate) return false;
    const diff = new Date(c.endDate).getTime() - now;
    return diff > 0 && diff <= 60 * 24 * 60 * 60 * 1000;
  });
  if (urgentContract && urgentContract.endDate) {
    reasons.push(`Contract ends ${date(urgentContract.endDate)}`);
  }

  const openFindingsCount = data.opportunities.filter(
    (o) => o.vendorId === vendor.id && !["closed", "declined"].includes(o.status)
  ).length;
  if (openFindingsCount > 0) {
    reasons.push(`${openFindingsCount} open finding${openFindingsCount > 1 ? "s" : ""}`);
  }

  const pendingActionsCount = data.actions.filter(
    (a) => a.vendorId === vendor.id && !["complete", "cancelled"].includes(a.status)
  ).length;
  if (pendingActionsCount > 0) {
    reasons.push(`${pendingActionsCount} pending action${pendingActionsCount > 1 ? "s" : ""}`);
  }

  let attentionScore = 6;
  if (needsReviewCount > 0) attentionScore = 1;
  else if (isMonitoringAttention) attentionScore = 2;
  else if (urgentContract) attentionScore = 3;
  else if (openFindingsCount > 0) attentionScore = 4;
  else if (pendingActionsCount > 0) attentionScore = 5;
  else if (vendor.relationshipStatus === "terminated" || vendor.relationshipStatus === "inactive") attentionScore = 7;

  return { attentionScore, reasons, needsReviewCount, isMonitoringAttention, openFindingsCount, pendingActionsCount };
}

function Vendors({ data, onAdd }: { data: PortalData; onAdd: (kind?: ModalState) => void }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "attention" | "active" | "monitored" | "inactive">("all");
  const canAddVendor = ["owner", "admin", "member"].includes(data.currentUser.role);

  const enrichedVendors = useMemo(() => {
    return data.vendors.map((vendor) => {
      const details = getVendorAttentionDetails(vendor, data);
      const accountsCount = data.expenses.filter((e) => e.vendorId === vendor.id && e.expenseAccountId).length;
      const latestExpense = data.expenses
        .filter((e) => e.vendorId === vendor.id)
        .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))[0];
      const contracts = data.contracts
        .filter((c) => c.vendorId === vendor.id && c.endDate)
        .sort((a, b) => String(a.endDate).localeCompare(String(b.endDate)));
      return {
        vendor,
        details,
        accountsCount,
        latestExpense,
        nextContractEnd: contracts[0]?.endDate ?? null,
      };
    });
  }, [data]);

  const filteredAndSorted = useMemo(() => {
    type EnrichedItem = typeof enrichedVendors[number];
    return enrichedVendors
      .filter(({ vendor, details }: EnrichedItem) => {
        const matchesQuery = `${vendor.name} ${vendor.category} ${vendor.website ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase());
        if (!matchesQuery) return false;

        if (filter === "attention") return details.reasons.length > 0;
        if (filter === "active") return vendor.relationshipStatus === "active";
        if (filter === "monitored") return vendor.monitoringState && vendor.monitoringState !== "not_set_up";
        if (filter === "inactive") return ["inactive", "terminated"].includes(vendor.relationshipStatus);
        return true;
      })
      .sort((a: EnrichedItem, b: EnrichedItem) => {
        if (a.details.attentionScore !== b.details.attentionScore) {
          return a.details.attentionScore - b.details.attentionScore;
        }
        return a.vendor.name.localeCompare(b.vendor.name);
      });
  }, [enrichedVendors, query, filter]);

  return (
    <>
      <PageHeader
        title="Vendors"
        description="Every supplier relationship, its source records, and the next important date."
        action={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {canAddVendor && (
              <button className="button button-primary" onClick={() => onAdd()}>
                <Plus size={16} /> Add vendor
              </button>
            )}
            <button className="button button-quiet" onClick={() => onAdd("upload")}>
              <Upload size={16} /> Upload bill
            </button>
          </div>
        }
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
        <Toolbar
          query={query}
          setQuery={setQuery}
          placeholder="Search vendors, categories, or websites"
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "0.78rem", color: "var(--assistant-muted, #64748b)", fontWeight: 600, marginRight: 4 }}>Filter:</span>
          {(["all", "attention", "active", "monitored", "inactive"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              style={{
                padding: "4px 12px",
                borderRadius: 20,
                fontSize: "0.78rem",
                fontWeight: filter === f ? 600 : 500,
                border: "1px solid",
                borderColor: filter === f ? "var(--assistant-accent, #002FA7)" : "rgba(30, 41, 59, 0.15)",
                background: filter === f ? "rgba(0, 47, 167, 0.08)" : "transparent",
                color: filter === f ? "var(--assistant-accent, #002FA7)" : "var(--assistant-text-secondary, #475569)",
                cursor: "pointer",
              }}
            >
              {f === "all" ? "All" : f === "attention" ? "Needs attention" : f === "active" ? "Active" : f === "monitored" ? "Monitored" : "Inactive"}
            </button>
          ))}
        </div>
      </div>
      <section className="portal-panel vendor-directory">
        {filteredAndSorted.length ? (
          <div className="table-wrap">
            <table className="portal-table vendor-table">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Category</th>
                  <th>Annualized spend</th>
                  <th>Accounts</th>
                  <th>Latest bill</th>
                  <th>Monitoring</th>
                  <th>Attention & Work</th>
                  <th>Next contract end</th>
                  <th>Relationship</th>
                  <th>
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSorted.map(({ vendor, details, accountsCount, latestExpense, nextContractEnd }: typeof enrichedVendors[number]) => {
                  return (
                    <tr key={vendor.id}>
                      <td>
                        <Link
                          className="vendor-name-cell"
                          href={`/app/vendors/${vendor.id}`}
                        >
                          <CompanyLogo entity="vendor" id={vendor.id} name={vendor.name} className="vendor-monogram" />
                          <span>
                            <strong>{vendor.name}</strong>
                            <small>
                              {vendor.website
                                ? new URL(vendor.website).hostname.replace(/^www\./, "")
                                : "Website not recorded"}
                            </small>
                          </span>
                        </Link>
                      </td>
                      <td>{vendor.category}</td>
                      <td>
                        <strong>{money(vendor.annualizedSpend)}</strong>
                      </td>
                      <td>{accountsCount || 1}</td>
                      <td>
                        {latestExpense ? (
                          <div>
                            <strong>{money(latestExpense.amount)}</strong>
                            <small style={{ display: "block", color: "var(--assistant-muted, #64748b)" }}>
                              {date(latestExpense.periodEnd)}
                            </small>
                          </div>
                        ) : (
                          <span style={{ color: "var(--assistant-muted, #64748b)" }}>None recorded</span>
                        )}
                      </td>
                      <td>
                        <Status value={vendor.monitoringState ?? "not_set_up"} />
                      </td>
                      <td>
                        {details.reasons.length ? (
                          <span className="vendor-attention-pill" style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: 12, background: "#fef3c7", color: "#92400e", fontWeight: 600 }}>
                            {details.reasons[0]}
                          </span>
                        ) : (
                          <span style={{ color: "#10b981", fontSize: "0.78rem", fontWeight: 600 }}>Healthy</span>
                        )}
                      </td>
                      <td>{date(nextContractEnd)}</td>
                      <td>
                        <Status value={vendor.relationshipStatus} />
                      </td>
                      <td>
                        <Link
                          className="row-chevron"
                          href={`/app/vendors/${vendor.id}`}
                          aria-label={`Open ${vendor.name}`}
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
            copy="Try a broader search or filter, or add a new vendor relationship."
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
  const searchParams = useSearchParams();
  const toast = useToast();
  const vendor = data.vendors.find((item) => item.id === vendorId);

  const requestedTab = searchParams?.get("tab");
  const requestedAccount = searchParams?.get("account");
  const activeTab = resolveVendorTab(requestedTab);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [dangerDialogOpen, setDangerDialogOpen] = useState(false);
  const [dangerMode, setDangerMode] = useState<"end" | "remove">("end");
  const [deletionPreview, setDeletionPreview] = useState<DependencyPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [auditHistory, setAuditHistory] = useState<AuditHistoryItem[]>([]);
  const [monitoring, setMonitoring] = useState<VendorMonitoringRecord | null>(null);
  const [monitoringError, setMonitoringError] = useState<string | null>(null);

  // Edit form state
  const [displayNameOverride, setDisplayNameOverride] = useState(vendor?.displayNameOverride ?? "");
  const [categoryOverride, setCategoryOverride] = useState(vendor?.categoryOverride ?? "");
  const [websiteOverride, setWebsiteOverride] = useState(vendor?.websiteOverride ?? "");
  const [relationshipStatus, setRelationshipStatus] = useState(vendor?.relationshipStatus ?? "active");
  const [annualizedSpend, setAnnualizedSpend] = useState(vendor?.annualizedSpend?.toString() ?? "0");
  const [spendCadence, setSpendCadence] = useState(vendor?.spendCadence ?? "monthly");

  const handleTabChange = (tab: string) => {
    router.push(`/app/vendors/${vendorId}?tab=${tab}`);
  };

  useEffect(() => {
    if (!vendor) return;
    void fetch(`/api/portal/vendors/${vendor.relationshipId}/monitoring`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Monitoring details are unavailable.");
        const payload = await response.json();
        setMonitoring(payload.monitoring ?? null);
        setMonitoringError(null);
      })
      .catch((error: unknown) => setMonitoringError(error instanceof Error ? error.message : "Monitoring details are unavailable."));
  }, [vendor]);

  useEffect(() => {
    if (!vendor || activeTab !== "activity") return;
    void fetch(`/api/portal/vendors/${vendor.relationshipId}/history`, { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : { history: [] })
      .then((payload) => setAuditHistory(Array.isArray(payload.history) ? payload.history : []))
      .catch(() => setAuditHistory([]));
  }, [activeTab, vendor]);

  if (!vendor)
    return (
      <div className="vendor-not-found">
        <GlobalBackControl className="vendor-back" />
        <Empty
          title="Vendor not found"
          copy="This vendor is not part of your organization, or the link is no longer valid."
        />
      </div>
    );

  const canWrite = data.currentUser.role !== "viewer";
  const canManageLifecycle = data.currentUser.role === "owner" || data.currentUser.role === "admin";
  const vendorDraftDirty = recordDraftChanged(
    { displayNameOverride: vendor.displayNameOverride ?? "", categoryOverride: vendor.categoryOverride ?? "", websiteOverride: vendor.websiteOverride ?? "", relationshipStatus: vendor.relationshipStatus, annualizedSpend: vendor.annualizedSpend ?? 0, spendCadence: vendor.spendCadence ?? "monthly" },
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
  const vendorSavings = data.savings.filter((s) => s.opportunityId && opportunities.some((o) => o.id === s.opportunityId));
  const contract = contracts[0];
  const latest = expenses[0];
  const rawMonitoringState = monitoring?.state ?? ((vendor as unknown as Record<string, unknown>).monitoringState as MonitoringState | undefined) ?? "not_set_up";
  const hasPendingReviewInvoice = data.invoices.some((i) => i.vendorId === vendorId && i.reviewStatus === "needs_review");
  const hasOpenFinding = opportunities.some((o) => !["closed", "declined"].includes(o.status));
  const hasPendingAction = actions.some((a) => !["complete", "cancelled"].includes(a.status));

  const primaryAction = getDynamicPrimaryAction({
    documentCount: documents.length + expenses.length,
    hasPendingReviewInvoice,
    monitoringState: rawMonitoringState,
    hasOpenFinding,
    hasPendingAction,
  });

  const handleOpenEditSheet = () => {
    setDisplayNameOverride(vendor.displayNameOverride ?? "");
    setCategoryOverride(vendor.categoryOverride ?? "");
    setWebsiteOverride(vendor.websiteOverride ?? "");
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

  const handleToggleMonitoring = async () => {
    const action = monitoring?.state === "paused" ? "resume" : "paused";
    const res = await fetch(`/api/portal/vendors/${vendor.relationshipId}/monitoring`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: action }) });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload.error || "Failed to update monitoring.");
    setMonitoring(payload.monitoring ?? null);
    toast.success(action === "paused" ? "Monitoring paused." : "Monitoring resumed.");
  };

  const handleConfirmDangerAction = async (reason?: string) => {
    if (dangerMode === "end") {
      const res = await fetch(`/api/portal/vendors/${vendor.relationshipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relationshipStatus: vendor.relationshipStatus === "terminated" ? "active" : "terminated", reason, expectedUpdatedAt: vendor.updatedAt }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to end vendor relationship.");
      }
      toast.success(vendor.relationshipStatus === "terminated" ? "Vendor relationship reactivated." : "Vendor relationship ended.");
      router.refresh();
    } else {
      const res = await fetch(`/api/portal/vendors/${vendor.relationshipId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, confirmation: "REMOVE" }),
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
      disabled: !canManageLifecycle,
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
      label: "Add bill",
      icon: <Plus size={15} />,
      disabled: !canWrite,
      onSelect: () => onAdd("upload", vendor.relationshipId),
    },
    {
      id: "contract",
      label: "Add contract",
      icon: <FileText size={15} />,
      disabled: !canWrite,
      onSelect: () => onAdd("contract", vendor.relationshipId),
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
      id: "monitoring-state",
      label: monitoring?.state === "paused" ? "Resume monitoring" : "Pause monitoring",
      icon: <Pause size={15} />,
      disabled: !canWrite || !monitoring || monitoring.state === "not_configured",
      onSelect: () => { void handleToggleMonitoring().catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Failed to update monitoring.")); },
    },
    {
      id: "end",
      label: vendor.relationshipStatus === "terminated" ? "Reactivate relationship" : "End vendor relationship",
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
      disabled: !canManageLifecycle,
      onSelect: () => handleOpenDangerDialog("remove"),
    },
  ];

  const vendorTabs = [
    { id: "overview", label: "Overview" },
    { id: "accounts", label: "Accounts", count: 1 },
    { id: "bills", label: "Bills", count: expenses.length + documents.length },
    { id: "contracts", label: "Contracts", count: contracts.length },
    { id: "findings", label: "Findings", count: opportunities.length + actions.length },
    { id: "activity", label: "Activity", count: auditHistory.length },
  ];

  const potentialValueTotal = opportunities.reduce((sum, o) => sum + (o.estimatedAnnualValue ?? 0), 0);
  const verifiedValueTotal = vendorSavings.filter((s) => s.status === "verified").reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="vendor-detail">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <GlobalBackControl className="vendor-back" />
        <span className="vendor-scope-badge" style={{ fontSize: "0.74rem", padding: "2px 10px", borderRadius: 12, background: "rgba(0, 47, 167, 0.06)", color: "#002FA7", fontWeight: 600, border: "1px solid rgba(0, 47, 167, 0.18)" }}>
          Vendor workspace · Scoped to {vendor.name}
        </span>
      </div>

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
              <Link className="button button-quiet" href="/app/ask">
                Ask Costivra
              </Link>
            </>
          )}
          <RecordOverflowMenu items={menuItems} ariaLabel="More vendor actions" />
        </div>
      </header>

      {/* 6-Tab Strip */}
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
            {tab.count != null && tab.count > 0 && (
              <span style={{ fontSize: "0.74rem", padding: "1px 6px", borderRadius: 10, background: "rgba(30, 41, 59, 0.06)" }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Relationship summary band */}
          <section className="vendor-summary-band">
            <div className="vendor-spend-stat">
              <span>Annualized spend</span>
              <strong>{money(vendor.annualizedSpend)}</strong>
              <small>Current relationship record</small>
            </div>
            <div className="vendor-spend-stat">
              <span>Latest bill</span>
              <strong>{latest ? money(latest.amount) : "Not recorded"}</strong>
              <small>
                {latest
                  ? `Period ending ${date(latest.periodEnd)}`
                  : "Add a bill or source document"}
              </small>
            </div>
            <SpendSparkline expenses={expenses} />
            <VendorCount label="Active accounts" value={1} />
            <VendorCount label="Contracts" value={contracts.length} />
            <VendorCount
              label="Open findings"
              value={opportunities.filter((item) => !["closed", "declined"].includes(item.status)).length}
            />
            <VendorCount label="Pending actions" value={actions.filter((a) => !["complete", "cancelled"].includes(a.status)).length} />
          </section>

          {/* Value summary */}
          <section className="portal-panel" style={{ padding: "18px 22px" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 12px" }}>Value Summary</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
              <div>
                <span style={{ fontSize: "0.78rem", color: "var(--assistant-muted, #64748b)", display: "block" }}>Potential Value</span>
                <strong style={{ fontSize: "1.2rem", color: "#002FA7" }}>{money(potentialValueTotal)}</strong>
                <small style={{ display: "block", color: "var(--assistant-muted, #64748b)", fontSize: "0.72rem" }}>Rule-based estimate</small>
              </div>
              <div>
                <span style={{ fontSize: "0.78rem", color: "var(--assistant-muted, #64748b)", display: "block" }}>Actions in Progress</span>
                <strong style={{ fontSize: "1.2rem" }}>{actions.filter(a => a.status === "in_progress").length} work items</strong>
                <small style={{ display: "block", color: "var(--assistant-muted, #64748b)", fontSize: "0.72rem" }}>Active execution</small>
              </div>
              <div>
                <span style={{ fontSize: "0.78rem", color: "var(--assistant-muted, #64748b)", display: "block" }}>Verified Value</span>
                <strong style={{ fontSize: "1.2rem", color: "#10b981" }}>{money(verifiedValueTotal)}</strong>
                <small style={{ display: "block", color: "var(--assistant-muted, #64748b)", fontSize: "0.72rem" }}>Proven by later evidence</small>
              </div>
            </div>
            <p className="muted" style={{ fontSize: "0.76rem", margin: "14px 0 0", display: "flex", alignItems: "center", gap: 6 }}>
              <ShieldCheck size={14} style={{ color: "#002FA7" }} /> Potential value is an estimate based on rules and baseline data. Verified value is proven by later invoice evidence.
            </p>
          </section>

          <VendorMonitoringCard
            vendor={vendor}
            monitoring={monitoring}
            error={monitoringError}
            canWrite={canWrite}
            onMonitor={() => onAdd("monitor", vendor.relationshipId)}
          />

          <DataCompletenessChecklist
            documents={documents}
            expenses={expenses}
            invoices={data.invoices.filter((item) => item.vendorId === vendorId)}
            contract={contract}
            monitoring={monitoring}
          />
        </div>
      )}

      {activeTab === "accounts" && (
        <VendorAccountsTab vendorId={vendorId} data={data} selectedAccountId={requestedAccount} onAdd={onAdd} />
      )}

      {activeTab === "bills" && (
        <VendorBillsTab expenses={expenses} invoices={data.invoices.filter((item) => item.vendorId === vendorId)} documents={documents} vendorName={vendor.name} />
      )}

      {activeTab === "contracts" && (
        <VendorContractsTab contracts={contracts} />
      )}

      {activeTab === "findings" && (
        <VendorFindingsTab opportunities={opportunities} actions={actions} savings={vendorSavings} />
      )}

      {activeTab === "activity" && (
        <section className="portal-panel">
          <div className="portal-panel-heading">
            <div>
              <h2>Activity & Relationship History</h2>
              <p>Combined audit log of uploads, reviews, approvals, and status changes for this vendor.</p>
            </div>
          </div>
          <RecordChangeHistory history={auditHistory} emptyMessage="No relationship activity has been recorded yet." />
        </section>
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
              placeholder={vendor.canonicalName}
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
              placeholder={vendor.canonicalCategory}
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
              placeholder={vendor.canonicalWebsite ?? "https://..."}
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
              disabled={!canManageLifecycle && vendor.relationshipStatus === "terminated"}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(30, 41, 59, 0.2)" }}
            >
              <option value="active">Active</option>
              <option value="prospect">Prospect</option>
              <option value="inactive">Inactive</option>
              <option value="terminated" disabled={!canManageLifecycle}>Terminated</option>
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
              </select>
            </div>
          </div>
          <div className="portal-panel" style={{ padding: 14 }}>
            <strong style={{ fontSize: "0.82rem" }}>Canonical vendor reference</strong>
            <p className="muted" style={{ margin: "6px 0 10px", fontSize: "0.8rem" }}>These catalog values are read-only here. Your overrides above affect only this workspace.</p>
            <dl className="record-summary-list"><div><dt>Canonical name</dt><dd>{vendor.canonicalName}</dd></div><div><dt>Canonical category</dt><dd>{vendor.canonicalCategory}</dd></div><div><dt>Canonical website</dt><dd>{vendor.canonicalWebsite ?? "Not recorded"}</dd></div><div><dt>Created at</dt><dd>{date(vendor.createdAt)}</dd></div><div><dt>Updated at</dt><dd>{date(vendor.updatedAt)}</dd></div><div><dt>Terminated at</dt><dd>{vendor.endedAt ? date(vendor.endedAt) : "Not terminated"}</dd></div></dl>
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
        requiredConfirmationText={dangerMode === "remove" ? "REMOVE" : undefined}
      />
    </div>
  );
}

function formatVendorAccountLabel(
  account: { accountName?: string | null; category?: string; externalAccountReference?: string | null; accountNumberLast4?: string | null },
  locationName?: string | null
): string {
  if (account.accountName) return account.accountName;
  if (locationName) return locationName;
  const ref = account.accountNumberLast4 ?? account.externalAccountReference;
  if (ref) return `${account.category ?? "Vendor account"} · Ending ...${ref.slice(-4)}`;
  return "Vendor account";
}

function maskAccountReference(ref: string | null | undefined): string {
  if (!ref) return "Not recorded";
  const clean = ref.trim();
  if (clean.length <= 4) return `Ending ...${clean}`;
  return `Ending ...${clean.slice(-4)}`;
}

function VendorAccountsTab({
  vendorId,
  data,
  selectedAccountId,
  onAdd,
}: {
  vendorId: string;
  data: PortalData;
  selectedAccountId?: string | null;
  onAdd: (kind: Exclude<ModalState, null>, relationshipId: string) => void;
}) {
  const router = useRouter();
  const vendor = data.vendors.find((v) => v.id === vendorId);
  const relationshipId = vendor?.relationshipId ?? "";

  const accounts = data.expenseAccounts.filter(
    (a) => a.vendorId === vendorId || (relationshipId && a.relationshipId === relationshipId)
  );
  const invoices = data.invoices.filter((i) => i.vendorId === vendorId);
  const contracts = data.contracts.filter((c) => c.vendorId === vendorId);
  const opportunities = data.opportunities.filter((o) => o.vendorId === vendorId);

  // Unmatched invoices needing account match
  const unmatchedInvoices = invoices.filter(
    (i) => !i.expenseAccountId || i.expenseAccountMatchStatus !== "matched"
  );

  const handleSelectAccount = (accountId: string) => {
    router.push(`/app/vendors/${vendorId}?tab=accounts&account=${accountId}`);
  };

  const handleClosePanel = () => {
    router.push(`/app/vendors/${vendorId}?tab=accounts`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <section className="portal-panel">
        <div className="portal-panel-heading">
          <div>
            <h2>Vendor Accounts & Locations</h2>
            <p>Service accounts, subscriptions, meters, and locations associated with this vendor relationship.</p>
          </div>
        </div>

        {accounts.length ? (
          <div className="portal-list">
            {accounts.map((account) => {
              const location = data.locations.find((l) => l.id === account.locationId);
              const label = formatVendorAccountLabel(account, location?.name ?? account.locationName);
              const maskedRef = maskAccountReference(account.accountNumberLast4 ?? account.externalAccountReference);
              const accountInvoices = invoices.filter((i) => i.expenseAccountId === account.id);
              const latestInv = accountInvoices[0];
              const accountContracts = contracts.filter((c) => c.expenseAccountId === account.id);
              const accountOppCount = opportunities.filter((o) => o.expenseAccountId === account.id && !["closed", "declined"].includes(o.status)).length;

              return (
                <div
                  key={account.id}
                  className="portal-list-row"
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSelectAccount(account.id)}
                >
                  <div className="grow">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <strong>{label}</strong>
                      <span style={{ fontSize: "0.76rem", padding: "1px 8px", borderRadius: 10, background: "rgba(30, 41, 59, 0.06)", color: "var(--assistant-text-secondary, #475569)" }}>
                        {maskedRef}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "var(--assistant-muted, #64748b)", marginTop: 4, display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <MapPin size={13} /> {location?.name ?? account.locationName ?? "Unassigned location"}
                      </span>
                      <span>Category: {account.category}</span>
                      {latestInv ? (
                        <span>Latest bill: {money(latestInv.totalAmount ?? 0)} ({date(latestInv.invoiceDate)})</span>
                      ) : null}
                      {accountContracts.length ? (
                        <span>Contract active</span>
                      ) : null}
                      {accountOppCount > 0 && (
                        <span style={{ color: "#002FA7", fontWeight: 600 }}>{accountOppCount} open finding{accountOppCount > 1 ? "s" : ""}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: 10, background: "rgba(0, 47, 167, 0.06)", color: "#002FA7", fontWeight: 500 }}>
                      Monitoring applies to vendor
                    </span>
                    <Status value={account.status} />
                    <ChevronRight size={16} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : invoices.length ? (
          <div className="portal-list">
            {invoices.map((inv) => {
              const label = formatVendorAccountLabel(
                { accountName: null, category: inv.expenseCategory ?? "Vendor account", accountNumberLast4: inv.accountNumberLast4 },
                inv.locationName
              );
              const maskedRef = maskAccountReference(inv.accountNumberLast4);
              return (
                <div
                  key={inv.id}
                  className="portal-list-row"
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSelectAccount(inv.id)}
                >
                  <div className="grow">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <strong>{label}</strong>
                      <span style={{ fontSize: "0.76rem", padding: "1px 8px", borderRadius: 10, background: "rgba(30, 41, 59, 0.06)" }}>
                        {maskedRef}
                      </span>
                    </div>
                    <span style={{ fontSize: "0.82rem", color: "var(--assistant-muted, #64748b)" }}>
                      Location: {inv.locationName ?? "Default location"} · {inv.energyService?.meterId ? `Meter ${inv.energyService.meterId}` : "Service account"}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Status value={inv.expenseAccountMatchStatus === "matched" ? "active" : "needs_review"} />
                    <ChevronRight size={16} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="portal-list">
            <div className="portal-list-row">
              <div className="grow">
                <strong>Primary Account</strong>
                <span>All spend records linked to main vendor account</span>
              </div>
              <Status value="active" />
            </div>
          </div>
        )}
      </section>

      {/* Unmatched Bills Section ("Bills needing account match") */}
      {unmatchedInvoices.length > 0 && (
        <section className="portal-panel">
          <div className="portal-panel-heading">
            <div>
              <h2>Bills needing account match</h2>
              <p>Bills extracted for this vendor that require account or location verification.</p>
            </div>
          </div>
          <div className="portal-list">
            {unmatchedInvoices.map((inv) => (
              <Link key={inv.id} className="portal-list-row" href={`/app/documents/${inv.documentId}`}>
                <div className="grow">
                  <strong>{inv.invoiceNumber ?? "Bill without invoice #"}</strong>
                  <div style={{ fontSize: "0.82rem", color: "var(--assistant-muted, #64748b)", marginTop: 2, display: "flex", gap: 12 }}>
                    <span>Amount: {money(inv.totalAmount ?? 0)}</span>
                    <span>Date: {date(inv.invoiceDate)}</span>
                    <span>Last 4: {inv.accountNumberLast4 ? `...${inv.accountNumberLast4}` : "None"}</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "0.74rem", padding: "2px 8px", borderRadius: 10, background: "rgba(16, 185, 129, 0.1)", color: "#047857", fontWeight: 600 }}>
                    Vendor matched
                  </span>
                  <span style={{ fontSize: "0.74rem", padding: "2px 8px", borderRadius: 10, background: "rgba(245, 158, 11, 0.1)", color: "#b45309", fontWeight: 600 }}>
                    {inv.expenseAccountMatchStatus === "matched" ? "Account matched" : "Account needs review"}
                  </span>
                  <span style={{ fontSize: "0.74rem", padding: "2px 8px", borderRadius: 10, background: "rgba(100, 116, 139, 0.1)", color: "#475569", fontWeight: 500 }}>
                    {inv.serviceLocationMatchStatus === "matched" ? "Location matched" : "Location needs review"}
                  </span>
                  <ChevronRight size={16} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Account Detail Side Panel / Sheet */}
      {selectedAccountId && (
        <AccountDetailSheet
          accountId={selectedAccountId}
          relationshipId={relationshipId}
          data={data}
          onClose={handleClosePanel}
          onAdd={onAdd}
        />
      )}
    </div>
  );
}

function AccountDetailSheet({
  accountId,
  relationshipId,
  data,
  onClose,
  onAdd,
}: {
  accountId: string;
  relationshipId: string;
  data: PortalData;
  onClose: () => void;
  onAdd: (kind: Exclude<ModalState, null>, relationshipId: string) => void;
}) {
  const account = data.expenseAccounts.find((a) => a.id === accountId);
  const fallbackInvoice = !account ? data.invoices.find((i) => i.id === accountId) : null;
  const location = account?.locationId ? data.locations.find((l) => l.id === account.locationId) : null;

  const label = account
    ? formatVendorAccountLabel(account, location?.name ?? account.locationName)
    : fallbackInvoice
    ? formatVendorAccountLabel({ accountName: null, category: fallbackInvoice.expenseCategory ?? "Vendor account", accountNumberLast4: fallbackInvoice.accountNumberLast4 }, fallbackInvoice.locationName)
    : "Vendor account";

  const maskedRef = maskAccountReference(account?.accountNumberLast4 ?? account?.externalAccountReference ?? fallbackInvoice?.accountNumberLast4);

  const accountInvoices = data.invoices.filter((i) => i.expenseAccountId === accountId || (fallbackInvoice && i.id === fallbackInvoice.id));
  const accountContracts = data.contracts.filter((c) => c.expenseAccountId === accountId);
  const accountOpportunities = data.opportunities.filter((o) => o.expenseAccountId === accountId);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", justifyContent: "flex-end", background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)" }}>
      <div style={{ width: "100%", maxWidth: 540, background: "var(--card-bg, #ffffff)", height: "100%", overflowY: "auto", padding: 24, boxShadow: "-4px 0 24px rgba(0, 0, 0, 0.15)", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid rgba(30, 41, 59, 0.1)", paddingBottom: 16 }}>
          <div>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#002FA7", fontWeight: 700 }}>
              Vendor Account Detail
            </span>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "4px 0 0" }}>{label}</h2>
            <p className="muted" style={{ margin: "2px 0 0", fontSize: "0.82rem" }}>
              {maskedRef} · Category: {account?.category ?? fallbackInvoice?.expenseCategory ?? "General"}
            </p>
          </div>
          <button type="button" className="button button-quiet" onClick={onClose} style={{ padding: "4px 8px" }}>
            ✕
          </button>
        </div>

        {/* Account Identity & Location */}
        <section className="portal-panel" style={{ padding: 16 }}>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 700, margin: "0 0 12px" }}>Account Identity & Location</h3>
          <dl className="record-summary-list">
            <div>
              <dt>Account label</dt>
              <dd>{label}</dd>
            </div>
            <div>
              <dt>Masked reference</dt>
              <dd>{maskedRef}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{location?.name ?? account?.locationName ?? fallbackInvoice?.locationName ?? "Unassigned"}</dd>
            </div>
            <div>
              <dt>Service start date</dt>
              <dd>{account?.serviceStartDate ? date(account.serviceStartDate) : "Not recorded"}</dd>
            </div>
            <div>
              <dt>Service end date</dt>
              <dd>{account?.serviceEndDate ? date(account.serviceEndDate) : "Active / Ongoing"}</dd>
            </div>
            <div>
              <dt>Monitoring status</dt>
              <dd>Monitoring applies to vendor relationship</dd>
            </div>
          </dl>
        </section>

        {/* Primary Actions */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="button button-primary button-sm" onClick={() => onAdd("upload", relationshipId)}>
            <Plus size={14} /> Upload bill for this account
          </button>
          <button type="button" className="button button-quiet button-sm" onClick={() => onAdd("monitor", relationshipId)}>
            <Mail size={14} /> Set monitoring
          </button>
        </div>

        {/* Bill History */}
        <section className="portal-panel" style={{ padding: 16 }}>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 700, margin: "0 0 12px" }}>Bills linked to account ({accountInvoices.length})</h3>
          {accountInvoices.length ? (
            <div className="portal-list">
              {accountInvoices.map((inv) => (
                <Link key={inv.id} className="portal-list-row" href={`/app/documents/${inv.documentId}`}>
                  <div className="grow">
                    <strong>{inv.invoiceNumber ?? "Bill"}</strong>
                    <span>Date: {date(inv.invoiceDate)}</span>
                  </div>
                  <strong>{money(inv.totalAmount ?? 0)}</strong>
                  <ChevronRight size={16} />
                </Link>
              ))}
            </div>
          ) : (
            <Empty title="No bills linked" copy="Upload a bill to build this account's spend history." />
          )}
        </section>

        {/* Linked Contracts */}
        <section className="portal-panel" style={{ padding: 16 }}>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 700, margin: "0 0 12px" }}>Contracts ({accountContracts.length})</h3>
          {accountContracts.length ? (
            <div className="portal-list">
              {accountContracts.map((contract) => (
                <Link key={contract.id} className="portal-list-row" href={`/app/contracts/${contract.id}`}>
                  <div className="grow">
                    <strong>{contract.title}</strong>
                    <span>{contract.endDate ? `Ends ${date(contract.endDate)}` : "End date not set"}</span>
                  </div>
                  <ChevronRight size={16} />
                </Link>
              ))}
            </div>
          ) : (
            <Empty title="No contracts linked" copy="Add a contract agreement for this account." />
          )}
        </section>

        {/* Linked Findings */}
        <section className="portal-panel" style={{ padding: 16 }}>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 700, margin: "0 0 12px" }}>Findings ({accountOpportunities.length})</h3>
          {accountOpportunities.length ? (
            <div className="portal-list">
              {accountOpportunities.map((opp) => (
                <Link key={opp.id} className="portal-list-row" href={`/app/findings#${opp.id}`}>
                  <div className="grow">
                    <strong>{opp.title}</strong>
                    <span>{opp.summary}</span>
                  </div>
                  <Status value={opp.status} />
                  <ChevronRight size={16} />
                </Link>
              ))}
            </div>
          ) : (
            <Empty title="No findings" copy="Costivra has not detected a cost finding for this account." />
          )}
        </section>
      </div>
    </div>
  );
}

function VendorMonitoringCard({
  vendor,
  monitoring,
  error,
  canWrite,
  onMonitor,
  expanded = false,
}: {
  vendor: PortalVendor;
  monitoring: VendorMonitoringRecord | null;
  error: string | null;
  canWrite: boolean;
  onMonitor: () => void;
  expanded?: boolean;
}) {
  const rawState = monitoring?.state ?? ((vendor as unknown as Record<string, unknown>).monitoringState as MonitoringState | undefined) ?? "not_set_up";
  const { label, copy, badgeClass } = getMonitoringStateLabel(rawState);

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
          <strong style={{ fontSize: "0.9rem" }}>{monitoring?.approvedSenderAddress ?? "Not configured"}</strong>
        </div>
        <div>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block" }}>Private intake address</span>
          <strong style={{ fontSize: "0.9rem" }}>{monitoring?.privateIntakeAddress ?? "Not available until an intake address is active"}</strong>
        </div>
        <div>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block" }}>Expected cadence</span>
          <strong style={{ fontSize: "0.9rem" }}>{monitoring?.expectedCadenceDays ? `${monitoring.expectedCadenceDays} days` : "Not configured"}</strong>
        </div>
        <div><span style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block" }}>Grace period</span><strong style={{ fontSize: "0.9rem" }}>{monitoring?.gracePeriodDays ? `${monitoring.gracePeriodDays} days` : "Not configured"}</strong></div>
        {expanded && <><div><span style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block" }}>Last test</span><strong style={{ fontSize: "0.9rem" }}>{monitoring?.testCompletedAt ? date(monitoring.testCompletedAt) : "Not completed"}</strong></div><div><span style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block" }}>Last bill received</span><strong style={{ fontSize: "0.9rem" }}>{monitoring?.lastReceivedAt ? date(monitoring.lastReceivedAt) : "Not received"}</strong></div><div><span style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block" }}>Next expected bill</span><strong style={{ fontSize: "0.9rem" }}>{monitoring?.nextExpectedAt ? date(monitoring.nextExpectedAt) : "Unknown"}</strong></div><div><span style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block" }}>Latest failure</span><strong style={{ fontSize: "0.9rem" }}>{monitoring?.lastFailureCode ?? "None recorded"}</strong></div></>}
      </div>
      {error ? <p className="muted" role="status" style={{ margin: "12px 0 0" }}>{error}</p> : null}
      <p className="muted" style={{ fontSize: "0.78rem", margin: "14px 0 0", display: "flex", alignItems: "center", gap: 6 }}>
        <ShieldCheck size={14} style={{ color: "#002FA7" }} /> Costivra receives only messages sent to your private workspace address. Costivra does not read the rest of your inbox.
      </p>
    </section>
  );
}

function VendorBillsTab({
  expenses,
  invoices,
  documents,
  vendorName,
}: {
  expenses: PortalData["expenses"];
  invoices: PortalData["invoices"];
  documents: PortalData["documents"];
  vendorName: string;
}) {
  const [subview, setSubview] = useState<"bills" | "files">("bills");

  if (!expenses.length && !invoices.length && !documents.length) {
    return <Empty title="No bills recorded" copy="Upload a bill or add a normalized expense to build this vendor's history." />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          type="button"
          onClick={() => setSubview("bills")}
          style={{
            padding: "6px 14px",
            borderRadius: 6,
            fontSize: "0.82rem",
            fontWeight: subview === "bills" ? 600 : 500,
            background: subview === "bills" ? "#002FA7" : "transparent",
            color: subview === "bills" ? "#fff" : "var(--assistant-text-secondary, #475569)",
            border: subview === "bills" ? "1px solid #002FA7" : "1px solid rgba(30, 41, 59, 0.15)",
            cursor: "pointer",
          }}
        >
          Bills & Spend ({expenses.length + invoices.length})
        </button>
        <button
          type="button"
          onClick={() => setSubview("files")}
          style={{
            padding: "6px 14px",
            borderRadius: 6,
            fontSize: "0.82rem",
            fontWeight: subview === "files" ? 600 : 500,
            background: subview === "files" ? "#002FA7" : "transparent",
            color: subview === "files" ? "#fff" : "var(--assistant-text-secondary, #475569)",
            border: subview === "files" ? "1px solid #002FA7" : "1px solid rgba(30, 41, 59, 0.15)",
            cursor: "pointer",
          }}
        >
          Source Files ({documents.length})
        </button>
      </div>

      {subview === "bills" ? (
        <section className="portal-panel">
          <div className="portal-panel-heading">
            <div>
              <h2>Bills and recorded expenses</h2>
              <p>Amounts are shown from saved records; they are not annualized estimates.</p>
            </div>
          </div>
          <div className="portal-list">
            {expenses.map((expense) => (
              <Link key={expense.id} className="portal-list-row" href={`/app/expenses/${expense.id}`}>
                <div className="grow">
                  <strong>{date(expense.periodEnd)}</strong>
                  <span>{expense.category} · {expense.locationName ?? "Location not assigned"}</span>
                </div>
                <strong>{money(expense.amount)}</strong>
                <ChevronRight size={16} />
              </Link>
            ))}
          </div>
          {invoices.length ? (
            <div className="portal-list" style={{ marginTop: 12 }}>
              {invoices.map((invoice) => (
                <Link key={invoice.id} className="portal-list-row" href={`/app/bills/${invoice.id}`}>
                  <div className="grow">
                    <strong>{invoice.invoiceNumber ?? "Invoice"}</strong>
                    <span>
                      {displayPeriod(invoice.servicePeriodStart, invoice.servicePeriodEnd)} · Account {invoice.accountNumberLast4 ? `…${invoice.accountNumberLast4}` : "not assigned"} · {invoice.locationName ?? "Location not assigned"}
                    </span>
                    <small>
                      Current charges {invoice.currentCharges == null ? "not recorded" : money(invoice.currentCharges)} · Amount due {invoice.amountDue == null ? "not recorded" : money(invoice.amountDue)} · Reconciliation: {titleCase(invoice.reconciliationStatus || "unknown")} · Vendor matched: {invoice.vendorMatchStatus === "exact" || invoice.vendorMatchStatus === "provided" ? "Yes" : "Needs review"}
                    </small>
                  </div>
                  <Status value={invoice.reviewStatus} />
                  <ChevronRight size={16} />
                </Link>
              ))}
            </div>
          ) : null}
        </section>
      ) : (
        <RecordFilesWorkspace
          title="Vendor source files"
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
            evidenceCount: item.evidenceCount,
            contextLabel: vendorName,
            href: `/api/portal/documents/${item.id}/download`,
            sourceAvailable: !item.sourcePurgedAt,
          }))}
        />
      )}
    </div>
  );
}

function VendorContractsTab({ contracts }: { contracts: PortalData["contracts"] }) {
  if (!contracts.length) return <Empty title="No contracts recorded" copy="Add a contract and its notice dates to make renewal risk visible." />;
  return <section className="portal-panel"><div className="portal-panel-heading"><div><h2>Contracts</h2><p>Dates and values come from the recorded agreement.</p></div></div><div className="portal-list">{contracts.map((contract) => <Link key={contract.id} className="portal-list-row" href={`/app/contracts/${contract.id}`}><div className="grow"><strong>{contract.title}</strong><span>{contract.endDate ? `Ends ${date(contract.endDate)}` : "End date not recorded"}{contract.autoRenews ? " · Auto-renews" : ""}</span></div><strong>{contract.annualValue == null ? "Value not recorded" : money(contract.annualValue)}</strong><ChevronRight size={16} /></Link>)}</div></section>;
}

function VendorFindingsTab({
  opportunities,
  actions,
  savings,
}: {
  opportunities: PortalData["opportunities"];
  actions: PortalData["actions"];
  savings: PortalData["savings"];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* 1. Findings */}
      <section className="portal-panel">
        <div className="portal-panel-heading">
          <div>
            <h2>Findings</h2>
            <p>Evidence-backed cost leakage, rate anomalies, and contract risks for this vendor.</p>
          </div>
        </div>
        {opportunities.length ? (
          <div className="portal-list">
            {opportunities.map((opportunity) => (
              <Link key={opportunity.id} className="portal-list-row" href={`/app/findings/${opportunity.id}`}>
                <div className="grow">
                  <strong>{opportunity.title}</strong>
                  <span>
                    {opportunity.expenseAccountReference ?? opportunity.locationName ?? "Scope not assigned"} ·{" "}
                    {opportunity.evidenceCount} evidence reference{opportunity.evidenceCount === 1 ? "" : "s"} ·{" "}
                    {Math.round((opportunity.confidence ?? 0) * 100)}% confidence
                  </span>
                </div>
                <TrustBadge state={opportunity.trustState} />
                <Status value={opportunity.status} />
                <ChevronRight size={16} />
              </Link>
            ))}
          </div>
        ) : (
          <Empty title="No active findings" copy="Costivra has not detected a finding for this vendor relationship." />
        )}
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid rgba(30, 41, 59, 0.08)", display: "flex", justifyContent: "flex-end" }}>
          <Link href="/app/findings" className="button button-quiet button-compact" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            View all findings across vendors <ArrowUpRight size={14} />
          </Link>
        </div>
      </section>

      {/* 2. Pending Actions */}
      <section className="portal-panel">
        <div className="portal-panel-heading">
          <div>
            <h2>Pending actions</h2>
            <p>Work requiring authorization or execution for this vendor.</p>
          </div>
        </div>
        {actions.length ? (
          <div className="portal-list">
            {actions.map((action) => (
              <Link key={action.id} className="portal-list-row" href={`/app/actions/${action.id}`}>
                <div className="grow">
                  <strong>{action.title}</strong>
                  <span>{action.dueAt ? `Due ${date(action.dueAt)}` : "No due date"}</span>
                </div>
                <Status value={action.status} />
                <ChevronRight size={16} />
              </Link>
            ))}
          </div>
        ) : (
          <Empty title="No actions planned" copy="Approved findings will appear here as executable work." />
        )}
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid rgba(30, 41, 59, 0.08)", display: "flex", justifyContent: "flex-end" }}>
          <Link href="/app/actions" className="button button-quiet button-compact" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            View all actions across vendors <ArrowUpRight size={14} />
          </Link>
        </div>
      </section>

      {/* 3. Results */}
      <section className="portal-panel">
        <div className="portal-panel-heading">
          <div>
            <h2>Results</h2>
            <p>Verified results and work still in progress for this vendor.</p>
          </div>
        </div>
        {savings.length ? (
          <div className="portal-list">
            {savings.map((item) => (
              <Link key={item.id} className="portal-list-row" href={`/app/results/${item.id}`}>
                <div className="grow">
                  <strong>{item.title}</strong>
                  <span>{item.method} · {item.status === "verified" ? "Verified result" : "In progress"}</span>
                </div>
                <strong className="money-value">{money(item.amount)}</strong>
                <Status value={item.status} />
                <ChevronRight size={16} />
              </Link>
            ))}
          </div>
        ) : (
          <Empty title="No verified results yet" copy="Proven value will appear here after evidence reconciliation." />
        )}
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid rgba(30, 41, 59, 0.08)", display: "flex", justifyContent: "flex-end" }}>
          <Link href="/app/results" className="button button-quiet button-compact" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            View all results across vendors <ArrowUpRight size={14} />
          </Link>
        </div>
      </section>
    </div>
  );
}

function DataCompletenessChecklist({
  documents,
  expenses,
  invoices,
  contract,
  monitoring,
}: {
  documents: PortalData["documents"];
  expenses: PortalData["expenses"];
  invoices: PortalData["invoices"];
  contract?: PortalContract;
  monitoring: VendorMonitoringRecord | null;
}) {
  type CompletenessState = "complete" | "attention" | "unknown" | "not_applicable";
  const [now] = useState(() => Date.now());
  const latestDocument = documents.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const recentDocument = latestDocument && now - new Date(latestDocument.createdAt).getTime() <= 120 * 24 * 60 * 60 * 1000;
  const hasResolvedMatch = invoices.some((invoice) => ["matched", "resolved"].includes(invoice.vendorMatchStatus));
  const hasReconciledInvoice = invoices.some((invoice) => ["reconciled", "matched"].includes(invoice.reconciliationStatus));
  const states: Array<{ label: string; state: CompletenessState }> = [
    { label: "Recent source document", state: recentDocument ? "complete" : documents.length ? "attention" : "unknown" },
    { label: "Vendor match resolved", state: hasResolvedMatch ? "complete" : invoices.length ? "attention" : "unknown" },
    { label: "Invoice totals reconciled", state: hasReconciledInvoice ? "complete" : invoices.length ? "attention" : "unknown" },
    { label: "Normalized expense exists", state: expenses.length ? "complete" : "unknown" },
    { label: "Contract recorded", state: contract ? "complete" : "unknown" },
    { label: "Renewal or end date recorded", state: contract ? (contract.endDate ? "complete" : "attention") : "unknown" },
    { label: "Location assigned when applicable", state: contract ? (contract.locationId ? "complete" : "attention") : expenses.some((expense) => expense.locationId) ? "complete" : "not_applicable" },
    { label: "Monitoring configured", state: monitoring ? (monitoring.state === "not_configured" ? "unknown" : "complete") : "unknown" },
    { label: "Forwarding test passed when required", state: monitoring?.sourceMethod === "email_forwarding" ? (monitoring.testCompletedAt ? "complete" : "attention") : monitoring ? "not_applicable" : "unknown" },
    { label: "Expected bill not missed", state: monitoring?.state === "attention_needed" ? "attention" : monitoring?.state === "active" ? "complete" : "unknown" },
  ];
  const score = Math.round((states.filter((item) => item.state === "complete").length / states.length) * 100);

  return (
    <section className="portal-panel" style={{ marginBottom: 24, padding: "20px 24px" }}>
      <div className="portal-panel-heading" style={{ marginBottom: 12 }}>
        <div>
          <h2>Data Completeness</h2>
          <p>{score}% of recommended relationship fields recorded.</p>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        {states.map((item) => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem" }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: "50%", background: item.state === "complete" ? "#10b981" : item.state === "attention" ? "#b45309" : "#64748b", color: "#fff", flexShrink: 0 }}>
              {item.state === "complete" ? <Check size={12} /> : item.state === "attention" ? <Info size={12} /> : <X size={12} />}
            </span>
            <span style={{ color: item.state === "complete" ? "inherit" : "var(--text-muted)" }}>{item.label} · {item.state === "not_applicable" ? "Not applicable" : titleCase(item.state)}</span>
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
  const [pendingUploadNotice, setPendingUploadNotice] =
    useState<DocumentUploadCompletion | null>(null);
  const router = useRouter();
  const toast = useToast();
  const { openInspector } = useBillInspector();
  const close = () => !busy && setKind(null);
  const completeUpload = (completion: DocumentUploadCompletion) => {
    setPendingUploadNotice(completion);
    setKind(null);
  };
  const handleUploadModalClosed = () => {
    const completion = pendingUploadNotice;
    if (!completion) return;
    setPendingUploadNotice(null);
    router.refresh();
    const notice = getUploadToastNotice(completion);
    if (!notice) return;
    if (notice.action === "breakdown" && notice.documentId) {
      toast.show({
        tone: notice.tone,
        title: notice.title,
        message: notice.message,
        actionLabel: "Open breakdown",
        onActionClick: () => openInspector(notice.documentId!),
        duration: notice.duration,
      });
      return;
    }
    toast.show({
      tone: notice.tone,
      title: notice.title,
      message: notice.message,
      actionHref: notice.documentId
        ? `/app/documents/${notice.documentId}`
        : "/app/documents",
      actionLabel:
        completion.kind === "duplicate"
          ? "Open existing document"
          : completion.kind === "quarantined"
            ? "View document status"
            : "View document",
      duration: notice.duration,
    });
  };
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
        onClosed={handleUploadModalClosed}
      >
        <DocumentUploadExperience
          vendors={data.vendors.map((vendor) => ({
            relationshipId: vendor.relationshipId,
            name: vendor.name,
          }))}
          presetVendor={presetVendor}
          onBusyChange={setBusy}
          onComplete={completeUpload}
          onCancel={close}
        />
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
            <Field
              label="Expected billing cadence (days)"
              name="expectedCadenceDays"
              type="number"
              defaultValue="30"
            />
          </div>
          <div style={{ background: "var(--bg-subtle, #f8fafc)", padding: 14, borderRadius: 8, marginTop: 14, border: "1px solid var(--border-color, #e2e8f0)" }}>
            <strong style={{ fontSize: "0.85rem", display: "block", marginBottom: 6 }}>Private intake address</strong>
            <p className="muted" style={{ fontSize: "0.78rem", margin: "8px 0 0" }}>
              Costivra shows the active private intake address after this workspace has one. It never invents an address from your organization ID.
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
