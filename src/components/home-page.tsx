"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ArrowRight,
  Building2,
  Check,
  CircleAlert,
  ClipboardList,
  FileCheck2,
  FileLock2,
  FileText,
  Pause,
  Play,
  RadioTower,
  ShieldCheck,
  Upload,
  UserCheck,
  Users,
  Zap,
} from "@/lib/icons";
import { Faq } from "@/components/faq";
import { PublicProofSection } from "@/components/public-proof-section";
import { CostivraMark } from "@/components/brand";

const steps = [
  { title: "Choose current bills", copy: "Start with the software, internet, or energy documents you want reviewed.", artifact: "Selected documents", icon: FileCheck2 },
  { title: "Review what changed", copy: "See possible price increases, duplicate charges, unused services, or renewal deadlines with the source attached.", artifact: "Source linked · review needed", icon: FileText },
  { title: "Decide the next step", copy: "Your team can save, investigate, assign, or approve a bounded action. Later evidence determines what is verified.", artifact: "Your approval required", icon: UserCheck },
] as const;

export type PublicBillingPlan = {
  key: "starter" | "growth" | "enterprise";
  name: string;
  description: string;
  amountCents: number | null;
  annualAmountCents: number | null;
  currency: string;
  interval: "month" | "year" | "custom";
  features: string[];
  active: boolean;
  annualAvailable: boolean;
};

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

export function HomePage({ plans }: { plans: PublicBillingPlan[] }) {
  return (
    <main className="paper-texture">
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <span className="hero-eyebrow">Recurring bill review for growing businesses</span>
            <h1>Find hidden waste in your business bills.</h1>
            <p>Upload software, internet, or energy bills. Costivra finds price increases, duplicate charges, unused services, and renewal risks—with the exact source attached.</p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/scan">Review 3 bills free <ArrowRight aria-hidden="true" size={17} /></Link>
              <Link className="button button-secondary" href="#evidence">See a sample review</Link>
            </div>
            <div className="hero-assurance" aria-label="Costivra product assurances">
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
          <div className="workflow-intro">
            <span className="eyebrow">From bill to decision</span>
            <h2 className="section-heading">Your first review in three clear steps.</h2>
            <p className="section-lede">Start with a few documents. Costivra keeps the source, shows the question, and leaves the decision with your team.</p>
          </div>
          <WorkflowSteps />
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
            {plans.filter((plan) => plan.active).map((plan) => <Plan key={plan.key} planKey={plan.key} name={plan.name} interval={plan.interval} price={plan.amountCents == null ? "Let's talk" : new Intl.NumberFormat("en-US", { style: "currency", currency: plan.currency, maximumFractionDigits: 0 }).format(plan.amountCents / 100)} copy={plan.description} />)}
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

const heroTourTiming = {
  moveDelayMs: 420,
  cursorTravelMs: 780,
  targetDwellMs: 2200,
  clickDurationMs: 440,
} as const;

type HeroTourCursorPosition = {
  left: number;
  top: number;
};

function HeroTourCursor({ isClicking, position }: { isClicking: boolean; position: HeroTourCursorPosition }) {
  return (
    <span className={`hero-tour-cursor${isClicking ? " is-clicking" : ""}`} aria-hidden="true" style={{ transform: `translate3d(${position.left}px, ${position.top}px, 0)` }}>
      <span className="hero-tour-cursor-motion">
        <svg viewBox="0 0 30 40" role="presentation" focusable="false">
          <path d="M3.5 2.5 4.9 32.1c.1 2 2.6 2.8 3.8 1.3l6.1-7.3 5.9 10.8c.7 1.3 2.4 1.8 3.7 1.1l2.4-1.3c1.3-.7 1.8-2.3 1.1-3.6l-5.9-10.8 9.1-1.2c1.9-.3 2.6-2.7 1.1-3.9L6.9 1.1C5.5.2 3.4.9 3.5 2.5Z" />
        </svg>
      </span>
      {isClicking ? <span className="hero-tour-click" /> : null}
    </span>
  );
}

function HeroReviewPreview() {
  const [activeStage, setActiveStage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isClicking, setIsClicking] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<HeroTourCursorPosition>({ left: 30, top: 272 });
  const screenRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLSpanElement>(null);
  const tourLocation = [
    "app.costivra.ai / bills",
    "app.costivra.ai / findings / AT&T Business",
    "app.costivra.ai / actions / review plan",
  ][activeStage] ?? "app.costivra.ai";
  const targetClassName = `hero-tour-demo-target${isClicking ? " hero-tour-demo-target--clicking" : ""}`;

  const moveCursorToTarget = useCallback(() => {
    const screen = screenRef.current;
    const target = targetRef.current;

    if (!screen || !target) return;

    const screenRect = screen.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    setCursorPosition({
      left: Math.round(targetRect.left - screenRect.left + targetRect.width / 2 - 2),
      top: Math.round(targetRect.top - screenRect.top + targetRect.height / 2 - 2),
    });
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      moveCursorToTarget();
      return;
    }

    const moveTimer = window.setTimeout(moveCursorToTarget, heroTourTiming.moveDelayMs);

    if (!isPlaying) return () => window.clearTimeout(moveTimer);

    const clickDelay = heroTourTiming.moveDelayMs + heroTourTiming.cursorTravelMs + heroTourTiming.targetDwellMs;
    const clickTimer = window.setTimeout(() => setIsClicking(true), clickDelay);
    const advanceTimer = window.setTimeout(() => {
      setIsClicking(false);
      setActiveStage((current) => (current + 1) % 3);
    }, clickDelay + heroTourTiming.clickDurationMs);

    return () => {
      window.clearTimeout(moveTimer);
      window.clearTimeout(clickTimer);
      window.clearTimeout(advanceTimer);
    };
  }, [activeStage, isPlaying, moveCursorToTarget]);

  useEffect(() => {
    window.addEventListener("resize", moveCursorToTarget);

    return () => window.removeEventListener("resize", moveCursorToTarget);
  }, [moveCursorToTarget]);

  const selectStage = (stage: number) => {
    setIsClicking(false);
    setIsPlaying(false);
    setActiveStage(stage);
  };

  const togglePlayback = () => {
    setIsClicking(false);
    setIsPlaying((current) => !current);
  };

  return (
    <aside className="hero-review-preview hero-product-preview" aria-label="Illustrative bill review example">
      <div className="hero-review-topline">
        <span>Product walkthrough</span>
        <span><span className="hero-tour-live-dot" /> Guided demo</span>
      </div>
      <div className="hero-tour-viewport">
        <div className="hero-tour-browser-bar"><span className="hero-tour-browser-dot red" /><span className="hero-tour-browser-dot yellow" /><span className="hero-tour-browser-dot green" /><span className="hero-tour-address">{tourLocation}</span></div>
        <div ref={screenRef} className={`hero-tour-screen hero-tour-screen-${activeStage}`}>
          <div className="hero-tour-sidebar">
            <div className="hero-tour-wordmark"><CostivraMark size={16} /> <span>Costivra</span></div>
            <span className="hero-tour-workspace-label">Workspace</span>
            <div className={`hero-tour-nav-item${activeStage === 0 ? " active" : ""}`}><FileText aria-hidden="true" size={12} /> Bills <small>12</small></div>
            <div className={`hero-tour-nav-item${activeStage === 1 ? " active" : ""}`}><CircleAlert aria-hidden="true" size={12} /> Findings <small>{activeStage > 0 ? "1" : "—"}</small></div>
            <div className={`hero-tour-nav-item${activeStage === 2 ? " active" : ""}`}><UserCheck aria-hidden="true" size={12} /> Actions</div>
            <div className="hero-tour-sidebar-bottom"><ShieldCheck aria-hidden="true" size={12} /> Private workspace</div>
          </div>
          <div className="hero-tour-content">
            <div className="hero-tour-content-top"><div><span className="hero-tour-kicker">{activeStage === 0 ? "Bills" : activeStage === 1 ? "Finding detail" : "Action review"}</span><strong>{activeStage === 0 ? "Your uploaded bills" : activeStage === 1 ? "Monthly circuit charge increased" : "Choose what happens next"}</strong></div><span className="hero-tour-avatar">LP</span></div>
            {activeStage === 0 ? (
              <div className="hero-tour-bills-view"><div className="hero-tour-page-intro"><div><h3>Recent bills</h3><p>Selected source files stay linked to their findings.</p></div><span ref={targetRef} className={`hero-tour-primary ${targetClassName}`} aria-hidden="true"><Upload size={12} /> Upload bill</span></div><div className="hero-tour-table"><div className="hero-tour-table-head"><span>Document</span><span>Vendor</span><span>Status</span><span /></div><div className="hero-tour-table-row"><FileText aria-hidden="true" size={13} /><span>May internet bill.pdf</span><span>AT&amp;T Business</span><em>Ready</em><ArrowRight aria-hidden="true" size={12} /></div><div className="hero-tour-table-row muted"><FileText aria-hidden="true" size={13} /><span>Acme software invoice.pdf</span><span>Acme Software</span><em>Reviewed</em><ArrowRight aria-hidden="true" size={12} /></div></div><div className="hero-tour-callout"><ShieldCheck aria-hidden="true" size={13} /><span>Upload selected documents. Costivra keeps the source and evidence together.</span></div></div>
            ) : activeStage === 1 ? (
              <div className="hero-tour-finding-view"><div className="hero-tour-breadcrumb">Bills <ArrowRight aria-hidden="true" size={10} /> May internet bill <ArrowRight aria-hidden="true" size={10} /> Finding</div><div className="hero-tour-finding-grid"><div className="hero-tour-paper"><div className="hero-tour-paper-heading"><FileText aria-hidden="true" size={13} /><span>AT&amp;T Business</span><small>Page 2 of 2</small></div><div className="hero-tour-paper-line" /><div className="hero-tour-paper-line short" /><div className="hero-tour-paper-highlight"><span>Monthly circuit charge</span><strong>$1,510.00</strong></div><div className="hero-tour-paper-line" /><div className="hero-tour-paper-line medium" /></div><div className="hero-tour-finding-card"><span className="hero-tour-finding-status"><CircleAlert aria-hidden="true" size={12} /> Review needed</span><h3>Monthly circuit charge increased</h3><p>Current bill: <strong>$1,510 / mo</strong><br />Previous bill: $1,310 / mo</p><div className="hero-tour-potential"><span>Potential annual impact</span><strong>+$2,400</strong><small>Not verified · source linked</small></div><span ref={targetRef} className={`hero-tour-secondary ${targetClassName}`} aria-hidden="true">View evidence <ArrowRight size={11} /></span></div></div></div>
            ) : (
              <div className="hero-tour-action-view"><div><span className="hero-tour-kicker">Human approval</span><h3>Review the suggested next step</h3><p>Costivra prepares the plan. Your team decides whether anything moves forward.</p></div><div className="hero-tour-action-card"><div className="hero-tour-action-card-heading"><span className="hero-tour-action-icon"><UserCheck aria-hidden="true" size={14} /></span><div><strong>Ask vendor to explain the increase</strong><small>Draft only · no message will be sent</small></div><span className="hero-tour-approval-badge">Approval required</span></div><div className="hero-tour-action-evidence"><FileText aria-hidden="true" size={12} /><span>May internet bill · Page 2 · $1,510.00 charge</span></div><div className="hero-tour-action-buttons"><span ref={targetRef} className={`hero-tour-primary ${targetClassName}`} aria-hidden="true"><Check size={12} /> Approve review plan</span><span className="hero-tour-secondary" aria-hidden="true">Save for later</span></div></div><div className="hero-tour-callout"><ShieldCheck aria-hidden="true" size={13} /><span>No outside communication happens without your approval.</span></div></div>
            )}
          </div>
          <HeroTourCursor isClicking={isClicking} position={cursorPosition} />
        </div>
      </div>
      <div className="hero-product-controls">
        <div className="hero-product-stage-controls" role="tablist" aria-label="Product walkthrough steps">
          {[{ label: "Upload", icon: Upload }, { label: "Review", icon: CircleAlert }, { label: "Decide", icon: UserCheck }].map(({ label, icon: Icon }, index) => (
            <button key={label} type="button" role="tab" aria-selected={activeStage === index} className={activeStage === index ? "active" : ""} onClick={() => selectStage(index)}>
              <Icon aria-hidden="true" size={13} />{label}
            </button>
          ))}
          <button type="button" className="hero-product-play" onClick={togglePlayback} aria-label={isPlaying ? "Pause product walkthrough" : "Play product walkthrough"}>
            {isPlaying ? <Pause aria-hidden="true" size={13} /> : <Play aria-hidden="true" size={13} />}
          </button>
        </div>
        <span>Private intake · evidence · human decision</span>
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

function Plan({ planKey, name, interval, price, copy }: { planKey: PublicBillingPlan["key"]; name: string; interval: PublicBillingPlan["interval"]; price: string; copy: string }) {
  return <div className="plan"><span className="plan-name">{name}</span><div className="price">{price}{price.startsWith("$") ? <small style={{ fontSize: ".85rem", fontWeight: 400 }}> / {interval}</small> : null}</div><p>{copy}</p>{planKey === "enterprise" ? <Link className="button button-secondary" href="/contact">Talk to us</Link> : <Link className="button button-secondary" href={`/signup?plan=${planKey}`}>Choose {name}</Link>}</div>;
}
