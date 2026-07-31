"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  CircleDollarSign,
  FileCheck2,
  FileLock2,
  FileSearch,
  Gauge,
  Handshake,
  Hotel,
  KeyRound,
  Landmark,
  LockKeyhole,
  Mail,
  MapPin,
  RadioTower,
  ReceiptText,
  ScanSearch,
  School,
  ShieldCheck,
  Store,
  Upload,
  Users,
  Warehouse,
  Zap,
} from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

type PageSpec = {
  title: string;
  lede: string;
  blocks: { icon: typeof ShieldCheck; title: string; copy: string }[];
  kind?: "evidence" | "category" | "sequence" | "controls" | "rail" | "portfolio" | "manifesto" | "handoff" | "timeline" | "registry" | "consent";
  operating?: { eyebrow: string; title: string; copy: string; steps: { label: string; copy: string }[] };
  close?: { title: string; copy: string; action: string; href: string };
};

const specs: Record<string, PageSpec> = {
  product: {
    kind: "evidence",
    title: "Cost intelligence that leads to action.",
    lede: "Costivra connects source documents, structured financial records, deterministic rules, approval policies, and verified outcomes in one operating system.",
    blocks: [
      { icon: Upload, title: "Private document intake", copy: "Upload bills and agreements into private storage. Costivra preserves the original, validates the file, and records provenance." },
      { icon: FileSearch, title: "Evidence-linked extraction", copy: "Every important field keeps its source page, text, coordinates when available, confidence, and extraction version." },
      { icon: Gauge, title: "Opportunity cases", copy: "Findings become structured cases with value, severity, assumptions, missing information, assigned owners, and audit history." },
      { icon: Users, title: "Policy-controlled approvals", copy: "Your rules decide who must approve external communication, vendor changes, referrals, and high-value actions." },
      { icon: CircleDollarSign, title: "Savings verification", copy: "Approved baselines and post-action evidence separate potential value, recurring savings, and one-time recovery." },
      { icon: FileCheck2, title: "Decision-ready reporting", copy: "Export evidence-backed reports for executives, finance teams, advisors, and auditors without relying on chat transcripts." },
    ],
    operating: { eyebrow: "The product model", title: "One cost record. A traceable chain of custody.", copy: "Costivra keeps the original source, normalized facts, system reasoning, approvals, and verified outcome connected—so a decision does not become a scavenger hunt across inboxes and spreadsheets.", steps: [{ label: "Source", copy: "The original bill, agreement, or account record remains available beside the work." }, { label: "Judgment", copy: "Rules, assumptions, confidence, and missing information explain why a case exists." }, { label: "Outcome", copy: "The record closes only when an approved action and future evidence establish what actually changed." }] },
    close: { title: "See the operating system in context.", copy: "Open the workspace to review how an opportunity, its source document, approval path, and expected value stay connected.", action: "View customer workspace", href: "/app" },
  },
  solutions: {
    kind: "category",
    title: "Start where recurring costs hide in plain sight.",
    lede: "Costivra begins with three document-heavy categories that combine quick wins, meaningful contract risk, and explainable calculations.",
    blocks: [
      { icon: FileCheck2, title: "Software subscriptions", copy: "Find duplicate tools, unused seats, gradual price changes, unapproved upgrades, and renewal dates before they become sunk cost." },
      { icon: RadioTower, title: "Telecom & internet", copy: "Normalize services by location, detect inactive lines, compare recurring charges, and surface renewal or notice deadlines." },
      { icon: Zap, title: "Commercial energy review", copy: "Organize invoices and agreements, flag accounts that warrant professional review, and let the customer choose the advisor." },
    ],
    operating: { eyebrow: "A focused starting point", title: "Three categories. The same standard of proof.", copy: "The categories differ, but the operating discipline is consistent: establish the source, show the calculation or rule, assign the owner, and distinguish a lead from a verified result.", steps: [{ label: "Recurring", copy: "Prioritize spend that repeats, changes quietly, or includes a deadline customers can miss." }, { label: "Explainable", copy: "Surface a case only when the supporting fields and limitations can be reviewed." }, { label: "Actionable", copy: "Route the next step to the person who can decide, approve, or bring in an expert." }] },
    close: { title: "Start with the bills already on your desk.", copy: "A focused scan is the fastest way to see whether Costivra can bring order to the category that is creating the most friction today.", action: "Run a free cost scan", href: "/scan" },
  },
  "how-it-works": {
    kind: "sequence",
    title: "A closed loop from source to outcome.",
    lede: "Costivra is not a chatbot making guesses about a bill. It is a controlled process in which interpretation, calculation, policy, approval, execution, and verification have separate jobs.",
    blocks: [
      { icon: Upload, title: "1. Connect", copy: "Add a document, inbox, accounting source, vendor account, or approved export." },
      { icon: FileSearch, title: "2. Extract and verify", copy: "Convert unstructured content into typed facts, preserve evidence, and escalate uncertainty." },
      { icon: ScanSearch, title: "3. Detect", copy: "Apply category rules and explain why a potential cost leak or deadline deserves attention." },
      { icon: Users, title: "4. Approve", copy: "Route a bounded action to the right people under the organization's policy." },
      { icon: CheckCircle2, title: "5. Execute", copy: "Complete only the approved action, with idempotency and a record of every external effect." },
      { icon: CircleDollarSign, title: "6. Verify", copy: "Compare future bills, credits, and approved baselines to prove the real outcome." },
    ],
    operating: { eyebrow: "What stays human", title: "Automation handles the record. People retain the decision.", copy: "Costivra can organize, compare, route, and prepare. Your team controls exceptions, approvals, vendor choices, and every consequential external action.", steps: [{ label: "System work", copy: "Collect facts, apply supported rules, prepare a clear case, and maintain the audit trail." }, { label: "Team judgment", copy: "Review uncertainty, approve scope, and decide whether the proposed next step is right." }, { label: "Proof of value", copy: "Use an agreed baseline and subsequent evidence before calling an outcome savings." }] },
    close: { title: "Review the process against a real source document.", copy: "Start with a small, contained scan before connecting more systems or expanding to additional categories.", action: "Start a contained scan", href: "/scan" },
  },
  security: {
    kind: "controls",
    title: "Trust has to be designed into the product.",
    lede: "Bills and contracts reveal sensitive operational details. Costivra's product architecture is designed around tenant isolation, private files, least privilege, evidence, and explicit authorization.",
    blocks: [
      { icon: Building2, title: "Tenant isolation", copy: "Organization boundaries are enforced at the database and service layers, with tests proving customers cannot cross those boundaries." },
      { icon: FileLock2, title: "Private documents", copy: "Original files stay in private storage and use short-lived signed access. Sensitive identifiers are masked when full display is unnecessary." },
      { icon: KeyRound, title: "Least privilege", copy: "Users, services, agents, and integrations receive narrow permissions for the organization, resource, and action they need." },
      { icon: ShieldCheck, title: "Human authorization", copy: "Consequential external actions require the configured approvals. Bank and payment instructions cannot be changed autonomously." },
      { icon: FileCheck2, title: "Complete provenance", copy: "Corrections preserve the original extraction, editor, timestamp, reason, and evidence reference." },
      { icon: LockKeyhole, title: "Untrusted content defense", copy: "Instructions found inside documents, email, or OCR text are treated as data and cannot change policy or expand tool access." },
    ],
    operating: { eyebrow: "Security in practice", title: "Sensitive documents do not get a shortcut around control.", copy: "The product is designed so access is scoped by organization and role, important changes are attributable, and a document cannot tell the system to do something outside approved policy.", steps: [{ label: "Access", copy: "Private files and customer data are available only through authorized, narrowly scoped paths." }, { label: "Authority", copy: "Permission to view a record is separate from permission to approve or perform an external action." }, { label: "Accountability", copy: "Material corrections, approvals, and sharing decisions retain actor, time, reason, and evidence." }] },
    close: { title: "Bring your security questions to the product, not a sales script.", copy: "Use the contact channel for a specific workflow or data-handling question. We will be clear about what exists today and what is still planned.", action: "Contact Costivra", href: "/contact" },
  },
  integrations: {
    kind: "rail",
    title: "Connect deliberately, not indiscriminately.",
    lede: "Each integration is scoped to a supported workflow and the minimum data required. Private upload is the first production source; connected systems follow after workflow validation.",
    blocks: [
      { icon: Mail, title: "Microsoft 365 and Gmail", copy: "Monitor selected vendor correspondence and attachments with customer-approved scope." },
      { icon: Landmark, title: "QuickBooks and Xero", copy: "Reconcile vendor, bill, and payment records without turning accounting software into a model tool." },
      { icon: CircleDollarSign, title: "Stripe", copy: "Support subscriptions and approved performance-fee billing with a clear verification record." },
      { icon: Handshake, title: "Expert partners", copy: "Share only consented evidence packages with the advisor or specialist selected by the customer." },
    ],
    operating: { eyebrow: "Integration discipline", title: "Every connection needs a purpose and a boundary.", copy: "Costivra does not connect systems just to collect more data. An integration must support a specific workflow, carry the least necessary information, and be easy for the customer to understand and revoke.", steps: [{ label: "Scope", copy: "Define the workflow, records, organization, and user permissions before the connection is enabled." }, { label: "Review", copy: "Confirm what data will move, what it will be used for, and whether a private upload is the safer start." }, { label: "Control", copy: "Keep authorization, sharing, and downstream action separate from simple data access." }] },
    close: { title: "Start with the workflow—not the connector list.", copy: "Tell us where your bills and contracts live. We can recommend the smallest reliable intake path for your review.", action: "Discuss your workflow", href: "/contact" },
  },
  industries: {
    kind: "portfolio",
    title: "Built for the businesses carrying too many recurring vendors.",
    lede: "The strongest early fit is a multi-location organization with material recurring spend and no large internal procurement department.",
    blocks: [
      { icon: Hotel, title: "Hotels & hospitality", copy: "Coordinate utilities, telecom, software, waste, contracts, and location-level accountability." },
      { icon: Store, title: "Restaurants & retail", copy: "Find duplicated services, disconnected lines, fragmented vendor buying, and location anomalies." },
      { icon: Warehouse, title: "Manufacturing", copy: "Track energy, telecom, equipment, vendor contracts, and operational cost changes across facilities." },
      { icon: School, title: "Schools & nonprofits", copy: "Protect deadlines and budgets with evidence that is easy to review across finance and leadership." },
      { icon: Building2, title: "Property management", copy: "Normalize recurring costs across properties, accounts, meters, services, and contract dates." },
      { icon: Users, title: "Assisted living & fitness", copy: "Monitor multi-location subscriptions, communications, utilities, and vendor renewals." },
    ],
    operating: { eyebrow: "The common pattern", title: "Local complexity needs a shared operating view.", copy: "Across locations, recurring costs become hard to compare because the vendor, bill format, owner, and timing all vary. Costivra normalizes the decision record while preserving the local source.", steps: [{ label: "Location", copy: "Tie each account, service, document, and deadline back to the site it serves." }, { label: "Portfolio", copy: "Compare recurring exposure without forcing every local bill into a generic summary." }, { label: "Owner", copy: "Give finance, operations, and location leaders the context needed for their part of the decision." }] },
    close: { title: "See whether your operating model is a fit.", copy: "A short conversation can establish the number of locations, categories, and document sources that should be in the first review.", action: "Talk through your portfolio", href: "/contact" },
  },
  about: {
    kind: "manifesto",
    title: "An operating-margin department for businesses without one.",
    lede: "Costivra is being built around a simple belief: businesses should be able to understand every recurring cost, see the evidence behind every finding, and keep control of every consequential action.",
    blocks: [
      { icon: ScanSearch, title: "Evidence over magic", copy: "A polished answer is not enough. Material claims must show where the number came from." },
      { icon: Users, title: "Control over autonomy", copy: "The system should save people time without taking decisions away from them." },
      { icon: CircleDollarSign, title: "Outcomes over activity", copy: "The north-star metric is verified customer value—not messages, prompts, or dashboards opened." },
    ],
    operating: { eyebrow: "What we are building", title: "A better standard for cost-control software.", copy: "Businesses deserve more than a polished recommendation. They deserve a record that tells them what changed, why it matters, who owns the next step, and whether the promised value materialized.", steps: [{ label: "Clarity", copy: "Make the source and the explanation available together." }, { label: "Consent", copy: "Keep customers in control of external sharing and consequential actions." }, { label: "Discipline", copy: "Call value verified only when later evidence supports the claim." }] },
    close: { title: "Help shape a more accountable operating system.", copy: "We are looking for teams willing to start with a real category, give direct feedback, and hold the product to a high standard of proof.", action: "Join the pilot conversation", href: "/contact" },
  },
  partners: {
    kind: "handoff",
    title: "Give expert partners a better evidence package.",
    lede: "Accountants, fractional CFOs, managed service providers, telecom consultants, and energy advisors can use Costivra as the intelligence and workflow layer while retaining their specialty role.",
    blocks: [
      { icon: FileCheck2, title: "Structured intake", copy: "Receive organized documents, extracted terms, calculations, missing data, and customer-approved scope." },
      { icon: Handshake, title: "Customer choice", copy: "Partner routing is transparent. Customers decide who receives the case and exactly what is shared." },
      { icon: BadgeCheck, title: "Outcome tracking", copy: "Close the loop from referral and action through verified result without blurring independent detection and partner compensation." },
    ],
    operating: { eyebrow: "A cleaner handoff", title: "Let experts spend time on judgment—not document cleanup.", copy: "A partner should receive a case with its source evidence, extracted terms, known gaps, customer-approved scope, and a clear record of what Costivra did not decide.", steps: [{ label: "Prepare", copy: "Organize the source record and surface the issue that warrants expert attention." }, { label: "Consent", copy: "Let the customer choose the partner and approve the exact information to share." }, { label: "Measure", copy: "Keep the resulting action and evidence separate from the original finding for a transparent outcome record." }] },
    close: { title: "Build a better referral experience.", copy: "If your firm has a repeatable specialty workflow, we can discuss whether Costivra can improve the quality and consistency of the intake.", action: "Talk about partnering", href: "/contact" },
  },
};

const verticalCopy: Record<string, [string, string]> = {
  hospitality: ["Control recurring costs across every property.", "Give finance and operations one view of bills, contracts, locations, deadlines, and verified savings across the hospitality portfolio."],
  "car-washes": ["Find cost leaks across every wash location.", "Normalize utility, telecom, software, waste, and vendor costs across high-throughput physical sites."],
  "assisted-living": ["Protect operating margin without compromising care.", "Track location-level recurring costs, contracts, and approval-sensitive actions across assisted-living operations."],
  restaurants: ["Keep every location's recurring costs visible.", "Find duplicated software, inactive services, telecom drift, and contract deadlines across restaurant groups."],
  fitness: ["Put multi-location fitness costs under control.", "Monitor software, telecom, utilities, equipment services, and recurring vendor relationships across clubs."],
  manufacturing: ["Evidence-first cost control for complex facilities.", "Organize recurring services, contract exposure, utilities, and location-level operating costs."],
  education: ["Give every budget line a source and an owner.", "Protect renewal dates and recurring budgets across private schools and educational organizations."],
  nonprofits: ["Make every recurring dollar accountable.", "Help churches and nonprofits review ongoing costs with plain-language evidence and approval control."],
  "property-management": ["See recurring cost exposure across the portfolio.", "Normalize property, meter, account, vendor, and contract data without losing location-level evidence."],
  retail: ["One command center for every location's recurring spend.", "Find price changes, service duplication, contract risk, and inconsistent buying across retail sites."],
};

const solutionSpecs: Record<string, PageSpec> = {
  software: {
    kind: "timeline",
    title: "Turn subscription sprawl into a controlled renewal process.",
    lede: "Costivra brings invoices, renewal language, seat signals, price changes, owners, and approval history into one reviewable record—before a quiet renewal becomes next year’s problem.",
    blocks: [{ icon: ReceiptText, title: "Vendor-by-vendor cost records", copy: "Link invoices, contracts, plan details, renewal dates, and known owners without flattening the source evidence." }, { icon: Users, title: "Seat and ownership review", copy: "Surface the questions a finance lead needs answered: who owns this tool, who uses it, and who can approve a change." }, { icon: CalendarClock, title: "Renewal and notice discipline", copy: "Make notice windows visible early enough to compare options deliberately instead of accepting an automatic renewal by default." }, { icon: Gauge, title: "Explainable spend changes", copy: "Separate a known price increase, a plan change, and an unresolved variance rather than labeling every higher bill as savings." }],
    operating: { eyebrow: "Software control", title: "Start with the recurring charge—then ask the operational question.", copy: "A subscription bill alone rarely tells the whole story. Costivra keeps the financial record tied to the renewal terms and accountable owner so a team can decide what to do next.", steps: [{ label: "Establish", copy: "Create a vendor record with source documents, current charge, term, and location or team context." }, { label: "Review", copy: "Flag price, renewal, duplicate-service, or ownership questions with evidence and explicit uncertainty." }, { label: "Act", copy: "Route only an approved request or vendor outreach, then keep the resulting change on the same record." }] },
    close: { title: "Begin with the subscriptions you renew every year.", copy: "A small set of invoices and agreements is enough to identify whether the renewal process is creating unnecessary exposure.", action: "Run a software scan", href: "/scan" },
  },
  telecom: {
    kind: "registry",
    title: "Make telecom spend legible across every site.",
    lede: "Internet, voice, wireless, and managed services accumulate line by line. Costivra organizes the service, location, account, contract, and invoice evidence needed to spot what merits review.",
    blocks: [{ icon: RadioTower, title: "Service-to-location mapping", copy: "Connect each line or circuit to the site, service type, account, and current bill rather than reviewing a carrier invoice in isolation." }, { icon: ReceiptText, title: "Recurring charge normalization", copy: "Break complex bills into comparable recurring charges, fees, and unresolved variances while retaining the original document." }, { icon: CalendarClock, title: "Contract and notice awareness", copy: "Surface term, renewal, and notice information before a location change or vendor conversation becomes time-sensitive." }, { icon: Users, title: "Clear review ownership", copy: "Give operations, IT, and finance a shared case record without assuming any one team has the entire answer." }],
    operating: { eyebrow: "Telecom review", title: "A line item is not a service inventory.", copy: "Costivra’s job is to create the bridge between carrier billing and the service actually being paid for at a real location.", steps: [{ label: "Map", copy: "Associate services, locations, account numbers, and source pages into a coherent record." }, { label: "Compare", copy: "Identify missing ownership, inactive-looking services, price changes, and deadlines that deserve confirmation." }, { label: "Resolve", copy: "Prepare a bounded question or action for the team or vendor, with approval before any external effect." }] },
    close: { title: "Bring order to a representative carrier bill.", copy: "Start with one carrier or one group of locations to establish the data model before expanding the review.", action: "Run a telecom scan", href: "/scan" },
  },
  energy: {
    kind: "consent",
    title: "Prepare an energy review with evidence, not pressure.",
    lede: "Costivra organizes energy invoices and agreements, surfaces missing context and deadline risk, and prepares a clear package for the advisor the customer chooses. It does not select a supplier or guarantee savings.",
    blocks: [{ icon: Zap, title: "Invoice and agreement intake", copy: "Bring account, meter, usage, charge, term, and contract evidence into a structured review without losing the original source." }, { icon: FileSearch, title: "Explainable review signals", copy: "Identify billing questions, contract timing, data gaps, and accounts that may merit professional review—along with the limits of the evidence." }, { icon: Handshake, title: "Customer-selected advisor path", copy: "Export the package, assign an existing advisor, or request a separately disclosed partner review only with explicit consent." }, { icon: ShieldCheck, title: "No hidden brokerage behavior", copy: "Costivra does not autonomously select providers, submit enrollments, alter accounts, or route a lead based on undisclosed compensation." }],
    operating: { eyebrow: "Energy review", title: "Separate preparation from advice and consent from referral.", copy: "Energy decisions are consequential. Costivra’s role is to make the source material and questions clearer, then preserve customer choice about who gives specialized advice.", steps: [{ label: "Prepare", copy: "Structure invoices and agreement facts, identify gaps, and preserve the evidence package." }, { label: "Choose", copy: "The customer can retain the package, export it, assign their advisor, or explicitly request a disclosed referral." }, { label: "Record", copy: "Keep consent, disclosure version, sharing scope, and later outcome separate from the initial analysis." }] },
    close: { title: "Start with an evidence package, not a sales call.", copy: "Upload a small, authorized set of energy documents to see what can be organized and which questions remain unanswered.", action: "Start an energy review", href: "/scan" },
  },
};

export function MarketingPage({ path }: { path: string }) {
  if (path === "pricing") return <PricingPage />;
  if (path === "scan") return <ScanPage />;
  if (path === "login" || path === "signup") return <AccountPage mode={path} />;
  if (path === "privacy") return <PrivacyPage />;
  if (path === "terms") return <TermsPage />;
  if (path === "ucep-disclosure") return <DisclosurePage />;
  if (path === "contact") return <ContactPage />;
  if (path === "case-studies") return <CaseStudies />;
  if (path === "help") return <HelpPage />;
  if (path === "status") return <StatusPage />;
  if (path.startsWith("industries/")) {
    const vertical = path.split("/")[1];
    const copy = verticalCopy[vertical];
    return copy ? <IndustryPage title={copy[0]} lede={copy[1]} /> : <NotFoundPage />;
  }
  if (path.startsWith("solutions/")) {
    const solution = solutionSpecs[path.split("/")[1]];
    return solution ? <SpecPage spec={solution} /> : <SpecPage spec={specs.solutions} />;
  }
  const spec = specs[path];
  return spec ? <SpecPage spec={spec} /> : <NotFoundPage />;
}

function PageFrame({ children }: { children: React.ReactNode }) { return <main className="paper-texture"><div className="container content-page">{children}</div></main>; }

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { node.classList.add("is-visible"); observer.unobserve(node); } }, { threshold: .14 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <div className={`reveal ${className}`} ref={ref}>{children}</div>;
}

function SignatureScene({ kind }: { kind: NonNullable<PageSpec["kind"]> }) {
  if (kind === "timeline") return <section className="signature signature-timeline"><div className="signature-copy"><h2>Every renewal gets a visible moment of truth.</h2><p>Move from invoice evidence to an owned renewal decision without losing the contract, the current charge, or the history of what changed.</p></div><div className="timeline-track">{["Invoice received", "Owner confirmed", "Terms reviewed", "Decision recorded", "Renewal date"].map((label, index) => <div className={index === 3 ? "timeline-event is-current" : "timeline-event"} key={label}><span>{String(index + 1).padStart(2, "0")}</span><strong>{label}</strong></div>)}</div></section>;
  if (kind === "registry") return <section className="signature signature-registry"><div className="registry-list"><span>Location</span><strong>Austin · 12th Street</strong><span>Service</span><strong>Fiber internet · Voice</strong><span>Account</span><strong>Carrier 0481-2</strong></div><div className="signature-copy"><h2>Turn carrier lines into an operational inventory.</h2><p>One service record connects the location, account, bill, contract timing, and responsible team. That is what makes a telecom review actionable.</p></div></section>;
  if (kind === "consent") return <section className="signature signature-consent"><div className="consent-file"><span>ENERGY REVIEW PACKAGE</span><strong>Customer-controlled</strong><p>Invoice evidence · Agreement terms · Missing data · Review questions</p></div><div className="signature-copy"><h2>Preparation, advice, and referral are intentionally separate.</h2><p>Costivra assembles the evidence package. The customer chooses whether to keep it, export it, or share it with a selected advisor under an explicit scope.</p></div></section>;
  if (kind === "sequence") return <section className="signature signature-sequence"><div className="sequence-line">{["Connect", "Extract", "Detect", "Approve", "Execute", "Verify"].map((label, index) => <div className={index === 3 ? "sequence-node is-emphasis" : "sequence-node"} key={label}><span>{String(index + 1).padStart(2, "0")}</span><strong>{label}</strong></div>)}</div><div className="signature-copy"><h2>Every stage changes what is known—and what is allowed.</h2><p>The workflow moves forward only when source evidence, policy, and human authorization are sufficient for the next step.</p></div></section>;
  if (kind === "controls") return <section className="signature signature-controls"><div className="control-rings"><span>Document</span><span>Organization</span><span>Policy</span><span>Approval</span></div><div className="signature-copy"><h2>Controls should be visible in the workflow, not buried in a promise.</h2><p>Access, authority, and accountability are separate layers. That means a file cannot create permission, and permission cannot silently become an external action.</p></div></section>;
  if (kind === "portfolio") return <section className="signature signature-portfolio"><div className="portfolio-map"><span>01</span><span>02</span><span>03</span><span>04</span><span>05</span><span>06</span></div><div className="signature-copy"><h2>One portfolio view. Local source evidence intact.</h2><p>Costivra makes recurring exposure comparable across locations without pretending the bill, owner, or operating reality is identical everywhere.</p></div></section>;
  if (kind === "manifesto") return <section className="signature signature-manifesto"><blockquote>“A cost decision should be easy to trace, easy to challenge, and impossible to lose.”</blockquote><div className="signature-copy"><h2>Less theater. More operational truth.</h2><p>Costivra is designed to make claims explainable and actions controlled—especially when money, contracts, and customer trust are involved.</p></div></section>;
  if (kind === "handoff") return <section className="signature signature-handoff"><div className="handoff-flow"><strong>Customer</strong><i /><strong>Evidence package</strong><i /><strong>Selected expert</strong></div><div className="signature-copy"><h2>A handoff should improve the expert&apos;s judgment, not replace it.</h2><p>The customer sees who receives the case, why they were selected, and exactly what is shared. The partner receives a prepared record, not a loose inbox thread.</p></div></section>;
  if (kind === "rail") return <section className="signature signature-rail"><div className="rail-flow"><strong>Workflow need</strong><i /><strong>Minimum data</strong><i /><strong>Approved connection</strong></div><div className="signature-copy"><h2>Connect systems with intention.</h2><p>Every integration starts with a supported workflow, defined information scope, and an easy-to-understand control point for the customer.</p></div></section>;
  return <section className="signature signature-category"><div className="category-orbit"><span>Software</span><span>Telecom</span><span>Energy</span></div><div className="signature-copy"><h2>Different categories. One evidence standard.</h2><p>Start with the recurring cost where a missing owner, hidden deadline, or unexplained charge is creating the most risk today.</p></div></section>;
}

function SpecPage({ spec }: { spec: PageSpec }) {
  const operating = spec.operating ?? { eyebrow: "A practical operating model", title: "Make the next decision clearer.", copy: "Costivra connects source evidence, the question that needs an answer, the person responsible, and the record of what changed. The point is clarity—not another dashboard to maintain.", steps: spec.blocks.slice(0, 3).map((block) => ({ label: block.title, copy: block.copy })) };
  const close = spec.close ?? { title: "Start with a contained, evidence-backed review.", copy: "Choose one recurring-cost category and a small group of documents. You can evaluate the workflow before asking your team to change how it works.", action: "Run a free cost scan", href: "/scan" };
  return <PageFrame><div className={`spec-page spec-page--${spec.kind ?? "category"}`}><Reveal><header className="content-hero"><h1>{spec.title}</h1><p>{spec.lede}</p><div className="hero-actions" style={{ marginTop: 30 }}><Link className="button button-primary" href="/scan">Run a free cost scan <ArrowRight aria-hidden="true" size={17} /></Link><Link className="button button-secondary" href="/app">View customer workspace</Link></div></header></Reveal><Reveal><SignatureScene kind={spec.kind ?? "category"} /></Reveal><Reveal><div className="content-grid">{spec.blocks.map(({ icon: Icon, title, copy }) => <article className="content-block" key={title}><Icon aria-hidden="true" size={25} style={{ color: "var(--blue)" }} /><h2>{title}</h2><p>{copy}</p></article>)}</div></Reveal><Reveal><section className="spec-operating"><div className="spec-operating-intro"><span className="eyebrow">{operating.eyebrow}</span><h2>{operating.title}</h2><p>{operating.copy}</p></div><ol className="spec-steps">{operating.steps.map((step, index) => <li key={step.label}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{step.label}</h3><p>{step.copy}</p></div></li>)}</ol></section></Reveal><Reveal><section className="spec-closure"><div><span className="eyebrow">A deliberate first step</span><h2>{close.title}</h2><p>{close.copy}</p></div><Link className="button button-primary" href={close.href}>{close.action} <ArrowRight aria-hidden="true" size={17} /></Link></section></Reveal></div></PageFrame>;
}

function PricingPage() {
  const plans = [["Starter", "$149", "One business", "Up to three active expense accounts", "Monthly monitoring", "Renewal reminders"], ["Growth", "$599", "Multiple locations", "Team and approval workflows", "Weekly monitoring", "Advanced reports"], ["Enterprise", "Custom", "SSO and custom roles", "Custom integrations", "Retention controls", "Dedicated support"]];
  return <PageFrame><header className="content-hero"><h1>Pay for control.<br />Measure the value.</h1><p>Start with a focused scan, then choose the monitoring and workflow depth your organization needs. Performance and referral fees, when used, require separate clear terms.</p></header><div className="content-grid">{plans.map(([name, price, ...features]) => <article className="content-block" style={{ minHeight: 390 }} key={name}><span style={{ color: "var(--blue)", fontWeight: 800 }}>{name}</span><div style={{ margin: "22px 0", fontSize: "2.5rem", fontWeight: 750, letterSpacing: "-.05em" }}>{price}{price.startsWith("$") ? <small style={{ fontSize: ".9rem", fontWeight: 400 }}> / month</small> : null}</div>{features.map((feature) => <p key={feature} style={{ display: "flex", gap: 8 }}><Check aria-hidden="true" size={16} style={{ color: "var(--mint-dark)", flex: "0 0 auto", marginTop: 5 }} /> {feature}</p>)}<Link className={`button ${name === "Growth" ? "button-primary" : "button-secondary"}`} href="/scan" style={{ marginTop: 15 }}>{name === "Enterprise" ? "Talk to us" : "Start with a scan"}</Link></article>)}</div><Reveal><section className="pricing-decision"><div><h2>Pricing should map to the responsibility you are taking on.</h2><p>Costivra is priced around the scope of recurring-cost control you need—not around a vague promise of savings.</p></div><div className="pricing-decision-rows"><div><span>Monitoring</span><strong>How many accounts and locations need a continuing review?</strong></div><div><span>Decision flow</span><strong>How many people need to see, assign, or approve the work?</strong></div><div><span>Assurance</span><strong>What reporting, retention, and support level does your organization require?</strong></div></div></section></Reveal><section className="spec-operating pricing-detail"><div className="spec-operating-intro"><span className="eyebrow">Before you buy</span><h2>A paid plan should have a defined job.</h2><p>Choose the smallest plan that supports the number of active accounts, people, locations, and approval paths you need to manage. Expand only when the workflow has proven useful.</p></div><ol className="spec-steps"><li><span>01</span><div><h3>Start contained</h3><p>Use the scan to determine whether the documents and category have enough signal to justify ongoing monitoring.</p></div></li><li><span>02</span><div><h3>Agree the method</h3><p>For any value-based arrangement, define the baseline, evidence, verification method, and applicable fee in writing.</p></div></li><li><span>03</span><div><h3>Keep your options</h3><p>You retain control of vendors, advisors, external sharing, and all consequential approvals regardless of plan.</p></div></li></ol></section><p className="muted" style={{ marginTop: 30, lineHeight: 1.6 }}>Pilot pricing is a product concept and may change before commercial launch. No performance fee is charged until a customer accepts the baseline, verification method, result, and applicable fee terms.</p></PageFrame>;
}

function ScanPage() {
  const [done, setDone] = useState(false);
  function submit(event: FormEvent) { event.preventDefault(); setDone(true); }
  return <PageFrame><div className="detail-layout" style={{ gridTemplateColumns: "1fr .85fr", alignItems: "start" }}><header className="content-hero"><h1>Start with three bills.</h1><p>Upload up to three recurring expense documents. Costivra will organize the information, flag what deserves attention, and show the evidence and limitations.</p><div style={{ marginTop: 44 }}><p><Check aria-hidden="true" size={17} style={{ color: "var(--mint-dark)", verticalAlign: "middle", marginRight: 8 }} />No automatic vendor contact</p><p><Check aria-hidden="true" size={17} style={{ color: "var(--mint-dark)", verticalAlign: "middle", marginRight: 8 }} />No unsupported savings guarantee</p><p><Check aria-hidden="true" size={17} style={{ color: "var(--mint-dark)", verticalAlign: "middle", marginRight: 8 }} />Your documents remain private</p></div></header><section className="panel" style={{ boxShadow: "var(--shadow)" }}><div className="panel-header"><h2>Free Cost Leak Scan</h2><span className="eyebrow">Secure intake</span></div>{done ? <div className="panel-body" style={{ padding: 36, textAlign: "center" }}><CheckCircle2 aria-hidden="true" size={36} style={{ color: "var(--mint-dark)", margin: "0 auto 18px" }} /><h2>You&apos;re on the pilot list.</h2><p className="muted" style={{ lineHeight: 1.6 }}>We saved this frontend submission locally for the demo. The production upload workflow will add file validation, malware scanning, private storage, hashing, extraction, and evidence review.</p><Link className="button button-primary" href="/app">Open the demo workspace</Link></div> : <form className="panel-body" onSubmit={submit}><div className="field"><label htmlFor="work-email">Work email</label><input id="work-email" required type="email" placeholder="you@company.com" /></div><div className="field" style={{ marginTop: 16 }}><label htmlFor="company">Company</label><input id="company" required placeholder="Your company name" /></div><div className="field" style={{ marginTop: 16 }}><label htmlFor="category">First expense category</label><select id="category"><option>Software subscriptions</option><option>Telecom & internet</option><option>Commercial energy review</option></select></div><label htmlFor="documents" style={{ display: "grid", minHeight: 145, placeItems: "center", border: "1px dashed var(--blue)", borderRadius: 8, marginTop: 18, color: "var(--blue)", cursor: "pointer", textAlign: "center", padding: 20 }}><span><Upload aria-hidden="true" size={24} style={{ margin: "0 auto 10px" }} /><strong>Choose up to three documents</strong><small style={{ display: "block", marginTop: 5, color: "var(--muted)" }}>PDF, PNG, or JPG · 20 MB each</small></span><input id="documents" type="file" multiple accept=".pdf,.png,.jpg,.jpeg" style={{ position: "absolute", opacity: 0, pointerEvents: "none" }} /></label><label style={{ display: "flex", gap: 10, marginTop: 18, fontSize: ".76rem", lineHeight: 1.5 }}><input required type="checkbox" /> <span>I have authority to upload these documents and agree to the <Link href="/terms" style={{ color: "var(--blue)" }}>Terms</Link> and <Link href="/privacy" style={{ color: "var(--blue)" }}>Privacy Policy</Link>.</span></label><button className="button button-primary" type="submit" style={{ width: "100%", marginTop: 18 }}>Submit for a scan <ArrowRight aria-hidden="true" size={16} /></button></form>}</section></div></PageFrame>;
}

function AccountPage({ mode }: { mode: string }) {
  const signup = mode === "signup";
  return <PageFrame><div style={{ display: "grid", maxWidth: 480, margin: "30px auto", border: "1px solid var(--line)", background: "var(--white)", padding: 36, boxShadow: "var(--shadow)" }}><span className="mini-mark" style={{ marginBottom: 24 }}>C</span><h1 style={{ margin: 0, fontSize: "2.6rem", letterSpacing: "-.05em" }}>{signup ? "Create your Costivra account." : "Welcome back."}</h1><p className="muted" style={{ lineHeight: 1.6 }}>{signup ? "Start with a secure cost scan and build your recurring-expense command center." : "Sign in to review evidence, approve actions, and track verified value."}</p><div className="field" style={{ marginTop: 18 }}><label htmlFor="email">Work email</label><input id="email" type="email" placeholder="you@company.com" /></div>{signup ? <div className="field" style={{ marginTop: 16 }}><label htmlFor="company-name">Company</label><input id="company-name" placeholder="Your company" /></div> : null}<Link className="button button-primary" href="/app" style={{ marginTop: 20 }}>{signup ? "Create account" : "Continue with email"}</Link><p className="muted" style={{ textAlign: "center", fontSize: ".8rem", marginTop: 22 }}>{signup ? <>Already have an account? <Link href="/login" style={{ color: "var(--blue)" }}>Sign in</Link></> : <>New to Costivra? <Link href="/signup" style={{ color: "var(--blue)" }}>Create an account</Link></>}</p></div></PageFrame>;
}

function IndustryPage({ title, lede }: { title: string; lede: string }) {
  const spec: PageSpec = { kind: "portfolio", title, lede, blocks: [{ icon: MapPin, title: "Location-level visibility", copy: "Connect every invoice, contract, account, meter, and service to the location it belongs to." }, { icon: CalendarClock, title: "Deadline protection", copy: "Surface renewal and notice windows while there is still time to make a deliberate decision." }, { icon: ReceiptText, title: "Comparable recurring spend", copy: "Normalize vendor-specific bills into a consistent financial record without losing the source evidence." }, { icon: Users, title: "Operational ownership", copy: "Assign findings and approvals to finance, operations, and location leaders with a complete history." }, { icon: CircleDollarSign, title: "Verified outcomes", copy: "Separate potential value from savings or recovery that future invoices actually prove." }, { icon: ShieldCheck, title: "Controlled action", copy: "Keep external communication, vendor decisions, and expert handoffs under explicit policy." }] };
  return <SpecPage spec={spec} />;
}

function ContactPage() {
  return <PageFrame><header className="content-hero"><h1>Bring us the cost you cannot explain.</h1><p>Tell us what you are reviewing, how many locations are involved, and where the source documents live. We will respond with a practical next step.</p></header><div className="detail-layout"><section className="panel"><div className="panel-header"><h2>Contact Costivra</h2></div><form className="panel-body"><div className="form-grid"><Input label="Name" /><Input label="Work email" type="email" /><Input label="Company" /><Input label="Locations" /></div><div className="field" style={{ marginTop: 18 }}><label htmlFor="message">What recurring cost are you reviewing?</label><textarea id="message" /></div><button className="button button-primary" type="button" style={{ marginTop: 18 }}>Send inquiry <ArrowRight aria-hidden="true" size={16} /></button></form></section><section className="panel"><div className="panel-header"><h2>Direct contacts</h2></div><div className="panel-body"><p><strong>General</strong><br /><a href="mailto:hello@costivra.com" style={{ color: "var(--blue)" }}>hello@costivra.com</a></p><p><strong>Privacy</strong><br /><a href="mailto:privacy@costivra.com" style={{ color: "var(--blue)" }}>privacy@costivra.com</a></p><p><strong>Security</strong><br /><a href="mailto:security@costivra.com" style={{ color: "var(--blue)" }}>security@costivra.com</a></p><p className="muted" style={{ marginTop: 30, lineHeight: 1.6 }}>Do not email sensitive bills or contracts. Use the secure scan intake once your account is approved.</p></div></section></div></PageFrame>;
}

function CaseStudies() { return <PageFrame><header className="content-hero"><h1>Proof should arrive before the story.</h1><p>Costivra will publish case studies only after the customer, baseline, methodology, action, and outcome are documented and approved. We will not manufacture social proof for a pre-launch product.</p></header><section className="panel"><div className="panel-header"><h2>Pilot case-study standard</h2><span className="eyebrow">No fabricated claims</span></div><div className="content-grid" style={{ borderTop: 0 }}>{[{ icon: FileSearch, title: "Source", copy: "The original invoice, agreement, or account record supporting the finding." }, { icon: ScanSearch, title: "Finding", copy: "The rule, assumptions, confidence, and reason the opportunity warranted review." }, { icon: Users, title: "Decision", copy: "Who approved the action, what was authorized, and what remained out of scope." }, { icon: CircleDollarSign, title: "Outcome", copy: "The future invoice, credit, or other source that proved one-time or recurring value." }].map(({ icon: Icon, title, copy }) => <div className="content-block" key={title}><Icon aria-hidden="true" size={24} style={{ color: "var(--blue)" }} /><h2>{title}</h2><p>{copy}</p></div>)}</div></section></PageFrame>; }

function HelpPage() { const guides = [{ title: "Uploading bills and contracts", copy: "Use an authorized PDF, PNG, or JPG. Start with the current invoice and agreement when one exists; do not send sensitive files through ordinary email." }, { title: "Reviewing extracted fields", copy: "Open the source alongside the extracted record. Correct a field when it is wrong or incomplete—the correction should retain the reason and source reference." }, { title: "Understanding confidence", copy: "Confidence shows how certain the system is about a field, not whether a business decision is correct. Low-confidence records need review before they influence an action." }, { title: "Approving an action", copy: "Read the requested scope, the supporting evidence, and the external effect. Approve only the specific step you want taken; you can leave a case pending or decline it." }, { title: "Exporting an energy review", copy: "Use the package to inform the advisor you select. Referral sharing requires a separate disclosure and explicit consent; Costivra does not choose a supplier for you." }, { title: "Verifying savings", copy: "Potential value becomes verified only after an agreed baseline and later source evidence—such as a future bill or credit—support the result." }]; return <PageFrame><header className="content-hero"><h1>Help for the decision in front of you.</h1><p>Understand uploads, evidence, confidence, approvals, referrals, and savings verification without learning AI terminology first.</p></header><div className="content-grid">{guides.map(({ title, copy }, index) => <div className="content-block" key={title}><span className="step-number" style={{ position: "static" }}>{index + 1}</span><h2>{title}</h2><p>{copy}</p></div>)}</div><section className="spec-closure"><div><span className="eyebrow">Need a specific answer?</span><h2>Tell us which decision is blocked.</h2><p>Include the category, the document or account involved, and what you are trying to determine. We will point you to the right product path or explain the current limitation.</p></div><Link className="button button-primary" href="/contact">Contact support <ArrowRight aria-hidden="true" size={17} /></Link></section></PageFrame>; }

function StatusPage() { return <PageFrame><header className="content-hero"><h1>System status.</h1><p>Current operational status for Costivra&apos;s public site and product-preview environment.</p></header><section className="panel"><div className="panel-header"><h2>All preview systems operational</h2><span className="status good"><CheckCircle2 aria-hidden="true" size={13} /> Operational</span></div>{["Marketing site", "Customer workspace preview", "Document upload demonstration", "Authentication demonstration"].map((item) => <div key={item} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--line)", padding: 18 }}><span>{item}</span><span style={{ color: "var(--mint-dark)" }}>Operational</span></div>)}<div className="panel-body muted" style={{ lineHeight: 1.6 }}>This page reflects the frontend preview only. Production provider status and incident history will be added when those services are connected.</div></section></PageFrame>; }

function PrivacyPage() { return <LegalPage title="Privacy Policy" meta="Effective July 30, 2026 · Product-launch draft" sections={privacySections} />; }
function TermsPage() { return <LegalPage title="Terms of Service" meta="Effective July 30, 2026 · Product-launch draft" sections={termsSections} />; }
function DisclosurePage() { return <LegalPage title="UCEP Relationship Disclosure" meta="Effective July 30, 2026 · Review by counsel required before commercial launch" sections={disclosureSections} />; }

function LegalPage({ title, meta, sections }: { title: string; meta: string; sections: { title: string; body: React.ReactNode }[] }) {
  return <PageFrame><header className="content-hero"><h1>{title}</h1><p>Clear terms for a product built around sensitive documents, consequential decisions, and customer control.</p></header><div className="article"><aside>{sections.map((section) => <a href={`#${section.title.toLowerCase().replaceAll(" ", "-")}`} key={section.title}>{section.title}</a>)}</aside><article className="prose"><div className="legal-meta">{meta}</div>{sections.map((section) => <section id={section.title.toLowerCase().replaceAll(" ", "-")} key={section.title}><h2>{section.title}</h2>{section.body}</section>)}</article></div></PageFrame>;
}

function Input({ label, type = "text" }: { label: string; type?: string }) { const id = label.toLowerCase().replaceAll(" ", "-"); return <div className="field"><label htmlFor={id}>{label}</label><input id={id} type={type} /></div>; }
function NotFoundPage() { return <PageFrame><header className="content-hero"><h1>That page is not in the evidence file.</h1><p>The link may have moved. Return to the homepage or open the customer workspace preview.</p><div className="hero-actions" style={{ marginTop: 30 }}><Link className="button button-primary" href="/">Return home</Link><Link className="button button-secondary" href="/app">Open workspace</Link></div></header></PageFrame>; }

const privacySections = [
  { title: "Overview", body: <><p>This Privacy Policy explains how Costivra may collect, use, store, and share information when you use our websites, document-intake experiences, and cost-intelligence services. The production policy must be updated to match the final company entity, vendors, data locations, and legal obligations before launch.</p><p>Costivra is designed to minimize data use, keep customer documents private, and preserve customer choice over external sharing.</p></> },
  { title: "Information we collect", body: <><p>We may collect account and organization information; contact details; location, vendor, expense, invoice, contract, and approval records; files you choose to upload; integration data you authorize; product usage and security logs; support communications; and billing information handled through payment providers.</p><p>Documents may contain account identifiers, prices, usage, employee or contact names, service addresses, contract terms, and other business information. You should upload only information you are authorized to provide.</p></> },
  { title: "How we use information", body: <ul><li>Provide document intake, extraction, normalization, evidence, monitoring, opportunity, approval, reporting, and verification features.</li><li>Authenticate users, enforce permissions, prevent abuse, and protect the service.</li><li>Respond to support and product requests.</li><li>Improve supported workflows using properly governed, de-identified, or consented data.</li><li>Meet legal obligations and enforce our agreements.</li></ul> },
  { title: "AI processing", body: <><p>Costivra may use model providers to interpret unstructured information. Production model requests should use contractual privacy controls appropriate to business data. Models do not independently authorize external actions or serve as the sole authority for financial calculations.</p><p>Instructions found inside documents are treated as untrusted data and cannot change Costivra policy.</p></> },
  { title: "How we share information", body: <><p>We may share limited information with service providers that host, secure, process, support, or bill for the service; with professional advisers; when required by law; or during a properly governed business transaction.</p><p>We do not sell identifiable customer documents. We do not send an energy review to UCEP or another advisor without purpose-specific customer consent. When authorized, we share only the records within that approved scope.</p></> },
  { title: "Storage and retention", body: <p>Production documents should be stored privately with access controls, encryption, and short-lived signed access. Retention periods will be documented by data type and customer plan. We may retain security, audit, consent, and transaction records as needed for legitimate business or legal purposes.</p> },
  { title: "Your choices", body: <p>Depending on your location and relationship with Costivra, you may request access, correction, export, or deletion of personal information; manage integration access; change optional benchmark participation; and revoke future referral sharing. Revocation does not undo sharing already completed under valid prior consent.</p> },
  { title: "Security", body: <p>No service can guarantee absolute security. Costivra&apos;s intended controls include tenant isolation, least privilege, private storage, signed access, strong authentication, audit logs, rate limits, validation, monitoring, and incident procedures. Report suspected issues to security@costivra.com.</p> },
  { title: "Contact", body: <p>Questions or requests may be sent to privacy@costivra.com. The production policy will identify Costivra&apos;s legal entity, mailing address, and any legally required regional representative before commercial launch.</p> },
];

const termsSections = [
  { title: "Agreement", body: <p>These Terms govern access to Costivra&apos;s website and services. By creating an account or using the service, you represent that you can bind the organization you identify and that you agree to these Terms. Production Terms must be reviewed by counsel and updated with the final legal entity and commercial terms before launch.</p> },
  { title: "The service", body: <p>Costivra provides tools for organizing recurring-expense information, extracting document facts, detecting potential issues, managing approvals, preparing actions, and recording outcomes. Features may change as supported workflows are validated.</p> },
  { title: "Not professional advice", body: <p>Costivra does not provide legal, tax, accounting, insurance, regulatory, investment, or energy-brokerage advice. Model-generated explanations and contract observations may be incomplete. You are responsible for obtaining qualified professional advice when appropriate.</p> },
  { title: "Customer responsibility", body: <ul><li>Provide accurate account information and maintain authorized users.</li><li>Upload only records you have authority to use.</li><li>Review extracted facts, evidence, calculations, assumptions, recommendations, and actions.</li><li>Make final vendor, contract, payment, referral, and business decisions.</li><li>Protect credentials and promptly report suspected unauthorized access.</li></ul> },
  { title: "Approvals and actions", body: <p>Costivra may prepare drafts and bounded action plans. External communication, referrals, vendor changes, cancellations, and other consequential effects require the configured approval. You remain responsible for the approvals granted by your organization&apos;s users.</p> },
  { title: "Savings and fees", body: <p>Potential value is an estimate, not a guarantee. Verified savings require an approved baseline, method, evidence, and result. Subscription, performance, or referral fees will be governed by the applicable order form or written agreement. Costivra will not automatically debit a performance fee before the agreed verification process is complete.</p> },
  { title: "Acceptable use", body: <p>You may not use Costivra to violate law, rights, confidentiality, or contractual restrictions; upload malicious content; probe other tenants; bypass permissions; misrepresent consent; alter payment instructions without authorization; or use the service to cause harm.</p> },
  { title: "Confidentiality", body: <p>Each party will protect the other&apos;s confidential information using reasonable care and use it only to perform or receive the service, subject to customary exclusions and legally required disclosures.</p> },
  { title: "Disclaimers and liability", body: <p>The production agreement will define warranties, service levels, disclaimers, indemnities, liability limits, governing law, dispute terms, suspension, termination, export, and deletion. Until executed commercial terms are available, this frontend is a product demonstration and not an offer of production service.</p> },
  { title: "Contact", body: <p>Questions about these Terms may be sent to legal@costivra.com.</p> },
];

const disclosureSections = [
  { title: "The relationship", body: <p>Costivra has a business relationship with United Commercial Energy Partners, or UCEP. If you choose to request a UCEP review, Costivra or its affiliates may receive compensation or another business benefit. You are not required to use UCEP.</p> },
  { title: "Your choices", body: <ul><li>Export the Energy Review Package to your existing advisor.</li><li>Request a UCEP review after viewing this disclosure and providing explicit consent.</li><li>Assign another advisor selected by you.</li><li>Save the review without sharing it externally.</li></ul> },
  { title: "What Costivra does", body: <p>Costivra may parse energy invoices and agreements, normalize account and contract information, detect billing or deadline risks, identify missing data, calculate historical effective costs through deterministic code, and prepare an evidence package.</p> },
  { title: "What Costivra does not do", body: <p>Costivra does not claim to be an energy broker, automatically select a supplier, rank UCEP because of hidden compensation, guarantee savings, or send an energy lead to UCEP without consent.</p> },
  { title: "Information shared", body: <p>When you approve a referral, Costivra records the disclosure version, consent, actor, timestamp, destination, and exact data scope. Only the authorized documents and records for that review should be shared. Costivra and UCEP maintain separate identities, credentials, roles, and audit records.</p> },
  { title: "Questions", body: <p>Questions about the relationship or a specific referral may be sent to disclosures@costivra.com. The exact commercial disclosure must be reviewed by counsel before launch.</p> },
];
