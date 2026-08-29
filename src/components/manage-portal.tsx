"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CSSProperties, FormEvent, ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import {
  Activity,
  Archive,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  AlignCenter,
  AlignLeft,
  AlignRight,
  AtSign,
  Bold,
  Building2,
  Camera,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Copy,
  Download,
  FileText,
  FileCheck2,
  Globe2,
  Inbox,
  ImagePlus,
  IndentDecrease,
  IndentIncrease,
  Italic,
  LayoutDashboard,
  Layers,
  LoaderCircle,
  Link2,
  List,
  ListFilter,
  ListOrdered,
  Mail,
  MailOpen,
  MapPin,
  Maximize2,
  Menu,
  MessageSquareText,
  Minimize2,
  Paperclip,
  Palette,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Reply,
  Redo2,

  RemoveFormatting,
  Search,
  Send,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Star,
  Strikethrough,
  Trash2,
  Underline,
  Undo2,
  UserPlus,
  Users,
  X,
} from "@/lib/icons";
import type {
  ManageAccount,
  ManageApolloSearchResult,
  ManageActivity,
  ManageContact,
  ManageData,
  ManageMailbox,
  ManageMailThread,
  ManageOperator,
  ManageLocation,
  ManageOpportunityTrustReviewData,
  ManageVendorRelationship,
} from "@/lib/manage/types";
import { buildEmailViewerDocument } from "@/lib/manage/email-viewer";
import { createClient } from "@/lib/supabase/client";
import { getNextVerticalScrollTop, hasNestedNativeScrollRegion } from "@/lib/ui/workspace-scrollbar";
import { AssistantConversationScroller } from "@/components/assistant-conversation-scroller";
import { resizeAssistantComposer } from "@/lib/ui/assistant-composer";
import { getMotionSafeScrollBehavior } from "@/lib/ui/motion";
import { useToast } from "@/components/toast-provider";
import { RecordOverflowMenu } from "@/components/records/record-overflow-menu";
import { EditableFieldRow } from "@/components/records/editable-field-row";
import { EditRecordSheet } from "@/components/records/edit-record-sheet";
import { RecordDangerDialog, DependencyPreview } from "@/components/records/record-danger-dialog";
import { recordDraftChanged } from "@/lib/records/draft-state";
import { RecordChangeHistory, AuditHistoryItem } from "@/components/records/record-change-history";
import { CostivraMark } from "@/components/brand";
import { WorkspaceSidebarBrandToggle } from "@/components/workspace-sidebar-brand-toggle";
import { CostivraAssistantIcon } from "@/components/assistant-icon";
import { ManageInvoiceReview } from "@/components/manage-invoice-review";
import { ManageIntakeOperations } from "@/components/manage-intake-operations";
import { ManageCategoryIntelligence } from "@/components/manage-category-intelligence";
import { CompanyLogo } from "@/components/company-logo";
import { ManageAiDrawer } from "@/components/manage-ai-drawer";
import { AssistantComposerShell, AssistantIconButton } from "@/components/assistant-workspace";
import { RecordFilesWorkspace } from "@/components/record-files-workspace";
import { ManageNotificationCenter } from "@/components/manage-live-notifications";
import { ManagePilotOperations } from "@/components/manage-pilot-operations";
import { SequenceWorkspace } from "@/components/manage/outreach/sequence-workspace";
import { SequenceMailView } from "@/components/manage/mail/sequence-mail-view";
import { CostivraSelect } from "@/components/ui/costivra-select";
import { CostivraDateTimePicker } from "@/components/ui/costivra-date-time-picker";
import { WorkspaceDecisionSummary, WorkspaceEmptyState, WorkspaceStatusBadge, WorkspaceUtilityButton, WorkspaceViewTabs } from "@/components/ui/workspace-primitives";
import { SettingsHub, type SettingsHubItem } from "@/components/ui/settings-hub";
import { GlobalBackControl, shouldRenderManagePageBack, useNavigationLabel } from "@/components/navigation-history";
import type { ManageInvoiceReviewData } from "@/lib/manage/invoice-review-types";
import type { ManageIntakeOperationsData } from "@/lib/manage/intake-operations-types";
import type { SystemReadiness } from "@/lib/manage/system-readiness";
import { formatManageDate } from "@/lib/manage/date-format";
import { getMailThreadDecision } from "@/lib/manage/mail-thread-decision";
import { sequenceTaskOriginLabel } from "@/lib/manage/task-origin";
import { groupRecordedSpend, type SpendInterval } from "@/lib/manage/vendor-costs";
import { isWorkspaceRouteActive } from "@/lib/ui/workspace-shell";
import { MANAGE_SIDEBAR_PREFERENCE_KEY, manageSidebarPreferenceCookie, parseSidebarPreference, resolveManageRailOpen, shouldPersistManageRailPreference, type ManageSidebarViewport } from "@/lib/ui/workspace-preferences";
import { useWorkspaceSidebarRail } from "@/lib/ui/workspace-sidebar-rail";
import {
  buildRecipientCandidates,
  isRecipientEmail,
  normalizeRecipientEmail,
  searchRecipientCandidates,
  splitRecipientValues,
  type RecipientCandidate,
} from "@/lib/manage/recipient-search";

const manageHomeNavigation = ["Overview", "/manage", LayoutDashboard] as const;

const navGroups = [
  {
    label: "Clients",
    items: [
      ["Accounts", "/manage/accounts", Building2],
      ["Contacts", "/manage/contacts", Users],
    ],
  },
  {
    label: "Work",
    items: [
      ["Outreach", "/manage/outreach", MessageSquareText],
      ["Mail", "/manage/mail", Mail],
      ["Intake", "/manage/intake", ShieldAlert],
      ["Operations", "/manage/operations", BarChart3],
      ["Invoice review", "/manage/invoice-review", FileCheck2],
      ["Category operations", "/manage/category-intelligence", Layers],
      ["Trust review", "/manage/trust-review", ShieldCheck],
      ["Activity", "/manage/activity", Activity],
    ],
  },
] as const;

const settingsNav = ["Settings", "/manage/settings", Settings] as const;

function subscribeToManageSidebarPreference() {
  return () => {};
}

function unreadBadge(count: number) {
  return count > 99 ? "99+" : String(count);
}

const stages = [
  "lead",
  "onboarding",
  "active",
  "at_risk",
  "inactive",
  "closed",
];
const stageLabel = (stage: string | null) =>
  stage ? stage.replaceAll("_", " ") : "Unclassified";
const pretty = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const date = formatManageDate;
const initials = (value: string) =>
  value
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

type GlobalSearchResult = {
  id: string;
  category: "accounts" | "contacts" | "tasks" | "mail" | "mailboxes" | "activity";
  title: string;
  detail: string;
  href: string;
};

type ApolloSettingsSummary = {
  provider: "apollo";
  configured: boolean;
  connection: "connected" | "unconfigured" | "needs_access" | "unavailable";
  checkedAt: string;
  leadCredits: {
    limit: number;
    used: number;
    remaining: number;
  } | null;
};

const searchCategoryLabels: Record<GlobalSearchResult["category"], string> = {
  accounts: "Accounts",
  contacts: "Contacts",
  tasks: "Outreach",
  mail: "Mail",
  mailboxes: "Mailboxes",
  activity: "Activity",
};

const searchCategoryIcons: Record<GlobalSearchResult["category"], typeof Building2> = {
  accounts: Building2,
  contacts: Users,
  tasks: CheckCircle2,
  mail: Mail,
  mailboxes: AtSign,
  activity: Activity,
};

function currentSearchOrder(section: string): GlobalSearchResult["category"][] {
  const current =
    section === "outreach"
      ? "tasks"
      : section === "overview"
        ? "accounts"
        : (section as GlobalSearchResult["category"]);
  return [current, "accounts", "contacts", "tasks", "mail", "mailboxes", "activity"].filter(
    (value, index, values): value is GlobalSearchResult["category"] =>
      values.indexOf(value) === index && value in searchCategoryLabels,
  );
}

function globalSearchResults(data: ManageData, query: string) {
  const term = query.trim().toLowerCase();
  if (!term) return [] as GlobalSearchResult[];
  const matches = (value: string | null | undefined) =>
    value?.toLowerCase().includes(term) ?? false;
  const results: GlobalSearchResult[] = [];
  data.contacts.forEach((contact) => {
    if (matches(`${contact.fullName} ${contact.email} ${contact.organizationName} ${contact.title ?? ""}`)) {
      results.push({
        id: `contact-${contact.id}`,
        category: "contacts",
        title: contact.fullName,
        detail: `${contact.organizationName} · ${contact.email}`,
        href: "/manage/contacts",
      });
    }
  });
  data.accounts.forEach((account) => {
    if (matches(`${account.name} ${account.legalName ?? ""} ${account.primaryContact ?? ""} ${account.primaryEmail ?? ""}`)) {
      results.push({
        id: `account-${account.id}`,
        category: "accounts",
        title: account.name,
        detail: account.primaryContact || account.industry || "Client account",
        href: "/manage/accounts",
      });
    }
  });
  data.tasks.forEach((task) => {
    if (matches(`${task.title} ${task.organizationName} ${task.notes ?? ""} ${task.taskType}`)) {
      results.push({
        id: `task-${task.id}`,
        category: "tasks",
        title: task.title,
        detail: `${task.organizationName} · ${pretty(task.status)}`,
        href: "/manage/outreach",
      });
    }
  });
  data.mail.threads.forEach((thread) => {
    if (matches(`${thread.subject} ${thread.contactName ?? ""} ${thread.contactEmail ?? ""} ${thread.organizationName ?? ""} ${thread.snippet ?? ""}`)) {
      results.push({
        id: `mail-${thread.id}`,
        category: "mail",
        title: thread.subject || "Untitled conversation",
        detail: thread.contactName || thread.organizationName || thread.participants[0] || "Email conversation",
        href: `/manage/mail/${thread.id}?folder=${thread.folder}${thread.mailboxId ? `&mailbox=${thread.mailboxId}` : ""}`,
      });
    }
  });
  data.mail.mailboxes.forEach((mailbox) => {
    if (matches(`${mailbox.displayName} ${mailbox.address} ${mailbox.assignedToName ?? ""}`)) {
      results.push({
        id: `mailbox-${mailbox.id}`,
        category: "mailboxes",
        title: mailbox.displayName,
        detail: mailbox.address,
        href: "/manage/settings#email-identities",
      });
    }
  });
  data.activities.forEach((activity) => {
    if (matches(`${activity.subject} ${activity.summary ?? ""} ${activity.organizationName} ${activity.kind}`)) {
      results.push({
        id: `activity-${activity.id}`,
        category: "activity",
        title: activity.subject,
        detail: `${activity.organizationName} · ${pretty(activity.kind)}`,
        href: "/manage/activity",
      });
    }
  });
  return results;
}

type ComposeContext = {
  mode: "new" | "reply" | "forward";
  organizationId?: string;
  contactId?: string;
  to?: string;
  subject?: string;
  body?: string;
  threadId?: string;
  mailboxId?: string;
};

const MANAGE_MODAL_CLOSE_DURATION_MS = 190;

type ActiveComposer = { data: ManageData; context: ComposeContext };
type ManageComposerController = {
  openComposer: (data: ManageData, context: ComposeContext) => void;
  closeComposer: (afterClose?: () => void) => void;
};

const ManageComposerContext = createContext<ManageComposerController | null>(null);
const COMPOSER_CLOSE_DURATION_MS = 280;

export function ManageComposerProvider({ children }: { children: ReactNode }) {
  const [activeComposer, setActiveComposer] = useState<ActiveComposer | null>(null);
  const [composerClosing, setComposerClosing] = useState(false);
  const closeTimer = useRef<number | null>(null);

  const openComposer = useCallback((data: ManageData, context: ComposeContext) => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setComposerClosing(false);
    setActiveComposer({ data, context });
  }, []);
  const closeComposer = useCallback((afterClose?: () => void) => {
    if (!activeComposer || composerClosing) return;
    setComposerClosing(true);
    closeTimer.current = window.setTimeout(() => {
      setActiveComposer(null);
      setComposerClosing(false);
      closeTimer.current = null;
      afterClose?.();
    }, COMPOSER_CLOSE_DURATION_MS);
  }, [activeComposer, composerClosing]);
  useEffect(() => () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  }, []);

  const controller = useMemo(() => ({ openComposer, closeComposer }), [openComposer, closeComposer]);
  return <ManageComposerContext.Provider value={controller}>
    {children}
    {activeComposer && <Compose data={activeComposer.data} context={activeComposer.context} onClose={closeComposer} closing={composerClosing} />}
  </ManageComposerContext.Provider>;
}

function useManageComposer() {
  const controller = useContext(ManageComposerContext);
  if (!controller) throw new Error("ManageComposerProvider is required.");
  return controller;
}

async function api(url: string, init: RequestInit) {
  const response = await fetch(
    url,
    init.headers
      ? init
      : { ...init, headers: { "content-type": "application/json" } },
  );
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    code?: string;
    threadId?: string;
  };
  if (!response.ok) {
    const error = new Error(payload.error || "That action could not be completed.");
    Object.assign(error, { code: payload.code, status: response.status });
    throw error;
  }
  return payload;
}

function Status({ value }: { value: string | null }) {
  const key = value || "unclassified";
  return (
    <WorkspaceStatusBadge withDot className={`manage-status manage-status--${key}`}>
      {stageLabel(value)}
    </WorkspaceStatusBadge>
  );
}

function contactComposeContext(contact: ManageContact): ComposeContext {
  return {
    mode: "new",
    organizationId: contact.organizationId,
    contactId: contact.id,
    to: contact.email,
  };
}

function OperatorAvatar({
  operator,
  large = false,
}: {
  operator: ManageOperator;
  large?: boolean;
}) {
  return operator.avatarUrl ? (
    // The URL is a short-lived, server-generated Supabase Storage URL.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={`manage-operator-avatar${large ? " is-large" : ""}`}
      src={operator.avatarUrl}
      alt={`${operator.fullName} profile`}
    />
  ) : (
    <span className={`manage-operator-avatar${large ? " is-large" : ""}`}>
      {initials(operator.fullName)}
    </span>
  );
}

function MarketingConsent({
  count,
  compact = false,
}: {
  count: number;
  compact?: boolean;
}) {
  return count > 0 ? (
    <span
      className={`manage-marketing-consent${compact ? " is-compact" : ""}`}
      title={`${count} contact${count === 1 ? "" : "s"} opted in to email marketing`}
    >
      <Check aria-hidden="true" size={compact ? 11 : 13} />
      Marketing opt-in{count > 1 ? ` · ${count}` : ""}
    </span>
  ) : (
    <span className="manage-marketing-consent is-empty">
      No marketing opt-in
    </span>
  );
}

function Empty({
  icon: Icon,
  title,
  copy,
  action,
}: {
  icon: typeof Inbox;
  title: string;
  copy: string;
  action?: ReactNode;
}) {
  return (
    <WorkspaceEmptyState
      compact
      className="manage-empty"
      icon={<Icon size={22} />}
      title={title}
      copy={copy}
      action={action}
    />
  );
}

function Modal({
  title,
  copy,
  children,
  onClose,
  isClosing,
}: {
  title: string;
  copy?: string;
  children: ReactNode;
  onClose: () => void;
  isClosing?: boolean;
}) {
  const modalRef = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const modal = modalRef.current;
    if (!modal) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusables = (): HTMLElement[] => {
      const candidates = Array.from(
        modal.querySelectorAll<HTMLElement>(
          "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
        ),
      );
      return candidates.filter((item) => !item.hasAttribute("disabled"));
    };
    const immediateFocus = focusables()[0] || modal;
    immediateFocus.focus();
    return () => {
      previousFocus.current?.focus?.({ preventScroll: true } as FocusOptions);
    };
  }, []);

  return (
    <div
      className={`manage-modal-backdrop${isClosing ? " is-closing" : ""}`}
      role="presentation"
      onMouseDown={(event) => {
        if (isClosing) return;
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        ref={modalRef}
        tabIndex={-1}
        className={`manage-modal${isClosing ? " is-closing" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
            return;
          }
          if (event.key !== "Tab") return;
          const modal = modalRef.current;
          if (!modal) return;
          const focusables = Array.from(
            modal.querySelectorAll<HTMLElement>(
              "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
            ),
          ).filter((item) => !item.hasAttribute("disabled"));
          if (!focusables.length) return;
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
      >
        <header>
          <div>
            <h2>{title}</h2>
            {copy && <p>{copy}</p>}
          </div>
          <button type="button" className="workspace-close-button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function SidePanel({
  title,
  copy,
  children,
  onClose,
  isClosing,
}: {
  title: string;
  copy?: string;
  children: ReactNode;
  onClose: () => void;
  isClosing?: boolean;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const panel = panelRef.current;
    if (!panel) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusables = (): HTMLElement[] => Array.from(panel.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")).filter((item) => !item.hasAttribute("disabled"));
    (focusables()[0] || panel).focus();
    return () => previousFocus.current?.focus?.({ preventScroll: true } as FocusOptions);
  }, []);
  return <div className={`manage-sidepanel-backdrop${isClosing ? " is-closing" : ""}`} role="presentation" onMouseDown={(event) => { if (!isClosing && event.currentTarget === event.target) onClose(); }}>
    <section ref={panelRef} tabIndex={-1} className={`manage-sidepanel${isClosing ? " is-closing" : ""}`} role="dialog" aria-modal="true" aria-label={title} onKeyDown={(event) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
      if (event.key !== "Tab") return;
      const focusables = Array.from(panelRef.current?.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])") ?? []).filter((item) => !item.hasAttribute("disabled"));
      if (!focusables.length) return;
      const first = focusables[0]; const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }}>
      <header><div><p className="manage-sidepanel-eyebrow">Owner operations</p><h2>{title}</h2>{copy && <p>{copy}</p>}</div><button type="button" onClick={onClose} aria-label={`Close ${title}`}><X size={18} /></button></header>
      <div className="manage-sidepanel-body">{children}</div>
    </section>
  </div>;
}

function FormActions({
  busy,
  submit = "Save",
  onClose,
}: {
  busy: boolean;
  submit?: string;
  onClose: () => void;
}) {
  return (
    <footer className="manage-form-actions">
      <button
        className="manage-button manage-button--quiet"
        type="button"
        onClick={onClose}
      >
        Cancel
      </button>
      <button className="manage-button manage-button--primary" disabled={busy}>
        {busy ? "Working…" : submit}
      </button>
    </footer>
  );
}

function OpportunityTrustReview({ data }: { data: ManageOpportunityTrustReviewData }) {
  const [items, setItems] = useState(data.items);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<Record<string, string[]>>({});
  const toast = useToast();
  const act = async (id: string, action: string, evidenceIds: string[] = []) => {
    setBusyId(id);
    try {
      const response = await fetch(`/api/manage/opportunity-trust/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, ...(evidenceIds.length ? { evidenceIds } : {}) }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "The trust review could not be saved.");
      setItems((current) => current.filter((item) => item.id !== id));
      setSelectedEvidence((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      toast.success("Trust review saved", action === "mark_demo" ? "The record is now labeled as a sample." : action === "deprecate" || action === "hide_customer" ? "The record is no longer shown to customers." : "The record remains an internal note until supported.");
    } catch (error) {
      toast.error("Trust review failed", error instanceof Error ? error.message : "Try again.");
    } finally {
      setBusyId(null);
    }
  };
  return <>
    <header className="manage-page-heading"><div><p className="manage-eyebrow">Owner control</p><h1>Opportunity trust review</h1><p>Review manual opportunities that contain a dollar claim without evidence or a deterministic calculation.</p></div></header>
    <section className="manage-panel"><div className="manage-panel-header"><div><h2>{items.length} records need review</h2><p>Nothing is deleted automatically. Choose how each record should appear.</p></div></div>{items.length ? <div className="manage-table-wrap"><table className="manage-table"><thead><tr><th>Workspace / vendor</th><th>Record</th><th>Scope</th><th>Claim</th><th>Action</th></tr></thead><tbody>{items.map((item) => {
      const selected = selectedEvidence[item.id] ?? [];
      return <tr key={item.id}><td><strong>{item.organizationName}</strong><small>{item.vendorName}</small></td><td><strong>{item.title}</strong><small>{item.issue}</small></td><td>{item.expenseAccountReference ?? "Account not assigned"}<small>{item.locationName ?? "Location not assigned"}</small></td><td><strong>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(item.estimatedAnnualValue)}</strong><small>{item.trustState} · {item.evidenceCount} evidence</small></td><td><div className="manage-trust-actions">
        {item.evidenceOptions.length ? <label className="manage-trust-evidence-picker"><span>Supporting source</span><select aria-label={`Evidence for ${item.title}`} multiple size={Math.min(4, Math.max(2, item.evidenceOptions.length))} value={selected} onChange={(event) => setSelectedEvidence((current) => ({ ...current, [item.id]: Array.from(event.currentTarget.selectedOptions, (option) => option.value) }))}>{item.evidenceOptions.map((option) => <option key={option.id} value={option.id}>{option.filename}{option.pageNumber ? ` · page ${option.pageNumber}` : ""} · {option.excerpt}</option>)}</select><small>Only evidence from this account’s linked source documents is offered.</small></label> : <small className="manage-trust-no-evidence">No linked source evidence is available for this account.</small>}
        <div className="manage-inline-actions"><button className="manage-button manage-button--quiet" disabled={busyId === item.id} onClick={() => void act(item.id, "mark_demo")}>Mark demo</button><button className="manage-button manage-button--quiet" disabled={busyId === item.id} onClick={() => void act(item.id, "manual_note")}>Keep note</button><button className="manage-button manage-button--quiet" disabled={busyId === item.id || !selected.length} onClick={() => void act(item.id, "attach_evidence", selected)}>Attach selected evidence</button><button className="manage-button manage-button--quiet" disabled={busyId === item.id} onClick={() => void act(item.id, "hide_customer")}>Hide</button><button className="manage-button manage-button--danger" disabled={busyId === item.id} onClick={() => void act(item.id, "deprecate")}>Deprecate</button></div>
      </div></td></tr>;
    })}</tbody></table></div> : <div className="manage-empty"><CheckCircle2 size={20} /><strong>No unsupported manual claims remain.</strong><span>New candidates will appear here when an owner needs to review them.</span></div>}</section>
  </>;
}

export function ManagePortal({
  section,
  detailId,
  routeRecordId,
  outreachSequenceId,
  data,
  invoiceReview,
  intakeOperations,
  trustReview,
  initialSidebarCollapsed = null,
}: {
  section: string;
  detailId?: string | null;
  routeRecordId?: string | null;
  outreachSequenceId?: string | null;
  data: ManageData;
  invoiceReview?: ManageInvoiceReviewData | null;
  intakeOperations?: ManageIntakeOperationsData | null;
  trustReview?: ManageOpportunityTrustReviewData | null;
  initialSidebarCollapsed?: boolean | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeSearch = searchParams.get("search") ?? "";
  const sequenceOutreachTab = searchParams.get("tab") === "sequences";
  const router = useRouter();
  const toast = useToast();
  const { openComposer } = useManageComposer();
  const currentAccount = section === "accounts" && detailId ? data.accounts.find((item) => item.id === detailId) : null;
  const currentContact = section === "contacts" && detailId ? data.contacts.find((item) => item.id === detailId) : null;
  const isMailThreadDetail = section === "mail" && Boolean(routeRecordId);
  const isInvoiceReviewDetail = section === "invoice-review" && Boolean(routeRecordId);
  const isIntakeEventDetail = section === "intake" && Boolean(routeRecordId);
  const currentMailThread = isMailThreadDetail ? data.mail.selectedThread : null;
  const currentInvoice = isInvoiceReviewDetail ? invoiceReview?.selectedInvoice ?? null : null;
  const currentIntakeEvent = isIntakeEventDetail ? intakeOperations?.selectedEvent ?? null : null;
  const manageRecordDetailRoute = Boolean(detailId || outreachSequenceId || isMailThreadDetail || isInvoiceReviewDetail || isIntakeEventDetail);
  const hasDedicatedRecordBack = Boolean(detailId || outreachSequenceId || isInvoiceReviewDetail || isIntakeEventDetail);
  const managePageLabels: Record<string, string> = { overview: "Client operations", accounts: "Accounts", contacts: "Contacts", outreach: "Outreach", activity: "Activity", mail: "Mail", settings: "Settings", operations: "Pilot operations", "invoice-review": "Invoice review", intake: "Intake operations", "category-intelligence": "Category operations", "trust-review": "Trust review" };
  const mailFallbackHref = `/manage/mail?folder=${data.mail.folder}${data.mail.selectedMailboxId ? `&mailbox=${data.mail.selectedMailboxId}` : ""}`;
  const currentLabel = currentAccount?.name ?? currentContact?.fullName ?? currentMailThread?.subject ?? (currentInvoice ? `Invoice ${currentInvoice.invoiceNumber ?? currentInvoice.documentName}` : null) ?? currentIntakeEvent?.subject ?? (outreachSequenceId ? "Sequence" : isMailThreadDetail ? "Mail thread" : isInvoiceReviewDetail ? "Invoice review" : isIntakeEventDetail ? "Intake event" : sequenceOutreachTab ? "Sequences" : managePageLabels[section] ?? pretty(section));
  const currentFallbackHref = currentAccount ? "/manage/accounts" : currentContact ? "/manage/contacts" : outreachSequenceId ? "/manage/outreach?tab=sequences" : isMailThreadDetail ? mailFallbackHref : isInvoiceReviewDetail ? "/manage/invoice-review" : isIntakeEventDetail ? "/manage/intake" : "/manage";
  const currentFallbackLabel = currentAccount ? "Accounts" : currentContact ? "Contacts" : outreachSequenceId ? "Sequences" : isMailThreadDetail ? "Mail" : isInvoiceReviewDetail ? "Invoice review" : isIntakeEventDetail ? "Intake operations" : "Client operations";
  useNavigationLabel(currentLabel, currentFallbackHref, currentFallbackLabel);
  const setCompose = useCallback((context: ComposeContext) => openComposer(data, context), [data, openComposer]);
  const [sidebarViewport, setSidebarViewport] = useState<ManageSidebarViewport>("desktop");
  const [mobileNavOverride, setMobileNavOverride] = useState<boolean | null>(null);
  const readBrowserSidebarPreference = useCallback(() => {
    if (initialSidebarCollapsed !== null) return initialSidebarCollapsed;
    try {
      return parseSidebarPreference(window.sessionStorage.getItem(MANAGE_SIDEBAR_PREFERENCE_KEY) ?? undefined);
    } catch {
      return null;
    }
  }, [initialSidebarCollapsed]);
  const readServerSidebarPreference = useCallback(() => initialSidebarCollapsed, [initialSidebarCollapsed]);
  const storedSidebarCollapsed = useSyncExternalStore(subscribeToManageSidebarPreference, readBrowserSidebarPreference, readServerSidebarPreference);
  const defaultMobileNav = resolveManageRailOpen(sidebarViewport, storedSidebarCollapsed);
  const mobileNav = mobileNavOverride ?? defaultMobileNav;
  const setMobileNav = useCallback((next: boolean | ((current: boolean) => boolean)) => {
    setMobileNavOverride((current) => {
      const currentValue = current ?? defaultMobileNav;
      return typeof next === "function" ? next(currentValue) : next;
    });
  }, [defaultMobileNav]);
  const [manageMobileMenuOpen, setManageMobileMenuOpen] = useState(false);
  const [manageMobileMenuClosing, setManageMobileMenuClosing] = useState(false);
  const [sidebarPreferenceLoaded, setSidebarPreferenceLoaded] = useState(false);
  const [optimisticHref, setOptimisticHref] = useState<string | null>(null);
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setOptimisticHref(null);
  }
  const [isNavPending, startNavTransition] = useTransition();

  const currentPathname = optimisticHref ?? pathname;
  const [sidebarTooltip, setSidebarTooltip] = useState<{ label: string; left: number; top: number; closing?: boolean } | null>(null);
  const [search, setSearch] = useState(routeSearch);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchClosing, setSearchClosing] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchSheetRef = useRef<HTMLDivElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const sidebarTooltipCloseTimerRef = useRef<number | null>(null);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
        setSearchFocused(true);
        setSearchClosing(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const dialogCloseTimerRef = useRef<number | null>(null);
  const [dialog, setDialog] = useState<"account" | "contact" | "task" | "note" | "mailbox" | null>(null);
  const [dialogClosing, setDialogClosing] = useState<"account" | "contact" | "task" | "note" | "mailbox" | null>(null);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [createMenuClosing, setCreateMenuClosing] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileMenuClosing, setProfileMenuClosing] = useState(false);
  const [contextAccount, setContextAccount] = useState<ManageAccount | null>(null);
  const [busy, setBusy] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantInitialQuestion, setAssistantInitialQuestion] = useState<string | null>(null);
  const [assistantInitialSessionId, setAssistantInitialSessionId] = useState<string | null>(null);

  const openManageAssistant = useCallback((question?: string, sessionId?: string | null) => {
    setAssistantInitialQuestion(question?.trim() || null);
    setAssistantInitialSessionId(sessionId ?? null);
    setAssistantOpen(true);
  }, []);

  useEffect(() => {
    function updateSidebarViewport() {
      const nextViewport: ManageSidebarViewport =
        window.innerWidth <= 780
          ? "mobile"
          : window.innerWidth <= 980
            ? "compact"
            : "desktop";
      setSidebarViewport(nextViewport);
      setManageMobileMenuOpen(false);
      setManageMobileMenuClosing(false);
      setSidebarPreferenceLoaded(true);
    }

    const initializationFrame = window.requestAnimationFrame(() => {
      updateSidebarViewport();
    });
    window.addEventListener("resize", updateSidebarViewport);
    return () => {
      window.cancelAnimationFrame(initializationFrame);
      window.removeEventListener("resize", updateSidebarViewport);
    };
  }, [storedSidebarCollapsed]);

  useEffect(() => () => {
    if (dialogCloseTimerRef.current !== null) {
      window.clearTimeout(dialogCloseTimerRef.current);
    }
  }, []);

  const sidebarUsesRail = sidebarViewport !== "mobile";
  const sidebarPreferenceIsCollapsed = sidebarUsesRail && !mobileNav;

  const clearSidebarTooltip = useCallback(() => {
    setSidebarTooltip((current) => {
      if (!current || current.closing) return current;
      return { ...current, closing: true };
    });
    if (sidebarTooltipCloseTimerRef.current !== null) {
      window.clearTimeout(sidebarTooltipCloseTimerRef.current);
    }
    sidebarTooltipCloseTimerRef.current = window.setTimeout(() => {
      setSidebarTooltip(null);
      sidebarTooltipCloseTimerRef.current = null;
    }, 190);
  }, []);

  const {
    isPreviewOpen: manageSidebarPreviewOpen,
    onClickCapture: onManageSidebarClickCapture,
    onPointerEnter: onManageSidebarPointerEnter,
    onPointerLeave: onManageSidebarPointerLeave,
  } = useWorkspaceSidebarRail({
    enabled: sidebarUsesRail,
    isCollapsed: sidebarPreferenceIsCollapsed,
    onToggle: () => setMobileNav((current) => !current),
    onPreviewOpen: clearSidebarTooltip,
  });
  const sidebarIsCollapsed = sidebarPreferenceIsCollapsed && !manageSidebarPreviewOpen;

  const showSidebarTooltip = useCallback((label: string, element: HTMLElement) => {
    if (!sidebarIsCollapsed) return;
    if (sidebarTooltipCloseTimerRef.current !== null) {
      window.clearTimeout(sidebarTooltipCloseTimerRef.current);
      sidebarTooltipCloseTimerRef.current = null;
    }
    const rect = element.getBoundingClientRect();
    setSidebarTooltip({ label, left: rect.right + 2, top: rect.top + rect.height / 2 });
  }, [sidebarIsCollapsed]);

  useEffect(() => {
    if (!manageMobileMenuOpen && !manageMobileMenuClosing) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [manageMobileMenuClosing, manageMobileMenuOpen]);

  useEffect(() => {
    if (searchFocused) window.requestAnimationFrame(() => mobileSearchInputRef.current?.focus());
  }, [searchFocused]);

  useEffect(() => {
    if (!sidebarPreferenceLoaded || !shouldPersistManageRailPreference(sidebarViewport, storedSidebarCollapsed, mobileNavOverride !== null)) return;
    try {
      window.sessionStorage.setItem(
        MANAGE_SIDEBAR_PREFERENCE_KEY,
        String(!mobileNav),
      );
    } catch {
      // The cookie below keeps the preference available to the next server render.
    }
    document.cookie = manageSidebarPreferenceCookie(!mobileNav);
  }, [mobileNav, mobileNavOverride, sidebarPreferenceLoaded, sidebarViewport, storedSidebarCollapsed]);

  const closeManageMobileMenu = useCallback(() => {
    if (!manageMobileMenuOpen || manageMobileMenuClosing) return;
    setManageMobileMenuClosing(true);
    window.setTimeout(() => {
      setManageMobileMenuOpen(false);
      setManageMobileMenuClosing(false);
    }, MANAGE_MODAL_CLOSE_DURATION_MS);
  }, [manageMobileMenuClosing, manageMobileMenuOpen]);

  const openManageMobileMenu = useCallback(() => {
    if (manageMobileMenuClosing) return;
    setManageMobileMenuOpen(true);
  }, [manageMobileMenuClosing]);

  const handleManageNavSelect = useCallback(() => {
    // Customer and internal rails keep their desktop/compact state across route
    // changes. Only a real mobile navigation closes after a selection.
    if (sidebarViewport === "mobile") closeManageMobileMenu();
  }, [closeManageMobileMenu, sidebarViewport]);

  const closeSearch = useCallback(() => {
    if (!searchFocused || searchClosing) return;
    setSearchClosing(true);
    window.setTimeout(() => {
      setSearchFocused(false);
      setSearchClosing(false);
    }, 160);
  }, [searchClosing, searchFocused]);

  const closeCreateMenu = useCallback(() => {
    if (!createMenuOpen || createMenuClosing) return;
    setCreateMenuClosing(true);
    window.setTimeout(() => {
      setCreateMenuOpen(false);
      setCreateMenuClosing(false);
    }, 150);
  }, [createMenuClosing, createMenuOpen]);

  const closeProfileMenu = useCallback(() => {
    if (!profileMenuOpen || profileMenuClosing) return;
    setProfileMenuClosing(true);
    window.setTimeout(() => {
      setProfileMenuOpen(false);
      setProfileMenuClosing(false);
    }, 150);
  }, [profileMenuClosing, profileMenuOpen]);

  const closeDialog = useCallback(() => {
    if (!dialog || dialogClosing) return;
    setDialogClosing(dialog);
    if (dialogCloseTimerRef.current !== null) {
      window.clearTimeout(dialogCloseTimerRef.current);
    }
    dialogCloseTimerRef.current = window.setTimeout(() => {
      setDialog(null);
      setDialogClosing(null);
      setContextAccount(null);
      dialogCloseTimerRef.current = null;
    }, MANAGE_MODAL_CLOSE_DURATION_MS);
  }, [dialog, dialogClosing]);

  const openDialog = useCallback((next: "account" | "contact" | "task" | "note" | "mailbox") => {
    if (dialogClosing || dialog === next) return;
    setDialog(next);
  }, [dialog, dialogClosing]);

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (!dialog && !dialogClosing) return;
      event.preventDefault();
      closeDialog();
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [closeDialog, dialog, dialogClosing]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!searchContainerRef.current?.contains(event.target as Node) && !mobileSearchSheetRef.current?.contains(event.target as Node) && !(event.target as Element).closest?.(".workspace-mobile-search-trigger")) closeSearch();
      if (!createMenuRef.current?.contains(event.target as Node)) closeCreateMenu();
      if (!profileMenuRef.current?.contains(event.target as Node)) closeProfileMenu();
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeProfileMenu();
        if (sidebarViewport === "mobile") closeManageMobileMenu();
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeCreateMenu, closeManageMobileMenu, closeProfileMenu, closeSearch, sidebarViewport]);

  const results = useMemo(
    () => globalSearchResults(data, search),
    [data, search],
  );
  const resultsByCategory = useMemo(() => {
    const grouped = new Map<GlobalSearchResult["category"], GlobalSearchResult[]>();
    for (const result of results) {
      const categoryResults = grouped.get(result.category) ?? [];
      if (categoryResults.length < 5) categoryResults.push(result);
      grouped.set(result.category, categoryResults);
    }
    return currentSearchOrder(section)
      .map((category) => ({ category, results: grouped.get(category) ?? [] }))
      .filter(({ results }) => results.length > 0);
  }, [results, section]);

  function openSearchResult(result: GlobalSearchResult) {
    setSearchFocused(false);
    setSearchClosing(false);
    router.push(
      `${result.href}${result.href.includes("?") ? "&" : "?"}search=${encodeURIComponent(search.trim())}`,
    );
  }

  async function run(work: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await work();
      toast.success(success);
      closeDialog();
      router.refresh();
    } catch (error) {
      toast.error(
        "That didn’t work",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const pageTitle = section === "overview"
    ? "Client operations"
    : section === "invoice-review" ? "Invoice review"
      : section === "intake" ? "Intake operations"
        : section === "category-intelligence" ? "Category operations"
        : pretty(section);
  const globalSearchControl = (
    <div className={`manage-global-search-wrap${searchFocused || searchClosing ? " is-active" : ""}`} ref={searchContainerRef}>
      <label className="manage-search" title="Search all Costivra records">
        <Search size={16} />
        <input
          ref={searchInputRef}
          aria-label="Search all Costivra records"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onFocus={() => {
            setSearchFocused(true);
            setSearchClosing(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              closeSearch();
              event.currentTarget.blur();
            }
          }}
          placeholder={`Search ${searchCategoryLabels[currentSearchOrder(section)[0]].toLowerCase()} first, then everything`}
          role="combobox"
          aria-expanded={searchFocused && search.trim().length > 0}
          aria-controls="manage-global-search-results"
        />
        <span className="manage-kbd">⌘K</span>
      </label>
      {(searchFocused || searchClosing) && search.trim() && (
        <div
          className={`manage-global-results${searchClosing ? " is-closing" : ""}`}
          id="manage-global-search-results"
          role="listbox"
          aria-label="Global search results"
        >
          {resultsByCategory.length ? (
            resultsByCategory.map(({ category, results: categoryResults }) => {
              const Icon = searchCategoryIcons[category];
              return (
                <section className="manage-global-result-group" key={category}>
                  <h2>
                    <Icon aria-hidden="true" size={14} />
                    {searchCategoryLabels[category]}
                    {category === currentSearchOrder(section)[0] && <span>Current page</span>}
                  </h2>
                  {categoryResults.map((result) => (
                    <button
                      type="button"
                      role="option"
                      aria-selected={false}
                      key={result.id}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        openSearchResult(result);
                      }}
                    >
                      <strong>{result.title}</strong>
                      <small>{result.detail}</small>
                    </button>
                  ))}
                </section>
              );
            })
          ) : (
            <p className="manage-global-no-results">No records match “{search.trim()}”.</p>
          )}
        </div>
      )}
    </div>
  );
  return (
    <div
      className={`manage-app manage-shell-v2${assistantOpen ? " is-assistant-open" : ""}`}
      data-workspace-shell="operations"
    >
      {(isNavPending || optimisticHref !== null) && (
        <div className="manage-navigation-progress" aria-hidden="true" />
      )}
      <aside
        id="manage-owner-sidebar"
        className={`manage-sidebar${mobileNav || manageSidebarPreviewOpen ? " is-open" : ""}${
          sidebarIsCollapsed ? " is-collapsed" : ""
        }`}
        data-workspace-slot="rail"
        onClickCapture={onManageSidebarClickCapture}
        onPointerEnter={onManageSidebarPointerEnter}
        onPointerLeave={onManageSidebarPointerLeave}
      >
        <div className="manage-brand">
          {sidebarViewport === "mobile" ? (
            <>
              <Link href="/manage" title="Costivra Owner Operations" onClick={() => { setOptimisticHref("/manage"); handleManageNavSelect(); }}>
                <span className="manage-brand-mark"><CostivraMark size={34} /></span>
                <div className="manage-brand-copy"><strong>Costivra</strong><small>OWNER OPERATIONS</small></div>
              </Link>
              <button className="workspace-close-button manage-mobile-close" onClick={() => setMobileNav(false)} aria-label="Close menu">
                <X size={18} />
              </button>
            </>
          ) : (
            <WorkspaceSidebarBrandToggle
              collapsed={sidebarIsCollapsed}
              controlsId="manage-owner-sidebar"
              eyebrow="OWNER OPERATIONS"
              onToggle={() => {
                clearSidebarTooltip();
                if (!sidebarIsCollapsed) closeSearch();
                setMobileNav((current) => !current);
              }}
            />
          )}
        </div>
        <nav
          className="manage-primary-nav"
          aria-label="Owner portal"
          data-workspace-scrollbar=""
          onWheelCapture={(event) => {
            const node = event.currentTarget;
            const nextScrollTop = getNextVerticalScrollTop(node, event.deltaY);
            if (nextScrollTop === null) return;
            event.preventDefault();
            event.stopPropagation();
            node.scrollTop = nextScrollTop;
          }}
        >
          {(() => {
            const [label, href, Icon] = manageHomeNavigation;
            const active = isWorkspaceRouteActive({
              href,
              pathname: currentPathname,
              exact: true,
            });

            return (
              <div className="manage-nav-home">
                <Link
                  className={active ? "active" : ""}
                  href={href}
                  prefetch={true}
                  aria-current={active ? "page" : undefined}
                  aria-label={label}
                  onMouseEnter={(event) =>
                    showSidebarTooltip(label, event.currentTarget)
                  }
                  onMouseLeave={clearSidebarTooltip}
                  onFocus={(event) =>
                    showSidebarTooltip(label, event.currentTarget)
                  }
                  onBlur={clearSidebarTooltip}
                  onClick={() => {
                    if (href !== pathname) {
                      setOptimisticHref(href);
                      startNavTransition(() => {});
                    }
                    handleManageNavSelect();
                  }}
                >
                  <Icon size={18} />
                  <span className="manage-nav-label">{label}</span>
                </Link>
              </div>
            );
          })()}
          {navGroups.map((group) => (
            <div className="manage-nav-group" key={group.label}>
              <span className="manage-nav-group-label">{group.label}</span>
              {group.items.map(([label, href, Icon]) => {
                const active = isWorkspaceRouteActive({
                  href,
                  pathname: currentPathname,
                });
                const unreadCount = label === "Mail" ? data.mail.unreadCount : 0;
                return (
                  <Link
                    className={active ? "active" : ""}
                    href={href}
                    prefetch={true}
                    key={href}
                    aria-current={active ? "page" : undefined}
                    aria-label={
                      unreadCount > 0
                        ? `${label}, ${unreadCount} unread messages`
                        : label
                    }
                    onMouseEnter={(event) => showSidebarTooltip(event.currentTarget.getAttribute("aria-label") ?? label, event.currentTarget)}
                    onMouseLeave={clearSidebarTooltip}
                    onFocus={(event) => showSidebarTooltip(unreadCount > 0 ? `${label}, ${unreadCount} unread messages` : label, event.currentTarget)}
                    onBlur={clearSidebarTooltip}
                    onClick={() => {
                      if (href !== pathname) {
                        setOptimisticHref(href);
                        startNavTransition(() => {});
                      }
                      handleManageNavSelect();
                    }}
                  >
                    <Icon size={18} />
                    <span className="manage-nav-label">{label}</span>
                    {unreadCount > 0 && (
                      <b aria-hidden="true">{unreadBadge(unreadCount)}</b>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        {sidebarTooltip && sidebarIsCollapsed && (
          <div
            className={`manage-sidebar-tooltip${sidebarTooltip.closing ? " is-closing" : ""}`}
            aria-hidden="true"
            style={{ left: sidebarTooltip.left, top: sidebarTooltip.top }}
          >
            {sidebarTooltip.label}
          </div>
        )}
        <div className="manage-sidebar-foot">
          <nav className="manage-sidebar-utility" aria-label="Workspace settings">
            <Link
              className={isWorkspaceRouteActive({ href: settingsNav[1], pathname }) ? "active" : ""}
              href={settingsNav[1]}
              aria-label={settingsNav[0]}
              aria-current={isWorkspaceRouteActive({ href: settingsNav[1], pathname }) ? "page" : undefined}
              onMouseEnter={(event) => showSidebarTooltip(settingsNav[0], event.currentTarget)}
              onMouseLeave={clearSidebarTooltip}
              onFocus={(event) => showSidebarTooltip(settingsNav[0], event.currentTarget)}
              onBlur={clearSidebarTooltip}
              onClick={handleManageNavSelect}
            >
              <Settings size={18} />
              <span className="manage-nav-label">{settingsNav[0]}</span>
            </Link>
          </nav>
          <div className="manage-profile-menu-wrap" ref={profileMenuRef}>
            <button
              className={`manage-operator${profileMenuOpen ? " is-open" : ""}`}
              type="button"
              aria-label={`${data.operator.fullName} account menu`}
              aria-expanded={profileMenuOpen}
              aria-haspopup="menu"
              onMouseEnter={(event) => showSidebarTooltip(`${data.operator.fullName} account menu`, event.currentTarget)}
              onMouseLeave={clearSidebarTooltip}
              onFocus={(event) => showSidebarTooltip(`${data.operator.fullName} account menu`, event.currentTarget)}
              onBlur={clearSidebarTooltip}
              onClick={() => {
                if (sidebarIsCollapsed) {
                  setMobileNav(true);
                  window.setTimeout(() => setProfileMenuOpen(true), 240);
                  return;
                }
                if (profileMenuOpen) closeProfileMenu();
                else setProfileMenuOpen(true);
              }}
            >
              <OperatorAvatar operator={data.operator} />
              <span className="manage-operator-copy">
                <strong>{data.operator.fullName}</strong>
                <small>{data.operator.role}</small>
              </span>
            </button>
            {(profileMenuOpen || profileMenuClosing) && (
              <div
                className={`manage-profile-menu${profileMenuClosing ? " is-closing" : ""}`}
                role="menu"
                aria-label="Account options"
              >
                <div className="manage-profile-menu-heading">
                  <OperatorAvatar operator={data.operator} />
                  <span>
                    <strong>{data.operator.fullName}</strong>
                    <small>{data.operator.email}</small>
                  </span>
                </div>
                <Link
                  href="/manage/settings#profile-settings-title"
                  role="menuitem"
                  onClick={() => {
                    handleManageNavSelect();
                    closeProfileMenu();
                  }}
                >
                  <Settings size={15} aria-hidden="true" />
                  Profile &amp; photo
                </Link>
                <button type="button" role="menuitem" className="is-danger" onClick={() => void signOut()}>
                  <ArrowLeft size={15} aria-hidden="true" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
      <main
        className={`manage-main${sidebarIsCollapsed ? " is-collapsed" : ""}`}
        data-workspace-slot="canvas"
        onWheelCapture={(event) => {
          const node = event.currentTarget;
          const target = event.target as HTMLElement;
          if (
            hasNestedNativeScrollRegion(event.target, node) ||
            target.closest(".manage-global-results, .manage-create-menu, .manage-profile-menu, .manage-assistant")
          ) {
            return;
          }

          const scrollport = node.querySelector<HTMLElement>(".manage-page");
          if (!scrollport) return;

          const nextScrollTop = getNextVerticalScrollTop(scrollport, event.deltaY);
          if (nextScrollTop === null) return;
          event.preventDefault();
          event.stopPropagation();
          scrollport.scrollTop = nextScrollTop;
        }}
      >
        <header className="manage-topbar" data-workspace-slot="topbar">
          <div className="manage-topbar-leading">
          <div>
            <small>MANAGE</small>
            <h1>{pageTitle}</h1>
          </div>
          </div>
          <div className="manage-topbar-center">{globalSearchControl}</div>
          <div className="workspace-header-action-group manage-header-action-group">
            <button className={`workspace-mobile-search-trigger manage-mobile-search-trigger${searchFocused ? " is-open" : ""}`} type="button" aria-label="Open search" aria-expanded={searchFocused} aria-controls="manage-mobile-search-modal" onClick={() => { setSearchFocused(true); setSearchClosing(false); }}>
              <Search aria-hidden="true" size={17} />
            </button>
            <div className="manage-top-actions">
              <div className="manage-topbar-utilities" aria-label="Workspace utilities" data-workspace-slot="utilities">
            {(["overview", "accounts", "contacts", "outreach"] as const).includes(section as "overview" | "accounts" | "contacts" | "outreach") && (
              <div className="manage-create-wrap" ref={createMenuRef}>
              <WorkspaceUtilityButton active={createMenuOpen} className="manage-create-trigger" type="button" onClick={() => createMenuOpen ? closeCreateMenu() : setCreateMenuOpen(true)} aria-label="Create a new record" aria-expanded={createMenuOpen} aria-haspopup="menu">
                <Plus aria-hidden="true" size={18} strokeWidth={2.2} />
              </WorkspaceUtilityButton>
              {(createMenuOpen || createMenuClosing) && (
                <div className={`manage-create-menu${createMenuClosing ? " is-closing" : ""}`} role="menu" aria-label="Create a new record">
                  <button type="button" role="menuitem" onClick={() => { openDialog("account"); closeCreateMenu(); }}>
                    <span className="manage-create-icon manage-create-icon--account"><Building2 size={16} /></span>
                    <span className="manage-create-label">
                      <strong>Add account</strong>
                      <small>Client or prospect organization</small>
                    </span>
                  </button>
                  <button type="button" role="menuitem" onClick={() => { openDialog("contact"); closeCreateMenu(); }}>
                    <span className="manage-create-icon manage-create-icon--contact"><UserPlus size={16} /></span>
                    <span className="manage-create-label">
                      <strong>Add contact</strong>
                      <small>Key person or decision maker</small>
                    </span>
                  </button>
                  {section === "outreach" && (
                    <button type="button" role="menuitem" onClick={() => { openDialog("task"); closeCreateMenu(); }}>
                      <span className="manage-create-icon manage-create-icon--task"><CalendarClock size={16} /></span>
                      <span className="manage-create-label">
                        <strong>Add task</strong>
                        <small>Follow-up, call, meeting, or review</small>
                      </span>
                    </button>
                  )}
                </div>
              )}
              </div>
            )}
              <WorkspaceUtilityButton active={assistantOpen} type="button" className="manage-topbar-icon manage-topbar-icon--assistant" aria-label="Ask Costivra" title="Ask Costivra" aria-expanded={assistantOpen} aria-controls="manage-ai-drawer" onClick={() => assistantOpen ? setAssistantOpen(false) : openManageAssistant()}><CostivraAssistantIcon size={24} /></WorkspaceUtilityButton>
              <ManageNotificationCenter soundEnabled={data.operator.notificationSoundEnabled} />
              </div>
            {section === "mail" ? null : section === "settings" || section === "operations" || section === "invoice-review" || section === "intake" || section === "category-intelligence" ? null : section === "activity" ? (
              <button
                className="manage-button manage-button--primary"
                onClick={() => openDialog("note")}
              >
                <Plus size={16} /> Add note
              </button>
            ) : (["overview", "accounts", "contacts", "outreach"] as const).includes(section as "overview" | "accounts" | "contacts" | "outreach") ? null : (
              <button
                className="manage-button manage-button--primary"
                onClick={() =>
                  openDialog(
                    section === "contacts"
                      ? "contact"
                      : section === "outreach"
                        ? "task"
                        : "account",
                  )
                }
              >
                <Plus size={16} />{" "}
                {section === "contacts"
                  ? "Add contact"
                  : section === "outreach"
                    ? "Add task"
                    : "Add account"}
              </button>
              )}
            </div>
          </div>
        </header>
        {(searchFocused || searchClosing) && (
          <>
            <button className={`workspace-mobile-search-overlay${searchClosing ? " is-closing" : ""}`} type="button" aria-label="Close search" onClick={closeSearch} />
            <div className={`workspace-mobile-search-sheet${searchClosing ? " is-closing" : ""}`} id="manage-mobile-search-modal" ref={mobileSearchSheetRef} role="dialog" aria-modal="true" aria-label="Search all Costivra records">
              <div className="workspace-mobile-search-sheet__header">
                <label className="manage-search global-search workspace-mobile-search-sheet__input-wrap">
                  <Search aria-hidden="true" size={16} />
                  <input ref={mobileSearchInputRef} autoFocus aria-label="Search all Costivra records" type="text" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") { closeSearch(); event.currentTarget.blur(); } }} placeholder="Search all Costivra records" />
                </label>
                <button className="workspace-close-button workspace-mobile-search-sheet__close" type="button" aria-label="Close search" onClick={closeSearch}><X aria-hidden="true" size={18} /></button>
              </div>
              {search.trim() && <div className={`manage-global-results workspace-mobile-search-results${searchClosing ? " is-closing" : ""}`} role="listbox" aria-label="Global search results">{resultsByCategory.length ? resultsByCategory.map(({ category, results: categoryResults }) => { const Icon = searchCategoryIcons[category]; return <section className="manage-global-result-group" key={category}><h2><Icon aria-hidden="true" size={14} />{searchCategoryLabels[category]}{category === currentSearchOrder(section)[0] && <span>Current page</span>}</h2>{categoryResults.map((result) => <button type="button" role="option" aria-selected={false} key={result.id} onMouseDown={(event) => { event.preventDefault(); openSearchResult(result); }}><strong>{result.title}</strong><small>{result.detail}</small></button>)}</section>; }) : <p className="manage-global-no-results">No records match “{search.trim()}”.</p>}</div>}
            </div>
          </>
        )}
        <div
          key={section === "mail" ? "mail-workspace" : pathname}
          data-workspace-scrollbar={section === "mail" ? undefined : ""}
          className={`manage-page manage-page--${section}${manageRecordDetailRoute ? " manage-page--detail" : ""} motion-page`}
          onWheelCapture={manageRecordDetailRoute || section === "mail" ? undefined : (event) => {
            const node = event.currentTarget;
            const target = event.target as HTMLElement;
            if (
              hasNestedNativeScrollRegion(event.target, node) ||
              target.closest(
                ".manage-table-wrap, .manage-mail-list, .manage-message-stack, .manage-global-results, .manage-create-menu, .manage-profile-menu, .manage-assistant",
              )
            ) {
              return;
            }
            const nextScrollTop = getNextVerticalScrollTop(node, event.deltaY);
            if (nextScrollTop === null) return;
            event.preventDefault();
            event.stopPropagation();
            node.scrollTop = nextScrollTop;
          }}
        >
          {section !== "mail" && shouldRenderManagePageBack(section, hasDedicatedRecordBack) && (
            section === "outreach" ? (
              sequenceOutreachTab ? null : <div className="manage-outreach-context-row">
                <GlobalBackControl className="manage-global-back" />
                <button className="manage-button manage-button--primary" onClick={() => openDialog("task")}>
                  <Plus size={16} /> Add task
                </button>
              </div>
            ) : <GlobalBackControl className="manage-global-back" />
          )}
          {section === "overview" && (
            <Overview data={data} onOpenAssistant={openManageAssistant} />
          )}
          {section === "accounts" && (
              detailId ? <AccountDetailPage data={data} accountId={detailId} run={run} onCompose={(contact) => setCompose(contactComposeContext(contact))} onAddContact={(account) => { setContextAccount(account); openDialog("contact"); }} onAddNote={(account) => { setContextAccount(account); openDialog("note"); }} /> : <Accounts
              data={data}
              query={search}
            />
          )}
          {section === "contacts" && (
              detailId ? <ContactDetailPage data={data} contactId={detailId} run={run} onCompose={(contact) => setCompose(contactComposeContext(contact))} /> : <Contacts
              data={data}
              query={search}
              onCompose={(contact) => setCompose(contactComposeContext(contact))}
            />
          )}
          {section === "outreach" && (
            <Outreach
              data={data}
              query={search}
              run={run}
              sequenceId={outreachSequenceId}
            />
          )}
          {section === "mail" && (
            <MailPage
              data={data}
              query={search}
              run={run}
              onCompose={(context) => setCompose(context)}
            />
          )}
          {section === "settings" && (
            <SettingsPage
              data={data}
              query={search}
              run={run}
              onAdd={() => openDialog("mailbox")}
              onUpdated={() => router.refresh()}
            />
          )}
          {section === "invoice-review" && invoiceReview && (
            <ManageInvoiceReview
              data={invoiceReview}
              currentOperatorId={data.operator.id}
              owner={data.operator.role === "owner"}
            />
          )}
          {section === "intake" && intakeOperations && (
            <ManageIntakeOperations data={intakeOperations} />
          )}
          {section === "operations" && <ManagePilotOperations />}
          {section === "category-intelligence" && <ManageCategoryIntelligence />}
          {section === "trust-review" && trustReview && data.operator.role === "owner" && <OpportunityTrustReview data={trustReview} />}
          {section === "activity" && (
            <ActivityPage
              data={data}
              query={search}
              onNote={() => openDialog("note")}
            />
          )}
        </div>
      </main>
      <nav className="manage-mobile-nav" aria-label="Owner operations mobile navigation">
        {([
          ["Overview", "/manage", LayoutDashboard],
          ["Accounts", "/manage/accounts", Building2],
          ["Contacts", "/manage/contacts", Users],
          ["Outreach", "/manage/outreach", MessageSquareText],
        ] as const).map(([label, href, Icon]) => {
          const active = isWorkspaceRouteActive({ href: href as string, pathname: currentPathname, exact: href === "/manage" });
          return (
            <Link
              key={href as string}
              className={active ? "active" : ""}
              href={href as string}
              aria-current={active ? "page" : undefined}
              aria-label={`Open ${label}`}
              onClick={() => {
                if (href !== pathname) setOptimisticHref(href as string);
                handleManageNavSelect();
              }}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          className={manageMobileMenuOpen ? "active" : ""}
          aria-label="Open more owner operations"
          aria-expanded={manageMobileMenuOpen}
          aria-controls="manage-mobile-navigation"
          onClick={() => manageMobileMenuOpen ? closeManageMobileMenu() : openManageMobileMenu()}
        >
          <Menu size={18} aria-hidden="true" />
          <span>More</span>
        </button>
      </nav>
      {(manageMobileMenuOpen || manageMobileMenuClosing) && (
        <>
          <button
            type="button"
            className={`manage-mobile-drawer-overlay${manageMobileMenuClosing ? " is-closing" : ""}`}
            aria-label="Close owner operations navigation"
            onClick={closeManageMobileMenu}
          />
          <section
            id="manage-mobile-navigation"
            className={`manage-mobile-drawer${manageMobileMenuClosing ? " is-closing" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label="Owner operations navigation"
          >
            <header className="manage-mobile-drawer__header">
              <div>
                <strong>Owner operations</strong>
                <span>Navigate the internal workspace</span>
              </div>
              <button type="button" className="workspace-close-button" aria-label="Close menu" onClick={closeManageMobileMenu}>
                <X aria-hidden="true" size={18} />
              </button>
            </header>
            <nav className="manage-mobile-drawer__nav" aria-label="All owner operations pages">
              <div className="manage-mobile-drawer__group">
                {(() => {
                  const [label, href, Icon] = manageHomeNavigation;
                  const active = isWorkspaceRouteActive({ href, pathname: currentPathname, exact: true });
                  return (
                    <Link
                      className={active ? "active" : ""}
                      href={href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => {
                        if (href !== pathname) setOptimisticHref(href);
                        handleManageNavSelect();
                      }}
                    >
                      <Icon aria-hidden="true" size={18} />
                      <span>{label}</span>
                    </Link>
                  );
                })()}
              </div>
              {navGroups.map((group) => (
                <div className="manage-mobile-drawer__group" key={group.label}>
                  <span className="manage-mobile-drawer__label">{group.label}</span>
                  {group.items.map(([label, href, Icon]) => {
                    const active = isWorkspaceRouteActive({ href, pathname: currentPathname });
                    return (
                      <Link
                        key={href}
                        className={active ? "active" : ""}
                        href={href}
                        aria-current={active ? "page" : undefined}
                        onClick={() => {
                          if (href !== pathname) setOptimisticHref(href);
                          handleManageNavSelect();
                        }}
                      >
                        <Icon aria-hidden="true" size={18} />
                        <span>{label}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
            <footer className="manage-mobile-drawer__footer">
              <Link href={settingsNav[1]} onClick={handleManageNavSelect}>
                <Settings aria-hidden="true" size={17} />
                <span>{settingsNav[0]}</span>
              </Link>
              <button type="button" onClick={() => void signOut()}>
                <OperatorAvatar operator={data.operator} />
                <span><strong>{data.operator.fullName}</strong><small>Sign out</small></span>
                <ArrowLeft aria-hidden="true" size={17} />
              </button>
            </footer>
          </section>
        </>
      )}
      <div id="manage-ai-drawer">
        <ManageAiDrawer
          open={assistantOpen}
          onClose={() => { setAssistantOpen(false); setAssistantInitialQuestion(null); setAssistantInitialSessionId(null); }}
          section={section}
          detailId={detailId}
          initialQuestion={assistantInitialQuestion}
          initialSessionId={assistantInitialSessionId}
        />
      </div>
      {dialog === "account" && (
        <AccountForm
          busy={busy}
          onClose={closeDialog}
          isClosing={Boolean(dialogClosing)}
          onSubmit={(form) =>
            run(
              () =>
                api("/api/manage/accounts", {
                  method: "POST",
                  body: JSON.stringify(Object.fromEntries(form)),
                }),
              "Account added to the live CRM.",
            )
          }
        />
      )}
      {dialog === "contact" && (
        <ContactForm
          data={data}
          defaultAccount={contextAccount}
          busy={busy}
          onClose={closeDialog}
          isClosing={Boolean(dialogClosing)}
          onSubmit={(form) =>
            run(
              () =>
                api("/api/manage/contacts", {
                  method: "POST",
                  body: JSON.stringify(Object.fromEntries(form)),
                }),
              "Contact added.",
            )
          }
        />
      )}
      {dialog === "task" && (
        <TaskForm
          data={data}
          defaultAccount={contextAccount}
          busy={busy}
          onClose={closeDialog}
          isClosing={Boolean(dialogClosing)}
          onSubmit={(form) =>
            run(
              () =>
                api("/api/manage/tasks", {
                  method: "POST",
                  body: JSON.stringify(Object.fromEntries(form)),
                }),
              "Follow-up task created.",
            )
          }
        />
      )}
      {dialog === "note" && (
        <NoteForm
          data={data}
          defaultAccount={contextAccount}
          busy={busy}
          onClose={closeDialog}
          isClosing={Boolean(dialogClosing)}
          onSubmit={(form) =>
            run(
              () =>
                api("/api/manage/activities", {
                  method: "POST",
                  body: JSON.stringify(Object.fromEntries(form)),
                }),
              "Note added to the activity record.",
            )
          }
        />
      )}
      {dialog === "mailbox" && (
        <MailboxForm
          data={data}
          busy={busy}
          onClose={closeDialog}
          isClosing={Boolean(dialogClosing)}
          onSubmit={(form) =>
            run(
              () =>
                api("/api/manage/mailboxes", {
                  method: "POST",
                  body: JSON.stringify(Object.fromEntries(form)),
                }),
              "Mailbox seat created and ready to use.",
            )
          }
        />
      )}
    </div>
  );
}

function Overview({ data, onOpenAssistant }: { data: ManageData; onOpenAssistant: (question?: string, sessionId?: string | null) => void }) {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    data.accounts[0]?.id ?? null,
  );
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(data.accounts.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageAccounts = data.accounts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const active = data.accounts.filter(
    (account) => account.stage === "active",
  ).length;
  const followUps = data.tasks.filter((task) =>
    ["open", "in_progress"].includes(task.status),
  ).length;
  const onboarding = data.accounts.filter(
    (account) => account.stage === "onboarding",
  ).length;
  const hasUrgentWork = followUps > 0 || onboarding > 0;

  const selectedAccount =
    data.accounts.find((a) => a.id === selectedAccountId) ?? data.accounts[0];

  const accountActivities = useMemo(
    () =>
      selectedAccount
        ? data.activities.filter(
            (act) => act.organizationId === selectedAccount.id,
          )
        : [],
    [data.activities, selectedAccount],
  );

  const accountContacts = useMemo(
    () =>
      selectedAccount
        ? data.contacts.filter((c) => c.organizationId === selectedAccount.id)
        : [],
    [data.contacts, selectedAccount],
  );

  return (
    <>
      <ManageOverviewAssistant onOpenAssistant={onOpenAssistant} />
      <ManageReferralReviewQueue />
      <section className="manage-summary" aria-label="CRM summary">
        <div className="manage-summary-card workspace-metric-card">
          <div className="manage-summary-meta">
            <small>CLIENTS</small>
          </div>
          <div className="manage-summary-value">
            <strong>{data.accounts.length}</strong>
            <span>organizations in view</span>
          </div>
        </div>
        <div className="manage-summary-card workspace-metric-card">
          <div className="manage-summary-meta">
            <small>ACTIVE</small>
          </div>
          <div className="manage-summary-value">
            <strong>{active}</strong>
            <span>current accounts</span>
          </div>
        </div>
        <div className="manage-summary-card workspace-metric-card">
          <div className="manage-summary-meta">
            <small>OPEN WORK</small>
          </div>
          <div className="manage-summary-value">
            <strong>{followUps}</strong>
            <span>follow-ups to act on</span>
          </div>
        </div>
        <div className="manage-summary-card workspace-metric-card">
          <div className="manage-summary-meta">
            <small>ONBOARDING</small>
          </div>
          <div className="manage-summary-value">
            <strong>{onboarding}</strong>
            <span>accounts in setup</span>
          </div>
        </div>
      </section>
      <div className="manage-overview-grid">
        <section className="manage-panel manage-account-table">
          <header>
            <div>
              <h3>Accounts</h3>
              <p>Live organizations and their next action. Select a row to inspect.</p>
            </div>
            <Link href="/manage/accounts">View all</Link>
          </header>
          <AccountRows
            accounts={pageAccounts}
            selectedId={selectedAccount?.id}
            onSelectAccount={(account) => setSelectedAccountId(account.id)}
            showRowNumbers
          />
          {!data.accounts.length && (
            <Empty
              icon={Building2}
              title="No accounts yet"
              copy="Use the create button beside global search to add the first real account."
            />
          )}
          <TableFooter
            count={data.accounts.length}
            noun="account"
            page={currentPage}
            pageCount={pageCount}
            onPage={setPage}
          />
        </section>
        <AccountInspector
          data={data}
          account={selectedAccount}
          activities={accountActivities}
          contacts={accountContacts}
        />
      </div>
      {!hasUrgentWork ? <ManageSteadyState data={data} /> : <div className="manage-lower-grid">
        <section className="manage-panel">
          <header>
            <div>
              <h3>Open follow-ups</h3>
              <p>Tasks that still need a person to act.</p>
            </div>
            <Link href="/manage/outreach">Open outreach</Link>
          </header>
          <TaskList
            tasks={data.tasks
              .filter((task) => ["open", "in_progress"].includes(task.status))
              .slice(0, 5)}
          />
          {!data.tasks.some((task) =>
            ["open", "in_progress"].includes(task.status),
          ) && (
            <Empty
              icon={CheckCircle2}
              title="No open follow-ups"
              copy="Create a real task when a client needs a call, email, meeting, or review."
            />
          )}
        </section>
        <section className="manage-panel">
          <header>
            <div>
              <h3>Recent activity</h3>
              <p>Internal notes and client touches.</p>
            </div>
            <Link href="/manage/activity">Full history</Link>
          </header>
          <ActivityList activities={data.activities.slice(0, 5)} />
          {!data.activities.length && (
            <Empty
              icon={Activity}
              title="No CRM activity yet"
              copy="New notes, tasks, and email activity will be recorded here."
            />
          )}
        </section>
      </div>}
    </>
  );
}

function ManageSteadyState({ data }: { data: ManageData }) {
  const nextTouches = data.accounts
    .filter((account) => account.nextFollowUpAt)
    .sort((a, b) => String(a.nextFollowUpAt).localeCompare(String(b.nextFollowUpAt)))
    .slice(0, 4);
  const recentActivities = data.activities.slice(0, 5);
  const contactedAccounts = data.accounts.filter((account) => account.lastContactedAt).length;
  const assignedContacts = data.contacts.filter((contact) => contact.isPrimary).length;
  const recordedDocuments = data.documents.length;

  return (
    <section className="steady-state-dashboard manage-steady-state" aria-label="Client operations pulse">
      <div className="steady-state-dashboard__header">
        <div>
          <span className="portal-panel-eyebrow">Operations pulse</span>
          <h2>Client work is current</h2>
          <p>No follow-ups or onboarding steps are waiting right now. Keep relationships warm and use this view to spot the next useful touch.</p>
        </div>
        <Link className="button button-quiet button-sm" href="/manage/accounts">
          View accounts <ArrowUpRight size={14} />
        </Link>
      </div>
      <div className="steady-state-dashboard__grid">
        <section className="manage-panel steady-state-card manage-steady-state-card">
          <header>
            <div>
              <span className="portal-panel-eyebrow">Client health</span>
              <h3>Coverage at a glance</h3>
            </div>
            <CheckCircle2 className="steady-state-card__icon" size={18} aria-hidden="true" />
          </header>
          <dl className="steady-state-facts">
            <div><dt>Accounts contacted</dt><dd>{contactedAccounts}</dd></div>
            <div><dt>Primary contacts</dt><dd>{assignedContacts}</dd></div>
            <div><dt>Source records</dt><dd>{recordedDocuments}</dd></div>
          </dl>
          <p className="steady-state-card__footnote">Keep contact, account, and source records current so the next action is easy to see.</p>
        </section>
        <section className="manage-panel steady-state-card manage-steady-state-card">
          <header>
            <div>
              <span className="portal-panel-eyebrow">Next client touches</span>
              <h3>Stay ahead of the relationship</h3>
            </div>
            <CalendarClock className="steady-state-card__icon" size={18} aria-hidden="true" />
          </header>
          {nextTouches.length ? (
            <div className="steady-state-list">
              {nextTouches.map((account) => (
                <Link href={`/manage/accounts/${account.id}`} key={account.id}>
                  <span><strong>{account.name}</strong><small>{account.nextStep || "Scheduled client touch"}</small></span>
                  <time dateTime={account.nextFollowUpAt ?? undefined}>{date(account.nextFollowUpAt)}</time>
                </Link>
              ))}
            </div>
          ) : (
            <p className="steady-state-empty">No future touches are scheduled. Add one when a client has a meaningful next step.</p>
          )}
        </section>
        <section className="manage-panel steady-state-card steady-state-card--wide manage-steady-state-card">
          <header>
            <div>
              <span className="portal-panel-eyebrow">Recent activity</span>
              <h3>What changed in client operations</h3>
            </div>
            <Link href="/manage/activity">Full history <ArrowUpRight size={14} /></Link>
          </header>
          {recentActivities.length ? (
            <ol className="steady-state-timeline">
              {recentActivities.map((activity) => (
                <li key={activity.id}>
                  <span className="steady-state-timeline__dot" aria-hidden="true" />
                  <div><strong>{activity.subject}</strong><small>{activity.organizationName} · {activity.actorName || pretty(activity.kind)}</small></div>
                  <time dateTime={activity.occurredAt}>{date(activity.occurredAt)}</time>
                </li>
              ))}
            </ol>
          ) : (
            <p className="steady-state-empty">New notes, meetings, and client touches will appear here.</p>
          )}
        </section>
      </div>
    </section>
  );
}

function BulkRowSelector({
  checked,
  index,
  label,
  onChange,
}: {
  checked: boolean;
  index: number;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={`${checked ? "Deselect" : "Select"} ${label}`}
      className={`manage-bulk-row-selector${checked ? " is-checked" : ""}`}
      onClick={(event) => {
        event.stopPropagation();
        onChange();
      }}
    >
      <span>{index}</span>
      <Check size={11} strokeWidth={3} />
    </button>
  );
}

function BulkHeaderSelector({
  state,
  onChange,
}: {
  state: "none" | "some" | "all";
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={state === "some" ? "mixed" : state === "all"}
      aria-label="Select all visible rows"
      className={`manage-bulk-header-selector is-${state}`}
      onClick={onChange}
    >
      {state === "some" ? <span>−</span> : state === "all" ? <Check size={11} strokeWidth={3} /> : null}
    </button>
  );
}

function TableFooter({
  count,
  noun,
  page,
  pageCount,
  onPage,
  children,
}: {
  count: number;
  noun: string;
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
  children?: ReactNode;
}) {
  return (
    <footer className="manage-table-footer">
      <div className="manage-table-footer-count">
        <span>{count} {count === 1 ? noun : `${noun}s`}</span>
      </div>
      {children && <div className="manage-table-footer-center">{children}</div>}
      <div className="manage-table-footer-pagination">
        <button disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft size={15} />
        </button>
        <span>{page} / {pageCount}</span>
        <button disabled={page >= pageCount} onClick={() => onPage(page + 1)} aria-label="Next page">
          <ChevronRight size={15} />
        </button>
      </div>
    </footer>
  );
}

function ManageOverviewAssistant({ onOpenAssistant }: { onOpenAssistant: (question?: string, sessionId?: string | null) => void }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Array<{ id: string; role: "user" | "assistant"; content: string; sources?: Array<{ id: string; label: string; detail: string; href: string }> }>>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanQuestion = question.trim();
    if (cleanQuestion.length < 2 || sending) return;
    setQuestion("");
    setError(null);
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", content: cleanQuestion }]);
    setSending(true);
    try {
      const response = await fetch("/api/manage/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: cleanQuestion, section: "overview", sessionId }),
      });
      const result = await response.json().catch(() => null) as { answer?: string; session?: { id?: string }; sources?: Array<{ id: string; label: string; detail: string; href: string }>; error?: string } | null;
      if (!response.ok || !result?.answer) throw new Error(result?.error || "Costivra could not answer that question.");
      if (result.session?.id) setSessionId(result.session.id);
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: result.answer!, sources: result.sources ?? [] }]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Costivra could not answer that question.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className={`manage-dashboard-assistant${messages.length ? " manage-dashboard-assistant--active" : ""}`} aria-labelledby="manage-dashboard-assistant-title">
      <div className="manage-dashboard-assistant__copy">
        <h2 id="manage-dashboard-assistant-title">What would you like to find?</h2>
        <p>Ask about an account, contact, follow-up, or the next action in your client work.</p>
      </div>
      <div className={`manage-dashboard-assistant__conversation${messages.length ? " is-active" : ""}`}>
        {messages.length > 0 && <AssistantConversationScroller className="manage-dashboard-assistant__thread" itemCount={messages.length} isLoading={sending} conversationKey={sessionId ?? "new"}>
          {messages.map((message, index) => <div key={message.id} className={`manage-dashboard-assistant__message manage-dashboard-assistant__message--${message.role}`} style={{ "--message-index": index } as CSSProperties}><strong>{message.role === "assistant" ? "Costivra" : "You"}</strong><p>{message.content}</p>{message.sources && message.sources.length > 0 && <div className="manage-dashboard-assistant__sources"><span>Referenced records</span>{message.sources.slice(0, 4).map((source) => <a key={source.id} href={source.href}><strong>{source.label}</strong><small>{source.detail}</small></a>)}</div>}</div>)}
          {sending && <p className="manage-dashboard-assistant__thinking">Costivra is reviewing client operations…</p>}
        </AssistantConversationScroller>}
        <form className="assistant-composer-wrap dashboard-assistant__composer manage-dashboard-assistant__form" onSubmit={(event) => void submit(event)}>
          <AssistantComposerShell>
            <AssistantIconButton label="Open full Ask Costivra history" onClick={() => onOpenAssistant(question.trim() || undefined, sessionId)}>
              <CostivraAssistantIcon size={18} />
            </AssistantIconButton>
            <textarea
              className="assistant-composer-textarea"
              value={question}
              onChange={(event) => {
                setQuestion(event.target.value.slice(0, 2_000));
                resizeAssistantComposer(event.currentTarget);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Ask about the client workspace..."
              rows={1}
              aria-label="Ask Costivra about client operations"
            />
            <button type="submit" className="manage-dashboard-assistant__send" aria-label="Send question" disabled={sending || question.trim().length < 2}>
              {sending ? <LoaderCircle className="spin" size={16} aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
            </button>
          </AssistantComposerShell>
        </form>
      </div>
      {error && <p className="manage-dashboard-assistant__error" role="alert">{error}</p>}
    </section>
  );
}

type ManageReferralReview = {
  id: string;
  organization_id: string;
  status: string;
  purpose: string;
  consent_id: string | null;
  created_at: string;
  organizations?: { name?: string | null } | null;
  partner_destinations?: { display_name?: string | null; category?: string | null; external_enabled?: boolean } | null;
};

function ManageReferralReviewQueue() {
  const [requests, setRequests] = useState<ManageReferralReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/manage/referrals", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json().catch(() => null) as { requests?: ManageReferralReview[]; error?: string } | null;
        if (!response.ok) throw new Error(result?.error || "The referral review queue could not be loaded.");
        if (!cancelled) {
          setRequests(result?.requests ?? []);
          setError(null);
        }
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : "The referral review queue could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  async function blockRequest(id: string) {
    if (!window.confirm("Block this partner review request? No customer records will be shared.")) return;
    setBusyId(id);
    try {
      const response = await fetch("/api/manage/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "block", referralId: id, reason: "Blocked by an authorized internal operator." }),
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error || "The referral request could not be blocked.");
      setRequests((current) => current.filter((request) => request.id !== id));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The referral request could not be blocked.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading || (!requests.length && !error)) return null;

  return (
    <section className="manage-referral-queue" aria-labelledby="manage-referral-queue-title">
      <header className="manage-referral-queue__header">
        <div>
          <span className="manage-referral-queue__eyebrow">Partner review</span>
          <h2 id="manage-referral-queue-title">Consent requests awaiting internal review</h2>
          <p>Customer consent is recorded. Nothing is transmitted while the destination remains disabled.</p>
        </div>
        <span className="manage-referral-queue__count">{requests.length} pending</span>
      </header>
      {error && <p className="manage-referral-queue__error" role="alert">{error}</p>}
      <div className="manage-referral-queue__list">
        {requests.map((request) => (
          <div className="manage-referral-queue__item" key={request.id}>
            <div className="manage-referral-queue__item-copy">
              <strong>{request.organizations?.name || "Organization review"}</strong>
              <span>{request.partner_destinations?.display_name || "Partner destination"} · {request.partner_destinations?.category || "Category not recorded"}</span>
              <small>{request.purpose}</small>
            </div>
            <div className="manage-referral-queue__item-actions">
              <span className="manage-referral-queue__status">Consent recorded</span>
              <button type="button" className="manage-button manage-button--quiet" disabled={busyId === request.id} onClick={() => void blockRequest(request.id)}>
                {busyId === request.id ? "Blocking…" : "Block request"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ManageQueueScopeControl({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ label: string; value: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="manage-queue-scope">
      <span>{label}</span>
      <CostivraSelect
        aria-label={label}
        className="manage-queue-scope__select"
        onChange={onChange}
        options={options}
        value={value}
        variant="compact"
      />
    </div>
  );
}

function BulkActionBar({
  count,
  noun,
  onExport,
  onPrimary,
  primaryLabel,
  onClear,
}: {
  count: number;
  noun: string;
  onExport: () => void;
  onPrimary?: () => void;
  primaryLabel?: string;
  onClear: () => void;
}) {
  if (!count) return null;
  return (
    <div className="manage-bulk-action-bar" role="region" aria-label="Bulk actions">
      <strong>{count}</strong>
      <span>{count === 1 ? noun : `${noun}s`} selected</span>
      <div>
        {onPrimary && primaryLabel && (
          <button onClick={onPrimary} disabled={count !== 1}>{primaryLabel}</button>
        )}
        <button onClick={onExport}><Download size={14} /> Export selected</button>
        <button className="manage-bulk-clear" onClick={onClear} aria-label="Clear selection"><X size={15} /></button>
      </div>
    </div>
  );
}

function AccountRows({
  accounts,
  selectedId,
  onSelectAccount,
  selectedIds,
  onToggle,
  onTogglePage,
  showRowNumbers = false,
  empty,
}: {
  accounts: ManageAccount[];
  selectedId?: string;
  onSelectAccount?: (account: ManageAccount) => void;
  selectedIds?: Set<string>;
  onToggle?: (id: string) => void;
  onTogglePage?: () => void;
  showRowNumbers?: boolean;
  empty?: ReactNode;
}) {
  const pageSelection = accounts.length > 0 && accounts.every((account) => selectedIds?.has(account.id));
  const someSelected = accounts.some((account) => selectedIds?.has(account.id));
  return (
    <>
      <div className={`manage-table-wrap${accounts.length === 0 ? " is-empty" : ""}`}>
        <table className="manage-data-table manage-account-data-table">
        <thead>
          <tr>
            {(onToggle || showRowNumbers) && (
              <th className="manage-row-number-cell">
                {onToggle ? (
                  <BulkHeaderSelector
                    state={pageSelection ? "all" : someSelected ? "some" : "none"}
                    onChange={() => onTogglePage?.()}
                  />
                ) : null}
              </th>
            )}
            <th className="manage-sticky-column">Account</th>
            <th>Primary contact</th>
            <th>Marketing</th>
            <th>Stage</th>
            <th>Last touch</th>
            <th>Next step</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account, index) => {
            const isSelected = account.id === selectedId;
            const isBulkSelected = selectedIds?.has(account.id) ?? false;
            return (
              <tr
                key={account.id}
                className={`${isSelected ? "is-selected" : ""}${isBulkSelected ? " is-bulk-selected" : ""}`}
                onClick={() => onSelectAccount?.(account)}
                onKeyDown={(event) => {
                  if (!onSelectAccount || (event.key !== "Enter" && event.key !== " ")) return;
                  event.preventDefault();
                  onSelectAccount(account);
                }}
                tabIndex={onSelectAccount ? 0 : undefined}
                style={{ cursor: onSelectAccount ? "pointer" : "default" }}
              >
                {(onToggle || showRowNumbers) && (
                  <td className="manage-row-number-cell">
                    {onToggle ? (
                      <BulkRowSelector
                        checked={isBulkSelected}
                        index={index + 1}
                        label={account.name}
                        onChange={() => onToggle(account.id)}
                      />
                    ) : (
                      <span className="manage-row-number">{index + 1}</span>
                    )}
                  </td>
                )}
                <td className="manage-sticky-column">
                  <Link href={`/manage/accounts/${account.id}`} className="manage-table-record-card" onClick={(event) => event.stopPropagation()}>
                    <CompanyLogo entity="organization" id={account.id} name={account.name} className="manage-account-avatar" />
                    <span className="manage-table-record-meta">
                      <strong>{account.name}</strong>
                      <small>{account.industry || "Industry not set"}</small>
                    </span>
                  </Link>
                </td>
                <td>
                  <strong>{account.primaryContact || "No contact"}</strong>
                  <small>{account.primaryEmail || "—"}</small>
                </td>
                <td>
                  <MarketingConsent count={account.marketingOptInCount} compact />
                </td>
                <td>
                  <Status value={account.stage} />
                </td>
                <td>{date(account.lastContactedAt)}</td>
                <td>
                  <strong>{account.nextStep || "Not set"}</strong>
                  <small>{date(account.nextFollowUpAt)}</small>
                </td>
              </tr>
            );
          })}
        </tbody>
        </table>
        {accounts.length === 0 && empty ? <div className="manage-table-empty-state">{empty}</div> : null}
      </div>
      {accounts.length ? (
        <div className="manage-account-cards">
          {accounts.map((account, index) => {
            const isBulkSelected = selectedIds?.has(account.id) ?? false;
            return (
              <article
                key={account.id}
                className={isBulkSelected || account.id === selectedId ? "is-selected" : undefined}
              >
                <header className="manage-account-card__header">
                  {onToggle ? (
                    <BulkRowSelector
                      checked={isBulkSelected}
                      index={index + 1}
                      label={account.name}
                      onChange={() => onToggle(account.id)}
                    />
                  ) : null}
                  <Link href={`/manage/accounts/${account.id}`} className="manage-account-card__identity">
                    <CompanyLogo entity="organization" id={account.id} name={account.name} className="manage-account-avatar" />
                    <span>
                      <strong>{account.name}</strong>
                      <small>{account.industry || "Industry not set"}</small>
                    </span>
                  </Link>
                  <Status value={account.stage} />
                </header>
                <dl className="manage-account-card__details">
                  <div>
                    <dt>Primary contact</dt>
                    <dd>
                      <strong>{account.primaryContact || "No contact"}</strong>
                      <small>{account.primaryEmail || "No email recorded"}</small>
                    </dd>
                  </div>
                  <div>
                    <dt>Marketing</dt>
                    <dd><MarketingConsent count={account.marketingOptInCount} compact /></dd>
                  </div>
                  <div>
                    <dt>Last touch</dt>
                    <dd>{date(account.lastContactedAt)}</dd>
                  </div>
                  <div className="manage-account-card__next-step">
                    <dt>Next step</dt>
                    <dd>
                      <strong>{account.nextStep || "Not set"}</strong>
                      <small>{date(account.nextFollowUpAt)}</small>
                    </dd>
                  </div>
                </dl>
                <footer className="manage-account-card__footer">
                  <Link href={`/manage/accounts/${account.id}`}>
                    Open account <ChevronRight aria-hidden="true" size={15} />
                  </Link>
                </footer>
              </article>
            );
          })}
        </div>
      ) : empty ? (
        <div className="manage-account-cards manage-account-cards--empty">{empty}</div>
      ) : null}
    </>
  );
}

function AccountInspector({
  data,
  account,
  activities = [],
  contacts = [],
}: {
  data: ManageData;
  account?: ManageAccount;
  activities?: ManageActivity[];
  contacts?: ManageContact[];
}) {
  const [tab, setTab] = useState<"overview" | "timeline" | "contacts">("overview");
  const [composer, setComposer] = useState<"task" | "note" | null>(null);
  const [busy, setBusy] = useState(false);
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const router = useRouter();
  const toast = useToast();
  const inspectorTabs = ["overview", "timeline", "contacts"] as const;

  function handleInspectorTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    const currentIndex = inspectorTabs.indexOf(tab);
    let nextIndex = currentIndex;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % inspectorTabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + inspectorTabs.length) % inspectorTabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = inspectorTabs.length - 1;
    else return;

    event.preventDefault();
    const nextTab = inspectorTabs[nextIndex];
    setTab(nextTab);
    window.requestAnimationFrame(() => document.getElementById(`manage-inspector-tab-${nextTab}`)?.focus());
  }

  async function submitComposer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account || !composer) return;
    setBusy(true);
    try {
      const form = new FormData(event.currentTarget);
      form.set("organizationId", account.id);
      await api(composer === "task" ? "/api/manage/tasks" : "/api/manage/activities", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(form)),
      });
      toast.success(composer === "task" ? "Follow-up task created." : "Note added to the activity record.");
      setComposer(null);
      setMentionedUserIds([]);
      router.refresh();
    } catch (error) {
      toast.error("That didn’t work", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!account)
    return (
      <aside className="manage-panel manage-inspector">
        <Empty
          icon={Building2}
          title="No account selected"
          copy="Select a real account to see its customer workspace and follow-up context."
        />
      </aside>
    );

  return (
    <aside className="manage-panel manage-inspector">
      <div className="manage-inspector-account-content" key={account.id}>
        <header className="manage-inspector-header">
          <Link href={`/manage/accounts/${account.id}`} className="manage-inspector-account manage-inspector-record-card" title={`Open ${account.name}`}>
            <CompanyLogo entity="organization" id={account.id} name={account.name} className="manage-account-avatar" />
            <div>
              <h3>{account.name}</h3>
              <p>{account.industry || "Industry not set"}</p>
            </div>
          </Link>
        </header>
        <div className="manage-inspector-tabs" role="tablist" aria-label="Account context" style={{ "--active-tab": tab === "overview" ? 0 : tab === "timeline" ? 1 : 2 } as CSSProperties}>
        <button
          id="manage-inspector-tab-overview"
          role="tab"
          className={tab === "overview" ? "active" : ""}
          aria-selected={tab === "overview"}
          aria-controls="manage-inspector-tab-panel"
          tabIndex={tab === "overview" ? 0 : -1}
          onClick={() => setTab("overview")}
          onKeyDown={handleInspectorTabKeyDown}
        >
          Overview
        </button>
        <button
          id="manage-inspector-tab-timeline"
          role="tab"
          className={tab === "timeline" ? "active" : ""}
          aria-selected={tab === "timeline"}
          aria-controls="manage-inspector-tab-panel"
          tabIndex={tab === "timeline" ? 0 : -1}
          onClick={() => setTab("timeline")}
          onKeyDown={handleInspectorTabKeyDown}
        >
          Timeline ({activities.length})
        </button>
        <button
          id="manage-inspector-tab-contacts"
          role="tab"
          className={tab === "contacts" ? "active" : ""}
          aria-selected={tab === "contacts"}
          aria-controls="manage-inspector-tab-panel"
          tabIndex={tab === "contacts" ? 0 : -1}
          onClick={() => setTab("contacts")}
          onKeyDown={handleInspectorTabKeyDown}
        >
          Contacts ({contacts.length})
        </button>
        </div>

        <div key={tab} id="manage-inspector-tab-panel" role="tabpanel" aria-labelledby={`manage-inspector-tab-${tab}`} tabIndex={0} className="manage-inspector-tab-panel">
      {tab === "overview" && (
        <>
          <dl>
            <div>
              <dt>Lifecycle</dt>
              <dd>
                <InlineAccountStage account={account} />
              </dd>
            </div>
            <div>
              <dt>Primary contact</dt>
              <dd>
                <strong>{account.primaryContact || "Not set"}</strong>
                <span>{account.primaryEmail || "No email"}</span>
              </dd>
            </div>
            <div>
              <dt>Email marketing</dt>
              <dd>
                <MarketingConsent count={account.marketingOptInCount} />
                <span>
                  {account.latestMarketingConsentAt
                    ? `Recorded ${date(account.latestMarketingConsentAt, true)}`
                    : "Consent must be explicit before marketing email is sent"}
                </span>
              </dd>
            </div>
            <div>
              <dt>Next follow-up</dt>
              <dd>
                <InlineAccountText account={account} field="nextFollowUpAt" type="datetime-local" value={account.nextFollowUpAt?.slice(0, 16) ?? ""} display={date(account.nextFollowUpAt, true)} placeholder="Set a follow-up" />
                <InlineAccountText account={account} field="nextStep" value={account.nextStep ?? ""} display={account.nextStep || "No next step recorded"} placeholder="Add next step" />
              </dd>
            </div>
            {account.privateNotes && (
              <div>
                <dt>Private notes</dt>
                <dd style={{ maxWidth: 190, textAlign: "right" }}>
                  <InlineAccountText account={account} field="privateNotes" value={account.privateNotes} display={account.privateNotes} placeholder="Add private note" multiline />
                </dd>
              </div>
            )}
            <div>
              <dt>Customer workspace</dt>
              <dd>
                <strong>
                  {account.memberCount} member{account.memberCount === 1 ? "" : "s"}
                </strong>
                <span>
                  {account.documentCount} documents · {account.opportunityCount}{" "}
                  opportunities
                </span>
              </dd>
            </div>
          </dl>
          <div className="manage-inspector-actions">
            {composer ? (
              <form className="manage-inspector-composer" onSubmit={submitComposer}>
                <header><strong>{composer === "task" ? "Add task" : "Add internal note"}</strong><button type="button" onClick={() => { setComposer(null); setMentionedUserIds([]); }} aria-label="Close composer"><X size={15} /></button></header>
                {composer === "task" ? <>
                  <label><span>Task</span><input name="title" required autoFocus placeholder="What needs to happen?" /></label>
                  <div className="manage-inspector-composer-grid"><label><span>Type</span><CostivraSelect name="taskType" defaultValue="follow_up" options={[{ value: "follow_up", label: "Follow-up" }, { value: "email", label: "Email" }, { value: "call", label: "Call" }, { value: "meeting", label: "Meeting" }, { value: "review", label: "Review" }]} /></label><label><span>Priority</span><CostivraSelect name="priority" defaultValue="normal" options={[{ value: "low", label: "Low" }, { value: "normal", label: "Normal" }, { value: "high", label: "High" }]} /></label></div>
                  <label><span>Due</span><CostivraDateTimePicker name="dueAt" /></label><label><span>Notes</span><textarea name="notes" rows={3} placeholder="Optional context" /></label>
                </> : <>
                  <input type="hidden" name="mentionedUserIds" value={JSON.stringify(mentionedUserIds)} />
                  <label><span>Title</span><input name="subject" required autoFocus placeholder="What is this note about?" /></label><label><span>Note</span><textarea name="summary" rows={5} placeholder="Write the internal note." /></label>
                  <div className="manage-mention-picker"><span>Notify teammate</span>{data.staff.filter((member) => member.id !== data.operator.id).length ? <div>{data.staff.filter((member) => member.id !== data.operator.id).map((member) => { const selected = mentionedUserIds.includes(member.id); return <button type="button" className={selected ? "is-selected" : ""} key={member.id} onClick={() => setMentionedUserIds((current) => selected ? current.filter((id) => id !== member.id) : [...current, member.id])}><AtSign size={13} /> {member.fullName}</button>; })}</div> : <small>No other active internal teammates are available to mention.</small>}</div>
                </>}
                <footer><button type="button" className="manage-button manage-button--quiet" onClick={() => setComposer(null)}>Cancel</button><button className="manage-button manage-button--primary" disabled={busy}>{busy ? "Saving…" : composer === "task" ? "Create task" : "Save note"}</button></footer>
              </form>
            ) : <div className="manage-inspector-actions--split"><button className="manage-button manage-button--quiet manage-full" onClick={() => setComposer("task")}><CalendarClock size={15} /> Add task</button><button className="manage-button manage-button--quiet manage-full" onClick={() => setComposer("note")}><MessageSquareText size={15} /> Add note</button></div>}
          </div>
        </>
      )}

      {tab === "timeline" && (
        <div style={{ maxHeight: 380, overflowY: "auto" }}>
          {activities.length > 0 ? (
            <ActivityList activities={activities} />
          ) : (
            <Empty
              icon={Activity}
              title="No activity recorded"
              copy="Notes and client interactions for this account will appear here."
            />
          )}
        </div>
      )}

      {tab === "contacts" && (
        <div style={{ maxHeight: 380, overflowY: "auto" }}>
          {contacts.length > 0 ? (
            <div className="manage-compact-list">
              {contacts.map((contact) => (
                <Link href={`/manage/contacts/${contact.id}`} className="manage-compact-record-row" key={contact.id}>
                  <span className="manage-person-avatar">
                    {initials(contact.fullName)}
                  </span>
                  <div>
                    <strong>{contact.fullName}</strong>
                    <p>{contact.title || contact.email}</p>
                  </div>
                  {contact.isPrimary && (
                    <span className="manage-source">Primary</span>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <Empty
              icon={Users}
              title="No contacts"
              copy="Client contacts for this account will appear here."
            />
          )}
        </div>
      )}
        </div>

        <p className="manage-inspector-note">
          Customer workspaces stay tenant-isolated. This portal shows operational
          context without impersonating a client.
        </p>
      </div>
    </aside>
  );
}

type InlineAccountField = "nextFollowUpAt" | "nextStep" | "privateNotes";

function InlineAccountStage({ account }: { account: ManageAccount }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(account.stage || "onboarding");
  const [busy, setBusy] = useState(false);

  async function save(nextValue: string) {
    setBusy(true);
    try {
      await api(`/api/manage/accounts/${account.id}`, { method: "PATCH", body: JSON.stringify({ stage: nextValue, expectedUpdatedAt: account.updatedAt }) });
      setValue(nextValue);
      setEditing(false);
      router.refresh();
    } catch (error) {
      toast.error("Couldn’t update lifecycle", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!editing) return <button type="button" className="manage-inline-status" onClick={() => setEditing(true)} title="Change lifecycle"><Status value={account.stage} /></button>;
  return <div className="manage-inline-select"><CostivraSelect aria-label="Lifecycle stage" value={value} disabled={busy} autoFocus variant="compact" options={stages.map((stage) => ({ value: stage, label: pretty(stage) }))} onChange={(nextValue) => void save(nextValue)} /></div>;
}

function InlineAccountText({ account, field, value, display, placeholder, type = "text", multiline = false }: {
  account: ManageAccount;
  field: InlineAccountField;
  value: string | null;
  display: string;
  placeholder: string;
  type?: "text" | "datetime-local";
  multiline?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const saving = useRef(false);

  function startEditing() {
    setDraft(value ?? "");
    setEditing(true);
  }
  async function save() {
    if (saving.current) return;
    saving.current = true;
    try {
      await api(`/api/manage/accounts/${account.id}`, { method: "PATCH", body: JSON.stringify({ [field]: draft, expectedUpdatedAt: account.updatedAt }) });
      setEditing(false);
      router.refresh();
    } catch (error) {
      toast.error("Couldn’t save that change", error instanceof Error ? error.message : "Please try again.");
    } finally {
      saving.current = false;
    }
  }
  if (!editing) return <button type="button" className="manage-inline-value" onClick={startEditing} title={`Edit ${field === "nextStep" ? "next step" : field === "nextFollowUpAt" ? "follow-up" : "private notes"}`}>{display || placeholder}</button>;
  const shared = { autoFocus: true, value: draft, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(event.target.value), onBlur: () => void save(), onKeyDown: (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => { if (event.key === "Escape") { setDraft(value ?? ""); setEditing(false); } if (event.key === "Enter" && (!multiline || event.metaKey || event.ctrlKey)) { event.preventDefault(); void save(); } } };
  return multiline ? <textarea className="manage-inline-textarea" rows={3} {...shared} /> : <input className="manage-inline-input" type={type} {...shared} />;
}

function InlineAccountDetailField({
  account,
  label,
  field,
  value,
  input,
  displayValue,
}: {
  account: ManageAccount;
  label: string;
  field: "industry" | "phone" | "website";
  value: string | null | undefined;
  input: { kind: "text"; maxLength?: number } | { kind: "url" } | { kind: "phone" };
  displayValue?: ReactNode;
}) {
  const router = useRouter();
  const toast = useToast();

  const handleSave = async (newValue: unknown) => {
    const nextValue = String(newValue ?? "").trim();
    await api(`/api/manage/accounts/${account.id}`, {
      method: "PATCH",
      body: JSON.stringify({ [field]: nextValue || null, expectedUpdatedAt: account.updatedAt }),
    });
    toast.success(nextValue ? `${label} updated.` : `${label} removed.`);
    router.refresh();
  };

  return (
    <EditableFieldRow
      label={label}
      value={value ?? null}
      displayValue={displayValue}
      input={input}
      compact
      showLabel={false}
      onSave={handleSave}
    />
  );
}

function InlineAccountIndustry({ account, profile }: { account: ManageAccount; profile: ManageAccount["enrichment"] }) {
  return <InlineAccountDetailField account={account} label="Industry" field="industry" value={account.industry || profile?.industry} input={{ kind: "text", maxLength: 80 }} />;
}

function InlineAccountWebsite({ account }: { account: ManageAccount }) {
  const href = externalHref(account.website);
  return <InlineAccountDetailField
    account={account}
    label="Website"
    field="website"
    value={account.website}
    input={{ kind: "url" }}
    displayValue={account.website && href ? <a href={href} target="_blank" rel="noreferrer">{account.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a> : undefined}
  />;
}

function InlineAccountPhone({ account, profile }: { account: ManageAccount; profile: ManageAccount["enrichment"] }) {
  const phone = account.phone || profile?.phone;
  const phoneHref = phone?.replace(/[^+\d]/g, "");
  return <InlineAccountDetailField
    account={account}
    label="Phone"
    field="phone"
    value={phone}
    input={{ kind: "phone" }}
    displayValue={phone && phoneHref ? <a className="manage-record-company-phone" href={`tel:${phoneHref}`}>{phone}</a> : undefined}
  />;
}

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const val = row[header];
          const str = val === null || val === undefined ? "" : String(val);
          return `"${str.replaceAll('"', '""')}"`;
        })
        .join(","),
    ),
  ].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function Accounts({
  data,
  query,
}: {
  data: ManageData;
  query: string;
}) {
  const pageSize = 25;
  const [filter, setFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState<"active" | "archived" | "all">("active");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    data.accounts[0]?.id ?? null,
  );
  const [editing, setEditing] = useState<ManageAccount | null>(null);

  const accountMatchesVisibility = (
    account: ManageAccount,
    visibility: typeof visibilityFilter = visibilityFilter,
  ) =>
    visibility === "all" ||
    (visibility === "active"
      ? account.visibleInCrm !== false
      : account.visibleInCrm === false);
  const visibleAccounts = data.accounts.filter((account) =>
    accountMatchesVisibility(account),
  );
  const filtered = visibleAccounts.filter(
    (account) =>
      (filter === "all" || (account.stage || "unclassified") === filter) &&
      `${account.name} ${account.primaryContact} ${account.primaryEmail}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const accountStageTabs = [
    { id: "all", label: "All", count: visibleAccounts.length },
    ...stages.slice(0, 4).map((stage) => ({
      id: stage,
      label: pretty(stage),
      count: visibleAccounts.filter((account) => account.stage === stage).length,
    })),
  ];
  const accountScopeOptions = (["active", "archived", "all"] as const).map(
    (state) => ({
      value: state,
      label: `${
        state === "active"
          ? "Active records"
          : state === "archived"
            ? "Archived records"
            : "All records"
      } · ${data.accounts.filter((account) => accountMatchesVisibility(account, state)).length}`,
    }),
  );

  const selectedAccount =
    filtered.find((account) => account.id === selectedAccountId) ?? filtered[0];
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selectedAccounts = filtered.filter((account) => selectedIds.has(account.id));

  const accountActivities = useMemo(
    () =>
      selectedAccount
        ? data.activities.filter(
            (act) => act.organizationId === selectedAccount.id,
          )
        : [],
    [data.activities, selectedAccount],
  );

  const accountContacts = useMemo(
    () =>
      selectedAccount
        ? data.contacts.filter((c) => c.organizationId === selectedAccount.id)
        : [],
    [data.contacts, selectedAccount],
  );

  const exportAccountsCsv = (accounts = filtered) => {
    const exportRows = accounts.map((a) => ({
      ID: a.id,
      Name: a.name,
      LegalName: a.legalName ?? "",
      Industry: a.industry ?? "",
      Stage: a.stage ?? "",
      PrimaryContact: a.primaryContact ?? "",
      PrimaryEmail: a.primaryEmail ?? "",
      MemberCount: a.memberCount,
      DocumentCount: a.documentCount,
      OpportunityCount: a.opportunityCount,
      OpenTaskCount: a.openTaskCount,
      NextFollowUpAt: a.nextFollowUpAt ?? "",
      NextStep: a.nextStep ?? "",
      PrivateNotes: a.privateNotes ?? "",
    }));
    downloadCsv(`costivra-accounts-${new Date().toISOString().slice(0, 10)}.csv`, exportRows);
  };

  return (
    <>
      <div className="manage-overview-grid manage-record-workspace">
        <section className="manage-panel manage-account-table manage-account-table--full">
          <div className="manage-queue-toolbar">
            <WorkspaceViewTabs
              activeId={filter}
              ariaLabel="Account lifecycle filter"
              className="manage-queue-tabs"
              onChange={(value) => {
                setFilter(value);
                setPage(1);
                setSelectedIds(new Set());
              }}
              selectionMode="pressed"
              tabs={accountStageTabs}
            />
            <ManageQueueScopeControl
              label="Record status"
              onChange={(value) => {
                setVisibilityFilter(value as typeof visibilityFilter);
                setPage(1);
                setSelectedIds(new Set());
              }}
              options={accountScopeOptions}
              value={visibilityFilter}
            />
          </div>
          <AccountRows
            key={`${filter}-${visibilityFilter}-${query}`}
            accounts={pageRows}
            selectedId={selectedAccount?.id}
            onSelectAccount={(account) => setSelectedAccountId(account.id)}
            selectedIds={selectedIds}
            onToggle={(id) => setSelectedIds((current) => {
              const next = new Set(current);
              if (next.has(id)) next.delete(id); else next.add(id);
              return next;
            })}
            onTogglePage={() => setSelectedIds((current) => {
              const next = new Set(current);
              const allSelected = pageRows.every((account) => next.has(account.id));
              pageRows.forEach((account) => allSelected ? next.delete(account.id) : next.add(account.id));
              return next;
            })}
            empty={<Empty icon={Building2} title="No matching accounts" copy={data.accounts.length ? "Clear the search or choose another lifecycle stage." : "No real organizations are available yet."} />}
          />
          <TableFooter count={filtered.length} noun="account" page={currentPage} pageCount={pageCount} onPage={setPage}>
            <BulkActionBar
              count={selectedAccounts.length}
              noun="account"
              primaryLabel="Edit follow-up"
              onPrimary={() => selectedAccounts[0] && setEditing(selectedAccounts[0])}
              onExport={() => exportAccountsCsv(selectedAccounts)}
              onClear={() => setSelectedIds(new Set())}
            />
          </TableFooter>
        </section>
        <AccountInspector
          data={data}
          account={selectedAccount}
          activities={accountActivities}
          contacts={accountContacts}
        />
      </div>
      {editing && (
        <EditAccount account={editing} onClose={() => setEditing(null)} />
      )}
    </>
  );
}

function ContactInspector({
  data,
  contact,
  onCompose,
}: {
  data: ManageData;
  contact?: ManageContact;
  onCompose: (contact: ManageContact) => void;
}) {
  const [composer, setComposer] = useState<"task" | "note" | null>(null);
  const [composerClosing, setComposerClosing] = useState(false);
  const composerCloseTimer = useRef<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const router = useRouter();
  const toast = useToast();
  const closeInspectorComposer = useCallback(() => {
    if (!composer || composerClosing) return;
    setComposerClosing(true);
    composerCloseTimer.current = window.setTimeout(() => {
      setComposer(null);
      setComposerClosing(false);
      setMentionedUserIds([]);
      composerCloseTimer.current = null;
    }, 220);
  }, [composer, composerClosing]);
  useEffect(() => () => {
    if (composerCloseTimer.current) window.clearTimeout(composerCloseTimer.current);
  }, []);
  async function submitComposer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!contact || !composer) return;
    setBusy(true);
    try {
      const form = new FormData(event.currentTarget);
      form.set("organizationId", contact.organizationId);
      await api(composer === "task" ? "/api/manage/tasks" : "/api/manage/activities", { method: "POST", body: JSON.stringify(Object.fromEntries(form)) });
      toast.success(composer === "task" ? "Follow-up task created." : "Note added to the activity record.");
      closeInspectorComposer(); router.refresh();
    } catch (error) { toast.error("That didn’t work", error instanceof Error ? error.message : "Please try again."); }
    finally { setBusy(false); }
  }
  if (!contact) {
    return <aside className="manage-panel manage-inspector"><Empty icon={Users} title="No contact selected" copy="Select a contact to see their account and communication details." /></aside>;
  }
  return (
    <aside className={`manage-panel manage-inspector manage-contact-inspector${composer ? " manage-inspector--composer-open" : ""}`}>
      <header className="manage-inspector-header">
        <Link href={`/manage/contacts/${contact.id}`} className="manage-inspector-account manage-inspector-record-card" title={`Open ${contact.fullName}`}>
          <span>{initials(contact.fullName)}</span>
          <div><h3>{contact.fullName}</h3><p>{contact.title || "Role not set"}</p></div>
        </Link>
        <button onClick={() => onCompose(contact)} aria-label={`Email ${contact.fullName}`}><Mail size={16} /></button>
      </header>
      <div className="manage-inspector-tabs"><button className="active">Overview</button></div>
      <dl>
        <div><dt>Account</dt><dd><Link href={`/manage/accounts/${contact.organizationId}`} className="manage-inspector-account-link" title={`Open ${contact.organizationName}`}><strong>{contact.organizationName}</strong><span>{contact.isPrimary ? "Primary contact" : "Client contact"}</span></Link></dd></div>
        <div><dt>Email</dt><dd><button type="button" className="manage-contact-email" onClick={() => onCompose(contact)} title={`Compose an email to ${contact.fullName}`}><strong>{contact.email}</strong></button></dd></div>
        <div><dt>Phone</dt><dd><strong>{contact.phone || "Not recorded"}</strong></dd></div>
        <div><dt>Access</dt><dd><Status value={contact.status} /><span>{contact.source === "workspace" ? "Workspace member" : "CRM contact"}</span></dd></div>
        <div><dt>Email marketing</dt><dd><Status value={contact.marketingStatus || "not recorded"} /><span>{contact.marketingConsentAt ? `Recorded ${date(contact.marketingConsentAt, true)}` : "No explicit consent timestamp"}</span></dd></div>
      </dl>
      <div className="manage-inspector-actions">
        <div className={`manage-inspector-composer-transition${composerClosing ? " is-closing" : ""}${composer ? " is-open" : ""}`}><div>{composer && <form className="manage-inspector-composer" onSubmit={submitComposer}>
          <header><strong>{composer === "task" ? "Add task" : "Add internal note"}</strong><button type="button" onClick={closeInspectorComposer} aria-label="Close composer"><X size={15} /></button></header>
          {composer === "task" ? <><label><span>Task</span><input name="title" required autoFocus placeholder="What needs to happen?" /></label><div className="manage-inspector-composer-grid"><label><span>Type</span><CostivraSelect name="taskType" defaultValue="follow_up" options={[{ value: "follow_up", label: "Follow-up" }, { value: "email", label: "Email" }, { value: "call", label: "Call" }, { value: "meeting", label: "Meeting" }, { value: "review", label: "Review" }]} /></label><label><span>Priority</span><CostivraSelect name="priority" defaultValue="normal" options={[{ value: "low", label: "Low" }, { value: "normal", label: "Normal" }, { value: "high", label: "High" }]} /></label></div><label><span>Due</span><CostivraDateTimePicker name="dueAt" /></label><label><span>Notes</span><textarea name="notes" rows={3} placeholder="Optional context" /></label></> : <><input type="hidden" name="mentionedUserIds" value={JSON.stringify(mentionedUserIds)} /><label><span>Title</span><input name="subject" required autoFocus placeholder="What is this note about?" /></label><label><span>Note</span><textarea name="summary" rows={5} placeholder="Write the internal note." /></label><div className="manage-mention-picker"><span>Notify teammate</span>{data.staff.filter((member) => member.id !== data.operator.id).length ? <div>{data.staff.filter((member) => member.id !== data.operator.id).map((member) => { const selected = mentionedUserIds.includes(member.id); return <button type="button" className={selected ? "is-selected" : ""} key={member.id} onClick={() => setMentionedUserIds((current) => selected ? current.filter((id) => id !== member.id) : [...current, member.id])}><AtSign size={13} /> {member.fullName}</button>; })}</div> : <small>No other active internal teammates are available to mention.</small>}</div></>}
          <footer><button type="button" className="manage-button manage-button--quiet" onClick={closeInspectorComposer}>Cancel</button><button className="manage-button manage-button--primary" disabled={busy || composerClosing}>{busy ? "Saving…" : composer === "task" ? "Create task" : "Save note"}</button></footer>
        </form>}</div></div>{!composer && <div className="manage-inspector-actions--split"><button className="manage-button manage-button--quiet manage-full" onClick={() => setComposer("task")}><CalendarClock size={15} /> Add task</button><button className="manage-button manage-button--quiet manage-full" onClick={() => setComposer("note")}><FileText size={15} /> Add note</button></div>}
      </div>
      <p className="manage-inspector-note">Marketing consent is shown separately from workspace access. Costivra will not treat account membership as email consent.</p>
    </aside>
  );
}

function useRecordAuditHistory(endpoint: string) {
  const [reloadToken, setReloadToken] = useState(0);
  const [result, setResult] = useState<{ endpoint: string; error: string | null; history: AuditHistoryItem[]; loading: boolean; reloadToken: number }>({
    endpoint,
    error: null,
    history: [],
    loading: true,
    reloadToken: 0,
  });
  useEffect(() => {
    let cancelled = false;
    void fetch(endpoint, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Record history is unavailable.");
        return response.json();
      })
      .then((payload) => {
        if (cancelled) return;
        setResult({ endpoint, error: null, history: Array.isArray(payload.history) ? payload.history : [], loading: false, reloadToken });
      })
      .catch(() => {
        if (!cancelled) setResult({ endpoint, error: "Record history is unavailable.", history: [], loading: false, reloadToken });
      });
    return () => { cancelled = true; };
  }, [endpoint, reloadToken]);
  const current = result.endpoint === endpoint && result.reloadToken === reloadToken;
  return {
    error: current ? result.error : null,
    history: current ? result.history : [],
    loading: !current || result.loading,
    retry: () => setReloadToken((currentToken) => currentToken + 1),
  };
}

function Contacts({
  data,
  query,
  onCompose,
}: {
  data: ManageData;
  query: string;
  onCompose: (contact: ManageData["contacts"][number]) => void;
}) {
  const pageSize = 25;
  const [filter, setFilter] = useState<"all" | "primary" | "workspace" | "crm">("all");
  const [lifecycleFilter, setLifecycleFilter] = useState<"active" | "inactive" | "all">("active");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [selectedContactId, setSelectedContactId] = useState<string | null>(data.contacts[0]?.id ?? null);

  const contactMatchesLifecycle = (
    contact: ManageContact,
    lifecycle: typeof lifecycleFilter = lifecycleFilter,
  ) => lifecycle === "all" || contact.status === lifecycle;
  const visibleContacts = data.contacts.filter((contact) =>
    contactMatchesLifecycle(contact),
  );
  const rows = visibleContacts.filter((contact) => {
    const matchesFilter =
      filter === "all"
        ? true
        : filter === "primary"
        ? contact.isPrimary
        : filter === "workspace"
        ? contact.source === "workspace"
        : contact.source === "crm";
    const matchesQuery = `${contact.fullName} ${contact.email} ${contact.organizationName}`
      .toLowerCase()
      .includes(query.toLowerCase());
    return matchesFilter && matchesQuery;
  });
  const contactCategoryTabs = [
    { id: "all", label: "All", count: visibleContacts.length },
    {
      id: "primary",
      label: "Primary",
      count: visibleContacts.filter((contact) => contact.isPrimary).length,
    },
    {
      id: "workspace",
      label: "Workspace",
      count: visibleContacts.filter((contact) => contact.source === "workspace").length,
    },
    {
      id: "crm",
      label: "CRM",
      count: visibleContacts.filter((contact) => contact.source === "crm").length,
    },
  ];
  const contactScopeOptions = (["active", "inactive", "all"] as const).map(
    (state) => ({
      value: state,
      label: `${
        state === "active"
          ? "Active contacts"
          : state === "inactive"
            ? "Inactive contacts"
            : "All contacts"
      } · ${data.contacts.filter((contact) => contactMatchesLifecycle(contact, state)).length}`,
    }),
  );

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selectedContacts = rows.filter((contact) => selectedIds.has(contact.id));
  const selectedContact = rows.find((contact) => contact.id === selectedContactId) ?? rows[0];

  const exportContactsCsv = (contacts = rows) => {
    const exportRows = contacts.map((c) => ({
      ID: c.id,
      Organization: c.organizationName,
      FullName: c.fullName,
      Email: c.email,
      Title: c.title ?? "",
      Phone: c.phone ?? "",
      IsPrimary: c.isPrimary ? "Yes" : "No",
      Status: c.status,
      Source: c.source,
      MarketingStatus: c.marketingStatus ?? "",
    }));
    downloadCsv(`costivra-contacts-${new Date().toISOString().slice(0, 10)}.csv`, exportRows);
  };

  return (
    <>
      <div className="manage-overview-grid manage-record-workspace">
      <section className="manage-panel manage-account-table manage-contact-table">
        <div className="manage-queue-toolbar">
          <WorkspaceViewTabs
            activeId={filter}
            ariaLabel="Contact type filter"
            className="manage-queue-tabs"
            onChange={(value) => {
              setFilter(value as typeof filter);
              setPage(1);
              setSelectedIds(new Set());
            }}
            selectionMode="pressed"
            tabs={contactCategoryTabs}
          />
          <ManageQueueScopeControl
            label="Contact status"
            onChange={(value) => {
              setLifecycleFilter(value as typeof lifecycleFilter);
              setPage(1);
              setSelectedIds(new Set());
            }}
            options={contactScopeOptions}
            value={lifecycleFilter}
          />
        </div>
        <div key={`${filter}-${lifecycleFilter}-${query}`} className="manage-table-wrap">
          <table className="manage-data-table manage-contact-data-table">
            <thead><tr>
              <th className="manage-row-number-cell"><BulkHeaderSelector state={pageRows.length && pageRows.every((c) => selectedIds.has(c.id)) ? "all" : pageRows.some((c) => selectedIds.has(c.id)) ? "some" : "none"} onChange={() => setSelectedIds((current) => { const next = new Set(current); const all = pageRows.every((c) => next.has(c.id)); pageRows.forEach((c) => all ? next.delete(c.id) : next.add(c.id)); return next; })} /></th>
              <th className="manage-sticky-column">Contact</th><th>Account</th><th>Role</th><th>Marketing</th><th>Source</th><th aria-label="Actions" />
            </tr></thead>
            <tbody>{pageRows.map((contact, index) => {
              const bulkSelected = selectedIds.has(contact.id);
              return <tr key={contact.id} className={`${selectedContact?.id === contact.id ? "is-selected" : ""}${bulkSelected ? " is-bulk-selected" : ""}`} onClick={() => setSelectedContactId(contact.id)} onKeyDown={(event) => { if (event.key !== "Enter" && event.key !== " ") return; event.preventDefault(); setSelectedContactId(contact.id); }} tabIndex={0}>
                <td className="manage-row-number-cell"><BulkRowSelector checked={bulkSelected} index={(currentPage - 1) * pageSize + index + 1} label={contact.fullName} onChange={() => setSelectedIds((current) => { const next = new Set(current); if (next.has(contact.id)) next.delete(contact.id); else next.add(contact.id); return next; })} /></td>
                <td className="manage-sticky-column"><div className="manage-table-record-card"><span className="manage-person-avatar">{initials(contact.fullName)}</span><span className="manage-table-record-meta"><Link href={`/manage/contacts/${contact.id}`} onClick={(event) => event.stopPropagation()}><strong>{contact.fullName}</strong></Link><button type="button" className="manage-contact-email" onClick={(event) => { event.stopPropagation(); onCompose(contact); }} title={`Compose an email to ${contact.fullName}`}>{contact.email}</button></span></div></td>
                <td><Link href={`/manage/accounts/${contact.organizationId}`} className="manage-table-record-card" onClick={(event) => event.stopPropagation()}><span className="manage-table-record-meta"><strong>{contact.organizationName}</strong><small>{contact.isPrimary ? "Primary contact" : "Client contact"}</small></span></Link></td>
                <td>{contact.title || "Not set"}</td>
                <td><Status value={contact.marketingStatus || "not recorded"} /></td>
                <td><span className="manage-source">{contact.source === "workspace" ? "Workspace" : "CRM"}</span></td>
                <td><button className="manage-icon-button" onClick={(event) => { event.stopPropagation(); onCompose(contact); }} aria-label={`Email ${contact.fullName}`} title={`Compose email to ${contact.fullName}`}><Mail size={16} /></button></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
        {!rows.length && (
          <Empty
            icon={Users}
            title="No matching contacts"
            copy={
              data.contacts.length
                ? "Clear the search or choose another filter."
                : "Contacts will appear when a workspace member exists or you add a real client contact."
            }
          />
        )}
        <TableFooter count={rows.length} noun="contact" page={currentPage} pageCount={pageCount} onPage={setPage}>
          <BulkActionBar count={selectedContacts.length} noun="contact" primaryLabel="Compose email" onPrimary={() => selectedContacts[0] && onCompose(selectedContacts[0])} onExport={() => exportContactsCsv(selectedContacts)} onClear={() => setSelectedIds(new Set())} />
        </TableFooter>
      </section>
      <ContactInspector data={data} contact={selectedContact} onCompose={onCompose} />
      </div>
    </>
  );
}

function RecordTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: string; label: string; count?: number }>;
  active: string;
  onChange: (id: string) => void;
}) {
  return <WorkspaceViewTabs activeId={active} ariaLabel="Record sections" className="manage-record-tabs" onChange={onChange} recordNavigation selectionMode="pressed" tabs={tabs} />;
}

function money(value: number | null, currency: string) {
  if (value == null) return "Not recorded";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }
}

function CostTrend({ expenses, currency, title = "Cost trend" }: { expenses: ManageData["expenses"]; currency: string; title?: string }) {
  const [interval, setInterval] = useState<SpendInterval>("monthly");
  const buckets = useMemo(() => groupRecordedSpend(expenses, interval, currency), [currency, expenses, interval]);
  const max = Math.max(...buckets.map((bucket) => bucket.total), 1);
  return <section className="manage-cost-trend" aria-label={title}>
    <header><div><span>Recorded expenses</span><h3>{title}</h3><p>Actual expense records only. This does not estimate savings or future spend.</p></div><div className="manage-cost-trend-switch" aria-label="Cost interval">{(["weekly", "monthly", "yearly"] as SpendInterval[]).map((option) => <button type="button" key={option} className={interval === option ? "is-active" : ""} onClick={() => setInterval(option)}>{option}</button>)}</div></header>
    {buckets.length ? <div className="manage-cost-bars" role="img" aria-label={`${title} shown by ${interval}`}>
      {buckets.map((bucket) => <div className="manage-cost-bar" key={bucket.key}><div className="manage-cost-bar__value">{money(bucket.total, currency)}</div><div className="manage-cost-bar__track"><span style={{ height: `${Math.max(8, (bucket.total / max) * 100)}%` }} /></div><div className="manage-cost-bar__label">{bucket.label}</div></div>)}
    </div> : <div className="manage-cost-trend-empty"><BarChart3 size={17} /><span>No recorded {currency} expenses are available for this interval.</span></div>}
  </section>;
}

function VendorList({ vendors, selectedId, onSelect, currency }: { vendors: ManageVendorRelationship[]; selectedId: string | null; onSelect: (id: string) => void; currency: string }) {
  return <div className="manage-vendor-list" role="list" aria-label="Account vendors">{vendors.map((vendor) => <button type="button" role="listitem" key={vendor.id} className={`manage-vendor-row ${selectedId === vendor.id ? "is-active" : ""}`} onClick={() => onSelect(vendor.id)}><CompanyLogo entity="vendor" id={vendor.vendorId} name={vendor.name} className="manage-vendor-row__logo" /><span className="manage-vendor-row__identity"><strong>{vendor.name}</strong><small>{vendor.category ? pretty(vendor.category) : "Uncategorized"} · {pretty(vendor.relationshipStatus)}</small></span><span className="manage-vendor-row__spend"><small>Recorded</small><strong>{money(vendor.recordedSpend, currency)}</strong></span><ChevronRight size={16} /></button>)}</div>;
}

function VendorWorkspace({ vendors, expenses, contracts, documents, currency, selectedId, onSelect }: { vendors: ManageVendorRelationship[]; expenses: ManageData["expenses"]; contracts: ManageData["vendorContracts"]; documents: ManageData["documents"]; currency: string; selectedId: string | null; onSelect: (id: string) => void }) {
  const selected = vendors.find((vendor) => vendor.id === selectedId) || vendors[0] || null;
  if (!selected) return <section className="manage-panel manage-record-tab-panel"><Empty icon={Building2} title="No vendors linked yet" copy="Vendor relationships will appear here when they are linked to this account." /></section>;
  const vendorExpenses = expenses.filter((expense) => expense.vendorRelationshipId === selected.id);
  const vendorContracts = contracts.filter((contract) => contract.vendorRelationshipId === selected.id);
  const vendorDocuments = documents.filter((document) => document.vendorRelationshipId === selected.id);
  return <section className="manage-vendor-workspace"><div className="manage-vendor-workspace__collection"><header><div><span>Vendor directory</span><h3>{vendors.length} linked vendor{vendors.length === 1 ? "" : "s"}</h3></div></header><VendorList vendors={vendors} selectedId={selected.id} onSelect={onSelect} currency={currency} /></div><article className="manage-vendor-detail"><header className="manage-vendor-detail__heading"><CompanyLogo entity="vendor" id={selected.vendorId} name={selected.name} className="manage-vendor-detail__logo" /><div><span>Vendor detail</span><h3>{selected.name}</h3><p>{selected.category ? pretty(selected.category) : "Uncategorized"} · {pretty(selected.relationshipStatus)}</p></div>{selected.website && <a href={selected.website.startsWith("http") ? selected.website : `https://${selected.website}`} target="_blank" rel="noreferrer">Website <ChevronRight size={14} /></a>}</header><div className="manage-vendor-detail__metrics"><div><span>Recorded spend</span><strong>{money(selected.recordedSpend, currency)}</strong></div><div><span>Annualized spend</span><strong>{money(selected.annualizedSpend, currency)}</strong></div><div><span>Expense records</span><strong>{selected.expenseCount}</strong></div><div><span>Contracts</span><strong>{selected.contractCount}</strong></div></div><CostTrend title={`${selected.name} cost history`} expenses={vendorExpenses} currency={currency} /><section className="manage-vendor-detail__section"><header><h4>Associated details</h4><p>Current records connected to this vendor relationship.</p></header><dl><div><dt>Spend cadence</dt><dd>{pretty(selected.spendCadence)}</dd></div><div><dt>Next contract end</dt><dd>{selected.nextContractEnd ? date(selected.nextContractEnd) : "Not recorded"}</dd></div><div><dt>Source documents</dt><dd>{vendorDocuments.length}</dd></div></dl></section>{vendorContracts.length > 0 && <section className="manage-vendor-detail__section"><header><h4>Contracts</h4><p>Contract dates and values are shown as recorded.</p></header><div className="manage-vendor-contracts">{vendorContracts.map((contract) => <div key={contract.id}><span><strong>{contract.title}</strong><small>{contract.category ? pretty(contract.category) : "Uncategorized"} · {pretty(contract.status)}</small></span><span><strong>{money(contract.annualValue, contract.currency || currency)}</strong><small>{contract.endDate ? `Ends ${date(contract.endDate)}` : "End date not recorded"}{contract.autoRenews ? " · Auto-renews" : ""}</small></span></div>)}</div></section>}</article></section>;
}

function externalHref(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function RecordHeaderLinks({ website, linkedinUrl, entityName }: { website: string | null | undefined; linkedinUrl: string | null | undefined; entityName: string }) {
  const websiteHref = externalHref(website);
  const linkedinHref = externalHref(linkedinUrl);
  if (!websiteHref && !linkedinHref) return null;
  return <span className="manage-record-title-links" aria-label={`${entityName} links`}>
    {websiteHref && <a href={websiteHref} target="_blank" rel="noreferrer" aria-label={`Open ${entityName} website`} title="Website"><Globe2 size={16} /></a>}
    {linkedinHref && <a href={linkedinHref} target="_blank" rel="noreferrer" aria-label={`Open ${entityName} LinkedIn profile`} title="LinkedIn"><LinkedInMark /></a>}
  </span>;
}

function LinkedInMark() {
  return (
    <svg className="manage-linkedin-mark" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M20.47 2H3.53A1.53 1.53 0 0 0 2 3.53v16.94A1.53 1.53 0 0 0 3.53 22h16.94A1.53 1.53 0 0 0 22 20.47V3.53A1.53 1.53 0 0 0 20.47 2ZM8.09 18.65H5.24V9.5h2.85v9.15ZM6.66 8.25a1.66 1.66 0 1 1 1.66-1.66 1.66 0 0 1-1.66 1.66Zm12.1 10.4h-2.85v-4.46c0-1.06-.02-2.43-1.48-2.43-1.48 0-1.71 1.15-1.71 2.35v4.54H9.87V9.5h2.74v1.25h.04c.38-.72 1.31-1.48 2.7-1.48 2.89 0 3.42 1.9 3.42 4.37v5.01Z" />
    </svg>
  );
}

function AccountHeaderMeta({ account, profile }: { account: ManageAccount; profile: ManageAccount["enrichment"] }) {
  const industry = account.industry || profile?.industry;
  if (!industry && !profile?.location) return null;
  return <div className="manage-record-identity-meta" aria-label="Company contact details">
    {industry && <span title="Industry">{industry}</span>}
    {profile?.location && <span title="Headquarters location"><MapPin size={13} />{profile.location}</span>}
  </div>;
}

function TechnologyList({ technologies }: { technologies: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const [additionalHeight, setAdditionalHeight] = useState(0);
  const additionalContentRef = useRef<HTMLDivElement>(null);
  const visible = technologies.slice(0, 8);
  const additional = technologies.slice(8);
  const additionalId = "account-additional-technologies";
  useEffect(() => {
    const content = additionalContentRef.current;
    if (!content) return;
    if (!expanded) return;
    const measure = () => setAdditionalHeight(content.scrollHeight);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    return () => observer.disconnect();
  }, [additional.length, expanded]);
  if (!technologies.length) return null;
  return <div className="manage-record-technologies">
    <div className="manage-record-technology-list" aria-label="Technologies used">
      {visible.map((technology) => <span key={technology}>{technology}</span>)}
    </div>
    {additional.length > 0 && <div id={additionalId} className={`manage-record-technology-extra${expanded ? " is-expanded" : ""}`} style={{ height: expanded ? additionalHeight : 0 }} aria-hidden={!expanded}>
      <div ref={additionalContentRef} className="manage-record-technology-extra__inner">
        <div className="manage-record-technology-list" aria-label="Additional technologies">
          {additional.map((technology) => <span key={technology}>{technology}</span>)}
        </div>
      </div>
    </div>}
    {additional.length > 0 && <button type="button" className="manage-record-technology-toggle" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} aria-controls={additionalId}>{expanded ? "Show fewer" : `Show all ${technologies.length}`}</button>}
  </div>;
}

function readableLocation(location: ManageLocation) {
  const address = location.address ?? {};
  return [address.line1, address.city, address.state, address.postal_code].filter(Boolean).join(", ") || "Address not added";
}

function locationSearchHref(label: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`;
}

function LocationMapCard({ accountId, locations, fallback, run }: { accountId?: string; locations: ManageLocation[]; fallback?: string | null; run?: (work: () => Promise<unknown>, success: string) => Promise<void> }) {
  const [adding, setAdding] = useState(false);
  const activeLocations = locations.filter((location) => location.status !== "inactive");
  const mapLabel = activeLocations[0] ? `${activeLocations[0].name}, ${readableLocation(activeLocations[0])}` : fallback;
  const canAdd = Boolean(accountId && run);
  const saveLocation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accountId || !run) return;
    await run(
      () => api("/api/manage/locations", { method: "POST", body: JSON.stringify({ organizationId: accountId, ...Object.fromEntries(new FormData(event.currentTarget)) }) }),
      "Location added to this account.",
    );
    setAdding(false);
  };
  return <section className="manage-context-card manage-location-context" id="account-locations">
    <div className="manage-context-card__heading"><div><span>Operating footprint</span><h3>Locations</h3></div>{canAdd && <button type="button" className="manage-context-add" onClick={() => setAdding((value) => !value)} aria-expanded={adding} aria-controls="manage-location-form" aria-label={adding ? "Close location form" : "Add location to this account"} title={adding ? "Close location form" : "Add location to this account"}>{adding ? <X size={15} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}</button>}</div>
    {mapLabel ? <>
      <a className="manage-location-map" href={locationSearchHref(mapLabel)} target="_blank" rel="noreferrer" aria-label={`Open map for ${mapLabel}`}>
        <span className="manage-location-map__grid" aria-hidden="true" /><span className="manage-location-map__pin"><MapPin size={18} /></span><span className="manage-location-map__label">Open map</span>
      </a>
      <p className="manage-location-map__caption">{mapLabel}</p>
    </> : <div className="manage-context-empty"><MapPin size={16} /><span>Add a physical address in the client workspace to map this account.</span></div>}
    {activeLocations.length > 1 && <div className="manage-location-list">{activeLocations.slice(0, 4).map((location) => <a href={locationSearchHref(`${location.name}, ${readableLocation(location)}`)} target="_blank" rel="noreferrer" key={location.id}><span>{location.name}</span><small>{readableLocation(location)}</small><ChevronRight size={13} /></a>)}</div>}
    {activeLocations.length > 4 && <small className="manage-context-footnote">+{activeLocations.length - 4} more locations in the client workspace</small>}
    {canAdd && <div id="manage-location-form" className={`manage-location-form-transition${adding ? " is-open" : ""}`} aria-hidden={!adding}>
      <form className="manage-location-form" onSubmit={saveLocation}>
        <label><span>Location name *</span><input name="name" required placeholder="Headquarters" /></label>
        <label><span>Street address *</span><input name="line1" required placeholder="123 Main Street" /></label>
        <label><span>Address line 2</span><input name="line2" placeholder="Suite or floor" /></label>
        <div className="manage-location-form__grid">
          <label><span>City *</span><input name="city" required placeholder="Austin" /></label>
          <label><span>State *</span><input name="state" required placeholder="TX" /></label>
          <label><span>ZIP code *</span><input name="postalCode" required placeholder="78701" /></label>
          <label><span>Country</span><input name="country" defaultValue="US" maxLength={2} /></label>
        </div>
        <footer><button type="button" className="manage-button manage-button--quiet" onClick={() => setAdding(false)}>Cancel</button><button type="submit" className="manage-button manage-button--primary">Save location</button></footer>
      </form>
    </div>}
  </section>;
}

function AccountPeopleRail({ contacts, onCompose, onAddContact }: { contacts: ManageContact[]; onCompose: (contact: ManageContact) => void; onAddContact?: () => void }) {
  const ordered = [...contacts].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || Number(a.source === "workspace") - Number(b.source === "workspace") || a.fullName.localeCompare(b.fullName));
  return <section className="manage-context-card manage-people-context" id="account-people">
    <div className="manage-context-card__heading"><div><span>Relationship map</span><h3>People</h3></div>{onAddContact && <button type="button" className="manage-context-add" onClick={onAddContact} aria-label="Add contact to this account" title="Add contact to this account"><Plus size={15} aria-hidden="true" /></button>}</div>
    {ordered.length ? <div className="manage-context-people">{ordered.map((contact) => <article key={contact.id}><span className="manage-person-avatar">{initials(contact.fullName)}</span><div className="manage-context-person"><Link href={`/manage/contacts/${contact.id}`}><strong>{contact.fullName}</strong></Link><small>{contact.title || "Role not set"}</small></div>{contact.isPrimary && <span className="manage-record-primary">Primary</span>}<div className="manage-context-person-actions"><button type="button" onClick={() => onCompose(contact)} aria-label={`Email ${contact.fullName}`} title={`Email ${contact.fullName}`}><Mail size={14} /></button>{contact.phone && <a href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`} aria-label={`Call ${contact.fullName}`} title={`Call ${contact.fullName}`}><Phone size={14} /></a>}</div></article>)}</div> : <div className="manage-context-empty"><Users size={16} /><span>No contacts connected yet.</span></div>}
  </section>;
}

function AccountHierarchyCard({ account, accounts, run }: { account: ManageAccount; accounts: ManageAccount[]; run: (work: () => Promise<unknown>, success: string) => Promise<void> }) {
  const parent = account.parentAccountId ? accounts.find((item) => item.id === account.parentAccountId) : null;
  const children = accounts.filter((item) => item.parentAccountId === account.id);
  const [editing, setEditing] = useState(false);
  const [parentId, setParentId] = useState(account.parentAccountId ?? "");
  const candidates = accounts.filter((item) => item.id !== account.id);
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await run(() => api(`/api/manage/accounts/${account.id}`, { method: "PATCH", body: JSON.stringify({ parentAccountId: parentId || null, expectedUpdatedAt: account.updatedAt }) }), "Account relationship updated.");
    setEditing(false);
  };
  return <section className="manage-context-card manage-hierarchy-context">
    <div className="manage-context-card__heading"><div><span>Account structure</span><h3>Parent & child companies</h3></div><button type="button" className="manage-context-edit" onClick={() => setEditing((value) => !value)}>{editing ? "Close" : "Edit"}</button></div>
    {editing && <form className="manage-hierarchy-form" onSubmit={save}><label><span>Parent company</span><select value={parentId} onChange={(event) => setParentId(event.target.value)}><option value="">No parent company</option>{candidates.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><button type="submit" className="manage-button manage-button--quiet">Save relationship</button></form>}
    <div className="manage-hierarchy-list">{parent ? <Link href={`/manage/accounts/${parent.id}`}><small>Parent company</small><strong>{parent.name}</strong><ChevronRight size={13} /></Link> : <div className="manage-context-empty"><Building2 size={16} /><span>No parent company recorded.</span></div>}{children.length > 0 && <div className="manage-hierarchy-children"><small>Child companies · {children.length}</small>{children.slice(0, 4).map((child) => <Link href={`/manage/accounts/${child.id}`} key={child.id}><span>{child.name}</span><ChevronRight size={13} /></Link>)}</div>}</div>
  </section>;
}

function AccountOverview({
  account,
  profile,
  profileSummary,
  vendors,
  expenses,
  documents,
  contacts,
  allAccounts,
  locations,
  setSelectedVendorId,
  setActive,
  onCompose,
  onAddContact,
  onAddNote,
  run,
}: {
  account: ManageAccount;
  profile: ManageAccount["enrichment"];
  profileSummary: string;
  vendors: ManageData["vendorRelationships"];
  expenses: ManageData["expenses"];
  documents: ManageData["documents"];
  contacts: ManageContact[];
  allAccounts: ManageAccount[];
  locations: ManageLocation[];
  setSelectedVendorId: (id: string) => void;
  setActive: (active: string) => void;
  onCompose: (contact: ManageContact) => void;
  onAddContact: (account: ManageAccount) => void;
  onAddNote: (account: ManageAccount) => void;
  run: (work: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const accountLocations = locations.filter((location) => location.organizationId === account.id);
  return <div className="manage-record-layout manage-record-layout--right-rail">
    <main className="manage-record-main">
      <section className="manage-record-profile">
        <div>
          <span>Company profile</span>
          <h3>Short Description</h3>
          <p>{profileSummary}</p>
        </div>
        {profile && <div className="manage-record-profile-data">
          <dl>
            {profile.name && profile.name.toLowerCase() !== account.name.toLowerCase() && <div><dt>Apollo name</dt><dd>{profile.name}</dd></div>}
            <div><dt>Profile status</dt><dd>{pretty(profile.status)}</dd></div>
            {profile.foundedYear != null && <div><dt>Founded</dt><dd>{profile.foundedYear}</dd></div>}
            {profile.employeeCount != null && <div><dt>Team size</dt><dd>{profile.employeeCount.toLocaleString()}</dd></div>}
            {profile.fetchedAt && <div><dt>Updated</dt><dd>{date(profile.fetchedAt)}</dd></div>}
          </dl>
          {profile.technologies.length > 0 && <div className="manage-record-profile-field"><span>Technologies</span><TechnologyList technologies={profile.technologies} /></div>}
        </div>}
      </section>
      <div className="manage-vendor-overview">
        <CostTrend expenses={expenses} currency={account.currency} />
        <section className="manage-panel manage-vendor-preview">
          <header><div><h3>Linked vendors</h3><p>Spend, contracts, and source evidence by vendor.</p></div><button type="button" className="manage-button manage-button--quiet" onClick={() => setActive("vendors")}>View all</button></header>
          {vendors.length ? <VendorList vendors={vendors.slice(0, 3)} selectedId={null} onSelect={(id) => { setSelectedVendorId(id); setActive("vendors"); }} currency={account.currency} /> : <Empty icon={Building2} title="No vendor relationships" copy="Link a vendor to see its cost records here." />}
        </section>
      </div>
      <section className="manage-panel manage-record-overview-panel">
        <header><div><h3>Relationship snapshot</h3><p>Keep people, vendors, files, and activity close together.</p></div></header>
        <div className="manage-record-snapshot">
          <a href="#account-people"><Users size={16} /><span><strong>{contacts.length}</strong> people</span><ChevronRight size={15} /></a>
          <button type="button" onClick={() => setActive("vendors")}><Building2 size={16} /><span><strong>{vendors.length}</strong> vendors</span><ChevronRight size={15} /></button>
          <button type="button" onClick={() => setActive("files")}><FileText size={16} /><span><strong>{documents.length}</strong> source files</span><ChevronRight size={15} /></button>
        </div>
      </section>
    </main>
    <aside className="manage-record-rail manage-record-right-rail" aria-label="Account context">
      <section className="manage-context-card manage-account-details-context"><div className="manage-context-card__heading"><div><span>Account details</span><h3>At a glance</h3></div></div><dl><div><dt>Industry</dt><dd><InlineAccountIndustry account={account} profile={profile} /></dd></div><div><dt>Website</dt><dd><InlineAccountWebsite account={account} /></dd></div><div><dt>Phone</dt><dd><InlineAccountPhone account={account} profile={profile} /></dd></div><div><dt>Primary contact</dt><dd>{account.primaryContact || "Not set"}</dd></div><div><dt>Account since</dt><dd>{date(account.createdAt)}</dd></div></dl></section>
      <AccountPeopleRail contacts={contacts} onCompose={onCompose} onAddContact={() => onAddContact(account)} />
      <AccountHierarchyCard account={account} accounts={allAccounts} run={run} />
      <LocationMapCard accountId={account.id} locations={accountLocations} fallback={profile?.location} run={run} />
      <section className="manage-context-card"><div className="manage-context-card__heading"><div><span>Internal CRM</span><h3>Operator note</h3></div><button type="button" className="manage-context-add" onClick={() => onAddNote(account)} aria-label="Add note to this account" title="Add note to this account"><Plus size={15} aria-hidden="true" /></button></div><p className="manage-context-copy">{account.privateNotes || "No private account note yet."}</p></section>
    </aside>
  </div>;
}

function AccountDetailPage({
  data,
  accountId,
  run,
  onCompose,
  onAddContact,
  onAddNote,
}: {
  data: ManageData;
  accountId: string;
  run: (work: () => Promise<unknown>, success: string) => Promise<void>;
  onCompose: (contact: ManageContact) => void;
  onAddContact: (account: ManageAccount) => void;
  onAddNote: (account: ManageAccount) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const account = data.accounts.find((item) => item.id === accountId);

  const tabFromUrl = searchParams.get("tab");
  const active = ["overview", "vendors", "files", "activity", "work", "history"].includes(tabFromUrl ?? "") ? tabFromUrl! : "overview";
  const activityId = searchParams.get("activity");
  const selectedVendorId = searchParams.get("vendor");
  const setActive = (tab: string) => router.replace(`/manage/accounts/${accountId}?tab=${tab}${tab === "vendors" && selectedVendorId ? `&vendor=${selectedVendorId}` : ""}`, { scroll: false });
  const setSelectedVendorId = (vendorId: string | null) => router.replace(`/manage/accounts/${accountId}?tab=vendors${vendorId ? `&vendor=${vendorId}` : ""}`, { scroll: false });

  useEffect(() => {
    if (active !== "activity" || !activityId) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`activity-${activityId}`)?.scrollIntoView({ behavior: getMotionSafeScrollBehavior(), block: "center" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [active, activityId]);

  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [dangerDialogOpen, setDangerDialogOpen] = useState(false);
  const [dangerMode, setDangerMode] = useState<"archive" | "permanent-delete">("archive");
  const [deletionPreview, setDeletionPreview] = useState<DependencyPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const auditHistory = useRecordAuditHistory(`/api/manage/accounts/${accountId}/history`);

  // Edit form state
  const [name, setName] = useState(account?.name ?? "");
  const [legalName, setLegalName] = useState(account?.legalName ?? "");
  const [industry, setIndustry] = useState(account?.industry ?? "");
  const [employeeCountRange, setEmployeeCountRange] = useState(account?.employeeCountRange ?? "");
  const [annualRevenueRange, setAnnualRevenueRange] = useState(account?.annualRevenueRange ?? "");
  const [timezone, setTimezone] = useState(account?.timezone ?? "");
  const [currency, setCurrency] = useState(account?.currency ?? "USD");
  const [website, setWebsite] = useState(account?.website ?? "");
  const [stage, setStage] = useState(account?.stage ?? "onboarding");
  const [assignedTo, setAssignedTo] = useState(account?.assignedTo ?? "");
  const [primaryContactId, setPrimaryContactId] = useState(account?.primaryContactId ?? "");
  const [nextFollowUpAt, setNextFollowUpAt] = useState(account?.nextFollowUpAt ?? "");
  const [nextStep, setNextStep] = useState(account?.nextStep ?? "");
  const [privateNotes, setPrivateNotes] = useState(account?.privateNotes ?? "");

  if (!account)
    return (
      <Empty
        icon={Building2}
        title="Account not found"
        copy="This account may have been removed or is not visible to this internal operator."
        action={
          <Link className="manage-button manage-button--quiet" href="/manage/accounts">
            <ArrowLeft size={15} /> Back to accounts
          </Link>
        }
      />
    );

  const contacts = data.contacts.filter((item) => item.organizationId === account.id);
  const accountEmailContact = contacts.find((item) => item.id === account.primaryContactId) ?? contacts.find((item) => item.isPrimary) ?? contacts.find((item) => Boolean(item.email));
  const activities = data.activities.filter((item) => item.organizationId === account.id);
  const tasks = data.tasks.filter((item) => item.organizationId === account.id);
  const documents = data.documents.filter((item) => item.organizationId === account.id);
  const vendors = data.vendorRelationships.filter((item) => item.organizationId === account.id);
  const expenses = data.expenses.filter((item) => item.organizationId === account.id);
  const vendorContracts = data.vendorContracts.filter((item) => item.organizationId === account.id);
  const profile = account.enrichment;
  const companyPhone = account.phone || profile?.phone;
  const companyPhoneHref = companyPhone?.replace(/[^+\d]/g, "");
  const profileSummary =
    profile?.shortDescription ||
    (account.industry
      ? `${account.name} is recorded in the ${account.industry} industry.`
      : "Add the account website or a short internal note to make this record easier to recognize at a glance.");

  const isOwner = data.operator.role === "owner";
  const accountDraftDirty = recordDraftChanged({ name: account.name, legalName: account.legalName ?? "", industry: account.industry ?? "", employeeCountRange: account.employeeCountRange ?? "", annualRevenueRange: account.annualRevenueRange ?? "", timezone: account.timezone ?? "", currency: account.currency ?? "USD", website: account.website ?? "", stage: account.stage ?? "onboarding", assignedTo: account.assignedTo ?? "", primaryContactId: account.primaryContactId ?? "", nextFollowUpAt: account.nextFollowUpAt ?? "", nextStep: account.nextStep ?? "", privateNotes: account.privateNotes ?? "" }, { name, legalName, industry, employeeCountRange, annualRevenueRange, timezone, currency, website, stage, assignedTo, primaryContactId, nextFollowUpAt, nextStep, privateNotes }, ["name", "legalName", "industry", "employeeCountRange", "annualRevenueRange", "timezone", "currency", "website", "stage", "assignedTo", "primaryContactId", "nextFollowUpAt", "nextStep", "privateNotes"]);
  const openTaskCount = tasks.filter((task) => task.status !== "completed").length;
  const accountDecision = account.nextStep
    ? {
        heading: "A clear next step is recorded",
        description: account.nextFollowUpAt
          ? `${account.nextStep} Follow up by ${date(account.nextFollowUpAt)}.`
          : `${account.nextStep} Set a follow-up date when the timing is known.`,
        action: <button type="button" className="button button-primary" onClick={() => setActive("work")}>Review follow-up work</button>,
      }
    : openTaskCount
      ? {
          heading: "Follow-up work needs a decision",
          description: `${openTaskCount} open work item${openTaskCount === 1 ? " is" : "s are"} recorded for this account. Review the work queue and set one accountable next step.`,
          action: <button type="button" className="button button-primary" onClick={() => setActive("work")}>Open follow-up work</button>,
        }
      : accountEmailContact
        ? {
            heading: "Choose the next client touch",
            description: "No next step or scheduled follow-up is recorded. Start with the primary contact, then capture the outcome and the next accountable action.",
            action: <button type="button" className="button button-primary" onClick={() => onCompose(accountEmailContact)}>Email primary contact</button>,
          }
        : {
            heading: "Add an accountable contact",
            description: "This account has no primary contact, next step, or scheduled follow-up. Add a contact before starting outreach so the record has a clear owner.",
            action: <button type="button" className="button button-primary" onClick={() => onAddContact(account)}>Add contact</button>,
          };

  const handleOpenEditSheet = () => {
    setName(account.name);
    setLegalName(account.legalName ?? "");
    setIndustry(account.industry ?? "");
    setEmployeeCountRange(account.employeeCountRange ?? "");
    setAnnualRevenueRange(account.annualRevenueRange ?? "");
    setTimezone(account.timezone ?? "");
    setCurrency(account.currency ?? "USD");
    setWebsite(account.website ?? "");
    setStage(account.stage ?? "onboarding");
    setAssignedTo(account.assignedTo ?? "");
    setPrimaryContactId(account.primaryContactId ?? "");
    setNextFollowUpAt(account.nextFollowUpAt ?? "");
    setNextStep(account.nextStep ?? "");
    setPrivateNotes(account.privateNotes ?? "");
    setEditError(null);
    setEditSheetOpen(true);
  };

  const handleSaveEditSheet = async () => {
    setSavingEdit(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/manage/accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          legalName,
          industry,
          employeeCountRange,
          annualRevenueRange,
          timezone,
          currency,
          website,
          stage,
          assignedTo,
          primaryContactId,
          nextFollowUpAt,
          nextStep,
          privateNotes,
          expectedUpdatedAt: account.updatedAt,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update account details.");
      }
      toast.success("Account updated successfully.");
      setEditSheetOpen(false);
      router.refresh();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to save account changes");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleOpenDangerDialog = async (mode: "archive" | "permanent-delete") => {
    setDangerMode(mode);
    setDangerDialogOpen(true);
    if (mode === "permanent-delete") {
      setLoadingPreview(true);
      try {
        const res = await fetch(`/api/manage/accounts/${account.id}/deletion-preview`);
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
    if (dangerMode === "archive") {
      const restoring = account.visibleInCrm === false;
      const res = await fetch(`/api/manage/accounts/${account.id}/${restoring ? "restore" : "archive"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to ${restoring ? "restore" : "archive"} account.`);
      }
      toast.success(restoring ? "Account restored." : "Account archived.");
      router.push("/manage/accounts");
    } else {
      const res = await fetch(`/api/manage/accounts/${account.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, confirmation: "DELETE" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete account.");
      }
      toast.success("Account deleted.");
      router.push("/manage/accounts");
    }
  };

  const menuItems = [
    {
      id: "edit",
      label: "Edit account",
      icon: <Pencil size={15} />,
      onSelect: handleOpenEditSheet,
    },
    { id: "add-contact", label: "Add contact", icon: <UserPlus size={15} />, href: `/manage/contacts?organizationId=${account.id}` },
    { id: "add-task", label: "Add task", icon: <CalendarClock size={15} />, href: `/manage/outreach?organizationId=${account.id}` },
    { id: "add-note", label: "Add internal note", icon: <MessageSquareText size={15} />, href: `/manage/activity?organizationId=${account.id}` },
    { id: "add-vendor", label: "Add vendor", icon: <Building2 size={15} />, href: `/app/vendors?organizationId=${account.id}` },
    { id: "workspace", label: "Manage workspace access", icon: <Users size={15} />, href: `/app/settings?tab=team&organizationId=${account.id}` },
    { id: "history", label: "View history", icon: <Activity size={15} />, onSelect: () => setActive("history") },
    {
      id: "copy",
      label: "Copy account details",
      icon: <Copy size={15} />,
      onSelect: async () => {
        const info = `${account.name}\nStage: ${account.stage}\nWebsite: ${account.website || "N/A"}\nFollow-up: ${account.nextFollowUpAt || "N/A"}`;
        await navigator.clipboard.writeText(info);
        toast.success("Account details copied to clipboard.");
      },
    },
    {
      id: "export",
      label: "Export account data",
      icon: <Download size={15} />,
      onSelect: () => {
        downloadCsv(`account-${account.id}.csv`, [
          {
            ID: account.id,
            Name: account.name,
            LegalName: account.legalName,
            Industry: account.industry,
            Stage: account.stage,
            Website: account.website,
            CreatedAt: account.createdAt,
          },
        ]);
        toast.success("Account data exported.");
      },
    },
    {
      id: "archive",
      label: account.visibleInCrm === false ? "Restore account" : "Archive account",
      icon: <Archive size={15} />,
      onSelect: () => handleOpenDangerDialog("archive"),
    },
    {
      id: "delete",
      label: "Delete account…",
      icon: <Trash2 size={15} />,
      destructive: true,
      separatorBefore: true,
      disabled: !isOwner,
      onSelect: () => handleOpenDangerDialog("permanent-delete"),
    },
  ];


  const accountTabs = [
    { id: "overview", label: "Overview" },
    { id: "vendors", label: "Vendors", count: vendors.length },
    { id: "files", label: "Files", count: documents.length },
    { id: "activity", label: "Activity", count: activities.length },
    { id: "work", label: "Work", count: tasks.length },
    { id: "history", label: "History", count: auditHistory.history.length },
  ];

  return (
    <div className="manage-detail-page manage-record-page motion-page" data-record-detail-root="true">
      <GlobalBackControl
        className="manage-back-link"
        floatingActions={<>
          {accountEmailContact && <button type="button" className="global-back-control__action global-back-control__action--email" onClick={() => onCompose(accountEmailContact)} aria-label={`Compose email to ${accountEmailContact.fullName}`} title={`Compose email to ${accountEmailContact.fullName}`}><Mail size={16} /></button>}
          {companyPhone && companyPhoneHref && <a className="global-back-control__action global-back-control__action--phone" href={`tel:${companyPhoneHref}`} aria-label={`Call ${account.name}`} title={`Call ${companyPhone}`}><Phone size={16} /></a>}
        </>}
      />
      <header className="manage-record-heading">
        <div className="manage-record-identity">
          <CompanyLogo entity="organization" id={account.id} name={account.name} className="manage-record-logo" />
          <div>
            <h2>
              {account.name}{" "}
              <RecordHeaderLinks
                website={profile?.website || account.website}
                linkedinUrl={profile?.linkedinUrl}
                entityName={account.name}
              />
            </h2>
            {(account.legalName || (!account.industry && !profile?.industry && !profile?.location)) && <span>{account.legalName || "Account profile"}</span>}
            <AccountHeaderMeta account={account} profile={profile} />
          </div>
        </div>
        <div className="manage-record-actions">
          {accountEmailContact && (
            <button
              className="manage-record-action-icon manage-record-action-icon--email"
              onClick={() => onCompose(accountEmailContact)}
              aria-label={`Compose email to ${accountEmailContact.fullName}`}
              title={`Compose email to ${accountEmailContact.fullName}`}
            >
              <Mail size={17} />
            </button>
          )}
          {companyPhone && companyPhoneHref && (
            <a
              className="manage-record-action-icon manage-record-action-icon--phone"
              href={`tel:${companyPhoneHref}`}
              aria-label={`Call ${account.name}`}
              title={`Call ${companyPhone}`}
            >
              <Phone size={17} />
            </a>
          )}
          <RecordOverflowMenu items={menuItems} ariaLabel="More account actions" />
        </div>
      </header>

      <section className="manage-record-highlights" aria-label="Account highlights">
        <div>
          <span>Lifecycle</span>
          <Status value={account.stage || "unclassified"} />
        </div>
        <div>
          <span>Assigned owner</span>
          <strong>{account.assignedToName || "Unassigned"}</strong>
        </div>
        <div>
          <span>Last contacted</span>
          <strong>{account.lastContactedAt ? date(account.lastContactedAt) : "No approved activity"}</strong>
        </div>
        <div>
          <span>Next step</span>
          <strong>{account.nextStep || "Not set"}</strong>
        </div>
        <div>
          <span>Follow-up</span>
          <strong>{account.nextFollowUpAt ? date(account.nextFollowUpAt) : "Not scheduled"}</strong>
        </div>
        <div>
          <span>Vendors</span>
          <strong>{vendors.length}</strong>
        </div>
        <div>
          <span>Open work</span>
          <strong>{account.openTaskCount}</strong>
        </div>
        <div>
          <span>Evidence files</span>
          <strong>{documents.length}</strong>
        </div>
      </section>

      <RecordTabs tabs={accountTabs} active={active} onChange={setActive} />

      {active === "overview" && (
        <>
          <WorkspaceDecisionSummary
            ariaLabel="Account next step"
            className="manage-record-decision-summary"
            eyebrow="Client next step"
            description={accountDecision.description}
            facts={[
              { label: "Lifecycle", value: <Status value={account.stage || "unclassified"} /> },
              { label: "Follow-up", value: account.nextFollowUpAt ? date(account.nextFollowUpAt) : "Not scheduled" },
              { label: "Open work", value: openTaskCount ? `${openTaskCount} item${openTaskCount === 1 ? "" : "s"}` : "None" },
            ]}
            heading={accountDecision.heading}
            actions={accountDecision.action}
          />
          <AccountOverview
            account={account}
            profile={profile}
            profileSummary={profileSummary}
            vendors={vendors}
            expenses={expenses}
            documents={documents}
            contacts={contacts}
            allAccounts={data.accounts}
            locations={data.locations}
            setSelectedVendorId={setSelectedVendorId}
            setActive={setActive}
            onCompose={onCompose}
            onAddContact={onAddContact}
            onAddNote={onAddNote}
            run={run}
          />
        </>
      )}
      {active === "vendors" && (
        <VendorWorkspace
          vendors={vendors}
          expenses={expenses}
          contracts={vendorContracts}
          documents={documents}
          currency={account.currency}
          selectedId={selectedVendorId}
          onSelect={setSelectedVendorId}
        />
      )}
      {active === "files" && (
        <RecordFilesWorkspace
          title="Account files"
          description="A clean, searchable view of this client’s private source documents. Collections never change the immutable storage record."
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
            extractionStatus: item.extractionStatus,
            extractionInputMode: item.extractionInputMode,
            extractionFailureCode: item.extractionFailureCode,
            contextLabel: account.name,
            href: `/api/manage/documents/${item.id}/download`,
            retryHref:
              item.extractionStatus === "failed" && !item.sourcePurgedAt
                ? `/api/manage/documents/${item.id}/retry-extraction`
                : null,
            sourceAvailable: !item.sourcePurgedAt,
          }))}
        />
      )}
      {active === "activity" && (
        <section className="manage-panel manage-record-tab-panel">
          <header>
            <div>
              <h3>Relationship activity</h3>
              <p>Internal notes, outreach, and client touches for this account.</p>
            </div>
          </header>
          {activities.length ? (
            <ActivityList activities={activities} />
          ) : (
            <Empty icon={Activity} title="No activity yet" copy="Internal notes and client interactions will appear here." />
          )}
        </section>
      )}
      {active === "work" && (
        <section className="manage-panel manage-record-tab-panel">
          <header>
            <div>
              <h3>Follow-up work</h3>
              <p>Open and completed outreach tasks.</p>
            </div>
          </header>
          {tasks.length ? (
            <TaskList tasks={tasks} />
          ) : (
            <Empty icon={CalendarClock} title="No follow-up work" copy="Create a task when this account needs an internal next step." />
          )}
        </section>
      )}
      {active === "history" && (
        <section className="manage-panel manage-record-tab-panel">
          <header>
            <div>
              <h3>Account change history</h3>
              <p>Internal audit events and lifecycle activity logs.</p>
            </div>
          </header>
          <RecordChangeHistory error={auditHistory.error} history={auditHistory.history} loading={auditHistory.loading} onRetry={auditHistory.retry} />
        </section>
      )}

      {/* Edit Record Sheet */}
      <EditRecordSheet
        title={`Edit ${account.name}`}
        subtitle="Update core CRM organization fields and operating profile."
        isOpen={editSheetOpen}
        onClose={() => setEditSheetOpen(false)}
        onSave={handleSaveEditSheet}
        isDirty={accountDraftDirty}
        saving={savingEdit}
        error={editError}
        onReloadLatest={() => router.refresh()}
        onKeepDraft={() => setEditError(null)}
      >
        <div className="workspace-record-form">
          <div className="workspace-record-form__field">
            <label className="workspace-record-form__label">
              Organization Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="workspace-record-form__control"
            />
          </div>

          <div className="workspace-record-form__field">
            <label className="workspace-record-form__label">
              Legal Name
            </label>
            <input
              type="text"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder="e.g. Acme Corporation Inc."
              className="workspace-record-form__control"
            />
          </div>

          <div className="workspace-record-form__grid">
            <div className="workspace-record-form__field">
              <label className="workspace-record-form__label">
                Industry
              </label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="workspace-record-form__control"
              />
            </div>
            <div className="workspace-record-form__field">
              <label className="workspace-record-form__label">
                Lifecycle Stage
              </label>
              <CostivraSelect
                aria-label="Lifecycle stage"
                value={stage}
                onChange={setStage}
                options={stages.map((value) => ({
                  value,
                  label: pretty(value),
                }))}
              />
            </div>
          </div>

          <div className="workspace-record-form__grid workspace-record-form__grid--four">
            <label className="workspace-record-form__field"><span>Employee range</span><input className="workspace-record-form__control" value={employeeCountRange} onChange={(e) => setEmployeeCountRange(e.target.value)} placeholder="e.g. 51–200" /></label>
            <label className="workspace-record-form__field"><span>Revenue range</span><input className="workspace-record-form__control" value={annualRevenueRange} onChange={(e) => setAnnualRevenueRange(e.target.value)} placeholder="e.g. $10M–$50M" /></label>
            <label className="workspace-record-form__field"><span>Timezone</span><input className="workspace-record-form__control" value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="e.g. America/Chicago" /></label>
            <label className="workspace-record-form__field"><span>Currency</span><input className="workspace-record-form__control" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={10} /></label>
          </div>

          <div className="workspace-record-form__field">
            <label className="workspace-record-form__label">
              Website URL
            </label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://..."
              className="workspace-record-form__control"
            />
          </div>

          <div className="workspace-record-form__field">
            <label className="workspace-record-form__label">Assigned internal owner</label>
            <select className="workspace-record-form__control" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
              <option value="">Unassigned</option>
              {data.staff.map((member) => <option key={member.id} value={member.id}>{member.fullName}</option>)}
            </select>
          </div>

          <div className="workspace-record-form__field">
            <label className="workspace-record-form__label">
              Primary Contact
            </label>
            <select
              value={primaryContactId}
              onChange={(e) => setPrimaryContactId(e.target.value)}
              className="workspace-record-form__control"
            >
              <option value="">-- None Selected --</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} ({c.email})
                </option>
              ))}
            </select>
          </div>

          <div className="workspace-record-form__field">
            <label className="workspace-record-form__label">Next follow-up</label>
            <input className="workspace-record-form__control" type="datetime-local" value={nextFollowUpAt ? nextFollowUpAt.slice(0, 16) : ""} onChange={(e) => setNextFollowUpAt(e.target.value)} />
          </div>

          <div className="workspace-record-form__field">
            <label className="workspace-record-form__label">
              Next Step
            </label>
            <input
              type="text"
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value)}
              placeholder="e.g. Schedule baseline invoice review call"
              className="workspace-record-form__control"
            />
          </div>

          <div className="workspace-record-form__field">
            <label className="workspace-record-form__label">
              Private Operator Notes
            </label>
            <textarea
              value={privateNotes}
              onChange={(e) => setPrivateNotes(e.target.value)}
              rows={4}
              className="workspace-record-form__control workspace-record-form__control--textarea"
            />
          </div>
        </div>
      </EditRecordSheet>

      {/* Danger Dialog */}
      <RecordDangerDialog
        isOpen={dangerDialogOpen}
        mode={dangerMode}
        recordTitle={account.name}
        onClose={() => setDangerDialogOpen(false)}
        onConfirm={handleConfirmDangerAction}
        dependencyPreview={deletionPreview}
        loadingPreview={loadingPreview}
        requiredConfirmationText={dangerMode === "permanent-delete" ? "DELETE" : undefined}
      />
    </div>
  );
}

function ContactContextRail({
  contact,
  account,
  accounts,
  contacts,
  locations,
  onCompose,
  run,
}: {
  contact: ManageContact;
  account: ManageAccount | undefined;
  accounts: ManageAccount[];
  contacts: ManageContact[];
  locations: ManageLocation[];
  onCompose: (contact: ManageContact) => void;
  run: (work: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const accountLocations = account ? locations.filter((location) => location.organizationId === account.id) : [];
  const accountContacts = account ? contacts.filter((item) => item.organizationId === account.id) : [];

  return (
    <aside className="manage-record-rail manage-record-right-rail" aria-label="Contact context">
      <section className="manage-context-card">
        <div className="manage-context-card__heading">
          <div>
            <span>Contact details</span>
            <h3>At a glance</h3>
          </div>
        </div>
        <dl>
          <div>
            <dt>Account</dt>
            <dd>{account ? <Link href={`/manage/accounts/${account.id}`}>{account.name}</Link> : contact.organizationName}</dd>
          </div>
          <div>
            <dt>Title</dt>
            <dd>{contact.title || "Not recorded"}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>
              <button type="button" className="manage-contact-email" onClick={() => onCompose(contact)}>
                {contact.email}
              </button>
            </dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>
              {contact.phone ? (
                <a href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`} className="manage-contact-phone">
                  {contact.phone}
                </a>
              ) : (
                "Not recorded"
              )}
            </dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>{contact.source === "workspace" ? "Workspace member" : "CRM contact"}</dd>
          </div>
        </dl>
      </section>
      {account && (
        <>
          <AccountPeopleRail contacts={accountContacts} onCompose={onCompose} />
          <AccountHierarchyCard account={account} accounts={accounts} run={run} />
          <LocationMapCard locations={accountLocations} fallback={account.enrichment?.location} />
        </>
      )}
      <section className="manage-context-card">
        <div className="manage-context-card__heading">
          <div>
            <span>Relationship status</span>
            <h3>Ready for outreach</h3>
          </div>
        </div>
        <p className="manage-context-copy">
          {contact.isPrimary ? "Primary contact for this account." : "Client contact linked to this account."}{" "}
          {contact.marketingStatus ? `Marketing status: ${pretty(contact.marketingStatus)}.` : "Marketing consent is not recorded."}
        </p>
      </section>
    </aside>
  );
}

function ContactDetailPage({
  data,
  contactId,
  run,
  onCompose,
}: {
  data: ManageData;
  contactId: string;
  run: (work: () => Promise<unknown>, success: string) => Promise<void>;
  onCompose: (contact: ManageContact) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const contact = data.contacts.find((item) => item.id === contactId);

  const requestedTab = searchParams.get("tab");
  const active = ["overview", "files", "activity", "work", "history"].includes(requestedTab ?? "") ? requestedTab! : "overview";
  const setActive = (tab: string) => router.replace(`/manage/contacts/${contactId}?tab=${tab}`, { scroll: false });
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [dangerDialogOpen, setDangerDialogOpen] = useState(false);
  const [dangerMode, setDangerMode] = useState<"deactivate" | "remove">("deactivate");
  const [deletionPreview, setDeletionPreview] = useState<DependencyPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const auditHistory = useRecordAuditHistory(`/api/manage/contacts/${contactId}/history`);

  // Form state
  const [fullName, setFullName] = useState(contact?.fullName ?? "");
  const [email, setEmail] = useState(contact?.email ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [title, setTitle] = useState(contact?.title ?? "");
  const [organizationId, setOrganizationId] = useState(contact?.organizationId ?? "");
  const [isPrimary, setIsPrimary] = useState(contact?.isPrimary ?? false);
  const [status, setStatus] = useState(contact?.status ?? "active");

  if (!contact)
    return (
      <Empty
        icon={Users}
        title="Contact not found"
        copy="This contact may have been removed or is not visible to this internal operator."
        action={
          <Link className="manage-button manage-button--quiet" href="/manage/contacts">
            <ArrowLeft size={15} /> Back to contacts
          </Link>
        }
      />
    );

  const contactAccount = data.accounts.find((account) => account.id === contact.organizationId);
  const contactAccountProfile = contactAccount?.enrichment;
  const contactProfileSummary =
    contactAccountProfile?.shortDescription ||
    (contactAccount?.industry
      ? `${contactAccount.name} is recorded in the ${contactAccount.industry} industry.`
      : contactAccount
        ? `This contact is linked to ${contactAccount.name}. Add the account website or a short internal note to make the relationship easier to recognize at a glance.`
        : "Link this contact to an account to add a concise relationship summary.");
  const contactDraftDirty = recordDraftChanged({ fullName: contact.fullName, email: contact.email, phone: contact.phone ?? "", title: contact.title ?? "", organizationId: contact.organizationId, isPrimary: contact.isPrimary, status: contact.status }, { fullName, email, phone, title, organizationId, isPrimary, status }, ["fullName", "email", "phone", "title", "organizationId", "isPrimary", "status"]);
  const allAccountActivities = data.activities.filter((item) => item.organizationId === contact.organizationId);
  const contactSpecificActivities = allAccountActivities.filter((item) => item.contactId === contact.id);
  const generalAccountActivities = allAccountActivities.filter((item) => !item.contactId || item.contactId !== contact.id);
  const lastContactedAt = [...contactSpecificActivities].sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt))[0]?.occurredAt ?? null;

  const tasks = data.tasks.filter(
    (item) => item.organizationId === contact.organizationId && item.contactId === contact.id,
  );
  const recentEmailThread = data.mail.threads
    .filter((thread) => thread.contactId === contact.id || (!thread.contactId && thread.contactEmail?.trim().toLowerCase() === contact.email.trim().toLowerCase()))
    .sort((left, right) => Date.parse(right.lastMessageAt) - Date.parse(left.lastMessageAt))[0] ?? null;
  const nextTask = [...tasks].filter((task) => task.status !== "completed").sort((left, right) => (left.dueAt ?? "").localeCompare(right.dueAt ?? ""))[0] ?? null;
  const documents = data.documents.filter((item) => item.organizationId === contact.organizationId);
  const openTaskCount = tasks.filter((task) => task.status !== "completed").length;
  const contactDecision = nextTask
    ? {
        heading: "A next client touch is scheduled",
        description: nextTask.dueAt
          ? `${nextTask.title} is due ${date(nextTask.dueAt)}. Keep the outcome and following action on this contact record.`
          : `${nextTask.title} is the next open task. Add a due date when the timing is known.`,
        action: <button type="button" className="button button-primary" onClick={() => setActive("work")}>Review follow-up work</button>,
      }
    : recentEmailThread
      ? {
          heading: "Review the latest client touch",
          description: "No next task is scheduled for this contact. Review the latest email, then record the responsible follow-up if one is needed.",
          action: <Link className="button button-primary" href={`/manage/mail/${recentEmailThread.id}`}>Open latest email</Link>,
        }
      : {
          heading: "Set the next client touch",
          description: "No contact-linked email or scheduled task is recorded. Start an accountable conversation, then capture the outcome and next action.",
          action: <button type="button" className="button button-primary" onClick={() => onCompose(contact)}>Start an email</button>,
        };

  const handleOpenEditSheet = () => {
    setFullName(contact.fullName);
    setEmail(contact.email);
    setPhone(contact.phone ?? "");
    setTitle(contact.title ?? "");
    setOrganizationId(contact.organizationId);
    setIsPrimary(contact.isPrimary);
    setStatus(contact.status);
    setEditError(null);
    setEditSheetOpen(true);
  };

  const handleSaveEditSheet = async () => {
    setSavingEdit(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/manage/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          title,
          organizationId,
          isPrimary,
          status,
          expectedUpdatedAt: contact.updatedAt,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update contact.");
      }
      toast.success("Contact record updated.");
      setEditSheetOpen(false);
      router.refresh();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to save contact changes");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleOpenDangerDialog = async (mode: "deactivate" | "remove") => {
    setDangerMode(mode);
    setDangerDialogOpen(true);
    if (mode === "remove") {
      setLoadingPreview(true);
      try {
        const res = await fetch(`/api/manage/contacts/${contact.id}/deletion-preview`);
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
    if (dangerMode === "deactivate") {
      const restoring = contact.status === "inactive";
      const res = await fetch(`/api/manage/contacts/${contact.id}/${restoring ? "restore" : "deactivate"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, primaryDisposition: !restoring && contact.isPrimary ? "clear" : undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to ${restoring ? "restore" : "change"} contact status.`);
      }
      toast.success(contact.status === "inactive" ? "Contact reactivated." : "Contact deactivated.");
      router.refresh();
    } else {
      const res = await fetch(`/api/manage/contacts/${contact.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, confirmation: "REMOVE" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to remove contact from CRM.");
      }
      toast.success("Contact removed from CRM.");
      router.push("/manage/contacts");
    }
  };

  const handleMakePrimary = async () => {
    try {
      const res = await fetch(`/api/manage/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPrimary: true, expectedUpdatedAt: contact.updatedAt }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to promote to primary contact.");
      }
      toast.success(`${contact.fullName} is now the primary contact.`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to promote contact.");
    }
  };

  const menuItems = [
    {
      id: "edit",
      label: "Edit contact",
      icon: <Pencil size={15} />,
      onSelect: handleOpenEditSheet,
    },
    ...(recentEmailThread ? [{ id: "recent-email", label: "View recent email", icon: <MailOpen size={15} />, href: `/manage/mail/${recentEmailThread.id}` }] : []),
    ...(contact.phone ? [{ id: "call", label: "Call", icon: <Phone size={15} />, href: `tel:${contact.phone.replace(/[^+\d]/g, "")}` }] : []),
    {
      id: "email",
      label: "Send email",
      icon: <Mail size={15} />,
      onSelect: () => onCompose(contact),
    },
    { id: "move", label: "Move to another account", icon: <Building2 size={15} />, onSelect: handleOpenEditSheet },
    { id: "history", label: "View history", icon: <Activity size={15} />, onSelect: () => setActive("history") },
    {
      id: "primary",
      label: "Make primary contact",
      icon: <CheckCircle2 size={15} />,
      disabled: contact.isPrimary,
      onSelect: handleMakePrimary,
    },
    {
      id: "copy",
      label: "Copy contact details",
      icon: <Copy size={15} />,
      onSelect: async () => {
        const info = `${contact.fullName}\nEmail: ${contact.email}\nPhone: ${contact.phone || "N/A"}\nTitle: ${contact.title || "N/A"}`;
        await navigator.clipboard.writeText(info);
        toast.success("Contact details copied to clipboard.");
      },
    },
    {
      id: "deactivate",
      label: contact.status === "inactive" ? "Reactivate contact" : "Deactivate contact",
      icon: <Archive size={15} />,
      onSelect: () => handleOpenDangerDialog("deactivate"),
    },
    {
      id: "remove",
      label: "Remove contact from CRM…",
      icon: <Trash2 size={15} />,
      destructive: true,
      separatorBefore: true,
      onSelect: () => handleOpenDangerDialog("remove"),
    },
  ];


  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "files", label: "Account files", count: documents.length },
    { id: "activity", label: "Activity", count: allAccountActivities.length },
    { id: "work", label: "Tasks", count: tasks.length },
    { id: "history", label: "History", count: auditHistory.history.length },
  ];

  return (
    <div className="manage-detail-page manage-record-page motion-page" data-record-detail-root="true">
      <GlobalBackControl
        className="manage-back-link"
        floatingActions={<>
          <button type="button" className="global-back-control__action global-back-control__action--email" onClick={() => onCompose(contact)} aria-label={`Compose email to ${contact.fullName}`} title={`Compose email to ${contact.fullName}`}><Mail size={16} /></button>
          {contact.phone && <a className="global-back-control__action global-back-control__action--phone" href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`} aria-label={`Call ${contact.fullName}`} title={`Call ${contact.phone}`}><Phone size={16} /></a>}
        </>}
      />
      <header className="manage-record-heading">
        <div className="manage-record-identity">
          <span className="manage-record-person-avatar">{initials(contact.fullName)}</span>
          <div>
            <h2>
              {contact.fullName}{" "}
              <RecordHeaderLinks
                website={contactAccount?.enrichment?.website || contactAccount?.website}
                linkedinUrl={contactAccount?.enrichment?.linkedinUrl}
                entityName={contact.fullName}
              />
            </h2>
            <span>
              {contact.title || "Role not set"} · {contact.organizationName}
            </span>
          </div>
        </div>
        <div className="manage-record-actions">
          <button
            className="manage-record-action-icon manage-record-action-icon--email"
            onClick={() => onCompose(contact)}
            aria-label={`Compose email to ${contact.fullName}`}
            title={`Compose email to ${contact.fullName}`}
          >
            <Mail size={17} />
          </button>
          {contact.phone && (
            <a
              className="manage-record-action-icon manage-record-action-icon--phone"
              href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`}
              aria-label={`Call ${contact.fullName}`}
              title={`Call ${contact.phone}`}
            >
              <Phone size={17} />
            </a>
          )}
          <RecordOverflowMenu items={menuItems} ariaLabel="More contact actions" />
        </div>
      </header>

      <section className="manage-record-highlights manage-record-highlights--contact">
        <div>
          <Link
            href={`/manage/accounts/${contact.organizationId}`}
            className="manage-record-account-link"
            title={`Open ${contact.organizationName}`}
          >
            <CompanyLogo
              entity="organization"
              id={contact.organizationId}
              name={contact.organizationName}
              className="manage-record-account-logo"
            />
            <span>
              <small>Account</small>
              <strong>{contact.organizationName}</strong>
            </span>
          </Link>
        </div>
        <div>
          <span>Relationship</span>
          <strong>{contact.isPrimary ? "Primary contact" : "Client contact"}</strong>
        </div>
        <div>
          <span>Marketing consent</span>
          <strong>{contact.marketingStatus ? pretty(contact.marketingStatus) : "Not recorded"}</strong>
        </div>
        <div>
          <span>Account files</span>
          <strong>{documents.length}</strong>
        </div>
      </section>

      <RecordTabs tabs={tabs} active={active} onChange={setActive} />

      {active === "overview" && (
        <>
          <WorkspaceDecisionSummary
            ariaLabel="Contact next step"
            className="manage-record-decision-summary"
            eyebrow="Client next step"
            description={contactDecision.description}
            facts={[
              { label: "Last contacted", value: lastContactedAt ? date(lastContactedAt) : "Not recorded" },
              { label: "Open work", value: openTaskCount ? `${openTaskCount} task${openTaskCount === 1 ? "" : "s"}` : "None" },
              { label: "Contact status", value: <Status value={contact.status} /> },
            ]}
            heading={contactDecision.heading}
            actions={contactDecision.action}
          />
          <div className="manage-record-layout manage-record-layout--right-rail">
            <main className="manage-record-main">
              <section className="manage-record-profile">
                <div>
                  <span>Company profile</span>
                  <h3>Short description</h3>
                  <p>{contactProfileSummary}</p>
                </div>
                {contactAccountProfile && (
                  <div className="manage-record-profile-data">
                    <dl>
                      {contactAccountProfile.name && contactAccountProfile.name.toLowerCase() !== contactAccount?.name.toLowerCase() && (
                        <div><dt>Apollo name</dt><dd>{contactAccountProfile.name}</dd></div>
                      )}
                      <div><dt>Profile status</dt><dd>{pretty(contactAccountProfile.status)}</dd></div>
                      {contactAccountProfile.foundedYear != null && <div><dt>Founded</dt><dd>{contactAccountProfile.foundedYear}</dd></div>}
                      {contactAccountProfile.employeeCount != null && <div><dt>Team size</dt><dd>{contactAccountProfile.employeeCount.toLocaleString()}</dd></div>}
                      {contactAccountProfile.fetchedAt && <div><dt>Updated</dt><dd>{date(contactAccountProfile.fetchedAt)}</dd></div>}
                    </dl>
                    {contactAccountProfile.technologies.length > 0 && (
                      <div className="manage-record-profile-field">
                        <span>Technologies</span>
                        <TechnologyList technologies={contactAccountProfile.technologies} />
                      </div>
                    )}
                  </div>
                )}
              </section>

              <section className="manage-panel manage-record-overview-panel">
              <header>
                <div>
                  <h3>Relationship readiness</h3>
                  <p>See the information an operator needs before reaching out.</p>
                </div>
              </header>
              <dl className="manage-detail-list">
                <div><dt>Last contacted</dt><dd>{lastContactedAt ? date(lastContactedAt) : "No approved activity"}</dd></div>
                <div><dt>Recent email</dt><dd>{recentEmailThread ? <Link href={`/manage/mail/${recentEmailThread.id}`}>{recentEmailThread.subject || "Untitled email"} · {date(recentEmailThread.lastMessageAt)}</Link> : "No contact-linked email"}</dd></div>
                <div><dt>Next task</dt><dd>{nextTask ? nextTask.title : "No scheduled task"}</dd></div>
                <div><dt>Open tasks</dt><dd>{tasks.filter((task) => task.status !== "completed").length}</dd></div>
                <div>
                  <dt>Access status</dt>
                  <dd>
                    <Status value={contact.status} />
                  </dd>
                </div>
                <div>
                  <dt>Marketing consent</dt>
                  <dd>{contact.marketingStatus ? pretty(contact.marketingStatus) : "Not recorded"}</dd>
                </div>
                <div>
                  <dt>Account activity</dt>
                  <dd>
                    {allAccountActivities.length} recorded event{allAccountActivities.length === 1 ? "" : "s"}
                  </dd>
                </div>
              </dl>
              </section>
            </main>
            <ContactContextRail
              contact={contact}
              account={contactAccount}
              accounts={data.accounts}
              contacts={data.contacts}
              locations={data.locations}
              onCompose={onCompose}
              run={run}
            />
          </div>
        </>
      )}

      {active === "files" && (
        <RecordFilesWorkspace
          title="Account source files"
          description="These files belong to the client account. Contact-specific email attachments stay in the mail workspace so their mailbox permissions remain intact."
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
            extractionStatus: item.extractionStatus,
            extractionInputMode: item.extractionInputMode,
            extractionFailureCode: item.extractionFailureCode,
            contextLabel: contact.organizationName,
            href: `/api/manage/documents/${item.id}/download`,
            retryHref:
              item.extractionStatus === "failed" && !item.sourcePurgedAt
                ? `/api/manage/documents/${item.id}/retry-extraction`
                : null,
            sourceAvailable: !item.sourcePurgedAt,
          }))}
          emptyCopy="No account source files are available to this internal record yet."
        />
      )}

      {active === "activity" && (
        <div className="manage-record-tab-stack">
          <section className="manage-panel manage-record-tab-panel">
            <header>
              <div>
                <h3>Direct contact activity</h3>
                <p>Activity specifically linked to {contact.fullName}.</p>
              </div>
            </header>
            {contactSpecificActivities.length ? (
              <ActivityList activities={contactSpecificActivities} />
            ) : (
              <Empty icon={Activity} title="No direct contact activity" copy="Direct outreach and notes for this contact will appear here." />
            )}
          </section>

          <section className="manage-panel manage-record-tab-panel">
            <header>
              <div>
                <h3>Broader account context</h3>
                <p>Other activity recorded for {contact.organizationName}.</p>
              </div>
            </header>
            {generalAccountActivities.length ? (
              <ActivityList activities={generalAccountActivities} />
            ) : (
              <Empty icon={Activity} title="No general account activity" copy="Other account activities will appear here." />
            )}
          </section>
        </div>
      )}

      {active === "work" && (
        <section className="manage-panel manage-record-tab-panel">
          <header>
            <div>
              <h3>Tasks for {contact.fullName}</h3>
              <p>Only work explicitly linked to this CRM contact is shown.</p>
            </div>
          </header>
          {tasks.length ? (
            <TaskList tasks={tasks} />
          ) : (
            <Empty icon={CalendarClock} title="No contact tasks" copy="Assign a task to this contact when there is a clear next step." />
          )}
        </section>
      )}

      {active === "history" && (
        <section className="manage-panel manage-record-tab-panel">
          <header>
            <div>
              <h3>Contact change history</h3>
              <p>Internal audit log of changes made to this CRM contact record.</p>
            </div>
          </header>
          <RecordChangeHistory error={auditHistory.error} history={auditHistory.history} loading={auditHistory.loading} onRetry={auditHistory.retry} />
        </section>
      )}

      {/* Edit Record Sheet */}
      <EditRecordSheet
        title={`Edit ${contact.fullName}`}
        subtitle="Update contact details and relationship role."
        isOpen={editSheetOpen}
        onClose={() => setEditSheetOpen(false)}
        onSave={handleSaveEditSheet}
        isDirty={contactDraftDirty}
        saving={savingEdit}
        error={editError}
        onReloadLatest={() => router.refresh()}
        onKeepDraft={() => setEditError(null)}
      >
        <div className="workspace-record-form">
          <div className="workspace-record-form__field">
            <label className="workspace-record-form__label">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="workspace-record-form__control"
            />
          </div>

          <div className="workspace-record-form__field">
            <label className="workspace-record-form__label">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="workspace-record-form__control"
            />
          </div>

          <div className="workspace-record-form__field">
            <label className="workspace-record-form__label">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="workspace-record-form__control"
            />
          </div>

          <div className="workspace-record-form__field">
            <label className="workspace-record-form__label">
              Job Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chief Financial Officer"
              className="workspace-record-form__control"
            />
          </div>

          <div className="workspace-record-form__field">
            <label className="workspace-record-form__label">Account</label>
            <select className="workspace-record-form__control" value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}>
              {data.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
            {organizationId !== contact.organizationId && <small className="workspace-record-form__help">Only the CRM contact relationship moves. Workspace access, profile links, and memberships remain unchanged.</small>}
          </div>

          <div className="workspace-record-form__check">
            <input
              type="checkbox"
              id="isPrimaryCheck"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
            />
            <label htmlFor="isPrimaryCheck">
              Primary contact for {contact.organizationName}
            </label>
          </div>

          <div className="workspace-record-form__field">
            <label className="workspace-record-form__label">Contact status</label>
            <select className="workspace-record-form__control" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="active">Active</option><option value="inactive">Inactive</option><option value="bounced">Bounced</option><option value="unsubscribed">Unsubscribed</option>
            </select>
          </div>

          <section className="workspace-record-form__context" aria-label="Read-only workspace context">
            <strong>Workspace context</strong>
            <p><strong>Read only</strong></p>
            <p>CRM contact record. Workspace access is governed separately and is never changed when this contact moves accounts.</p>
          </section>
        </div>
      </EditRecordSheet>

      {/* Danger Dialog */}
      <RecordDangerDialog
        isOpen={dangerDialogOpen}
        mode={dangerMode}
        recordTitle={contact.fullName}
        onClose={() => setDangerDialogOpen(false)}
        onConfirm={handleConfirmDangerAction}
        dependencyPreview={deletionPreview}
        loadingPreview={loadingPreview}
        requiredConfirmationText={dangerMode === "remove" ? "REMOVE" : dangerMode === "deactivate" && contact.status !== "inactive" && contact.isPrimary ? "CLEAR PRIMARY" : undefined}
        requiresReason={dangerMode === "deactivate"}
      />
    </div>
  );
}

function Outreach({
  data,
  query,
  run,
  sequenceId,
}: {
  data: ManageData;
  query: string;
  run: (work: () => Promise<unknown>, success: string) => Promise<void>;
  sequenceId?: string | null;
}) {
  const [priorityFilter, setPriorityFilter] = useState<"all" | "high" | "normal" | "low">("all");
  const [priorityFilterOpen, setPriorityFilterOpen] = useState(false);
  const priorityFilterRef = useRef<HTMLDivElement>(null);
  const priorityFilterTriggerRef = useRef<HTMLButtonElement>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestedOutreachTab = searchParams.get("tab");
  const outreachTab: "tasks" | "sequences" | "enrollments" = requestedOutreachTab === "sequences" || requestedOutreachTab === "enrollments" ? requestedOutreachTab : "tasks";
  const setOutreachTab = (tab: "tasks" | "sequences" | "enrollments") => {
    const next = new URLSearchParams(searchParams.toString());
    if (tab === "tasks") next.delete("tab"); else next.set("tab", tab);
    if (tab !== "sequences") next.delete("sequence");
    if (tab !== "enrollments") next.delete("sequenceId");
    if (tab !== "enrollments") next.delete("enrollment");
    router.replace(`/manage/outreach${next.toString() ? `?${next.toString()}` : ""}`);
  };
  const handleOutreachTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const tabs = ["tasks", "sequences", "enrollments"] as const;
    const currentIndex = tabs.indexOf(outreachTab);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? tabs.length - 1
        : (currentIndex + (event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1) + tabs.length) % tabs.length;
    const nextTab = tabs[nextIndex];
    setOutreachTab(nextTab);
    window.requestAnimationFrame(() => document.getElementById(`outreach-tab-${nextTab}`)?.focus());
  };

  const activeTasks = data.tasks.filter((task) => ["open", "in_progress"].includes(task.status));
  const tasks = activeTasks.filter((task) => {
    const matchesPriority =
      priorityFilter === "all" || task.priority === priorityFilter;
    const matchesQuery = `${task.title} ${task.organizationName} ${task.notes || ""}`
      .toLowerCase()
      .includes(query.toLowerCase());
    return matchesPriority && matchesQuery;
  });

  const priorityFilterOptions = [
    { value: "all" as const, label: "All priorities", count: activeTasks.length },
    { value: "high" as const, label: "High priority", count: activeTasks.filter((task) => task.priority === "high").length },
    { value: "normal" as const, label: "Normal priority", count: activeTasks.filter((task) => task.priority === "normal").length },
    { value: "low" as const, label: "Low priority", count: activeTasks.filter((task) => task.priority === "low").length },
  ];

  useEffect(() => {
    if (!priorityFilterOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!priorityFilterRef.current?.contains(event.target as Node)) setPriorityFilterOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setPriorityFilterOpen(false);
      priorityFilterTriggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [priorityFilterOpen]);

  if (sequenceId) {
    return <div id="outreach-panel-sequence-detail" role="main" aria-label="Sequence detail">
      <SequenceWorkspace data={data} query={query} mode="sequences" sequenceId={sequenceId} />
    </div>;
  }

  return (
    <>
      <nav className="manage-tabs manage-outreach-tabs" role="tablist" aria-label="Outreach workspace">
        <button id="outreach-tab-tasks" role="tab" aria-selected={outreachTab === "tasks"} aria-controls="outreach-panel-tasks" tabIndex={outreachTab === "tasks" ? 0 : -1} className={outreachTab === "tasks" ? "active" : ""} onKeyDown={handleOutreachTabKeyDown} onClick={() => setOutreachTab("tasks")}>Tasks <span>{activeTasks.length}</span></button>
        <button id="outreach-tab-sequences" role="tab" aria-selected={outreachTab === "sequences"} aria-controls="outreach-panel-sequences" tabIndex={outreachTab === "sequences" ? 0 : -1} className={outreachTab === "sequences" ? "active" : ""} onKeyDown={handleOutreachTabKeyDown} onClick={() => setOutreachTab("sequences")}>Sequences</button>
        <button id="outreach-tab-enrollments" role="tab" aria-selected={outreachTab === "enrollments"} aria-controls="outreach-panel-enrollments" tabIndex={outreachTab === "enrollments" ? 0 : -1} className={outreachTab === "enrollments" ? "active" : ""} onKeyDown={handleOutreachTabKeyDown} onClick={() => setOutreachTab("enrollments")}>Enrollments</button>
      </nav>
      {outreachTab !== "tasks" ? <div id={`outreach-panel-${outreachTab}`} role="tabpanel" aria-labelledby={`outreach-tab-${outreachTab}`} tabIndex={0}><SequenceWorkspace data={data} query={query} mode={outreachTab === "enrollments" ? "enrollments" : "sequences"} /></div> : <div id="outreach-panel-tasks" role="tabpanel" aria-labelledby="outreach-tab-tasks" tabIndex={0}>
      <div className="manage-outreach-board-toolbar">
        <div className="manage-outreach-task-toolbar-copy">
          <strong>Active tasks</strong>
          <span>{tasks.length} shown · ordered by due date · completed tasks hidden</span>
        </div>
        <div ref={priorityFilterRef} className={`manage-outreach-priority-filter${priorityFilterOpen ? " is-open" : ""}`}>
          <button ref={priorityFilterTriggerRef} type="button" className="manage-outreach-priority-filter__trigger" aria-label="Filter tasks by priority" title="Filter tasks by priority" aria-haspopup="menu" aria-controls="outreach-priority-filter-menu" aria-expanded={priorityFilterOpen} onClick={() => setPriorityFilterOpen((current) => !current)}>
            <ListFilter size={16} strokeWidth={1.8} aria-hidden="true" />
            {priorityFilter !== "all" && <span className="manage-outreach-priority-filter__count">1</span>}
          </button>
          <div id="outreach-priority-filter-menu" className="manage-outreach-priority-filter__menu" role="menu" aria-label="Task priority filters">
            <div className="manage-outreach-priority-filter__heading">Filter tasks</div>
            {priorityFilterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={priorityFilter === option.value}
                className={`manage-outreach-priority-filter__option${priorityFilter === option.value ? " is-active" : ""}`}
                onClick={() => {
                  setPriorityFilter(option.value);
                  setPriorityFilterOpen(false);
                  priorityFilterTriggerRef.current?.focus();
                }}
              >
                <span className="manage-outreach-priority-filter__option-label"><span className="manage-outreach-priority-filter__option-check" aria-hidden="true" />{option.label}</span>
                <span className="manage-outreach-priority-filter__option-count">{option.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <OutreachTaskTable tasks={tasks} run={run} />
      </div>}
    </>
  );
}

function OutreachTaskTable({
  tasks,
  run,
}: {
  tasks: ManageData["tasks"];
  run: (work: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const orderedTasks = [...tasks].sort((a, b) => {
    const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    if (aDue !== bDue) return aDue - bDue;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (!orderedTasks.length) {
    return <Empty icon={CalendarClock} title="No active tasks" copy="Your active follow-up work will appear here in due-date order. Completed tasks stay out of this working view." />;
  }

  return <div className="manage-table-wrap manage-outreach-task-table">
    <table>
      <caption className="sr-only">Active outreach tasks ordered by due date</caption>
      <thead>
        <tr>
          <th scope="col">Task</th>
          <th scope="col">Account</th>
          <th scope="col">Status</th>
          <th scope="col">Priority</th>
          <th scope="col">Type</th>
          <th scope="col" aria-sort="ascending">Due</th>
          <th scope="col"><span className="sr-only">Actions</span></th>
        </tr>
      </thead>
      <tbody>
        {orderedTasks.map((task) => (
          <tr key={task.id}>
            <td data-label="Task">
              <div className="manage-outreach-task-record-cell">
                <Link href={taskHref(task)} className="manage-outreach-task-record" aria-label={`Open ${task.title} for ${task.organizationName}`}>
                  <span className={`manage-task-icon manage-task-icon--${task.priority}`}><TaskIcon taskType={task.taskType} /></span>
                  <span>
                    <strong>{task.title}</strong>
                    {task.notes && <small>{task.notes}</small>}
                  </span>
                </Link>
                {sequenceTaskOriginLabel(task) && (task.sequenceEnrollmentId ? <Link className="manage-task-origin manage-outreach-task-origin" href={`/manage/outreach?tab=enrollments&enrollment=${task.sequenceEnrollmentId}`} aria-label={`Open sequence enrollment for ${task.title}`}>{sequenceTaskOriginLabel(task)}</Link> : <span className="manage-task-origin manage-outreach-task-origin">{sequenceTaskOriginLabel(task)}</span>)}
              </div>
            </td>
            <td data-label="Account"><Link className="manage-outreach-task-account" href={`/manage/accounts/${task.organizationId}`}>{task.organizationName}</Link></td>
            <td data-label="Status"><span className={`manage-status manage-status--${task.status}`}><i aria-hidden="true" />{pretty(task.status)}</span></td>
            <td data-label="Priority"><span className={`manage-priority manage-priority--${task.priority}`}>{task.priority}</span></td>
            <td data-label="Type">{pretty(task.taskType)}</td>
            <td data-label="Due"><time dateTime={task.dueAt ?? undefined}>{date(task.dueAt)}</time></td>
            <td data-label="Actions" className="manage-outreach-task-actions">
              <button
                type="button"
                onClick={() => void run(() => api(`/api/manage/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ status: "completed" }) }), "Task completed.")}
                aria-label={`Complete ${task.title}`}
                title="Mark task completed"
              >
                <Check size={15} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>;
}

function SettingsPage({
  data,
  query,
  run,
  onAdd,
  onUpdated,
}: {
  data: ManageData;
  query: string;
  run: (work: () => Promise<unknown>, success: string) => Promise<void>;
  onAdd: () => void;
  onUpdated: () => void;
}) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [savingSignature, setSavingSignature] = useState(false);
  const [jobTitle, setJobTitle] = useState(data.operator.jobTitle || "");
  const [phone, setPhone] = useState(data.operator.phone || "");
  const [linkedinUrl, setLinkedinUrl] = useState(data.operator.linkedinUrl || "");
  const [notificationSoundEnabled, setNotificationSoundEnabled] = useState(
    data.operator.notificationSoundEnabled,
  );
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [readiness, setReadiness] = useState<SystemReadiness | null>(null);
  const [checkingReadiness, setCheckingReadiness] = useState(false);
  const [runningRetentionReport, setRunningRetentionReport] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<"general" | "enrichment" | "billing">("general");
  const [apolloSettings, setApolloSettings] = useState<ApolloSettingsSummary | null>(null);
  const [loadingApolloSettings, setLoadingApolloSettings] = useState(false);
  const [apolloSettingsError, setApolloSettingsError] = useState<string | null>(null);
  const [retentionReport, setRetentionReport] = useState<{
    id: string;
    candidates: {
      quarantinedDocuments: number;
      quarantinedAttachments: number;
      originalDocuments: number;
    };
  } | null>(null);

  async function uploadAvatar(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.set("avatar", file);
      const response = await fetch("/api/manage/profile/avatar", {
        method: "POST",
        body: form,
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "The photo could not be uploaded.");
      toast.success("Profile photo updated.");
      onUpdated();
    } catch (error) {
      toast.error(
        "Photo upload failed",
        error instanceof Error ? error.message : "Please try another image.",
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function saveSignature(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingSignature(true);
    try {
      const response = await fetch("/api/manage/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobTitle, phone, linkedinUrl }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Signature details could not be saved.");
      toast.success("Email signature details updated.");
      onUpdated();
    } catch (error) {
      toast.error("Signature details were not saved", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSavingSignature(false);
    }
  }

  async function saveNotificationSound(enabled: boolean) {
    setNotificationSoundEnabled(enabled);
    setSavingNotifications(true);
    try {
      const response = await fetch("/api/manage/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationSoundEnabled: enabled }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Notification settings could not be saved.");
      toast.success(enabled ? "Notification sounds are on." : "Notification sounds are off.");
      onUpdated();
    } catch (error) {
      setNotificationSoundEnabled(!enabled);
      toast.error("Notification settings were not saved", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSavingNotifications(false);
    }
  }

  async function runReadinessCheck() {
    setCheckingReadiness(true);
    try {
      const response = await fetch("/api/manage/system-readiness", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as SystemReadiness & {
        error?: string;
      };
      if (!response.ok)
        throw new Error(payload.error || "The readiness check could not be completed.");
      setReadiness(payload);
      if (payload.overall === "ready") toast.success("Production services are ready.");
      else if (payload.overall === "warning")
        toast.info("Readiness check completed", "Review the services marked for attention.");
      else
        toast.error("Launch blockers found", "Review the blocked services before accepting customer data.");
    } catch (error) {
      toast.error(
        "Readiness check failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setCheckingReadiness(false);
    }
  }

  async function runRetentionReport() {
    setRunningRetentionReport(true);
    try {
      const response = await fetch("/api/manage/retention/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload = (await response.json().catch(() => ({}))) as {
        id?: string;
        candidates?: {
          quarantinedDocuments: number;
          quarantinedAttachments: number;
          originalDocuments: number;
        };
        error?: string;
      };
      if (!response.ok || !payload.id || !payload.candidates)
        throw new Error(payload.error || "The retention report could not be completed.");
      setRetentionReport({ id: payload.id, candidates: payload.candidates });
      toast.success("Retention report completed. No files were deleted.");
      await runReadinessCheck();
    } catch (error) {
      toast.error(
        "Retention report failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setRunningRetentionReport(false);
    }
  }

  async function loadApolloSettings() {
    setLoadingApolloSettings(true);
    setApolloSettingsError(null);
    try {
      const response = await fetch("/api/manage/enrichment/apollo", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as ApolloSettingsSummary & {
        error?: string;
      };
      if (!response.ok)
        throw new Error(payload.error || "Apollo usage could not be loaded.");
      setApolloSettings(payload);
    } catch (error) {
      setApolloSettingsError(
        error instanceof Error ? error.message : "Apollo usage could not be loaded.",
      );
    } finally {
      setLoadingApolloSettings(false);
    }
  }

  const apolloUsagePercent = apolloSettings?.leadCredits?.limit
    ? Math.min(100, Math.round((apolloSettings.leadCredits.used / apolloSettings.leadCredits.limit) * 100))
    : 0;

  const settingsItems: SettingsHubItem<typeof activeSettingsTab>[] = [
    { id: "general", group: "Profile & communication", title: "Profile, email & alerts", description: "Photo, email signature, live notifications, and sending identities.", keywords: ["avatar", "signature", "mailbox", "sound", "email"] },
    ...(data.operator.role === "owner" ? [
      { id: "billing" as const, group: "Business controls", title: "Billing & pricing", description: "Costivra plans and Stripe price catalog.", keywords: ["stripe", "plan", "price", "subscription"] },
      { id: "enrichment" as const, group: "System & providers", title: "Provider health", description: "Apollo usage and production readiness.", keywords: ["apollo", "credits", "retention", "readiness", "integration"] },
    ] : []),
  ];
  const selectSettings = (next: typeof activeSettingsTab) => {
    setActiveSettingsTab(next);
    if (next === "enrichment" && !apolloSettings && !loadingApolloSettings) void loadApolloSettings();
  };

  return (
    <div className="manage-settings-layout">
      <section className="manage-page-heading">
        <div>
          <p>Find the correct Costivra operator or owner control without hunting through tabs.</p>
          <h2>Settings</h2>
        </div>
      </section>
      <SettingsHub ariaLabel="Manage settings" items={settingsItems} value={activeSettingsTab} onValueChange={selectSettings}>
      {activeSettingsTab === "billing" ? (
        <BillingCatalogSettings />
      ) : activeSettingsTab === "general" ? (
        <div
          className="manage-settings-tab-panel"
        >
      <section className="manage-panel manage-settings-profile" aria-labelledby="profile-settings-title">
        <div className="manage-settings-profile-copy">
          <OperatorAvatar operator={data.operator} large />
          <div>
            <h3 id="profile-settings-title">Profile photo</h3>
            <p>Shown in Costivra instead of your initials. JPG, PNG, or WebP; up to 5 MB.</p>
            <strong>{data.operator.fullName}</strong>
            <small>{data.operator.email}</small>
          </div>
        </div>
        <input
          ref={inputRef}
          className="manage-visually-hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void uploadAvatar(file);
          }}
        />
        <button
          type="button"
          className="manage-button manage-button--quiet"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <Camera size={15} /> {uploading ? "Uploading…" : data.operator.avatarUrl ? "Replace photo" : "Upload photo"}
        </button>
      </section>
      <section className="manage-panel manage-settings-signature" aria-labelledby="signature-settings-title">
        <div>
          <h3 id="signature-settings-title">Email signature</h3>
          <p>These details are added to new messages. Leave any field blank to keep it out of your signature.</p>
        </div>
        <form className="manage-settings-signature-form" onSubmit={saveSignature}>
          <label>
            <span>Title</span>
            <input value={jobTitle} maxLength={120} placeholder="e.g. Owner" onChange={(event) => setJobTitle(event.target.value)} />
          </label>
          <label>
            <span>Phone number</span>
            <input value={phone} maxLength={48} inputMode="tel" placeholder="e.g. 469-555-0123" onChange={(event) => setPhone(event.target.value)} />
          </label>
          <label className="wide">
            <span>LinkedIn profile</span>
            <input value={linkedinUrl} maxLength={320} type="url" placeholder="https://www.linkedin.com/in/your-name" onChange={(event) => setLinkedinUrl(event.target.value)} />
          </label>
          <button type="submit" className="manage-button manage-button--primary" disabled={savingSignature}>
            {savingSignature ? "Saving…" : "Save signature"}
          </button>
        </form>
      </section>
      <section className="manage-panel manage-settings-notifications" aria-labelledby="notification-settings-title">
        <div>
          <h3 id="notification-settings-title">Notifications</h3>
          <p>New mail, opens, clicks, and delivery problems appear immediately. Sound is optional and visual alerts always remain on.</p>
        </div>
        <label className="manage-preference-toggle">
          <span>
            <strong>Notification sound</strong>
            <small>A soft chime for new live alerts.</small>
          </span>
          <input
            type="checkbox"
            checked={notificationSoundEnabled}
            disabled={savingNotifications}
            onChange={(event) => void saveNotificationSound(event.target.checked)}
          />
          <i aria-hidden="true" />
        </label>
      </section>
      {data.operator.role === "owner" && (
        <section className="manage-panel manage-settings-readiness" aria-labelledby="system-readiness-title">
          <header>
            <div>
              <span className="manage-settings-kicker">Owner controls</span>
              <h3 id="system-readiness-title">Production readiness</h3>
              <p>Check the live services behind intake, extraction, enrichment, and email. Secret values never leave the server.</p>
            </div>
            <div className="manage-readiness-actions">
              <button
                type="button"
                className="manage-button manage-button--quiet"
                disabled={runningRetentionReport}
                onClick={() => void runRetentionReport()}
              >
                <Clock3 className={runningRetentionReport ? "is-spinning" : undefined} size={15} />
                {runningRetentionReport ? "Reporting…" : "Run retention report"}
              </button>
              <button
                type="button"
                className="manage-button manage-button--quiet"
                disabled={checkingReadiness}
                onClick={() => void runReadinessCheck()}
              >
                <RefreshCw className={checkingReadiness ? "is-spinning" : undefined} size={15} />
                {checkingReadiness ? "Checking…" : readiness ? "Run again" : "Run readiness check"}
              </button>
            </div>
          </header>
          {readiness ? (
            <div className="manage-readiness-results" aria-live="polite">
              <div className={`manage-readiness-summary manage-readiness-summary--${readiness.overall}`}>
                {readiness.overall === "ready" ? (
                  <CheckCircle2 size={18} />
                ) : readiness.overall === "warning" ? (
                  <ShieldAlert size={18} />
                ) : (
                  <CircleAlert size={18} />
                )}
                <div>
                  <strong>
                    {readiness.overall === "ready"
                      ? "Ready for controlled production use"
                      : readiness.overall === "warning"
                        ? "Usable with items to review"
                        : "Launch blockers need attention"}
                  </strong>
                  <small>Checked {new Date(readiness.checkedAt).toLocaleString()}</small>
                </div>
              </div>
              <div className="manage-readiness-grid">
                {readiness.services.map((service) => (
                  <article className={`manage-readiness-service manage-readiness-service--${service.status}`} key={service.id}>
                    <div aria-hidden="true">
                      {service.status === "ready" ? (
                        <CheckCircle2 size={16} />
                      ) : service.status === "warning" ? (
                        <ShieldAlert size={16} />
                      ) : (
                        <CircleAlert size={16} />
                      )}
                    </div>
                    <span>
                      <strong>{service.name}</strong>
                      <small>{service.message}</small>
                    </span>
                    <em>{service.status === "ready" ? "Ready" : service.status === "warning" ? "Review" : "Blocked"}</em>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className="manage-readiness-empty">
              <ShieldAlert size={18} aria-hidden="true" />
              <p>Run this check after changing a production key, domain, webhook, worker, or provider.</p>
            </div>
          )}
          {retentionReport && (
            <div className="manage-retention-report" aria-live="polite">
              <ShieldAlert size={17} aria-hidden="true" />
              <div>
                <strong>Report only · nothing deleted</strong>
                <small>
                  {retentionReport.candidates.quarantinedDocuments} quarantined uploads · {" "}
                  {retentionReport.candidates.quarantinedAttachments} quarantined email attachments · {" "}
                  {retentionReport.candidates.originalDocuments} originals
                </small>
              </div>
            </div>
          )}
        </section>
      )}
      <section id="email-identities" className="manage-settings-section">
        <Mailboxes data={data} query={query} run={run} onAdd={onAdd} embedded />
      </section>
        </div>
      ) : (
        <section
          className="manage-panel manage-settings-enrichment"
          aria-busy={loadingApolloSettings}
        >
          <header className="manage-settings-enrichment-heading">
            <div>
              <span className="manage-settings-kicker">Data providers</span>
              <h3>Enrichment</h3>
              <p>Control the services Costivra uses to fill in company information. Apollo is the first provider available here.</p>
            </div>
          </header>
          <div className="manage-enrichment-provider">
            <div className="manage-enrichment-provider-heading">
              <div className="manage-enrichment-provider-identity">
                <span aria-hidden="true"><BarChart3 size={18} /></span>
                <div>
                  <strong>Apollo</strong>
                  <small>Company search and organization enrichment</small>
                </div>
              </div>
              <div className="manage-enrichment-provider-actions">
                {apolloSettings && (
                  <span className={`manage-enrichment-status manage-enrichment-status--${apolloSettings.connection}`}>
                    <i aria-hidden="true" />
                    {apolloSettings.connection === "connected"
                      ? "Connected"
                      : apolloSettings.connection === "unconfigured"
                        ? "Not configured"
                        : apolloSettings.connection === "needs_access"
                          ? "Access needed"
                          : "Unavailable"}
                  </span>
                )}
                <button
                  type="button"
                  className="manage-button manage-button--quiet"
                  disabled={loadingApolloSettings}
                  onClick={() => void loadApolloSettings()}
                >
                  <RefreshCw className={loadingApolloSettings ? "is-spinning" : undefined} size={14} />
                  {loadingApolloSettings ? "Refreshing…" : "Refresh usage"}
                </button>
              </div>
            </div>

            {loadingApolloSettings && !apolloSettings ? (
              <div className="manage-enrichment-loading" aria-live="polite">
                <span aria-hidden="true" />
                <div><strong>Checking Apollo</strong><small>Loading the current credit balance.</small></div>
              </div>
            ) : apolloSettingsError ? (
              <div className="manage-enrichment-message manage-enrichment-message--error" role="alert">
                <CircleAlert size={17} aria-hidden="true" />
                <div><strong>Usage is unavailable</strong><small>{apolloSettingsError}</small></div>
              </div>
            ) : apolloSettings?.connection === "connected" && apolloSettings.leadCredits ? (
              <div className="manage-enrichment-usage" aria-live="polite">
                <div className="manage-enrichment-credit-summary">
                  <span>Lead credits remaining</span>
                  <strong>{apolloSettings.leadCredits.remaining.toLocaleString()}</strong>
                  <small>
                    {apolloSettings.leadCredits.used.toLocaleString()} used of {apolloSettings.leadCredits.limit.toLocaleString()}
                  </small>
                  <div
                    className="manage-enrichment-progress"
                    role="progressbar"
                    aria-label="Apollo lead credits used"
                    aria-valuemin={0}
                    aria-valuemax={apolloSettings.leadCredits.limit}
                    aria-valuenow={apolloSettings.leadCredits.used}
                  >
                    <span style={{ width: `${apolloUsagePercent}%` }} />
                  </div>
                  <em>{apolloUsagePercent}% used · checked {new Date(apolloSettings.checkedAt).toLocaleString()}</em>
                </div>
                <div className="manage-enrichment-costs">
                  <h4>What Costivra uses</h4>
                  <dl>
                    <div><dt>Company search</dt><dd>1 credit per results page</dd></div>
                    <div><dt>Company enrichment</dt><dd>1 credit per company</dd></div>
                  </dl>
                  <p>An exact website lookup followed by saving the account normally uses 2 credits. A name search can use up to 3.</p>
                </div>
              </div>
            ) : (
              <div className="manage-enrichment-message" aria-live="polite">
                <ShieldAlert size={17} aria-hidden="true" />
                <div>
                  <strong>
                    {apolloSettings?.connection === "unconfigured"
                      ? "Apollo is not configured"
                      : apolloSettings?.connection === "needs_access"
                        ? "The API key needs profile access"
                        : "Apollo usage could not be verified"}
                  </strong>
                  <small>
                    {apolloSettings?.connection === "unconfigured"
                      ? "Add a server-side APOLLO_API_KEY to enable company enrichment."
                      : "The key remains server-only. Check its Apollo scopes, then refresh usage."}
                  </small>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
      </SettingsHub>
    </div>
  );
}

type ManageBillingPlan = {
  key: "starter" | "growth" | "enterprise";
  displayName: string;
  description: string;
  amountCents: number | null;
  annualAmountCents: number | null;
  currency: string;
  interval: "month" | "year" | "custom";
  features: string[];
  stripePriceId: string | null;
  annualStripePriceId: string | null;
  active: boolean;
};

function BillingCatalogSettings() {
  const toast = useToast();
  const [plans, setPlans] = useState<ManageBillingPlan[]>([]);
  const [mode, setMode] = useState<"test" | "live" | "unknown">("unknown");
  const [stripeAccount, setStripeAccount] = useState<{ accountId: string | null; displayName: string | null; reachable: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/manage/billing/catalog", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as { error?: string; mode?: "test" | "live" | "unknown"; stripeAccount?: { accountId: string | null; displayName: string | null; reachable: boolean } | null; plans?: ManageBillingPlan[] };
        if (!response.ok || !payload.plans) throw new Error(payload.error || "Pricing could not be loaded.");
        if (!cancelled) {
          setMode(payload.mode || "unknown");
          setStripeAccount(payload.stripeAccount ?? null);
          setPlans(payload.plans);
        }
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Pricing could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const updatePlan = (key: ManageBillingPlan["key"], field: keyof ManageBillingPlan, value: unknown) => {
    setPlans((current) => current.map((plan) => plan.key === key ? { ...plan, [field]: value } : plan));
  };

  async function save(plan: ManageBillingPlan) {
    setSaving(plan.key);
    setError(null);
    try {
      const response = await fetch("/api/manage/billing/catalog", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...plan, features: plan.features }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string; plans?: ManageBillingPlan[] };
      if (!response.ok || !payload.plans) throw new Error(payload.error || "Pricing could not be saved.");
      setPlans(payload.plans);
      toast.success(`${plan.displayName} pricing updated`, mode === "live" ? "Live Stripe pricing is now active." : "Test Stripe pricing is now active.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Pricing could not be saved.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="manage-panel manage-settings-enrichment">
      <header className="manage-settings-enrichment-heading">
        <div>
          <span className="manage-settings-kicker">Owner controls</span>
          <h3>Billing &amp; pricing</h3>
          <p>Edit the plan copy and amount shown across Costivra. Saving creates a new Stripe Price and archives the previous one.</p>
        </div>
        <span className={`manage-enrichment-status manage-enrichment-status--${mode === "live" ? "connected" : mode === "test" ? "needs_access" : "unconfigured"}`}><i aria-hidden="true" /> Stripe {mode === "unknown" ? "not configured" : `${mode} mode`}</span>
      </header>
      {stripeAccount && <p className="form-note" role="status">Stripe account: <strong>{stripeAccount.displayName || "Unnamed account"}</strong>{stripeAccount.accountId ? ` · ${stripeAccount.accountId}` : ""}{!stripeAccount.reachable ? " · account details unavailable" : ""}</p>}
      {error && <div className="manage-enrichment-message manage-enrichment-message--error" role="alert"><CircleAlert size={17} aria-hidden="true" /><div><strong>Pricing could not be updated</strong><small>{error}</small></div></div>}
      {loading ? <div className="manage-enrichment-loading" aria-live="polite"><span aria-hidden="true" /><div><strong>Loading pricing</strong><small>Reading the current Stripe catalog.</small></div></div> : (
        <div className="manage-billing-catalog-grid">
          {plans.map((plan) => (
            <article className="manage-billing-catalog-card" key={plan.key}>
              <div className="manage-enrichment-provider-heading"><div><strong>{plan.displayName}</strong><small>{plan.stripePriceId ? `Monthly Price ${plan.stripePriceId}` : "No monthly Stripe Price yet"}{plan.annualStripePriceId ? ` · Annual Price ${plan.annualStripePriceId}` : ""}</small></div><label className="manage-preference-toggle"><span className="manage-visually-hidden">Plan active</span><input type="checkbox" checked={plan.active} onChange={(event) => updatePlan(plan.key, "active", event.target.checked)} /><i aria-hidden="true" /></label></div>
              <label><span>Plan name</span><input value={plan.displayName} maxLength={80} onChange={(event) => updatePlan(plan.key, "displayName", event.target.value)} /></label>
              <label><span>Description</span><textarea value={plan.description} maxLength={320} rows={2} onChange={(event) => updatePlan(plan.key, "description", event.target.value)} /></label>
              {plan.key !== "enterprise" ? <div className="manage-billing-catalog-row"><label><span>Monthly amount (USD)</span><input type="number" min="1" step="1" value={plan.amountCents == null ? "" : plan.amountCents / 100} onChange={(event) => updatePlan(plan.key, "amountCents", Math.round(Number(event.target.value) * 100))} /></label><label><span>Annual amount (USD)</span><input type="number" min="1" step="1" value={plan.annualAmountCents == null ? "" : plan.annualAmountCents / 100} onChange={(event) => updatePlan(plan.key, "annualAmountCents", Math.round(Number(event.target.value) * 100))} /></label></div> : <p className="manage-billing-catalog-custom">Enterprise remains custom-priced and assisted sales.</p>}
              <label><span>Included features (one per line)</span><textarea value={plan.features.join("\n")} rows={4} onChange={(event) => updatePlan(plan.key, "features", event.target.value.split("\n").map((item) => item.trim()).filter(Boolean))} /></label>
              <button type="button" className="manage-button manage-button--primary" disabled={saving !== null} onClick={() => void save(plan)}>{saving === plan.key ? "Saving Stripe price…" : "Save pricing"}</button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function Mailboxes({
  data,
  query,
  run,
  onAdd,
  embedded = false,
}: {
  data: ManageData;
  query: string;
  run: (work: () => Promise<unknown>, success: string) => Promise<void>;
  onAdd: () => void;
  embedded?: boolean;
}) {
  const mailboxes = data.mail.mailboxes.filter((mailbox) =>
    `${mailbox.displayName} ${mailbox.address} ${mailbox.mailboxType} ${mailbox.assignedToName || ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <section className={embedded ? "manage-settings-section-heading" : "manage-page-heading"}>
        <div>
          <p>Manage the addresses Costivra sends and receives through Resend.</p>
          <div className="manage-mailbox-heading-row">
            <h2>Email identities</h2>
            <span>
              {mailboxes.length} mailbox{mailboxes.length === 1 ? "" : "es"}
            </span>
            {data.operator.role === "owner" && (
              <button
                className="manage-button manage-button--primary"
                onClick={onAdd}
              >
                <Plus size={15} /> New mailbox
              </button>
            )}
          </div>
        </div>
      </section>
      <section className="manage-panel manage-mailbox-panel">
        {mailboxes.length ? (
          <>
            <div className="manage-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Mailbox</th>
                    <th>Seat type</th>
                    <th>Delivery</th>
                    <th>Status</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {mailboxes.map((mailbox) => (
                    <MailboxRow
                      mailbox={mailbox}
                      owner={data.operator.role === "owner"}
                      run={run}
                      key={mailbox.id}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="manage-mailbox-cards">
              {mailboxes.map((mailbox) => (
                <MailboxCard
                  mailbox={mailbox}
                  owner={data.operator.role === "owner"}
                  run={run}
                  key={mailbox.id}
                />
              ))}
            </div>
          </>
        ) : (
          <Empty
            icon={AtSign}
            title="No mailbox seats"
            copy="Create an approved Costivra address. No placeholder seats are added automatically."
            action={
              data.operator.role === "owner" ? (
                <button
                  className="manage-button manage-button--primary"
                  onClick={onAdd}
                >
                  <Plus size={15} /> New mailbox
                </button>
              ) : undefined
            }
          />
        )}
      </section>
      <p className="manage-mailbox-footnote">
        Email identities work inside Costivra through Resend. They do not create an
        IMAP, Gmail, or Outlook account.
      </p>
    </>
  );
}

function MailboxCard({
  mailbox,
  owner,
  run,
}: {
  mailbox: ManageMailbox;
  owner: boolean;
  run: (work: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const nextOperation = mailbox.status === "active" ? "disable" : "enable";
  return (
    <article>
      <header>
        <div className="manage-mailbox-identity">
          <span className="manage-person-avatar">
            {initials(mailbox.displayName)}
          </span>
          <div>
            <strong>{mailbox.displayName}</strong>
            <small>{mailbox.address}</small>
          </div>
        </div>
        <Status value={mailbox.status} />
      </header>
      <dl>
        <div>
          <dt>Seat type</dt>
          <dd>{pretty(mailbox.mailboxType)}</dd>
        </div>
        <div>
          <dt>Delivery</dt>
          <dd>
            {mailbox.canSend ? "Send" : "No send"} ·{" "}
            {mailbox.canReceive ? "Receive" : "No receive"}
          </dd>
        </div>
      </dl>
      <footer>
        <span>{mailbox.isDefault ? "Default owner inbox" : "Managed seat"}</span>
        {owner && (
          <button
            className="manage-button manage-button--quiet"
            disabled={mailbox.isDefault && nextOperation === "disable"}
            onClick={() =>
              void run(
                () =>
                  api(`/api/manage/mailboxes/${mailbox.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ operation: nextOperation }),
                  }),
                `Mailbox ${nextOperation === "enable" ? "enabled" : "disabled"}.`,
              )
            }
          >
            {nextOperation === "enable" ? "Enable" : "Disable"}
          </button>
        )}
      </footer>
    </article>
  );
}

function MailboxRow({
  mailbox,
  owner,
  run,
}: {
  mailbox: ManageMailbox;
  owner: boolean;
  run: (work: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const nextOperation = mailbox.status === "active" ? "disable" : "enable";
  return (
    <tr>
      <td>
        <div className="manage-mailbox-identity">
          <span className="manage-person-avatar">
            {initials(mailbox.displayName)}
          </span>
          <div>
            <strong>{mailbox.displayName}</strong>
            <small>{mailbox.address}</small>
          </div>
        </div>
      </td>
      <td>
        <strong>{pretty(mailbox.mailboxType)}</strong>
        <small>{mailbox.assignedToName || "Owner administered"}</small>
      </td>
      <td>
        <div className="manage-mailbox-capabilities">
          <span className={mailbox.canSend ? "ready" : ""}>
            <i /> Send
          </span>
          <span className={mailbox.canReceive ? "ready" : ""}>
            <i /> Receive
          </span>
        </div>
      </td>
      <td>
        <Status value={mailbox.status} />
        {mailbox.isDefault && <small>Default owner inbox</small>}
      </td>
      <td className="manage-mailbox-action">
        {owner && (
          <button
            className="manage-button manage-button--quiet"
            disabled={mailbox.isDefault && nextOperation === "disable"}
            title={
              mailbox.isDefault
                ? "The default owner inbox stays active"
                : undefined
            }
            onClick={() =>
              void run(
                () =>
                  api(`/api/manage/mailboxes/${mailbox.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ operation: nextOperation }),
                  }),
                `Mailbox ${nextOperation === "enable" ? "enabled" : "disabled"}.`,
              )
            }
          >
            {nextOperation === "enable" ? "Enable" : "Disable"}
          </button>
        )}
      </td>
    </tr>
  );
}

function ThreadMessage({
  message,
  senderName,
  initiallyOpen,
  onReply,
}: {
  message: ManageData["mail"]["messages"][number];
  senderName: string;
  initiallyOpen: boolean;
  onReply: () => void;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const [blockExternalImages, setBlockExternalImages] = useState(true);
  const [openingAttachment, setOpeningAttachment] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<{ id: string; filename: string; contentType: string } | null>(null);
  const router = useRouter();
  const timestamp = message.sentAt || message.receivedAt || message.createdAt;
  const emailDocument = useMemo(
    () =>
      buildEmailViewerDocument({
        htmlBody: message.htmlBody,
        textBody: message.textBody,
        blockExternalImages,
      }),
    [blockExternalImages, message.htmlBody, message.textBody],
  );
  async function openAttachment(attachment: NonNullable<typeof message.attachments[number]>) {
    if (!attachment.id || openingAttachment) return;
    setOpeningAttachment(attachment.id);
    try {
      const response = await fetch(`/api/manage/mail/attachments/${attachment.id}`, { method: "POST" });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "The security scan did not complete.");
      setPreviewAttachment({ id: attachment.id, filename: attachment.filename, contentType: attachment.contentType || "application/octet-stream" });
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "The attachment could not be opened.");
    } finally {
      setOpeningAttachment(null);
    }
  }

  return (
    <article className={`manage-message${open ? " is-open" : ""}`}>
      <button
        className="manage-message-summary"
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={`message-${message.id}`}
      >
        <span className="manage-person-avatar">
          {initials(senderName || message.fromAddress)}
        </span>
        <span className="manage-message-addresses">
          <strong>{senderName}</strong>
          <small>
            {message.fromAddress} → {message.toAddresses.join(", ")}
          </small>
          {!open && (
            <span>{message.textBody || "No plain-text body was available."}</span>
          )}
        </span>
        <time>{date(timestamp, true)}</time>
        <ChevronDown className="manage-message-chevron" size={16} />
      </button>
      <div
        className="manage-message-collapse"
        id={`message-${message.id}`}
        aria-hidden={!open}
      >
        <div className="manage-message-content">
          <div className="manage-message-viewer-tools">
            <span>{message.htmlBody ? "HTML email" : "Plain-text email"}</span>
            {message.htmlBody && (
              <button
                type="button"
                onClick={() => setBlockExternalImages((value) => !value)}
                aria-pressed={!blockExternalImages}
              >
                {blockExternalImages ? "Load remote images" : "Block remote images"}
              </button>
            )}
          </div>
          <iframe
            className="manage-message-viewer"
            srcDoc={emailDocument}
            title={`Email: ${message.subject || "No subject"}`}
            sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
            referrerPolicy="no-referrer"
          />
          {message.attachments.length > 0 && (
            <div className="manage-attachments">
              {message.attachments.map((attachment) => {
                const ready = attachment.id && attachment.status === "clean";
                const content = <><Paperclip size={14} /> <span>{attachment.filename}</span>{attachment.status && attachment.status !== "clean" && <small>{attachment.status === "infected" ? "Blocked" : "Scanning"}</small>}</>;
                return attachment.id
                  ? <button className={`manage-attachment-button${ready ? " is-clean" : ""}${openingAttachment === attachment.id ? " is-scanning" : ""}`} type="button" onClick={() => void openAttachment(attachment)} disabled={Boolean(openingAttachment)} key={attachment.id}>{openingAttachment === attachment.id ? <LoaderCircle className="manage-attachment-spinner" size={14} /> : ready ? <ShieldCheck size={14} /> : <Paperclip size={14} />} <span>{openingAttachment === attachment.id ? "Scanning securely…" : content}</span>{ready && <small>Safe</small>}</button>
                  : <span className="is-unavailable" title="This attachment is unavailable." key={attachment.filename}>{content}</span>;
              })}
            </div>
          )}
          <button
            className="manage-message-reply"
            type="button"
            onClick={onReply}
          >
            <Reply size={15} /> Reply to this email
          </button>
        </div>
      </div>
      {previewAttachment && <div className="manage-file-preview-backdrop" role="presentation" onClick={() => setPreviewAttachment(null)}><section className="manage-file-preview" role="dialog" aria-modal="true" aria-label={`${previewAttachment.filename} preview`} onClick={(event) => event.stopPropagation()}><header><div><strong>{previewAttachment.filename}</strong><span><ShieldCheck size={13} /> Security scan passed</span></div><button type="button" onClick={() => setPreviewAttachment(null)} aria-label="Close file preview"><X size={17} /></button></header><iframe src={`/api/manage/mail/attachments/${previewAttachment.id}`} title={previewAttachment.filename} /></section></div>}
    </article>
  );
}

function MailPage({
  data,
  query,
  run,
  onCompose,
}: {
  data: ManageData;
  query: string;
  run: (work: () => Promise<unknown>, success: string) => Promise<void>;
  onCompose: (context: ComposeContext) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sequenceView = searchParams.get("view") === "sequence";
  const current = data.mail.selectedThread;
  const activeMailboxes = data.mail.mailboxes.filter(
    (mailbox) => mailbox.status === "active",
  );
  const mailboxQuery = data.mail.selectedMailboxId
    ? `&mailbox=${data.mail.selectedMailboxId}`
    : "";
  const threads = data.mail.threads.filter((thread) =>
    `${thread.subject} ${thread.contactName} ${thread.organizationName} ${thread.snippet}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const folders = [
    ["inbox", "Inbox"],
    ["starred", "Starred"],
    ["sent", "Sent"],
    ["drafts", "Drafts"],
    ["scheduled", "Scheduled"],
    ["archive", "Archive"],
    ["trash", "Trash"],
  ] as const;
  const act = (operation: string) =>
    current
      ? run(
          () =>
            api(`/api/manage/mail/threads/${current.id}`, {
              method: "PATCH",
              body: JSON.stringify({ operation }),
            }),
          `Conversation ${operation === "read" ? "marked read" : operation + "d"}.`,
        )
      : Promise.resolve();
  const replyToMessage = (message: ManageData["mail"]["messages"][number]) => {
    if (!current) return;
    onCompose({
      mode: "reply",
      organizationId: current.organizationId || undefined,
      to:
        message.direction === "inbound"
          ? message.fromAddress
          : current.contactEmail || current.participants[0],
      subject: current.subject.toLowerCase().startsWith("re:")
        ? current.subject
        : `Re: ${current.subject}`,
      threadId: current.id,
      mailboxId: current.mailboxId || undefined,
    });
  };
  const latestMessage = data.mail.messages.at(-1) ?? null;
  const mailThreadDecision = current
    ? getMailThreadDecision(current, data.mail.messages)
    : null;
  const mailThreadActions = mailThreadDecision?.recommendsReply && latestMessage ? (
    <button type="button" className="button button-primary" onClick={() => replyToMessage(latestMessage)}>
      <Reply size={15} /> Reply to latest email
    </button>
  ) : undefined;
  return (
    <div className="manage-mail-page">
      <div className="manage-mail-tabs">
        <label className="manage-mailbox-switch">
          <span>Mailbox</span>
          <CostivraSelect
            aria-label="Current mailbox"
            value={data.mail.selectedMailboxId || ""}
            onChange={(val) =>
              router.push(
                `/manage/mail?view=${sequenceView ? "sequence" : "all"}&folder=${data.mail.folder}&mailbox=${val}`,
              )
            }
            size="sm"
            options={
              !activeMailboxes.length
                ? [{ value: "", label: "No active mailbox" }]
                : activeMailboxes.map((mailbox) => ({
                    value: mailbox.id,
                    label: mailbox.address,
                  }))
            }
          />
        </label>
        <nav className="manage-mail-view-tabs" aria-label="Mail views">
          <Link className={!sequenceView ? "active" : ""} href={`/manage/mail?view=all&folder=${data.mail.folder}${mailboxQuery}`}>All mail</Link>
          <Link className={sequenceView ? "active" : ""} href={`/manage/mail?view=sequence${mailboxQuery}`}>Queue & activity</Link>
        </nav>
        <nav className="manage-mail-folder-tabs" aria-label="Mailbox folders">
          {folders.map(([key, label]) => (
            <Link
              className={data.mail.folder === key ? "active" : ""}
              href={`/manage/mail?folder=${key}${mailboxQuery}`}
              key={key}
            >
              {label}
              {data.mail.folderCounts[key] > 0 && (
                <span>{data.mail.folderCounts[key]}</span>
              )}
            </Link>
          ))}
        </nav>
        <button
          className="manage-button manage-button--primary manage-mail-compose-trigger"
          onClick={() => onCompose({ mode: "new" })}
          disabled={!activeMailboxes.some((mailbox) => mailbox.canSend)}
        >
          Compose
        </button>
      </div>
      {sequenceView ? <SequenceMailView selectedMailboxId={data.mail.selectedMailboxId} query={query} /> : <div className={`manage-mail-shell${current ? " has-thread" : ""}`}>
      <section className="manage-mail-list">
        <header>
          <div>
            <h2>{pretty(data.mail.folder)}</h2>
            <span>
              {threads.length} conversation{threads.length === 1 ? "" : "s"}
            </span>
          </div>
          <button aria-label="Refresh" onClick={() => router.refresh()}>
            <RefreshCw size={16} />
          </button>
        </header>
        <div>
          {threads.map((thread) => (
            <MailThreadRow
              thread={thread}
              active={current?.id === thread.id}
              folder={data.mail.folder}
              key={thread.id}
            />
          ))}
          {!threads.length && (
            <Empty
              icon={MailOpen}
              title={`No ${data.mail.folder}`}
              copy="This mailbox uses only Resend events and emails you send from Costivra. Nothing is filled with demo messages."
            />
          )}
        </div>
      </section>
      <section className="manage-mail-reader">
        {current ? (
          <>
            <header className="manage-reader-tools">
              <div>
                <Link
                  href={`/manage/mail?folder=${data.mail.folder}${mailboxQuery}`}
                  aria-label="Back to message list"
                >
                  <ArrowLeft size={17} />
                </Link>
                <button
                  onClick={() => void act("archive")}
                  aria-label="Archive"
                >
                  <Archive size={17} />
                </button>
                <button
                  onClick={() => void act("trash")}
                  aria-label="Move to trash"
                >
                  <Trash2 size={17} />
                </button>
                <button
                  onClick={() =>
                    void act(current.unreadCount ? "read" : "unread")
                  }
                  aria-label="Change read state"
                >
                  {current.unreadCount ? (
                    <MailOpen size={17} />
                  ) : (
                    <Mail size={17} />
                  )}
                </button>
              </div>
              <button
                onClick={() => void act(current.isStarred ? "unstar" : "star")}
                aria-label="Star conversation"
              >
                <Star
                  size={18}
                  fill={current.isStarred ? "currentColor" : "none"}
                />
              </button>
            </header>
            <div className="manage-reader-heading">
              <div>
                <span className="manage-person-avatar">
                  {initials(
                    current.contactName || current.participants[0] || "?",
                  )}
                </span>
                <div>
                  <h2>{current.subject}</h2>
                  <p>
                    {current.contactName ||
                      current.participants[0] ||
                      "Unknown sender"}
                    {current.organizationName && (
                      <>
                        {" "}
                        · <strong>{current.organizationName}</strong>
                      </>
                    )}
                  </p>
                </div>
              </div>
              <Status value={current.latestStatus} />
            </div>
            {mailThreadDecision ? (
              <WorkspaceDecisionSummary
                ariaLabel="Conversation next step"
                className="manage-mail-thread-decision"
                eyebrow="Conversation context"
                description={mailThreadDecision.description}
                facts={mailThreadDecision.facts}
                heading={mailThreadDecision.heading}
                actions={mailThreadActions}
              />
            ) : null}
            <div className="manage-message-stack">
              {data.mail.messages.map((message, index) => (
                <ThreadMessage
                  key={message.id}
                  message={message}
                  senderName={
                    message.direction === "outbound"
                      ? data.operator.fullName
                      : current.contactName || message.fromAddress
                  }
                  initiallyOpen={index === data.mail.messages.length - 1}
                  onReply={() => replyToMessage(message)}
                />
              ))}
            </div>
            <footer className="manage-reader-reply">
              <button
                className="manage-button manage-button--quiet"
                onClick={() => {
                  const latest = data.mail.messages.at(-1);
                  onCompose({
                    mode: "reply",
                    organizationId: current.organizationId || undefined,
                    to:
                      current.contactEmail ||
                      (latest?.direction === "inbound"
                        ? latest.fromAddress
                        : latest?.toAddresses[0]),
                    subject: current.subject.toLowerCase().startsWith("re:")
                      ? current.subject
                      : `Re: ${current.subject}`,
                    threadId: current.id,
                    mailboxId: current.mailboxId || undefined,
                  });
                }}
              >
                <Reply size={16} /> Reply
              </button>
              <button
                className="manage-button manage-button--quiet"
                onClick={() => {
                  const latest = data.mail.messages.at(-1);
                  onCompose({
                    mode: "forward",
                    organizationId: current.organizationId || undefined,
                    subject: current.subject.toLowerCase().startsWith("fwd:")
                      ? current.subject
                      : `Fwd: ${current.subject}`,
                    body: latest
                      ? `\n\n---------- Forwarded message ----------\nFrom: ${latest.fromAddress}\nDate: ${date(latest.sentAt || latest.receivedAt || latest.createdAt, true)}\nSubject: ${latest.subject}\n\n${latest.textBody || ""}`
                      : "",
                    mailboxId: current.mailboxId || undefined,
                  });
                }}
              >
                <Send size={16} /> Forward
              </button>
            </footer>
          </>
        ) : (
          <Empty
            icon={MailOpen}
            title="Choose a conversation"
            copy="Select a real inbound or outbound thread to read it here."
          />
        )}
      </section>
      <aside className="manage-mail-contact">
        {current ? (
          <>
            <div className="manage-mail-contact-head">
              <span className="manage-person-avatar large">
                {initials(
                  current.contactName || current.organizationName || "?",
                )}
              </span>
              <h3>{current.contactName || "Unlinked sender"}</h3>
              <p>{current.contactEmail || current.participants[0]}</p>
              {current.organizationName ? (
                <Status value="active" />
              ) : (
                <span className="manage-warning">
                  <CircleAlert size={14} /> Link before replying
                </span>
              )}
            </div>
            <dl>
              <div>
                <dt>Account</dt>
                <dd>{current.organizationName || "Not linked"}</dd>
              </div>
              <div>
                <dt>Last message</dt>
                <dd>{date(current.lastMessageAt, true)}</dd>
              </div>
              <div>
                <dt>Thread status</dt>
                <dd>{pretty(current.status)}</dd>
              </div>
            </dl>
            {current.organizationId && (
              <Link
                className="manage-button manage-button--quiet manage-full"
                href={`/manage/accounts/${current.organizationId}`}
              >
                View account
              </Link>
            )}
          </>
        ) : (
          <p className="manage-contact-placeholder">
            Client context appears here when you open a conversation.
          </p>
        )}
      </aside>
      </div>}
    </div>
  );
}

function MailThreadRow({
  thread,
  active,
  folder,
}: {
  thread: ManageMailThread;
  active: boolean;
  folder: string;
}) {
  return (
    <Link
      href={`/manage/mail/${thread.id}?folder=${folder}${thread.mailboxId ? `&mailbox=${thread.mailboxId}` : ""}`}
      className={`manage-thread${active ? " active" : ""}${thread.unreadCount ? " unread" : ""}`}
    >
      <span className="manage-thread-star" aria-hidden="true">
        <Star size={15} fill={thread.isStarred ? "currentColor" : "none"} />
      </span>
      <span className="manage-person-avatar">
        {initials(
          thread.contactName ||
            thread.organizationName ||
            thread.participants[0] ||
            "?",
        )}
      </span>
      <div>
        <header>
          <strong>
            {thread.contactName ||
              thread.organizationName ||
              thread.participants[0] ||
              "Unknown sender"}
          </strong>
          <time>{date(thread.lastMessageAt)}</time>
        </header>
        <h3>{thread.subject}</h3>
        <p>{thread.snippet || "No message preview"}</p>
        <footer>
          {thread.organizationName && <span>{thread.organizationName}</span>}
          {thread.latestStatus && <small>{pretty(thread.latestStatus)}</small>}
        </footer>
      </div>
    </Link>
  );
}

function ActivityPage({
  data,
  query,
  onNote,
}: {
  data: ManageData;
  query: string;
  onNote: () => void;
}) {
  const [kindFilter, setKindFilter] = useState<string>("all");

  const rows = data.activities.filter((item) => {
    const matchesKind =
      kindFilter === "all"
        ? true
        : kindFilter === "notes"
        ? item.kind === "note"
        : kindFilter === "calls"
        ? ["call", "meeting"].includes(item.kind)
        : ["account_created", "status_change", "inquiry_received"].includes(item.kind);
    const matchesQuery = `${item.subject} ${item.summary || ""} ${item.organizationName}`
      .toLowerCase()
      .includes(query.toLowerCase());
    return matchesKind && matchesQuery;
  });

  const exportActivityCsv = () => {
    const exportRows = rows.map((a) => ({
      ID: a.id,
      Organization: a.organizationName,
      Kind: a.kind,
      Direction: a.direction ?? "",
      Subject: a.subject,
      Summary: a.summary ?? "",
      OccurredAt: a.occurredAt,
    }));
    downloadCsv(`costivra-activity-${new Date().toISOString().slice(0, 10)}.csv`, exportRows);
  };

  return (
    <>
      <section className="manage-page-heading">
        <div>
          <h2>Activity</h2>
          <p>An internal timeline of client touches and CRM changes.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            className="manage-button manage-button--quiet"
            onClick={exportActivityCsv}
            title="Export activity log to CSV"
          >
            <Download size={15} /> Export CSV
          </button>
          <button
            className="manage-button manage-button--primary"
            onClick={onNote}
          >
            <Plus size={16} /> Add note
          </button>
        </div>
      </section>
      <section className="manage-panel manage-activity-page">
        <div className="manage-tabs">
          <button
            className={kindFilter === "all" ? "active" : ""}
            onClick={() => setKindFilter("all")}
          >
            All Activity <span>{data.activities.length}</span>
          </button>
          <button
            className={kindFilter === "notes" ? "active" : ""}
            onClick={() => setKindFilter("notes")}
          >
            Internal Notes{" "}
            <span>{data.activities.filter((a) => a.kind === "note").length}</span>
          </button>
          <button
            className={kindFilter === "calls" ? "active" : ""}
            onClick={() => setKindFilter("calls")}
          >
            Calls & Meetings{" "}
            <span>
              {
                data.activities.filter((a) =>
                  ["call", "meeting"].includes(a.kind),
                ).length
              }
            </span>
          </button>
          <button
            className={kindFilter === "events" ? "active" : ""}
            onClick={() => setKindFilter("events")}
          >
            Account Events{" "}
            <span>
              {
                data.activities.filter((a) =>
                  ["account_created", "status_change", "inquiry_received"].includes(
                    a.kind,
                  ),
                ).length
              }
            </span>
          </button>
        </div>
        <ActivityList activities={rows} />
        {!rows.length && (
          <Empty
            icon={Activity}
            title="No matching activity"
            copy={
              data.activities.length
                ? "Clear the search or choose another filter to see full history."
                : "Notes, tasks, and mail events will build the audit-friendly timeline."
            }
          />
        )}
      </section>
    </>
  );
}

function TaskList({ tasks }: { tasks: ManageData["tasks"] }) {
  return (
    <div className="manage-compact-list">
      {tasks.map((task) => (
        <Link
          key={task.id}
          href={taskHref(task)}
          className="manage-compact-record-row manage-follow-up-row"
          aria-label={`Open ${task.title} for ${task.organizationName}`}
        >
          <span
            className={`manage-task-icon manage-task-icon--${task.priority}`}
          >
            <TaskIcon taskType={task.taskType} />
          </span>
          <div>
            <strong>{task.title}</strong>
            <p>{task.organizationName}</p>
            {sequenceTaskOriginLabel(task) && <small className="manage-task-origin">{sequenceTaskOriginLabel(task)}</small>}
          </div>
          <time>{date(task.dueAt)}</time>
        </Link>
      ))}
    </div>
  );
}

function taskHref(task: ManageData["tasks"][number]) {
  return task.contactId
    ? `/manage/contacts/${task.contactId}?tab=work`
    : `/manage/accounts/${task.organizationId}?tab=work`;
}

function TaskIcon({ taskType }: { taskType: string }) {
  if (taskType === "email") return <Mail size={16} aria-hidden="true" />;
  if (taskType === "call") return <Phone size={16} aria-hidden="true" />;
  if (taskType === "meeting") return <CalendarClock size={16} aria-hidden="true" />;
  if (taskType === "review") return <FileCheck2 size={16} aria-hidden="true" />;
  return <CalendarClock size={16} aria-hidden="true" />;
}

function ActivityList({
  activities,
}: {
  activities: ManageData["activities"];
}) {
  return (
    <div className="manage-activity-list">
      {activities.map((item) => (
        <Link
          key={item.id}
          id={`activity-${item.id}`}
          href={activityHref(item)}
          className={`manage-activity-row manage-activity-row--${activityTone(item.kind)}`}
          aria-label={`Open ${item.subject} for ${item.organizationName}`}
        >
          <span className="manage-activity-icon">
            <ActivityIcon kind={item.kind} />
          </span>
          <div>
            <strong>{item.subject}</strong>
            <p>{item.summary || pretty(item.kind)}</p>
            <small>{item.organizationName}</small>
          </div>
          <time>{date(item.occurredAt, true)}</time>
        </Link>
      ))}
    </div>
  );
}

function activityHref(activity: ManageData["activities"][number]) {
  return activity.contactId
    ? `/manage/contacts/${activity.contactId}?tab=activity`
    : `/manage/accounts/${activity.organizationId}?tab=activity`;
}

function ActivityIcon({ kind }: { kind: string }) {
  if (kind === "note") return <FileText size={15} aria-hidden="true" />;
  if (kind === "call") return <Phone size={15} aria-hidden="true" />;
  if (kind === "meeting") return <CalendarClock size={15} aria-hidden="true" />;
  if (["email", "email_inbound", "email_outbound"].includes(kind)) {
    return <Mail size={15} aria-hidden="true" />;
  }
  if (kind === "account_created") return <Building2 size={15} aria-hidden="true" />;
  if (kind === "status_change") return <RefreshCw size={15} aria-hidden="true" />;
  if (kind === "inquiry_received") return <Inbox size={15} aria-hidden="true" />;
  if (kind === "task_created" || kind === "task_completed") {
    return <CheckCircle2 size={15} aria-hidden="true" />;
  }
  return <Activity size={15} aria-hidden="true" />;
}

function activityTone(kind: string) {
  if (kind === "note") return "note";
  if (["call", "meeting", "email", "email_inbound", "email_outbound"].includes(kind)) {
    return "outreach";
  }
  if (["account_created", "status_change"].includes(kind)) return "account";
  if (kind === "inquiry_received") return "inquiry";
  return "default";
}

function ApolloCompanyLogo({ src, iconSize }: { src: string | null; iconSize: number }) {
  if (!src) return <Building2 size={iconSize} aria-hidden="true" />;
  // Search candidates can use several provider CDN hosts. The adapter has
  // already restricted this to a public http(s) URL, so a direct preview is
  // intentional instead of expanding Next Image's permanent host allowlist.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" />;
}

function AccountForm({
  busy,
  onClose,
  isClosing,
  onSubmit,
}: {
  busy: boolean;
  onClose: () => void;
  isClosing?: boolean;
  onSubmit: (form: FormData) => void;
}) {
  const [lookup, setLookup] = useState("");
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [results, setResults] = useState<ManageApolloSearchResult[]>([]);
  const [selected, setSelected] = useState<ManageApolloSearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchRequest, setSearchRequest] = useState<{ query: string; id: number } | null>(null);

  useEffect(() => {
    const query = searchRequest?.query ?? "";
    if (selected || query.length < 3) return;
    const controller = new AbortController();
    void (async () => {
      setSearching(true);
      setSearchError("");
      try {
        const response = await fetch(`/api/manage/accounts/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => ({}))) as {
          results?: ManageApolloSearchResult[];
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error || "Company search is unavailable.");
        const nextResults = payload.results ?? [];
        setResults(nextResults);
        const exactWebsiteMatch = nextResults.find((result) => result.exact) ?? null;
        if (exactWebsiteMatch && looksLikeCompanyWebsite(query)) {
          setSelected(exactWebsiteMatch);
          setLookup(exactWebsiteMatch.name);
          setName(exactWebsiteMatch.name);
          setWebsite(exactWebsiteMatch.website ?? "");
          setIndustry(exactWebsiteMatch.industry ?? "");
          setResults([]);
          setSearchRequest(null);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setResults([]);
          setSearchError(error instanceof Error ? error.message : "Company search is unavailable.");
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    })();
    return () => {
      controller.abort();
    };
  }, [searchRequest, selected]);

  function submitCompanyLookup() {
    const query = lookup.trim();
    if (query.length < 3 || searching) return;
    setSelected(null);
    setResults([]);
    setSearchError("");
    setSearchRequest((current) => ({ query, id: (current?.id ?? 0) + 1 }));
  }

  function applyCompany(result: ManageApolloSearchResult) {
    setSelected(result);
    setLookup(result.name);
    setName(result.name);
    setWebsite(result.website ?? "");
    setIndustry(result.industry ?? "");
    setResults([]);
    setSearchRequest(null);
  }

  async function chooseCompany(result: ManageApolloSearchResult) {
    if (!result.detailsLoaded && result.website) {
      setSearching(true);
      setSearchError("");
      try {
        const response = await fetch(`/api/manage/accounts/search?q=${encodeURIComponent(result.website)}`, {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => ({}))) as {
          results?: ManageApolloSearchResult[];
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error || "Company details are unavailable.");
        const detailed = payload.results?.find((candidate) => candidate.exact) ?? payload.results?.[0];
        if (detailed) {
          applyCompany(detailed);
          return;
        }
      } catch (error) {
        setSearchError(error instanceof Error ? error.message : "Company details are unavailable.");
      } finally {
        setSearching(false);
      }
    }
    applyCompany(result);
  }

  return (
    <SidePanel
      title="Add a real account"
      copy="This creates a live Supabase organization. It does not create a customer login or send an invitation."
      onClose={onClose}
      isClosing={isClosing}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(new FormData(event.currentTarget));
        }}
      >
        <div className="manage-form-grid">
          <label className="wide manage-account-company-lookup">
            <span>Find company by name or website</span>
            <div className="manage-account-company-lookup__input">
              <Search size={16} aria-hidden="true" />
              <input
                value={lookup}
                onChange={(event) => {
                  setLookup(event.target.value);
                  setSelected(null);
                  setResults([]);
                  setSearchError("");
                  setSearchRequest(null);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  submitCompanyLookup();
                }}
                placeholder="Start typing a company name or https://company.com"
                aria-label="Find company by name or website"
                autoFocus
              />
              {searching ? (
                <RefreshCw size={14} className="spin" aria-label="Searching" />
              ) : (
                <kbd aria-hidden="true">Enter</kbd>
              )}
            </div>
            {selected ? (
              <span className="manage-account-company-lookup__selected">
                <CheckCircle2 size={14} /> Company details loaded. They will be verified again when you save.
              </span>
            ) : searching ? (
              <span className="manage-account-company-lookup__hint"><RefreshCw size={13} className="spin" /> Looking up company details…</span>
            ) : results.length ? (
              <div className="manage-account-company-results" role="listbox" aria-label="Company search results">
                {results.map((result) => (
                  <button type="button" role="option" aria-selected="false" key={result.providerOrganizationId} onClick={() => chooseCompany(result)}>
                    <span className="manage-account-company-results__identity">
                      <ApolloCompanyLogo src={result.logoUrl} iconSize={16} />
                      <span><strong>{result.name}</strong><small>{result.website?.replace(/^https?:\/\//, "") || result.location || "Company profile"}</small></span>
                    </span>
                    {result.exact && <em>Exact match</em>}
                  </button>
                ))}
              </div>
            ) : searchError ? (
              <span className="manage-account-company-lookup__error"><CircleAlert size={14} /> {searchError}</span>
            ) : searchRequest?.query === lookup.trim() ? (
              <span className="manage-account-company-lookup__hint">No company matches yet. You can still add the account manually.</span>
            ) : queryReady(lookup) ? (
              <span className="manage-account-company-lookup__hint">Press Enter to search Apollo. Typing alone does not use credits.</span>
            ) : (
              <span className="manage-account-company-lookup__hint">Enter at least three characters, then press Enter to search Apollo.</span>
            )}
          </label>
          {selected && (
            <div className="wide manage-account-company-preview" aria-label="Company details ready to add">
              <div className="manage-account-company-preview__identity">
                <ApolloCompanyLogo src={selected.logoUrl} iconSize={20} />
                <span>
                  <strong>{selected.name}</strong>
                  <small>{selected.shortDescription || selected.industry || "Apollo company profile"}</small>
                </span>
              </div>
              <dl>
                {selected.location && <div><dt><MapPin size={13} /> Location</dt><dd>{selected.location}</dd></div>}
                {selected.phone && <div><dt><Phone size={13} /> Phone</dt><dd>{selected.phone}</dd></div>}
                {selected.employeeCount != null && <div><dt><Users size={13} /> Employees</dt><dd>{selected.employeeCount.toLocaleString()}</dd></div>}
                {selected.foundedYear != null && <div><dt><CalendarClock size={13} /> Founded</dt><dd>{selected.foundedYear}</dd></div>}
                {selected.linkedinUrl && <div><dt><Link2 size={13} /> LinkedIn</dt><dd>Available</dd></div>}
                {selected.technologies.length > 0 && <div><dt><Activity size={13} /> Technologies</dt><dd>{selected.technologies.length} found</dd></div>}
              </dl>
            </div>
          )}
          <label>
            <span>Account name *</span>
            <input name="name" required value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            <span>Legal name</span>
            <input name="legalName" />
          </label>
          <label>
            <span>Industry</span>
            <input name="industry" value={industry} onChange={(event) => setIndustry(event.target.value)} />
          </label>
          <label>
            <span>Account website</span>
            <input name="website" type="url" value={website} onChange={(event) => {
              const nextWebsite = event.target.value;
              setWebsite(nextWebsite);
              if (selected && companyWebsiteDomain(nextWebsite) !== companyWebsiteDomain(selected.website ?? "")) setSelected(null);
            }} placeholder="https://example.com" />
          </label>
          <label>
            <span>Lifecycle stage</span>
            <CostivraSelect
              name="stage"
              defaultValue="lead"
              options={stages.map((stage) => ({
                value: stage,
                label: pretty(stage),
              }))}
            />
          </label>
          <label>
            <span>Primary contact</span>
            <input name="contactName" />
          </label>
          <label>
            <span>Contact email</span>
            <input name="contactEmail" type="email" />
          </label>
        </div>
        <p className="manage-form-note">
          <CircleAlert size={15} /> Adding an account stores a real CRM record.
          Customer access is invited separately.
        </p>
        <FormActions busy={busy} submit="Add account" onClose={onClose} />
      </form>
    </SidePanel>
  );
}

function queryReady(value: string) {
  return value.trim().length >= 3;
}

function looksLikeCompanyWebsite(value: string) {
  const query = value.trim();
  return /^(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/|$)/i.test(query);
}

function companyWebsiteDomain(value: string) {
  try {
    const candidate = value.includes("://") ? value : `https://${value}`;
    return new URL(candidate).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function ManageAccountSearchField({ accounts, defaultAccount }: { accounts: ManageAccount[]; defaultAccount?: ManageAccount | null }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(defaultAccount?.name ?? "");
  const [selectedAccountId, setSelectedAccountId] = useState(defaultAccount?.id ?? "");
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return accounts
      .filter((account) => !normalized || account.name.toLowerCase().includes(normalized) || account.industry?.toLowerCase().includes(normalized))
      .slice(0, 8);
  }, [accounts, query]);

  useEffect(() => {
    const handleOutsidePointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutsidePointer);
    return () => document.removeEventListener("mousedown", handleOutsidePointer);
  }, []);

  const chooseAccount = (account: ManageAccount) => {
    setQuery(account.name);
    setSelectedAccountId(account.id);
    rootRef.current?.querySelector<HTMLInputElement>('input[type="text"]')?.setCustomValidity("");
    setOpen(false);
  };

  return <div ref={rootRef} className="manage-account-company-lookup manage-contact-account-search">
    <input type="hidden" name="organizationId" value={selectedAccountId} />
    <div className="manage-account-company-lookup__input">
      <Search size={15} aria-hidden="true" />
      <input
        type="text"
        value={query}
        required
        autoFocus={!defaultAccount}
        placeholder="Search existing accounts"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && matches.length > 0}
        aria-controls="manage-contact-account-suggestions"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setSelectedAccountId("");
          event.currentTarget.setCustomValidity("Choose an existing account from the suggestions.");
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
          if (event.key === "Enter" && open && matches[0]) {
            event.preventDefault();
            chooseAccount(matches[0]);
          }
        }}
      />
    </div>
    {open && matches.length > 0 && <div id="manage-contact-account-suggestions" className="manage-account-company-results" role="listbox" aria-label="Existing account suggestions">
      {matches.map((account) => <button type="button" role="option" aria-selected={account.id === selectedAccountId} key={account.id} onMouseDown={(event) => event.preventDefault()} onClick={() => chooseAccount(account)}>
        <span className="manage-account-company-results__identity"><Building2 size={18} aria-hidden="true" /><span><strong>{account.name}</strong><small>{account.industry || "Account"}</small></span></span>
        {account.id === selectedAccountId && <Check size={14} aria-hidden="true" />}
      </button>)}
    </div>}
  </div>;
}

function ContactForm({
  data,
  defaultAccount,
  busy,
  onClose,
  isClosing,
  onSubmit,
}: {
  data: ManageData;
  defaultAccount?: ManageAccount | null;
  busy: boolean;
  onClose: () => void;
  isClosing?: boolean;
  onSubmit: (form: FormData) => void;
}) {
  return (
    <SidePanel
      title="Add client contact"
      copy="Use a real business contact. No invitation or email is sent."
      onClose={onClose}
      isClosing={isClosing}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          if (!String(formData.get("organizationId") ?? "").trim()) {
            const accountInput = event.currentTarget.querySelector<HTMLInputElement>('[role="combobox"]');
            accountInput?.setCustomValidity("Choose an existing account from the suggestions.");
            accountInput?.reportValidity();
            return;
          }
          onSubmit(formData);
        }}
      >
        <div className="manage-form-grid">
          <label className="wide">
            <span>Account *</span>
            <ManageAccountSearchField accounts={data.accounts} defaultAccount={defaultAccount} />
          </label>
          <label>
            <span>Full name *</span>
            <input name="fullName" required autoFocus={Boolean(defaultAccount)} />
          </label>
          <label>
            <span>Work email *</span>
            <input name="email" type="email" required />
          </label>
          <label>
            <span>Title</span>
            <input name="title" />
          </label>
          <label>
            <span>Phone</span>
            <input name="phone" type="tel" />
          </label>
          <label className="manage-check wide">
            <input name="isPrimary" type="checkbox" value="true" />
            <span>Primary contact for this account</span>
          </label>
        </div>
        <FormActions busy={busy} submit="Add contact" onClose={onClose} />
      </form>
    </SidePanel>
  );
}
function TaskForm({
  data,
  defaultAccount,
  busy,
  onClose,
  isClosing,
  onSubmit,
}: {
  data: ManageData;
  defaultAccount?: ManageAccount | null;
  busy: boolean;
  onClose: () => void;
  isClosing?: boolean;
  onSubmit: (form: FormData) => void;
}) {
  return (
    <Modal
      title="Create follow-up"
      copy="Tasks stay internal until you deliberately call, meet, or send an email."
      onClose={onClose}
      isClosing={isClosing}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(new FormData(event.currentTarget));
        }}
      >
        <div className="manage-form-grid">
          <label className="wide">
            <span>Account *</span>
            <CostivraSelect
              name="organizationId"
              required
              autoFocus
              value={defaultAccount?.id}
              placeholder="Choose an account"
              options={[
                { value: "", label: "Choose an account" },
                ...data.accounts.map((account) => ({
                  value: account.id,
                  label: account.name,
                })),
              ]}
            />
          </label>
          <label className="wide">
            <span>Task *</span>
            <input name="title" required />
          </label>
          <label>
            <span>Type</span>
            <CostivraSelect
              name="taskType"
              defaultValue="follow_up"
              options={[
                { value: "follow_up", label: "Follow-up" },
                { value: "email", label: "Email" },
                { value: "call", label: "Call" },
                { value: "meeting", label: "Meeting" },
                { value: "review", label: "Review" },
              ]}
            />
          </label>
          <label>
            <span>Priority</span>
            <CostivraSelect
              name="priority"
              defaultValue="normal"
              options={[
                { value: "low", label: "Low" },
                { value: "normal", label: "Normal" },
                { value: "high", label: "High" },
              ]}
            />
          </label>
          <label>
            <span>Due</span>
            <CostivraDateTimePicker name="dueAt" />
          </label>
          <label className="wide">
            <span>Notes</span>
            <textarea name="notes" rows={4} />
          </label>
        </div>
        <FormActions busy={busy} submit="Create task" onClose={onClose} />
      </form>
    </Modal>
  );
}
function NoteForm({
  data,
  defaultAccount,
  busy,
  onClose,
  isClosing,
  onSubmit,
}: {
  data: ManageData;
  defaultAccount?: ManageAccount | null;
  busy: boolean;
  onClose: () => void;
  isClosing?: boolean;
  onSubmit: (form: FormData) => void;
}) {
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const staff = data.staff.filter((member) => member.id !== data.operator.id);
  return (
    <Modal
      title="Add internal note"
      copy="Notes are owner-only CRM history. They are never shown in the customer portal."
      onClose={onClose}
      isClosing={isClosing}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(new FormData(event.currentTarget));
        }}
      >
        <div className="manage-form-grid">
          <label className="wide">
            <span>Account *</span>
            <CostivraSelect
              name="organizationId"
              required
              autoFocus
              value={defaultAccount?.id}
              placeholder="Choose an account"
              options={[
                { value: "", label: "Choose an account" },
                ...data.accounts.map((account) => ({
                  value: account.id,
                  label: account.name,
                })),
              ]}
            />
          </label>
          <label className="wide">
            <span>Title *</span>
            <input name="subject" required />
          </label>
          <label className="wide">
            <span>Note</span>
            <textarea name="summary" rows={7} placeholder="Write an internal note. Use @ below to notify a teammate." />
          </label>
          <div className="wide manage-mention-picker">
            <input type="hidden" name="mentionedUserIds" value={JSON.stringify(mentionedUserIds)} />
            <span>Notify teammate</span>
            <p>Choose a teammate to add an @mention. They will receive an in-app notification and a branded internal email after the note saves.</p>
            {staff.length ? <div>{staff.map((member) => { const selected = mentionedUserIds.includes(member.id); return <button type="button" className={selected ? "is-selected" : ""} key={member.id} onClick={() => setMentionedUserIds((current) => selected ? current.filter((id) => id !== member.id) : [...current, member.id])}><AtSign size={13} /> {member.fullName}</button>; })}</div> : <small>No other active internal teammates are available to mention.</small>}
          </div>
        </div>
        <FormActions busy={busy} submit="Save note" onClose={onClose} />
      </form>
    </Modal>
  );
}

function EditAccount({
  account,
  onClose,
}: {
  account: ManageAccount;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const form = new FormData(event.currentTarget);
      await api(`/api/manage/accounts/${account.id}`, {
        method: "PATCH",
        body: JSON.stringify(Object.fromEntries(form)),
      });
      toast.success("Account follow-up updated.");
      onClose();
      router.refresh();
    } catch (error) {
      toast.error(
        "That didn’t work",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={`Update ${account.name}`}
      copy="These fields are private CRM context and do not change the customer’s financial records."
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="manage-form-grid">
          <label>
            <span>Lifecycle stage</span>
            <CostivraSelect
              name="stage"
              defaultValue={account.stage || "onboarding"}
              options={stages.map((stage) => ({
                value: stage,
                label: pretty(stage),
              }))}
            />
          </label>
          <label>
            <span>Next follow-up</span>
            <CostivraDateTimePicker
              name="nextFollowUpAt"
              defaultValue={account.nextFollowUpAt?.slice(0, 16) || ""}
            />
          </label>
          <label className="wide">
            <span>Next step</span>
            <input name="nextStep" defaultValue={account.nextStep || ""} />
          </label>
          <label className="wide">
            <span>Account website / lookup domain</span>
            <input name="website" type="url" defaultValue={account.website || ""} placeholder="https://example.com" />
            <small>Used only for a manual internal company-profile lookup. It is not proof of company ownership.</small>
          </label>
          <label className="wide">
            <span>Private notes</span>
            <textarea
              name="privateNotes"
              rows={6}
              defaultValue={account.privateNotes || ""}
            />
          </label>
        </div>
        <FormActions busy={busy} onClose={onClose} />
      </form>
    </Modal>
  );
}

function MailboxForm({
  data,
  busy,
  onClose,
  isClosing,
  onSubmit,
}: {
  data: ManageData;
  busy: boolean;
  onClose: () => void;
  isClosing?: boolean;
  onSubmit: (form: FormData) => void;
}) {
  const [mailboxType, setMailboxType] = useState<"personal" | "shared">(
    "personal",
  );
  return (
    <Modal
      title="Create mailbox seat"
      copy="This address can send and receive inside the Costivra CRM."
      onClose={onClose}
      isClosing={isClosing}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(new FormData(event.currentTarget));
        }}
      >
        <div className="manage-form-grid">
          <label className="wide">
            <span>Display name</span>
            <input
              name="displayName"
              required
              maxLength={100}
              placeholder="Jordan Lee"
            />
          </label>
          <label className="wide">
            <span>Email address</span>
            <div className="manage-mailbox-address-field">
              <input
                name="localPart"
                required
                maxLength={64}
                pattern="[a-zA-Z0-9]+([._-][a-zA-Z0-9]+)*"
                placeholder="jordan.lee"
              />
              <span aria-hidden="true">@</span>
              <select
                name="domain"
                defaultValue="costivra.ai"
                aria-label="Email domain"
              >
                {data.mail.mailboxDomains.map((domain) => (
                  <option key={domain} value={domain}>
                    {domain}
                  </option>
                ))}
              </select>
            </div>
          </label>
          <label className="wide">
            <span>Seat type</span>
            <CostivraSelect
              name="mailboxType"
              value={mailboxType}
              onChange={(value) =>
                setMailboxType(
                  value === "shared" ? "shared" : "personal",
                )
              }
              options={[
                { value: "personal", label: "Personal mailbox" },
                { value: "shared", label: "Shared team mailbox" },
              ]}
            />
          </label>
          {mailboxType === "personal" && (
            <label className="wide">
              <span>Assigned to</span>
              <CostivraSelect
                name="assignedTo"
                defaultValue={data.operator.id}
                options={data.staff.map((member) => ({
                  value: member.id,
                  label: `${member.fullName} · ${member.email}`,
                }))}
              />
              <small>
                Only this team member and Costivra owners can use a personal
                mailbox.
              </small>
            </label>
          )}
        </div>
        <p className="manage-form-note">
          Creating a mailbox does not send an invitation. Platform access and
          login permissions remain separate.
        </p>
        <FormActions
          busy={busy}
          submit="Create mailbox"
          onClose={onClose}
        />
      </form>
    </Modal>
  );
}

function plainTextToComposerHtml(value: string) {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

function ComposeRecipientField({
  label,
  name,
  values,
  onChange,
  candidates,
  placeholder,
  action,
}: {
  label: string;
  name: "to" | "cc" | "bcc";
  values: string[];
  onChange: (values: string[]) => void;
  candidates: RecipientCandidate[];
  placeholder: string;
  action?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const matchingCandidates = useMemo(
    () => searchRecipientCandidates(candidates, query, values),
    [candidates, query, values],
  );
  const candidateByEmail = useMemo(
    () => new Map(candidates.map((candidate) => [candidate.email, candidate])),
    [candidates],
  );
  const normalizedQuery = normalizeRecipientEmail(query);
  const canAddExternal = isRecipientEmail(normalizedQuery) && !values.includes(normalizedQuery) && !matchingCandidates.some((candidate) => candidate.email === normalizedQuery);
  const resultCount = matchingCandidates.length + (canAddExternal ? 1 : 0);
  const showResults = focused && query.trim().length > 0 && resultCount > 0;

  function addRecipient(email: string) {
    const normalized = normalizeRecipientEmail(email);
    if (!isRecipientEmail(normalized) || values.includes(normalized)) return;
    onChange([...values, normalized]);
    setQuery("");
    setHighlighted(0);
    setFocused(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function removeRecipient(email: string) {
    onChange(values.filter((value) => value !== email));
  }

  function chooseHighlighted() {
    const candidate = matchingCandidates[highlighted];
    if (candidate) addRecipient(candidate.email);
    else if (canAddExternal) addRecipient(normalizedQuery);
  }

  return (
    <div className="manage-compose-line manage-compose-recipient-row">
      <span>{label}</span>
      <div
        className="manage-compose-recipient-control"
        onClick={() => inputRef.current?.focus()}
      >
        {values.map((email) => {
          const candidate = candidateByEmail.get(email);
          return (
            <span className="manage-compose-recipient-chip" title={candidate ? `${candidate.name} · ${email}` : email} key={email}>
              <span>{candidate?.name || email}</span>
              <button type="button" onClick={(event) => { event.stopPropagation(); removeRecipient(email); }} aria-label={`Remove ${candidate?.name || email}`}>
                <X size={11} aria-hidden="true" />
              </button>
            </span>
          );
        })}
        <input type="hidden" name={name} value={values.join(",")} />
        <input
          ref={inputRef}
          className="manage-compose-recipient-search"
          value={query}
          placeholder={values.length ? "Add another" : placeholder}
          aria-label={`${label} recipients`}
          aria-autocomplete="list"
          aria-controls={`${name}-recipient-results`}
          aria-expanded={showResults}
          role="combobox"
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 100)}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlighted(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && resultCount) {
              event.preventDefault();
              setHighlighted((value) => (value + 1) % resultCount);
            } else if (event.key === "ArrowUp" && resultCount) {
              event.preventDefault();
              setHighlighted((value) => (value - 1 + resultCount) % resultCount);
            } else if (event.key === "Enter" || event.key === "Tab" || event.key === "," || event.key === ";") {
              if (resultCount || isRecipientEmail(normalizedQuery)) {
                event.preventDefault();
                chooseHighlighted();
              }
            } else if (event.key === "Backspace" && !query && values.length) {
              removeRecipient(values[values.length - 1]);
            } else if (event.key === "Escape") {
              setFocused(false);
            }
          }}
        />
        {showResults && (
          <div id={`${name}-recipient-results`} className="manage-compose-recipient-results" role="listbox" aria-label={`${label} recipient suggestions`}>
            {matchingCandidates.map((candidate, index) => (
              <button
                type="button"
                role="option"
                aria-selected={highlighted === index}
                className={highlighted === index ? "is-highlighted" : ""}
                key={candidate.email}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => addRecipient(candidate.email)}
              >
                <span className="manage-person-avatar">{initials(candidate.name)}</span>
                <span><strong>{candidate.name}</strong><small>{candidate.email} · {candidate.detail}</small></span>
                <i>{candidate.source === "account" ? "This account" : candidate.source === "staff" ? "Costivra" : "Contact"}</i>
              </button>
            ))}
            {canAddExternal && (
              <button
                type="button"
                role="option"
                aria-selected={highlighted === matchingCandidates.length}
                className={highlighted === matchingCandidates.length ? "is-highlighted" : ""}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => addRecipient(normalizedQuery)}
              >
                <span className="manage-person-avatar"><AtSign size={14} aria-hidden="true" /></span>
                <span><strong>Add {normalizedQuery}</strong><small>This address is not in the CRM yet.</small></span>
              </button>
            )}
          </div>
        )}
      </div>
      {action}
    </div>
  );
}

function Compose({
  data,
  context,
  onClose,
  closing = false,
}: {
  data: ManageData;
  context: ComposeContext;
  onClose: (afterClose?: () => void) => void;
  closing?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busyMode, setBusyMode] = useState<"draft" | "send" | null>(null);
  const busy = busyMode !== null;
  const [showCc, setShowCc] = useState(false);
  const [toRecipients, setToRecipients] = useState(() => splitRecipientValues(context.to));
  const [ccRecipients, setCcRecipients] = useState<string[]>([]);
  const [bccRecipients, setBccRecipients] = useState<string[]>([]);
  const [minimized, setMinimized] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [draftPromptOpen, setDraftPromptOpen] = useState(false);
  const [draftPromptClosing, setDraftPromptClosing] = useState(false);
  const [draftInstruction, setDraftInstruction] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [draftReveal, setDraftReveal] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const draftPromptRef = useRef<HTMLTextAreaElement>(null);
  const draftPromptTimerRef = useRef<number | null>(null);
  const draftRevealTimerRef = useRef<number | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [attachmentNames, setAttachmentNames] = useState<string[]>([]);
  const selectedAccount = context.organizationId || "";
  const availableMailboxes = data.mail.mailboxes.filter(
    (mailbox) => mailbox.status === "active" && mailbox.canSend,
  );
  const [selectedMailbox, setSelectedMailbox] = useState(
    context.mailboxId || data.mail.selectedMailboxId || "",
  );
  const recipientCandidates = useMemo(
    () => buildRecipientCandidates(data.contacts, data.staff, selectedAccount),
    [data.contacts, data.staff, selectedAccount],
  );
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || editor.dataset.initialized === "true") return;
    editor.innerHTML = plainTextToComposerHtml(context.body || "");
    editor.dataset.initialized = "true";
  }, [context.body]);
  useEffect(() => {
    if (draftPromptOpen && !draftPromptClosing && !drafting) requestAnimationFrame(() => draftPromptRef.current?.focus());
  }, [draftPromptOpen, draftPromptClosing, drafting]);
  useEffect(() => () => {
    if (draftPromptTimerRef.current) window.clearTimeout(draftPromptTimerRef.current);
    if (draftRevealTimerRef.current) window.clearTimeout(draftRevealTimerRef.current);
  }, []);
  async function submitForm(element: HTMLFormElement, mode: "draft" | "send") {
    const form = new FormData(element);
    const recipientSearchInput = element.querySelector<HTMLInputElement>(".manage-compose-recipient-search");
    const uncommittedSearch = recipientSearchInput?.value.trim();
    if (uncommittedSearch) {
      const currentTo = String(form.get("to") || "").trim();
      form.set("to", currentTo ? `${currentTo},${uncommittedSearch}` : uncommittedSearch);
    }
    if (mode === "send" && splitRecipientValues(String(form.get("to") || "")).length === 0) {
      toast.error("Add a recipient", "Choose a contact or enter an email address before sending.");
      return;
    }
    form.set("body", editorRef.current?.innerText ?? "");
    form.set("htmlBody", editorRef.current?.innerHTML ?? "");
    form.set("mode", mode);
    form.set("idempotencyKey", crypto.randomUUID());
    if (mode === "draft") form.delete("attachments");
    setBusyMode(mode);
    try {
      const result = await api("/api/manage/mail/messages", {
        method: "POST",
        body: form,
        headers: {},
      });
      toast.success(
        mode === "draft"
          ? "Draft saved."
          : result.threadId
            ? "Email accepted by Resend."
            : "Email sent.",
      );
      const destination = result.threadId
        ? `/manage/mail/${result.threadId}?folder=${mode === "draft" ? "drafts" : "sent"}&mailbox=${selectedMailbox}`
        : `/manage/mail?mailbox=${selectedMailbox}`;
      onClose(() => {
        if (mode === "send") {
          router.push(destination);
        }
        router.refresh();
      });
    } catch (error) {
      toast.error(
        mode === "draft" ? "Draft was not saved" : "Email was not sent",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setBusyMode(null);
    }
  }
  function runEditorCommand(command: string, value?: string) {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    document.execCommand(command, false, value);
  }
  function openDraftPrompt() {
    if (draftPromptTimerRef.current) window.clearTimeout(draftPromptTimerRef.current);
    setDraftPromptClosing(false);
    setDraftPromptOpen(true);
  }
  function closeDraftPrompt(afterGeneration = false) {
    if (drafting && !afterGeneration) return;
    if (draftPromptTimerRef.current) window.clearTimeout(draftPromptTimerRef.current);
    setDraftPromptClosing(true);
    draftPromptTimerRef.current = window.setTimeout(() => {
      setDraftPromptOpen(false);
      setDraftPromptClosing(false);
      if (afterGeneration) setDrafting(false);
    }, 220);
  }
  async function generateDraft(form: HTMLFormElement) {
    const recipientEmail = String(new FormData(form).get("to") || "").trim();
    const subjectInput = form.elements.namedItem("subject");
    const currentSubject = subjectInput instanceof HTMLInputElement ? subjectInput.value : "";
    setDrafting(true);
    try {
      const response = await fetch("/api/manage/mail/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: draftInstruction, recipientEmail, subject: currentSubject, organizationId: context.organizationId, contactId: context.contactId }),
      });
      const payload = (await response.json().catch(() => ({}))) as { bodyHtml?: string; subject?: string; error?: string };
      if (!response.ok || !payload.bodyHtml) throw new Error(payload.error || "Costivra could not create a draft.");
      if (editorRef.current) {
        editorRef.current.innerHTML = payload.bodyHtml;
      }
      if (subjectInput instanceof HTMLInputElement && !subjectInput.value.trim() && payload.subject) subjectInput.value = payload.subject;
      setDraftInstruction("");
      setDraftReveal(true);
      closeDraftPrompt(true);
      if (draftRevealTimerRef.current) window.clearTimeout(draftRevealTimerRef.current);
      draftRevealTimerRef.current = window.setTimeout(() => {
        setDraftReveal(false);
        editorRef.current?.focus();
      }, 680);
      toast.success("Draft added. Review it before you send.");
    } catch (error) {
      setDrafting(false);
      toast.error("Draft could not be created", error instanceof Error ? error.message : "Please try again.");
    }
  }
  function addLink() {
    const url = window.prompt("Paste the web address for this link");
    if (!url) return;
    const normalized = /^(https?:|mailto:)/i.test(url) ? url : `https://${url}`;
    runEditorCommand("createLink", normalized);
  }
  function recordAttachments(input: HTMLInputElement) {
    setAttachmentNames((current) => Array.from(new Set([
      ...current,
      ...Array.from(input.files ?? []).map((file) => file.name),
    ])));
  }
  function saveOnClose(button: HTMLButtonElement) {
    const form = button.form;
    const formData = form ? new FormData(form) : null;
    const hasSubject = Boolean(String(formData?.get("subject") || "").trim());
    const hasBody = Boolean(editorRef.current?.innerText.trim());
    const hasDraftContent = Boolean(form && (hasSubject || hasBody));
    if (form && hasDraftContent && !busy && selectedMailbox) void submitForm(form, "draft");
    else if (!busy) onClose();
  }
  return (
    <div className={`manage-compose-window${minimized ? " is-minimized" : ""}${closing ? " is-closing" : ""}`}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submitForm(event.currentTarget, "send");
        }}
      >
        {context.threadId && (
          <input type="hidden" name="threadId" value={context.threadId} />
        )}
        <header>
          <div>
            <strong>
              {context.mode === "reply"
                ? "Reply"
                : context.mode === "forward"
                  ? "Forward message"
                  : "New message"}
            </strong>
            <span>{minimized ? "Draft" : ""}</span>
          </div>
          <div className="manage-compose-window-actions">
            <button type="button" onClick={() => setMinimized((value) => !value)} aria-label={minimized ? "Maximize composer" : "Minimize composer"}>
              {minimized ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
            </button>
            <button type="button" onClick={(event) => saveOnClose(event.currentTarget)} aria-label="Save draft and close composer">
              <X size={17} />
            </button>
          </div>
        </header>
        <div className="manage-compose-body" aria-hidden={minimized} inert={minimized}>
        <div className="manage-compose-account">
          <div className="manage-compose-routing">
            <label>
              <span>From *</span>
              <CostivraSelect
                name="mailboxId"
                required
                value={selectedMailbox}
                onChange={(val) => setSelectedMailbox(val)}
                placeholder="Choose mailbox"
                size="sm"
                options={[
                  { value: "", label: "Choose mailbox" },
                  ...availableMailboxes.map((mailbox) => ({
                    value: mailbox.id,
                    label: `${mailbox.displayName} · ${mailbox.address}`,
                  })),
                ]}
              />
            </label>
            {selectedAccount && <input type="hidden" name="organizationId" value={selectedAccount} />}
          </div>
        </div>
        <ComposeRecipientField
          label="To"
          name="to"
          values={toRecipients}
          onChange={setToRecipients}
          candidates={recipientCandidates}
          placeholder="Search a name or email"
          action={<button type="button" className={showCc ? "is-open" : ""} onClick={() => setShowCc((value) => !value)} aria-expanded={showCc}>Cc/Bcc</button>}
        />
        <div className={`manage-compose-copy-fields${showCc ? " is-open" : ""}`} aria-hidden={!showCc} inert={!showCc}>
          <div>
            <ComposeRecipientField label="Cc" name="cc" values={ccRecipients} onChange={setCcRecipients} candidates={recipientCandidates} placeholder="Search a name or email" />
            <ComposeRecipientField label="Bcc" name="bcc" values={bccRecipients} onChange={setBccRecipients} candidates={recipientCandidates} placeholder="Search a name or email" />
          </div>
        </div>
        <div className={`manage-compose-line manage-compose-subject-row${drafting ? " is-generating" : ""}${draftReveal ? " is-draft-revealing" : ""}`}>
          <span>Sub</span>
          <input
            className="subject"
            name="subject"
            placeholder="Subject"
            required
            defaultValue={context.subject || ""}
          />
        </div>
        <div className="manage-compose-formatting" role="toolbar" aria-label="Message formatting">
          <select aria-label="Text style" defaultValue="div" onChange={(event) => runEditorCommand("formatBlock", event.target.value)}>
            <option value="div">Normal</option>
            <option value="h2">Heading</option>
            <option value="h3">Subheading</option>
            <option value="blockquote">Quote</option>
            <option value="pre">Code</option>
          </select>
          <span className="manage-compose-tool-divider" />
          <button type="button" onClick={() => runEditorCommand("bold")} aria-label="Bold" title="Bold"><Bold size={15} /></button>
          <button type="button" onClick={() => runEditorCommand("italic")} aria-label="Italic" title="Italic"><Italic size={15} /></button>
          <button type="button" onClick={() => runEditorCommand("underline")} aria-label="Underline" title="Underline"><Underline size={15} /></button>
          <button type="button" onClick={() => runEditorCommand("strikeThrough")} aria-label="Strikethrough" title="Strikethrough"><Strikethrough size={15} /></button>
          <span className="manage-compose-tool-divider" />
          <button type="button" onClick={() => runEditorCommand("insertUnorderedList")} aria-label="Bulleted list" title="Bulleted list"><List size={15} /></button>
          <button type="button" onClick={() => runEditorCommand("insertOrderedList")} aria-label="Numbered list" title="Numbered list"><ListOrdered size={15} /></button>
          <button type="button" onClick={() => runEditorCommand("outdent")} aria-label="Decrease indent" title="Decrease indent"><IndentDecrease size={15} /></button>
          <button type="button" onClick={() => runEditorCommand("indent")} aria-label="Increase indent" title="Increase indent"><IndentIncrease size={15} /></button>
          <button type="button" onClick={() => runEditorCommand("justifyLeft")} aria-label="Align left" title="Align left"><AlignLeft size={15} /></button>
          <button type="button" onClick={() => runEditorCommand("justifyCenter")} aria-label="Align center" title="Align center"><AlignCenter size={15} /></button>
          <button type="button" onClick={() => runEditorCommand("justifyRight")} aria-label="Align right" title="Align right"><AlignRight size={15} /></button>
          <span className="manage-compose-tool-divider" />
          <button type="button" onClick={addLink} aria-label="Add link" title="Add link"><Link2 size={15} /></button>
          <label className="manage-compose-color" title="Text color"><Palette size={15} /><input type="color" aria-label="Text color" defaultValue="#273244" onChange={(event) => runEditorCommand("foreColor", event.currentTarget.value)} /></label>
          <label className="manage-attach" title="Attach files">
            <Paperclip size={15} />
            <input name="attachments" type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" multiple onChange={(event) => recordAttachments(event.currentTarget)} />
          </label>
          <button type="button" onClick={() => imageInputRef.current?.click()} aria-label="Attach images" title="Attach images"><ImagePlus size={15} /></button>
          <input ref={imageInputRef} className="manage-compose-hidden-file" name="attachments" type="file" accept="image/*" multiple onChange={(event) => recordAttachments(event.currentTarget)} />
          <button type="button" onClick={() => runEditorCommand("removeFormat")} aria-label="Clear formatting" title="Clear formatting"><RemoveFormatting size={15} /></button>
          <span className="manage-compose-toolbar-spacer" />
          <button type="button" onClick={() => runEditorCommand("undo")} aria-label="Undo" title="Undo"><Undo2 size={15} /></button>
          <button type="button" onClick={() => runEditorCommand("redo")} aria-label="Redo" title="Redo"><Redo2 size={15} /></button>
        </div>
        <div className={`manage-compose-message-scroll${drafting ? " is-generating" : ""}`}>
          {draftPromptOpen && <div className={`manage-compose-draft-prompt${draftPromptClosing ? " is-closing" : ""}${drafting ? " is-generating" : ""}`} role="dialog" aria-label="Generate email draft" aria-busy={drafting}>
            <div className="manage-compose-draft-prompt-form" aria-hidden={drafting}>
              <label htmlFor="manage-compose-draft-instruction">Describe what you want to write</label>
              <textarea
                id="manage-compose-draft-instruction"
                ref={draftPromptRef}
                value={draftInstruction}
                placeholder="For example: follow up on the renewal and ask for a 15-minute call next week."
                onChange={(event) => setDraftInstruction(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") { closeDraftPrompt(); return; }
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                    event.preventDefault();
                    const form = event.currentTarget.form;
                    if (form && draftInstruction.trim()) void generateDraft(form);
                  }
                }}
              />
              <footer>
                <small>Uses the matched contact, account, vendors, and recent CRM activity when available.</small>
                <div className="manage-compose-draft-prompt-actions">
                  <button type="button" className="manage-button manage-button--quiet" onClick={() => closeDraftPrompt()}>Cancel</button>
                  <button type="button" className="manage-button manage-button--primary" disabled={draftInstruction.trim().length < 3} onClick={(event) => { const form = event.currentTarget.form; if (form) void generateDraft(form); }}>
                    Generate draft
                  </button>
                </div>
              </footer>
            </div>
            <div className="manage-compose-draft-loading" role="status" aria-live="polite">
              <div className="manage-compose-draft-orbit" aria-hidden="true"><CostivraMark size={30} /><i /><i /><i /></div>
              <div><strong>Building your draft</strong><span>Reading the relationship, recent messages, and next step.</span></div>
              <div className="manage-compose-draft-progress" aria-hidden="true"><i /></div>
            </div>
          </div>}
          <div
            ref={editorRef}
            className={`manage-compose-editor${drafting ? " is-generating" : ""}${draftReveal ? " is-draft-revealing" : ""}`}
            contentEditable={!draftPromptOpen}
            suppressContentEditableWarning
            role="textbox"
            aria-label="Message body"
            aria-multiline="true"
            aria-hidden={draftPromptOpen}
            data-placeholder={draftPromptOpen ? "" : 'Write your message… Type "/" to draft with context'}
            onInput={(event) => {
              const editor = event.currentTarget;
              if (editor.innerText.trim() === "/") {
                editor.innerHTML = "";
                openDraftPrompt();
              }
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              document.execCommand(event.shiftKey ? "insertLineBreak" : "insertParagraph");
            }}
          />
          <div className="manage-compose-signature-preview" aria-label="Email signature preview">
          <div className="manage-compose-signature-main">
            <span className="manage-compose-signature-rail" aria-hidden="true" />
            <div className="manage-compose-signature-content">
              <div className="manage-compose-signature-brand"><CostivraMark size={42} /><strong>Costivra</strong></div>
              <div className="manage-compose-signature-person">
                {data.operator.avatarUrl
                  ? <>
                    {/* The source is a short-lived private Supabase Storage URL. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="manage-person-avatar large manage-compose-signature-avatar" src={data.operator.avatarUrl} alt="" />
                  </>
                  : <span className="manage-person-avatar large manage-compose-signature-avatar">{initials(data.operator.fullName)}</span>}
                <div className="manage-compose-signature-copy">
                  <strong>{data.operator.fullName}</strong>
                  {data.operator.jobTitle && <span className="manage-compose-signature-title">{data.operator.jobTitle}</span>}
                </div>
              </div>
              <div className="manage-compose-signature-details">
                {data.operator.phone && <><span>{data.operator.phone}</span><i aria-hidden="true">|</i></>}
                <a href="https://costivra.ai" target="_blank" rel="noreferrer">costivra.ai</a>
                {data.operator.linkedinUrl && <><i aria-hidden="true">|</i><a href={data.operator.linkedinUrl} target="_blank" rel="noreferrer">LinkedIn</a></>}
              </div>
              <p>Every recurring cost, under command.</p>
            </div>
          </div>
          <p className="manage-compose-signature-notice"><strong>CONFIDENTIALITY DISCLAIMER:</strong> This email and any attachments may contain confidential information intended only for the named recipient. Please handle it in accordance with applicable privacy and electronic-communications laws, including the Electronic Communications Privacy Act (ECPA), 18 U.S.C. §§ 2510–2521. Unauthorized review, use, disclosure, or distribution is prohibited. If you received it in error, please notify the sender and delete all copies.</p>
          </div>
          {attachmentNames.length > 0 && <div className="manage-compose-attachment-list" aria-label="Selected attachments">
            {attachmentNames.map((name) => <span key={name}><Paperclip size={12} />{name}</span>)}
          </div>}
        </div>
        <footer>
          <span className="manage-compose-save-state">Draft saves when you close</span>
          <div className="manage-compose-send-actions">
            <div className="manage-compose-schedule">
              <input type="hidden" name="scheduledAt" value={scheduledAt} />
              <button type="button" className={`manage-compose-schedule-trigger${scheduledAt ? " is-set" : ""}`} onClick={() => setScheduleOpen((value) => !value)} aria-label="Schedule email" aria-expanded={scheduleOpen}><Clock3 size={16} /></button>
              {scheduleOpen && <div className="manage-compose-schedule-popover"><span>Schedule send</span><CostivraDateTimePicker value={scheduledAt} onChange={setScheduledAt} /></div>}
            </div>
            <button
              className="manage-button manage-button--primary"
              disabled={busy || !selectedMailbox}
            >
              {busyMode === "send" ? "Sending…" : scheduledAt ? "Schedule" : "Send"}
              <Send size={16} />
            </button>
          </div>
        </footer>
        </div>
      </form>
    </div>
  );
}
