"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Blocks,
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
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { Brand } from "@/components/brand";

const navigation = [
  ["Command Center", "/app", LayoutDashboard],
  ["Expenses", "/app/expenses", ReceiptText],
  ["Opportunities", "/app/opportunities", Target],
  ["Contracts", "/app/contracts", FileText],
  ["Documents", "/app/documents", FileStack],
  ["Actions", "/app/actions", CheckSquare2],
  ["Savings", "/app/savings", ChartNoAxesCombined],
  ["Vendors", "/app/vendors", Building2],
  ["Integrations", "/app/integrations", Blocks],
  ["Reports", "/app/reports", Gauge],
  ["Team & approvals", "/app/team", Users],
  ["Ask Costivra", "/app/ask", Bot],
  ["Settings", "/app/settings", Settings],
] as const;

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [commandOpen, setCommandOpen] = useState(false);
  const [orgOpen, setOrgOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setCommandOpen(false);
        setOrgOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filteredNav = navigation.filter(([label]) =>
    label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="app-body">
      <div className={`app-shell${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
        <aside className="app-sidebar">
          <div className="sidebar-brand-row">
            <Brand light compact={sidebarCollapsed} />
            <button
              className="sidebar-toggle"
              type="button"
              onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <PanelLeftOpen aria-hidden="true" size={17} /> : <PanelLeftClose aria-hidden="true" size={17} />}
            </button>
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
                  borderRadius: "99px",
                  boxShadow: "0 2px 6px rgba(15,23,42,0.03)",
                  fontSize: ".88rem",
                  fontWeight: 700,
                  color: "#0f172a"
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                Northstar Hospitality <ChevronsUpDown aria-hidden="true" size={13} style={{ color: "#64748b" }} />
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
                      NH
                    </div>
                    <div>
                      <strong style={{ display: "block", fontSize: ".92rem", color: "#ffffff" }}>Northstar Hospitality</strong>
                      <span className="mono" style={{ fontSize: ".7rem", color: "#8e9bb0" }}>ORG-84920 • 12 locations</span>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".78rem", color: "#9ca7b9" }}>
                      <span>Data Coverage</span>
                      <strong className="mono" style={{ color: "#10b981" }}>86% (Good)</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".78rem", color: "#9ca7b9" }}>
                      <span>Monitored Spend</span>
                      <strong className="mono" style={{ color: "#ffffff" }}>$1.84M / yr</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="top-actions">
              <button
                className="button button-quiet global-search"
                type="button"
                onClick={() => setCommandOpen(true)}
                aria-label="Open search"
                style={{ borderRadius: "99px", background: "#ffffff", border: "1px solid #e2e8f0" }}
              >
                <Search aria-hidden="true" size={15} style={{ color: "#64748b" }} />
                <span className="global-search-label">Search documents, vendors, or evidence</span>
                <span className="command-shortcut">⌘K</span>
              </button>
              <Link className="button button-primary" href="/app/documents" style={{ borderRadius: "99px", padding: "0 18px", fontSize: ".84rem" }}>
                <Upload aria-hidden="true" size={16} /> Upload documents
              </Link>
              <button className="button button-quiet" type="button" aria-label="Notifications" style={{ position: "relative", borderRadius: "50%", width: 40, height: 40, padding: 0 }}>
                <Bell aria-hidden="true" size={17} style={{ color: "#475569" }} />
                <span style={{ position: "absolute", top: 9, right: 9, width: 7, height: 7, borderRadius: "50%", background: "#ef4444" }} />
              </button>
              <span className="avatar" aria-label="Alex Morgan" style={{ borderRadius: "50%", fontWeight: 700 }}>AM</span>
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
        <div className="command-overlay" onClick={() => setCommandOpen(false)}>
          <div className="command-box" onClick={(e) => e.stopPropagation()}>
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
              <button type="button" style={{ background: "transparent", border: 0, color: "#78859b", cursor: "pointer" }} onClick={() => setCommandOpen(false)}>
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
                  onClick={() => setCommandOpen(false)}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Icon aria-hidden="true" size={16} />
                    {label}
                  </span>
                  <span className="command-shortcut">Jump</span>
                </Link>
              ))}

              <div className="command-group-title" style={{ marginTop: 12 }}>Recent Vendor Intelligence</div>
              <Link className="command-item" href="/app/vendors" onClick={() => setCommandOpen(false)}>
                <span>Verizon Wireless Master Services ($98,450 / yr)</span>
                <span className="command-shortcut" style={{ color: "var(--orange)" }}>1 leak</span>
              </Link>
              <Link className="command-item" href="/app/vendors" onClick={() => setCommandOpen(false)}>
                <span>Direct Energy TX Portfolio ($82,610 / yr)</span>
                <span className="command-shortcut" style={{ color: "var(--mint)" }}>Review</span>
              </Link>
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
