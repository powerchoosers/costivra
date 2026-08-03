"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CSSProperties, FormEvent, ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Archive,
  ArrowLeft,
  BarChart3,
  AlignCenter,
  AlignLeft,
  AlignRight,
  AtSign,
  Bold,
  Bot,
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
  Inbox,
  ImagePlus,
  IndentDecrease,
  IndentIncrease,
  Italic,
  LayoutDashboard,
  Link2,
  List,
  ListOrdered,
  Mail,
  MailOpen,
  Maximize2,
  Menu,
  MessageSquareText,
  Minimize2,
  Paperclip,
  Palette,
  Pencil,
  Plus,
  RefreshCw,
  Reply,
  Redo2,
  RemoveFormatting,
  Search,
  Send,
  Settings,
  ShieldAlert,
  Star,
  Strikethrough,
  Trash2,
  Underline,
  Undo2,
  Users,
  X,
} from "lucide-react";
import type {
  ManageAccount,
  ManageActivity,
  ManageContact,
  ManageData,
  ManageMailbox,
  ManageMailThread,
  ManageOperator,
  ManageVendorRelationship,
} from "@/lib/manage/types";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast-provider";
import { CostivraMark } from "@/components/brand";
import { ManageLiveNotifications } from "@/components/manage-live-notifications";
import { CostivraSelect } from "@/components/ui/costivra-select";
import { CostivraDateTimePicker } from "@/components/ui/costivra-date-time-picker";
import { ManageInvoiceReview } from "@/components/manage-invoice-review";
import { ManageIntakeOperations } from "@/components/manage-intake-operations";
import { CompanyLogo } from "@/components/company-logo";
import { ManageAiDrawer } from "@/components/manage-ai-drawer";
import { RecordFilesWorkspace } from "@/components/record-files-workspace";
import type { ManageInvoiceReviewData } from "@/lib/manage/invoice-review-types";
import type { ManageIntakeOperationsData } from "@/lib/manage/intake-operations-types";
import type { SystemReadiness } from "@/lib/manage/system-readiness";
import { formatManageDate } from "@/lib/manage/date-format";
import { groupRecordedSpend, type SpendInterval } from "@/lib/manage/vendor-costs";
import {
  buildRecipientCandidates,
  isRecipientEmail,
  normalizeRecipientEmail,
  searchRecipientCandidates,
  splitRecipientValues,
  type RecipientCandidate,
} from "@/lib/manage/recipient-search";

const navGroups = [
  {
    label: "Clients",
    items: [
      ["Overview", "/manage", LayoutDashboard],
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
      ["Invoice review", "/manage/invoice-review", FileCheck2],
      ["Activity", "/manage/activity", Activity],
    ],
  },
] as const;

const settingsNav = ["Settings", "/manage/settings", Settings] as const;

type ManageSidebarViewport = "desktop" | "compact" | "mobile";

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
  to?: string;
  subject?: string;
  body?: string;
  threadId?: string;
  mailboxId?: string;
};

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
    threadId?: string;
  };
  if (!response.ok)
    throw new Error(payload.error || "That action could not be completed.");
  return payload;
}

function Status({ value }: { value: string | null }) {
  const key = value || "unclassified";
  return (
    <span className={`manage-status manage-status--${key}`}>
      <i />
      {stageLabel(value)}
    </span>
  );
}

function Sparkline({ path, stroke = "#2563eb" }: { path: string; stroke?: string }) {
  return (
    <svg className="manage-sparkline" viewBox="0 0 68 24" aria-hidden="true">
      <path d={path} stroke={stroke} strokeWidth="1.75" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
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
    <div className="manage-empty">
      <span>
        <Icon size={22} />
      </span>
      <h3>{title}</h3>
      <p>{copy}</p>
      {action}
    </div>
  );
}

function Modal({
  title,
  copy,
  children,
  onClose,
}: {
  title: string;
  copy?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="manage-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        className="manage-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <div>
            <h2>{title}</h2>
            {copy && <p>{copy}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
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

export function ManagePortal({
  section,
  detailId,
  data,
  invoiceReview,
  intakeOperations,
}: {
  section: string;
  detailId?: string | null;
  data: ManageData;
  invoiceReview?: ManageInvoiceReviewData | null;
  intakeOperations?: ManageIntakeOperationsData | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeSearch = searchParams.get("search") ?? "";
  const router = useRouter();
  const toast = useToast();
  const { openComposer } = useManageComposer();
  const setCompose = useCallback((context: ComposeContext) => openComposer(data, context), [data, openComposer]);
  const [mobileNav, setMobileNav] = useState(false);
  const [sidebarViewport, setSidebarViewport] =
    useState<ManageSidebarViewport>("desktop");
  const [search, setSearch] = useState(routeSearch);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchClosing, setSearchClosing] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
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
  const sidebarRef = useRef<HTMLElement>(null);
  const sidebarOpenTimerRef = useRef<number | null>(null);
  const sidebarCloseTimerRef = useRef<number | null>(null);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [createMenuClosing, setCreateMenuClosing] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileMenuClosing, setProfileMenuClosing] = useState(false);
  const [dialog, setDialog] = useState<
    "account" | "contact" | "task" | "note" | "mailbox" | null
  >(null);
  const [contextAccount, setContextAccount] = useState<ManageAccount | null>(null);
  const [busy, setBusy] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  useEffect(() => {
    function updateSidebarViewport() {
      const nextViewport: ManageSidebarViewport =
        window.innerWidth <= 780
          ? "mobile"
          : window.innerWidth < 1200
            ? "compact"
            : "desktop";
      setSidebarViewport(nextViewport);
      if (nextViewport !== "mobile") setMobileNav(false);
    }

    const initializationFrame = window.requestAnimationFrame(() => {
      updateSidebarViewport();
    });
    window.addEventListener("resize", updateSidebarViewport);
    return () => {
      window.cancelAnimationFrame(initializationFrame);
      window.removeEventListener("resize", updateSidebarViewport);
    };
  }, []);

  const sidebarUsesRail = sidebarViewport !== "mobile";
  const sidebarIsCollapsed = sidebarUsesRail && !mobileNav;

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

  const clearSidebarIntent = useCallback(() => {
    if (sidebarOpenTimerRef.current !== null) {
      window.clearTimeout(sidebarOpenTimerRef.current);
      sidebarOpenTimerRef.current = null;
    }
    if (sidebarCloseTimerRef.current !== null) {
      window.clearTimeout(sidebarCloseTimerRef.current);
      sidebarCloseTimerRef.current = null;
    }
  }, []);

  const openSidebarWithIntent = useCallback(() => {
    if (sidebarViewport === "mobile") return;
    if (sidebarCloseTimerRef.current !== null) {
      window.clearTimeout(sidebarCloseTimerRef.current);
      sidebarCloseTimerRef.current = null;
    }
    if (mobileNav || sidebarOpenTimerRef.current !== null) return;
    sidebarOpenTimerRef.current = window.setTimeout(() => {
      setMobileNav(true);
      sidebarOpenTimerRef.current = null;
    }, 240);
  }, [mobileNav, sidebarViewport]);

  const closeSidebarWithIntent = useCallback(() => {
    if (sidebarViewport === "mobile") return;
    if (sidebarOpenTimerRef.current !== null) {
      window.clearTimeout(sidebarOpenTimerRef.current);
      sidebarOpenTimerRef.current = null;
    }
    if (sidebarCloseTimerRef.current !== null) {
      window.clearTimeout(sidebarCloseTimerRef.current);
    }
    sidebarCloseTimerRef.current = window.setTimeout(() => {
      const focusedElement = document.activeElement;
      if (
        focusedElement instanceof HTMLElement &&
        sidebarRef.current?.contains(focusedElement)
      ) {
        return;
      }
      setMobileNav(false);
      setProfileMenuOpen(false);
      setProfileMenuClosing(false);
      sidebarCloseTimerRef.current = null;
    }, 460);
  }, [sidebarViewport]);

  useEffect(() => () => clearSidebarIntent(), [clearSidebarIntent]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!searchContainerRef.current?.contains(event.target as Node)) closeSearch();
      if (!createMenuRef.current?.contains(event.target as Node)) closeCreateMenu();
      if (!profileMenuRef.current?.contains(event.target as Node)) closeProfileMenu();
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeProfileMenu();
        setMobileNav(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeCreateMenu, closeProfileMenu, closeSearch]);

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
      setDialog(null);
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
        : pretty(section);
  return (
    <div className={`manage-app${assistantOpen ? " is-assistant-open" : ""}`}>
      <ManageLiveNotifications soundEnabled={data.operator.notificationSoundEnabled} />
      <aside
        id="manage-owner-sidebar"
        ref={sidebarRef}
        className={`manage-sidebar${mobileNav ? " is-open" : ""}${
          sidebarIsCollapsed ? " is-collapsed" : ""
        }`}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") openSidebarWithIntent();
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") closeSidebarWithIntent();
        }}
        onFocusCapture={() => {
          if (sidebarViewport !== "mobile") {
            clearSidebarIntent();
            setMobileNav(true);
          }
        }}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            closeSidebarWithIntent();
          }
        }}
      >
        <div className="manage-brand">
          <Link href="/manage" title="Costivra Owner Operations">
            <span className="manage-brand-mark">
              <CostivraMark size={34} />
            </span>
            <div className="manage-brand-copy" aria-hidden={sidebarIsCollapsed}>
              <strong>Costivra</strong>
              <small>OWNER OPERATIONS</small>
            </div>
          </Link>
          <button
            className="manage-mobile-close"
            onClick={() => setMobileNav(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="manage-primary-nav" aria-label="Owner portal">
          {navGroups.map((group) => (
            <div className="manage-nav-group" key={group.label}>
              <span className="manage-nav-group-label">{group.label}</span>
              {group.items.map(([label, href, Icon]) => {
                const active =
                  href === "/manage"
                    ? pathname === href
                    : pathname.startsWith(href);
                const unreadCount = label === "Mail" ? data.mail.unreadCount : 0;
                return (
                  <Link
                    className={active ? "active" : ""}
                    href={href}
                    key={href}
                    aria-label={
                      unreadCount > 0
                        ? `${label}, ${unreadCount} unread messages`
                        : label
                    }
                    onClick={() => setMobileNav(false)}
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
        <div className="manage-sidebar-foot">
          <nav className="manage-sidebar-utility" aria-label="Workspace settings">
            <Link
              className={pathname.startsWith(settingsNav[1]) ? "active" : ""}
              href={settingsNav[1]}
              aria-label={settingsNav[0]}
              onClick={() => setMobileNav(false)}
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
              onClick={() => {
                if (sidebarIsCollapsed) {
                  clearSidebarIntent();
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
                <Link href="/manage/settings#profile-settings-title" role="menuitem" onClick={() => closeProfileMenu()}>
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
      {mobileNav && sidebarViewport === "mobile" && (
        <button
          className="manage-nav-scrim"
          aria-label="Close menu"
          onClick={() => setMobileNav(false)}
        />
      )}
      <main className={`manage-main${sidebarUsesRail ? " is-collapsed" : ""}`}>
        <header className="manage-topbar">
          <div className="manage-topbar-leading">
            <button
              className="manage-menu"
              onClick={() => setMobileNav(true)}
              aria-label="Open menu"
              aria-controls="manage-owner-sidebar"
              aria-expanded={mobileNav}
            >
              <Menu size={20} />
            </button>
            <div>
              <small>COSTIVRA INTERNAL</small>
              <h1>{pageTitle}</h1>
            </div>
          </div>
          <div className="manage-topbar-center">
          <div className="manage-global-search-wrap" ref={searchContainerRef}>
            <label className="manage-search">
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
                          {category === currentSearchOrder(section)[0] && (
                            <span>Current page</span>
                          )}
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
          {(["overview", "accounts", "contacts"] as const).includes(section as "overview" | "accounts" | "contacts") && (
            <div className="manage-create-wrap" ref={createMenuRef}>
              <button className="manage-button manage-button--primary manage-create-trigger" type="button" onClick={() => createMenuOpen ? closeCreateMenu() : setCreateMenuOpen(true)} aria-label="Create a new record" aria-expanded={createMenuOpen} aria-haspopup="menu">
                <Plus aria-hidden="true" size={18} strokeWidth={2.2} />
              </button>
              {(createMenuOpen || createMenuClosing) && (
                <div className={`manage-create-menu${createMenuClosing ? " is-closing" : ""}`} role="menu" aria-label="Create a new record">
                  <button type="button" role="menuitem" onClick={() => { setDialog("account"); closeCreateMenu(); }}><Building2 size={16} />Add account</button>
                  <button type="button" role="menuitem" onClick={() => { setDialog("contact"); closeCreateMenu(); }}><Users size={16} />Add contact</button>
                </div>
              )}
            </div>
          )}
          </div>
          <div className="manage-top-actions">
            <div className="manage-topbar-utilities" aria-label="Workspace utilities">
              <button type="button" className="manage-topbar-icon manage-topbar-icon--assistant" aria-label="Ask Costivra" title="Ask Costivra" aria-expanded={assistantOpen} aria-controls="manage-ai-drawer" onClick={() => setAssistantOpen((current) => !current)}><Bot size={18} strokeWidth={2} /></button>
            </div>
            {section === "mail" ? null : section === "settings" || section === "invoice-review" || section === "intake" ? null : section === "activity" ? (
              <button
                className="manage-button manage-button--primary"
                onClick={() => setDialog("note")}
              >
                <Plus size={16} /> Add note
              </button>
            ) : (["overview", "accounts", "contacts"] as const).includes(section as "overview" | "accounts" | "contacts") ? null : (
              <button
                className="manage-button manage-button--primary"
                onClick={() =>
                  setDialog(
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
        </header>
        <div key={section} className={`manage-page manage-page--${section}${detailId ? " manage-page--detail" : ""} motion-page`}>
          {section === "overview" && (
            <Overview data={data} />
          )}
          {section === "accounts" && (
            detailId ? <AccountDetailPage data={data} accountId={detailId} onCompose={(contact) => setCompose({ mode: "new", organizationId: contact.organizationId, to: contact.email })} /> : <Accounts
              data={data}
              query={search}
            />
          )}
          {section === "contacts" && (
            detailId ? <ContactDetailPage data={data} contactId={detailId} onCompose={(contact) => setCompose({ mode: "new", organizationId: contact.organizationId, to: contact.email })} /> : <Contacts
              data={data}
              query={search}
              onCompose={(contact) =>
                setCompose({
                  mode: "new",
                  organizationId: contact.organizationId,
                  to: contact.email,
                })
              }
            />
          )}
          {section === "outreach" && (
            <Outreach
              data={data}
              query={search}
              run={run}
              onTask={() => setDialog("task")}
              onNote={() => setDialog("note")}
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
              onAdd={() => setDialog("mailbox")}
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
          {section === "activity" && (
            <ActivityPage
              data={data}
              query={search}
              onNote={() => setDialog("note")}
            />
          )}
        </div>
      </main>
      <div id="manage-ai-drawer">
        <ManageAiDrawer
          open={assistantOpen}
          onClose={() => setAssistantOpen(false)}
          section={section}
          detailId={detailId}
        />
      </div>
      {dialog === "account" && (
        <AccountForm
          busy={busy}
          onClose={() => setDialog(null)}
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
          busy={busy}
          onClose={() => setDialog(null)}
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
          onClose={() => { setDialog(null); setContextAccount(null); }}
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
          onClose={() => { setDialog(null); setContextAccount(null); }}
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
          busy={busy}
          onClose={() => setDialog(null)}
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

function Overview({ data }: { data: ManageData }) {
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
      <section className="manage-intro">
        <div className="manage-intro-copy">
          <h2>Every client relationship, in view.</h2>
          <p>One place to manage customers, outreach, and email.</p>
        </div>
      </section>
      <section className="manage-summary" aria-label="CRM summary">
        <div>
          <div className="manage-sparkline-head">
            <small>ALL ACCOUNTS</small>
            <Sparkline path="M 2 18 Q 18 10, 34 14 T 66 5" stroke="#2563eb" />
          </div>
          <strong>{data.accounts.length}</strong>
        </div>
        <div>
          <div className="manage-sparkline-head">
            <small>ACTIVE</small>
            <Sparkline path="M 2 20 Q 20 14, 38 8 T 66 4" stroke="#12b76a" />
          </div>
          <strong>{active}</strong>
        </div>
        <div>
          <div className="manage-sparkline-head">
            <small>NEEDS FOLLOW-UP</small>
            <Sparkline path="M 2 8 Q 18 14, 36 18 T 66 20" stroke="#f79009" />
          </div>
          <strong>{followUps}</strong>
        </div>
        <div>
          <div className="manage-sparkline-head">
            <small>ONBOARDING</small>
            <Sparkline path="M 2 16 Q 22 18, 42 10 T 66 6" stroke="#2e60d4" />
          </div>
          <strong>{onboarding}</strong>
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
      <div className="manage-lower-grid">
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
      </div>
    </>
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
      <header className="manage-inspector-header">
        <Link href={`/manage/accounts/${account.id}`} className="manage-inspector-account manage-inspector-record-card" title={`Open ${account.name}`}>
          <CompanyLogo entity="organization" id={account.id} name={account.name} className="manage-account-avatar" />
          <div>
            <h3>{account.name}</h3>
            <p>{account.industry || "Industry not set"}</p>
          </div>
        </Link>
      </header>
      <div className="manage-inspector-tabs" style={{ "--active-tab": tab === "overview" ? 0 : tab === "timeline" ? 1 : 2 } as CSSProperties}>
        <button
          className={tab === "overview" ? "active" : ""}
          onClick={() => setTab("overview")}
        >
          Overview
        </button>
        <button
          className={tab === "timeline" ? "active" : ""}
          onClick={() => setTab("timeline")}
        >
          Timeline ({activities.length})
        </button>
        <button
          className={tab === "contacts" ? "active" : ""}
          onClick={() => setTab("contacts")}
        >
          Contacts ({contacts.length})
        </button>
      </div>

      <div key={tab} className="manage-inspector-tab-panel">
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
      await api(`/api/manage/accounts/${account.id}`, { method: "PATCH", body: JSON.stringify({ stage: nextValue }) });
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
      await api(`/api/manage/accounts/${account.id}`, { method: "PATCH", body: JSON.stringify({ [field]: draft }) });
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

function InlineAccountWebsite({ account }: { account: ManageAccount }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(account.website ?? "");
  const [busy, setBusy] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await api(`/api/manage/accounts/${account.id}`, {
        method: "PATCH",
        body: JSON.stringify({ website: draft }),
      });
      toast.success(draft.trim() ? "Account website updated." : "Account website removed.");
      setEditing(false);
      router.refresh();
    } catch (error) {
      toast.error("Couldn’t update the website", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copyWebsite() {
    if (!account.website) return;
    try {
      await navigator.clipboard.writeText(account.website);
      toast.success("Website copied.");
    } catch {
      toast.error("Couldn’t copy the website", "Your browser blocked clipboard access.");
    }
  }

  if (editing) {
    return (
      <form className="manage-record-inline-form" onSubmit={save}>
        <input
          aria-label="Account website"
          autoFocus
          disabled={busy}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="https://example.com"
          type="url"
          value={draft}
        />
        <button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
        <button type="button" disabled={busy} onClick={() => { setDraft(account.website ?? ""); setEditing(false); }}>Cancel</button>
      </form>
    );
  }

  return (
    <span className="manage-record-inline-field">
      {account.website ? (
        <a href={account.website} target="_blank" rel="noreferrer">
          {account.website.replace(/^https?:\/\//, "")}
        </a>
      ) : (
        <span>Add before enrichment</span>
      )}
      <span className="manage-record-inline-actions">
        <button type="button" onClick={() => { setDraft(account.website ?? ""); setEditing(true); }} aria-label="Edit account website" title="Edit website"><Pencil size={12} /></button>
        {account.website && <button type="button" onClick={() => void copyWebsite()} aria-label="Copy account website" title="Copy website"><Copy size={12} /></button>}
      </span>
    </span>
  );
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
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    data.accounts[0]?.id ?? null,
  );
  const [editing, setEditing] = useState<ManageAccount | null>(null);

  const filtered = data.accounts.filter(
    (account) =>
      (filter === "all" || (account.stage || "unclassified") === filter) &&
      `${account.name} ${account.primaryContact} ${account.primaryEmail}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );

  const selectedAccount =
    data.accounts.find((a) => a.id === selectedAccountId) ?? filtered[0];
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
          <div className="manage-tabs" style={{ "--active-tab": filter === "all" ? 0 : stages.slice(0, 4).indexOf(filter) + 1 } as CSSProperties}>
            <button
              className={filter === "all" ? "active" : ""}
              onClick={() => { setFilter("all"); setPage(1); setSelectedIds(new Set()); }}
            >
              All <span>{data.accounts.length}</span>
            </button>
            {stages.slice(0, 4).map((stage) => (
              <button
                className={filter === stage ? "active" : ""}
                onClick={() => { setFilter(stage); setPage(1); setSelectedIds(new Set()); }}
                key={stage}
              >
                {pretty(stage)}{" "}
                <span>
                  {
                    data.accounts.filter((account) => account.stage === stage)
                      .length
                  }
                </span>
              </button>
            ))}
          </div>
          <AccountRows
            key={`${filter}-${query}`}
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
  const [busy, setBusy] = useState(false);
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const router = useRouter();
  const toast = useToast();
  async function submitComposer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!contact || !composer) return;
    setBusy(true);
    try {
      const form = new FormData(event.currentTarget);
      form.set("organizationId", contact.organizationId);
      await api(composer === "task" ? "/api/manage/tasks" : "/api/manage/activities", { method: "POST", body: JSON.stringify(Object.fromEntries(form)) });
      toast.success(composer === "task" ? "Follow-up task created." : "Note added to the activity record.");
      setComposer(null); setMentionedUserIds([]); router.refresh();
    } catch (error) { toast.error("That didn’t work", error instanceof Error ? error.message : "Please try again."); }
    finally { setBusy(false); }
  }
  if (!contact) {
    return <aside className="manage-panel manage-inspector"><Empty icon={Users} title="No contact selected" copy="Select a contact to see their account and communication details." /></aside>;
  }
  return (
    <aside className="manage-panel manage-inspector manage-contact-inspector">
      <header className="manage-inspector-header">
        <Link href={`/manage/contacts/${contact.id}`} className="manage-inspector-account manage-inspector-record-card" title={`Open ${contact.fullName}`}>
          <span>{initials(contact.fullName)}</span>
          <div><h3>{contact.fullName}</h3><p>{contact.title || "Role not set"}</p></div>
        </Link>
        <button onClick={() => onCompose(contact)} aria-label={`Email ${contact.fullName}`}><Mail size={16} /></button>
      </header>
      <div className="manage-inspector-tabs"><button className="active">Overview</button></div>
      <dl>
        <div><dt>Account</dt><dd><strong>{contact.organizationName}</strong><span>{contact.isPrimary ? "Primary contact" : "Client contact"}</span></dd></div>
        <div><dt>Email</dt><dd><strong>{contact.email}</strong></dd></div>
        <div><dt>Phone</dt><dd><strong>{contact.phone || "Not recorded"}</strong></dd></div>
        <div><dt>Access</dt><dd><Status value={contact.status} /><span>{contact.source === "workspace" ? "Workspace member" : "CRM contact"}</span></dd></div>
        <div><dt>Email marketing</dt><dd><Status value={contact.marketingStatus || "not recorded"} /><span>{contact.marketingConsentAt ? `Recorded ${date(contact.marketingConsentAt, true)}` : "No explicit consent timestamp"}</span></dd></div>
      </dl>
      <div className="manage-inspector-actions">
        {composer ? <form className="manage-inspector-composer" onSubmit={submitComposer}>
          <header><strong>{composer === "task" ? "Add task" : "Add internal note"}</strong><button type="button" onClick={() => { setComposer(null); setMentionedUserIds([]); }} aria-label="Close composer"><X size={15} /></button></header>
          {composer === "task" ? <><label><span>Task</span><input name="title" required autoFocus placeholder="What needs to happen?" /></label><div className="manage-inspector-composer-grid"><label><span>Type</span><CostivraSelect name="taskType" defaultValue="follow_up" options={[{ value: "follow_up", label: "Follow-up" }, { value: "email", label: "Email" }, { value: "call", label: "Call" }, { value: "meeting", label: "Meeting" }, { value: "review", label: "Review" }]} /></label><label><span>Priority</span><CostivraSelect name="priority" defaultValue="normal" options={[{ value: "low", label: "Low" }, { value: "normal", label: "Normal" }, { value: "high", label: "High" }]} /></label></div><label><span>Due</span><CostivraDateTimePicker name="dueAt" /></label><label><span>Notes</span><textarea name="notes" rows={3} placeholder="Optional context" /></label></> : <><input type="hidden" name="mentionedUserIds" value={JSON.stringify(mentionedUserIds)} /><label><span>Title</span><input name="subject" required autoFocus placeholder="What is this note about?" /></label><label><span>Note</span><textarea name="summary" rows={5} placeholder="Write the internal note." /></label><div className="manage-mention-picker"><span>Notify teammate</span>{data.staff.filter((member) => member.id !== data.operator.id).length ? <div>{data.staff.filter((member) => member.id !== data.operator.id).map((member) => { const selected = mentionedUserIds.includes(member.id); return <button type="button" className={selected ? "is-selected" : ""} key={member.id} onClick={() => setMentionedUserIds((current) => selected ? current.filter((id) => id !== member.id) : [...current, member.id])}><AtSign size={13} /> {member.fullName}</button>; })}</div> : <small>No other active internal teammates are available to mention.</small>}</div></>}
          <footer><button type="button" className="manage-button manage-button--quiet" onClick={() => setComposer(null)}>Cancel</button><button className="manage-button manage-button--primary" disabled={busy}>{busy ? "Saving…" : composer === "task" ? "Create task" : "Save note"}</button></footer>
        </form> : <div className="manage-inspector-actions--split"><button className="manage-button manage-button--quiet manage-full" onClick={() => setComposer("task")}><CalendarClock size={15} /> Add task</button><button className="manage-button manage-button--quiet manage-full" onClick={() => setComposer("note")}><MessageSquareText size={15} /> Add note</button></div>}
      </div>
      <p className="manage-inspector-note">Marketing consent is shown separately from workspace access. Costivra will not treat account membership as email consent.</p>
    </aside>
  );
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
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [selectedContactId, setSelectedContactId] = useState<string | null>(data.contacts[0]?.id ?? null);

  const rows = data.contacts.filter((contact) => {
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

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selectedContacts = rows.filter((contact) => selectedIds.has(contact.id));
  const selectedContact = data.contacts.find((contact) => contact.id === selectedContactId) ?? rows[0];

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
        <div className="manage-tabs">
          <button
            className={filter === "all" ? "active" : ""}
            onClick={() => { setFilter("all"); setPage(1); setSelectedIds(new Set()); }}
          >
            All <span>{data.contacts.length}</span>
          </button>
          <button
            className={filter === "primary" ? "active" : ""}
            onClick={() => { setFilter("primary"); setPage(1); setSelectedIds(new Set()); }}
          >
            Primary <span>{data.contacts.filter((c) => c.isPrimary).length}</span>
          </button>
          <button
            className={filter === "workspace" ? "active" : ""}
            onClick={() => { setFilter("workspace"); setPage(1); setSelectedIds(new Set()); }}
          >
            Workspace <span>{data.contacts.filter((c) => c.source === "workspace").length}</span>
          </button>
          <button
            className={filter === "crm" ? "active" : ""}
            onClick={() => { setFilter("crm"); setPage(1); setSelectedIds(new Set()); }}
          >
            CRM <span>{data.contacts.filter((c) => c.source === "crm").length}</span>
          </button>
        </div>
        <div className="manage-table-wrap">
          <table className="manage-data-table manage-contact-data-table">
            <thead><tr>
              <th className="manage-row-number-cell"><BulkHeaderSelector state={pageRows.length && pageRows.every((c) => selectedIds.has(c.id)) ? "all" : pageRows.some((c) => selectedIds.has(c.id)) ? "some" : "none"} onChange={() => setSelectedIds((current) => { const next = new Set(current); const all = pageRows.every((c) => next.has(c.id)); pageRows.forEach((c) => all ? next.delete(c.id) : next.add(c.id)); return next; })} /></th>
              <th className="manage-sticky-column">Contact</th><th>Account</th><th>Role</th><th>Marketing</th><th>Source</th><th aria-label="Actions" />
            </tr></thead>
            <tbody>{pageRows.map((contact, index) => {
              const bulkSelected = selectedIds.has(contact.id);
              return <tr key={contact.id} className={`${selectedContact?.id === contact.id ? "is-selected" : ""}${bulkSelected ? " is-bulk-selected" : ""}`} onClick={() => setSelectedContactId(contact.id)}>
                <td className="manage-row-number-cell"><BulkRowSelector checked={bulkSelected} index={(currentPage - 1) * pageSize + index + 1} label={contact.fullName} onChange={() => setSelectedIds((current) => { const next = new Set(current); if (next.has(contact.id)) next.delete(contact.id); else next.add(contact.id); return next; })} /></td>
                <td className="manage-sticky-column"><Link href={`/manage/contacts/${contact.id}`} className="manage-table-record-card" onClick={(event) => event.stopPropagation()}><span className="manage-person-avatar">{initials(contact.fullName)}</span><span className="manage-table-record-meta"><strong>{contact.fullName}</strong><small>{contact.email}</small></span></Link></td>
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
  return <nav className="manage-record-tabs" aria-label="Record sections">{tabs.map((tab) => <button type="button" key={tab.id} className={active === tab.id ? "is-active" : ""} aria-current={active === tab.id ? "page" : undefined} onClick={() => onChange(tab.id)}>{tab.label}{typeof tab.count === "number" && <span>{tab.count}</span>}</button>)}</nav>;
}

function EnrichmentRefreshButton({
  id,
  enabled,
  available,
  configured,
}: {
  id: string;
  enabled: boolean;
  available: boolean;
  configured: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const label = "Refresh company profile";
  const unavailableCopy = "Add an account website before looking up a company profile.";
  if (!available) return <span className="manage-record-source-note">Apollo enrichment is ready after the CRM migration is applied.</span>;
  if (!configured) return <span className="manage-record-source-note">Add the server-side Apollo key before refreshing company profiles.</span>;
  return <button className="manage-button manage-button--quiet manage-record-refresh" type="button" disabled={busy || !enabled} title={!enabled ? unavailableCopy : label} onClick={async () => {
    setBusy(true);
    try {
      const response = await fetch(`/api/manage/accounts/${id}/enrichment`, { method: "POST" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "The profile could not be refreshed.");
      toast.success(payload?.cached ? "Profile is already current" : "Profile refreshed");
      router.refresh();
    } catch (error) {
      toast.error("Couldn’t refresh profile", error instanceof Error ? error.message : "Try again later.");
    } finally {
      setBusy(false);
    }
  }}><RefreshCw size={14} className={busy ? "spin" : undefined} /> {busy ? "Refreshing…" : label}</button>;
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
  return <div className="manage-vendor-list" role="list" aria-label="Account vendors">{vendors.map((vendor) => <button type="button" role="listitem" key={vendor.id} className={`manage-vendor-row ${selectedId === vendor.id ? "is-active" : ""}`} onClick={() => onSelect(vendor.id)}><CompanyLogo entity="vendor" id={vendor.vendorId} name={vendor.name} className="manage-vendor-row__logo" /><span className="manage-vendor-row__identity"><strong>{vendor.name}</strong><small>{vendor.category || "Uncategorized"} · {pretty(vendor.relationshipStatus)}</small></span><span className="manage-vendor-row__spend"><small>Recorded</small><strong>{money(vendor.recordedSpend, currency)}</strong></span><ChevronRight size={16} /></button>)}</div>;
}

function VendorWorkspace({ vendors, expenses, contracts, documents, currency, selectedId, onSelect }: { vendors: ManageVendorRelationship[]; expenses: ManageData["expenses"]; contracts: ManageData["vendorContracts"]; documents: ManageData["documents"]; currency: string; selectedId: string | null; onSelect: (id: string) => void }) {
  const selected = vendors.find((vendor) => vendor.id === selectedId) || vendors[0] || null;
  if (!selected) return <section className="manage-panel manage-record-tab-panel"><Empty icon={Building2} title="No vendors linked yet" copy="Vendor relationships will appear here when they are linked to this account." /></section>;
  const vendorExpenses = expenses.filter((expense) => expense.vendorRelationshipId === selected.id);
  const vendorContracts = contracts.filter((contract) => contract.vendorRelationshipId === selected.id);
  const vendorDocuments = documents.filter((document) => document.vendorRelationshipId === selected.id);
  return <section className="manage-vendor-workspace"><div className="manage-vendor-workspace__collection"><header><div><span>Vendor directory</span><h3>{vendors.length} linked vendor{vendors.length === 1 ? "" : "s"}</h3></div></header><VendorList vendors={vendors} selectedId={selected.id} onSelect={onSelect} currency={currency} /></div><article className="manage-vendor-detail"><header className="manage-vendor-detail__heading"><CompanyLogo entity="vendor" id={selected.vendorId} name={selected.name} className="manage-vendor-detail__logo" /><div><span>Vendor detail</span><h3>{selected.name}</h3><p>{selected.category || "Uncategorized"} · {pretty(selected.relationshipStatus)}</p></div>{selected.website && <a href={selected.website.startsWith("http") ? selected.website : `https://${selected.website}`} target="_blank" rel="noreferrer">Website <ChevronRight size={14} /></a>}</header><div className="manage-vendor-detail__metrics"><div><span>Recorded spend</span><strong>{money(selected.recordedSpend, currency)}</strong></div><div><span>Annualized spend</span><strong>{money(selected.annualizedSpend, currency)}</strong></div><div><span>Expense records</span><strong>{selected.expenseCount}</strong></div><div><span>Contracts</span><strong>{selected.contractCount}</strong></div></div><CostTrend title={`${selected.name} cost history`} expenses={vendorExpenses} currency={currency} /><section className="manage-vendor-detail__section"><header><h4>Associated details</h4><p>Current records connected to this vendor relationship.</p></header><dl><div><dt>Spend cadence</dt><dd>{pretty(selected.spendCadence)}</dd></div><div><dt>Next contract end</dt><dd>{selected.nextContractEnd ? date(selected.nextContractEnd) : "Not recorded"}</dd></div><div><dt>Source documents</dt><dd>{vendorDocuments.length}</dd></div></dl></section>{vendorContracts.length > 0 && <section className="manage-vendor-detail__section"><header><h4>Contracts</h4><p>Contract dates and values are shown as recorded.</p></header><div className="manage-vendor-contracts">{vendorContracts.map((contract) => <div key={contract.id}><span><strong>{contract.title}</strong><small>{contract.category || "Uncategorized"} · {pretty(contract.status)}</small></span><span><strong>{money(contract.annualValue, contract.currency || currency)}</strong><small>{contract.endDate ? `Ends ${date(contract.endDate)}` : "End date not recorded"}{contract.autoRenews ? " · Auto-renews" : ""}</small></span></div>)}</div></section>}</article></section>;
}

function AccountDetailPage({ data, accountId, onCompose }: { data: ManageData; accountId: string; onCompose: (contact: ManageContact) => void }) {
  const account = data.accounts.find((item) => item.id === accountId);
  const [active, setActive] = useState("overview");
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  if (!account) return <Empty icon={Building2} title="Account not found" copy="This account may have been removed or is not visible to this internal operator." action={<Link className="manage-button manage-button--quiet" href="/manage/accounts"><ArrowLeft size={15} /> Back to accounts</Link>} />;
  const contacts = data.contacts.filter((item) => item.organizationId === account.id);
  const activities = data.activities.filter((item) => item.organizationId === account.id);
  const tasks = data.tasks.filter((item) => item.organizationId === account.id);
  const documents = data.documents.filter((item) => item.organizationId === account.id);
  const vendors = data.vendorRelationships.filter((item) => item.organizationId === account.id);
  const expenses = data.expenses.filter((item) => item.organizationId === account.id);
  const vendorContracts = data.vendorContracts.filter((item) => item.organizationId === account.id);
  const profile = account.enrichment;
  const profileSummary = profile?.shortDescription || (account.industry ? `${account.name} is recorded in the ${account.industry} industry.` : "Add the account website or a short internal note to make this record easier to recognize at a glance.");
  const accountTabs = [{ id: "overview", label: "Overview" }, { id: "vendors", label: "Vendors", count: vendors.length }, { id: "people", label: "People", count: contacts.length }, { id: "files", label: "Files", count: documents.length }, { id: "activity", label: "Activity", count: activities.length }, { id: "work", label: "Work", count: tasks.length }];
  return <div className="manage-detail-page manage-record-page motion-page">
    <Link href="/manage/accounts" className="manage-back-link"><ArrowLeft size={15} /> Accounts</Link>
    <header className="manage-record-heading"><div className="manage-record-identity"><CompanyLogo entity="organization" id={account.id} name={account.name} className="manage-record-logo" /><div><p>Client account</p><h2>{account.name}</h2><span>{account.legalName || account.industry || "Account profile"}</span></div></div><div className="manage-record-actions"><EnrichmentRefreshButton id={account.id} enabled={Boolean(account.website)} available={data.enrichmentAvailable} configured={data.enrichmentConfigured} /><Link href={`/manage/accounts?account=${account.id}`} className="manage-button manage-button--quiet">Open list</Link></div></header>
    <section className="manage-record-highlights" aria-label="Account highlights"><div><span>Lifecycle</span><Status value={account.stage || "unclassified"} /></div><div><span>Next step</span><strong>{account.nextStep || "Not set"}</strong></div><div><span>Follow-up</span><strong>{account.nextFollowUpAt ? date(account.nextFollowUpAt) : "Not scheduled"}</strong></div><div><span>Vendors</span><strong>{vendors.length}</strong></div><div><span>Open work</span><strong>{account.openTaskCount}</strong></div><div><span>Evidence files</span><strong>{documents.length}</strong></div></section>
    <RecordTabs tabs={accountTabs} active={active} onChange={setActive} />
    {active === "overview" && <div className="manage-record-layout"><aside className="manage-record-rail"><section><span>Account details</span><dl><div><dt>Industry</dt><dd>{account.industry || "Not set"}</dd></div><div><dt>Website</dt><dd><InlineAccountWebsite account={account} /></dd></div><div><dt>Primary contact</dt><dd>{account.primaryContact || "Not set"}</dd></div><div><dt>Account since</dt><dd>{date(account.createdAt)}</dd></div></dl></section><section><span>Internal CRM</span><p>{account.privateNotes || "No private account note yet."}</p></section></aside><main className="manage-record-main"><section className="manage-record-profile"><div><span>Company profile</span><h3>{profile ? "Apollo enrichment · internal CRM context" : "Account context"}</h3><p>{profileSummary}</p></div>{profile && <dl><div><dt>Profile status</dt><dd>{pretty(profile.status)}</dd></div>{profile.location && <div><dt>Location</dt><dd>{profile.location}</dd></div>}{profile.employeeCount != null && <div><dt>Team size</dt><dd>{profile.employeeCount.toLocaleString()}</dd></div>}{profile.fetchedAt && <div><dt>Updated</dt><dd>{date(profile.fetchedAt)}</dd></div>}</dl>}</section><div className="manage-vendor-overview"><CostTrend expenses={expenses} currency={account.currency} /><section className="manage-panel manage-vendor-preview"><header><div><h3>Linked vendors</h3><p>Spend, contracts, and source evidence by vendor.</p></div><button type="button" className="manage-button manage-button--quiet" onClick={() => setActive("vendors")}>View all</button></header>{vendors.length ? <VendorList vendors={vendors.slice(0, 3)} selectedId={null} onSelect={(id) => { setSelectedVendorId(id); setActive("vendors"); }} currency={account.currency} /> : <Empty icon={Building2} title="No vendor relationships" copy="Link a vendor to see its cost records here." />}</section></div><section className="manage-panel manage-record-overview-panel"><header><div><h3>Relationship snapshot</h3><p>Keep people, vendors, files, and activity close together.</p></div></header><div className="manage-record-snapshot"><button type="button" onClick={() => setActive("people")}><Users size={16} /><span><strong>{contacts.length}</strong> people</span><ChevronRight size={15} /></button><button type="button" onClick={() => setActive("vendors")}><Building2 size={16} /><span><strong>{vendors.length}</strong> vendors</span><ChevronRight size={15} /></button><button type="button" onClick={() => setActive("files")}><FileText size={16} /><span><strong>{documents.length}</strong> source files</span><ChevronRight size={15} /></button></div></section></main></div>}
    {active === "vendors" && <VendorWorkspace vendors={vendors} expenses={expenses} contracts={vendorContracts} documents={documents} currency={account.currency} selectedId={selectedVendorId} onSelect={setSelectedVendorId} />}
    {active === "people" && <section className="manage-panel manage-record-tab-panel"><header><div><h3>People</h3><p>Contacts connected to this account. Compose and record actions stay explicit.</p></div></header>{contacts.length ? <div className="manage-record-person-list">{contacts.map((contact) => <article key={contact.id}><span className="manage-person-avatar">{initials(contact.fullName)}</span><div><Link href={`/manage/contacts/${contact.id}`}><strong>{contact.fullName}</strong></Link><p>{contact.title || "Role not set"} · {contact.email}</p></div>{contact.isPrimary && <span className="manage-record-primary">Primary</span>}<button className="manage-icon-button" onClick={() => onCompose(contact)} aria-label={`Email ${contact.fullName}`}><Mail size={15} /></button></article>)}</div> : <Empty icon={Users} title="No contacts" copy="Add a real client contact to this account." />}</section>}
    {active === "files" && <RecordFilesWorkspace title="Account files" description="A clean, searchable view of this client’s private source documents. Collections never change the immutable storage record." files={documents.map((item) => ({ id: item.id, name: item.originalFilename, documentType: item.documentType, mimeType: item.mimeType, status: item.status, createdAt: item.createdAt, updatedAt: item.updatedAt, byteSize: item.byteSize, pageCount: item.pageCount, summary: item.summary, confidence: item.confidence, extractionStatus: item.extractionStatus, extractionInputMode: item.extractionInputMode, extractionFailureCode: item.extractionFailureCode, contextLabel: account.name, href: `/api/manage/documents/${item.id}/download`, retryHref: item.extractionStatus === "failed" && !item.sourcePurgedAt ? `/api/manage/documents/${item.id}/retry-extraction` : null, sourceAvailable: !item.sourcePurgedAt }))} />}
    {active === "activity" && <section className="manage-panel manage-record-tab-panel"><header><div><h3>Relationship activity</h3><p>Internal notes, outreach, and client touches for this account.</p></div></header>{activities.length ? <ActivityList activities={activities} /> : <Empty icon={Activity} title="No activity yet" copy="Internal notes and client interactions will appear here." />}</section>}
    {active === "work" && <section className="manage-panel manage-record-tab-panel"><header><div><h3>Follow-up work</h3><p>Open and completed outreach tasks.</p></div></header>{tasks.length ? <TaskList tasks={tasks} /> : <Empty icon={CalendarClock} title="No follow-up work" copy="Create a task when this account needs an internal next step." />}</section>}
  </div>;
}

function ContactDetailPage({ data, contactId, onCompose }: { data: ManageData; contactId: string; onCompose: (contact: ManageContact) => void }) {
  const contact = data.contacts.find((item) => item.id === contactId);
  const [active, setActive] = useState("overview");
  if (!contact) return <Empty icon={Users} title="Contact not found" copy="This contact may have been removed or is not visible to this internal operator." action={<Link className="manage-button manage-button--quiet" href="/manage/contacts"><ArrowLeft size={15} /> Back to contacts</Link>} />;
  const activities = data.activities.filter((item) => item.organizationId === contact.organizationId);
  const tasks = data.tasks.filter((item) => item.organizationId === contact.organizationId && item.contactId === contact.id);
  const documents = data.documents.filter((item) => item.organizationId === contact.organizationId);
  const tabs = [{ id: "overview", label: "Overview" }, { id: "files", label: "Shared files", count: documents.length }, { id: "activity", label: "Activity", count: activities.length }, { id: "work", label: "Tasks", count: tasks.length }];
  return <div className="manage-detail-page manage-record-page motion-page"><Link href="/manage/contacts" className="manage-back-link"><ArrowLeft size={15} /> Contacts</Link><header className="manage-record-heading"><div className="manage-record-identity"><span className="manage-record-person-avatar">{initials(contact.fullName)}</span><div><p>Client contact</p><h2>{contact.fullName}</h2><span>{contact.title || "Role not set"} · {contact.organizationName}</span></div></div><div className="manage-record-actions"><button className="manage-button manage-button--primary" onClick={() => onCompose(contact)}><Mail size={15} /> Compose email</button></div></header><section className="manage-record-highlights manage-record-highlights--contact"><div><span>Account</span><strong>{contact.organizationName}</strong></div><div><span>Relationship</span><strong>{contact.isPrimary ? "Primary contact" : "Client contact"}</strong></div><div><span>Marketing consent</span><strong>{contact.marketingStatus ? pretty(contact.marketingStatus) : "Not recorded"}</strong></div><div><span>Shared files</span><strong>{documents.length}</strong></div></section><RecordTabs tabs={tabs} active={active} onChange={setActive} />
    {active === "overview" && <div className="manage-record-layout"><aside className="manage-record-rail"><section><span>Contact details</span><dl><div><dt>Account</dt><dd><Link href={`/manage/accounts/${contact.organizationId}`}>{contact.organizationName}</Link></dd></div><div><dt>Email</dt><dd>{contact.email}</dd></div><div><dt>Phone</dt><dd>{contact.phone || "Not recorded"}</dd></div><div><dt>Source</dt><dd>{contact.source === "workspace" ? "Workspace member" : "CRM contact"}</dd></div></dl></section></aside><main className="manage-record-main"><section className="manage-record-profile"><div><span>Relationship context</span><h3>Contact record</h3><p>The structured CRM fields above remain the source of truth. External profile enrichment is not enabled until Costivra has a purpose-specific data-sharing consent flow.</p></div></section><section className="manage-panel manage-record-overview-panel"><header><div><h3>Relationship readiness</h3><p>See the information an operator needs before reaching out.</p></div></header><dl className="manage-detail-list"><div><dt>Access status</dt><dd><Status value={contact.status} /></dd></div><div><dt>Marketing consent</dt><dd>{contact.marketingStatus ? pretty(contact.marketingStatus) : "Not recorded"}</dd></div><div><dt>Account activity</dt><dd>{activities.length} recorded event{activities.length === 1 ? "" : "s"}</dd></div></dl></section></main></div>}
    {active === "files" && <RecordFilesWorkspace title="Account source files" description="These files belong to the client account. Contact-specific email attachments stay in the mail workspace so their mailbox permissions remain intact." files={documents.map((item) => ({ id: item.id, name: item.originalFilename, documentType: item.documentType, mimeType: item.mimeType, status: item.status, createdAt: item.createdAt, updatedAt: item.updatedAt, byteSize: item.byteSize, pageCount: item.pageCount, summary: item.summary, confidence: item.confidence, extractionStatus: item.extractionStatus, extractionInputMode: item.extractionInputMode, extractionFailureCode: item.extractionFailureCode, contextLabel: contact.organizationName, href: `/api/manage/documents/${item.id}/download`, retryHref: item.extractionStatus === "failed" && !item.sourcePurgedAt ? `/api/manage/documents/${item.id}/retry-extraction` : null, sourceAvailable: !item.sourcePurgedAt }))} emptyCopy="No account source files are available to this internal record yet." />}
    {active === "activity" && <section className="manage-panel manage-record-tab-panel"><header><div><h3>Account activity</h3><p>Recent account-level activity provides relationship context.</p></div></header>{activities.length ? <ActivityList activities={activities} /> : <Empty icon={Activity} title="No activity yet" copy="Internal notes and client interactions will appear here." />}</section>}
    {active === "work" && <section className="manage-panel manage-record-tab-panel"><header><div><h3>Tasks for {contact.fullName}</h3><p>Only work explicitly linked to this CRM contact is shown.</p></div></header>{tasks.length ? <TaskList tasks={tasks} /> : <Empty icon={CalendarClock} title="No contact tasks" copy="Assign a task to this contact when there is a clear next step." />}</section>}
  </div>;
}

function Outreach({
  data,
  query,
  run,
  onTask,
  onNote,
}: {
  data: ManageData;
  query: string;
  run: (work: () => Promise<unknown>, success: string) => Promise<void>;
  onTask: () => void;
  onNote: () => void;
}) {
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const tasks = data.tasks.filter((task) => {
    const matchesPriority =
      priorityFilter === "all" || task.priority === priorityFilter;
    const matchesQuery = `${task.title} ${task.organizationName} ${task.notes || ""}`
      .toLowerCase()
      .includes(query.toLowerCase());
    return matchesPriority && matchesQuery;
  });

  const exportTasksCsv = () => {
    const exportRows = tasks.map((t) => ({
      ID: t.id,
      Organization: t.organizationName,
      Title: t.title,
      Type: t.taskType,
      Priority: t.priority,
      Status: t.status,
      DueAt: t.dueAt ?? "",
      Notes: t.notes ?? "",
      CreatedAt: t.createdAt,
    }));
    downloadCsv(`costivra-tasks-${new Date().toISOString().slice(0, 10)}.csv`, exportRows);
  };

  return (
    <>
      <section className="manage-page-heading">
        <div>
          <h2>Outreach</h2>
          <p>
            Follow-ups, calls, meetings, and review work—without automated
            blasting.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            className="manage-button manage-button--quiet"
            onClick={exportTasksCsv}
            title="Export tasks to CSV"
          >
            <Download size={15} /> Export CSV
          </button>
          <button
            className="manage-button manage-button--quiet"
            onClick={onNote}
          >
            <FileText size={16} /> Add note
          </button>
          <button
            className="manage-button manage-button--primary"
            onClick={onTask}
          >
            <Plus size={16} /> Add task
          </button>
        </div>
      </section>
      <div className="manage-tabs" style={{ marginBottom: 16, borderBottom: "1px solid #edf0f3" }}>
        <button
          className={priorityFilter === "all" ? "active" : ""}
          onClick={() => setPriorityFilter("all")}
        >
          All Tasks <span>{data.tasks.length}</span>
        </button>
        <button
          className={priorityFilter === "high" ? "active" : ""}
          onClick={() => setPriorityFilter("high")}
        >
          High Priority <span>{data.tasks.filter((t) => t.priority === "high").length}</span>
        </button>
        <button
          className={priorityFilter === "normal" ? "active" : ""}
          onClick={() => setPriorityFilter("normal")}
        >
          Normal Priority <span>{data.tasks.filter((t) => t.priority === "normal").length}</span>
        </button>
        <button
          className={priorityFilter === "low" ? "active" : ""}
          onClick={() => setPriorityFilter("low")}
        >
          Low Priority <span>{data.tasks.filter((t) => t.priority === "low").length}</span>
        </button>
      </div>
      <section className="manage-outreach-board">
        {["open", "in_progress", "completed"].map((status) => (
          <div className="manage-task-column" key={status}>
            <header>
              <div>
                <i className={`task-dot task-dot--${status}`} />
                <h3>{pretty(status)}</h3>
              </div>
              <span>
                {tasks.filter((task) => task.status === status).length}
              </span>
            </header>
            <div>
              {tasks
                .filter((task) => task.status === status)
                .map((task) => (
                  <article key={task.id}>
                    <div>
                      <span
                        className={`manage-priority manage-priority--${task.priority}`}
                      >
                        {task.priority}
                      </span>
                      <small>{pretty(task.taskType)}</small>
                    </div>
                    <h4>{task.title}</h4>
                    <p><strong>{task.organizationName}</strong></p>
                    {task.notes && (
                      <p style={{ marginTop: 4, color: "#667085", fontSize: "0.64rem", lineHeight: 1.4 }}>
                        {task.notes}
                      </p>
                    )}
                    <footer>
                      <span>
                        <Clock3 size={14} /> {date(task.dueAt)}
                      </span>
                      {status !== "completed" && (
                        <button
                          onClick={() =>
                            void run(
                              () =>
                                api(`/api/manage/tasks/${task.id}`, {
                                  method: "PATCH",
                                  body: JSON.stringify({ status: "completed" }),
                                }),
                              "Task completed.",
                            )
                          }
                          aria-label={`Complete ${task.title}`}
                          title="Mark task completed"
                        >
                          <Check size={15} />
                        </button>
                      )}
                    </footer>
                  </article>
                ))}
              {!tasks.some((task) => task.status === status) && (
                <p className="manage-column-empty">
                  No {pretty(status).toLowerCase()} tasks.
                </p>
              )}
            </div>
          </div>
        ))}
      </section>
    </>
  );
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

  return (
    <div className="manage-settings-layout">
      <section className="manage-page-heading">
        <div>
          <p>Your profile and Costivra communication setup.</p>
          <h2>Settings</h2>
        </div>
      </section>
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
  const timestamp = message.sentAt || message.receivedAt || message.createdAt;

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
          <pre>{message.textBody || "No plain-text body was available."}</pre>
          {message.attachments.length > 0 && (
            <div className="manage-attachments">
              {message.attachments.map((attachment) => {
                const ready = attachment.id && attachment.status === "clean";
                const content = <><Paperclip size={14} /> <span>{attachment.filename}</span>{attachment.status && attachment.status !== "clean" && <small>{attachment.status === "infected" ? "Blocked" : "Scanning"}</small>}</>;
                return ready
                  ? <a href={`/api/manage/mail/attachments/${attachment.id}`} target="_blank" rel="noreferrer" key={attachment.id}>{content}</a>
                  : <span className="is-unavailable" title="This attachment is waiting for a security scan." key={attachment.id || attachment.filename}>{content}</span>;
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
                `/manage/mail?folder=${data.mail.folder}&mailbox=${val}`,
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
      <div className={`manage-mail-shell${current ? " has-thread" : ""}`}>
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
                href={`/manage/accounts?account=${current.organizationId}`}
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
      </div>
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
        <article key={task.id}>
          <span
            className={`manage-task-icon manage-task-icon--${task.priority}`}
          >
            <CalendarClock size={16} />
          </span>
          <div>
            <strong>{task.title}</strong>
            <p>{task.organizationName}</p>
          </div>
          <time>{date(task.dueAt)}</time>
        </article>
      ))}
    </div>
  );
}
function ActivityList({
  activities,
}: {
  activities: ManageData["activities"];
}) {
  return (
    <div className="manage-activity-list">
      {activities.map((item) => (
        <article key={item.id}>
          <span>
            <Activity size={15} />
          </span>
          <div>
            <strong>{item.subject}</strong>
            <p>{item.summary || pretty(item.kind)}</p>
            <small>{item.organizationName}</small>
          </div>
          <time>{date(item.occurredAt, true)}</time>
        </article>
      ))}
    </div>
  );
}

function AccountForm({
  busy,
  onClose,
  onSubmit,
}: {
  busy: boolean;
  onClose: () => void;
  onSubmit: (form: FormData) => void;
}) {
  return (
    <Modal
      title="Add a real account"
      copy="This creates a live Supabase organization. It does not create a customer login or send an invitation."
      onClose={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(new FormData(event.currentTarget));
        }}
      >
        <div className="manage-form-grid">
          <label>
            <span>Account name *</span>
            <input name="name" required autoFocus />
          </label>
          <label>
            <span>Legal name</span>
            <input name="legalName" />
          </label>
          <label>
            <span>Industry</span>
            <input name="industry" />
          </label>
          <label>
            <span>Account website</span>
            <input name="website" type="url" placeholder="https://example.com" />
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
    </Modal>
  );
}
function ContactForm({
  data,
  busy,
  onClose,
  onSubmit,
}: {
  data: ManageData;
  busy: boolean;
  onClose: () => void;
  onSubmit: (form: FormData) => void;
}) {
  return (
    <Modal
      title="Add client contact"
      copy="Use a real business contact. No invitation or email is sent."
      onClose={onClose}
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
          <label>
            <span>Full name *</span>
            <input name="fullName" required />
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
    </Modal>
  );
}
function TaskForm({
  data,
  defaultAccount,
  busy,
  onClose,
  onSubmit,
}: {
  data: ManageData;
  defaultAccount?: ManageAccount | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (form: FormData) => void;
}) {
  return (
    <Modal
      title="Create follow-up"
      copy="Tasks stay internal until you deliberately call, meet, or send an email."
      onClose={onClose}
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
  onSubmit,
}: {
  data: ManageData;
  defaultAccount?: ManageAccount | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (form: FormData) => void;
}) {
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const staff = data.staff.filter((member) => member.id !== data.operator.id);
  return (
    <Modal
      title="Add internal note"
      copy="Notes are owner-only CRM history. They are never shown in the customer portal."
      onClose={onClose}
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
  busy,
  onClose,
  onSubmit,
}: {
  busy: boolean;
  onClose: () => void;
  onSubmit: (form: FormData) => void;
}) {
  return (
    <Modal
      title="Create mailbox seat"
      copy="This address can send and receive inside the Costivra CRM."
      onClose={onClose}
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
              <strong>@costivra.ai</strong>
            </div>
          </label>
          <label className="wide">
            <span>Seat type</span>
            <CostivraSelect
              name="mailboxType"
              defaultValue="personal"
              options={[
                { value: "personal", label: "Personal mailbox" },
                { value: "shared", label: "Shared team mailbox" },
              ]}
            />
          </label>
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
  const [busy, setBusy] = useState(false);
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
    if (mode === "send" && splitRecipientValues(String(form.get("to") || "")).length === 0) {
      toast.error("Add a recipient", "Choose a contact or enter an email address before sending.");
      return;
    }
    form.set("body", editorRef.current?.innerText ?? "");
    form.set("htmlBody", editorRef.current?.innerHTML ?? "");
    form.set("mode", mode);
    form.set("idempotencyKey", crypto.randomUUID());
    if (mode === "draft") form.delete("attachments");
    setBusy(true);
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
        router.push(destination);
        router.refresh();
      });
    } catch (error) {
      toast.error(
        mode === "draft" ? "Draft was not saved" : "Email was not sent",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setBusy(false);
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
        body: JSON.stringify({ instruction: draftInstruction, recipientEmail, subject: currentSubject }),
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
    const hasDraftContent = Boolean(
      form && (
        ["to", "subject"].some((name) => String(formData?.get(name) || "").trim()) ||
        editorRef.current?.innerText.trim()
      ),
    );
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
              {busy ? "Sending…" : scheduledAt ? "Schedule" : "Send"}
              <Send size={16} />
            </button>
          </div>
        </footer>
        </div>
      </form>
    </div>
  );
}
