"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Building2,
  ChartNoAxesCombined,
  CheckSquare2,
  ChevronsUpDown,
  FileStack,
  FileText,
  LayoutDashboard,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  ReceiptText,
  Settings,
  ShieldCheck,
  Target,
  Upload,
} from "lucide-react";
import type { ReactNode } from "react";
import { Brand } from "@/components/brand";
import { CompanyLogo } from "@/components/company-logo";
import { useToast } from "@/components/toast-provider";
import type { PortalData } from "@/lib/portal/types";
import { createClient } from "@/lib/supabase/client";
import { opportunityTrustLabel } from "@/lib/domain/opportunity-trust";

import { ClientAssistantProvider, useClientAssistant } from "@/components/client-assistant/client-assistant-provider";
import { ClientAssistantTrigger } from "@/components/client-assistant/client-assistant-trigger";
import { ClientAssistantSurface } from "@/components/client-assistant/client-assistant-surface";

import type { ElementType } from "react";

const APP_SIDEBAR_PREFERENCE_KEY = "costivra.app.sidebar-collapsed";

export interface NavigationGroup {
  section?: string;
  items: readonly (readonly [string, string, ElementType])[];
}

export const navigationGroups: readonly NavigationGroup[] = [
  {
    items: [["Command Center", "/app", LayoutDashboard]],
  },
  {
    section: "MONITOR",
    items: [
      ["Vendors", "/app/vendors", Building2],
      ["Bills & Spend", "/app/bills", ReceiptText],
      ["Contracts", "/app/contracts", FileText],
    ],
  },
  {
    section: "OPTIMIZE",
    items: [
      ["Findings", "/app/findings", Target],
      ["Actions", "/app/actions", CheckSquare2],
    ],
  },
  {
    section: "PROVE",
    items: [
      ["Results", "/app/results", ChartNoAxesCombined],
    ],
  },
  {
    items: [["Settings", "/app/settings", Settings]],
  },
];

export const primaryNavigationItems = navigationGroups.flatMap((g) => g.items);

export function isRouteActive(navHref: string, pathname: string): boolean {
  if (navHref === "/app") {
    return pathname === "/app";
  }
  if (navHref === "/app/vendors") {
    return pathname.startsWith("/app/vendors");
  }
  if (navHref === "/app/bills") {
    return (
      pathname.startsWith("/app/bills") ||
      pathname.startsWith("/app/expenses") ||
      pathname.startsWith("/app/documents")
    );
  }
  if (navHref === "/app/contracts") {
    return pathname.startsWith("/app/contracts");
  }
  if (navHref === "/app/findings") {
    return (
      pathname.startsWith("/app/findings") ||
      pathname.startsWith("/app/opportunities")
    );
  }
  if (navHref === "/app/actions") {
    return pathname.startsWith("/app/actions");
  }
  if (navHref === "/app/results") {
    return (
      pathname.startsWith("/app/results") ||
      pathname.startsWith("/app/savings") ||
      pathname.startsWith("/app/reports")
    );
  }
  if (navHref === "/app/settings") {
    return pathname.startsWith("/app/settings");
  }
  return pathname.startsWith(navHref);
}

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Search, X } from "lucide-react";

export interface AppSearchResult {
  id: string;
  category: "vendors" | "bills" | "contracts" | "findings" | "actions" | "documents" | "expenses";
  title: string;
  detail: string;
  href: string;
}

export const searchCategoryLabels: Record<AppSearchResult["category"], string> = {
  vendors: "Vendors",
  bills: "Bills",
  contracts: "Contracts",
  findings: "Findings",
  actions: "Actions",
  documents: "Source files",
  expenses: "Spend records",
};

export const searchCategoryIcons = {
  vendors: Building2,
  bills: ReceiptText,
  contracts: FileText,
  findings: Target,
  actions: CheckSquare2,
  documents: FileStack,
  expenses: ReceiptText,
};

function appSearchResults(data: PortalData, query: string) {
  const term = query.trim().toLowerCase();
  if (!term) return [] as AppSearchResult[];

  const results: AppSearchResult[] = [];

  // 1. Vendors
  for (const v of data.vendors) {
    if (
      v.name.toLowerCase().includes(term) ||
      (v.category && v.category.toLowerCase().includes(term))
    ) {
      results.push({
        id: v.id,
        category: "vendors",
        title: v.name,
        detail: `${v.category || "Vendor relationship"} • Vendor`,
        href: `/app/vendors/${v.id}`,
      });
    }
  }

  // 2. Bills (Invoices)
  for (const inv of data.invoices) {
    if (
      inv.vendorName.toLowerCase().includes(term) ||
      (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(term))
    ) {
      results.push({
        id: inv.id,
        category: "bills",
        title: `${inv.vendorName} bill ${inv.invoiceNumber || inv.id.slice(0, 8)}`,
        detail: `${new Intl.NumberFormat("en-US", { style: "currency", currency: data.organization.currency }).format(inv.totalAmount ?? 0)} · ${inv.reviewStatus}`,
        href: `/app/bills/${inv.id}`,
      });
    }
  }

  // 3. Contracts
  for (const c of data.contracts) {
    if (
      c.title.toLowerCase().includes(term) ||
      c.vendorName.toLowerCase().includes(term) ||
      (c.category && c.category.toLowerCase().includes(term))
    ) {
      results.push({
        id: c.id,
        category: "contracts",
        title: c.title,
        detail: `${c.vendorName} • Contract`,
        href: `/app/contracts/${c.id}`,
      });
    }
  }

  // 4. Findings (Opportunities)
  for (const opp of data.opportunities) {
    if (
      opp.title.toLowerCase().includes(term) ||
      opp.vendorName.toLowerCase().includes(term) ||
      (opp.summary && opp.summary.toLowerCase().includes(term))
    ) {
      results.push({
        id: opp.id,
        category: "findings",
        title: opp.title,
        detail: `${opp.vendorName} · ${opportunityTrustLabel(opp.trustState)}`,
        href: `/app/findings/${opp.id}`,
      });
    }
  }

  // 5. Actions
  for (const act of data.actions) {
    if (
      act.title.toLowerCase().includes(term) ||
      act.vendorName.toLowerCase().includes(term)
    ) {
      results.push({
        id: act.id,
        category: "actions",
        title: act.title,
        detail: `${act.vendorName} · ${act.status}`,
        href: `/app/actions/${act.id}`,
      });
    }
  }

  // 6. Source Documents (optional secondary)
  for (const d of data.documents) {
    if (
      d.originalFilename.toLowerCase().includes(term) ||
      d.vendorName.toLowerCase().includes(term)
    ) {
      results.push({
        id: d.id,
        category: "documents",
        title: d.originalFilename,
        detail: `${d.vendorName} • Source file`,
        href: `/app/documents/${d.id}`,
      });
    }
  }

  // 7. Spend Records (optional secondary)
  for (const e of data.expenses) {
    if (
      e.vendorName.toLowerCase().includes(term) ||
      (e.category && e.category.toLowerCase().includes(term))
    ) {
      results.push({
        id: e.id,
        category: "expenses",
        title: `${e.vendorName} - ${new Intl.NumberFormat("en-US", { style: "currency", currency: data.organization.currency }).format(e.amount)}`,
        detail: `${e.category || "Uncategorized"} • Spend record`,
        href: `/app/expenses/${e.id}`,
      });
    }
  }

  return results;
}

function AppShellContent({ children, data }: { children: ReactNode; data: PortalData }) {
  const { state: assistantState } = useClientAssistant();
  const isDrawerOpen = assistantState.mode === "drawer";
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [orgOpen, setOrgOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchClosing, setSearchClosing] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarPreferenceLoaded, setSidebarPreferenceLoaded] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initializationFrame = window.requestAnimationFrame(() => {
      try {
        setSidebarCollapsed(window.sessionStorage.getItem(APP_SIDEBAR_PREFERENCE_KEY) === "true");
      } catch {
        // Keep the expanded default when session storage is unavailable.
      } finally {
        setSidebarPreferenceLoaded(true);
      }
    });
    return () => window.cancelAnimationFrame(initializationFrame);
  }, []);

  useEffect(() => {
    if (!sidebarPreferenceLoaded) return;
    try {
      window.sessionStorage.setItem(APP_SIDEBAR_PREFERENCE_KEY, String(sidebarCollapsed));
    } catch {
      // Sidebar state remains usable when session storage is unavailable.
    }
  }, [sidebarCollapsed, sidebarPreferenceLoaded]);

  const appHeader = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    const section = segments[1] ?? "home";
    const detailId = segments[2];
    const sectionTitles: Record<string, string> = {
      home: "Command Center",
      vendors: "Vendors",
      bills: "Bills & Spend",
      expenses: "Spend",
      documents: "Source Files",
      contracts: "Contracts",
      findings: "Findings",
      opportunities: "Findings",
      actions: "Actions",
      results: "Results",
      savings: "Results",
      reports: "Reports",
      settings: "Settings",
      integrations: "Integrations",
      team: "Team & approvals",
      ask: "Ask Costivra",
    };
    const descriptions: Record<string, string> = {
      home: `A live operating view of ${data.organization.name}'s recurring costs.`,
      vendors: "Vendor relationships, spend, renewals, and operating context.",
      bills: "Upload, review, track, and prove operating expenses.",
      expenses: "Spend records and source-backed operating expenses.",
      documents: "Source files and extraction evidence.",
      contracts: "Renewal terms, dates, and contract evidence.",
      findings: "Evidence-backed cost issues and opportunities.",
      opportunities: "Evidence-backed cost issues and opportunities.",
      actions: "Approved work and decisions in progress.",
      results: "Value created and outcomes supported by evidence.",
      savings: "Value created and outcomes supported by evidence.",
      settings: "Workspace configuration and operating controls.",
      integrations: "Connected systems and data controls.",
      team: "People, roles, and approval controls.",
      ask: "Ask questions about the evidence in your workspace.",
    };
    const vendor = section === "vendors" && detailId
      ? data.vendors.find((item) => item.id === detailId)
      : undefined;
    const detailTitle = detailId
      ? vendor?.name
        ?? (section === "bills" || section === "expenses"
          ? data.expenses.find((item) => item.id === detailId)?.vendorName
            ?? data.invoices.find((item) => item.id === detailId)?.invoiceNumber
          : undefined)
        ?? (section === "contracts" ? data.contracts.find((item) => item.id === detailId)?.title : undefined)
        ?? (section === "findings" || section === "opportunities" ? data.opportunities.find((item) => item.id === detailId)?.title : undefined)
        ?? (section === "actions" ? data.actions.find((item) => item.id === detailId)?.title : undefined)
        ?? (section === "results" || section === "savings" ? data.savings.find((item) => item.id === detailId)?.title : undefined)
        ?? sectionTitles[section]
      : undefined;
    return {
      title: detailTitle ?? sectionTitles[section] ?? "Command Center",
      description: detailId
        ? vendor?.category ?? `${sectionTitles[section] ?? "Workspace"} detail`
        : descriptions[section] ?? "Cost intelligence for your workspace.",
      vendor,
    };
  }, [data, pathname]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const closeSearch = useCallback(() => {
    setSearchClosing(true);
    window.setTimeout(() => {
      setSearchFocused(false);
      setSearchClosing(false);
    }, 160);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        closeSearch();
      }
      if (createMenuRef.current && !createMenuRef.current.contains(event.target as Node)) {
        setCreateMenuOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeSearch]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.querySelector<HTMLInputElement>(window.innerWidth <= 760 ? ".app-mobile-utilities input[aria-label='Search Costivra records']" : ".app-sidebar-search input[aria-label='Search Costivra records']")?.focus();
        setSearchFocused(true);
        setSearchClosing(false);
      } else if (e.key === "Escape") {
        closeSearch();
        (document.activeElement instanceof HTMLInputElement ? document.activeElement : null)?.blur();
        setOrgOpen(false);
        setNotificationsOpen(false);
        setProfileOpen(false);
        setCreateMenuOpen(false);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeSearch]);

  const results = useMemo(() => appSearchResults(data, searchQuery), [data, searchQuery]);
  const resultsByCategory = useMemo(() => {
    const grouped = new Map<AppSearchResult["category"], AppSearchResult[]>();
    for (const result of results) {
      const categoryResults = grouped.get(result.category) ?? [];
      if (categoryResults.length < 5) categoryResults.push(result);
      grouped.set(result.category, categoryResults);
    }
    const categoriesOrder: AppSearchResult["category"][] = [
      "vendors",
      "bills",
      "contracts",
      "findings",
      "actions",
      "documents",
      "expenses",
    ];
    return categoriesOrder
      .map((category) => ({ category, results: grouped.get(category) ?? [] }))
      .filter(({ results }) => results.length > 0);
  }, [results]);

  function openSearchResult(result: AppSearchResult) {
    setSearchFocused(false);
    setSearchClosing(false);
    setSearchQuery("");
    router.push(result.href);
  }

  function openGlobalCreateAction(action: "upload" | "add-vendor" | "add-contract") {
    setCreateMenuOpen(false);
    window.dispatchEvent(new CustomEvent("costivra:global-action", { detail: action }));
  }

  const unread = data.notifications.filter((item) => !item.readAt);
  const initials = data.currentUser.fullName.split(/\s+/).map((part) => part[0]).slice(0,2).join("").toUpperCase();
  const spend = data.vendors.reduce((sum, vendor) => sum + vendor.annualizedSpend, 0);
  async function signOut() { await createClient().auth.signOut(); router.replace("/login"); router.refresh(); }
  async function markNotificationsRead() {
    try {
      const response = await fetch("/api/portal/notifications", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ all: true }) });
      if (!response.ok) throw new Error("Notifications could not be updated.");
      setNotificationsOpen(false);
      router.refresh();
      toast.success("Notifications cleared");
    } catch (error) {
      toast.error("That didn’t work", error instanceof Error ? error.message : "Please try again.");
    }
  }
  const workspaceIdentity = (
    <div className="app-sidebar-workspace">
      <div className="app-organization">
        <button className="org-switcher" type="button" onClick={() => setOrgOpen(!orgOpen)}>
          <CompanyLogo entity="organization" id={data.organization.id} name={data.organization.name} className="app-organization-logo" />
          <span className="app-organization-copy"><strong>{data.organization.name}</strong><small>{data.locations.length} location{data.locations.length === 1 ? "" : "s"}</small></span>
          <ChevronsUpDown aria-hidden="true" size={14} />
        </button>
        {orgOpen && (
          <div className="app-organization-menu" role="dialog" aria-label="Workspace summary">
            <div className="app-organization-menu-heading">
              <CompanyLogo entity="organization" id={data.organization.id} name={data.organization.name} className="app-organization-menu-logo" />
              <span><strong>{data.organization.name}</strong><small>{data.locations.length} location{data.locations.length === 1 ? "" : "s"}</small></span>
            </div>
            <div className="app-organization-menu-stat"><span>Source documents</span><strong>{data.documents.length}</strong></div>
            <div className="app-organization-menu-stat"><span>Monitored spend</span><strong>{new Intl.NumberFormat("en-US", { style:"currency", currency:data.organization.currency, notation:"compact", maximumFractionDigits:1 }).format(spend)} / yr</strong></div>
          </div>
        )}
      </div>
    </div>
  );
  const globalSearch = (
    <div className="app-sidebar-search app-global-search-wrap" ref={searchContainerRef}>
      <label className="manage-search global-search">
        <Search aria-hidden="true" size={15} />
        <input aria-label="Search Costivra records" type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onFocus={() => { setSearchFocused(true); setSearchClosing(false); }} onKeyDown={(event) => { if (event.key === "Escape") { closeSearch(); event.currentTarget.blur(); } }} placeholder="Search..." />
        <span className="manage-kbd">⌘K</span>
      </label>
      {(searchFocused || searchClosing) && searchQuery.trim() && (
        <div className={`app-global-results${searchClosing ? " is-closing" : ""}`} id="app-global-search-results" role="listbox" aria-label="Search results">
          {resultsByCategory.length ? resultsByCategory.map(({ category, results: categoryResults }) => {
            const Icon = searchCategoryIcons[category];
            return <section className="app-global-result-group" key={category}><h2><Icon aria-hidden="true" size={14} />{searchCategoryLabels[category]}</h2>{categoryResults.map((result) => <button type="button" role="option" aria-selected={false} key={result.id} onMouseDown={(event) => { event.preventDefault(); openSearchResult(result); }}><strong>{result.title}</strong><small>{result.detail}</small></button>)}</section>;
          }) : <p className="app-global-no-results">No records match “{searchQuery.trim()}”.</p>}
        </div>
      )}
    </div>
  );
  const mobileUtilities = (
    <div className="app-mobile-utilities">
      <div className="app-mobile-organization">
        <button className="org-switcher" type="button" onClick={() => setOrgOpen(!orgOpen)} aria-label="Open workspace summary">
          <CompanyLogo entity="organization" id={data.organization.id} name={data.organization.name} className="app-organization-logo" />
          <span>{data.organization.name}</span>
        </button>
        {orgOpen && <div className="app-organization-menu"><div className="app-organization-menu-heading"><CompanyLogo entity="organization" id={data.organization.id} name={data.organization.name} className="app-organization-menu-logo" /><span><strong>{data.organization.name}</strong><small>{data.locations.length} location{data.locations.length === 1 ? "" : "s"}</small></span></div><div className="app-organization-menu-stat"><span>Source documents</span><strong>{data.documents.length}</strong></div><div className="app-organization-menu-stat"><span>Monitored spend</span><strong>{new Intl.NumberFormat("en-US", { style:"currency", currency:data.organization.currency, notation:"compact", maximumFractionDigits:1 }).format(spend)} / yr</strong></div></div>}
      </div>
      <div className="app-mobile-utility-search app-global-search-wrap">
        <label className="manage-search global-search"><Search aria-hidden="true" size={15} /><input aria-label="Search Costivra records" type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onFocus={() => { setSearchFocused(true); setSearchClosing(false); }} onKeyDown={(event) => { if (event.key === "Escape") { closeSearch(); event.currentTarget.blur(); } }} placeholder="Search..." /><span className="manage-kbd">⌘K</span></label>
        {(searchFocused || searchClosing) && searchQuery.trim() && <div className={`app-global-results${searchClosing ? " is-closing" : ""}`} role="listbox" aria-label="Search results">{resultsByCategory.length ? resultsByCategory.map(({ category, results: categoryResults }) => { const Icon = searchCategoryIcons[category]; return <section className="app-global-result-group" key={category}><h2><Icon aria-hidden="true" size={14} />{searchCategoryLabels[category]}</h2>{categoryResults.map((result) => <button type="button" role="option" aria-selected={false} key={result.id} onMouseDown={(event) => { event.preventDefault(); openSearchResult(result); }}><strong>{result.title}</strong><small>{result.detail}</small></button>)}</section>; }) : <p className="app-global-no-results">No records match “{searchQuery.trim()}”.</p>}</div>}
      </div>
    </div>
  );
  return (
    <div className={`app-body${isDrawerOpen ? " has-assistant-drawer" : ""}`}>
      <div className={`app-shell${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
        <aside className="app-sidebar">
          <div className="sidebar-brand-row">
            <Brand light />
          </div>
          {workspaceIdentity}
          {globalSearch}
          <div
            className="app-nav-scroll"
            onWheelCapture={(event) => {
              const node = event.currentTarget;
              if (node.scrollHeight <= node.clientHeight || event.deltaY === 0) return;
              event.preventDefault();
              event.stopPropagation();
              node.scrollTop = Math.max(
                0,
                Math.min(node.scrollHeight - node.clientHeight, node.scrollTop + event.deltaY),
              );
            }}
          >
            <nav className="app-nav" aria-label="Customer application">
              {navigationGroups.slice(0, -1).map((group, groupIdx) => (
                <div key={group.section ?? `group-${groupIdx}`} className="app-nav-group">
                  {group.section && (
                    <div className="nav-section-label">{group.section}</div>
                  )}
                  {group.items.map(([label, href, Icon]) => {
                    const active = isRouteActive(href, pathname);
                    return (
                      <Link
                        className={active ? "active" : ""}
                        href={href}
                        key={href}
                        aria-current={active ? "page" : undefined}
                        aria-label={`Open ${label}`}
                        data-nav-label={label}
                      >
                        <Icon aria-hidden="true" size={18} />
                        <span className="nav-label">{label}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>
          <div className="app-sidebar-foot">
            <nav className="app-sidebar-utility" aria-label="Workspace settings">
              <Link
                className={isRouteActive("/app/settings", pathname) ? "active" : ""}
                href="/app/settings"
                aria-label="Settings"
              >
                <Settings aria-hidden="true" size={18} />
                <span className="nav-label">Settings</span>
              </Link>
            </nav>
            <div className="app-sidebar-profile-wrap" ref={profileMenuRef}>
              <button
                className={`app-operator${profileOpen ? " is-open" : ""}`}
                type="button"
                aria-label={`${data.currentUser.fullName} account menu`}
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                onClick={() => {
                  setProfileOpen((open) => !open);
                  setNotificationsOpen(false);
                }}
              >
                <span className="app-operator-avatar" aria-hidden="true">{initials}</span>
                <span className="app-operator-copy">
                  <strong>{data.currentUser.fullName}</strong>
                  <small>{data.currentUser.role}</small>
                </span>
              </button>
              {profileOpen && (
                <div className="app-profile-menu" role="menu" aria-label="Account options">
                  <div className="app-profile-menu-heading">
                    <span className="app-operator-avatar" aria-hidden="true">{initials}</span>
                    <span><strong>{data.currentUser.fullName}</strong><small>{data.currentUser.email}</small></span>
                  </div>
                  <button type="button" role="menuitem" className="is-danger" onClick={() => void signOut()}>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        <main className="app-main">
          <div className="app-work-canvas">
            <div className="app-topbar">
            {mobileUtilities}
            <div className="app-topbar-leading">
              <button
                className="app-topbar-expand-toggle"
                type="button"
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-pressed={sidebarCollapsed}
                onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
              >
                {sidebarCollapsed ? <PanelLeftOpen aria-hidden="true" size={18} /> : <PanelLeftClose aria-hidden="true" size={18} />}
              </button>
              <span className="app-topbar-divider" aria-hidden="true" />
              {appHeader.vendor && <CompanyLogo entity="vendor" id={appHeader.vendor.id} name={appHeader.vendor.name} className="app-topbar-record-logo" />}
              <div className="app-topbar-title">
                <strong>{appHeader.title}</strong>
                <small>{appHeader.description}</small>
              </div>
            </div>
            <div className="app-topbar-center">
              <div className="app-create-wrap" ref={createMenuRef}>
                <button
                  className={`button button-primary app-create-trigger${createMenuOpen ? " is-active" : ""}`}
                  type="button"
                  onClick={() => setCreateMenuOpen((open) => !open)}
                  aria-label="Add to workspace"
                  aria-expanded={createMenuOpen}
                  aria-haspopup="menu"
                >
                  <Plus aria-hidden="true" size={18} strokeWidth={2.2} />
                </button>
                <div className={`app-create-menu${createMenuOpen ? " is-open" : ""}`} role="menu" aria-label="Add to workspace" aria-hidden={!createMenuOpen}>
                    <Link href={pathname} role="menuitem" onClick={(event) => { event.preventDefault(); openGlobalCreateAction("upload"); }}>
                      <span className="app-create-icon"><Upload aria-hidden="true" size={16} /></span>
                      <span className="app-create-label"><strong>Upload document</strong><small>Bill, contract, or source file</small></span>
                    </Link>
                    <Link href={pathname} role="menuitem" onClick={(event) => { event.preventDefault(); openGlobalCreateAction("add-vendor"); }}>
                      <span className="app-create-icon"><Building2 aria-hidden="true" size={16} /></span>
                      <span className="app-create-label"><strong>Add vendor</strong><small>Start a vendor relationship</small></span>
                    </Link>
                    <Link href={pathname} role="menuitem" onClick={(event) => { event.preventDefault(); openGlobalCreateAction("add-contract"); }}>
                      <span className="app-create-icon"><FileText aria-hidden="true" size={16} /></span>
                      <span className="app-create-label"><strong>Add contract</strong><small>Track renewal terms and dates</small></span>
                    </Link>
                </div>
              </div>
            </div>

            <div className="top-actions app-top-actions">
              <ClientAssistantTrigger />
              <div className="topbar-popover-wrap"><button className="button button-quiet" type="button" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => { setNotificationsOpen((value) => !value); setProfileOpen(false); }} style={{ position: "relative", borderRadius: "50%", width: 40, height: 40, padding: 0 }}>
                <Bell aria-hidden="true" size={17} style={{ color: "#475569" }} />
                {unread.length > 0 && <span style={{ position: "absolute", top: 9, right: 9, width: 7, height: 7, borderRadius: "50%", background: "#ef6b53" }} />}
              </button>{notificationsOpen && <div className="topbar-popover notifications-popover"><header><strong>Notifications</strong>{unread.length>0&&<button onClick={() => void markNotificationsRead()}>Mark all read</button>}</header>{data.notifications.length ? data.notifications.slice(0,5).map(item=><div className={`notification-item${item.readAt?"":" unread"}`} key={item.id}><strong>{item.title}</strong><span>{item.body}</span></div>) : <p className="popover-empty">You&apos;re all caught up.</p>}</div>}</div>
            </div>
            </div>

            {children}
          </div>

          <nav className="app-mobile-nav" aria-label="Mobile workspace navigation">
            <Link className={isRouteActive("/app", pathname) ? "active" : ""} href="/app" aria-label="Open Command Center" onClick={() => setMobileMenuOpen(false)}>
              <LayoutDashboard aria-hidden="true" size={20} />
              <span>Overview</span>
            </Link>
            <Link className={isRouteActive("/app/bills", pathname) ? "active" : ""} href="/app/bills" aria-label="Open Bills & Spend" onClick={() => setMobileMenuOpen(false)}>
              <ReceiptText aria-hidden="true" size={20} />
              <span>Bills</span>
            </Link>
            <Link className={isRouteActive("/app/findings", pathname) ? "active" : ""} href="/app/findings" aria-label="Open Findings" onClick={() => setMobileMenuOpen(false)}>
              <Target aria-hidden="true" size={20} />
              <span>Findings</span>
            </Link>
            <Link className={isRouteActive("/app/actions", pathname) ? "active" : ""} href="/app/actions" aria-label="Open Actions" onClick={() => setMobileMenuOpen(false)}>
              <CheckSquare2 aria-hidden="true" size={20} />
              <span>Actions</span>
            </Link>
            <button
              type="button"
              className={`app-mobile-nav-toggle${mobileMenuOpen ? " active" : ""}`}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              <MoreHorizontal aria-hidden="true" size={21} />
              <span>Menu</span>
            </button>
          </nav>
          {mobileMenuOpen && (
            <>
              <div
                className="app-mobile-drawer-overlay"
                onClick={() => setMobileMenuOpen(false)}
                aria-hidden="true"
              />
              <div
                className="app-mobile-drawer"
                role="dialog"
                aria-label="Navigation menu"
              >
                <div className="mobile-drawer-header">
                  <strong>Navigation</strong>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label="Close menu"
                  >
                    <X size={18} aria-hidden="true" />
                  </button>
                </div>
                {navigationGroups.map((group, groupIdx) => (
                  <div key={group.section ?? `mobile-group-${groupIdx}`} className="mobile-nav-group">
                    {group.section && <div className="nav-section-label">{group.section}</div>}
                    {group.items.map(([label, href, Icon]) => {
                      const active = isRouteActive(href, pathname);
                      return (
                        <Link
                          key={href}
                          className={active ? "active" : ""}
                          href={href}
                          onClick={() => setMobileMenuOpen(false)}
                          aria-current={active ? "page" : undefined}
                        >
                          <Icon aria-hidden="true" size={18} />
                          <span>{label}</span>
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
      <ClientAssistantSurface />
    </div>
  );
}

import { BillInspectorProvider } from "@/components/bill-inspector-provider";
import { NavigationHistoryProvider } from "@/components/navigation-history";

export function AppShell({ children, data }: { children: ReactNode; data: PortalData }) {
  return (
    <NavigationHistoryProvider scope="app">
      <ClientAssistantProvider>
        <BillInspectorProvider>
          <AppShellContent data={data}>{children}</AppShellContent>
        </BillInspectorProvider>
      </ClientAssistantProvider>
    </NavigationHistoryProvider>
  );
}

export function AppPageHeader({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return <div className="app-page-heading"><div><h1>{title}</h1><p>{description}</p></div>{actions ? <div className="page-tools">{actions}</div> : null}</div>;
}

export function EmptyHint({ title, copy }: { title: string; copy: string }) {
  return <div style={{ padding: 45, textAlign: "center" }}><ShieldCheck aria-hidden="true" size={30} style={{ color: "var(--blue)", margin: "0 auto 15px" }} /><strong style={{ display: "block", fontSize: "1.05rem" }}>{title}</strong><p className="muted" style={{ maxWidth: 480, margin: "10px auto 0", lineHeight: 1.6 }}>{copy}</p></div>;
}
