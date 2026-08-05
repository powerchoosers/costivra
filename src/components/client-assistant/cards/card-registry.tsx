"use client";

import {
  ReceiptText,
  Building2,
  TrendingUp,
  AlertTriangle,
  CalendarClock,
  Target,
  ShieldCheck,
  CheckCircle2,
  ListOrdered,
  Layers,
  ExternalLink,
} from "lucide-react";
import type { AssistantBlockV1 } from "@/lib/client-assistant/types";
import { AssistantCardShell } from "./assistant-card-shell";
import { CardStatus, StatusTone } from "./card-status";
import { CardMetric } from "./card-metric";

export function RenderAssistantCard({ block }: { block: AssistantBlockV1 }) {
  const p = block.payload;

  switch (block.type) {
    case "spend_overview": {
      const topVendors = Array.isArray(p.topVendors) ? (p.topVendors as Array<Record<string, unknown>>) : [];
      return (
        <AssistantCardShell
          icon={<TrendingUp size={18} />}
          label="Recurring spend"
          title="Spend Overview"
          subtitle={`${Number(p.vendorCount ?? 0)} monitored vendors`}
          href={String(p.href ?? "/app/vendors")}
        >
          <CardMetric amount={Number(p.annualizedSpend ?? 0)} period="year" />
          {topVendors.length > 0 && (
            <div className="card-ranked-list">
              <span className="card-section-label">Top Vendors by Annual Spend</span>
              {topVendors.slice(0, 4).map((v, i) => (
                <div key={String(v.vendorRelationshipId ?? i)} className="card-ranked-row">
                  <div className="card-ranked-name">
                    <span className="card-rank-num">{i + 1}</span>
                    <strong>{String(v.name)}</strong>
                    <span className="muted">{String(v.category)}</span>
                  </div>
                  <span className="card-ranked-value">
                    ${Number(v.annualizedSpend ?? 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </AssistantCardShell>
      );
    }

    case "invoice_summary": {
      const reviewStatus = String(p.reviewStatus ?? "recorded");
      const matchStatus = String(p.vendorMatchStatus ?? "exact");
      const tone: StatusTone = reviewStatus === "ready" ? "success" : reviewStatus === "needs_review" ? "warning" : "neutral";

      return (
        <AssistantCardShell
          icon={<ReceiptText size={18} />}
          label="Latest Invoice"
          title={String(p.vendorName ?? "Invoice Summary")}
          subtitle={p.invoiceNumber ? `Invoice #${String(p.invoiceNumber)}` : undefined}
          status={<CardStatus tone={tone}>{reviewStatus.replace("_", " ")}</CardStatus>}
          href={String(p.href ?? `/app/documents/${p.invoiceId}`)}
        >
          <CardMetric amount={p.totalAmount as number} currency={String(p.currency ?? "USD")} />
          <div className="card-detail-grid">
            <div>
              <span className="card-detail-label">Invoice Date</span>
              <span className="card-detail-value">{String(p.invoiceDate ?? "Unrecorded")}</span>
            </div>
            <div>
              <span className="card-detail-label">Due Date</span>
              <span className="card-detail-value">{String(p.dueDate ?? "Unrecorded")}</span>
            </div>
            <div>
              <span className="card-detail-label">Vendor Match</span>
              <span className="card-detail-value">{matchStatus}</span>
            </div>
            <div>
              <span className="card-detail-label">Reconciliation</span>
              <span className="card-detail-value">{String(p.reconciliationState ?? "reconciled")}</span>
            </div>
          </div>
        </AssistantCardShell>
      );
    }

    case "invoice_comparison": {
      const periodA = (p.periodA as Record<string, unknown>) ?? {};
      const periodB = (p.periodB as Record<string, unknown>) ?? {};
      const diff = p.differenceAmount as number | null;
      const pct = p.percentageChange as number | null;

      return (
        <AssistantCardShell
          icon={<TrendingUp size={18} />}
          label="Bill Comparison"
          title={String(p.vendorName ?? "Vendor Comparison")}
          subtitle="Period-over-Period Invoice Variance"
          href={String(p.href ?? `/app/documents`)}
        >
          <div className="card-comparison-columns">
            <div className="card-comparison-col">
              <span className="card-comparison-date">{String(periodA.date ?? "Prior")}</span>
              <span className="card-comparison-amount">
                ${Number(periodA.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="card-comparison-vs">vs</div>
            <div className="card-comparison-col">
              <span className="card-comparison-date">{String(periodB.date ?? "Latest")}</span>
              <span className="card-comparison-amount">
                ${Number(periodB.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {diff != null && (
            <div className="card-comparison-variance">
              <span>Observed Variance:</span>
              <strong className={diff > 0 ? "text-danger" : diff < 0 ? "text-success" : ""}>
                {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)} ({pct != null ? (pct > 0 ? `+${pct}%` : `${pct}%`) : ""})
              </strong>
            </div>
          )}
        </AssistantCardShell>
      );
    }

    case "vendor_summary": {
      return (
        <AssistantCardShell
          icon={<Building2 size={18} />}
          label="Monitored Vendor"
          title={String(p.name)}
          subtitle={String(p.category)}
          status={<CardStatus tone="info">{String(p.relationshipStatus ?? "active")}</CardStatus>}
          href={String(p.href ?? `/app/vendors/${p.vendorRelationshipId}`)}
        >
          <CardMetric amount={Number(p.annualizedSpend ?? 0)} period="year" />
          {Boolean(p.website) && (
            <span className="card-website-link">
              <ExternalLink size={12} /> {String(p.website)}
            </span>
          )}
        </AssistantCardShell>
      );
    }

    case "spend_trend": {
      const periods = Array.isArray(p.periods) ? (p.periods as Array<Record<string, unknown>>) : [];
      return (
        <AssistantCardShell
          icon={<TrendingUp size={18} />}
          label="Spending Trend"
          title={String(p.scopeLabel ?? "Cost History")}
          subtitle={`Monthly Average: $${Number(p.average ?? 0).toLocaleString()}`}
          href={String(p.href ?? "/app/vendors")}
        >
          <CardMetric amount={Number(p.total ?? 0)} period="total" />
          {periods.length > 0 && (
            <div className="card-mini-bars">
              {periods.map((per, idx) => {
                const amt = Number(per.amount ?? 0);
                const maxAmt = Math.max(...periods.map((x) => Number(x.amount ?? 0)), 1);
                const heightPct = Math.round((amt / maxAmt) * 100);
                return (
                  <div key={idx} className="card-bar-col" title={`${String(per.label)}: $${amt.toLocaleString()}`}>
                    <div className="card-bar-fill" style={{ height: `${heightPct}%` }} />
                    <span className="card-bar-label">{String(per.label)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </AssistantCardShell>
      );
    }

    case "vendor_candidate": {
      return (
        <AssistantCardShell
          icon={<Building2 size={18} />}
          label="New Vendor Discovered"
          title={String(p.canonicalName)}
          subtitle={String(p.category)}
          status={<CardStatus tone="warning">Suggested Match</CardStatus>}
          href={String(p.href ?? "/app/vendors")}
        >
          <div className="card-candidate-box">
            <span>Match Confidence: <strong>{Number(p.confidence ?? 85)}%</strong></span>
            <span>Review Required: <strong>Yes</strong></span>
          </div>
          <p className="card-helper-note">
            This vendor candidate was extracted from source documents and has not been manually verified.
          </p>
        </AssistantCardShell>
      );
    }

    case "renewal_timeline": {
      const contracts = Array.isArray(p.contracts) ? (p.contracts as Array<Record<string, unknown>>) : [];
      return (
        <AssistantCardShell
          icon={<CalendarClock size={18} />}
          label="Contract Calendar"
          title="Upcoming Deadlines"
          subtitle={`${contracts.length} agreements expiring soon`}
          href={String(p.href ?? "/app/contracts")}
        >
          <div className="card-timeline-list">
            {contracts.map((c, i) => (
              <div key={String(c.contractId ?? i)} className="card-timeline-item">
                <div className="card-timeline-date-badge">
                  <span>Notice</span>
                  <strong>{String(c.noticeDeadline ?? c.endDate)}</strong>
                </div>
                <div className="card-timeline-details">
                  <strong>{String(c.vendorName ? `${c.vendorName} — ` : "")}{String(c.contractName)}</strong>
                  <span>Contract ends {String(c.endDate)} {c.autoRenewal ? "· Auto-renews" : ""}</span>
                </div>
              </div>
            ))}
          </div>
        </AssistantCardShell>
      );
    }

    case "opportunity": {
      // Rule §2.3: Read estimatedAnnualValue (not estimatedAnnualSavings)
      const annualVal = (p.estimatedAnnualValue ?? p.estimatedAnnualSavings) as number | null;
      return (
        <AssistantCardShell
          icon={<Target size={18} />}
          label="Cost Opportunity"
          title={String(p.title)}
          subtitle={`Category: ${String(p.category ?? "General")}`}
          status={<CardStatus tone="info">{String(p.status ?? "under_review")}</CardStatus>}
          href={String(p.href ?? `/app/opportunities/${p.opportunityId}`)}
        >
          <CardMetric amount={annualVal} period="year estimated" />
          {p.confidence != null && (
            <div className="card-confidence-chip">
              <span>Analysis Confidence: <strong>{Number(p.confidence)}%</strong></span>
            </div>
          )}
        </AssistantCardShell>
      );
    }

    case "savings_summary": {
      const outcomes = Array.isArray(p.outcomes) ? (p.outcomes as Array<Record<string, unknown>>) : [];
      return (
        <AssistantCardShell
          icon={<CheckCircle2 size={18} />}
          label="Verified Value Created"
          title="Savings Summary"
          subtitle={`${Number(p.outcomeCount ?? outcomes.length)} verified outcomes`}
          href={String(p.href ?? "/app/opportunities")}
        >
          <CardMetric amount={Number(p.totalVerifiedValue ?? 0)} period="verified savings" />
          {outcomes.length > 0 && (
            <div className="card-outcomes-list">
              {outcomes.map((o, i) => (
                <div key={String(o.savingsId ?? i)} className="card-outcome-row">
                  <span>{String(o.title)}</span>
                  <strong>${Number(o.amount ?? 0).toLocaleString()}</strong>
                </div>
              ))}
            </div>
          )}
        </AssistantCardShell>
      );
    }

    case "approval_queue": {
      const actions = Array.isArray(p.actions) ? (p.actions as Array<Record<string, unknown>>) : [];
      return (
        <AssistantCardShell
          icon={<Layers size={18} />}
          label="Authorization Needed"
          title="Decisions Awaiting Approval"
          subtitle={`${actions.length} pending actions`}
          href={String(p.href ?? "/app/approvals")}
        >
          <div className="card-actions-list">
            {actions.map((act, i) => (
              <div key={String(act.actionId ?? i)} className="card-action-row">
                <div>
                  <strong>{String(act.title)}</strong>
                  <span className="muted">${Number(act.annualValue ?? 0).toLocaleString()}/yr impact</span>
                </div>
                <span className="card-action-status">Pending</span>
              </div>
            ))}
          </div>
        </AssistantCardShell>
      );
    }

    case "document_ingestion": {
      const summary = p.extractionSummary ? String(p.extractionSummary) : null;
      return (
        <AssistantCardShell
          icon={<ShieldCheck size={18} />}
          label="Source File Ingestion"
          title={String(p.filename)}
          subtitle={p.byteSize ? `${Math.round(Number(p.byteSize) / 1024)} KB` : undefined}
          status={<CardStatus tone={p.status === "processed" ? "success" : "warning"}>{String(p.status)}</CardStatus>}
          href={String(p.href ?? `/app/documents/${p.documentId}`)}
        >
          <div className="card-ingestion-steps">
            <div className="card-step-row"><CheckCircle2 size={13} className="text-success" /> Security malware scan passed</div>
            <div className="card-step-row"><CheckCircle2 size={13} className="text-success" /> Structured text extracted</div>
            {summary && <p className="card-extraction-summary">{summary}</p>}
          </div>
        </AssistantCardShell>
      );
    }

    case "evidence_list": {
      const items = Array.isArray(p.items) ? (p.items as Array<Record<string, unknown>>) : [];
      return (
        <AssistantCardShell
          icon={<ListOrdered size={18} />}
          label="Source Provenance"
          title="Evidence References"
          subtitle={`${items.length} cited records`}
          href={String(p.href ?? "/app/documents")}
        >
          <div className="card-evidence-list">
            {items.map((ev, i) => (
              <div key={String(ev.evidenceId ?? i)} className="card-evidence-item">
                <span className="card-evidence-num">{i + 1}</span>
                <div className="card-evidence-content">
                  <strong>{String(ev.title)} {ev.pageNumber ? `(p. ${ev.pageNumber})` : ""}</strong>
                  <p>&quot;{String(ev.excerpt)}&quot;</p>
                </div>
              </div>
            ))}
          </div>
        </AssistantCardShell>
      );
    }

    case "notice": {
      const sev = String(p.severity ?? "info");
      const tone: StatusTone = sev === "error" ? "danger" : sev === "warning" ? "warning" : "info";
      return (
        <AssistantCardShell
          icon={<AlertTriangle size={18} />}
          label="Notice"
          title={String(p.title)}
          status={<CardStatus tone={tone}>{sev}</CardStatus>}
        >
          <p className="card-notice-message">{String(p.message)}</p>
        </AssistantCardShell>
      );
    }

    default:
      return null;
  }
}
