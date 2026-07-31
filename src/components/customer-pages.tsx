"use client";

import Link from "next/link";
import {
  Activity as ActivityIcon,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Building2,
  Calculator,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  CircleDollarSign,
  Clock3,
  Download,
  FileCheck,
  FileText,
  Layers,
  LockKeyhole,
  Mail,
  Paperclip,
  Phone,
  Plus,
  RadioTower,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  Upload,
  UserCheck,
  UserPlus,
  X,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AppPageHeader, EmptyHint } from "@/components/app-shell";
import { CostivraMark } from "@/components/brand";

const opportunityRows = [
  { priority: "High", title: "Telecom bill increase requires approval", vendor: "Verizon Wireless", type: "Price increase", value: "$18,750", confidence: 92, evidence: 7, deadline: "3 days", action: "Review opportunity" },
  { priority: "Medium", title: "Software license cleanup ready to execute", vendor: "Adobe", type: "Unused licenses", value: "$12,430", confidence: 88, evidence: 5, deadline: "9 days", action: "Review plan" },
  { priority: "Medium", title: "Energy account needs professional review", vendor: "Direct Energy", type: "Rate review", value: "$9,680", confidence: 68, evidence: 3, deadline: "17 days", action: "Request review" },
];

const expenseRows = [
  ["Verizon Wireless", "Telecom", "12 locations", "$98,450", "+14.2%", "2 findings"],
  ["Adobe", "Software", "42 licenses", "$62,140", "+4.8%", "1 finding"],
  ["Direct Energy", "Energy", "7 meters", "$82,610", "+8.1%", "Review"],
  ["Comcast Business", "Telecom", "5 locations", "$55,420", "−1.2%", "Clear"],
  ["Microsoft", "Software", "88 licenses", "$51,730", "+2.4%", "1 finding"],
];

const contractRows = [
  ["Verizon Wireless master services", "Telecom", "May 21, 2026", "90 days", "3 days", "Needs decision"],
  ["Direct Energy TX portfolio", "Energy", "Jun 4, 2026", "60 days", "17 days", "Expert review"],
  ["Adobe enterprise agreement", "Software", "Aug 18, 2026", "30 days", "92 days", "Review planned"],
  ["Comcast Business DIA", "Telecom", "Nov 11, 2026", "90 days", "177 days", "Monitored"],
];

const documentRows = [
  ["Verizon_May_2026.pdf", "Invoice", "Verizon Wireless", "May 18, 2026", "99%", "Reviewed"],
  ["Adobe_renewal_order.pdf", "Contract", "Adobe", "May 17, 2026", "91%", "Needs review"],
  ["DirectEnergy_April.pdf", "Invoice", "Direct Energy", "May 16, 2026", "97%", "Reviewed"],
  ["Comcast_location_05.pdf", "Invoice", "Comcast Business", "May 15, 2026", "82%", "3 fields"],
];

const vendors = [
  ["Sysco Corporation", "Food service", "$243,210", "13.2%", "12 locations"],
  ["Cintas Corporation", "Facilities", "$186,540", "10.1%", "12 locations"],
  ["Republic Services", "Waste", "$142,780", "7.8%", "9 locations"],
  ["Verizon Wireless", "Telecom", "$98,450", "5.3%", "12 locations"],
  ["Direct Energy", "Energy", "$82,610", "4.5%", "7 meters"],
];

const opportunityDetails: Record<string, {
  formula: string;
  sourceDoc: string;
  sourceText: string;
  matchedFields: { label: string; value: string }[];
  impactDescription: string;
  dataScope: string[];
  disclosureNotice?: string;
}> = {
  "Telecom bill increase requires approval": {
    formula: "($1,562.50 / mo unapproved surcharge) × 12 months = $18,750 / yr",
    sourceDoc: "Verizon_May_2026.pdf (Page 3, Line 42)",
    sourceText: "Line item charge: Surchg-Access-Tier4 (Unbundled) $1,562.50. Rate change effective May 1, 2026 without prior contract amendment notice.",
    matchedFields: [
      { label: "Contract Baseline", value: "$6,640.00 / mo" },
      { label: "Invoiced Charge", value: "$8,202.50 / mo" },
      { label: "Discrepancy Variance", value: "+23.5% (+$1,562.50 / mo)" },
      { label: "Confidence Rating", value: "92% (High Confidence)" },
    ],
    impactDescription: "Submits formal billing correction demand to Verizon billing office seeking full credit of $1,562.50/mo.",
    dataScope: [
      "Verizon Master Account #8849-2011",
      "May 2026 Invoiced Line Items & Variance Breakdown",
      "Authorized Contact: Alex Morgan (Controller)"
    ]
  },
  "Software license cleanup ready to execute": {
    formula: "(14 unused Enterprise seats × $74.00 / mo) × 12 months = $12,430 / yr",
    sourceDoc: "Adobe_Admin_Telemetry_May.json",
    sourceText: "User audit telemetry: 14 assigned seats inactive for >90 consecutive days. Contract renewal window opens Aug 18, 2026.",
    matchedFields: [
      { label: "Assigned Seats", value: "42 Licenses" },
      { label: "Active 90-Day Users", value: "28 Users" },
      { label: "Unallocated Seats", value: "14 Licenses ($1,036 / mo)" },
      { label: "Confidence Rating", value: "88% (Telemetry Verified)" },
    ],
    impactDescription: "Deprovisions 14 inactive licenses prior to contract auto-renewal notice deadline.",
    dataScope: [
      "Adobe Organization Admin ID: ADB-90214",
      "Deprovisioning User Email List (14 accounts)",
      "Authorized Admin: Alex Morgan"
    ]
  },
  "Energy account needs professional review": {
    formula: "Discrepancy between TX ERCOT Index Rate and Contracted Peak Surcharge: estimated $9,680 / yr",
    sourceDoc: "DirectEnergy_April.pdf (Meters #48291, #48292)",
    sourceText: "Meter #48291 Peak Demand Factor 1.48 vs Rate Cap 1.20 specified in Direct Energy TX Commercial Rider A.",
    matchedFields: [
      { label: "Monitored Meters", value: "7 Meters" },
      { label: "Billed Peak Surcharge", value: "$6,884.10" },
      { label: "Expected Contract Max", value: "$6,077.40" },
      { label: "Confidence Rating", value: "68% (Human Review Advised)" },
    ],
    impactDescription: "Creates an evidence review package. Optionally forwards case to authorized commercial energy advisor.",
    disclosureNotice: "Costivra is an independent platform and does not act as an energy broker or receive undisclosed commissions.",
    dataScope: [
      "Direct Energy Meter IDs #48291, #48292",
      "Monthly Peak Usage & Demand Load Curves",
      "Customer Consent & Relationship Disclosure"
    ]
  }
};

export function CustomerPage({ slug }: { slug?: string }) {
  switch (slug) {
    case undefined: return <CommandCenter />;
    case "expenses": return <Expenses />;
    case "opportunities": return <Opportunities />;
    case "contracts": return <Contracts />;
    case "documents": return <Documents />;
    case "actions": return <Actions />;
    case "savings": return <Savings />;
    case "vendors": return <Vendors />;
    case "integrations": return <Integrations />;
    case "reports": return <Reports />;
    case "team": return <Team />;
    case "ask": return <AskCostivra />;
    case "settings": return <Settings />;
    default: return <NotFound />;
  }
}

function CommandCenter() {
  const [filter, setFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOpp, setSelectedOpp] = useState<typeof opportunityRows[0] | null>(null);
  const [approvalModalOpp, setApprovalModalOpp] = useState<typeof opportunityRows[0] | null>(null);

  const visible = useMemo(() => {
    return opportunityRows.filter((row) => {
      // Tab filter
      if (filter === "My approvals" && row.action !== "Review opportunity") return false;
      if (filter === "Ready" && row.action !== "Review plan") return false;
      if (filter === "High value" && parseInt(row.value.replace(/[^0-9]/g, ""), 10) < 10000) return false;

      // Category filter
      if (categoryFilter === "Telecom" && !row.vendor.toLowerCase().includes("verizon") && !row.title.toLowerCase().includes("telecom")) return false;
      if (categoryFilter === "Software" && !row.vendor.toLowerCase().includes("adobe") && !row.title.toLowerCase().includes("software")) return false;
      if (categoryFilter === "Energy" && !row.vendor.toLowerCase().includes("direct energy") && !row.title.toLowerCase().includes("energy")) return false;

      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return row.title.toLowerCase().includes(q) || row.vendor.toLowerCase().includes(q) || row.type.toLowerCase().includes(q);
      }

      return true;
    });
  }, [filter, categoryFilter, searchQuery]);

  return (
    <div className="app-content">
      {/* iOS Executive Hero Pulse Banner */}
      <div className="ios-hero-banner">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: "99px", background: "rgba(201, 255, 63, 0.15)", border: "1px solid rgba(201, 255, 63, 0.3)", color: "var(--mint)", fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em" }}>
              <Sparkles size={13} /> CFO Intelligence Active
            </span>
            <span style={{ fontSize: ".76rem", color: "#8e9bb0" }}>Last synced 4 mins ago</span>
          </div>
          <h1 className="ios-hero-title">Northstar Hospitality Command Center</h1>
          <p className="ios-hero-subtitle">
            Monitored spend: <strong style={{ color: "#ffffff" }}>$1.84M / yr</strong> across 12 commercial locations. Costivra has identified 12 active cost recovery opportunities with zero unverified assumptions.
          </p>

          <div className="ios-hero-chips">
            <div className="ios-hero-chip">
              <span className="ios-glow-dot" style={{ background: "#f59e0b" }} />
              <span>Active Margin Leakage: <strong>4.0% ($74,260)</strong></span>
            </div>
            <div className="ios-hero-chip">
              <span className="ios-glow-dot" style={{ background: "#10b981" }} />
              <span>Realized Savings: <strong>$31,840</strong> (15 cases)</span>
            </div>
            <div className="ios-hero-chip">
              <span className="ios-glow-dot" style={{ background: "#ef4444" }} />
              <span>2 Notice Windows Closing</span>
            </div>
          </div>
        </div>

        <div className="ios-hero-actions">
          <Link href="/app/documents" className="button button-primary" style={{ borderRadius: "99px", padding: "0 22px", fontSize: ".88rem" }}>
            <Upload size={16} /> Fast Upload
          </Link>
          <Link href="/app/ask" className="button button-secondary" style={{ borderRadius: "99px", padding: "0 18px", fontSize: ".88rem", background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.18)" }}>
            <Sparkles size={16} /> Ask AI
          </Link>
        </div>
      </div>

      {/* CFO Grouped Metric Pillar Widgets */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <div className="ios-widget-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: ".72rem", fontWeight: 750, letterSpacing: ".08em", textTransform: "uppercase", color: "#64748b" }}>Realized Value & Recoveries</span>
            <span className="verified-shield-badge"><ShieldCheck size={13} /> Verified</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <span style={{ fontSize: ".7rem", color: "#64748b" }}>Verified Savings</span>
              <strong className="mono tabular-nums" style={{ display: "block", fontSize: "1.6rem", fontWeight: 700, color: "#047857", marginTop: 2 }}>$31,840</strong>
              <small style={{ color: "#059669", fontSize: ".74rem", fontWeight: 600 }}>15 closed cases</small>
            </div>
            <div>
              <span style={{ fontSize: ".7rem", color: "#64748b" }}>Recovered Credits</span>
              <strong className="mono tabular-nums" style={{ display: "block", fontSize: "1.6rem", fontWeight: 700, color: "#0f172a", marginTop: 2 }}>$8,420</strong>
              <small style={{ color: "#3b82f6", fontSize: ".74rem", fontWeight: 600 }}>YTD credits</small>
            </div>
          </div>
        </div>

        <div className="ios-widget-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: ".72rem", fontWeight: 750, letterSpacing: ".08em", textTransform: "uppercase", color: "#64748b" }}>Discovered Margin Leakage</span>
            <span style={{ fontSize: ".7rem", fontWeight: 700, color: "#d97706", background: "#fffbeb", padding: "2px 8px", borderRadius: "99px", border: "1px solid #fde68a" }}>12 Active</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <span style={{ fontSize: ".7rem", color: "#64748b" }}>Potential Savings</span>
              <strong className="mono tabular-nums" style={{ display: "block", fontSize: "1.6rem", fontWeight: 700, color: "#0f172a", marginTop: 2 }}>$74,260</strong>
              <small style={{ color: "#d97706", fontSize: ".74rem", fontWeight: 600 }}>12 opportunities</small>
            </div>
            <div>
              <span style={{ fontSize: ".7rem", color: "#64748b" }}>Monitored Spend</span>
              <strong className="mono tabular-nums" style={{ display: "block", fontSize: "1.6rem", fontWeight: 700, color: "#0f172a", marginTop: 2 }}>$1.84M</strong>
              <small style={{ color: "#dc2626", fontSize: ".74rem", fontWeight: 600 }}>↑ 3.2% vs prior</small>
            </div>
          </div>
        </div>

        <div className="ios-widget-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: ".72rem", fontWeight: 750, letterSpacing: ".08em", textTransform: "uppercase", color: "#64748b" }}>Contract & Operational Health</span>
            <span style={{ fontSize: ".7rem", fontWeight: 700, color: "#059669", background: "#ecfdf5", padding: "2px 8px", borderRadius: "99px", border: "1px solid #a7f3d0" }}>Good</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <span style={{ fontSize: ".7rem", color: "#64748b" }}>Data Coverage</span>
              <strong className="mono tabular-nums" style={{ display: "block", fontSize: "1.6rem", fontWeight: 700, color: "#0f172a", marginTop: 2 }}>86%</strong>
              <small style={{ color: "#059669", fontSize: ".74rem", fontWeight: 600 }}>84 accounts</small>
            </div>
            <div>
              <span style={{ fontSize: ".7rem", color: "#64748b" }}>Renewing (90d)</span>
              <strong className="mono tabular-nums" style={{ display: "block", fontSize: "1.6rem", fontWeight: 700, color: "#0f172a", marginTop: 2 }}>27</strong>
              <small style={{ color: "#d97706", fontSize: ".74rem", fontWeight: 600 }}>2 urgent notice</small>
            </div>
          </div>
        </div>
      </div>

      {/* 90-Day Renewal Risk Radar Horizon Cards */}
      <div className="ios-radar-grid">
        <div className="ios-radar-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="ios-status-pill high">
              <Clock3 size={12} /> 3 Days Remaining
            </span>
            <span className="mono" style={{ fontSize: ".7rem", color: "#64748b" }}>Notice: 90 days</span>
          </div>
          <strong style={{ display: "block", marginTop: 10, fontSize: ".98rem", color: "#0f172a" }}>Verizon Wireless Master Services</strong>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 6 }}>
            <span className="mono tabular-nums" style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>$98,450 / yr</span>
            <span style={{ fontSize: ".72rem", color: "#dc2626", fontWeight: 600 }}>+14.2% surcharge variance</span>
          </div>
          <div style={{ marginTop: 12 }}>
            <button className="button button-quiet" type="button" style={{ width: "100%", borderRadius: "99px", fontSize: ".78rem", minHeight: 34, borderColor: "#e2e8f0", color: "#0f172a", background: "#ffffff" }} onClick={() => setSelectedOpp(opportunityRows[0])}>
              Review Opportunity Evidence <ArrowRight size={14} />
            </button>
          </div>
        </div>

        <div className="ios-radar-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="ios-status-pill medium">
              <Clock3 size={12} /> 17 Days Remaining
            </span>
            <span className="mono" style={{ fontSize: ".7rem", color: "#64748b" }}>Notice: 60 days</span>
          </div>
          <strong style={{ display: "block", marginTop: 10, fontSize: ".98rem", color: "#0f172a" }}>Direct Energy TX Portfolio</strong>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 6 }}>
            <span className="mono tabular-nums" style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>$82,610 / yr</span>
            <span style={{ fontSize: ".72rem", color: "#d97706", fontWeight: 600 }}>Rate cap review needed</span>
          </div>
          <div style={{ marginTop: 12 }}>
            <button className="button button-quiet" type="button" style={{ width: "100%", borderRadius: "99px", fontSize: ".78rem", minHeight: 34, borderColor: "#e2e8f0", color: "#0f172a", background: "#ffffff" }} onClick={() => setSelectedOpp(opportunityRows[2])}>
              Request Expert Review <ArrowRight size={14} />
            </button>
          </div>
        </div>

        <div className="ios-radar-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="ios-status-pill good">
              <Clock3 size={12} /> 92 Days Remaining
            </span>
            <span className="mono" style={{ fontSize: ".7rem", color: "#64748b" }}>Notice: 30 days</span>
          </div>
          <strong style={{ display: "block", marginTop: 10, fontSize: ".98rem", color: "#0f172a" }}>Adobe Enterprise Agreement</strong>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 6 }}>
            <span className="mono tabular-nums" style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>$62,140 / yr</span>
            <span style={{ fontSize: ".72rem", color: "#059669", fontWeight: 600 }}>14 inactive licenses</span>
          </div>
          <div style={{ marginTop: 12 }}>
            <button className="button button-quiet" type="button" style={{ width: "100%", borderRadius: "99px", fontSize: ".78rem", minHeight: 34, borderColor: "#e2e8f0", color: "#0f172a", background: "#ffffff" }} onClick={() => setSelectedOpp(opportunityRows[1])}>
              Review Deprovisioning Plan <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Action Queue Opportunity Section */}
      <section className="panel action-panel" style={{ borderRadius: 20, boxShadow: "0 10px 32px -4px rgba(15,23,42,0.05)" }}>
        <div className="panel-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14, padding: "16px 20px" }}>
          {/* iOS Segmented Pill Controls */}
          <div className="ios-segmented-control" role="tablist" aria-label="Action queue filter">
            {[
              ["All", "All", 9],
              ["My approvals", "My approvals", 3],
              ["Ready", "Ready", 3],
              ["High value", "High value", 2],
            ].map(([label, value, count]) => (
              <button
                className={`ios-segment-btn ${filter === value ? "active" : ""}`}
                type="button"
                role="tab"
                aria-selected={filter === value}
                onClick={() => setFilter(String(value))}
                key={String(value)}
              >
                {label} <span className="ios-segment-badge">{count}</span>
              </button>
            ))}
          </div>

          {/* Category Filter Chips & Search Capsule */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div className="ios-filter-chips">
              {["All", "Telecom", "Software", "Energy"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`ios-filter-chip ${categoryFilter === cat ? "active" : ""}`}
                  onClick={() => setCategoryFilter(cat)}
                >
                  {cat === "Telecom" && <Phone size={12} />}
                  {cat === "Software" && <Layers size={12} />}
                  {cat === "Energy" && <Zap size={12} />}
                  {cat}
                </button>
              ))}
            </div>

            <div className="ios-search-capsule">
              <Search size={14} style={{ color: "#94a3b8" }} />
              <input
                type="text"
                placeholder="Search cases or vendors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search opportunity queue"
              />
              {searchQuery && (
                <button type="button" style={{ border: 0, background: "transparent", cursor: "pointer", color: "#94a3b8" }} onClick={() => setSearchQuery("")}>
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        <OpportunityTable
          rows={visible}
          onRowClick={(row) => setSelectedOpp(row)}
          onApproveClick={(row) => setApprovalModalOpp(row)}
        />
      </section>

      {/* Asymmetric Lower Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.85fr", gap: 16, marginTop: 24 }}>
        {/* Left Column: Savings Progression Chart + Live Agent Activity */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <section className="panel" style={{ borderRadius: 18 }}>
            <div className="panel-header">
              <div>
                <h2>Savings & Spend Progression</h2>
                <span className="eyebrow" style={{ color: "#64748b" }}>12-Month Monitored Trajectory</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: ".76rem", color: "#3b82f6", fontWeight: 600 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6" }} /> Potential
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: ".76rem", color: "#10b981", fontWeight: 600 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} /> Verified
                </span>
              </div>
            </div>
            <div className="panel-body">
              <SavingsChart />
            </div>
          </section>

          <section className="panel" style={{ borderRadius: 18 }}>
            <div className="panel-header">
              <h2>Live Intelligence & Agent Audit Log</h2>
              <Link href="/app/reports" style={{ fontSize: ".8rem", color: "#3b82f6", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                View complete log <ArrowRight size={14} />
              </Link>
            </div>
            <div className="panel-body">
              <Activity />
            </div>
          </section>
        </div>

        {/* Right Column: Vendor Concentration + Instant Dropzone */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <section className="panel" style={{ borderRadius: 18 }}>
            <div className="panel-header">
              <h2>Vendor Spend Concentration</h2>
              <span className="eyebrow" style={{ color: "#64748b" }}>Top Recurring</span>
            </div>
            <div className="panel-body">
              {vendors.map((v) => (
                <div key={v[0]} style={{ padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <strong style={{ fontSize: ".86rem", color: "#0f172a" }}>{v[0]}</strong>
                    <span className="mono tabular-nums" style={{ fontSize: ".86rem", fontWeight: 700, color: "#0f172a" }}>{v[2]}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: ".74rem", color: "#64748b" }}>
                    <span>{v[1]} • {v[4]}</span>
                    <span style={{ color: "#059669", fontWeight: 600 }}>{v[3]} of total spend</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Mini Fast Intake Dropzone Card */}
          <div className="ios-widget-card" style={{ background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)", border: "2px dashed #cbd5e1", textAlign: "center", padding: "24px 18px" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#ffffff", border: "1px solid #e2e8f0", display: "grid", placeItems: "center", margin: "0 auto 12px", boxShadow: "0 4px 12px rgba(15,23,42,0.05)", color: "#3b82f6" }}>
              <Upload size={20} />
            </div>
            <strong style={{ display: "block", fontSize: ".95rem", color: "#0f172a" }}>Instant Invoice & Contract Intake</strong>
            <p style={{ fontSize: ".78rem", color: "#64748b", margin: "4px 0 14px", lineHeight: 1.4 }}>
              Drag and drop any recurring cost document for instant SHA-256 deduplication and schema extraction.
            </p>
            <Link href="/app/documents" className="button button-primary" style={{ borderRadius: "99px", fontSize: ".8rem", minHeight: 36, width: "100%" }}>
              Select Document File
            </Link>
          </div>
        </div>
      </div>

      {/* Slide-Over Evidence Inspector Drawer */}
      {selectedOpp && (
        <EvidenceDrawer
          row={selectedOpp}
          onClose={() => setSelectedOpp(null)}
          onAuthorize={() => {
            setApprovalModalOpp(selectedOpp);
            setSelectedOpp(null);
          }}
        />
      )}

      {/* Consequential Action Approval Modal */}
      {approvalModalOpp && (
        <ApprovalModal
          row={approvalModalOpp}
          onClose={() => setApprovalModalOpp(null)}
        />
      )}
    </div>
  );
}

function Metric({ label, value, note, verified = false }: { label: string; value: string; note: string; verified?: boolean }) {
  return (
    <div>
      <span style={{ display: "block", fontSize: ".65rem", textTransform: "uppercase", letterSpacing: ".06em", color: "#64748b", fontWeight: 700 }}>{label}</span>
      <strong className={`tabular-nums ${verified ? "verified" : ""}`} style={{ display: "block", fontSize: "1.45rem", marginTop: 4, color: "#0f172a" }}>{value}</strong>
      <small style={{ color: verified ? "#059669" : "#3b82f6", fontSize: ".72rem", fontWeight: 600 }}>{note}</small>
    </div>
  );
}

function OpportunityTable({
  rows = opportunityRows,
  onRowClick,
  onApproveClick,
}: {
  rows?: typeof opportunityRows;
  onRowClick?: (row: typeof opportunityRows[0]) => void;
  onApproveClick?: (row: typeof opportunityRows[0]) => void;
}) {
  if (rows.length === 0) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
        <ShieldCheck size={32} style={{ color: "#3b82f6", margin: "0 auto 12px" }} />
        <strong style={{ display: "block", color: "#0f172a", fontSize: "1rem" }}>No matching opportunities found</strong>
        <p style={{ margin: "4px 0 0", fontSize: ".85rem" }}>Try adjusting your search query or filter chips above.</p>
      </div>
    );
  }

  return (
    <div className="table-scroll">
      <table className="data-table ios-table">
        <thead>
          <tr>
            <th style={{ paddingLeft: 20 }}>Category & Vendor</th>
            <th>Opportunity Case</th>
            <th>Finding Type</th>
            <th>Est. Annual Value</th>
            <th>Confidence</th>
            <th>Evidence</th>
            <th>Deadline</th>
            <th style={{ paddingRight: 20, textAlign: "right" }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isTelecom = row.vendor.toLowerCase().includes("verizon") || row.title.toLowerCase().includes("telecom");
            const isSoftware = row.vendor.toLowerCase().includes("adobe") || row.title.toLowerCase().includes("software");
            const isEnergy = row.vendor.toLowerCase().includes("direct energy") || row.title.toLowerCase().includes("energy");

            return (
              <tr
                key={row.title}
                className="table-row-clickable"
                onClick={() => onRowClick?.(row)}
                style={{ cursor: "pointer" }}
              >
                <td style={{ paddingLeft: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div className={`ios-icon-glyph ${isTelecom ? "blue" : isSoftware ? "purple" : "amber"}`}>
                      {isTelecom && <Phone size={17} />}
                      {isSoftware && <Layers size={17} />}
                      {isEnergy && <Zap size={17} />}
                    </div>
                    <div>
                      <strong style={{ display: "block", fontSize: ".88rem", color: "#0f172a" }}>{row.vendor}</strong>
                      <span style={{ fontSize: ".72rem", color: "#64748b" }}>{isTelecom ? "Telecom" : isSoftware ? "Software" : "Energy"}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="table-title" style={{ fontSize: ".88rem", color: "#0f172a" }}>{row.title}</span>
                  <span className="table-meta" style={{ fontSize: ".72rem" }}>Discrepancy verified against contract baseline</span>
                </td>
                <td>
                  <span className={`ios-status-pill ${row.priority === "High" ? "high" : "medium"}`}>
                    <CircleAlert size={12} /> {row.type}
                  </span>
                </td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <TrendingDown size={14} style={{ color: "#059669" }} />
                    <strong className="mono tabular-nums" style={{ fontSize: "1rem", color: "#059669", fontWeight: 700 }}>{row.value}</strong>
                    <span style={{ fontSize: ".7rem", color: "#64748b" }}>/ yr</span>
                  </div>
                </td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="mono" style={{ fontSize: ".8rem", fontWeight: 700, color: "#0f172a" }}>{row.confidence}%</span>
                    <div className="confidence-bar" style={{ width: 50, height: 4, borderRadius: 99, background: "#e2e8f0" }}>
                      <div className="confidence-fill" style={{ width: `${row.confidence}%`, height: "100%", borderRadius: 99, background: row.confidence > 80 ? "#10b981" : "#f59e0b" }} />
                    </div>
                  </div>
                </td>
                <td>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".78rem", color: "#475569", background: "#f1f5f9", padding: "3px 8px", borderRadius: 6 }}>
                    <FileText size={13} style={{ color: "#3b82f6" }} /> {row.evidence} sources
                  </span>
                </td>
                <td>
                  <span className="mono" style={{ fontSize: ".78rem", fontWeight: 600, color: row.deadline.includes("3") ? "#dc2626" : "#475569" }}>
                    {row.deadline}
                  </span>
                </td>
                <td style={{ paddingRight: 20, textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                  <button
                    className="button button-quiet"
                    type="button"
                    style={{ borderRadius: "99px", fontSize: ".78rem", minHeight: 34, padding: "0 14px", borderColor: "#cbd5e1" }}
                    onClick={() => onApproveClick?.(row)}
                  >
                    {row.action}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* Slide-Over Evidence Inspector Component */
function EvidenceDrawer({
  row,
  onClose,
  onAuthorize,
}: {
  row: typeof opportunityRows[0];
  onClose: () => void;
  onAuthorize: () => void;
}) {
  const details = opportunityDetails[row.title] || {
    formula: `Standard baseline variance calculation = ${row.value}`,
    sourceDoc: `${row.vendor}_document_proof.pdf`,
    sourceText: `Source verification excerpt for ${row.title} matched against contract terms.`,
    matchedFields: [
      { label: "Estimated Annual Savings", value: row.value },
      { label: "Confidence Rating", value: `${row.confidence}%` },
    ],
    impactDescription: "Review evidence and authorize next step.",
    dataScope: [row.vendor, "Source document line items"],
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer-content" style={{ borderRadius: "24px 0 0 24px" }}>
        <div style={{ padding: "16px 24px 0" }}>
          <div className="ios-sheet-handle" />
        </div>
        <div className="drawer-header">
          <div>
            <span className="eyebrow" style={{ color: "var(--mint)" }}>Evidence Inspector</span>
            <h3 className="drawer-title">{row.title}</h3>
          </div>
          <button type="button" style={{ background: "transparent", border: 0, color: "#9ca7b9", cursor: "pointer" }} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="drawer-body">
          {/* Left Pane: Deterministic Calculation & Matched Facts */}
          <div className="drawer-pane">
            <div className="drawer-pane-title">
              <span>Financial Calculation</span>
              <Calculator size={14} />
            </div>

            <div style={{ background: "#080b14", border: "1px solid #232c3d", padding: 14, borderRadius: 8, marginBottom: 16 }}>
              <span style={{ fontSize: ".72rem", color: "#8e9bb0", textTransform: "uppercase", display: "block" }}>Formula / Logic Version 1.4</span>
              <strong className="mono" style={{ color: "var(--mint)", fontSize: ".88rem", marginTop: 4, display: "block" }}>
                {details.formula}
              </strong>
            </div>

            <div className="drawer-pane-title">Extracted Line Items</div>
            {details.matchedFields.map((f) => (
              <div className="fact-row" key={f.label}>
                <span className="fact-label">{f.label}</span>
                <span className="fact-value">{f.value}</span>
              </div>
            ))}

            <div style={{ marginTop: 24 }}>
              <button className="button button-primary" type="button" style={{ width: "100%", borderRadius: "99px" }} onClick={onAuthorize}>
                Review & Authorize Action <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Right Pane: Source Document Proof */}
          <div className="drawer-pane">
            <div className="drawer-pane-title">
              <span>Source Document Proof</span>
              <span className="mono" style={{ fontSize: ".68rem", color: "var(--blue)" }}>{details.sourceDoc}</span>
            </div>

            <div className="document-snippet" style={{ borderRadius: 8 }}>
              <div style={{ marginBottom: 10, color: "#8e9bb0", fontSize: ".72rem" }}>EXCERPT MATCHED BY EXTRACTION ENGINE:</div>
              <p style={{ margin: 0 }}>
                &ldquo;<mark>{details.sourceText}</mark>&rdquo;
              </p>
            </div>

            {details.disclosureNotice && (
              <div style={{ marginTop: 16, padding: 12, background: "rgba(80,103,255,0.1)", border: "1px solid rgba(80,103,255,0.3)", borderRadius: 8, fontSize: ".78rem", color: "#c4cede" }}>
                <strong style={{ display: "block", color: "var(--blue)", marginBottom: 4 }}>Independent Relationship Disclosure</strong>
                {details.disclosureNotice}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* Consequential Approval Modal Component */
function ApprovalModal({
  row,
  onClose,
}: {
  row: typeof opportunityRows[0];
  onClose: () => void;
}) {
  const [step, setStep] = useState<"review" | "confirmed">("review");
  const details = opportunityDetails[row.title];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ borderRadius: 20 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="eyebrow" style={{ color: "var(--mint)" }}>Human Authorization Required</span>
          <h3 style={{ margin: "4px 0 0", fontFamily: "Georgia, serif", fontSize: "1.3rem" }}>{row.title}</h3>
        </div>

        {step === "review" ? (
          <>
            <div className="modal-body">
              <div style={{ display: "flex", justifyContent: "space-between", background: "#121a29", border: "1px solid #232c3d", padding: 16, borderRadius: 10 }}>
                <div>
                  <span style={{ fontSize: ".72rem", color: "#8e9bb0" }}>Financial Impact</span>
                  <strong className="mono" style={{ display: "block", fontSize: "1.3rem", color: "var(--mint)", marginTop: 2 }}>{row.value} / yr</strong>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: ".72rem", color: "#8e9bb0" }}>Affected Vendor</span>
                  <strong style={{ display: "block", fontSize: ".95rem", color: "#ffffff", marginTop: 4 }}>{row.vendor}</strong>
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <strong style={{ fontSize: ".85rem", color: "#d4dceb" }}>Action Scope & Transmitted Data:</strong>
                <div className="scope-checklist" style={{ borderRadius: 10 }}>
                  {(details?.dataScope || ["Vendor record", "Financial dispute metadata"]).map((item) => (
                    <div className="scope-item" key={item}>
                      <FileCheck size={16} style={{ color: "var(--mint)", flexShrink: 0, marginTop: 2 }} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="audit-stamp" style={{ borderRadius: 8 }}>
                <UserCheck size={15} style={{ color: "var(--blue)" }} />
                <span>Authorized Actor: <strong>Alex Morgan (Controller)</strong> • Timestamp: UTC 2026-07-30</span>
              </div>
            </div>

            <div className="modal-footer">
              <button className="button button-quiet" type="button" style={{ borderRadius: "99px" }} onClick={onClose}>Cancel</button>
              <button className="button button-primary" type="button" style={{ borderRadius: "99px" }} onClick={() => setStep("confirmed")}>
                Authorize & Execute Action
              </button>
            </div>
          </>
        ) : (
          <div className="modal-body" style={{ textAlign: "center", padding: "40px 24px" }}>
            <ShieldCheck size={48} style={{ color: "var(--mint)", margin: "0 auto 16px" }} />
            <h3 style={{ margin: 0, fontFamily: "Georgia, serif", fontSize: "1.4rem" }}>Action Authorized & Logged</h3>
            <p style={{ color: "#9ca7b9", maxWidth: 400, margin: "10px auto 0", fontSize: ".9rem" }}>
              The authorization has been appended to the side-effect ledger. Trace ID: <span className="mono">TRC-884920</span>.
            </p>
            <div style={{ marginTop: 24 }}>
              <button className="button button-primary" type="button" style={{ borderRadius: "99px", padding: "0 28px" }} onClick={onClose}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Activity() {
  const activity = [
    ["9:42 AM", "Extracted Verizon May 2026 invoice & variance breakdown", "INV-74219", "Telecom"],
    ["8:31 AM", "Detected 14 unallocated Adobe seats via usage telemetry", "AUD-9982", "Software"],
    ["Yesterday", "Completed ERCOT index rate comparison for Direct Energy meters", "BENCH-5561", "Energy"],
    ["May 16", "Reconciled Dell hardware warranty credit of $8,420", "CR-88421", "Hardware"],
  ];

  return (
    <div className="activity-list">
      {activity.map(([time, copy, id, tag]) => (
        <div className="activity-row" key={id} style={{ alignItems: "center" }}>
          <span className="muted mono" style={{ fontSize: ".72rem" }}>{time}</span>
          <div>
            <span style={{ fontSize: ".83rem", color: "#0f172a" }}>{copy}</span>
            <span style={{ marginLeft: 8, fontSize: ".68rem", color: "#64748b", background: "#f1f5f9", padding: "1px 6px", borderRadius: 4 }}>{tag}</span>
          </div>
          <Link href="/app/documents" style={{ color: "#3b82f6", fontSize: ".75rem", fontWeight: 600 }}>{id}</Link>
        </div>
      ))}
    </div>
  );
}

function SavingsChart() {
  return (
    <svg className="chart" viewBox="0 0 520 210" role="img" aria-label="Potential and verified savings grew during the last twelve months">
      <defs>
        <linearGradient id="gradientVerified" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
        </linearGradient>
        <linearGradient id="gradientPotential" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      {[30, 75, 120, 165].map((y) => (
        <line key={y} x1="35" y1={y} x2="505" y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
      ))}
      <path d="M36 183 C85 165 105 150 140 142 S208 108 252 100 S320 80 355 73 S425 38 505 27" fill="none" stroke="#3b82f6" strokeWidth="3" strokeDasharray="6 4" />
      <path d="M36 183 C85 165 105 150 140 142 S208 108 252 100 S320 80 355 73 S425 38 505 27 L505 195 L36 195Z" fill="url(#gradientPotential)" />
      <path d="M36 187 C91 181 112 174 151 165 S222 158 255 144 S324 145 351 126 S438 115 505 111" fill="none" stroke="#10b981" strokeWidth="3.5" />
      <path d="M36 187 C91 181 112 174 151 165 S222 158 255 144 S324 145 351 126 S438 115 505 111 L505 195 L36 195Z" fill="url(#gradientVerified)" />
      {/* Interactive Month Points */}
      {[[140, 142], [252, 100], [355, 73], [505, 27]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" />
      ))}
      {[[151, 165], [255, 144], [351, 126], [505, 111]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4.5" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
      ))}
      <text x="36" y="208" fontSize="10" fill="#64748b" fontWeight="600">Jun</text>
      <text x="140" y="208" fontSize="10" fill="#64748b">Sep</text>
      <text x="250" y="208" fontSize="10" fill="#64748b">Dec</text>
      <text x="360" y="208" fontSize="10" fill="#64748b">Mar</text>
      <text x="481" y="208" fontSize="10" fill="#64748b" fontWeight="600">May</text>
      <text x="410" y="20" fontSize="11" fill="#3b82f6" fontWeight="700">$74,260 potential</text>
      <text x="415" y="104" fontSize="11" fill="#10b981" fontWeight="700">$31,840 verified</text>
    </svg>
  );
}

function Expenses() {
  return (
    <div className="app-content">
      <AppPageHeader
        title="Expense Intelligence"
        description="Monitor recurring spend across 84 accounts, vendors, and 12 commercial locations."
        actions={
          <button className="button button-primary" type="button" style={{ borderRadius: "99px" }}>
            <Plus size={16} /> Add Expense Account
          </button>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        <div className="ios-widget-card">
          <span style={{ fontSize: ".72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Monitored Spend</span>
          <strong className="mono tabular-nums" style={{ display: "block", fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", marginTop: 4 }}>$1.84M</strong>
          <small style={{ color: "#dc2626", fontSize: ".74rem", fontWeight: 600 }}>↑ 3.2% vs prior quarter</small>
        </div>
        <div className="ios-widget-card">
          <span style={{ fontSize: ".72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Active Accounts</span>
          <strong className="mono tabular-nums" style={{ display: "block", fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", marginTop: 4 }}>84</strong>
          <small style={{ color: "#059669", fontSize: ".74rem", fontWeight: 600 }}>100% reconciled</small>
        </div>
        <div className="ios-widget-card">
          <span style={{ fontSize: ".72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Locations Monitored</span>
          <strong className="mono tabular-nums" style={{ display: "block", fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", marginTop: 4 }}>12</strong>
          <small style={{ color: "#3b82f6", fontSize: ".74rem", fontWeight: 600 }}>Hotels & Hospitality</small>
        </div>
        <div className="ios-widget-card">
          <span style={{ fontSize: ".72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Data Coverage</span>
          <strong className="mono tabular-nums" style={{ display: "block", fontSize: "1.5rem", fontWeight: 700, color: "#059669", marginTop: 4 }}>86%</strong>
          <small style={{ color: "#059669", fontSize: ".74rem", fontWeight: 600 }}>72 bills parsed</small>
        </div>
      </div>

      {/* Spend Distribution Visualizer */}
      <section className="panel" style={{ borderRadius: 18, marginBottom: 24, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <strong style={{ fontSize: "1rem", color: "#0f172a" }}>Category Spend Breakdown</strong>
            <span style={{ display: "block", fontSize: ".78rem", color: "#64748b" }}>Share of $1.84M total annual spend</span>
          </div>
          <span className="mono" style={{ fontSize: ".8rem", color: "#3b82f6", fontWeight: 700 }}>4 Primary Categories</span>
        </div>
        <div className="spend-bar-container">
          <div className="spend-bar-segment" style={{ width: "35%", background: "#3b82f6" }} />
          <div className="spend-bar-segment" style={{ width: "28%", background: "#10b981" }} />
          <div className="spend-bar-segment" style={{ width: "20%", background: "#f59e0b" }} />
          <div className="spend-bar-segment" style={{ width: "17%", background: "#64748b" }} />
        </div>
        <div className="spend-legend" style={{ marginTop: 14 }}>
          <div className="spend-legend-item"><span className="legend-dot" style={{ background: "#3b82f6" }} /> Food Service & Operations (35% • $644K)</div>
          <div className="spend-legend-item"><span className="legend-dot" style={{ background: "#10b981" }} /> Software & SaaS (28% • $515K)</div>
          <div className="spend-legend-item"><span className="legend-dot" style={{ background: "#f59e0b" }} /> Telecom & Internet (20% • $368K)</div>
          <div className="spend-legend-item"><span className="legend-dot" style={{ background: "#64748b" }} /> Commercial Energy (17% • $313K)</div>
        </div>
      </section>

      <section className="panel" style={{ borderRadius: 18 }}>
        <div className="panel-header" style={{ padding: "16px 20px" }}>
          <h2>Expense Accounts & Accounts Ledger</h2>
          <span className="eyebrow">84 Active Accounts</span>
        </div>
        <SimpleTable headers={["Vendor", "Category", "Coverage", "Annual Spend", "12-Month Change", "Status"]} rows={expenseRows} />
      </section>
    </div>
  );
}

function Opportunities() {
  const [selectedOpp, setSelectedOpp] = useState<typeof opportunityRows[0] | null>(null);
  const [approvalModalOpp, setApprovalModalOpp] = useState<typeof opportunityRows[0] | null>(null);

  return (
    <div className="app-content">
      <AppPageHeader
        title="Opportunities & Cost Recovery Cases"
        description="Evidence-backed cases requiring review, authorization, or recovery execution."
        actions={
          <button className="button button-primary" type="button" style={{ borderRadius: "99px" }}>
            <Plus size={16} /> New Case
          </button>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        <div className="ios-widget-card">
          <span style={{ fontSize: ".72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Potential Value</span>
          <strong className="mono tabular-nums" style={{ display: "block", fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", marginTop: 4 }}>$74,260</strong>
          <small style={{ color: "#d97706", fontSize: ".74rem", fontWeight: 600 }}>12 active cases</small>
        </div>
        <div className="ios-widget-card">
          <span style={{ fontSize: ".72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Needs Approval</span>
          <strong className="mono tabular-nums" style={{ display: "block", fontSize: "1.5rem", fontWeight: 700, color: "#d97706", marginTop: 4 }}>3</strong>
          <small style={{ color: "#d97706", fontSize: ".74rem", fontWeight: 600 }}>CFO action required</small>
        </div>
        <div className="ios-widget-card">
          <span style={{ fontSize: ".72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Ready to Execute</span>
          <strong className="mono tabular-nums" style={{ display: "block", fontSize: "1.5rem", fontWeight: 700, color: "#3b82f6", marginTop: 4 }}>3</strong>
          <small style={{ color: "#3b82f6", fontSize: ".74rem", fontWeight: 600 }}>Approved plans</small>
        </div>
        <div className="ios-widget-card">
          <span style={{ fontSize: ".72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Closed Cases</span>
          <strong className="mono tabular-nums" style={{ display: "block", fontSize: "1.5rem", fontWeight: 700, color: "#059669", marginTop: 4 }}>15</strong>
          <small style={{ color: "#059669", fontSize: ".74rem", fontWeight: 600 }}>$31,840 verified</small>
        </div>
      </div>

      <section className="panel" style={{ borderRadius: 20 }}>
        <div className="panel-header" style={{ padding: "16px 20px" }}>
          <h2>Open Opportunity Cases</h2>
          <span className="eyebrow">12 Total Active Cases</span>
        </div>
        <OpportunityTable
          rows={opportunityRows}
          onRowClick={(row) => setSelectedOpp(row)}
          onApproveClick={(row) => setApprovalModalOpp(row)}
        />
      </section>

      {selectedOpp && (
        <EvidenceDrawer
          row={selectedOpp}
          onClose={() => setSelectedOpp(null)}
          onAuthorize={() => {
            setApprovalModalOpp(selectedOpp);
            setSelectedOpp(null);
          }}
        />
      )}

      {approvalModalOpp && (
        <ApprovalModal
          row={approvalModalOpp}
          onClose={() => setApprovalModalOpp(null)}
        />
      )}
    </div>
  );
}

function Contracts() {
  const [selectedOpp, setSelectedOpp] = useState<typeof opportunityRows[0] | null>(null);

  return (
    <div className="app-content">
      <AppPageHeader
        title="Contract & Renewal Horizon"
        description="Never miss a 30, 60, or 90-day agreement notice window."
        actions={
          <button className="button button-primary" type="button" style={{ borderRadius: "99px" }}>
            <Plus size={16} /> Add Contract
          </button>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        <div className="ios-widget-card">
          <span style={{ fontSize: ".72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Active Contracts</span>
          <strong className="mono tabular-nums" style={{ display: "block", fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", marginTop: 4 }}>34</strong>
          <small style={{ color: "#059669", fontSize: ".74rem", fontWeight: 600 }}>All files attached</small>
        </div>
        <div className="ios-widget-card">
          <span style={{ fontSize: ".72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Renewing (90d)</span>
          <strong className="mono tabular-nums" style={{ display: "block", fontSize: "1.5rem", fontWeight: 700, color: "#d97706", marginTop: 4 }}>12</strong>
          <small style={{ color: "#d97706", fontSize: ".74rem", fontWeight: 600 }}>Notice windows open</small>
        </div>
        <div className="ios-widget-card">
          <span style={{ fontSize: ".72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Notice Closing</span>
          <strong className="mono tabular-nums" style={{ display: "block", fontSize: "1.5rem", fontWeight: 700, color: "#dc2626", marginTop: 4 }}>2</strong>
          <small style={{ color: "#dc2626", fontSize: ".74rem", fontWeight: 600 }}>Action required</small>
        </div>
        <div className="ios-widget-card">
          <span style={{ fontSize: ".72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Monitored Value</span>
          <strong className="mono tabular-nums" style={{ display: "block", fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", marginTop: 4 }}>$1.21M</strong>
          <small style={{ color: "#3b82f6", fontSize: ".74rem", fontWeight: 600 }}>34 agreements</small>
        </div>
      </div>

      {/* 90-Day Renewal Horizon Cards */}
      <div className="ios-radar-grid" style={{ marginBottom: 24 }}>
        <div className="ios-radar-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="ios-status-pill high">
              <Clock3 size={12} /> 3 Days Remaining
            </span>
            <span className="mono" style={{ fontSize: ".7rem", color: "#64748b" }}>Notice: 90 days</span>
          </div>
          <strong style={{ display: "block", marginTop: 10, fontSize: ".98rem", color: "#0f172a" }}>Verizon Wireless Master Services</strong>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 6 }}>
            <span className="mono tabular-nums" style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>$98,450 / yr</span>
            <span style={{ fontSize: ".72rem", color: "#dc2626", fontWeight: 600 }}>+14.2% surcharge variance</span>
          </div>
          <div style={{ marginTop: 12 }}>
            <button className="button button-quiet" type="button" style={{ width: "100%", borderRadius: "99px", fontSize: ".78rem", minHeight: 34, borderColor: "#e2e8f0", color: "#0f172a", background: "#ffffff" }} onClick={() => setSelectedOpp(opportunityRows[0])}>
              Review Contract Evidence <ArrowRight size={14} />
            </button>
          </div>
        </div>

        <div className="ios-radar-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="ios-status-pill medium">
              <Clock3 size={12} /> 17 Days Remaining
            </span>
            <span className="mono" style={{ fontSize: ".7rem", color: "#64748b" }}>Notice: 60 days</span>
          </div>
          <strong style={{ display: "block", marginTop: 10, fontSize: ".98rem", color: "#0f172a" }}>Direct Energy TX Portfolio</strong>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 6 }}>
            <span className="mono tabular-nums" style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>$82,610 / yr</span>
            <span style={{ fontSize: ".72rem", color: "#d97706", fontWeight: 600 }}>Rate cap review needed</span>
          </div>
          <div style={{ marginTop: 12 }}>
            <button className="button button-quiet" type="button" style={{ width: "100%", borderRadius: "99px", fontSize: ".78rem", minHeight: 34, borderColor: "#e2e8f0", color: "#0f172a", background: "#ffffff" }} onClick={() => setSelectedOpp(opportunityRows[2])}>
              Request Expert Review <ArrowRight size={14} />
            </button>
          </div>
        </div>

        <div className="ios-radar-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="ios-status-pill good">
              <Clock3 size={12} /> 92 Days Remaining
            </span>
            <span className="mono" style={{ fontSize: ".7rem", color: "#64748b" }}>Notice: 30 days</span>
          </div>
          <strong style={{ display: "block", marginTop: 10, fontSize: ".98rem", color: "#0f172a" }}>Adobe Enterprise Agreement</strong>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 6 }}>
            <span className="mono tabular-nums" style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>$62,140 / yr</span>
            <span style={{ fontSize: ".72rem", color: "#059669", fontWeight: 600 }}>14 inactive licenses</span>
          </div>
          <div style={{ marginTop: 12 }}>
            <button className="button button-quiet" type="button" style={{ width: "100%", borderRadius: "99px", fontSize: ".78rem", minHeight: 34, borderColor: "#e2e8f0", color: "#0f172a", background: "#ffffff" }} onClick={() => setSelectedOpp(opportunityRows[1])}>
              Review Deprovisioning Plan <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <section className="panel" style={{ borderRadius: 20 }}>
        <div className="panel-header" style={{ padding: "16px 20px" }}>
          <h2>Contract Repository</h2>
          <span className="eyebrow">34 Active Agreements</span>
        </div>
        <SimpleTable headers={["Agreement", "Category", "Renewal Date", "Notice Window", "Time Remaining", "Status"]} rows={contractRows} />
      </section>

      {selectedOpp && (
        <EvidenceDrawer
          row={selectedOpp}
          onClose={() => setSelectedOpp(null)}
          onAuthorize={() => setSelectedOpp(null)}
        />
      )}
    </div>
  );
}

function Documents() {
  const [dragOver, setDragOver] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  return (
    <div className="app-content">
      <AppPageHeader
        title="Document Vault & Extraction Provenance"
        description="Private source files, structured extractions, and SHA-256 evidence links."
        actions={
          <button className="button button-primary" type="button" style={{ borderRadius: "99px" }} onClick={() => setUploaded(true)}>
            <Upload size={16} /> Fast Upload
          </button>
        }
      />

      {/* Intake Dropzone */}
      <div
        className={`dropzone-container ${dragOver ? "drag-over" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); setUploaded(true); }}
        onClick={() => setUploaded(true)}
        style={{ marginBottom: 24, borderRadius: 20, border: "2px dashed #cbd5e1", background: "#ffffff", padding: "28px 20px", textAlign: "center", cursor: "pointer" }}
      >
        <Upload size={32} style={{ color: "#3b82f6", margin: "0 auto 12px" }} />
        <strong style={{ display: "block", fontSize: "1.05rem", color: "#0f172a" }}>Drag & Drop Source PDF Bills or Contracts Here</strong>
        <p style={{ maxWidth: 500, margin: "6px auto 0", fontSize: ".88rem", color: "#64748b" }}>
          Every file is checked for size, type, scanned for malware, and assigned a SHA-256 digest before private storage.
        </p>

        <div className="upload-steps-list" style={{ marginTop: 18, display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          <div className="upload-step-pill" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: "99px", background: "#f1f5f9", fontSize: ".76rem", color: "#334155", fontWeight: 600 }}>
            <CheckCircle2 size={14} style={{ color: "#10b981" }} />
            <span>SHA-256 Hash Provenance</span>
          </div>
          <div className="upload-step-pill" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: "99px", background: "#f1f5f9", fontSize: ".76rem", color: "#334155", fontWeight: 600 }}>
            <CheckCircle2 size={14} style={{ color: "#10b981" }} />
            <span>Malware Scan Boundary</span>
          </div>
          <div className="upload-step-pill" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: "99px", background: "#f1f5f9", fontSize: ".76rem", color: "#334155", fontWeight: 600 }}>
            <CheckCircle2 size={14} style={{ color: "#10b981" }} />
            <span>Private Signed Access</span>
          </div>
          <div className="upload-step-pill" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: "99px", background: "#f1f5f9", fontSize: ".76rem", color: "#334155", fontWeight: 600 }}>
            <CheckCircle2 size={14} style={{ color: "#10b981" }} />
            <span>Versioned Schema Extraction</span>
          </div>
        </div>
      </div>

      {uploaded && (
        <div className="panel" style={{ marginBottom: 20, borderRadius: 16, borderColor: "#a7f3d0", background: "#ecfdf5", padding: "14px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <CheckCircle2 size={20} style={{ color: "#059669" }} />
            <div>
              <strong style={{ color: "#065f46", fontSize: ".92rem" }}>Intake Processed Successfully</strong>
              <div className="mono" style={{ fontSize: ".76rem", color: "#047857", marginTop: 2 }}>
                SHA-256: 8f9b402a118e9...a120 • Malware Scan: CLEAN • Signed Access: 15m Token
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        <div className="ios-widget-card">
          <span style={{ fontSize: ".72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Vault Files</span>
          <strong className="mono tabular-nums" style={{ display: "block", fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", marginTop: 4 }}>248</strong>
          <small style={{ color: "#059669", fontSize: ".74rem", fontWeight: 600 }}>100% SHA-256 hashed</small>
        </div>
        <div className="ios-widget-card">
          <span style={{ fontSize: ".72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Extraction Coverage</span>
          <strong className="mono tabular-nums" style={{ display: "block", fontSize: "1.5rem", fontWeight: 700, color: "#059669", marginTop: 4 }}>94%</strong>
          <small style={{ color: "#059669", fontSize: ".74rem", fontWeight: 600 }}>High confidence</small>
        </div>
        <div className="ios-widget-card">
          <span style={{ fontSize: ".72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Needs Review</span>
          <strong className="mono tabular-nums" style={{ display: "block", fontSize: "1.5rem", fontWeight: 700, color: "#d97706", marginTop: 4 }}>7</strong>
          <small style={{ color: "#d97706", fontSize: ".74rem", fontWeight: 600 }}>Low confidence items</small>
        </div>
        <div className="ios-widget-card">
          <span style={{ fontSize: ".72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Duplicates Blocked</span>
          <strong className="mono tabular-nums" style={{ display: "block", fontSize: "1.5rem", fontWeight: 700, color: "#3b82f6", marginTop: 4 }}>12</strong>
          <small style={{ color: "#3b82f6", fontSize: ".74rem", fontWeight: 600 }}>SHA-256 deduplicated</small>
        </div>
      </div>

      <section className="panel" style={{ borderRadius: 20 }}>
        <div className="panel-header" style={{ padding: "16px 20px" }}>
          <h2>Document Library & Extraction Records</h2>
          <span className="eyebrow">248 Files</span>
        </div>
        <SimpleTable headers={["Document", "Type", "Vendor", "Added", "Confidence", "Status"]} rows={documentRows} />
      </section>
    </div>
  );
}

function Actions() {
  const rows = [
    ["Send correction request", "Verizon Wireless", "External email", "Alex + Jordan", "Needs approval", "May 21"],
    ["Remove unused licenses", "Adobe", "Account change", "Alex Morgan", "Ready", "May 27"],
    ["Prepare energy review package", "Direct Energy", "Expert handoff", "Alex Morgan", "Needs consent", "Jun 4"],
    ["Request missing contract page", "Comcast Business", "External email", "Jordan Singh", "Draft", "Jun 8"]
  ];
  return (
    <ListPage
      title="Actions"
      description="Policy-controlled actions prepared by Costivra and authorized by your team."
      action="Create Action"
      summaries={[["Waiting for Approval", "3"], ["Ready to Execute", "3"], ["In Progress", "2"], ["Completed This Month", "14"]]}
      headers={["Action", "Vendor", "Type", "Owner", "Status", "Due"]}
      rows={rows}
    />
  );
}

function Savings() {
  const outcomes = [
    ["Unused Adobe licenses removed", "Recurring savings", "$12,430 / yr", "Invoice comparison", "Verified"],
    ["Dell overcharge credit", "One-time recovery", "$8,420", "Credit memo audit", "Verified"],
    ["Comcast plan right-sized", "Recurring savings", "$9,680 / yr", "3-month comparison", "Verified"],
    ["Verizon rate correction", "Potential savings", "$18,750 / yr", "Pending action", "Not verified"]
  ];

  return (
    <div className="app-content">
      <AppPageHeader
        title="Verified Savings & Outcomes"
        description="Protected verification standard comparing approved baselines against post-action bills."
        actions={
          <button className="button button-secondary" type="button" style={{ borderRadius: "99px" }}>
            <Download size={16} /> Export Audit Ledger
          </button>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        <div className="ios-widget-card">
          <span style={{ fontSize: ".72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Verified Annual Savings</span>
          <strong className="mono tabular-nums" style={{ display: "block", fontSize: "1.5rem", fontWeight: 700, color: "#047857", marginTop: 4 }}>$31,840</strong>
          <small style={{ color: "#059669", fontSize: ".74rem", fontWeight: 600 }}>15 closed cases</small>
        </div>
        <div className="ios-widget-card">
          <span style={{ fontSize: ".72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Recovered Credits</span>
          <strong className="mono tabular-nums" style={{ display: "block", fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", marginTop: 4 }}>$8,420</strong>
          <small style={{ color: "#3b82f6", fontSize: ".74rem", fontWeight: 600 }}>YTD credits</small>
        </div>
        <div className="ios-widget-card">
          <span style={{ fontSize: ".72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Potential Value</span>
          <strong className="mono tabular-nums" style={{ display: "block", fontSize: "1.5rem", fontWeight: 700, color: "#d97706", marginTop: 4 }}>$74,260</strong>
          <small style={{ color: "#d97706", fontSize: ".74rem", fontWeight: 600 }}>12 open cases</small>
        </div>
        <div className="ios-widget-card">
          <span style={{ fontSize: ".72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Verification Rate</span>
          <strong className="mono tabular-nums" style={{ display: "block", fontSize: "1.5rem", fontWeight: 700, color: "#059669", marginTop: 4 }}>73%</strong>
          <small style={{ color: "#059669", fontSize: ".74rem", fontWeight: 600 }}>High confidence</small>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.85fr", gap: 16, marginBottom: 24 }}>
        <section className="panel" style={{ borderRadius: 18 }}>
          <div className="panel-header" style={{ padding: "16px 20px" }}>
            <h2>Verified Value Progression</h2>
            <span className="eyebrow">12-Month Monitored Trajectory</span>
          </div>
          <div className="panel-body">
            <SavingsChart />
          </div>
        </section>

        <section className="panel" style={{ borderRadius: 18 }}>
          <div className="panel-header" style={{ padding: "16px 20px" }}>
            <h2>Verification Standard</h2>
            <ShieldCheck size={18} style={{ color: "#059669" }} />
          </div>
          <div className="panel-body">
            <p style={{ fontSize: ".86rem", color: "#475569", lineHeight: 1.6, marginBottom: 16 }}>
              A result becomes <strong>Verified</strong> only after Costivra compares an approved baseline against post-action bills or credit memos using pure, deterministic calculations.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ background: "#f8fafc", padding: 12, borderRadius: 10, border: "1px solid #e2e8f0" }}>
                <strong style={{ display: "block", fontSize: ".82rem", color: "#0f172a" }}>1. Baseline Approved</strong>
                <span style={{ fontSize: ".74rem", color: "#64748b" }}>Historical period and exclusions accepted</span>
              </div>
              <div style={{ background: "#f8fafc", padding: 12, borderRadius: 10, border: "1px solid #e2e8f0" }}>
                <strong style={{ display: "block", fontSize: ".82rem", color: "#0f172a" }}>2. Outcome Observed</strong>
                <span style={{ fontSize: ".74rem", color: "#64748b" }}>New post-action bill or credit recorded</span>
              </div>
              <div style={{ background: "#f8fafc", padding: 12, borderRadius: 10, border: "1px solid #e2e8f0" }}>
                <strong style={{ display: "block", fontSize: ".82rem", color: "#0f172a" }}>3. Value Calculated</strong>
                <span style={{ fontSize: ".74rem", color: "#64748b" }}>Formula version & evidence locked</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="panel" style={{ borderRadius: 20 }}>
        <div className="panel-header" style={{ padding: "16px 20px" }}>
          <h2>Savings Ledger & Audit Trail</h2>
          <span className="eyebrow">4 Tracked Outcomes</span>
        </div>
        <SimpleTable headers={["Outcome", "Value Type", "Amount", "Method", "Status"]} rows={outcomes} />
      </section>
    </div>
  );
}

function Vendors() {
  return (
    <div className="app-content">
      <AppPageHeader
        title="Vendor Concentration & Risk"
        description="Understand spend concentration, contract terms, and active findings by vendor."
        actions={
          <button className="button button-primary" type="button" style={{ borderRadius: "99px" }}>
            <Plus size={16} /> Add Vendor
          </button>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        <div className="ios-widget-card">
          <span style={{ fontSize: ".72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Active Vendors</span>
          <strong className="mono tabular-nums" style={{ display: "block", fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", marginTop: 4 }}>42</strong>
          <small style={{ color: "#059669", fontSize: ".74rem", fontWeight: 600 }}>All spend tracked</small>
        </div>
        <div className="ios-widget-card">
          <span style={{ fontSize: ".72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Top-5 Concentration</span>
          <strong className="mono tabular-nums" style={{ display: "block", fontSize: "1.5rem", fontWeight: 700, color: "#d97706", marginTop: 4 }}>40.9%</strong>
          <small style={{ color: "#d97706", fontSize: ".74rem", fontWeight: 600 }}>$752K spend</small>
        </div>
        <div className="ios-widget-card">
          <span style={{ fontSize: ".72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Contracts Attached</span>
          <strong className="mono tabular-nums" style={{ display: "block", fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", marginTop: 4 }}>34</strong>
          <small style={{ color: "#059669", fontSize: ".74rem", fontWeight: 600 }}>81% coverage</small>
        </div>
        <div className="ios-widget-card">
          <span style={{ fontSize: ".72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Vendors with Findings</span>
          <strong className="mono tabular-nums" style={{ display: "block", fontSize: "1.5rem", fontWeight: 700, color: "#dc2626", marginTop: 4 }}>8</strong>
          <small style={{ color: "#dc2626", fontSize: ".74rem", fontWeight: 600 }}>12 active cases</small>
        </div>
      </div>

      <section className="panel" style={{ borderRadius: 18, marginBottom: 24, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <strong style={{ fontSize: "1rem", color: "#0f172a" }}>Vendor Spend Distribution</strong>
            <span style={{ display: "block", fontSize: ".78rem", color: "#64748b" }}>Top spend categories monitored by Costivra</span>
          </div>
          <span className="mono" style={{ fontSize: ".8rem", color: "#3b82f6", fontWeight: 700 }}>$1.84M Monitored</span>
        </div>
        <div className="spend-bar-container">
          <div className="spend-bar-segment" style={{ width: "35%", background: "#3b82f6" }} />
          <div className="spend-bar-segment" style={{ width: "28%", background: "#10b981" }} />
          <div className="spend-bar-segment" style={{ width: "20%", background: "#f59e0b" }} />
          <div className="spend-bar-segment" style={{ width: "17%", background: "#64748b" }} />
        </div>
        <div className="spend-legend" style={{ marginTop: 14 }}>
          <div className="spend-legend-item"><span className="legend-dot" style={{ background: "#3b82f6" }} /> Food Service & Operations (35% • $644K)</div>
          <div className="spend-legend-item"><span className="legend-dot" style={{ background: "#10b981" }} /> Software & SaaS (28% • $515K)</div>
          <div className="spend-legend-item"><span className="legend-dot" style={{ background: "#f59e0b" }} /> Telecom & Internet (20% • $368K)</div>
          <div className="spend-legend-item"><span className="legend-dot" style={{ background: "#64748b" }} /> Commercial Energy (17% • $313K)</div>
        </div>
      </section>

      <section className="panel" style={{ borderRadius: 20 }}>
        <div className="panel-header" style={{ padding: "16px 20px" }}>
          <h2>Vendor Directory</h2>
          <span className="eyebrow">42 Vendors Tracked</span>
        </div>
        <SimpleTable headers={["Vendor", "Category", "Annual Spend", "% of Total", "Coverage"]} rows={vendors} />
      </section>
    </div>
  );
}

function Integrations() {
  const integrations = [[Mail, "Microsoft 365", "Bring approved bills and contracts into Costivra.", "Available soon"], [Mail, "Gmail", "Monitor selected vendor mailboxes with scoped access.", "Roadmap"], [Building2, "QuickBooks", "Connect bills and vendor records for reconciliation.", "Roadmap"], [CircleDollarSign, "Stripe", "Understand subscription and payment-fee expense.", "Roadmap"], [RadioTower, "UCEP adapter", "Optional, disclosed energy review handoff with explicit consent.", "Restricted"]] as const;
  return <div className="app-content"><AppPageHeader title="Integrations" description="Connect only the systems and records Costivra needs." /><div className="content-grid" style={{ background: "white", borderLeft: "1px solid var(--line)" }}>{integrations.map(([Icon, title, copy, status]) => <div className="content-block" key={title}><Icon aria-hidden="true" size={24} style={{ color: "var(--blue)" }} /><h2>{title}</h2><p>{copy}</p><span className={`status ${status === "Restricted" ? "medium" : "good"}`}>{status}</span></div>)}</div><section className="panel" style={{ marginTop: 18 }}><EmptyHint title="Every connection is scoped" copy="Costivra requests the least access needed, records sync activity, and never uses a connected source to expand agent permissions." /></section></div>;
}

function Reports() {
  const reports = [["Executive value report", "Spend, findings, actions, and verified value", "Updated today"], ["Contract renewal calendar", "30, 60, 90, and 180-day deadline view", "Updated today"], ["Vendor concentration report", "Annual spend and exposure by vendor", "Updated yesterday"], ["Data coverage report", "Missing documents, dates, and low-confidence fields", "Updated today"], ["Energy review package", "Evidence packet for the advisor you choose", "Consent required"]];
  return <div className="app-content"><AppPageHeader title="Reports" description="Decision-ready exports with evidence, methods, and limitations." actions={<button className="button button-primary" type="button"><Plus aria-hidden="true" size={16} /> New report</button>} /><section className="panel"><div className="panel-header"><h2>Available reports</h2><span className="eyebrow">Evidence included</span></div>{reports.map(([title, copy, status]) => <div key={title} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", alignItems: "center", gap: 20, borderBottom: "1px solid #e2e0da", padding: "20px" }}><div><strong>{title}</strong><div className="muted" style={{ marginTop: 5, fontSize: ".82rem" }}>{copy}</div></div><span className="muted mono" style={{ fontSize: ".72rem" }}>{status}</span><button className="button button-quiet" type="button"><Download aria-hidden="true" size={15} /> Export</button></div>)}</section></div>;
}

function Team() {
  const team = [["Alex Morgan", "Controller", "Account owner", "Active"], ["Jordan Singh", "Finance manager", "Approver", "Active"], ["Riley Park", "Operations director", "Approver", "Active"], ["Morgan Lee", "Regional manager", "Viewer", "Invited"]];
  return <div className="app-content"><AppPageHeader title="Team & approvals" description="Define who can see, decide, approve, and execute." actions={<button className="button button-primary" type="button"><UserPlus aria-hidden="true" size={16} /> Invite teammate</button>} /><div className="summary-grid"><Summary label="Team members" value="4" /><Summary label="Approvers" value="3" /><Summary label="Pending approvals" value="3" /><Summary label="Policy violations" value="0" verified /></div><div className="detail-layout"><section className="panel"><div className="panel-header"><h2>Members</h2><span className="eyebrow">Northstar Hospitality</span></div><SimpleTable headers={["Name", "Title", "Access", "Status"]} rows={team} /></section><section className="panel"><div className="panel-header"><h2>Default approval policy</h2><Settings2 aria-hidden="true" size={18} /></div><div className="panel-body"><Policy checked label="External emails always require approval" /><Policy checked label="Contract cancellation requires two approvers" /><Policy checked label="Vendor changes require controller approval" /><Policy checked label="Energy referrals require account-owner consent" /><Policy checked label="Payment details can never change automatically" /></div></section></div></div>;
}

function AskCostivra() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string; citation?: { doc: string; formula: string; value: string } }[]>([]);

  function submit() {
    if (!question.trim()) return;
    const userQ = question;
    setQuestion("");
    setMessages((items) => [
      ...items,
      { role: "user", text: userQ },
      {
        role: "assistant",
        text: `Based on extracted invoice line items and active contracts for Northstar Hospitality, here is the evidence breakdown for: "${userQ}".`,
        citation: {
          doc: "Verizon_May_2026.pdf (Page 3, Line 42)",
          formula: "Unapproved surcharge ($1,562.50 / mo) × 12 months",
          value: "$18,750 / yr Discrepancy",
        },
      },
    ]);
  }

  const suggestions = [
    "Which expenses increased more than 10%?",
    "Show contracts renewing this quarter",
    "Why was Verizon flagged?",
    "Summarize verified savings",
  ];

  return (
    <div className={`ask-page${messages.length ? " has-messages" : ""}`}>
      <header className="ask-page-header">
        <div>
          <strong>Ask Costivra</strong>
          <span>Northstar workspace</span>
        </div>
        <button className="ask-new-chat" type="button" onClick={() => { setMessages([]); setQuestion(""); }}>
          New chat
        </button>
      </header>

      <main className="ask-conversation" aria-live="polite">
        {messages.length === 0 ? (
          <div className="ask-welcome">
            <div className="ask-brand-mark"><CostivraMark size={34} /></div>
            <h1>What should we investigate?</h1>
            <p>Ask about recurring spend, contract terms, vendor activity, or the evidence behind a finding.</p>
          </div>
        ) : (
          <div className="ask-message-list">
            {messages.map((msg, i) => (
              <article key={`${msg.role}-${i}`} className={`ask-message ask-message-${msg.role}`}>
                <div className="ask-message-avatar">
                  {msg.role === "assistant" ? <CostivraMark size={24} /> : <span>AM</span>}
                </div>
                <div className="ask-message-content">
                  <strong>{msg.role === "user" ? "You" : "Costivra"}</strong>
                  <p>{msg.text}</p>
                  {msg.citation && (
                    <div className="ask-citation-card">
                      <div className="ask-citation-heading"><ShieldCheck aria-hidden="true" size={15} /><span>Evidence used</span></div>
                      <strong>{msg.citation.doc}</strong>
                      <span>{msg.citation.formula}</span>
                      <b>{msg.citation.value}</b>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <div className="ask-compose-area">
        {messages.length === 0 && (
          <div className="ask-suggestions" aria-label="Suggested questions">
            {suggestions.map((prompt) => (
              <button key={prompt} type="button" onClick={() => setQuestion(prompt)}>{prompt}</button>
            ))}
          </div>
        )}
        <div className="ask-composer">
          <button className="ask-attach" type="button" aria-label="Attach a document"><Paperclip aria-hidden="true" size={19} /></button>
          <textarea
            rows={1}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            aria-label="Ask Costivra"
            placeholder="Ask about your cost data"
          />
          <button className="ask-send" type="button" onClick={submit} disabled={!question.trim()} aria-label="Send question">
            <ArrowUp aria-hidden="true" size={18} />
          </button>
        </div>
        <p className="ask-disclaimer"><ShieldCheck aria-hidden="true" size={12} /> Answers cite extracted evidence. Structured cases remain the system of record.</p>
      </div>
    </div>
  );
}

function Settings() {
  return <div className="app-content"><AppPageHeader title="Settings" description="Organization, security, data, notification, and consent controls." actions={<button className="button button-primary" type="button"><Check aria-hidden="true" size={16} /> Save changes</button>} /><div className="detail-layout"><section className="panel"><div className="panel-header"><h2>Organization profile</h2></div><div className="panel-body"><div className="form-grid"><Field label="Organization name" value="Northstar Hospitality" /><Field label="Industry" value="Hotels & hospitality" /><Field label="Primary timezone" value="America/Chicago" /><Field label="Currency" value="USD" /><Field label="Primary contact" value="Alex Morgan" /><Field label="Review threshold" value="$10,000 annual value" /></div></div></section><section className="panel"><div className="panel-header"><h2>Security & data</h2><LockKeyhole aria-hidden="true" size={18} /></div><div className="panel-body"><Policy checked label="Require MFA for administrators" /><Policy checked label="Mask account identifiers" /><Policy checked label="Notify on external actions" /><Policy label="Allow anonymized cohort benchmarks" /><p className="muted" style={{ marginTop: 22, lineHeight: 1.6, fontSize: ".8rem" }}>Changing data-sharing preferences never overrides consent required for a referral or external action.</p></div></section></div></div>;
}

function ListPage({ title, description, action, summaries, headers, rows }: { title: string; description: string; action: string; summaries: string[][]; headers: string[]; rows: string[][] }) {
  return <div className="app-content"><AppPageHeader title={title} description={description} actions={<><label style={{ position: "relative" }}><Search aria-hidden="true" size={16} style={{ position: "absolute", top: 13, left: 13, color: "var(--muted)" }} /><input className="search-input" style={{ paddingLeft: 38 }} aria-label={`Search ${title.toLowerCase()}`} placeholder={`Search ${title.toLowerCase()}`} /></label><button className="button button-primary" type="button"><Plus aria-hidden="true" size={16} /> {action}</button></>} /><div className="summary-grid">{summaries.map(([label, value]) => <Summary key={label} label={label} value={value} />)}</div><section className="panel"><div className="panel-header"><h2>All {title.toLowerCase()}</h2><button className="button button-quiet" type="button">Filters <Settings2 aria-hidden="true" size={15} /></button></div><SimpleTable headers={headers} rows={rows} /></section></div>;
}

function SimpleTable({ headers, rows }: { headers: readonly string[]; rows: readonly (readonly string[])[] }) {
  return <div className="table-scroll"><table className="data-table"><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={`${row[0]}-${i}`}>{row.map((value, j) => <td key={`${value}-${j}`}>{j === 0 ? <span className="table-title">{value}</span> : value}</td>)}</tr>)}</tbody></table></div>;
}

function Summary({ label, value, verified = false }: { label: string; value: string; verified?: boolean }) { return <div className="summary-card"><span>{label}</span><strong style={verified ? { color: "var(--mint-dark)" } : undefined}>{value}</strong></div>; }
function Policy({ label, checked = false }: { label: string; checked?: boolean }) { return <div style={{ display: "flex", alignItems: "flex-start", gap: 10, borderBottom: "1px solid #e2e0da", padding: "13px 0", fontSize: ".84rem" }}>{checked ? <CheckCircle2 aria-hidden="true" size={17} style={{ color: "var(--mint-dark)", flex: "0 0 auto" }} /> : <Clock3 aria-hidden="true" size={17} style={{ color: "var(--muted)", flex: "0 0 auto" }} />}<span>{label}</span></div>; }
function Field({ label, value }: { label: string; value: string }) { return <div className="field"><label>{label}</label><input defaultValue={value} /></div>; }
function NotFound() { return <div className="app-content"><AppPageHeader title="Page not found" description="That Costivra workspace page does not exist." /><section className="panel"><EmptyHint title="Return to the Command Center" copy="Use the navigation to continue reviewing expenses, evidence, actions, and verified outcomes." /></section></div>; }
