"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert } from "@/lib/icons";

type Metrics = {
  pilotTenants: number;
  inboundAttention: number;
  quarantined: number;
  extractionFailures: number;
  stalledDocuments: number;
  reportFailures: number;
  emailProblems: number;
  monitoringUpcoming: number;
  monitoringMissed: number;
  recoveryActions: number;
};
type Readiness = { overall: "ready" | "warning" | "blocked"; services: Array<{ id: string; name: string; status: "ready" | "warning" | "blocked" }> };
type CriticalError = { worker: string; status: string; errorCode: string; occurredAt: string };

const cards: Array<{ key: keyof Metrics; label: string; href: string; detail: string }> = [
  { key: "inboundAttention", label: "Intake attention", href: "/manage/intake", detail: "queued, retrying, or dead-lettered" },
  { key: "quarantined", label: "Quarantined files", href: "/manage/intake", detail: "held for scanner review" },
  { key: "extractionFailures", label: "Extraction failures", href: "/manage/intake", detail: "records needing recovery" },
  { key: "stalledDocuments", label: "Stalled documents", href: "/manage/intake", detail: "processing beyond 15 minutes" },
  { key: "reportFailures", label: "Report failures", href: "/manage/activity", detail: "failed, bounced, or suppressed" },
  { key: "emailProblems", label: "Email problems", href: "/manage/mail", detail: "provider failures or complaints" },
  { key: "monitoringUpcoming", label: "Bills due soon", href: "/manage/accounts", detail: "active monitoring in seven days" },
  { key: "monitoringMissed", label: "Missed bills", href: "/manage/accounts", detail: "active monitoring past due" },
  { key: "recoveryActions", label: "Open recovery", href: "/manage/activity", detail: "claimed or failed side effects" },
];

export function ManagePilotOperations() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [criticalErrors, setCriticalErrors] = useState<CriticalError[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/manage/pilot-operations", { cache: "no-store" });
      const payload = await response.json() as { metrics?: Metrics; readiness?: Readiness; checkedAt?: string; recentCriticalErrors?: CriticalError[]; error?: string };
      if (!response.ok || !payload.metrics || !payload.readiness) throw new Error(payload.error || "The operations snapshot could not be loaded.");
      setMetrics(payload.metrics);
      setReadiness(payload.readiness);
      setCheckedAt(payload.checkedAt ?? null);
      setCriticalErrors(payload.recentCriticalErrors ?? []);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "The operations snapshot could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const attention = metrics ? cards.reduce((total, card) => total + metrics[card.key], 0) : 0;
  return <>
    <header className="manage-page-heading">
      <div>
        <p className="manage-eyebrow">Pilot control</p>
        <h1>Operations snapshot</h1>
        <p>Aggregate recovery signals for the service pilot. Open the linked Manage view before taking action.</p>
      </div>
      <button type="button" className="manage-button manage-button--quiet" onClick={() => void load()} disabled={loading}>
        <RefreshCw className={loading ? "is-spinning" : undefined} size={15} /> {loading ? "Checking…" : "Refresh snapshot"}
      </button>
    </header>
    {error ? <section className="manage-panel" role="alert"><AlertTriangle size={18} /> <strong>{error}</strong><p>Retry the snapshot or open Production readiness in Settings.</p></section> : <>
      <section className="manage-summary" aria-label="Pilot operations summary">
        <div className="manage-summary-card"><div className="manage-summary-meta"><small>PILOT TENANTS</small><ShieldAlert size={16} /></div><div className="manage-summary-value"><strong>{loading ? "—" : metrics?.pilotTenants ?? 0}</strong><span>organizations in scope</span></div></div>
        <div className="manage-summary-card"><div className="manage-summary-meta"><small>OPEN SIGNALS</small><AlertTriangle size={16} /></div><div className="manage-summary-value"><strong>{loading ? "—" : attention}</strong><span>items across recovery paths</span></div></div>
        <div className="manage-summary-card"><div className="manage-summary-meta"><small>SERVICE READINESS</small>{readiness?.overall === "ready" ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}</div><div className="manage-summary-value"><strong>{loading ? "—" : readiness?.overall === "ready" ? "Ready" : readiness?.overall === "warning" ? "Review" : "Blocked"}</strong><span>{checkedAt ? `Checked ${new Date(checkedAt).toLocaleTimeString()}` : "Awaiting check"}</span></div></div>
      </section>
      <section className="manage-panel" aria-labelledby="pilot-operations-signals">
        <header><div><h2 id="pilot-operations-signals">Actionable signals</h2><p>Counts are aggregate and contain no invoice text or provider payloads.</p></div></header>
        <div className="manage-summary">
          {cards.map((card) => <Link className="manage-summary-card" href={card.href} key={card.key}><div className="manage-summary-meta"><small>{card.label.toUpperCase()}</small><span>{(metrics?.[card.key] ?? 0) > 0 ? "Review" : "Clear"}</span></div><div className="manage-summary-value"><strong>{loading ? "—" : metrics?.[card.key] ?? 0}</strong><span>{card.detail}</span></div></Link>)}
        </div>
      </section>
      <section className="manage-panel" aria-labelledby="pilot-operations-errors">
        <header><div><h2 id="pilot-operations-errors">Recent critical worker errors</h2><p>Safe operational codes only. Open Intake operations for recovery.</p></div><Link className="manage-button manage-button--quiet" href="/manage/intake">Open recovery</Link></header>
        {loading ? <p>Checking worker history…</p> : criticalErrors.length === 0 ? <p>No recent inbound worker failures or warning runs were recorded.</p> : <ul className="manage-list">
          {criticalErrors.map((item, index) => <li key={`${item.occurredAt}-${item.errorCode}-${index}`}><strong>{item.errorCode}</strong><span>{item.status} · {new Date(item.occurredAt).toLocaleString()}</span></li>)}
        </ul>}
      </section>
    </>}
  </>;
}
