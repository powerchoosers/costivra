"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  ArrowUpRight,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Copy,
  Download,
  FileText,
  Info,
  ListFilter,
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
  Upload,
  X,
} from "@/lib/icons";
import type { PortalApprovalPolicy, PortalContract, PortalData, PortalInvoice, PortalLocation, PortalTeamMember, PortalVendor } from "@/lib/portal/types";
import { useToast } from "@/components/toast-provider";
import { useBillInspector } from "@/components/bill-inspector-provider";
import { CostivraSelect, SelectOption } from "@/components/ui/costivra-select";
import { CostivraDatePicker } from "@/components/ui/costivra-date-picker";
import { WorkspaceDecisionSummary, WorkspaceEmptyState, WorkspaceStatusBadge, WorkspaceViewTabs } from "@/components/ui/workspace-primitives";
import { formatMoneyInput } from "@/lib/vendors/spend";
import { formatFinancialDate } from "@/lib/ui/date-format";
import { PortalRecordDetail, resolveRecordDetailCurrency } from "@/components/portal-record-detail";
import { CompanyLogo } from "@/components/company-logo";
import { GlobalBackControl, useNavigationLabel } from "@/components/navigation-history";
import { getActivationProgress } from "@/lib/portal/activation";
import { RecordFilesWorkspace } from "@/components/record-files-workspace";
import { actionOperationConfirmation } from "@/lib/portal/workflow-copy";
import { approvalActionLabel } from "@/lib/portal/approval-policies";
import { getMonitoringStateLabel, getVendorNextStep, mapDurableStateToUiState, type MonitoringState, type VendorMonitoringRecord } from "@/lib/vendors/monitoring";
import { groupVendorInvoicesByAccount } from "@/lib/vendors/account-grouping";
import { getVendorDetailTabHref, resolveVendorDetailTab } from "@/lib/vendors/tab-routing";
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
import { PageBreadcrumbs, PageScopeIndicator } from "@/components/page-scope-indicator";
import { getLegacyWorkspaceRedirect } from "@/lib/portal/scope-routing";
import {
  actionAssignedToUser,
  actionIsCompleted,
  actionIsInProgress,
  actionNeedsApproval,
  contractNeedsDetails,
  findingHasEvidence,
  findingHasCustomerVisibleMonetaryClaim,
  findingIsDismissed,
  findingNeedsEvidence,
  findingNeedsReview,
  findingStatusOptions,
  isExpiredContract,
  isUpcomingContract,
  resolveActionView,
  resolveContractView,
  resolveFindingView,
  resolveResultsView,
  resultIsInProgress,
  resultIsVerified,
  resultNeedsVerificationReview,
  resultVerificationStatus,
  totalCustomerVisibleFindingValue,
} from "@/lib/portal/workflow-workspaces";

type ModalState = null | "expense" | "contract" | "invite" | "upload" | "monitor";

/** Newest first so bill review moves predictably backward through a vendor's history. */
function getChronologicalBillDocumentIds(
  documents: PortalData["documents"],
  invoices: PortalData["invoices"],
) {
  const invoiceDateByDocumentId = new Map(
    invoices
      .filter((invoice) => Boolean(invoice.documentId))
      .map((invoice) => [invoice.documentId, invoice.invoiceDate ?? invoice.servicePeriodEnd ?? invoice.updatedAt]),
  );
  const createdAtByDocumentId = new Map(documents.map((document) => [document.id, document.createdAt]));
  return Array.from(new Set([...documents.map((document) => document.id), ...invoiceDateByDocumentId.keys()]))
    .sort((left, right) => {
      const rightDate = invoiceDateByDocumentId.get(right) ?? createdAtByDocumentId.get(right) ?? "";
      const leftDate = invoiceDateByDocumentId.get(left) ?? createdAtByDocumentId.get(left) ?? "";
      return rightDate.localeCompare(leftDate);
    });
}

type ApiOptions = {
  method?: string;
  body?: BodyInit | Record<string, unknown>;
};

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

const money = (value: number, compact = false, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: resolveRecordDetailCurrency(currency),
    maximumFractionDigits: compact ? 0 : 2,
    notation: compact ? "compact" : "standard",
  }).format(value);
const date = (value: string | null) => formatFinancialDate(value, "Not set");
const titleCase = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function PageHeader({
  title,
  description,
  action,
  scope,
  breadcrumbs,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  scope?: ReactNode;
  breadcrumbs?: ReactNode;
}) {
  return (
    <header className={`portal-page-header${action ? " has-action" : ""}`}>
      <div>
        {breadcrumbs}
        {scope}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action ? <div className="portal-page-header-action">{action}</div> : null}
    </header>
  );
}

function Empty({ title, copy, action }: { title: string; copy: string; action?: ReactNode }) {
  return (
    <WorkspaceEmptyState
      className="portal-empty"
      icon={<FileText size={24} />}
      title={title}
      copy={copy}
      action={action}
    />
  );
}

function Status({ value }: { value: string }) {
  return (
    <WorkspaceStatusBadge className={`portal-status status-${value}`}>{titleCase(value)}</WorkspaceStatusBadge>
  );
}

function TrustBadge({ state }: { state: PortalData["opportunities"][number]["trustState"] }) {
  return <WorkspaceStatusBadge className={`portal-status trust-${state}`}>{opportunityTrustLabel(state)}</WorkspaceStatusBadge>;
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
  side = false,
  className,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  onClosed?: () => void;
  side?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(open);
  const [leaving, setLeaving] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  const closedRef = useRef(onClosed);
  const modalClassName = className ? ` ${className}` : "";
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
      className={`portal-modal-layer${side ? " portal-modal-layer--side" : ""}${leaving ? " is-leaving" : ""}`}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeRef.current();
      }}
    >
      <section
        ref={dialogRef}
        className={`portal-modal${side ? " portal-modal--side" : ""}${modalClassName}`}
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
  const legacyRedirect = getLegacyWorkspaceRedirect(page, Boolean(detailId));
  useEffect(() => {
    if (legacyRedirect) router.replace(legacyRedirect);
  }, [legacyRedirect, router]);

  useEffect(() => {
    if (!action) return;

    const isUpload = action === "upload";
    const isContract = action === "add-contract" || (page === "contracts" && action === "add");
    const isVendor = action === "add-vendor" || (page === "vendors" && action === "add");
    const handled = isUpload || isContract || isVendor;

    if (handled) {
      const cleanHref = page === "home" ? "/app" : `/app/${page}${detailId ? `/${detailId}` : ""}`;
      queueMicrotask(() => {
        if (isUpload) {
          setPresetVendor(undefined);
          setModal("upload");
        } else if (isContract) {
          setPresetVendor(undefined);
          setModal("contract");
        } else if (isVendor) {
          openVendorPanel();
        }
      });
      window.setTimeout(() => router.replace(cleanHref), 80);
    }
  }, [action, detailId, page, router]);
  useEffect(() => {
    const handleGlobalAction = (event: Event) => {
      const globalAction = (event as CustomEvent<"upload" | "add-vendor" | "add-contract">).detail;
      if (globalAction === "upload") {
        setPresetVendor(undefined);
        setModal("upload");
      } else if (globalAction === "add-contract") {
        setPresetVendor(undefined);
        setModal("contract");
      } else if (globalAction === "add-vendor") {
        openVendorPanel();
      }
    };
    window.addEventListener("costivra:global-action", handleGlobalAction);
    return () => window.removeEventListener("costivra:global-action", handleGlobalAction);
  }, []);
  const run = async (
    work: () => Promise<unknown>,
    success: string,
  ): Promise<void> => {
    try {
      await work();
      router.refresh();
      toast.success(success);
    } catch (error) {
      const details = error instanceof Error ? error as Error & { code?: string } : null;
      const message = details?.message ?? "Please try again.";
      if (details?.code === "PAID_WORKSPACE_REQUIRED") {
        toast.show({ title: "Continue with a paid workspace", message, tone: "warning", actionHref: "/pricing?from=workspace", actionLabel: "See paid plans" });
      } else {
        toast.error("That didn’t work", message);
      }
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
    contracts: slug?.[1] ? <PortalRecordDetail data={data} kind="contract" id={slug[1]} /> : <Contracts data={data} />,
    actions: slug?.[1] ? <PortalRecordDetail data={data} kind="action" id={slug[1]} /> : <Actions data={data} run={run} />,
    savings: slug?.[1] ? <PortalRecordDetail data={data} kind="savings" id={slug[1]} /> : <ResultsWorkspace data={data} />,
    results: slug?.[1] ? <PortalRecordDetail data={data} kind="savings" id={slug[1]} /> : <ResultsWorkspace data={data} />,
    vendors: slug?.[1] ? (
      <VendorDetail data={data} vendorId={slug[1]} onAdd={openVendorModal} />
    ) : (
      <Vendors data={data} />
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
        data-workspace-scrollbar=""
        className={
          page === "ask"
            ? "app-content app-content-chat motion-page"
              : ["bills", "expenses", "documents"].includes(page) && !detailId
              ? "app-content app-content-table-page motion-page"
              : ["vendors", "findings", "opportunities"].includes(page) && !detailId
                ? "app-content app-content-table-page motion-page"
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
                href={`/app/findings/${item.id}`}
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
  const { documentCount: docCount, locationCount, monitoredCount, needsReviewInvoices, authoritativeReview } = getActivationProgress(data);
  const [durableState, setDurableState] = useState<{ status: string; current_step: string } | null>(null);
  const [freeReview, setFreeReview] = useState<{ mode: "free" | "paid"; used: number; limit: number | null } | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/portal/onboarding", { method: "POST", headers: { "Content-Type": "application/json" } })
      .then((response) => response.ok ? response.json() as Promise<{ onboarding?: { status?: string; current_step?: string } }> : null)
      .then((payload) => {
        if (!active || !payload?.onboarding) return;
        setDurableState({ status: payload.onboarding.status ?? "not_started", current_step: payload.onboarding.current_step ?? "account_confirmed" });
      })
      .catch(() => undefined);
    fetch("/api/portal/free-review/status", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<{ freeReview?: { mode?: "free" | "paid"; used?: number; limit?: number | null } }> : null)
      .then((payload) => {
        if (!active || !payload?.freeReview?.mode) return;
        setFreeReview({ mode: payload.freeReview.mode, used: Number(payload.freeReview.used ?? 0), limit: payload.freeReview.limit ?? null });
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const paidSteps = [
    { id: "workspace", title: "Create workspace", done: true, copy: "Organization workspace created.", href: undefined, actionLabel: undefined },
    { id: "details", title: "Add company & location details", done: locationCount > 0, copy: locationCount > 0 ? `${locationCount} location(s) assigned.` : "Add your primary business location.", href: "/app/settings?tab=locations", actionLabel: "Add details" },
    { id: "documents", title: "Upload 3 bills or contracts", done: docCount >= 3, copy: docCount >= 3 ? `${docCount} documents uploaded.` : `${docCount} of 3 uploaded. Add your recurring bills.`, href: "/app/bills?view=files", actionLabel: "Upload files" },
    { id: "review", title: "Review one invoice or contract", done: authoritativeReview, copy: authoritativeReview ? "At least one source record has an authorized review." : needsReviewInvoices > 0 ? `${needsReviewInvoices} invoice(s) waiting for human review.` : "Review one source record before calling activation complete.", href: "/app/bills?view=review", actionLabel: needsReviewInvoices > 0 ? "Review invoices" : "Open review" },
    { id: "monitoring", title: "Select first vendor to monitor", done: monitoredCount > 0, copy: monitoredCount > 0 ? `${monitoredCount} vendor(s) monitored.` : "Set up continuous monitoring for one vendor.", href: "/app/vendors", actionLabel: "Choose vendor" },
  ];
  const isFree = freeReview?.mode === "free";
  const freeUsed = freeReview?.used ?? docCount;
  const freeLimit = freeReview?.limit ?? 3;
  const freeSteps = [
    { id: "workspace", title: "Create workspace", done: true, copy: "Your private organization workspace is ready.", href: undefined, actionLabel: undefined },
    { id: "documents", title: `Use your ${freeLimit} free reviews`, done: freeUsed >= freeLimit, copy: freeUsed >= freeLimit ? `Your ${freeLimit}-document review is complete.` : `${freeUsed} of ${freeLimit} reviews used. Add the bills that matter most.`, href: "/app/bills?view=files", actionLabel: "Upload files" },
    { id: "review", title: "Review the evidence", done: authoritativeReview, copy: authoritativeReview ? "At least one source record has an authorized review." : needsReviewInvoices > 0 ? `${needsReviewInvoices} invoice(s) waiting for human review.` : "Open a source record to see the evidence behind a finding.", href: "/app/bills?view=review", actionLabel: needsReviewInvoices > 0 ? "Review invoices" : "Open review" },
    { id: "upgrade", title: "Choose your next level", done: false, copy: "Subscribe when you want ongoing monitoring, reports, and team controls.", href: "/pricing?from=workspace", actionLabel: "See paid plans" },
  ];
  const steps = isFree ? freeSteps : paidSteps;

  const completedCount = steps.filter((s) => s.done).length;

  return (
    <section className="portal-panel activation-panel workspace-progress-card">
      <div className="workspace-progress-card__header">
        <div>
          <h2>{isFree ? "Free review path" : "Activation Checklist"}</h2>
          <p>{isFree ? "Use the first three reviews to decide whether ongoing Costivra attention is useful for your team." : "Complete these steps to set up cost control and bill monitoring."}{durableState?.status === "blocked" ? " An administrator has paused activation." : ""}</p>
        </div>
        <span
          aria-label="Activation progress"
          aria-valuemax={steps.length}
          aria-valuemin={0}
          aria-valuenow={completedCount}
          aria-valuetext={`${completedCount} of ${steps.length} completed`}
          className="workspace-progress-card__status"
          data-complete={completedCount === steps.length || undefined}
          role="progressbar"
        >
          {completedCount} of {steps.length} completed
        </span>
      </div>
      <ol className="workspace-progress-card__steps">
        {steps.map((step, idx) => (
          <li key={step.id} data-complete={step.done || undefined}>
            <span className="workspace-progress-card__marker" aria-hidden="true">
              {step.done ? <Check size={14} /> : idx + 1}
            </span>
            <div className="workspace-progress-card__copy">
              <strong>{step.title}</strong>
              <span>{step.copy}</span>
            </div>
            {!step.done && step.href && (
              <Link className="button button-quiet button-sm workspace-progress-card__action" href={step.href}>
                {step.actionLabel} <ChevronRight size={14} />
              </Link>
            )}
          </li>
        ))}
      </ol>
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
  const searchParams = useSearchParams();
  const toast = useToast();
  const canWrite = data.currentUser.role !== "viewer";

  const documentMap = useMemo(() => new Map(data.documents.map((d) => [d.id, d])), [data.documents]);
  const invoiceByDocumentId = useMemo(() => new Map(data.invoices.map((invoice) => [invoice.documentId, invoice])), [data.invoices]);

  const reviewInvoices = useMemo(() => data.invoices.filter(
    (i) =>
      i.reviewStatus === "needs_review" ||
      i.vendorMatchStatus !== "exact" ||
      i.workspaceCustomerMatchStatus !== "matched" ||
      i.expenseAccountMatchStatus !== "matched" ||
      i.serviceLocationMatchStatus !== "matched" ||
      i.reconciliationStatus !== "reconciled" ||
      ["failed", "needs_review"].includes(documentMap.get(i.documentId)?.extractionStatus ?? "") ||
      ["quarantined", "scanning", "pending"].includes(documentMap.get(i.documentId)?.securityStatus ?? "")
  ), [data.invoices, documentMap]);

  const defaultView = initialView ?? (reviewInvoices.length > 0 ? "review" : "all");
  const [activeView, setActiveView] = useState(() => resolveBillsView(searchParams?.get("view"), defaultView));
  const [query, setQuery] = useState(() => searchParams?.get("q") ?? "");
  const [selectedVendorId, setSelectedVendorId] = useState(() => searchParams?.get("vendor") ?? "all");
  const [selectedAccountId, setSelectedAccountId] = useState(() => searchParams?.get("account") ?? "all");
  const [selectedLocationId, setSelectedLocationId] = useState(() => searchParams?.get("location") ?? "all");
  const [selectedStatus, setSelectedStatus] = useState(() => searchParams?.get("status") ?? "all");
  const [dateFrom, setDateFrom] = useState(() => searchParams?.get("from") ?? "");
  const [dateTo, setDateTo] = useState(() => searchParams?.get("to") ?? "");
  const [selectedDocumentType, setSelectedDocumentType] = useState(() => searchParams?.get("type") ?? "all");
  const [minAmountStr, setMinAmountStr] = useState(() => searchParams?.get("min") ?? "");
  const [maxAmountStr, setMaxAmountStr] = useState(() => searchParams?.get("max") ?? "");

  const amountMinimum = minAmountStr ? Number(minAmountStr) : Number.NEGATIVE_INFINITY;
  const amountMaximum = maxAmountStr ? Number(maxAmountStr) : Number.POSITIVE_INFINITY;

  const updateParams = (updates: Record<string, string | null>) => {
    if ("view" in updates) setActiveView(resolveBillsView(updates.view, defaultView));
    if ("q" in updates) setQuery(updates.q ?? "");
    if ("vendor" in updates) setSelectedVendorId(updates.vendor ?? "all");
    if ("account" in updates) setSelectedAccountId(updates.account ?? "all");
    if ("location" in updates) setSelectedLocationId(updates.location ?? "all");
    if ("status" in updates) setSelectedStatus(updates.status ?? "all");
    if ("from" in updates) setDateFrom(updates.from ?? "");
    if ("to" in updates) setDateTo(updates.to ?? "");
    if ("min" in updates) setMinAmountStr(updates.min ?? "");
    if ("max" in updates) setMaxAmountStr(updates.max ?? "");
    if ("type" in updates) setSelectedDocumentType(updates.type ?? "all");

    if (typeof window !== "undefined") {
      const next = new URL(window.location.href);
      for (const [key, value] of Object.entries(updates)) {
        if (value == null || value === "" || value === "all") next.searchParams.delete(key);
        else next.searchParams.set(key, value);
      }
      window.history.replaceState(null, "", next.pathname + (next.search ? next.search : ""));
    }
  };

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filtersClosing, setFiltersClosing] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);
  const filtersTriggerRef = useRef<HTMLButtonElement>(null);
  const filtersCloseTimerRef = useRef<number | null>(null);

  const handleTabChange = (view: string) => {
    updateParams({ view });
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
  const activeFilterCount = [Boolean(query), selectedVendorId !== "all", selectedAccountId !== "all", selectedLocationId !== "all", selectedStatus !== "all", Boolean(dateFrom), Boolean(dateTo), Boolean(searchParams?.get("min")), Boolean(searchParams?.get("max")), selectedDocumentType !== "all"].filter(Boolean).length;
  const hasFilters = activeFilterCount > 0;
  const clearFilters = () => updateParams({ q: null, vendor: null, account: null, location: null, status: null, from: null, to: null, min: null, max: null, type: null });
  const closeFilters = useCallback((restoreFocus = false) => {
    if (!filtersOpen || filtersClosing) return;
    setFiltersClosing(true);
    if (restoreFocus) {
      window.requestAnimationFrame(() => filtersTriggerRef.current?.focus());
    }
    filtersCloseTimerRef.current = window.setTimeout(() => {
      setFiltersOpen(false);
      setFiltersClosing(false);
      filtersCloseTimerRef.current = null;
    }, 160);
  }, [filtersClosing, filtersOpen]);
  useEffect(() => {
    if (!filtersOpen || filtersClosing) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!filtersRef.current?.contains(event.target as Node)) closeFilters();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        const target = event.target;
        if (
          target instanceof Element &&
          target.closest(".costivra-select-container.is-open, .costivra-date-picker-container.is-open")
        ) return;
        event.preventDefault();
        closeFilters(true);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeFilters, filtersClosing, filtersOpen]);
  useEffect(() => () => {
    if (filtersCloseTimerRef.current !== null) window.clearTimeout(filtersCloseTimerRef.current);
  }, []);
  const toggleFilters = () => {
    if (filtersClosing) return;
    if (filtersOpen) closeFilters();
    else setFiltersOpen(true);
  };

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
          <RecordOverflowMenu
            ariaLabel="More bill actions"
            items={[
              {
                id: "add-spend",
                label: "Add spend manually",
                icon: <Plus size={14} />,
                hidden: !canWrite,
                onSelect: onAddExpense,
              },
              {
                id: "upload-contract",
                label: "Upload contract",
                icon: <FileText size={14} />,
                hidden: !canWrite,
                onSelect: onAddContract,
              },
              {
                id: "export-bill-list",
                label: "Export bill list",
                icon: <Download size={14} />,
                separatorBefore: canWrite,
                onSelect: handleExportList,
              },
            ]}
          />
        }
      />

      <div className="bills-tab-toolbar">
        <WorkspaceViewTabs
          activeId={activeView}
          ariaLabel="Bills and spend views"
          onChange={handleTabChange}
          tabs={tabs.map((tab) => ({
            ...tab,
            countTone: tab.id === "review" ? "attention" : undefined,
          }))}
        />
        <div ref={filtersRef} className={`bills-filter-control${filtersOpen ? " is-open" : ""}`}>
          <button ref={filtersTriggerRef} type="button" className="bills-filter-trigger" aria-label={`Filter bills and spend${hasFilters ? ` (${activeFilterCount} active)` : ""}`} aria-controls="bills-filter-popover" aria-haspopup="dialog" aria-expanded={filtersOpen} onClick={toggleFilters}>
            <ListFilter size={16} aria-hidden="true" />
            {hasFilters && <span className="bills-filter-count">{activeFilterCount}</span>}
          </button>
          {(filtersOpen || filtersClosing) && <div id="bills-filter-popover" className={`bills-filter-popover${filtersClosing ? " is-closing" : ""}`} role="dialog" aria-label="Bills and spend filters">
            <header><div><strong>Filters</strong><small>Refine the records shown below.</small></div>{hasFilters && <button type="button" className="bills-filter-clear" onClick={clearFilters}>Clear all</button>}</header>
            <div className="bills-filter-grid">
              <label><span>Vendor</span><CostivraSelect autoFocus value={selectedVendorId} onChange={(value) => updateParams({ vendor: value === "all" ? null : value })} options={[{ value: "all", label: "All vendors" }, ...data.vendors.map((vendor) => ({ value: vendor.id, label: vendor.name }))]} /></label>
              <label><span>Account</span><CostivraSelect value={selectedAccountId} onChange={(value) => updateParams({ account: value === "all" ? null : value })} options={[{ value: "all", label: "All accounts" }, ...data.expenseAccounts.map((account) => ({ value: account.id, label: account.accountName ?? account.accountNumberLast4 ? `${account.accountName ?? "Account"}${account.accountNumberLast4 ? ` · …${account.accountNumberLast4}` : ""}` : "Vendor account" }))]} /></label>
              <label><span>Location</span><CostivraSelect value={selectedLocationId} onChange={(value) => updateParams({ location: value === "all" ? null : value })} options={[{ value: "all", label: "All locations" }, ...data.locations.map((location) => ({ value: location.id, label: location.name }))]} /></label>
              <label><span>Status</span><CostivraSelect value={selectedStatus} onChange={(value) => updateParams({ status: value === "all" ? null : value })} options={[{ value: "all", label: "All statuses" }, ...statusOptions.map((status) => ({ value: status, label: titleCase(status) }))]} /></label>
              <label><span>From</span><CostivraDatePicker value={dateFrom} onChange={(value) => updateParams({ from: value || null })} placeholder="Select start date" /></label>
              <label><span>To</span><CostivraDatePicker value={dateTo} onChange={(value) => updateParams({ to: value || null })} placeholder="Select end date" /></label>
              <label><span>Minimum amount</span><input type="number" min="0" step="0.01" value={searchParams?.get("min") ?? ""} onChange={(event) => updateParams({ min: event.target.value || null })} placeholder="Any" /></label>
              <label><span>Maximum amount</span><input type="number" min="0" step="0.01" value={searchParams?.get("max") ?? ""} onChange={(event) => updateParams({ max: event.target.value || null })} placeholder="Any" /></label>
              <label><span>Document type</span><CostivraSelect value={selectedDocumentType} onChange={(value) => updateParams({ type: value === "all" ? null : value })} options={[{ value: "all", label: "All document types" }, ...documentTypeOptions.map((type) => ({ value: type, label: titleCase(type) }))]} /></label>
            </div>
          </div>}
        </div>
      </div>

      {activeView === "review" && (
        <section className="portal-panel bills-directory">
          {filteredReviewInvoices.length ? (
            <div className="bills-table-wrap">
              <table className="portal-table bills-table">
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Bill / Invoice</th>
                    <th>Billing Period</th>
                    <th>Current Charges</th>
                    <th>Amount Due</th>
                    <th>Due Date</th>
                    <th>Account</th>
                    <th>Location</th>
                    <th>Review</th>
                  </tr>
                </thead>
                <tbody>
              {filteredReviewInvoices.map((inv) => {
                const doc = documentMap.get(inv.documentId);
                const reasons = getPlainLanguageReviewReasons(inv, doc?.status);
                return (
                  <tr key={inv.id}>
                    <td>
                      {inv.vendorId ? <Link className="record-link" href={`/app/vendors/${inv.vendorId}`} title={`Open ${inv.vendorName} workspace`}><strong>{inv.vendorName}</strong></Link> : <strong>{inv.vendorName}</strong>}
                    </td>
                    <td>
                      <Link className="record-link" href={`/app/bills/${inv.id}`}>
                        {inv.invoiceNumber ?? "Bill without invoice #"}
                      </Link>
                    </td>
                    <td>{displayPeriod(inv.servicePeriodStart, inv.servicePeriodEnd)}</td>
                    <td><strong>{inv.currentCharges != null ? money(inv.currentCharges) : "Not recorded"}</strong></td>
                    <td><strong>{inv.amountDue != null ? money(inv.amountDue) : "Not recorded"}</strong></td>
                    <td>{date(inv.dueDate)}</td>
                    <td>{inv.accountNumberLast4 ? `...${inv.accountNumberLast4}` : "Unassigned"}</td>
                    <td>{inv.locationName ?? "Not assigned"}</td>
                    <td>
                      <Link className="button button-quiet button-sm bills-review-link" href={`/app/bills/${inv.id}`}>
                        Review <ChevronRight size={14} />
                      </Link>
                      <span className="bills-review-reasons" title={reasons.join(" · ")}>{reasons.length} flag{reasons.length === 1 ? "" : "s"}</span>
                    </td>
                  </tr>
                );
              })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="Nothing needs review" copy="All current bills have cleared the available checks." />
          )}
          <footer className="bills-table-footer">
            <span>{filteredReviewInvoices.length} bill{filteredReviewInvoices.length === 1 ? "" : "s"}</span>
            <span>Review queue</span>
          </footer>
        </section>
      )}

      {activeView === "all" && (
        <section className="portal-panel bills-directory">
          {filteredAllInvoices.length ? (
            <div className="bills-table-wrap">
              <table className="portal-table bills-table">
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
          <footer className="bills-table-footer">
            <span>{filteredAllInvoices.length} bill{filteredAllInvoices.length === 1 ? "" : "s"}</span>
            <span>All bills</span>
          </footer>
        </section>
      )}

      {activeView === "spend" && (
        <section className="portal-panel bills-directory">
          <div className="portal-panel-heading">
            <div>
              <h2>Spend ledger</h2>
              <p>Normalized recurring charges from your connected source bills.</p>
            </div>
          </div>
          {filteredExpenses.length ? (
            <div className="bills-table-wrap">
              <table className="portal-table bills-table">
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
          <footer className="bills-table-footer">
            <span>{filteredExpenses.length} spend record{filteredExpenses.length === 1 ? "" : "s"}</span>
            <span>Spend ledger</span>
          </footer>
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
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(() => searchParams?.get("q") ?? "");
  const [activeView, setActiveView] = useState(() => resolveFindingView(searchParams?.get("view")));
  const updateParams = (updates: Record<string, string | null>) => {
    if ("view" in updates) setActiveView(resolveFindingView(updates.view));
    if ("q" in updates) setQuery(updates.q ?? "");
    if (typeof window !== "undefined") {
      const next = new URL(window.location.href);
      for (const [key, value] of Object.entries(updates)) {
        if (!value) next.searchParams.delete(key); else next.searchParams.set(key, value);
      }
      window.history.replaceState(null, "", next.pathname + (next.search ? next.search : ""));
    }
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
        scope={<PageScopeIndicator mode="global" />}
        action={
          <div className="vendor-list-controls">
            <label className="vendor-list-search">
              <Search size={16} strokeWidth={1.8} aria-hidden="true" />
              <span className="sr-only">Search findings or vendors</span>
              <input
                type="search"
                value={query}
                onChange={(event) => updateParams({ q: event.target.value || null })}
                placeholder="Search findings or vendors…"
                aria-label="Search findings or vendors"
              />
            </label>
          </div>
        }
      />
      <WorkspaceViewTabs
        activeId={activeView}
        ariaLabel="Finding views"
        onChange={(id) => updateParams({ view: id })}
        tabs={([
          ["review", "Needs Review"],
          ["evidence_backed", "Evidence Backed"],
          ["needs_evidence", "Needs Evidence"],
          ["dismissed", "Dismissed"],
        ] as const).map(([id, label]) => ({
          id,
          label,
          count: counts[id],
          countTone: id === "review" || id === "needs_evidence" ? "attention" as const : undefined,
        }))}
      />
      <section className="portal-panel vendor-directory findings-directory">
        {filtered.length ? (
          <div className="table-wrap vendor-table-wrap">
            <table className="portal-table vendor-table findings-table">
              <colgroup>
                <col className="findings-col-title" /><col className="findings-col-vendor" /><col className="findings-col-source" /><col className="findings-col-trust" /><col className="findings-col-evidence" /><col className="findings-col-value" /><col className="findings-col-status" /><col className="findings-col-action" />
              </colgroup>
              <thead><tr><th>Finding</th><th>Vendor &amp; scope</th><th>Source bill</th><th>Trust</th><th>Evidence</th><th>Potential annual value</th><th>Status</th><th><span className="sr-only">Update status</span></th></tr></thead>
              <tbody>
                {filtered.map((item) => {
                  const invoice = data.invoices.find((candidate) => candidate.documentId === item.sourceDocumentId);
                  const expense = data.expenses.find((candidate) => candidate.id === item.sourceExpenseId);
                  const sourceId = invoice?.id ?? expense?.invoiceId ?? expense?.documentId;
                  return <tr id={item.id} key={item.id}>
                    <td><Link className="record-link" href={`/app/findings/${item.id}`}><strong>{item.title}</strong></Link><small>{item.summary}</small></td>
                    <td>{item.vendorId ? <Link className="record-link" href={`/app/vendors/${item.vendorId}`}><strong>{item.vendorName}</strong></Link> : <strong>{item.vendorName}</strong>}<small>{item.expenseAccountReference ?? "Account not assigned"} · {item.locationName ?? "Location not assigned"}</small></td>
                    <td>{sourceId ? <Link className="record-link" href={`/app/bills/${sourceId}`}>Open bill</Link> : <span className="workspace-secondary-text">Not linked</span>}</td>
                    <td><TrustBadge state={item.trustState} /></td><td>{item.evidenceCount} reference{item.evidenceCount === 1 ? "" : "s"}</td>
                    <td><strong>{item.monetaryClaimAllowed && item.estimatedAnnualValue != null ? money(item.estimatedAnnualValue) : "Not shown"}</strong></td>
                    <td><Status value={item.status} /></td><td><CostivraSelect aria-label={`Update ${item.title} status`} value={item.status} variant="badge" size="sm" onChange={(newStatus) => void update(item.id, newStatus)} options={findingStatusOptions(item)} /></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title={activeView === "needs_evidence" ? "No findings need evidence" : "No findings match"}
            copy="Try a broader search or upload new source documents."
          />
        )}
        <footer className="vendor-table-footer"><span>{filtered.length} {filtered.length === 1 ? "finding" : "findings"}</span><div className="vendor-table-footer-pagination" aria-label="Finding table pagination"><button type="button" disabled aria-label="Previous page"><ChevronLeft size={15} /></button><span>1 / 1</span><button type="button" disabled aria-label="Next page"><ChevronRight size={15} /></button></div></footer>
      </section>
    </>
  );
}
function Contracts({ data }: { data: PortalData }) {
  const searchParams = useSearchParams();
  const [activeView, setActiveView] = useState(() => resolveContractView(searchParams?.get("view")));
  const updateParams = (updates: Record<string, string | null>) => {
    if ("view" in updates) setActiveView(resolveContractView(updates.view));
    if (typeof window !== "undefined") {
      const next = new URL(window.location.href);
      for (const [key, value] of Object.entries(updates)) {
        if (!value) next.searchParams.delete(key); else next.searchParams.set(key, value);
      }
      window.history.replaceState(null, "", next.pathname + (next.search ? next.search : ""));
    }
  };
  const rows = data.contracts.filter((contract) => {
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
      />
      <WorkspaceViewTabs
        activeId={activeView}
        ariaLabel="Contract views"
        onChange={(id) => updateParams({ view: id })}
        tabs={([
          ["upcoming", "Upcoming"],
          ["all", "All Contracts"],
          ["needs_details", "Needs Details"],
          ["expired", "Expired"],
        ] as const).map(([id, label]) => ({
          id,
          label,
          count: counts[id],
          countTone: id === "upcoming" || id === "needs_details" ? "attention" as const : undefined,
        }))}
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
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(() => searchParams?.get("q") ?? "");
  const [activeView, setActiveView] = useState(() => resolveActionView(searchParams?.get("view")));
  const updateParams = (updates: Record<string, string | null>) => {
    if ("view" in updates) setActiveView(resolveActionView(updates.view));
    if ("q" in updates) setQuery(updates.q ?? "");
    if (typeof window !== "undefined") {
      const next = new URL(window.location.href);
      for (const [key, value] of Object.entries(updates)) {
        if (!value) next.searchParams.delete(key); else next.searchParams.set(key, value);
      }
      window.history.replaceState(null, "", next.pathname + (next.search ? next.search : ""));
    }
  };
  const [executingId, setExecutingId] = useState<string | null>(null);
  const execute = async (id: string, operation: string) => {
    setExecutingId(id);
    try {
      await run(
        () =>
          api(`/api/portal/actions/${id}`, {
            method: "PATCH",
            body: { operation },
          }),
        actionOperationConfirmation(operation),
      );
    } finally {
      setExecutingId(null);
    }
  };
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
        scope={<PageScopeIndicator mode="global" />}
      />
      <WorkspaceViewTabs
        activeId={activeView}
        ariaLabel="Action views"
        onChange={(id) => updateParams({ view: id })}
        tabs={([
          ["approval", "Needs Approval"],
          ["assigned", "Assigned to Me"],
          ["in_progress", "In Progress"],
          ["completed", "Completed"],
        ] as const).map(([id, label]) => ({
          id,
          label,
          count: counts[id],
          countTone: id === "approval" ? "attention" as const : undefined,
        }))}
      />
      <Toolbar query={query} setQuery={(value) => updateParams({ q: value || null })} placeholder="Search actions, findings, or vendors" />
      <div className="portal-card-grid">
        {filtered.map((item) => {
          const finding = data.opportunities.find((candidate) => candidate.id === item.opportunityId);
          const invoice = finding?.sourceDocumentId ? data.invoices.find((candidate) => candidate.documentId === finding.sourceDocumentId) : undefined;
          const expense = finding?.sourceExpenseId ? data.expenses.find((candidate) => candidate.id === finding.sourceExpenseId) : undefined;
          const sourceId = invoice?.id ?? expense?.invoiceId ?? expense?.documentId;
          const isItemBusy = executingId === item.id;
          return (
          <article className="portal-card action-card workspace-work-item-card" key={item.id}>
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
                    disabled={isItemBusy}
                    onClick={() => void execute(item.id, "decline")}
                  >
                    Decline
                  </button>
                  <button
                    className="button button-primary"
                    disabled={isItemBusy}
                    onClick={() => void execute(item.id, "approve")}
                  >
                    {isItemBusy ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />} Approve
                  </button>
                </> : <span className="action-approval-waiting">{item.currentUserDecision === "approved" ? "Your approval is recorded. Waiting for the remaining approver." : "This decision is assigned to another administrator."}</span>
              )}
              {item.status === "approved" && (
                <button
                  className="button button-primary"
                  disabled={isItemBusy}
                  onClick={() => void execute(item.id, "start")}
                >
                  {isItemBusy ? <LoaderCircle size={16} className="spin" /> : null} Start work
                </button>
              )}
            {item.status === "in_progress" && (
                <button
                  className="button button-primary"
                  disabled={isItemBusy}
                  onClick={() => void execute(item.id, "complete")}
                >
                  {isItemBusy ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />} Mark complete
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

const DEFAULT_REPORT_PREFERENCES = { immediate_finding_alerts: true, review_alerts: true, approval_requests: true, missed_bill_alerts: true, weekly_digest: true, monthly_executive_report: true, allow_empty_reports: false } as const;

function ResultsWorkspace({ data, initialView = "verified" }: { data: PortalData; initialView?: "verified" | "in_progress" | "reports" | "summary" }) {
  const searchParams = useSearchParams();
  const toast = useToast();
  const [schedules, setSchedules] = useState<Array<{ id: string; report_definition_id: string; status: string; cadence: string; timezone?: string; weekday?: number | null; day_of_month?: number | null; send_time_local?: string; recipient_emails: string[]; next_run_at: string | null }>>([]);
  const [deliveryRuns, setDeliveryRuns] = useState<Array<{ id: string; report_definition_id: string; report_schedule_id: string | null; delivery_key?: string | null; scheduled_for: string; status: string; provider_message_id: string | null; generated_at: string | null; completed_at: string | null; safe_error: string | null; report_name: string; recipients?: Array<{ id: string; email: string; status: string; safe_error: string | null; sent_at: string | null; completed_at: string | null }> }>>([]);
  const [reportPreferences, setReportPreferences] = useState({ ...DEFAULT_REPORT_PREFERENCES });
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [scheduleReportId, setScheduleReportId] = useState<string | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [sendingReportId, setSendingReportId] = useState<string | null>(null);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportLoadError, setReportLoadError] = useState<string | null>(null);
  const [reportsReloadToken, setReportsReloadToken] = useState(0);
  const [activeView, setActiveView] = useState(() => resolveResultsView(searchParams?.get("view"), initialView));
  const updateView = (view: string) => {
    const nextView = resolveResultsView(view, initialView);
    setActiveView(nextView);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("view", nextView);
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  };
  const verified = data.savings.filter(resultIsVerified).reduce((sum, item) => sum + item.amount, 0);
  const inProgress = data.savings.filter(resultIsInProgress);
  const potentialValue = totalCustomerVisibleFindingValue(data.opportunities);
  const actionsInProgress = data.actions.filter(actionIsInProgress).length;
  const renewalsApproaching = data.contracts.filter((contract) => isUpcomingContract(contract)).length;
  useEffect(() => {
    if (activeView !== "reports") return;
    let cancelled = false;
    const loadReportControls = async () => {
      setReportsLoading(true);
      setReportLoadError(null);
      try {
        const [schedulesResponse, deliveriesResponse, preferencesResponse] = await Promise.all([
          fetch("/api/portal/reports/schedules"),
          fetch("/api/portal/reports/deliveries"),
          fetch("/api/portal/reports/preferences"),
        ]);
        if (!schedulesResponse.ok || !deliveriesResponse.ok || !preferencesResponse.ok) {
          throw new Error("Report controls could not be loaded.");
        }
        const [schedulesPayload, deliveriesPayload, preferencesPayload] = await Promise.all([
          schedulesResponse.json() as Promise<{ schedules?: typeof schedules }>,
          deliveriesResponse.json() as Promise<{ deliveries?: typeof deliveryRuns }>,
          preferencesResponse.json() as Promise<{ preferences?: typeof reportPreferences }>,
        ]);
        if (cancelled) return;
        setSchedules(schedulesPayload.schedules ?? []);
        setDeliveryRuns(deliveriesPayload.deliveries ?? []);
        setReportPreferences(preferencesPayload.preferences ?? DEFAULT_REPORT_PREFERENCES);
      } catch {
        if (!cancelled) {
          setSchedules([]);
          setDeliveryRuns([]);
          setReportLoadError("Report schedules, delivery history, or preferences could not be loaded. Try again before changing report settings.");
        }
      } finally {
        if (!cancelled) setReportsLoading(false);
      }
    };
    void loadReportControls();
    return () => { cancelled = true; };
  }, [activeView, reportsReloadToken]);
  const updateReportPreference = async (key: keyof typeof reportPreferences, value: boolean) => {
    const next = { ...reportPreferences, [key]: value }; setReportPreferences(next); setSavingPreferences(true);
    const response = await fetch("/api/portal/reports/preferences", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(next) });
    setSavingPreferences(false); if (!response.ok) { setReportPreferences(reportPreferences); toast.error("Preference could not be saved", "Try again or ask a workspace administrator."); }
  };
  const toggleSchedule = async (scheduleId: string, status: "active" | "paused") => {
    const response = await fetch(`/api/portal/reports/schedules/${scheduleId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) });
    const payload = await response.json().catch(() => ({})) as { schedule?: typeof schedules[number]; error?: string };
    if (!response.ok || !payload.schedule) { toast.error("Schedule could not be updated", payload.error || "Try again shortly."); return; }
    setSchedules((current) => current.map((item) => item.id === scheduleId ? { ...item, status: payload.schedule?.status ?? status, next_run_at: payload.schedule?.next_run_at ?? null } : item));
  };
  const emailReportNow = async (reportId: string) => {
    setSendingReportId(reportId);
    const response = await fetch(`/api/portal/reports/${reportId}/email`, { method: "POST" });
    const payload = await response.json().catch(() => ({})) as { error?: string };
    setSendingReportId(null);
    if (!response.ok) toast.error("Report could not be sent", payload.error || "Try again shortly."); else toast.success("Report sent", "It was sent to your authorized workspace email.");
  };
  return (
    <>
      <PageHeader
        title="Results"
        description="See verified value, work still in progress, and reports across all vendor relationships."
        scope={<PageScopeIndicator mode="global" />}
      />
      <WorkspaceViewTabs
        activeId={activeView}
        ariaLabel="Results views"
        onChange={updateView}
        tabs={[
          { id: "verified", label: "Verified Value", count: data.savings.filter(resultIsVerified).length },
          { id: "in_progress", label: "In Progress", count: inProgress.length },
          { id: "reports", label: "Reports", count: data.reports.length },
          { id: "summary", label: "Executive Summary" },
        ]}
      />
      {activeView === "verified" && <section className="portal-panel">
        <div className="portal-panel-heading"><div><h2>Verified value</h2><p>Only results supported by an accepted method and later source evidence appear here.</p></div><strong className="money-value">{money(verified, true)}</strong></div>
        {data.savings.filter(resultIsVerified).length ? <div className="portal-list">{data.savings.filter(resultIsVerified).map((item) => <div className="portal-list-row savings-workflow-row" key={item.id}><CheckCircle2 /><div className="grow"><Link className="record-link" href={`/app/results/${item.id}`}><strong>{item.title}</strong></Link><span>{item.method} · Verified {date(item.verifiedAt)}</span><small>Baseline {item.baselineAmount == null ? "not recorded" : money(item.baselineAmount)} · Later comparison {item.comparisonAmount == null ? "not recorded" : money(item.comparisonAmount)}</small></div><strong className="money-value">{money(item.amount)}</strong><Status value="verified" /></div>)}</div> : <Empty title="No verified value yet" copy="Verified results will appear after a baseline and later source evidence are reviewed." />}
      </section>}
      {activeView === "in_progress" && <section className="portal-panel">
        <div className="portal-panel-heading"><div><h2>Results in progress</h2><p>These values are not verified yet. Each row shows what evidence is still missing.</p></div></div>
        {inProgress.length ? <div className="portal-list">{inProgress.map((item) => <div className="portal-list-row savings-workflow-row" key={item.id}><CircleDollarSign /><div className="grow"><Link className="record-link" href={`/app/results/${item.id}`}><strong>{item.title}</strong></Link><span>{resultNeedsVerificationReview(item) ? "Verification evidence is incomplete" : item.status === "baseline_review" ? "Baseline awaiting acceptance" : item.comparisonAmount == null ? "Awaiting comparison" : "Awaiting verification"}</span><small>{resultNeedsVerificationReview(item) ? "Does not count as verified until baseline, comparison, method, and calculation evidence are recorded." : `Potential result only · Method: ${item.method}`}</small></div><strong className="money-value">{resultNeedsVerificationReview(item) ? "Not verified" : money(item.amount)}</strong><Status value={resultVerificationStatus(item)} /></div>)}</div> : <Empty title="No results in progress" copy="Accepted baselines and pending comparisons will appear here." />}
      </section>}
      {activeView === "reports" && <section className="portal-panel reports-surface">
        <div className="portal-panel-heading"><div><h2>Reports</h2><p>Send evidence-backed summaries to people already authorized in this workspace.</p></div></div>
        {reportsLoading && <p className="muted" role="status">Loading report schedules and delivery history…</p>}
        {reportLoadError && <div className="form-error" role="alert"><Info size={16} /><span>{reportLoadError}</span><button type="button" className="button button-secondary" onClick={() => setReportsReloadToken((current) => current + 1)}>Try again</button></div>}
        <div className="portal-card-grid">{data.reports.map((item) => <article className="portal-card" key={item.id}><FileText className="card-icon" /><h2>{item.name}</h2><p>{item.description}</p><small>{item.lastGeneratedAt ? `Last generated ${date(item.lastGeneratedAt)}` : "Not generated yet"}</small><footer><a className="button button-primary" href={`/api/portal/reports/${item.id}`}><Download size={16} /> Download</a><button className="button button-secondary" type="button" onClick={() => void emailReportNow(item.id)} disabled={sendingReportId === item.id}><Mail size={16} /> {sendingReportId === item.id ? "Sending…" : "Email now"}</button><button className="button button-secondary" type="button" onClick={() => { setEditingScheduleId(null); setScheduleReportId(item.id); }}><CalendarClock size={16} /> Schedule</button></footer><div className="report-delivery-history">{schedules.filter((schedule) => schedule.report_definition_id === item.id).map((schedule) => <div key={schedule.id}><small>Scheduled {schedule.cadence} · next {schedule.next_run_at ? date(schedule.next_run_at) : "paused"} · {schedule.status}</small><button type="button" className="button button-secondary" onClick={() => { setEditingScheduleId(schedule.id); setScheduleReportId(item.id); }} aria-label={`Edit ${item.name} schedule`}>Edit</button><button type="button" className="button button-secondary" onClick={() => void toggleSchedule(schedule.id, schedule.status === "active" ? "paused" : "active")}>{schedule.status === "active" ? "Pause" : "Resume"}</button></div>)}</div></article>)}</div>
        {!reportLoadError && !reportsLoading && <>
          <section className="portal-panel report-preferences-panel"><div className="portal-panel-heading"><div><h2>Communication preferences</h2><p>Account-critical messages remain on. These controls manage recurring report noise.</p></div><small>{savingPreferences ? "Saving…" : "Workspace administrators can change these."}</small></div><div className="report-preferences-grid">{([ ["immediate_finding_alerts", "Immediate finding alerts"], ["review_alerts", "Review alerts"], ["approval_requests", "Approval requests"], ["missed_bill_alerts", "Missed-bill alerts"], ["weekly_digest", "Weekly digest"], ["monthly_executive_report", "Monthly executive report"], ["allow_empty_reports", "Send empty reports"] ] as Array<[keyof typeof reportPreferences, string]>).map(([key, label]) => <label key={key}><input type="checkbox" checked={reportPreferences[key]} onChange={(event) => void updateReportPreference(key, event.target.checked)} /><span>{label}</span></label>)}</div></section>
          <section className="portal-panel report-preferences-panel"><div className="portal-panel-heading"><div><h2>Delivery history</h2><p>See whether a scheduled or manual report was accepted, delivered, skipped, or needs attention.</p></div><small>{deliveryRuns.length ? `${deliveryRuns.length} recent run${deliveryRuns.length === 1 ? "" : "s"}` : "No runs yet"}</small></div>{deliveryRuns.length ? <div className="portal-list report-delivery-list">{deliveryRuns.map((run) => <div className="portal-list-row" key={run.id}><FileText size={16} /><div className="grow"><strong>{run.report_name}</strong><span>{run.report_schedule_id ? "Scheduled" : "Email now"} {date(run.scheduled_for)}{run.completed_at ? ` · completed ${date(run.completed_at)}` : ""}</span>{run.safe_error && <small>{run.safe_error}</small>}{run.recipients?.length ? <div className="report-delivery-recipients">{run.recipients.map((recipient) => <span key={recipient.id}><strong>{recipient.email}</strong><Status value={recipient.status} />{recipient.safe_error && <small>{recipient.safe_error}</small>}</span>)}</div> : null}</div><Status value={run.status} /></div>)}</div> : <Empty title="No delivery runs yet" copy="Scheduled and manual report attempts will appear here after the first send." />}</section>
        </>}
        {!data.reports.length && <Empty title="No reports configured" copy="Report definitions created for this organization will appear here." />}
      </section>}
      {scheduleReportId && <ReportScheduleSheet reportId={scheduleReportId} reportName={data.reports.find((report) => report.id === scheduleReportId)?.name ?? "Report"} initialSchedule={schedules.find((schedule) => schedule.id === editingScheduleId)} onClose={() => { setScheduleReportId(null); setEditingScheduleId(null); }} onSaved={(schedule) => { setSchedules((current) => current.some((item) => item.id === schedule.id) ? current.map((item) => item.id === schedule.id ? { ...item, ...schedule } : item) : [schedule, ...current]); setScheduleReportId(null); setEditingScheduleId(null); toast.success("Schedule saved", "The next report run is queued for the selected window."); }} />}
      {activeView === "summary" && <>
        <div className="portal-metrics"><Metric label="Recorded spend" value={money(data.vendors.reduce((sum, item) => sum + item.annualizedSpend, 0), true)} note="Annualized vendor relationship records" icon={<ReceiptText />} /><Metric label="Potential value" value={money(potentialValue, true)} note="Rule-based estimate, not verified" icon={<CircleDollarSign />} /><Metric label="Actions in progress" value={String(actionsInProgress)} note="Active work items" icon={<CalendarClock />} /><Metric label="Verified value" value={money(verified, true)} note="Supported by later source evidence" icon={<ShieldCheck />} /></div>
        <section className="portal-panel"><div className="portal-panel-heading"><div><h2>Executive summary</h2><p>A concise operating view across all vendor relationships.</p></div></div><dl className="record-summary-list"><div><dt>Recorded spend</dt><dd>{money(data.vendors.reduce((sum, item) => sum + item.annualizedSpend, 0), true)}</dd></div><div><dt>Potential value</dt><dd>{money(potentialValue, true)} <small>Estimate only</small></dd></div><div><dt>Actions in progress</dt><dd>{actionsInProgress}</dd></div><div><dt>Verified value</dt><dd>{money(verified, true)}</dd></div><div><dt>Renewals approaching</dt><dd>{renewalsApproaching}</dd></div></dl></section>
      </>}
    </>
  );
}

function ReportScheduleSheet({ reportId, reportName, initialSchedule, onClose, onSaved }: { reportId: string; reportName: string; initialSchedule?: { id: string; cadence: string; timezone?: string; weekday?: number | null; day_of_month?: number | null; send_time_local?: string; recipient_emails: string[] }; onClose: () => void; onSaved: (schedule: { id: string; report_definition_id: string; status: string; cadence: string; timezone: string; weekday: number | null; day_of_month: number | null; send_time_local: string; recipient_emails: string[]; next_run_at: string | null }) => void }) {
  const [cadence, setCadence] = useState<"weekly" | "monthly">(initialSchedule?.cadence === "monthly" ? "monthly" : "weekly");
  const [recipientEmails, setRecipientEmails] = useState(initialSchedule?.recipient_emails.join(", ") || "");
  const [weekday, setWeekday] = useState(String(initialSchedule?.weekday ?? 1));
  const [dayOfMonth, setDayOfMonth] = useState(String(initialSchedule?.day_of_month ?? 1));
  const [sendTimeLocal, setSendTimeLocal] = useState(initialSchedule?.send_time_local?.slice(0, 5) || "08:00");
  const [timezone, setTimezone] = useState(initialSchedule?.timezone || "America/Chicago");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError(null);
    const response = await fetch(initialSchedule?.id ? `/api/portal/reports/schedules/${initialSchedule.id}` : "/api/portal/reports/schedules", { method: initialSchedule?.id ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reportDefinitionId: reportId, cadence, recipientEmails: recipientEmails.split(",").map((value) => value.trim()).filter(Boolean), weekday: Number(weekday), dayOfMonth: Number(dayOfMonth), sendTimeLocal, timezone, status: "active" }) });
    const payload = await response.json().catch(() => ({})) as { error?: string; id?: string; nextRunAt?: string; schedule?: Record<string, unknown> };
    setSaving(false); const saved = (payload.schedule ?? payload) as Record<string, unknown>; if (!response.ok || typeof saved.id !== "string") { setError(payload.error || "The schedule could not be saved."); return; }
    onSaved({ id: saved.id, report_definition_id: reportId, status: typeof saved.status === "string" ? saved.status : "active", cadence: typeof saved.cadence === "string" ? saved.cadence : cadence, timezone: typeof saved.timezone === "string" ? saved.timezone : timezone, weekday: typeof saved.weekday === "number" ? saved.weekday : cadence === "weekly" ? Number(weekday) : null, day_of_month: typeof saved.day_of_month === "number" ? saved.day_of_month : cadence === "monthly" ? Number(dayOfMonth) : null, send_time_local: typeof saved.send_time_local === "string" ? saved.send_time_local : sendTimeLocal, recipient_emails: Array.isArray(saved.recipient_emails) ? saved.recipient_emails as string[] : recipientEmails.split(",").map((value) => value.trim()).filter(Boolean), next_run_at: typeof saved.next_run_at === "string" ? saved.next_run_at : payload.nextRunAt ?? null });
  };
  return <div className="portal-sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="portal-sheet" role="dialog" aria-modal="true" aria-labelledby="report-schedule-title"><header className="portal-sheet-header"><div><span className="eyebrow">{initialSchedule?.id ? "Edit report schedule" : "Report schedule"}</span><h2 id="report-schedule-title">{reportName}</h2></div><button type="button" className="icon-button" aria-label="Close schedule" onClick={onClose}><X size={18} /></button></header><form className="portal-sheet-body" onSubmit={submit}><p className="muted">Reports go only to authorized members of this Costivra workspace. No outside recipients can be added.</p><label><span>Cadence</span><select value={cadence} onChange={(event) => setCadence(event.target.value as "weekly" | "monthly")}><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label>{cadence === "weekly" ? <label><span>Weekday</span><select value={weekday} onChange={(event) => setWeekday(event.target.value)}><option value="0">Sunday</option><option value="1">Monday</option><option value="2">Tuesday</option><option value="3">Wednesday</option><option value="4">Thursday</option><option value="5">Friday</option><option value="6">Saturday</option></select></label> : <label><span>Day of month</span><input type="number" min="1" max="28" value={dayOfMonth} onChange={(event) => setDayOfMonth(event.target.value)} /></label>}<label><span>Time</span><input type="time" value={sendTimeLocal} onChange={(event) => setSendTimeLocal(event.target.value)} /></label><label><span>Timezone</span><input value={timezone} onChange={(event) => setTimezone(event.target.value)} /></label><label><span>Authorized recipient emails</span><input required value={recipientEmails} onChange={(event) => setRecipientEmails(event.target.value)} placeholder="you@company.com" /><small>Separate multiple workspace member emails with commas.</small></label>{error && <p className="form-error" role="alert">{error}</p>}<footer className="portal-sheet-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? "Saving…" : "Save schedule"}</button></footer></form></section></div>;
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

type VendorFilter = "all" | "attention" | "active" | "monitored" | "inactive";

const vendorFilterOptions: Array<{ value: VendorFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "attention", label: "Needs attention" },
  { value: "active", label: "Active" },
  { value: "monitored", label: "Monitored" },
  { value: "inactive", label: "Inactive" },
];

function VendorFilters({ value, onChange }: { value: VendorFilter; onChange: (value: VendorFilter) => void }) {
  const [open, setOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!filterRef.current?.contains(event.target as Node)) close();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(true);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [close, open]);

  return (
    <div ref={filterRef} className={`vendor-filter-control${open ? " is-open" : ""}`}>
      <button
        ref={triggerRef}
        className="vendor-filter-trigger"
        type="button"
        aria-label="Filter vendors"
        aria-controls="vendor-status-filters"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <ListFilter size={16} strokeWidth={1.8} aria-hidden="true" />
      </button>
      <div id="vendor-status-filters" className="vendor-filter-menu" role="group" aria-labelledby="vendor-filter-menu-heading">
        <div id="vendor-filter-menu-heading" className="vendor-filter-menu-heading">Filter vendors</div>
        {vendorFilterOptions.map((option) => (
          <button
            key={option.value}
            className={`vendor-filter-option${value === option.value ? " is-active" : ""}`}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => {
              onChange(option.value);
              close(true);
            }}
          >
            <span className="vendor-filter-option-check" aria-hidden="true" />
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Vendors({ data }: { data: PortalData }) {
  const [filter, setFilter] = useState<VendorFilter>("all");
  const [query, setQuery] = useState("");

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
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return enrichedVendors
      .filter(({ vendor, details, latestExpense, nextContractEnd }: EnrichedItem) => {
        if (normalizedQuery) {
          const searchableText = [
            vendor.name,
            vendor.category,
            vendor.website,
            vendor.relationshipStatus,
            vendor.monitoringState,
            latestExpense?.periodStart,
            latestExpense?.periodEnd,
            latestExpense?.periodEnd ? date(latestExpense.periodEnd) : null,
            nextContractEnd,
            nextContractEnd ? date(nextContractEnd) : null,
          ].filter(Boolean).join(" ").toLocaleLowerCase();
          if (!searchableText.includes(normalizedQuery)) return false;
        }
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
  }, [enrichedVendors, filter, query]);

  return (
    <>
      <PageHeader
        title="Vendors"
        description="Every supplier relationship, its source records, and the next important date."
        action={
          <div className="vendor-list-controls">
            <label className="vendor-list-search">
              <Search size={16} strokeWidth={1.8} aria-hidden="true" />
              <span className="sr-only">Search vendors, categories, and dates</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search vendors, categories, dates…"
                aria-label="Search vendors, categories, and dates"
              />
            </label>
            <VendorFilters value={filter} onChange={setFilter} />
          </div>
        }
      />
      <section className="portal-panel vendor-directory">
        {filteredAndSorted.length ? (
          <div className="table-wrap vendor-table-wrap">
            <table className="portal-table vendor-table">
              <colgroup>
                <col className="vendor-col-name" />
                <col className="vendor-col-category" />
                <col className="vendor-col-spend" />
                <col className="vendor-col-accounts" />
                <col className="vendor-col-latest" />
                <col className="vendor-col-monitoring" />
                <col className="vendor-col-attention" />
                <col className="vendor-col-contract" />
                <col className="vendor-col-relationship" />
                <col className="vendor-col-action" />
              </colgroup>
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
                            <small className="workspace-secondary-text">
                              {date(latestExpense.periodEnd)}
                            </small>
                          </div>
                        ) : (
                          <span className="workspace-secondary-text">None recorded</span>
                        )}
                      </td>
                      <td>
                        <Status value={vendor.monitoringState ?? "not_set_up"} />
                      </td>
                      <td>
                        {details.reasons.length ? (
                          <WorkspaceStatusBadge withDot className="workspace-inline-state workspace-inline-state--attention">
                            {details.reasons[0]}
                          </WorkspaceStatusBadge>
                        ) : (
                          <WorkspaceStatusBadge withDot className="workspace-inline-state workspace-inline-state--healthy">Healthy</WorkspaceStatusBadge>
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
        <footer className="vendor-table-footer">
          <span>{filteredAndSorted.length} {filteredAndSorted.length === 1 ? "vendor" : "vendors"}</span>
          <div className="vendor-table-footer-pagination" aria-label="Vendor table pagination">
            <button type="button" disabled aria-label="Previous page"><ChevronLeft size={15} /></button>
            <span>1 / 1</span>
            <button type="button" disabled aria-label="Next page"><ChevronRight size={15} /></button>
          </div>
        </footer>
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
  const { openInspector } = useBillInspector();
  const vendor = data.vendors.find((item) => item.id === vendorId);
  const requestedAccount = searchParams?.get("account");
  const requestedTab = resolveVendorDetailTab(searchParams?.get("tab"));
  const activeTab = requestedTab;
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
  const workspaceCurrency = resolveRecordDetailCurrency(data.organization.currency);

  // Edit form state
  const [displayNameOverride, setDisplayNameOverride] = useState(vendor?.displayNameOverride ?? "");
  const [categoryOverride, setCategoryOverride] = useState(vendor?.categoryOverride ?? "");
  const [websiteOverride, setWebsiteOverride] = useState(vendor?.websiteOverride ?? "");
  const [relationshipStatus, setRelationshipStatus] = useState(vendor?.relationshipStatus ?? "active");
  const [annualizedSpend, setAnnualizedSpend] = useState(vendor?.annualizedSpend?.toString() ?? "0");
  const [spendCadence, setSpendCadence] = useState(vendor?.spendCadence ?? "monthly");

  const handleTabChange = useCallback((tab: string) => {
    const nextTab = resolveVendorDetailTab(tab);
    router.replace(
      getVendorDetailTabHref(vendorId, nextTab, searchParams?.toString() ?? ""),
      { scroll: false },
    );
  }, [router, searchParams, vendorId]);

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

  const vendorMoney = (value: number, compact = false) => money(value, compact, workspaceCurrency);
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
  const invoices = data.invoices
    .filter((item) => item.vendorId === vendorId)
    .sort((a, b) => String(b.invoiceDate ?? "").localeCompare(String(a.invoiceDate ?? "")));
  const contracts = data.contracts
    .filter((item) => item.vendorId === vendorId)
    .sort((a, b) =>
      String(a.endDate ?? "9999").localeCompare(String(b.endDate ?? "9999")),
    );
  const documents = data.documents.filter((item) => item.vendorId === vendorId);
  const vendorAccounts = data.expenseAccounts.filter(
    (item) => item.vendorId === vendorId || item.relationshipId === vendor.relationshipId,
  );
  const opportunities = data.opportunities.filter(
    (item) => item.vendorId === vendorId,
  );
  const actions = data.actions.filter((item) => item.vendorId === vendorId);
  const vendorSavings = data.savings.filter((s) => s.opportunityId && opportunities.some((o) => o.id === s.opportunityId));
  const contract = contracts[0];
  const latest = expenses[0];
  const rawMonitoringState = monitoring?.state ?? ((vendor as unknown as Record<string, unknown>).monitoringState as MonitoringState | undefined) ?? "not_set_up";
  const monitoringState = getMonitoringStateLabel(rawMonitoringState);
  const pendingReviewCount = invoices.filter((invoice) => invoice.reviewStatus === "needs_review").length;
  const hasPendingReviewInvoice = pendingReviewCount > 0;
  const hasOpenFinding = opportunities.some((o) => !["closed", "declined"].includes(o.status));
  const hasPendingAction = actions.some((a) => !["complete", "cancelled"].includes(a.status));
  const inferredVendorAccounts = groupVendorInvoicesByAccount(invoices);
  const vendorAccountCount = vendorAccounts.length || inferredVendorAccounts.length || 1;

  const vendorDocumentIds = getChronologicalBillDocumentIds(documents, invoices);

  const vendorNextStep = getVendorNextStep({
    documentCount: documents.length + expenses.length + invoices.length,
    hasPendingReviewInvoice,
    monitoringState: rawMonitoringState,
    hasOpenFinding,
    hasPendingAction,
  });
  const primaryAction = vendorNextStep.action;

  const handlePrimaryAction = () => {
    if (primaryAction.actionKind === "upload") {
      onAdd("upload", vendor.relationshipId);
      return;
    }
    if (primaryAction.actionKind === "monitor" || primaryAction.actionKind === "test_forwarding") {
      onAdd("monitor", vendor.relationshipId);
    }
  };

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
    ...(vendorDocumentIds.length > 0
      ? [{
          id: "bill-breakdown",
          label: `View bill breakdown (${vendorDocumentIds.length})`,
          icon: <ReceiptText size={15} />,
          onSelect: () => openInspector(vendorDocumentIds[0], vendorDocumentIds),
        }]
      : []),
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
        const info = `${vendor.name}\nCategory: ${vendor.category}\nWebsite: ${vendor.website || "N/A"}\nAnnualized Spend: ${vendorMoney(vendor.annualizedSpend)}`;
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
    { id: "accounts", label: "Accounts", count: vendorAccountCount },
    { id: "bills", label: "Bills", count: expenses.length + invoices.length + documents.length },
    { id: "contracts", label: "Contracts", count: contracts.length },
    { id: "findings", label: "Findings", count: opportunities.length + actions.length },
    { id: "activity", label: "Activity", count: auditHistory.length },
  ];

  const potentialFindings = opportunities.filter(findingHasCustomerVisibleMonetaryClaim);
  const potentialValueTotal = totalCustomerVisibleFindingValue(opportunities);
  const verifiedValueTotal = vendorSavings.filter(resultIsVerified).reduce((sum, s) => sum + s.amount, 0);
  const openFindingCount = opportunities.filter((item) => !findingIsDismissed(item)).length;
  const pendingActionCount = actions.filter((item) => !actionIsCompleted(item)).length;
  const actionsInProgress = actions.filter(actionIsInProgress).length;
  const hasVerifiedValue = vendorSavings.some(resultIsVerified);
  const relationshipFacts = [
    { label: vendorAccountCount === 1 ? "Account" : "Accounts", value: vendorAccountCount },
    ...(contracts.length ? [{ label: contracts.length === 1 ? "Contract" : "Contracts", value: contracts.length }] : []),
    ...(openFindingCount
      ? [{ label: "Open finding", value: openFindingCount }]
      : []),
    ...(pendingActionCount
      ? [{ label: "Pending action", value: pendingActionCount }]
      : []),
  ];
  const openWorkCount = openFindingCount + pendingActionCount;
  const primaryActionControl = primaryAction.href ? (
    <Link className="button button-primary vendor-detail-primary-action" href={primaryAction.href}>
      {primaryAction.label} <ArrowUpRight size={15} aria-hidden="true" />
    </Link>
  ) : (
    <button type="button" className="button button-primary vendor-detail-primary-action" onClick={handlePrimaryAction} disabled={!canWrite}>
      {primaryAction.actionKind === "upload" ? <Upload size={15} aria-hidden="true" /> : <Mail size={15} aria-hidden="true" />} {primaryAction.label}
    </button>
  );

  return (
    <div className="vendor-detail" data-record-detail-root="true">
      <div className="vendor-scope-context">
        <GlobalBackControl className="vendor-back" />
        <PageScopeIndicator mode="vendor" vendorName={vendor.name} vendorHref={`/app/vendors/${vendor.id}`} />
      </div>

      <header className="vendor-detail-header">
        <div className="vendor-detail-identity">
          <CompanyLogo entity="vendor" id={vendor.id} name={vendor.name} className="vendor-detail-logo" />
          <div>
            <span className="record-eyebrow">Vendor relationship</span>
            <div className="vendor-detail-identity-row"><h1>{vendor.name}</h1><Status value={vendor.relationshipStatus} /></div>
            <p>{vendor.category || "Uncategorized"} · Relationship details, source records, and monitoring in one place.</p>
          </div>
        </div>
        <div className="vendor-detail-actions">
          {vendorDocumentIds.length > 0 ? (
            <button
              type="button"
              className="button button-secondary"
              onClick={() => openInspector(vendorDocumentIds[0], vendorDocumentIds)}
            >
              <ReceiptText size={15} /> Bill Breakdown {vendorDocumentIds.length > 1 ? `(${vendorDocumentIds.length})` : ""}
            </button>
          ) : null}
          <RecordOverflowMenu items={menuItems} ariaLabel="More vendor actions" />
        </div>
      </header>

      {/* Record sections use the same tab system as the internal CRM. */}
      <WorkspaceViewTabs
        activeId={activeTab}
        ariaLabel="Vendor sections"
        className="workspace-tab-list--record"
        onChange={handleTabChange}
        recordNavigation
        tabs={vendorTabs}
      />

      <WorkspaceDecisionSummary
        ariaLabel="Vendor relationship next step"
        className="vendor-decision-summary"
        eyebrow="Relationship attention"
        description={vendorNextStep.description}
        facts={[
          { label: "Monitoring", value: monitoringState.label },
          { label: "Bills awaiting review", value: pendingReviewCount ? `${pendingReviewCount} ${pendingReviewCount === 1 ? "bill" : "bills"}` : "None" },
          { label: "Open work", value: openWorkCount ? `${openWorkCount} item${openWorkCount === 1 ? "" : "s"}` : "None" },
        ]}
        heading={vendorNextStep.heading}
        actions={primaryActionControl}
      />

      {activeTab === "overview" && (
        <div className="vendor-detail-stack">
          <section className="vendor-overview-summary" aria-label={`${vendor.name} relationship summary`}>
            <dl className="vendor-overview-summary__metrics">
              <div>
                <dt>Annualized spend</dt>
                <dd>{vendorMoney(vendor.annualizedSpend)}</dd>
                <small>Current relationship record</small>
              </div>
              <div>
                <dt>Latest bill</dt>
                <dd>{latest ? vendorMoney(latest.amount) : "Not recorded"}</dd>
                <small>{latest ? `Period ending ${date(latest.periodEnd)}` : "Add a bill or source document"}</small>
              </div>
            </dl>
            <dl className="vendor-overview-summary__facts">
              {relationshipFacts.map((fact) => (
                <div key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Value summary */}
          <section className="portal-panel workspace-value-summary">
            <h2>Value Summary</h2>
            <div className="workspace-value-summary__grid">
              <div className="workspace-value-summary__metric" data-tone="potential">
                <span>Potential Value</span>
                <strong>{potentialFindings.length ? vendorMoney(potentialValueTotal) : "Not established"}</strong>
                <small>{potentialFindings.length ? `${potentialFindings.length} evidence-backed finding${potentialFindings.length === 1 ? "" : "s"}` : "No evidence-backed finding yet"}</small>
              </div>
              <div className="workspace-value-summary__metric">
                <span>Actions in Progress</span>
                <strong>{actionsInProgress ? `${actionsInProgress} work item${actionsInProgress === 1 ? "" : "s"}` : "No active work"}</strong>
                <small>{actionsInProgress ? "Active execution" : "No approved work is underway"}</small>
              </div>
              <div className="workspace-value-summary__metric" data-tone="verified">
                <span>Verified Value</span>
                <strong>{hasVerifiedValue ? vendorMoney(verifiedValueTotal) : "Not verified yet"}</strong>
                <small>{hasVerifiedValue ? "Proven by later evidence" : "Awaiting comparison evidence"}</small>
              </div>
            </div>
            <p className="workspace-value-summary__note">
              <ShieldCheck aria-hidden="true" size={14} /> {potentialFindings.length ? "Potential value is an estimate based on linked evidence and a deterministic calculation. Verified value is proven by later invoice evidence." : "Costivra will show potential value only after a finding has linked evidence and a deterministic calculation."}
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
            invoices={invoices}
            contract={contract}
            monitoring={monitoring}
          />
        </div>
      )}

      {activeTab === "accounts" && (
        <VendorAccountsTab vendorId={vendorId} data={data} currency={workspaceCurrency} selectedAccountId={requestedAccount} onAdd={onAdd} />
      )}

      {activeTab === "bills" && (
        <VendorBillsTab expenses={expenses} invoices={invoices} documents={documents} vendorName={vendor.name} currency={workspaceCurrency} />
      )}

      {activeTab === "contracts" && (
        <VendorContractsTab contracts={contracts} currency={workspaceCurrency} />
      )}

      {activeTab === "findings" && (
        <VendorFindingsTab opportunities={opportunities} actions={actions} savings={vendorSavings} currency={workspaceCurrency} />
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
        <div className="workspace-record-form">
          <div className="workspace-record-form__field">
            <label className="workspace-record-form__label">
              Workspace Display Name
            </label>
            <input
              type="text"
              value={displayNameOverride}
              onChange={(e) => setDisplayNameOverride(e.target.value)}
              placeholder={vendor.canonicalName}
              className="workspace-record-form__control"
            />
          </div>

          <div className="workspace-record-form__field">
            <label className="workspace-record-form__label">
              Category
            </label>
            <input
              type="text"
              value={categoryOverride}
              onChange={(e) => setCategoryOverride(e.target.value)}
              placeholder={vendor.canonicalCategory}
              className="workspace-record-form__control"
            />
          </div>

          <div className="workspace-record-form__field">
            <label className="workspace-record-form__label">
              Website URL
            </label>
            <input
              type="url"
              value={websiteOverride}
              onChange={(e) => setWebsiteOverride(e.target.value)}
              placeholder={vendor.canonicalWebsite ?? "https://..."}
              className="workspace-record-form__control"
            />
          </div>

          <div className="workspace-record-form__field">
            <label className="workspace-record-form__label">
              Relationship Status
            </label>
            <select
              value={relationshipStatus}
              onChange={(e) => setRelationshipStatus(e.target.value)}
              disabled={!canManageLifecycle && vendor.relationshipStatus === "terminated"}
              className="workspace-record-form__control"
            >
              <option value="active">Active</option>
              <option value="prospect">Prospect</option>
              <option value="inactive">Inactive</option>
              <option value="terminated" disabled={!canManageLifecycle}>Terminated</option>
            </select>
          </div>

          <div className="workspace-record-form__grid">
            <div className="workspace-record-form__field">
              <label className="workspace-record-form__label">
                Annualized Spend ($)
              </label>
              <input
                type="number"
                value={annualizedSpend}
                onChange={(e) => setAnnualizedSpend(e.target.value)}
                className="workspace-record-form__control"
              />
            </div>
            <div className="workspace-record-form__field">
              <label className="workspace-record-form__label">
                Spend Cadence
              </label>
              <select
                value={spendCadence}
                onChange={(e) => setSpendCadence(e.target.value)}
                className="workspace-record-form__control"
              >
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
          </div>
          <div className="workspace-record-form__context">
            <strong>Canonical vendor reference</strong>
            <p>These catalog values are read-only here. Your overrides above affect only this workspace.</p>
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
  currency,
  selectedAccountId,
  onAdd,
}: {
  vendorId: string;
  data: PortalData;
  currency: string;
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
  const invoiceAccountGroups = groupVendorInvoicesByAccount(invoices);
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
    <div className="vendor-accounts-workspace">
      <section className="portal-panel vendor-accounts-panel">
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
                <button
                  key={account.id}
                  type="button"
                  className="vendor-account-row"
                  onClick={() => handleSelectAccount(account.id)}
                >
                  <span className="vendor-account-row__copy">
                    <span className="vendor-account-row__title">
                      <strong>{label}</strong>
                      <span className="vendor-account-row__reference">{maskedRef}</span>
                    </span>
                    <span className="vendor-account-row__meta">
                      <span><MapPin size={13} /> {location?.name ?? account.locationName ?? "Unassigned location"}</span>
                      <span>{account.category || "Category not recorded"}</span>
                      {latestInv ? <span>Latest bill · {money(latestInv.totalAmount ?? 0, false, resolveRecordDetailCurrency(currency, latestInv.currency))} · {date(latestInv.invoiceDate)}</span> : <span>No linked bill</span>}
                      {accountContracts.length ? <span>Recorded contract</span> : null}
                      {accountOppCount > 0 ? <span className="is-attention">{accountOppCount} open finding{accountOppCount === 1 ? "" : "s"}</span> : null}
                    </span>
                  </span>
                  <span className="vendor-account-row__status">
                    <span className="vendor-account-row__monitoring">Vendor-level monitoring</span>
                    <Status value={account.status} />
                    <ChevronRight size={16} aria-hidden="true" />
                  </span>
                </button>
              );
            })}
          </div>
        ) : invoiceAccountGroups.length ? (
          <div className="portal-list">
            {invoiceAccountGroups.map((group) => {
              const inv = group.invoices[0];
              const label = formatVendorAccountLabel(
                { accountName: null, category: inv.expenseCategory ?? "Vendor account", accountNumberLast4: inv.accountNumberLast4 },
                inv.locationName
              );
              const maskedRef = maskAccountReference(inv.accountNumberLast4);
              return (
                <button
                  key={inv.id}
                  type="button"
                  className="vendor-account-row"
                  onClick={() => handleSelectAccount(inv.id)}
                >
                  <span className="vendor-account-row__copy">
                    <span className="vendor-account-row__title">
                      <strong>{label}</strong>
                      <span className="vendor-account-row__reference">{maskedRef}</span>
                    </span>
                    <span className="vendor-account-row__meta">
                      <span><MapPin size={13} /> {inv.locationName ?? "Default location"}</span>
                      <span>{inv.energyService?.meterId ? `Meter ${inv.energyService.meterId}` : "Service account"}</span>
                      <span>{group.invoices.length} linked bill{group.invoices.length === 1 ? "" : "s"}</span>
                    </span>
                  </span>
                  <span className="vendor-account-row__status">
                    <Status value={inv.expenseAccountMatchStatus === "matched" ? "active" : "needs_review"} />
                    <ChevronRight size={16} aria-hidden="true" />
                  </span>
                </button>
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
        <section className="portal-panel vendor-account-review-panel">
          <div className="portal-panel-heading">
            <div>
              <h2>Bills needing account match</h2>
              <p>Bills extracted for this vendor that require account or location verification.</p>
            </div>
          </div>
          <div className="portal-list">
            {unmatchedInvoices.map((inv) => (
              <Link key={inv.id} className="portal-list-row vendor-account-review-row" href={`/app/bills/${inv.id}`}>
                <div className="grow">
                  <strong>{inv.invoiceNumber ?? "Bill without invoice #"}</strong>
                  <div className="vendor-account-review-row__meta">
                    <span>Amount: {money(inv.totalAmount ?? 0, false, resolveRecordDetailCurrency(currency, inv.currency))}</span>
                    <span>Date: {date(inv.invoiceDate)}</span>
                    <span>Last 4: {inv.accountNumberLast4 ? `...${inv.accountNumberLast4}` : "None"}</span>
                  </div>
                </div>
                <div className="vendor-account-review-row__status">
                  <span className="vendor-account-match vendor-account-match--vendor">Vendor matched</span>
                  <span className={`vendor-account-match ${inv.expenseAccountMatchStatus === "matched" ? "vendor-account-match--ready" : "vendor-account-match--review"}`}>
                    {inv.expenseAccountMatchStatus === "matched" ? "Account matched" : "Account needs review"}
                  </span>
                  <span className={`vendor-account-match ${inv.serviceLocationMatchStatus === "matched" ? "vendor-account-match--ready" : "vendor-account-match--muted"}`}>
                    {inv.serviceLocationMatchStatus === "matched" ? "Location matched" : "Location needs review"}
                  </span>
                  <ChevronRight size={16} aria-hidden="true" />
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
          currency={currency}
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
  currency,
  onClose,
  onAdd,
}: {
  accountId: string;
  relationshipId: string;
  data: PortalData;
  currency: string;
  onClose: () => void;
  onAdd: (kind: Exclude<ModalState, null>, relationshipId: string) => void;
}) {
  const account = data.expenseAccounts.find((a) => a.id === accountId);
  const fallbackInvoice = !account ? data.invoices.find((i) => i.id === accountId) : null;
  const vendor = data.vendors.find((item) => item.relationshipId === relationshipId);
  const location = account?.locationId ? data.locations.find((l) => l.id === account.locationId) : null;

  const label = account
    ? formatVendorAccountLabel(account, location?.name ?? account.locationName)
    : fallbackInvoice
    ? formatVendorAccountLabel({ accountName: null, category: fallbackInvoice.expenseCategory ?? "Vendor account", accountNumberLast4: fallbackInvoice.accountNumberLast4 }, fallbackInvoice.locationName)
    : "Vendor account";

  const maskedRef = maskAccountReference(account?.accountNumberLast4 ?? account?.externalAccountReference ?? fallbackInvoice?.accountNumberLast4);

  const accountInvoices = account
    ? data.invoices.filter((invoice) => invoice.expenseAccountId === accountId)
    : fallbackInvoice
      ? groupVendorInvoicesByAccount(data.invoices.filter((invoice) => invoice.vendorId === fallbackInvoice.vendorId))
        .find((group) => group.invoices.some((invoice) => invoice.id === fallbackInvoice.id))?.invoices ?? [fallbackInvoice]
      : [];
  const accountContracts = data.contracts.filter((c) => c.expenseAccountId === accountId);
  const accountOpportunities = data.opportunities.filter((o) => o.expenseAccountId === accountId);
  const canWrite = data.currentUser.role !== "viewer";
  const accountCategory = account?.category ?? fallbackInvoice?.expenseCategory ?? "General";
  const handleAddRecord = (kind: Exclude<ModalState, null>) => {
    onClose();
    onAdd(kind, relationshipId);
  };

  return (
    <PortalModal
      className="portal-modal--account-detail"
      description={`${maskedRef} · ${accountCategory}`}
      onClose={onClose}
      open
      side
      title={label}
    >
      <div className="account-detail-sheet">
        <div className="account-detail-sheet__context">
          <PageBreadcrumbs items={[{ label: "Vendors", href: "/app/vendors" }, ...(vendor ? [{ label: vendor.name, href: `/app/vendors/${vendor.id}` }] : []), { label }]} />
          <PageScopeIndicator mode="account" vendorName={vendor?.name} vendorHref={vendor ? `/app/vendors/${vendor.id}` : undefined} accountLabel={label} />
          <span>Vendor account</span>
        </div>

        <section className="account-detail-sheet__section">
          <header>
            <div>
              <span>Account context</span>
              <h3>Identity and service location</h3>
            </div>
          </header>
          <dl className="account-detail-sheet__facts">
            <div><dt>Account label</dt><dd>{label}</dd></div>
            <div><dt>Masked reference</dt><dd>{maskedRef}</dd></div>
            <div><dt>Location</dt><dd>{location?.name ?? account?.locationName ?? fallbackInvoice?.locationName ?? "Unassigned"}</dd></div>
            <div><dt>Service start</dt><dd>{account?.serviceStartDate ? date(account.serviceStartDate) : "Not recorded"}</dd></div>
            <div><dt>Service end</dt><dd>{account?.serviceEndDate ? date(account.serviceEndDate) : "Active / ongoing"}</dd></div>
            <div><dt>Monitoring scope</dt><dd>Managed at the vendor relationship</dd></div>
          </dl>
        </section>

        <div className="account-detail-sheet__actions">
          <button type="button" className="button button-primary" disabled={!canWrite} onClick={() => handleAddRecord("upload")}>
            <Plus size={15} /> Add bill
          </button>
          <button type="button" className="button button-secondary" disabled={!canWrite} onClick={() => handleAddRecord("monitor")}>
            <Mail size={15} /> Review monitoring
          </button>
        </div>

        <section className="account-detail-sheet__section">
          <header>
            <div>
              <span>Source records</span>
              <h3>Bills linked to this account</h3>
            </div>
            <strong>{accountInvoices.length}</strong>
          </header>
          {accountInvoices.length ? (
            <div className="portal-list">
              {accountInvoices.map((inv) => (
                <Link key={inv.id} className="portal-list-row" href={`/app/bills/${inv.id}`}>
                  <div className="grow">
                    <strong>{inv.invoiceNumber ?? "Bill"}</strong>
                    <span>Date: {date(inv.invoiceDate)}</span>
                  </div>
                  <strong>{money(inv.totalAmount ?? 0, false, resolveRecordDetailCurrency(currency, inv.currency))}</strong>
                  <ChevronRight size={16} />
                </Link>
              ))}
            </div>
          ) : (
            <Empty title="No bills linked" copy="Add a source bill to build this account’s spend history." />
          )}
        </section>

        <section className="account-detail-sheet__section">
          <header>
            <div>
              <span>Commitments</span>
              <h3>Linked contracts</h3>
            </div>
            <strong>{accountContracts.length}</strong>
          </header>
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
            <Empty title="No contracts linked" copy="Add a recorded agreement to make timing and renewal risk visible." />
          )}
        </section>

        <section className="account-detail-sheet__section">
          <header>
            <div>
              <span>Findings</span>
              <h3>Evidence-backed review items</h3>
            </div>
            <strong>{accountOpportunities.length}</strong>
          </header>
          {accountOpportunities.length ? (
            <div className="portal-list">
              {accountOpportunities.map((opp) => (
                <Link key={opp.id} className="portal-list-row" href={`/app/findings/${opp.id}`}>
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
            <Empty title="No findings recorded" copy="Costivra has not recorded a finding for this account yet." />
          )}
        </section>
      </div>
    </PortalModal>
  );
}

function VendorMonitoringCard({
  vendor,
  monitoring,
  error,
  canWrite,
  onMonitor,
}: {
  vendor: PortalVendor;
  monitoring: VendorMonitoringRecord | null;
  error: string | null;
  canWrite: boolean;
  onMonitor: () => void;
}) {
  const rawState = monitoring?.state ?? ((vendor as unknown as Record<string, unknown>).monitoringState as MonitoringState | undefined) ?? "not_set_up";
  const monitoringState = mapDurableStateToUiState(rawState);
  const { label, copy, badgeClass } = getMonitoringStateLabel(rawState);
  const monitoringActionLabel = monitoringState === "not_set_up" ? "Set up monitoring" : "Review monitoring setup";
  const activityFacts = [
    monitoring?.testCompletedAt ? { label: "Last test", value: date(monitoring.testCompletedAt) } : null,
    monitoring?.lastReceivedAt ? { label: "Last bill received", value: date(monitoring.lastReceivedAt) } : null,
    monitoring?.nextExpectedAt ? { label: "Next expected bill", value: date(monitoring.nextExpectedAt) } : null,
    monitoring?.lastFailureCode ? { label: "Latest monitoring issue", value: titleCase(monitoring.lastFailureCode) } : null,
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact));

  return (
    <section className="vendor-monitoring-card" aria-labelledby={`vendor-monitoring-${vendor.id}`}>
      <header className="vendor-monitoring-card__header">
        <div className="vendor-monitoring-card__copy">
          <span className="vendor-monitoring-card__eyebrow">Bill monitoring</span>
          <div className="vendor-monitoring-card__title-row">
            <h2 id={`vendor-monitoring-${vendor.id}`}>Continuous bill monitoring</h2>
            <span className={`portal-status vendor-monitoring-card__status ${badgeClass}`}>{label}</span>
          </div>
          <p id={`vendor-monitoring-${vendor.id}-description`}>{copy}</p>
        </div>
        {canWrite && (
          <button className="button button-primary vendor-monitoring-card__action" type="button" onClick={onMonitor}>
            <Mail aria-hidden="true" size={15} /> {monitoringActionLabel}
          </button>
        )}
      </header>
      <dl className="vendor-monitoring-card__facts" aria-describedby={`vendor-monitoring-${vendor.id}-description`}>
        <div>
          <dt>Approved forwarding sender</dt>
          <dd>{monitoring?.approvedSenderAddress ?? "Not configured"}</dd>
        </div>
        <div>
          <dt>Private intake address</dt>
          <dd>{monitoring?.privateIntakeAddress ?? "Not available until an intake address is active"}</dd>
        </div>
        <div>
          <dt>Expected bill cadence</dt>
          <dd>{monitoring?.expectedCadenceDays ? `${monitoring.expectedCadenceDays} days` : "Not configured"}</dd>
        </div>
        <div>
          <dt>Grace period</dt>
          <dd>{monitoring?.gracePeriodDays ? `${monitoring.gracePeriodDays} days` : "Not configured"}</dd>
        </div>
      </dl>
      {activityFacts.length ? (
        <section className="vendor-monitoring-card__activity" aria-label="Recorded monitoring activity">
          <span>Recorded monitoring activity</span>
          <dl>
            {activityFacts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}
          </dl>
        </section>
      ) : null}
      {error ? <p className="vendor-monitoring-card__error" role="alert">{error}</p> : null}
      <p className="vendor-monitoring-card__privacy-note">
        <ShieldCheck aria-hidden="true" size={14} /> Costivra receives only messages sent to your private workspace address. Costivra does not read the rest of your inbox.
      </p>
    </section>
  );
}

function VendorBillsTab({
  expenses,
  invoices,
  documents,
  vendorName,
  currency,
}: {
  expenses: PortalData["expenses"];
  invoices: PortalData["invoices"];
  documents: PortalData["documents"];
  vendorName: string;
  currency: string;
}) {
  const { openInspector } = useBillInspector();
  const [subview, setSubview] = useState<"bills" | "files">("bills");
  const vendorDocIds = useMemo(
    () => getChronologicalBillDocumentIds(documents, invoices),
    [documents, invoices],
  );

  if (!expenses.length && !invoices.length && !documents.length) {
    return <Empty title="No bills recorded" copy="Upload a bill or add a normalized expense to build this vendor's history." />;
  }

  return (
    <div className="vendor-bills-workspace">
      <WorkspaceViewTabs
        activeId={subview}
        ariaLabel="Vendor bill records"
        className="vendor-bills-workspace__tabs"
        onChange={(id) => setSubview(id as "bills" | "files")}
        selectionMode="pressed"
        tabs={[
          { id: "bills", label: "Bills & spend", count: expenses.length + invoices.length },
          { id: "files", label: "Source files", count: documents.length },
        ]}
      />

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
                <strong>{money(expense.amount, false, currency)}</strong>
                <ChevronRight size={16} />
              </Link>
            ))}
          </div>
          {invoices.length ? (
            <div className="portal-list vendor-bills-workspace__invoice-list">
              {invoices.map((invoice) => {
                const invoiceCurrency = resolveRecordDetailCurrency(currency, invoice.currency);
                return (
                <div key={invoice.id} className="portal-list-row vendor-bill-row">
                  <Link className="vendor-bill-row__record" href={`/app/bills/${invoice.id}`}>
                    <div className="grow">
                      <strong>{invoice.invoiceNumber ?? "Invoice"}</strong>
                      <span>
                        {displayPeriod(invoice.servicePeriodStart, invoice.servicePeriodEnd)} · Account {invoice.accountNumberLast4 ? `…${invoice.accountNumberLast4}` : "not assigned"} · {invoice.locationName ?? "Location not assigned"}
                      </span>
                      <small>
                        Current charges {invoice.currentCharges == null ? "not recorded" : money(invoice.currentCharges, false, invoiceCurrency)} · Amount due {invoice.amountDue == null ? "not recorded" : money(invoice.amountDue, false, invoiceCurrency)} · Reconciliation: {titleCase(invoice.reconciliationStatus || "unknown")} · Vendor matched: {invoice.vendorMatchStatus === "exact" || invoice.vendorMatchStatus === "provided" ? "Yes" : "Needs review"}
                      </small>
                    </div>
                    <ChevronRight aria-hidden="true" size={16} />
                  </Link>
                  <div className="vendor-bill-row__actions">
                    {invoice.documentId && (
                      <button
                        aria-label={`Open bill breakdown for ${invoice.invoiceNumber ?? "invoice"}`}
                        type="button"
                        className="button button-secondary vendor-bill-row__breakdown"
                        onClick={() => {
                          openInspector(invoice.documentId!, vendorDocIds);
                        }}
                      >
                        <ReceiptText size={12} /> Breakdown
                      </button>
                    )}
                    <Status value={invoice.reviewStatus} />
                  </div>
                </div>
                );
              })}
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

function VendorContractsTab({ contracts, currency }: { contracts: PortalData["contracts"]; currency: string }) {
  if (!contracts.length) return <Empty title="No contracts recorded" copy="Add a contract and its notice dates to make renewal risk visible." />;
  return <section className="portal-panel"><div className="portal-panel-heading"><div><h2>Contracts</h2><p>Dates and values come from the recorded agreement.</p></div></div><div className="portal-list">{contracts.map((contract) => <Link key={contract.id} className="portal-list-row" href={`/app/contracts/${contract.id}`}><div className="grow"><strong>{contract.title}</strong><span>{contract.endDate ? `Ends ${date(contract.endDate)}` : "End date not recorded"}{contract.autoRenews ? " · Auto-renews" : ""}</span></div><strong>{contract.annualValue == null ? "Value not recorded" : money(contract.annualValue, false, currency)}</strong><ChevronRight size={16} /></Link>)}</div></section>;
}

function VendorRecordCollectionFooter({ href, label }: { href: string; label: string }) {
  return <footer className="vendor-record-collection__footer">
    <Link href={href} className="button button-quiet button-compact">
      {label} <ArrowUpRight aria-hidden="true" size={14} />
    </Link>
  </footer>;
}

function VendorFindingsTab({
  opportunities,
  actions,
  savings,
  currency,
}: {
  opportunities: PortalData["opportunities"];
  actions: PortalData["actions"];
  savings: PortalData["savings"];
  currency: string;
}) {
  return (
    <div className="vendor-findings-workspace">
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
        <VendorRecordCollectionFooter href="/app/findings" label="View all findings across vendors" />
      </section>

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
        <VendorRecordCollectionFooter href="/app/actions" label="View all actions across vendors" />
      </section>

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
                <strong className="money-value">{money(item.amount, false, currency)}</strong>
                <Status value={item.status} />
                <ChevronRight size={16} />
              </Link>
            ))}
          </div>
        ) : (
          <Empty title="No verified results yet" copy="Proven value will appear here after evidence reconciliation." />
        )}
        <VendorRecordCollectionFooter href="/app/results" label="View all results across vendors" />
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
    <section className="portal-panel workspace-completeness-card">
      <div className="portal-panel-heading workspace-completeness-card__heading">
        <div>
          <h2>Data Completeness</h2>
          <p>{score}% of recommended relationship fields recorded.</p>
        </div>
      </div>
      <div className="workspace-completeness-card__states">
        {states.map((item) => (
          <div key={item.label} className="workspace-completeness-card__state" data-state={item.state}>
            <span className="workspace-completeness-card__marker" aria-hidden="true">
              {item.state === "complete" ? <Check size={12} /> : item.state === "attention" ? <Info size={12} /> : <X size={12} />}
            </span>
            <span>{item.label} · {item.state === "not_applicable" ? "Not applicable" : titleCase(item.state)}</span>
          </div>
        ))}
      </div>
    </section>
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
  initialTab?: "organization" | "integrations" | "team" | "billing";
}) {
  const [busy, setBusy] = useState(false);
  const searchParams = useSearchParams();
  const requestedTab = searchParams?.get("tab");
  const tabFromUrl = requestedTab === "organization" || requestedTab === "integrations" || requestedTab === "team" || requestedTab === "billing"
    ? requestedTab
    : null;
  const [tab, setTab] = useState(tabFromUrl ?? initialTab);
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
  const settingsTabs = [
    { id: "organization", label: "Organization" },
    { id: "integrations", label: "Integrations" },
    { id: "team", label: "Team & approvals" },
    ...(["owner", "admin"].includes(data.currentUser.role)
      ? [{ id: "billing", label: "Billing" }]
      : []),
  ];
  return (
    <>
      <PageHeader
        title="Settings"
        description="Organization profile, alert preferences, and review thresholds."
      />
      <WorkspaceViewTabs
        activeId={tab}
        ariaLabel="Settings sections"
        onChange={(id) => setTab(id as typeof tab)}
        selectionMode="pressed"
        tabs={settingsTabs}
      />
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
        <div className="workspace-preference-list">
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
      {tab === "billing" && <BillingPanel />}
    </>
  );
}

function BillingPanel() {
  const searchParams = useSearchParams();
  const requestedPlan = searchParams?.get("plan");
  const billingOutcome = searchParams?.get("billing");
  const [status, setStatus] = useState<{ status?: string; providerConfigured?: boolean; billingMode?: "test" | "live" | "unknown"; billingEnabled?: boolean; setupReasons?: string[]; stripeAccount?: { reachable: boolean; chargesEnabled: boolean | null; payoutsEnabled: boolean | null; detailsSubmitted: boolean | null; currentlyDue: string[]; pastDue: string[]; disabledReason: string | null }; plans?: Array<{ key: string; name: string; description?: string; amountCents?: number | null; currency?: string; interval?: string; checkoutEnabled: boolean }>; subscriptions: Array<{ plan_key: string; status: string; cancel_at_period_end: boolean; current_period_end: string | null }>; entitlements: Array<{ feature_key: string; enabled: boolean }> } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planKey, setPlanKey] = useState(requestedPlan === "growth" || requestedPlan === "starter" ? requestedPlan : "starter");

  useEffect(() => {
    let cancelled = false;
    void api("/api/billing/status").then((value) => { if (!cancelled) setStatus(value as typeof status); }).catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Billing status could not be loaded."); });
    return () => { cancelled = true; };
  }, []);

  const current = status?.subscriptions?.[0];
  const billingSetupPending = status?.status === "unconfigured";
  const selectedPlan = status?.plans?.find((plan) => plan.key === planKey);
  const checkoutReady = !billingSetupPending && status?.billingEnabled === true && selectedPlan?.checkoutEnabled === true;
  const setupReasonLabel = (reason: string) => {
    if (reason === "billing_database_not_configured") return "Apply the billing database migration.";
    if (reason === "stripe_provider_not_configured") return "Configure Stripe on the server.";
    if (reason === "stripe_billing_mode_disabled") return `Enable the approved Stripe billing mode (currently ${status?.billingMode ?? "unknown"}).`;
    if (reason === "stripe_account_not_ready") return "Finish Stripe account verification and enable charges and payouts.";
    if (reason.startsWith("price_missing:")) {
      const plan = reason.slice("price_missing:".length);
      return `Add and configure the ${plan} Stripe price.`;
    }
    return "Complete the remaining billing setup.";
  };
  const startCheckout = async () => {
    setBusy(true); setError(null);
    try {
      const result = await api("/api/billing/checkout", { method: "POST", body: { planKey } }) as { url?: string };
      if (!result.url) throw new Error("Checkout is not configured yet.");
      window.location.assign(result.url);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Checkout could not be started."); setBusy(false); }
  };
  const openPortal = async () => {
    setBusy(true); setError(null);
    try {
      const result = await api("/api/billing/portal", { method: "POST" }) as { url?: string };
      if (!result.url) throw new Error("Billing management is not available yet.");
      window.location.assign(result.url);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Billing management could not be opened."); setBusy(false); }
  };
  const formatPlanPrice = (plan: { amountCents?: number | null; currency?: string; interval?: string }) => plan.amountCents == null ? "Custom" : `${new Intl.NumberFormat("en-US", { style: "currency", currency: plan.currency || "USD", maximumFractionDigits: 0 }).format(plan.amountCents / 100)} / ${plan.interval || "month"}`;
  const checkoutPlans = status?.plans?.filter((plan) => plan.checkoutEnabled) ?? [];
  return <section className="portal-panel settings-billing-panel" aria-labelledby="billing-settings-title">
    <div className="settings-section-header"><div><span className="eyebrow">Subscription</span><h2 id="billing-settings-title">Costivra billing</h2><p>Choose a plan through Stripe. Your workspace becomes active only after Stripe confirms the subscription.</p></div><CircleDollarSign size={22} aria-hidden="true" /></div>
    {error && <p role="alert" className="form-error">{error}</p>}
     {billingOutcome === "success" && !current && <p className="form-note" role="status">Checkout returned successfully. Stripe is still confirming the subscription; this page will show the plan once the signed webhook is processed.</p>}
     {billingOutcome === "success" && current && <p className="form-note" role="status">Subscription confirmed: {current.plan_key} is {current.status}.</p>}
     {billingOutcome === "cancelled" && <p className="form-note" role="status">Checkout was cancelled. No subscription or access change was applied.</p>}
     {status?.setupReasons?.length ? <div className="form-note" role="status"><strong>Checkout setup still needs:</strong><ul>{status.setupReasons.map((reason) => <li key={reason}>{setupReasonLabel(reason)}</li>)}</ul></div> : null}
    {current ? <div className="settings-billing-current"><strong>{current.plan_key} · {current.status}</strong><span>{current.cancel_at_period_end ? "Cancels at the end of the current period." : "Renews through Stripe."}</span><button type="button" className="button button-secondary" onClick={() => void openPortal()} disabled={busy}>{busy ? "Opening…" : "Manage billing"}</button></div> : <div className="settings-billing-choose"><label htmlFor="billing-plan">Plan</label><CostivraSelect id="billing-plan" aria-label="Plan" value={planKey} onChange={setPlanKey} options={checkoutPlans.map((plan) => ({ value: plan.key, label: `${plan.name} · ${formatPlanPrice(plan)}` }))} />{requestedPlan && <p className="form-note" role="status">Your selected plan is ready. Review it, then continue to secure checkout.</p>}<button type="button" className="button button-primary" onClick={() => void startCheckout()} disabled={busy || !checkoutReady}>{busy ? "Opening checkout…" : checkoutReady ? "Continue to secure checkout" : "Checkout setup pending"}</button><small>Enterprise plans are handled with a written agreement rather than self-serve checkout.</small></div>}
  </section>;
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
  const [mounted, setMounted] = useState(open);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    let closeTimer: number | undefined;
    let openTimer: number | undefined;
    let leaveTimer: number | undefined;
    if (open) {
      if (!mounted || leaving) {
        openTimer = window.setTimeout(() => {
          setMounted(true);
          setLeaving(false);
        }, 0);
      }
    } else if (mounted) {
      leaveTimer = window.setTimeout(() => setLeaving(true), 0);
      closeTimer = window.setTimeout(() => {
        setMounted(false);
        setLeaving(false);
      }, 220);
    }
    return () => {
      if (closeTimer) window.clearTimeout(closeTimer);
      if (openTimer) window.clearTimeout(openTimer);
      if (leaveTimer) window.clearTimeout(leaveTimer);
    };
  }, [open, mounted, leaving]);
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
  if (!mounted || typeof document === "undefined") return null;
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
    <aside className={`vendor-side-panel${leaving ? " is-leaving" : ""}`} aria-labelledby="vendor-panel-title">
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
        ? `/app/bills/${notice.documentId}`
        : "/app/bills?view=files",
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
        side
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
        side
        className="portal-modal--upload"
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
