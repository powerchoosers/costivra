"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowRight,
  Building2,
  Check,
  CircleAlert,
  ClipboardList,
  FileCheck2,
  FileLock2,
  FileText,
  LockKeyhole,
  RadioTower,
  ShieldCheck,
  Upload,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import { Faq } from "@/components/faq";
import { PublicProofSection } from "@/components/public-proof-section";

const steps = [
  { title: "Choose current bills", copy: "Start with the software, internet, or energy documents you want reviewed.", artifact: "Selected documents", icon: FileCheck2 },
  { title: "Review what changed", copy: "See possible price increases, duplicate charges, unused services, or renewal deadlines with the source attached.", artifact: "Source linked · review needed", icon: FileText },
  { title: "Decide the next step", copy: "Your team can save, investigate, assign, or approve a bounded action. Later evidence determines what is verified.", artifact: "Your approval required", icon: UserCheck },
] as const;

const heroReviewExample = {
  previousMonthlyCents: 131000,
  currentMonthlyCents: 151000,
} as const;

const heroReviewMonthlyChangeCents = heroReviewExample.currentMonthlyCents - heroReviewExample.previousMonthlyCents;
const heroReviewAnnualImpactCents = heroReviewMonthlyChangeCents * 12;
const formatHeroReviewCurrency = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);

const trust = [
  [FileLock2, "Private documents", "Files remain private and use controlled access."],
  [Building2, "Tenant-isolated records", "Customer records are separated by organization boundaries and database policies."],
  [UserCheck, "Human approval", "Consequential outside actions require the configured approval."],
  [FileCheck2, "Source-linked findings", "Material claims remain connected to evidence and calculation details."],
  [ClipboardList, "Audit history", "Decisions, corrections, approvals, and outside effects are recorded."],
  [Upload, "No broad inbox access required", "Begin with selected uploads and controlled forwarding."],
] as const;

type EvidenceCategory = "software" | "telecom" | "energy";
type EvidenceFact = readonly [label: string, value: string, confidence: string];
type EvidenceRow = { item: string; amount: string; highlight?: boolean };
type EvidenceData = {
  label: string;
  solutionHref: string;
  vendor: string;
  docName: string;
  relevantTerm: string;
  issue: string;
  calculation: string;
  potentialValue: string;
  confidence: string;
  reconciliation: string;
  rows: readonly EvidenceRow[];
  total: string;
  facts: readonly EvidenceFact[];
};

const evidenceCategories: Array<{ id: EvidenceCategory; label: string; solutionHref: string; icon: typeof FileCheck2 }> = [
  { id: "software", label: "Software subscriptions", solutionHref: "/solutions/software", icon: FileCheck2 },
  { id: "telecom", label: "Telecom and internet", solutionHref: "/solutions/telecom", icon: RadioTower },
  { id: "energy", label: "Commercial energy review", solutionHref: "/solutions/energy", icon: Zap },
];

const evidenceData: Record<EvidenceCategory, EvidenceData> = {
  software: {
    label: "Software subscriptions",
    solutionHref: "/solutions/software",
    vendor: "Acme Software LLC",
    docName: "Acme_Pro_Invoice.pdf",
    relevantTerm: "Annual subscription · 14 unused seats",
    issue: "Unused licenses detected",
    calculation: "14 seats × $180 / month = $2,520 potential annual value",
    potentialValue: "$2,520 / year",
    confidence: "88%",
    reconciliation: "Invoice total reconciles; unused-license count needs review.",
    rows: [
      { item: "Acme Pro — Annual subscription", amount: "$12,000.00", highlight: true },
      { item: "User add-on pack (25 seats)", amount: "$2,500.00" },
      { item: "Professional services", amount: "$2,500.00" },
    ],
    total: "$17,000.00",
    facts: [
      ["Invoice number", "INV-81235", "99%"],
      ["Invoice date", "Apr 15, 2026", "98%"],
      ["Vendor", "Acme Software LLC", "100%"],
      ["Unused licenses", "14 seats", "88%"],
      ["Total due", "$17,000.00", "99%"],
    ],
  },
  telecom: {
    label: "Telecom and internet",
    solutionHref: "/solutions/telecom",
    vendor: "Verizon Business",
    docName: "Verizon_Bill_May.pdf",
    relevantTerm: "Surchg-Access-Tier4 · unbundled charge",
    issue: "Unapproved surcharge detected",
    calculation: "$1,562.50 monthly charge × 12 months = $18,750 potential annual value",
    potentialValue: "$18,750 / year",
    confidence: "92%",
    reconciliation: "Bill arithmetic reconciles; contract treatment needs review.",
    rows: [
      { item: "DIA 100Mbps Dedicated Line", amount: "$2,100.00" },
      { item: "Surchg-Access-Tier4 (Unbundled)", amount: "$1,562.50", highlight: true },
      { item: "Regulatory Recovery Fee", amount: "$340.00" },
    ],
    total: "$4,002.50",
    facts: [
      ["Account number", "VZN-99201", "100%"],
      ["Billing period", "May 2026", "99%"],
      ["Unapproved surcharge", "$1,562.50 / mo", "92%"],
      ["Annual potential", "$18,750.00", "92%"],
      ["Total due", "$4,002.50", "99%"],
    ],
  },
  energy: {
    label: "Commercial energy review",
    solutionHref: "/solutions/energy",
    vendor: "Direct Energy Commercial",
    docName: "DirectEnergy_Meters.pdf",
    relevantTerm: "Peak surcharge · billed factor 1.48",
    issue: "Peak factor exceeds the stated cap",
    calculation: "0.28 factor variance × usage basis = $9,680 potential annual value",
    potentialValue: "$9,680 / year",
    confidence: "68%",
    reconciliation: "Invoice arithmetic reconciles; rate basis requires professional review.",
    rows: [
      { item: "Meter #48291 Energy Charge (kWh)", amount: "$4,210.00" },
      { item: "Meter #48291 Peak Surcharge (1.48)", amount: "$2,674.10", highlight: true },
      { item: "State Utility Tax", amount: "$380.00" },
    ],
    total: "$7,264.10",
    facts: [
      ["Meter ID", "#48291 (Commercial)", "100%"],
      ["Billed peak factor", "1.48 (cap 1.20)", "94%"],
      ["Potential variance", "$9,680.00 / yr", "68%"],
      ["Total due", "$7,264.10", "98%"],
    ],
  },
};

export function HomePage() {
  return (
    <main className="paper-texture">
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <span className="hero-eyebrow">Recurring bill review for growing businesses</span>
            <h1>Find hidden waste in your business bills.</h1>
            <p>Upload up to three software, internet, or energy bills. Costivra flags price increases, duplicate charges, unused services, and renewal risks, then links every finding to the exact source.</p>
            <p className="hero-fit">Built for owners, finance teams, and operators managing recurring costs across locations, services, and contracts.</p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/scan">Review 3 bills free <ArrowRight aria-hidden="true" size={17} /></Link>
              <Link className="button button-secondary" href="#evidence">See a sample review</Link>
            </div>
            <div className="hero-assurance" aria-label="Costivra product assurances">
              <span><LockKeyhole aria-hidden="true" size={15} /> Only the documents you choose</span>
              <span><ShieldCheck aria-hidden="true" size={15} /> No broad inbox access</span>
              <span><Users aria-hidden="true" size={15} /> Human approval before outside action</span>
            </div>
          </div>
          <HeroReviewPreview />
        </div>
      </section>

      <EvidenceSection />

      <section className="workflow" id="how-it-works">
        <div className="container">
          <ScrollReveal className="workflow-reveal">
            <h2 className="section-heading" style={{ maxWidth: "none", fontSize: "clamp(2.2rem, 3vw, 2.8rem)" }}>Your first review in three clear steps.</h2>
            <p className="section-lede">Start with a few documents. Costivra keeps the source, shows the question, and leaves the decision with your team.</p>
            <WorkflowSteps />
          </ScrollReveal>
        </div>
      </section>

      <PublicProofSection />

      <section className="doctrine">
        <div className="container doctrine-layout">
          <div className="doctrine-intro">
            <h2>Built for decisions that affect real money.</h2>
            <p>AI can read and explain the documents. Deterministic code calculates the amounts. Policies define what is allowed. Your team approves consequential actions. The source and audit history remain attached.</p>
          </div>
          <div className="doctrine-detail">
            <div className="trust-list" aria-label="Costivra trust controls">
              {trust.map(([Icon, title, copy]) => (
                <div className="trust-item" key={title}>
                  <Icon aria-hidden="true" size={18} />
                  <div><strong>{title}</strong><p>{copy}</p></div>
                </div>
              ))}
            </div>
            <div className="doctrine-actions">
              <p>Costivra does not automatically cancel services, sign contracts, change payment instructions, or send customer records to an outside advisor.</p>
              <Link className="button button-secondary" href="/security">Review Costivra security <ArrowRight aria-hidden="true" size={16} /></Link>
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
              <p className="muted">Plans shown for the current Costivra offering. See pricing for details.</p>
            </div>
            <Plan name="Starter" price="$149" copy="One business, up to three active expense accounts, document monitoring, and renewal reminders." />
            <Plan name="Growth" price="$599" copy="Multiple locations, approvals, team access, advanced reports, and weekly monitoring." />
            <Plan name="Enterprise" price="Let's talk" copy="SSO, custom policies, integrations, retention controls, and dedicated support." />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 28 }}><Link className="button button-primary" href="/scan">Start with 3 bills <ArrowRight aria-hidden="true" size={17} /></Link></div>
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

function HeroReviewPreview() {
  return (
    <aside className="hero-review-preview" aria-label="Illustrative bill review example">
      <div className="hero-review-topline">
        <span>Bill review</span>
        <span>Illustrative example</span>
      </div>
      <div className="hero-review-document">
        <div className="hero-review-document-heading">
          <span className="hero-review-document-icon"><Image src="https://img.logo.dev/business.att.com?size=128&format=png&fallback=404" alt="AT&amp;T Business" width={24} height={24} /></span>
          <div>
            <span>AT&amp;T Business</span>
            <strong>May internet bill</strong>
          </div>
          <small>Page 2</small>
        </div>
        <div className="hero-review-question">
          <CircleAlert aria-hidden="true" size={19} />
          <div>
            <span>Needs your review</span>
            <strong>Monthly circuit charge increased</strong>
          </div>
        </div>
        <div className="hero-review-comparison" aria-label="Illustrative monthly bill comparison">
          <div><span>Previous bill</span><strong>{formatHeroReviewCurrency(heroReviewExample.previousMonthlyCents)} <small>/ month</small></strong></div>
          <div><span>Current bill</span><strong>{formatHeroReviewCurrency(heroReviewExample.currentMonthlyCents)} <small>/ month</small></strong></div>
        </div>
        <div className="hero-review-change">
          <span>Change from prior bill</span>
          <strong>+{formatHeroReviewCurrency(heroReviewMonthlyChangeCents)} <small>/ month</small></strong>
          <em>{formatHeroReviewCurrency(heroReviewExample.currentMonthlyCents)} − {formatHeroReviewCurrency(heroReviewExample.previousMonthlyCents)} = {formatHeroReviewCurrency(heroReviewMonthlyChangeCents)}</em>
        </div>
        <div className="hero-review-impact">
          <span>Potential annual impact</span>
          <strong>+{formatHeroReviewCurrency(heroReviewAnnualImpactCents)}</strong>
          <small>If the new charge continues for 12 months.</small>
        </div>
        <div className="hero-review-evidence">
          <span>Source evidence</span>
          <strong>May internet bill · Page 2</strong>
          <q>Monthly circuit charge: $1,510.00</q>
        </div>
      </div>
      <div className="hero-review-footer">
        <Link href="#evidence">Review the source <ArrowRight aria-hidden="true" size={15} /></Link>
        <strong>Potential impact · not verified</strong>
      </div>
    </aside>
  );
}

function EvidenceSection() {
  const [category, setCategory] = useState<EvidenceCategory>("software");
  const current = evidenceData[category];

  const selectCategory = (nextCategory: EvidenceCategory) => setCategory(nextCategory);

  return (
    <section className="evidence-section" id="evidence" aria-labelledby="evidence-title">
      <div className="container evidence-layout">
        <div className="evidence-navigation">
          <h2 id="evidence-title" className="section-heading" style={{ fontSize: "clamp(2.6rem, 4.2vw, 4.5rem)" }}>See the leak.<br />See the evidence.<br />Decide what happens next.</h2>
          <div className="category-list" role="group" aria-label="Evidence categories">
            {evidenceCategories.map(({ id, label, solutionHref, icon: Icon }) => (
              <div className={`category-row${category === id ? " active" : ""}`} key={id}>
                <button type="button" aria-pressed={category === id} onClick={() => selectCategory(id)}>
                  <span className="category-row-label"><Icon aria-hidden="true" size={19} />{label}</span>
                  <ArrowRight aria-hidden="true" size={18} />
                </button>
                <Link className="category-row-link" href={solutionHref}>Explore</Link>
              </div>
            ))}
          </div>
          <p className="evidence-navigation-note">Choose a category to keep the source bill, extracted facts, issue, and calculation together.</p>
        </div>
        <EvidenceViewer category={category} current={current} />
      </div>
    </section>
  );
}

function EvidenceViewer({ category, current }: { category: EvidenceCategory; current: EvidenceData }) {
  return (
    <div className="evidence-viewer" data-evidence-category={category}>
      <div className="viewer-label">
        <span>Source-linked finding</span>
        <span className="viewer-label-note">Bill and extracted facts · Illustrative example</span>
      </div>
      <div className="viewer-content" key={category} aria-live="polite">
        <div className="invoice">
          <div className="invoice-top">
            <div>
              <h4>{current.vendor}</h4>
              <small className="muted">{current.docName}</small>
            </div>
            <strong>Source bill</strong>
          </div>
          <div className="evidence-finding-summary">
            <div><span>Relevant charge or term</span><strong>{current.relevantTerm}</strong></div>
            <div><span>Issue detected</span><strong>{current.issue}</strong></div>
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
          <div className="evidence-source-note">Source: page 1 of 1 · illustrative document excerpt</div>
        </div>
        <div className="facts">
          <div className="eyebrow">Bill and extracted facts</div>
          {current.facts.map(([label, value, confidence]) => (
            <div className="extracted-row" key={label}>
              <span>{label}<br /><strong className="mono">{value}</strong></span>
              <span className="confidence">{confidence}</span>
            </div>
          ))}
          <div className="evidence-calculation"><span>Calculation</span><strong>{current.calculation}</strong></div>
          <div className="evidence-potential"><span>Potential value</span><strong>{current.potentialValue}</strong><small>Illustrative only · not verified</small></div>
          <div className="evidence-status"><Check aria-hidden="true" size={16} /><span><strong>{current.reconciliation}</strong><small>Reconciliation and rule status</small></span></div>
        </div>
      </div>
    </div>
  );
}

function WorkflowSteps() {
  const [progress, setProgress] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let frame = 0;
    const updateProgress = () => {
      frame = 0;
      const rect = node.getBoundingClientRect();
      const start = window.innerHeight * 0.72;
      const end = window.innerHeight * 0.32;
      const travel = Math.max(rect.height + start - end, 1);
      const nextProgress = Math.min(1, Math.max(0, (start - rect.top) / travel));
      setProgress((current) => Math.abs(current - nextProgress) < 0.002 ? current : nextProgress);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const stepsStyle = {
    "--steps-progress": `${Math.round(progress * 1000) / 10}%`,
    "--steps-progress-scale": `${progress}`,
  } as CSSProperties;
  return (
    <div ref={ref} className="steps" aria-label="Workflow stages" style={stepsStyle}>
      <span className="steps-progress" aria-hidden="true"><span className="steps-progress-fill" /></span>
      {steps.map(({ title, copy, artifact, icon: ArtifactIcon }, index) => (
        <article className="step" key={title}>
          <span className="step-number">{index + 1}</span>
          <h3>{title}</h3>
          <p>{copy}</p>
          <span className="workflow-artifact"><ArtifactIcon aria-hidden="true" size={14} />{artifact}</span>
        </article>
      ))}
    </div>
  );
}

function ScrollReveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.14 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref} className={`scroll-reveal ${visible ? "is-visible" : ""} ${className}`}>{children}</div>;
}

function Plan({ name, price, copy }: { name: string; price: string; copy: string }) {
  return <div className="plan"><span className="plan-name">{name}</span><div className="price">{price}{price.startsWith("$") ? <small style={{ fontSize: ".85rem", fontWeight: 400 }}> / month</small> : null}</div><p>{copy}</p></div>;
}
