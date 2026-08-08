"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  CircleAlert,
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
  RefreshCw,
  ScanSearch,
  School,
  ShieldCheck,
  ShieldAlert,
  Store,
  Upload,
  Users,
  Warehouse,
  Zap,
} from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { CostivraMark } from "@/components/brand";
import { createClient } from "@/lib/supabase/client";
import type { PublicSystemStatus } from "@/lib/status/public-status-types";

type PageSpec = {
  title: string;
  lede: string;
  blocks: { icon: typeof ShieldCheck; title: string; copy: string; href?: string; group?: string }[];
  kind?: "evidence" | "category" | "sequence" | "controls" | "rail" | "portfolio" | "manifesto" | "handoff" | "timeline" | "registry" | "consent";
  operating?: { eyebrow: string; title: string; copy: string; steps: { label: string; copy: string }[] };
  close?: { title: string; copy: string; action: string; href: string };
};

const specs: Record<string, PageSpec> = {
  product: {
    kind: "evidence",
    title: "Turn recurring cost data into decisions your team can defend.",
    lede: "Costivra connects bills, contracts, vendor accounts, approvals, and outcomes so finance and operations can see what changed, why it matters, and what to do next.",
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
    lede: "Costivra starts with the recurring costs most teams struggle to review consistently: software subscriptions, telecom and internet, and commercial energy accounts.",
    blocks: [
      { icon: FileCheck2, title: "Software subscriptions", copy: "Find duplicate tools, unused seats, gradual price changes, unapproved upgrades, and renewal dates before they become sunk cost.", href: "/solutions/software" },
      { icon: RadioTower, title: "Telecom & internet", copy: "Normalize services by location, detect inactive lines, compare recurring charges, and surface renewal or notice deadlines.", href: "/solutions/telecom" },
      { icon: Zap, title: "Commercial energy review", copy: "Organize invoices and agreements, flag accounts that warrant professional review, and let the customer choose the advisor.", href: "/solutions/energy" },
    ],
    operating: { eyebrow: "A focused starting point", title: "Three categories. The same standard of proof.", copy: "The categories differ, but the operating discipline is consistent: establish the source, show the calculation or rule, assign the owner, and distinguish a lead from a verified result.", steps: [{ label: "Recurring", copy: "Prioritize spend that repeats, changes quietly, or includes a deadline customers can miss." }, { label: "Explainable", copy: "Surface a case only when the supporting fields and limitations can be reviewed." }, { label: "Actionable", copy: "Route the next step to the person who can decide, approve, or bring in an expert." }] },
    close: { title: "Start with the bills already on your desk.", copy: "A focused scan is the fastest way to see whether Costivra can bring order to the category that is creating the most friction today.", action: "Scan three bills free", href: "/scan" },
  },
  "how-it-works": {
    kind: "sequence",
    title: "See how Costivra turns a bill into a better decision.",
    lede: "Upload a bill or contract. Costivra extracts the facts, shows the evidence, flags what needs attention, routes the decision to the right person, and records what the outcome proves.",
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
    title: "Protect the data behind every cost decision.",
    lede: "Bills and contracts reveal sensitive operational details. Costivra keeps customer data separated, documents private, permissions narrow, and consequential actions under explicit approval.",
    blocks: [
      { icon: Building2, title: "Tenant isolation", copy: "Organization boundaries are enforced at the database and service layers, with tests proving customers cannot cross those boundaries.", group: "Data boundary" },
      { icon: FileLock2, title: "Private documents", copy: "Original files stay in private storage and use short-lived signed access. Sensitive identifiers are masked when full display is unnecessary.", group: "Data boundary" },
      { icon: KeyRound, title: "Least privilege", copy: "Users, services, agents, and integrations receive narrow permissions for the organization, resource, and action they need.", group: "Access and authority" },
      { icon: ShieldCheck, title: "Human authorization", copy: "Consequential external actions require the configured approvals. Bank and payment instructions cannot be changed autonomously.", group: "Access and authority" },
      { icon: FileCheck2, title: "Complete provenance", copy: "Corrections preserve the original extraction, editor, timestamp, reason, and evidence reference.", group: "Evidence and accountability" },
      { icon: LockKeyhole, title: "Untrusted content defense", copy: "Instructions found inside documents, email, or OCR text are treated as data and cannot change policy or expand tool access.", group: "Evidence and accountability" },
    ],
    operating: { eyebrow: "Security in practice", title: "Sensitive documents do not get a shortcut around control.", copy: "The product is designed so access is scoped by organization and role, important changes are attributable, and a document cannot tell the system to do something outside approved policy.", steps: [{ label: "Access", copy: "Private files and customer data are available only through authorized, narrowly scoped paths." }, { label: "Authority", copy: "Permission to view a record is separate from permission to approve or perform an external action." }, { label: "Accountability", copy: "Material corrections, approvals, and sharing decisions retain actor, time, reason, and evidence." }] },
    close: { title: "Bring your security questions to the product, not a sales script.", copy: "Use the contact channel for a specific workflow or data-handling question. We will be clear about what exists today and what is still planned.", action: "Contact Costivra", href: "/contact" },
  },
  integrations: {
    kind: "rail",
    title: "Connect the systems that hold your recurring costs.",
    lede: "Start with private document upload, then connect the email, accounting, billing, or advisor systems that support a specific workflow. Each connection has a defined purpose and data boundary.",
    blocks: [
      { icon: Mail, title: "Microsoft 365 and Gmail", copy: "Use an approved forwarding rule today. Direct mailbox authorization remains a planned, separately consented connection." },
      { icon: Landmark, title: "QuickBooks and Xero", copy: "Reconcile vendor, bill, and payment records without turning accounting software into a model tool." },
      { icon: CircleDollarSign, title: "Stripe", copy: "Support subscriptions and approved performance-fee billing with a clear verification record." },
      { icon: Handshake, title: "Expert partners", copy: "Share only consented evidence packages with the advisor or specialist selected by the customer." },
    ],
    operating: { eyebrow: "Integration discipline", title: "Every connection needs a purpose and a boundary.", copy: "Costivra does not connect systems just to collect more data. An integration must support a specific workflow, carry the least necessary information, and be easy for the customer to understand and revoke.", steps: [{ label: "Scope", copy: "Define the workflow, records, organization, and user permissions before the connection is enabled." }, { label: "Review", copy: "Confirm what data will move, what it will be used for, and whether a private upload is the safer start." }, { label: "Control", copy: "Keep authorization, sharing, and downstream action separate from simple data access." }] },
    close: { title: "Start with the workflow—not the connector list.", copy: "Tell us where your bills and contracts live. We can recommend the smallest reliable intake path for your review.", action: "Discuss your workflow", href: "/contact" },
  },
  industries: {
    kind: "portfolio",
    title: "Cost control for businesses with multiple locations and vendors.",
    lede: "Costivra is built for finance and operations teams that need one clear view of recurring bills, contracts, owners, deadlines, and outcomes across a growing footprint.",
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
};

const solutionSpecs: Record<string, PageSpec> = {
  software: {
    kind: "timeline",
    title: "Turn subscription sprawl into a controlled renewal process.",
    lede: "Costivra brings invoices, renewal language, seat signals, price changes, owners, and approval history into one reviewable record—before a quiet renewal becomes next year’s problem.",
    blocks: [{ icon: ReceiptText, title: "Vendor-by-vendor cost records", copy: "Link invoices, contracts, plan details, renewal dates, and known owners without flattening the source evidence." }, { icon: Users, title: "Seat and ownership review", copy: "Surface the questions a finance lead needs answered: who owns this tool, who uses it, and who can approve a change." }, { icon: CalendarClock, title: "Renewal and notice discipline", copy: "Make notice windows visible early enough to compare options deliberately instead of accepting an automatic renewal by default. Separate known price or plan changes from unresolved variances so a higher bill is not mistaken for savings." }],
    operating: { eyebrow: "Software control", title: "Start with the recurring charge—then ask the operational question.", copy: "A subscription bill alone rarely tells the whole story. Costivra keeps the financial record tied to the renewal terms and accountable owner so a team can decide what to do next.", steps: [{ label: "Establish", copy: "Create a vendor record with source documents, current charge, term, and location or team context." }, { label: "Review", copy: "Flag price, renewal, duplicate-service, or ownership questions with evidence and explicit uncertainty." }, { label: "Act", copy: "Route only an approved request or vendor outreach, then keep the resulting change on the same record." }] },
    close: { title: "Begin with the subscriptions you renew every year.", copy: "A small set of invoices and agreements is enough to identify whether the renewal process is creating unnecessary exposure.", action: "Run a software scan", href: "/scan" },
  },
  telecom: {
    kind: "registry",
    title: "Make telecom spend legible across every site.",
    lede: "Internet, voice, wireless, and managed services accumulate line by line. Costivra organizes the service, location, account, contract, and invoice evidence needed to spot what merits review.",
    blocks: [{ icon: RadioTower, title: "Service-to-location mapping", copy: "Connect each line or circuit to the site, service type, account, and current bill rather than reviewing a carrier invoice in isolation." }, { icon: ReceiptText, title: "Recurring charge normalization", copy: "Break complex bills into comparable recurring charges, fees, and unresolved variances while retaining the original document. Give operations, IT, and finance a shared case record without assuming any one team has the entire answer." }, { icon: CalendarClock, title: "Contract and notice awareness", copy: "Surface term, renewal, and notice information before a location change or vendor conversation becomes time-sensitive." }],
    operating: { eyebrow: "Telecom review", title: "A line item is not a service inventory.", copy: "Costivra’s job is to create the bridge between carrier billing and the service actually being paid for at a real location.", steps: [{ label: "Map", copy: "Associate services, locations, account numbers, and source pages into a coherent record." }, { label: "Compare", copy: "Identify missing ownership, inactive-looking services, price changes, and deadlines that deserve confirmation." }, { label: "Resolve", copy: "Prepare a bounded question or action for the team or vendor, with approval before any external effect." }] },
    close: { title: "Bring order to a representative carrier bill.", copy: "Start with one carrier or one group of locations to establish the data model before expanding the review.", action: "Run a telecom scan", href: "/scan" },
  },
  energy: {
    kind: "consent",
    title: "Prepare an energy review with evidence, not pressure.",
    lede: "Costivra organizes energy invoices and agreements, surfaces missing context and deadline risk, and prepares a clear package for the advisor the customer chooses. It does not select a supplier or guarantee savings.",
    blocks: [{ icon: Zap, title: "Invoice and agreement intake", copy: "Bring account, meter, usage, charge, term, and contract evidence into a structured review without losing the original source." }, { icon: FileSearch, title: "Explainable review signals", copy: "Identify billing questions, contract timing, data gaps, and accounts that may merit professional review—along with the limits of the evidence." }, { icon: Handshake, title: "Customer-selected advisor path", copy: "Export the package, assign an existing advisor, or request a separately disclosed partner review only with explicit consent. Costivra does not autonomously select providers, submit enrollments, alter accounts, or route a lead based on undisclosed compensation." }],
    operating: { eyebrow: "Energy review", title: "Separate preparation from advice and consent from referral.", copy: "Energy decisions are consequential. Costivra’s role is to make the source material and questions clearer, then preserve customer choice about who gives specialized advice.", steps: [{ label: "Prepare", copy: "Structure invoices and agreement facts, identify gaps, and preserve the evidence package." }, { label: "Choose", copy: "The customer can retain the package, export it, assign their advisor, or explicitly request a disclosed referral." }, { label: "Record", copy: "Keep consent, disclosure version, sharing scope, and later outcome separate from the initial analysis." }] },
    close: { title: "Start with an evidence package, not a sales call.", copy: "Upload a small, authorized set of energy documents to see what can be organized and which questions remain unanswered.", action: "Start an energy review", href: "/scan" },
  },
  insurance: {
    kind: "controls",
    title: "Forensic audit for commercial property, liability, and employee benefits.",
    lede: "Costivra analyzes policy declarations, payroll classifications, experience modifications, SERFF state rate filings, and PBM spread economics to spot quiet premium creep and coverage gaps.",
    blocks: [
      { icon: ShieldCheck, title: "Property & liability rate audit", copy: "Audit rate per $100 TIV, coinsurance risk, schedule debits, and surplus lines tax calculations against filed SERFF baselines." },
      { icon: FileSearch, title: "Workers comp payroll class code audit", copy: "Verify clerical/sales payroll split rules, experience mod accuracy, and governing class codes before audit bill shocks." },
      { icon: Users, title: "Group health & PBM economics", copy: "Audit enrollment tier changes, terminated employee lag, stop-loss laser clauses, opaque pharmacy rebate spread, and broker fee disclosure or commission transparency." },
    ],
    operating: {
      eyebrow: "Insurance & benefits intelligence",
      title: "Rate filings and payroll rules define the truth.",
      copy: "Insurance costs cannot be evaluated by premium total alone. Costivra evaluates TIV, class codes, payroll basis, and state filings to ensure every dollar is earned and compliant.",
      steps: [
        { label: "Classify", copy: "Extract policy declarations, payroll splits, experience mods, and tier rosters." },
        { label: "Audit", copy: "Cross-reference state SERFF filings, NCCI rules, and contract endorsement language." },
        { label: "Optimize", copy: "Adjust deductibles, reclassify misassigned payroll, and negotiate terms backed by evidence." },
      ],
    },
    close: { title: "Audit your active commercial policies.", copy: "Upload policy declaration pages or renewal packets to run a forensic insurance audit.", action: "Start an insurance audit", href: "/scan" },
  },
  facilities: {
    kind: "registry",
    title: "Eliminate phantom fees in waste, janitorial, and HVAC services.",
    lede: "Facilities expenses drift line by line through unperformed waste hauls, inflated fuel surcharges, phantom uniform wearers, and unverified HVAC PM dispatches across sites.",
    blocks: [
      { icon: Warehouse, title: "Solid waste & recycling haul audit", copy: "Track container count, pickup frequency, franchise municipal rules, and fuel surcharge index compliance." },
      { icon: Building2, title: "Janitorial square-foot benchmarks", copy: "Compare cleanable area rates, day porter staffing, supply markups, and quality SLAs across portfolio sites." },
      { icon: FileCheck2, title: "Uniform, mat & maintenance audit", copy: "Detect phantom wearer lines, unreturned item loss fees, auto-quantity creep, energy fee stacking, and unverified HVAC maintenance work." },
    ],
    operating: {
      eyebrow: "Facilities cost intelligence",
      title: "Physical location data creates accountability.",
      copy: "Costivra maps every facilities contract and bill line item back to the exact physical building, square footage, and container count it serves.",
      steps: [
        { label: "Map", copy: "Link vendor invoices to physical site addresses, square footage, and container inventory." },
        { label: "Detect", copy: "Flag off-contract fee escalations, missing service credits, and unexpected maintenance spikes." },
        { label: "Enforce", copy: "Route verified dispute credits to vendor account managers prior to invoice approval." },
      ],
    },
    close: { title: "Review facilities spend across your locations.", copy: "Upload waste, janitorial, or maintenance invoices to identify recurring fee creep.", action: "Start a facilities scan", href: "/scan" },
  },
  merchant: {
    kind: "timeline",
    title: "Uncover hidden processor markups and card downgrade penalties.",
    lede: "Costivra analyzes merchant processing statements, interchange schedules, card-present vs e-commerce qualification, Regulation II caps, and gateway fees to protect margin.",
    blocks: [
      { icon: CircleDollarSign, title: "Interchange vs processor markup", copy: "Separate hard pass-through interchange rates from processor basis point markups and per-transaction fees." },
      { icon: ShieldAlert, title: "Transaction downgrade detection", copy: "Flag AVS, CVC, or non-qualified card downgrades that inflate effective processing rates." },
      { icon: FileCheck2, title: "Debit cap & fee verification", copy: "Verify that covered debit transactions receive federal statutory cap treatment, then identify PCI penalties, monthly minimums, and batch charges for negotiation or credit." },
    ],
    operating: {
      eyebrow: "Merchant processing intelligence",
      title: "Interchange schedules are public. Markups are negotiable.",
      copy: "Costivra reconciles transaction volumes, card tier mix, and interchange rates to show the exact processor margin charged on every batch.",
      steps: [
        { label: "Parse", copy: "Extract gross volume, refund count, card tier mix, interchange, and processor markup." },
        { label: "Reconcile", copy: "Verify interchange rates against official Visa/Mastercard schedules and Reg II caps." },
        { label: "Recover", copy: "Provide CFO evidence to renegotiate processor markups or eliminate non-qualified penalties." },
      ],
    },
    close: { title: "Audit your monthly merchant processing statement.", copy: "Upload your latest credit card processing statement for a complete interchange analysis.", action: "Audit processing statement", href: "/scan" },
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
  if (path.startsWith("solutions/") || path.startsWith("services/")) {
    const key = path.split("/")[1].replace("-monitoring", "");
    const solution = solutionSpecs[key];
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
  const close = spec.close ?? { title: "Start with a contained, evidence-backed review.", copy: "Choose one recurring-cost category and a small group of documents. You can evaluate the workflow before asking your team to change how it works.", action: "Scan three bills free", href: "/scan" };
  return <PageFrame><div className={`spec-page spec-page--${spec.kind ?? "category"}`}><Reveal><header className="content-hero"><h1>{spec.title}</h1><p>{spec.lede}</p><div className="hero-actions" style={{ marginTop: 30 }}><Link className="button button-primary" href="/scan">Scan three bills free <ArrowRight aria-hidden="true" size={17} /></Link><Link className="button button-secondary" href="/app">View customer workspace</Link></div></header></Reveal><Reveal><SignatureScene kind={spec.kind ?? "category"} /></Reveal><Reveal><div className="content-grid">{spec.blocks.map(({ icon: Icon, title, copy, href, group }, index) => {
    const card = <><div className="content-block-heading"><Icon aria-hidden="true" size={25} style={{ color: "var(--blue)" }} /><h2>{title}</h2>{href ? <ArrowUpRight className="content-block-link-arrow" aria-hidden="true" size={18} /> : null}</div><p>{copy}</p></>;
    const previousGroup = index > 0 ? spec.blocks[index - 1].group : undefined;
    const groupStart = spec.kind === "controls" && Boolean(group) && group !== previousGroup;
    const groupAttributes = groupStart ? { "data-control-group": group, "data-control-group-start": "true" } : {};
    return href ? <Link className="content-block content-block-link" href={href} key={title} {...groupAttributes}>{card}</Link> : <article className="content-block" key={title} {...groupAttributes}>{card}</article>;
  })}</div></Reveal><Reveal><section className="spec-operating"><div className="spec-operating-intro"><span className="eyebrow">{operating.eyebrow}</span><h2>{operating.title}</h2><p>{operating.copy}</p></div><ol className="spec-steps">{operating.steps.map((step, index) => <li key={step.label}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{step.label}</h3><p>{step.copy}</p></div></li>)}</ol></section></Reveal><Reveal><section className="spec-closure"><div><span className="eyebrow">A deliberate first step</span><h2>{close.title}</h2><p>{close.copy}</p></div><Link className="button button-primary" href={close.href}>{close.action} <ArrowRight aria-hidden="true" size={17} /></Link></section></Reveal></div></PageFrame>;
}

function PricingPage() {
  const plans = [["Starter", "$149", "One business", "Up to three active expense accounts", "Monthly monitoring", "Renewal reminders"], ["Growth", "$599", "Multiple locations", "Team and approval workflows", "Weekly monitoring", "Advanced reports"], ["Enterprise", "Custom", "SSO and custom roles", "Custom integrations", "Retention controls", "Dedicated support"]];
  return <PageFrame><header className="content-hero"><h1>Pricing for recurring cost control.</h1><p>Start with a focused scan, then choose the monitoring and workflow depth your organization needs. Performance and referral fees, when used, require separate clear terms.</p></header><div className="content-grid">{plans.map(([name, price, ...features]) => <article className="content-block" style={{ minHeight: 390 }} key={name}><span style={{ color: "var(--blue)", fontWeight: 800 }}>{name}</span><div style={{ margin: "22px 0", fontSize: "2.5rem", fontWeight: 750, letterSpacing: "-.05em" }}>{price}{price.startsWith("$") ? <small style={{ fontSize: ".9rem", fontWeight: 400 }}> / month</small> : null}</div>{features.map((feature) => <p key={feature} style={{ display: "flex", gap: 8 }}><Check aria-hidden="true" size={16} style={{ color: "var(--mint-dark)", flex: "0 0 auto", marginTop: 5 }} /> {feature}</p>)}<Link className={`button ${name === "Growth" ? "button-primary" : "button-secondary"}`} href={name === "Enterprise" ? "/contact" : "/scan"} style={{ marginTop: 15 }}>{name === "Enterprise" ? "Talk to us" : "Start with a scan"}</Link></article>)}</div><Reveal><section className="pricing-decision"><div><h2>Pricing should map to the responsibility you are taking on.</h2><p>Costivra is priced around the scope of recurring-cost control you need—not around a vague promise of savings.</p></div><div className="pricing-decision-rows"><div><span>Monitoring</span><strong>How many accounts and locations need a continuing review?</strong></div><div><span>Decision flow</span><strong>How many people need to see, assign, or approve the work?</strong></div><div><span>Assurance</span><strong>What reporting, retention, and support level does your organization require?</strong></div></div></section></Reveal><section className="spec-operating pricing-detail"><div className="spec-operating-intro"><span className="eyebrow">Before you buy</span><h2>A paid plan should have a defined job.</h2><p>Choose the smallest plan that supports the number of active accounts, people, locations, and approval paths you need to manage. Expand only when the workflow has proven useful.</p></div><ol className="spec-steps"><li><span>01</span><div><h3>Start contained</h3><p>Use the scan to determine whether the documents and category have enough signal to justify ongoing monitoring.</p></div></li><li><span>02</span><div><h3>Agree the method</h3><p>For any value-based arrangement, define the baseline, evidence, verification method, and applicable fee in writing.</p></div></li><li><span>03</span><div><h3>Keep your options</h3><p>You retain control of vendors, advisors, external sharing, and all consequential approvals regardless of plan.</p></div></li></ol></section><p className="muted" style={{ marginTop: 30, lineHeight: 1.6 }}>Pilot pricing is a product concept and may change before commercial launch. No performance fee is charged until a customer accepts the baseline, verification method, result, and applicable fee terms.</p></PageFrame>;
}

function ScanPage() {
  return <PageFrame><div className="detail-layout scan-layout"><header className="content-hero"><h1>Start with three bills.</h1><p>Create a secure workspace, then upload your current bills or contracts. Costivra will store them privately, extract reviewable facts, and keep every finding tied to source evidence.</p><div className="scan-assurances"><p className="scan-assurance"><Check aria-hidden="true" size={17} />Private, organization-scoped storage</p><p className="scan-assurance"><Check aria-hidden="true" size={17} />Duplicate detection and structured extraction</p><p className="scan-assurance"><Check aria-hidden="true" size={17} />No vendor contact without approval</p></div></header><section className="panel scan-panel"><div className="panel-header"><h2>Free Cost Leak Scan</h2><span className="eyebrow">Secure account required</span></div><div className="panel-body scan-panel-body"><ShieldCheck aria-hidden="true" size={34} style={{ color: "var(--blue)", marginBottom: 18 }}/><h2 style={{marginTop:0}}>Your source documents deserve a real security boundary.</h2><p className="muted" style={{lineHeight:1.65}}>Create your organization workspace first. After email confirmation, you can upload PDF, DOCX, or text records directly into private Supabase storage and see their extraction status.</p><Link className="button button-primary" href="/signup?next=/app/documents" style={{width:"100%",marginTop:18}}>Create a secure workspace <ArrowRight size={16}/></Link><Link className="button button-secondary" href="/login?next=/app/documents" style={{width:"100%",marginTop:10}}>I already have an account</Link></div></section></div></PageFrame>;
}

function AccountPage({ mode }: { mode: string }) {
  const signup = mode === "signup";
  const router = useRouter();
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [resetMode, setResetMode] = useState(
    searchParams?.get("mode") === "recovery",
  );
  const [messageTone, setMessageTone] = useState<"error" | "info" | "success">(
    searchParams?.get("confirmed") === "1" ? "success" : "error",
  );
  const [message, setMessage] = useState(
    searchParams?.get("confirmed") === "1"
      ? "Your email is confirmed. Sign in to continue."
      : searchParams?.get("error") === "no_access"
        ? "This account does not have an active Costivra workspace. Sign in with another account or contact support."
      : searchParams?.get("error") === "oauth_failed"
        ? "The sign-in provider could not complete authentication. Try again or use your work email."
      : "",
  );
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === "1";
  const microsoftEnabled = process.env.NEXT_PUBLIC_MICROSOFT_OAUTH_ENABLED === "1";
  const [oauthProvider, setOauthProvider] = useState<"google" | "azure" | null>(null);

  async function signInWithProvider(provider: "google" | "azure") {
    const enabled = provider === "google" ? googleEnabled : microsoftEnabled;
    if (!enabled || busy || oauthProvider) return;
    setOauthProvider(provider);
    setMessage("");
    setMessageTone("error");
    const next = searchParams?.get("next");
    const safeNext = next?.startsWith("/app") || next?.startsWith("/manage") ? next : null;
    const callback = new URL("/auth/callback", window.location.origin);
    if (safeNext) callback.searchParams.set("next", safeNext);
    const { error } = await createClient().auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callback.toString(),
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      setMessage(error.message);
      setOauthProvider(null);
    }
  }
  async function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); setMessageTone("error");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const client = createClient();
    if (resetMode) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://costivra.ai";
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/confirm-recovery`,
      });
      setMessageTone(error ? "error" : "info");
      setMessage(error ? error.message : "Reset link sent. Check your inbox for the newest Costivra email.");
      setBusy(false);
      return;
    }
    const result = signup
      ? await client.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/login?confirmed=1`, data: { full_name: String(form.get("fullName") ?? "").trim(), company_name: String(form.get("companyName") ?? "").trim() } } })
      : await client.auth.signInWithPassword({ email, password });
    if (result.error) { setMessage(result.error.message); setBusy(false); return; }
    if (signup && !result.data.session) { setMessageTone("info"); setMessage("Check your email to confirm your account, then sign in."); setBusy(false); return; }
    const next = searchParams?.get("next");
    const destination = next?.startsWith("/app") || next?.startsWith("/manage")
      ? `/access?next=${encodeURIComponent(next)}`
      : "/access";
    // A full navigation lets the browser send the newly written Supabase auth
    // cookie on the first protected workspace request. A client-side route
    // transition can otherwise race the cookie write and be sent back to login.
    window.location.assign(destination);
  }
  return <PageFrame><div className="account-page"><aside className="account-intro"><div className="account-intro-mark"><span className="account-brand-mark"><CostivraMark size={34} /></span><span>Costivra workspace</span></div><div><p className="eyebrow">A calmer way to control recurring cost</p><h1>{signup ? "Build your cost command center." : resetMode ? "Reset your password." : "Welcome back."}</h1><p>{signup ? "Start with a private workspace for bills, contracts, evidence, and decisions that need a clear owner." : resetMode ? "Enter your work email and we’ll send a secure link to choose a new password." : "Review evidence, approve bounded actions, and keep the next decision in view."}</p></div><div className="account-trust"><span><LockKeyhole aria-hidden="true" size={16} /> Private by organization</span><span><BadgeCheck aria-hidden="true" size={16} /> Evidence stays attached</span></div></aside><form className="account-card" onSubmit={submitAccount}><div className="account-card-heading"><span className="account-card-kicker">{signup ? "Create workspace" : resetMode ? "Password recovery" : "Sign in"}</span><h2>{signup ? "Start with a secure account." : resetMode ? "Get a fresh password link." : "Your workspace is ready."}</h2><p>{signup ? "Use your work email to create an organization-scoped workspace." : resetMode ? "Use the email attached to your Costivra account." : "Continue with the credentials associated with your Costivra workspace."}</p></div>{!resetMode && (googleEnabled || microsoftEnabled) && (
  <div className="account-provider-grid" aria-label="Sign-in providers">
    {googleEnabled && (
      <button className="account-provider" type="button" disabled={Boolean(oauthProvider)} onClick={() => void signInWithProvider("google")}>
        <span className="account-provider-icon"><GoogleLogo /></span>
        <span>{oauthProvider === "google" ? "Opening Google…" : "Continue with Google"}</span>
      </button>
    )}
    {microsoftEnabled && (
      <button className="account-provider" type="button" disabled={Boolean(oauthProvider)} onClick={() => void signInWithProvider("azure")}>
        <span className="account-provider-icon account-provider-icon--outlook"><MicrosoftLogo /></span>
        <span>{oauthProvider === "azure" ? "Opening Microsoft…" : "Continue with Microsoft"}</span>
      </button>
    )}
  </div>
)}
{!resetMode && (googleEnabled || microsoftEnabled) && <div className="account-divider"><span>or use email</span></div>}{signup && <div className="account-fields account-fields-double"><div className="field"><label htmlFor="full-name">Your name</label><input id="full-name" name="fullName" required autoComplete="name" /></div><div className="field"><label htmlFor="company-name">Company</label><input id="company-name" name="companyName" required autoComplete="organization" /></div></div>}<div className="account-fields"><div className="field"><label htmlFor="email">Work email</label><input id="email" name="email" required type="email" autoComplete="email" placeholder="you@company.com" /></div>{!resetMode && <div className="field"><div className="account-label-row"><label htmlFor="password">Password</label><button type="button" className="account-inline-link" onClick={() => { setResetMode(true); setMessage(""); router.replace("/login?mode=recovery"); }}>Forgot password?</button></div><input id="password" name="password" required type="password" minLength={10} autoComplete={signup ? "new-password" : "current-password"} /></div>}</div>{signup && <small className="account-hint">Use at least 10 characters.</small>}{message && <p role={messageTone === "error" ? "alert" : "status"} className={`account-message account-message--${messageTone}`}>{message}</p>}<button className="button button-primary account-submit" type="submit" disabled={busy || Boolean(oauthProvider)}>{busy ? "Working…" : resetMode ? "Email reset link" : signup ? "Create account" : "Sign in"}<ArrowRight aria-hidden="true" size={17} /></button><p className="account-switch">{resetMode ? <>Remember your password? <button type="button" className="account-inline-link" onClick={() => { setResetMode(false); setMessage(""); router.replace("/login"); }}>Back to sign in</button></> : signup ? <>Already have an account? <Link href="/login">Sign in</Link></> : <>New to Costivra? <Link href="/signup">Create an account</Link></>}</p></form></div></PageFrame>;
}

function GoogleLogo() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="17" height="17"><path fill="#4285F4" d="M21.35 12.27c0-.76-.07-1.49-.22-2.2H12v4.16h5.23a4.47 4.47 0 0 1-1.94 2.94v2.45h3.15c1.84-1.69 2.91-4.18 2.91-7.35Z"/><path fill="#34A853" d="M12 21.8c2.63 0 4.84-.87 6.45-2.37l-3.15-2.45c-.87.58-1.98.92-3.3.92-2.54 0-4.69-1.72-5.46-4.03H3.29v2.53A9.74 9.74 0 0 0 12 21.8Z"/><path fill="#FBBC05" d="M6.54 13.87A5.86 5.86 0 0 1 6.23 12c0-.65.11-1.28.31-1.87V7.6H3.29A9.8 9.8 0 0 0 2.25 12c0 1.58.38 3.08 1.04 4.4l3.25-2.53Z"/><path fill="#EA4335" d="M12 6.1c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.17 14.63 2.2 12 2.2a9.74 9.74 0 0 0-8.71 5.4l3.25 2.53C7.31 7.82 9.46 6.1 12 6.1Z"/></svg>;
}

function MicrosoftLogo() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="17" height="17"><path fill="#f25022" d="M2 2h9.5v9.5H2z"/><path fill="#7fba00" d="M12.5 2H22v9.5h-9.5z"/><path fill="#00a4ef" d="M2 12.5h9.5V22H2z"/><path fill="#ffb900" d="M12.5 12.5H22V22h-9.5z"/></svg>;
}

function IndustryPage({ title, lede }: { title: string; lede: string }) {
  const spec: PageSpec = { kind: "portfolio", title, lede, blocks: [{ icon: MapPin, title: "Location-level visibility", copy: "Connect every invoice, contract, account, meter, and service to the location it belongs to." }, { icon: CalendarClock, title: "Deadline protection", copy: "Surface renewal and notice windows while there is still time to make a deliberate decision." }, { icon: ReceiptText, title: "Comparable recurring spend", copy: "Normalize vendor-specific bills into a consistent financial record without losing the source evidence." }, { icon: Users, title: "Operational ownership", copy: "Assign findings and approvals to finance, operations, and location leaders with a complete history." }, { icon: CircleDollarSign, title: "Verified outcomes", copy: "Separate potential value from savings or recovery that future invoices actually prove." }, { icon: ShieldCheck, title: "Controlled action", copy: "Keep external communication, vendor decisions, and expert handoffs under explicit policy." }] };
  return <SpecPage spec={spec} />;
}

function ContactPage() {
  const [sent,setSent]=useState(false); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  async function submitContact(event:FormEvent<HTMLFormElement>){event.preventDefault();const formElement=event.currentTarget;setBusy(true);setError("");const form=new FormData(formElement);const response=await fetch("/api/contact",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(Object.fromEntries(form))});const payload=await response.json();setBusy(false);if(!response.ok){setError(payload.error);return}setSent(true);formElement.reset();}
  return <PageFrame><header className="content-hero"><h1>Bring us the cost you cannot explain.</h1><p>Tell us what you are reviewing, how many locations are involved, and where the source documents live. We will respond with a practical next step.</p></header><div className="detail-layout"><section className="panel"><div className="panel-header"><h2>Contact Costivra</h2></div><form className="panel-body" onSubmit={submitContact}><div className="form-grid"><Input label="Name" name="name" required/><Input label="Work email" name="email" type="email" required/><Input label="Company" name="company" required/><Input label="Locations" name="locations" /></div><div className="field" style={{ marginTop: 18 }}><label htmlFor="message">What recurring cost are you reviewing?</label><textarea id="message" name="message" required /></div><label className="marketing-consent-field"><input type="checkbox" name="marketingConsent"/><span><strong>Email me Costivra updates</strong><small>I agree to receive occasional Costivra product updates and marketing emails. I can unsubscribe at any time.</small></span></label>{(sent||error)&&<p role="status" className="account-message">{sent?"Your inquiry is saved. Check your email for confirmation.":error}</p>}<button className="button button-primary" disabled={busy} style={{ marginTop: 18 }}>{busy?"Sending…":"Send inquiry"} <ArrowRight aria-hidden="true" size={16} /></button></form></section><section className="panel"><div className="panel-header"><h2>Direct contacts</h2></div><div className="panel-body"><p><strong>General</strong><br /><a href="mailto:hello@costivra.ai" style={{ color: "var(--blue)" }}>hello@costivra.ai</a></p><p><strong>Privacy</strong><br /><a href="mailto:privacy@costivra.ai" style={{ color: "var(--blue)" }}>privacy@costivra.ai</a></p><p><strong>Security</strong><br /><a href="mailto:security@costivra.ai" style={{ color: "var(--blue)" }}>security@costivra.ai</a></p><p className="muted" style={{ marginTop: 30, lineHeight: 1.6 }}>Do not email sensitive bills or contracts. Use the secure workspace for source files.</p></div></section></div></PageFrame>;
}

function CaseStudies() { return <PageFrame><header className="content-hero"><h1>See how Costivra proves value.</h1><p>We are building case studies from real customer work, not invented savings claims. Each story will show the source, the finding, the approved action, and the evidence that supports the outcome.</p><div className="hero-actions" style={{ marginTop: 30 }}><Link className="button button-primary" href="/contact">Join the pilot conversation <ArrowRight aria-hidden="true" size={17} /></Link><Link className="button button-secondary" href="/how-it-works">See how the process works</Link></div></header><section className="panel"><div className="panel-header"><h2>What every Costivra case study will show</h2><span className="eyebrow">No fabricated claims</span></div><div className="content-grid" style={{ borderTop: 0 }}>{[{ icon: FileSearch, title: "Source", copy: "The original invoice, agreement, or account record supporting the finding." }, { icon: ScanSearch, title: "Finding", copy: "The rule, assumptions, confidence, and reason the opportunity warranted review." }, { icon: Users, title: "Decision", copy: "Who approved the action, what was authorized, and what remained out of scope." }, { icon: CircleDollarSign, title: "Outcome", copy: "The future invoice, credit, or other source that proved one-time or recurring value." }].map(({ icon: Icon, title, copy }) => <div className="content-block" key={title}><div className="content-block-heading"><Icon aria-hidden="true" size={24} style={{ color: "var(--blue)" }} /><h2>{title}</h2></div><p>{copy}</p></div>)}</div></section></PageFrame>; }

function HelpPage() { const guides = [{ title: "Uploading bills and contracts", copy: "Use an authorized PDF, PNG, or JPG. Start with the current invoice and agreement when one exists; do not send sensitive files through ordinary email." }, { title: "Reviewing extracted fields", copy: "Open the source alongside the extracted record. Correct a field when it is wrong or incomplete—the correction should retain the reason and source reference." }, { title: "Understanding confidence", copy: "Confidence shows how certain the system is about a field, not whether a business decision is correct. Low-confidence records need review before they influence an action." }, { title: "Approving an action", copy: "Read the requested scope, the supporting evidence, and the external effect. Approve only the specific step you want taken; you can leave a case pending or decline it." }, { title: "Exporting an energy review", copy: "Use the package to inform the advisor you select. Referral sharing requires a separate disclosure and explicit consent; Costivra does not choose a supplier for you." }, { title: "Verifying savings", copy: "Potential value becomes verified only after an agreed baseline and later source evidence—such as a future bill or credit—support the result." }]; return <PageFrame><header className="content-hero"><h1>Help for the decision in front of you.</h1><p>Understand uploads, evidence, confidence, approvals, referrals, and savings verification without learning AI terminology first.</p></header><div className="content-grid">{guides.map(({ title, copy }, index) => <div className="content-block" key={title}><span className="step-number" style={{ position: "static" }}>{index + 1}</span><h2>{title}</h2><p>{copy}</p></div>)}</div><section className="spec-closure"><div><span className="eyebrow">Need a specific answer?</span><h2>Tell us which decision is blocked.</h2><p>Include the category, the document or account involved, and what you are trying to determine. We will point you to the right product path or explain the current limitation.</p></div><Link className="button button-primary" href="/contact">Contact support <ArrowRight aria-hidden="true" size={17} /></Link></section></PageFrame>; }

function StatusPage() {
  const [systemStatus, setSystemStatus] = useState<PublicSystemStatus | null>(null);
  const [statusError, setStatusError] = useState("");
  const [refreshing, setRefreshing] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    fetch("/api/status", { signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as PublicSystemStatus & { error?: string };
        if (!response.ok) throw new Error(payload.error || "Live status could not be loaded.");
        return payload;
      })
      .then((payload) => {
        if (current) setSystemStatus(payload);
      })
      .catch((error: unknown) => {
        if (current && !(error instanceof DOMException && error.name === "AbortError")) {
          setStatusError(error instanceof Error ? error.message : "Live status could not be loaded.");
        }
      })
      .finally(() => {
        if (current) setRefreshing(false);
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [refreshToken]);

  const overall = systemStatus?.overall ?? "limited";
  const OverallIcon = overall === "operational" ? CheckCircle2 : overall === "limited" ? ShieldAlert : CircleAlert;
  return (
    <PageFrame>
      <header className="content-hero public-status-hero">
        <p className="eyebrow">Live production view</p>
        <h1>System status.</h1>
        <p>Current availability for the Costivra website, customer workspace, document intake, and document intelligence.</p>
      </header>
      <section className="public-status-shell" aria-labelledby="public-status-title" aria-busy={refreshing}>
        <header className={`public-status-summary public-status-summary--${overall}`}>
          <span className="public-status-summary-icon"><OverallIcon aria-hidden="true" size={22} /></span>
          <div>
            <span>Current status</span>
            <h2 id="public-status-title">
              {systemStatus?.headline || (statusError ? "Live status is temporarily unavailable." : "Checking production systems…")}
            </h2>
            <p>
              {systemStatus
                ? `Last checked ${new Date(systemStatus.checkedAt).toLocaleString()}`
                : statusError || "This normally takes only a few seconds."}
            </p>
          </div>
          <button
            type="button"
            className="button button-secondary public-status-refresh"
            disabled={refreshing}
            onClick={() => {
              setRefreshing(true);
              setStatusError("");
              setRefreshToken((value) => value + 1);
            }}
          >
            <RefreshCw className={refreshing ? "is-spinning" : undefined} aria-hidden="true" size={15} />
            {refreshing ? "Checking…" : "Refresh"}
          </button>
        </header>
        <div className="public-status-services" aria-live="polite">
          {systemStatus ? systemStatus.services.map((service) => {
            const ServiceIcon = service.state === "operational" ? CheckCircle2 : service.state === "limited" ? ShieldAlert : CircleAlert;
            return (
              <article className={`public-status-service public-status-service--${service.state}`} key={service.id}>
                <span className="public-status-service-icon"><ServiceIcon aria-hidden="true" size={17} /></span>
                <div>
                  <h3>{service.name}</h3>
                  <p>{service.message}</p>
                </div>
                <strong>{service.state === "operational" ? "Operational" : service.state === "limited" ? "Limited" : "Unavailable"}</strong>
              </article>
            );
          }) : ["Public website", "Customer workspace", "Document intake", "Document intelligence"].map((name) => (
            <article className="public-status-service public-status-service--checking" key={name}>
              <span className="public-status-service-icon"><RefreshCw aria-hidden="true" size={17} /></span>
              <div><h3>{name}</h3><p>{statusError ? "Status unavailable." : "Checking…"}</p></div>
              <strong>{statusError ? "Unknown" : "Checking"}</strong>
            </article>
          ))}
        </div>
        <footer className="public-status-footnote">
          This page reports customer-facing availability without exposing customer data, internal queues, or provider credentials. For a suspected security issue, contact <a href="mailto:security@costivra.ai">security@costivra.ai</a>.
        </footer>
      </section>
    </PageFrame>
  );
}

function PrivacyPage() { return <LegalPage title="Privacy Policy" lede="How Costivra handles the business documents, account information, and choices you entrust to the service." meta="Effective July 30, 2026 · Product-launch draft" sections={privacySections} />; }
function TermsPage() { return <LegalPage title="Terms of Service" lede="What Costivra provides, what customers remain responsible for, and how approvals and outcomes are handled." meta="Effective July 30, 2026 · Product-launch draft" sections={termsSections} />; }
function DisclosurePage() { return <LegalPage title="UCEP Relationship Disclosure" lede="How the optional UCEP energy-review relationship works, what may be shared, and what choices remain yours." meta="Effective July 30, 2026 · Review by counsel required before commercial launch" sections={disclosureSections} />; }

function LegalPage({ title, lede, meta, sections }: { title: string; lede: string; meta: string; sections: { title: string; body: React.ReactNode }[] }) {
  return <PageFrame><header className="content-hero"><h1>{title}</h1><p>{lede}</p></header><div className="article"><aside>{sections.map((section) => <a href={`#${section.title.toLowerCase().replaceAll(" ", "-")}`} key={section.title}>{section.title}</a>)}</aside><article className="prose"><div className="legal-meta">{meta}</div>{sections.map((section) => <section id={section.title.toLowerCase().replaceAll(" ", "-")} key={section.title}><h2>{section.title}</h2>{section.body}</section>)}</article></div></PageFrame>;
}

function Input({ label, name, type = "text", required = false }: { label: string; name?: string; type?: string; required?: boolean }) { const id = name ?? label.toLowerCase().replaceAll(" ", "-"); return <div className="field"><label htmlFor={id}>{label}</label><input id={id} name={name} type={type} required={required} /></div>; }
function NotFoundPage() { return <PageFrame><header className="content-hero"><h1>That page is not in the evidence file.</h1><p>The link may have moved. Return to the homepage or open your customer workspace.</p><div className="hero-actions" style={{ marginTop: 30 }}><Link className="button button-primary" href="/">Return home</Link><Link className="button button-secondary" href="/app">Open workspace</Link></div></header></PageFrame>; }

const privacySections = [
  { title: "Overview", body: <><p>This Privacy Policy explains how Costivra may collect, use, store, and share information when you use our websites, document-intake experiences, and cost-intelligence services. The production policy must be updated to match the final company entity, vendors, data locations, and legal obligations before launch.</p><p>Costivra is designed to minimize data use, keep customer documents private, and preserve customer choice over external sharing.</p></> },
  { title: "Information we collect", body: <><p>We may collect account and organization information; contact details; location, vendor, expense, invoice, contract, and approval records; files you choose to upload; integration data you authorize; product usage and security logs; support communications; and billing information handled through payment providers.</p><p>Documents may contain account identifiers, prices, usage, employee or contact names, service addresses, contract terms, and other business information. You should upload only information you are authorized to provide.</p></> },
  { title: "How we use information", body: <ul><li>Provide document intake, extraction, normalization, evidence, monitoring, opportunity, approval, reporting, and verification features.</li><li>Authenticate users, enforce permissions, prevent abuse, and protect the service.</li><li>Respond to support and product requests.</li><li>Improve supported workflows using properly governed, de-identified, or consented data.</li><li>Meet legal obligations and enforce our agreements.</li></ul> },
  { title: "AI processing", body: <><p>Costivra may use model providers to interpret unstructured information. Production model requests should use contractual privacy controls appropriate to business data. Models do not independently authorize external actions or serve as the sole authority for financial calculations.</p><p>Instructions found inside documents are treated as untrusted data and cannot change Costivra policy.</p></> },
  { title: "How we share information", body: <><p>We may share limited information with service providers that host, secure, process, support, or bill for the service; with professional advisers; when required by law; or during a properly governed business transaction.</p><p>We do not sell identifiable customer documents. We do not send an energy review to UCEP or another advisor without purpose-specific customer consent. When authorized, we share only the records within that approved scope.</p></> },
  { title: "Storage and retention", body: <p>Production documents should be stored privately with access controls, encryption, and short-lived signed access. Retention periods will be documented by data type and customer plan. We may retain security, audit, consent, and transaction records as needed for legitimate business or legal purposes.</p> },
  { title: "Your choices", body: <p>Depending on your location and relationship with Costivra, you may request access, correction, export, or deletion of personal information; manage integration access; change optional benchmark participation; and revoke future referral sharing. Revocation does not undo sharing already completed under valid prior consent.</p> },
  { title: "Security", body: <p>No service can guarantee absolute security. Costivra&apos;s intended controls include tenant isolation, least privilege, private storage, signed access, strong authentication, audit logs, rate limits, validation, monitoring, and incident procedures. Report suspected issues to security@costivra.ai.</p> },
  { title: "Contact", body: <p>Questions or requests may be sent to privacy@costivra.ai. The production policy will identify Costivra&apos;s legal entity, mailing address, and any legally required regional representative before commercial launch.</p> },
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
  { title: "Contact", body: <p>Questions about these Terms may be sent to legal@costivra.ai.</p> },
];

const disclosureSections = [
  { title: "The relationship", body: <p>Costivra has a business relationship with United Commercial Energy Partners, or UCEP. If you choose to request a UCEP review, Costivra or its affiliates may receive compensation or another business benefit. You are not required to use UCEP.</p> },
  { title: "Your choices", body: <ul><li>Export the Energy Review Package to your existing advisor.</li><li>Request a UCEP review after viewing this disclosure and providing explicit consent.</li><li>Assign another advisor selected by you.</li><li>Save the review without sharing it externally.</li></ul> },
  { title: "What Costivra does", body: <p>Costivra may parse energy invoices and agreements, normalize account and contract information, detect billing or deadline risks, identify missing data, calculate historical effective costs through deterministic code, and prepare an evidence package.</p> },
  { title: "What Costivra does not do", body: <p>Costivra does not claim to be an energy broker, automatically select a supplier, rank UCEP because of hidden compensation, guarantee savings, or send an energy lead to UCEP without consent.</p> },
  { title: "Information shared", body: <p>When you approve a referral, Costivra records the disclosure version, consent, actor, timestamp, destination, and exact data scope. Only the authorized documents and records for that review should be shared. Costivra and UCEP maintain separate identities, credentials, roles, and audit records.</p> },
  { title: "Questions", body: <p>Questions about the relationship or a specific referral may be sent to disclosures@costivra.ai. The exact commercial disclosure must be reviewed by counsel before launch.</p> },
];
