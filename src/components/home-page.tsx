"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  FileCheck2,
  FileText,
  Gauge,
  LayoutDashboard,
  LockKeyhole,
  RadioTower,
  ScanSearch,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import { Faq } from "@/components/faq";
import { CostivraMark } from "@/components/brand";

const steps = [
  ["Connect", "Securely add bills, contracts, and vendor accounts."],
  ["Extract", "AI reads terms while preserving the original source."],
  ["Detect", "Rules find cost leaks, anomalies, and deadline risks."],
  ["Approve", "The right people authorize consequential actions."],
  ["Verify", "Future bills and credits prove the actual result."],
] as const;

const trust = [
  [LockKeyhole, "Tenant-isolated data", "Customer data is separated by design and protected at the database layer."],
  [FileText, "Private documents", "Files remain private and access uses short-lived, signed links."],
  [Users, "Approval controls", "Humans authorize consequential action before a change is made."],
  [ShieldCheck, "Complete audit history", "Every decision, correction, approval, and external effect is recorded."],
] as const;

export function HomePage() {
  return (
    <main className="paper-texture">
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <h1>Put every recurring business cost under intelligent control.</h1>
            <p>Connect bills, contracts, and vendor accounts. Costivra identifies margin leaks, renewal risks, and savings opportunities—then helps your team act with evidence and approval controls.</p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/scan">Run a free cost scan <ArrowRight aria-hidden="true" size={17} /></Link>
              <Link className="button button-secondary" href="#how-it-works">See how it works</Link>
            </div>
          </div>
          <OpportunityPreview />
        </div>
      </section>

      <section className="workflow" id="how-it-works">
        <div className="container">
          <h2 className="section-heading" style={{ maxWidth: "none", fontSize: "clamp(2.2rem, 3vw, 2.8rem)" }}>From document to verified value.</h2>
          <div className="steps">
            {steps.map(([title, copy], index) => (
              <div className="step" key={title}>
                <span className="step-number">{index + 1}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </div>
            ))}
          </div>
          <div className="doctrine-line">AI interprets. Code calculates. Policies control. Humans authorize. Evidence proves.</div>
        </div>
      </section>

      <section className="evidence-section">
        <div className="container evidence-layout">
          <div>
            <h2 className="section-heading" style={{ fontSize: "clamp(2.6rem, 4.2vw, 4.5rem)" }}>See the leak.<br />See the evidence.<br />Decide what happens next.</h2>
            <div className="category-list">
              <Link className="category-row active" href="/solutions/software"><span><FileCheck2 aria-hidden="true" size={19} style={{ marginRight: 12, verticalAlign: "middle" }} />Software subscriptions</span><ArrowRight aria-hidden="true" size={18} /></Link>
              <Link className="category-row" href="/solutions/telecom"><span><RadioTower aria-hidden="true" size={19} style={{ marginRight: 12, verticalAlign: "middle" }} />Telecom & internet</span><ArrowRight aria-hidden="true" size={18} /></Link>
              <Link className="category-row" href="/solutions/energy"><span><Zap aria-hidden="true" size={19} style={{ marginRight: 12, verticalAlign: "middle" }} />Commercial energy review</span><ArrowRight aria-hidden="true" size={18} /></Link>
            </div>
          </div>
          <EvidenceViewer />
        </div>
      </section>

      <section className="doctrine">
        <div className="container doctrine-layout">
          <h2>Built for consequential decisions.</h2>
          <div>
            <div className="doctrine-words"><span>AI interprets.</span><span>Code calculates.</span><span>Policies control.</span><span>Humans authorize.</span><span>Evidence proves.</span></div>
            <div className="trust-grid">
              {trust.map(([Icon, title, copy]) => (
                <div className="trust-item" key={title}>
                  <Icon aria-hidden="true" size={22} />
                  <strong>{title}</strong>
                  <p>{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="pricing">
        <div className="container">
          <h2 className="section-heading">Start with three bills.</h2>
          <p className="section-lede">A focused first scan, then continuous monitoring when you are ready.</p>
          <div className="pricing-layout">
            <div className="pricing-intro">
              <strong>Simple plans.<br />Clear value.</strong>
              <p className="muted">Pilot pricing shown for product evaluation.</p>
            </div>
            <Plan name="Starter" price="$149" copy="One business, up to three active expense accounts, document monitoring, and renewal reminders." />
            <Plan name="Growth" price="$599" copy="Multiple locations, approvals, team access, advanced reports, and weekly monitoring." />
            <Plan name="Enterprise" price="Let's talk" copy="SSO, custom policies, integrations, retention controls, and dedicated support." />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 28 }}><Link className="button button-primary" href="/scan">Run a free cost scan <ArrowRight aria-hidden="true" size={17} /></Link></div>
        </div>
      </section>

      <section className="faq">
        <div className="container faq-layout">
          <div><h2 className="section-heading" style={{ fontSize: "2.8rem" }}>Questions,<br />answered plainly.</h2></div>
          <Faq />
        </div>
      </section>
    </main>
  );
}

function OpportunityPreview() {
  return (
    <div className="product-frame" aria-label="Costivra opportunity preview">
      <div className="preview-shell">
        <div className="preview-sidebar" aria-hidden="true"><span className="mini-mark"><CostivraMark size={20} /></span><LayoutDashboard size={17} /><FileText size={17} /><Gauge size={17} /><ShieldCheck size={17} /></div>
        <div className="preview-main">
          <div className="frame-top">
            <div className="frame-org">Northstar Hospitality</div>
            <span className="eyebrow">Top opportunity</span>
          </div>
          <div className="frame-body">
            <div className="opportunity-preview">
              <div className="opportunity-head">
                <span className="icon-well"><RadioTower aria-hidden="true" size={23} /></span>
                <div><h3>Telecom bill increase</h3><span className="muted">Rate increase detected on primary business internet service.</span></div>
              </div>
              <div className="fact-grid">
                <div className="fact"><span>Estimated annual value</span><strong className="value">$12,480</strong></div>
                <div className="fact"><span>Confidence</span><strong>92%</strong></div>
                <div className="fact"><span>Renewal date</span><strong>59 days</strong></div>
                <div className="fact"><span>Evidence</span><strong>7 refs</strong></div>
              </div>
            </div>
            <div className="evidence-preview">
              <span className="eyebrow">Source document</span>
              <div className="document-sheet">
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".7rem" }}><strong>Business internet</strong><span>Page 3</span></div>
                <div className="doc-line short" /><div className="doc-line" /><div className="doc-line blue" /><div className="doc-line" />
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--ink)", paddingTop: 10, marginTop: 22, fontSize: ".72rem" }}><span>Total</span><strong>$1,510.00</strong></div>
              </div>
              <button className="button button-quiet" type="button" style={{ width: "100%", marginTop: 14 }}>View source <ScanSearch aria-hidden="true" size={16} /></button>
            </div>
          </div>
          <div className="approval-bar"><div><strong>Requires approval</strong><div className="muted" style={{ fontSize: ".78rem", marginTop: 4 }}>2 of 2 approvers pending</div></div><Link className="button button-primary" href="/app/opportunities">Review opportunity</Link></div>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";

function EvidenceViewer() {
  const [category, setCategory] = useState<"software" | "telecom" | "energy">("software");

  const categoryData = {
    software: {
      vendor: "Acme Software LLC",
      docName: "Acme_Pro_Invoice.pdf",
      rows: [
        { item: "Acme Pro — Annual subscription", amount: "$12,000.00", highlight: true },
        { item: "User add-on pack (25 seats)", amount: "$2,500.00", highlight: false },
        { item: "Professional services", amount: "$2,500.00", highlight: false },
      ],
      total: "$17,000.00",
      facts: [
        ["Invoice number", "INV-81235", "99%"],
        ["Invoice date", "Apr 15, 2026", "98%"],
        ["Vendor", "Acme Software LLC", "100%"],
        ["Unused Licenses", "14 seats", "88%"],
        ["Total due", "$17,000.00", "99%"],
      ],
    },
    telecom: {
      vendor: "Verizon Business",
      docName: "Verizon_Bill_May.pdf",
      rows: [
        { item: "DIA 100Mbps Dedicated Line", amount: "$2,100.00", highlight: false },
        { item: "Surchg-Access-Tier4 (Unbundled)", amount: "$1,562.50", highlight: true },
        { item: "Regulatory Recovery Fee", amount: "$340.00", highlight: false },
      ],
      total: "$4,002.50",
      facts: [
        ["Account number", "VZN-99201", "100%"],
        ["Billing period", "May 2026", "99%"],
        ["Unapproved Surcharge", "$1,562.50 / mo", "92%"],
        ["Annual Leakage", "$18,750.00", "92%"],
        ["Total due", "$4,002.50", "99%"],
      ],
    },
    energy: {
      vendor: "Direct Energy Commercial",
      docName: "DirectEnergy_Meters.pdf",
      rows: [
        { item: "Meter #48291 Energy Charge (kwh)", amount: "$4,210.00", highlight: false },
        { item: "Meter #48291 Peak Surcharge (1.48)", amount: "$2,674.10", highlight: true },
        { item: "State Utility Tax", amount: "$380.00", highlight: false },
      ],
      total: "$7,264.10",
      facts: [
        ["Meter ID", "#48291 (Commercial)", "100%"],
        ["Billed Peak Factor", "1.48 (Cap 1.20)", "94%"],
        ["Est. Rate Discrepancy", "$9,680.00 / yr", "68%"],
        ["Total due", "$7,264.10", "98%"],
      ],
    },
  };

  const current = categoryData[category];

  return (
    <div className="evidence-viewer">
      <div className="viewer-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>EVIDENCE VIEWER · EXTRACTION V3</span>
        <div style={{ display: "flex", gap: 6 }}>
          {(["software", "telecom", "energy"] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              style={{
                background: category === cat ? "var(--mint)" : "transparent",
                color: category === cat ? "var(--ink)" : "#95a1b5",
                border: "1px solid #2c374b",
                borderRadius: 4,
                padding: "2px 8px",
                fontSize: ".68rem",
                fontWeight: 700,
                textTransform: "capitalize",
                cursor: "pointer",
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
      <div className="viewer-content">
        <div className="invoice">
          <div className="invoice-top">
            <div>
              <h4>{current.vendor}</h4>
              <small className="muted">{current.docName}</small>
            </div>
            <strong>Source Bill</strong>
          </div>
          <div className="invoice-table">
            {current.rows.map((row) => (
              <div className={`invoice-row ${row.highlight ? "highlight" : ""}`} key={row.item}>
                <span>{row.item}</span>
                <strong>{row.amount}</strong>
              </div>
            ))}
            <div className="invoice-row">
              <strong>Total due (USD)</strong>
              <strong style={{ color: "var(--blue)" }}>{current.total}</strong>
            </div>
          </div>
          <div style={{ marginTop: 40, color: "var(--muted)", fontSize: ".72rem" }}>
            Source: page 1 of 1 · coordinates & digital digest preserved
          </div>
        </div>
        <div className="facts">
          <div className="eyebrow">Extracted facts</div>
          {current.facts.map(([label, value, confidence]) => (
            <div className="extracted-row" key={label}>
              <span>
                {label}
                <br />
                <strong className="mono">{value}</strong>
              </span>
              <span className="confidence">{confidence}</span>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 18, color: "var(--mint-dark)", fontWeight: 700, fontSize: ".78rem" }}>
            <Check aria-hidden="true" size={16} /> Arithmetic reconciles with contract rules
          </div>
        </div>
      </div>
    </div>
  );
}

function Plan({ name, price, copy }: { name: string; price: string; copy: string }) {
  return <div className="plan"><span className="plan-name">{name}</span><div className="price">{price}{price.startsWith("$") ? <small style={{ fontSize: ".85rem", fontWeight: 400 }}> / month</small> : null}</div><p>{copy}</p></div>;
}
