"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Bot,
  Building2,
  ChartNoAxesCombined,
  CheckSquare2,
  ChevronsUpDown,
  FileStack,
  FileText,
  Gauge,
  Handshake,
  LayoutDashboard,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
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

const navigation = [
  ["Command Center", "/app", LayoutDashboard],
  ["Expenses", "/app/expenses", ReceiptText],
  ["Opportunities", "/app/opportunities", Target],
  ["Contracts", "/app/contracts", FileText],
  ["Documents", "/app/documents", FileStack],
  ["Actions", "/app/actions", CheckSquare2],
  ["Savings", "/app/savings", ChartNoAxesCombined],
  ["Vendors", "/app/vendors", Building2],
  ["Reports", "/app/reports", Gauge],
  ["Ask Costivra", "/app/ask", Bot],
  ["Settings", "/app/settings", Settings],
] as const;

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

export function AppShell({ children, data }: { children: ReactNode; data: PortalData }) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandLeaving, setCommandLeaving] = useState(false);
  const [orgOpen, setOrgOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const commandDialogRef = useRef<HTMLDivElement>(null);
  const commandTriggerRef = useRef<HTMLButtonElement>(null);
  const commandCloseTimerRef = useRef<number | null>(null);
  const sidebarTimerRef = useRef<number | null>(null);

  const expandSidebar = (delay = 0) => {
    if (window.innerWidth <= 980) return;
    if (sidebarTimerRef.current) window.clearTimeout(sidebarTimerRef.current);
    if (!delay) {
      sidebarTimerRef.current = null;
      setSidebarCollapsed(false);
      return;
    }
    sidebarTimerRef.current = window.setTimeout(() => {
      setSidebarCollapsed(false);
      sidebarTimerRef.current = null;
    }, delay);
  };
  const collapseSidebar = () => {
    if (window.innerWidth <= 980) return;
    if (sidebarTimerRef.current) window.clearTimeout(sidebarTimerRef.current);
    sidebarTimerRef.current = window.setTimeout(() => {
      setSidebarCollapsed(true);
      sidebarTimerRef.current = null;
    }, 420);
  };

  const closeCommand = useCallback(() => {
    if (!commandOpen || commandLeaving) return;
    setCommandLeaving(true);
    if (commandCloseTimerRef.current) window.clearTimeout(commandCloseTimerRef.current);
    commandCloseTimerRef.current = window.setTimeout(() => { setCommandOpen(false); setCommandLeaving(false); commandCloseTimerRef.current = null; }, 170);
  }, [commandLeaving, commandOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandLeaving(false); setCommandOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        if (commandOpen) closeCommand();
        setOrgOpen(false); setNotificationsOpen(false); setProfileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeCommand, commandOpen]);

  useEffect(() => {
    if (!commandOpen) return;
    document.body.classList.add("modal-open");
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const commandTrigger = commandTriggerRef.current;
    const handleFocusLoop = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !commandDialogRef.current) return;
      const focusable = Array.from(commandDialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex='-1'])"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleFocusLoop);
    return () => {
      document.removeEventListener("keydown", handleFocusLoop);
      document.body.classList.remove("modal-open");
      (commandTrigger ?? previousFocus)?.focus();
    };
  }, [commandOpen]);

  useEffect(() => () => {
    if (sidebarTimerRef.current) window.clearTimeout(sidebarTimerRef.current);
  }, []);

  const filteredNav = navigation.filter(([label]) =>
    label.toLowerCase().includes(searchQuery.toLowerCase())
  );
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
  return (
    <div className="app-body">
      <div className={`app-shell${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
        <aside
          className="app-sidebar"
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse") expandSidebar(180);
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse") collapseSidebar();
          }}
          onFocusCapture={() => expandSidebar()}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) collapseSidebar();
          }}
        >
          <div className="sidebar-brand-row">
            <Brand light compact={sidebarCollapsed} />
            {!sidebarCollapsed && (
              <button
                className="sidebar-toggle"
                type="button"
                onClick={() => setSidebarCollapsed(true)}
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <PanelLeftClose aria-hidden="true" size={17} />
              </button>
            )}
          </div>
          <nav className="app-nav" aria-label="Customer application">
            {navigation.map(([label, href, Icon]) => {
              const active = href === "/app" ? pathname === href : pathname.startsWith(href);
              return (
                <Link className={active ? "active" : ""} href={href} key={href} aria-current={active ? "page" : undefined} aria-label={label}>
                  <Icon aria-hidden="true" size={18} />
                  <span className="nav-label">{label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="app-sidebar-bottom">
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px", color: "#9eaaa5", fontSize: ".8rem" }}>
              <Handshake aria-hidden="true" size={17} /> <span>Public site</span>
            </Link>
          </div>
        </aside>

        <main className="app-main">
          <div className="app-topbar">
            {sidebarCollapsed && (
              <button
                className="app-topbar-expand-toggle"
                type="button"
                onClick={() => setSidebarCollapsed(false)}
                aria-label="Expand sidebar"
                title="Expand sidebar"
              >
                <PanelLeftOpen aria-hidden="true" size={18} />
              </button>
            )}
            <div className="app-organization" style={{ position: "relative" }}>
              <button
                className="org-switcher"
                type="button"
                onClick={() => setOrgOpen(!orgOpen)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  padding: "6px 14px",
                  borderRadius: 10,
                  boxShadow: "0 2px 6px rgba(15,23,42,0.03)",
                  fontSize: ".88rem",
                  fontWeight: 700,
                  color: "#0f172a"
                }}
              >
                <CompanyLogo entity="organization" id={data.organization.id} name={data.organization.name} className="app-organization-logo" />
                {data.organization.name} <ChevronsUpDown aria-hidden="true" size={13} style={{ color: "#64748b" }} />
              </button>

              {orgOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    left: 0,
                    zIndex: 80,
                    width: 290,
                    background: "#0d1320",
                    color: "#edf1fa",
                    border: "1px solid #283448",
                    borderRadius: 16,
                    padding: 16,
                    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
                    animation: "riseIn 180ms ease-out",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 12, borderBottom: "1px solid #1e2838" }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--mint)", color: "var(--ink)", display: "grid", placeItems: "center", fontWeight: 800, fontSize: ".95rem" }}>
                      {data.organization.name.split(/\s+/).map((word) => word[0]).slice(0,2).join("").toUpperCase()}
                    </div>
                    <div>
                      <strong style={{ display: "block", fontSize: ".92rem", color: "#ffffff" }}>{data.organization.name}</strong>
                      <span className="mono" style={{ fontSize: ".7rem", color: "#8e9bb0" }}>{data.locations.length} location{data.locations.length === 1 ? "" : "s"}</span>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".78rem", color: "#9ca7b9" }}>
                      <span>Source documents</span>
                      <strong className="mono" style={{ color: "#10b981" }}>{data.documents.length}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".78rem", color: "#9ca7b9" }}>
                      <span>Monitored Spend</span>
                      <strong className="mono" style={{ color: "#ffffff" }}>{new Intl.NumberFormat("en-US", { style:"currency", currency:data.organization.currency, notation:"compact", maximumFractionDigits:1 }).format(spend)} / yr</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="top-actions">
              <button
                ref={commandTriggerRef}
                className="button button-quiet global-search"
                type="button"
                onClick={() => { setCommandLeaving(false); setCommandOpen(true); }}
                aria-label="Open search"
                style={{ borderRadius: 10, background: "#ffffff", border: "1px solid #e2e8f0" }}
              >
                <Search aria-hidden="true" size={15} style={{ color: "#64748b" }} />
                <span className="global-search-label">Search documents, vendors, or evidence</span>
                <span className="command-shortcut">⌘K</span>
              </button>
              <Link className="button button-primary" href="/app/documents" style={{ borderRadius: 10, padding: "0 18px", fontSize: ".84rem" }}>
                <Upload aria-hidden="true" size={16} /> Upload documents
              </Link>
              <div className="topbar-popover-wrap"><button className="button button-quiet" type="button" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => { setNotificationsOpen((value) => !value); setProfileOpen(false); }} style={{ position: "relative", borderRadius: "50%", width: 40, height: 40, padding: 0 }}>
                <Bell aria-hidden="true" size={17} style={{ color: "#475569" }} />
                {unread.length > 0 && <span style={{ position: "absolute", top: 9, right: 9, width: 7, height: 7, borderRadius: "50%", background: "#ef6b53" }} />}
              </button>{notificationsOpen && <div className="topbar-popover notifications-popover"><header><strong>Notifications</strong>{unread.length>0&&<button onClick={() => void markNotificationsRead()}>Mark all read</button>}</header>{data.notifications.length ? data.notifications.slice(0,5).map(item=><div className={`notification-item${item.readAt?"":" unread"}`} key={item.id}><strong>{item.title}</strong><span>{item.body}</span></div>) : <p className="popover-empty">You&apos;re all caught up.</p>}</div>}</div>
              <div className="topbar-popover-wrap"><button type="button" className="avatar" aria-label={`${data.currentUser.fullName} account menu`} aria-expanded={profileOpen} onClick={() => { setProfileOpen((value)=>!value); setNotificationsOpen(false); }}>{initials}</button>{profileOpen&&<div className="topbar-popover profile-popover"><strong>{data.currentUser.fullName}</strong><span>{data.currentUser.email}</span><span className="portal-status">{data.currentUser.role}</span><button onClick={() => void signOut()}>Sign out</button></div>}</div>
            </div>
          </div>

          {children}

          <nav className="app-mobile-nav" aria-label="Mobile workspace navigation">
            <Link className={pathname === "/app" ? "active" : ""} href="/app" aria-label="Overview"><LayoutDashboard aria-hidden="true" size={20} /><span>Overview</span></Link>
            <Link className={pathname.startsWith("/app/opportunities") ? "active" : ""} href="/app/opportunities" aria-label="Opportunities"><Target aria-hidden="true" size={20} /><span>Cases</span></Link>
            <Link className={pathname.startsWith("/app/actions") ? "active" : ""} href="/app/actions" aria-label="Actions"><CheckSquare2 aria-hidden="true" size={20} /><span>Actions</span></Link>
            <Link className={pathname.startsWith("/app/settings") ? "active" : ""} href="/app/settings" aria-label="More"><MoreHorizontal aria-hidden="true" size={21} /><span>More</span></Link>
          </nav>
        </main>
      </div>

      {/* Command Palette (`Cmd + K`) Modal */}
      {commandOpen && (
        <div className={`command-overlay${commandLeaving ? " is-leaving" : ""}`} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeCommand(); }}>
          <div ref={commandDialogRef} className="command-box" role="dialog" aria-modal="true" aria-labelledby="command-search-title" onMouseDown={(event) => event.stopPropagation()}>
            <h2 id="command-search-title" className="sr-only">Search Costivra</h2>
            <div className="command-header">
              <Search aria-hidden="true" size={18} style={{ color: "#78859b" }} />
              <input
                className="command-input"
                type="text"
                aria-label="Search commands"
                placeholder="Type a command, page name, vendor, or contract..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <button type="button" aria-label="Close search" style={{ background: "transparent", border: 0, color: "#78859b", cursor: "pointer" }} onClick={closeCommand}>
                <X aria-hidden="true" size={18} />
              </button>
            </div>
            <div className="command-list">
              <div className="command-group-title">Navigation & Workspaces</div>
              {filteredNav.map(([label, href, Icon]) => (
                <Link
                  className="command-item"
                  href={href}
                  key={href}
                  onClick={closeCommand}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Icon aria-hidden="true" size={16} />
                    {label}
                  </span>
                  <span className="command-shortcut">Jump</span>
                </Link>
              ))}

              <div className="command-group-title" style={{ marginTop: 12 }}>Workspace records</div>
              {data.vendors.filter((vendor) => vendor.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0,4).map((vendor) => <Link className="command-item" href="/app/vendors" onClick={closeCommand} key={vendor.id}><span>{vendor.name}</span><span className="command-shortcut">{vendor.category}</span></Link>)}
              {data.documents.filter((document) => document.originalFilename.toLowerCase().includes(searchQuery.toLowerCase())).slice(0,4).map((document) => <Link className="command-item" href="/app/documents" onClick={closeCommand} key={document.id}><span>{document.originalFilename}</span><span className="command-shortcut">Document</span></Link>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AppPageHeader({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return <div className="app-page-heading"><div><h1>{title}</h1><p>{description}</p></div>{actions ? <div className="page-tools">{actions}</div> : null}</div>;
}

export function EmptyHint({ title, copy }: { title: string; copy: string }) {
  return <div style={{ padding: 45, textAlign: "center" }}><ShieldCheck aria-hidden="true" size={30} style={{ color: "var(--blue)", margin: "0 auto 15px" }} /><strong style={{ display: "block", fontSize: "1.05rem" }}>{title}</strong><p className="muted" style={{ maxWidth: 480, margin: "10px auto 0", lineHeight: 1.6 }}>{copy}</p></div>;
}
