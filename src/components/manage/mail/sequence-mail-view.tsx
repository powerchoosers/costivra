"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ChevronRight, LoaderCircle, Pause, Play, RefreshCw, Square } from "lucide-react";

type SequenceMailItem = {
  id: string;
  threadId: string | null;
  accountName: string;
  contactName: string;
  recipient: string;
  sequenceName: string;
  enrollmentId: string | null;
  enrollmentState: string;
  stepPosition: number;
  stepType: string;
  mailboxAddress: string;
  providerStatus: string;
  subject: string;
  scheduledAt: string | null;
  sentAt: string | null;
  nextActionAt: string | null;
  stopReason: string | null;
};

type SequenceMailMetrics = {
  scheduledToday: number;
  sentToday: number;
  delivered: number;
  replies: number;
  bounced: number;
};

type Props = {
  selectedMailboxId: string | null;
  query: string;
};

const statusOptions = ["all", "scheduled", "sent", "delivered", "replied", "bounced", "failed"] as const;

function pretty(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function displayDate(value: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function SequenceMailView({ selectedMailboxId, query }: Props) {
  const [items, setItems] = useState<SequenceMailItem[]>([]);
  const [metrics, setMetrics] = useState<SequenceMailMetrics>({ scheduledToday: 0, sentToday: 0, delivered: 0, replies: 0, bounced: 0 });
  const [status, setStatus] = useState<(typeof statusOptions)[number]>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ limit: "50" });
    if (selectedMailboxId) params.set("mailbox", selectedMailboxId);
    if (status !== "all") params.set("status", status);
    try {
      const response = await fetch(`/api/manage/mail/sequence?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json() as { items?: SequenceMailItem[]; metrics?: SequenceMailMetrics; error?: string };
      if (!response.ok) throw new Error(payload.error || "Sequence email records could not be loaded.");
      setItems(payload.items ?? []);
      setMetrics(payload.metrics ?? { scheduledToday: 0, sentToday: 0, delivered: 0, replies: 0, bounced: 0 });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sequence email records could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [selectedMailboxId, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const visibleItems = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => `${item.contactName} ${item.recipient} ${item.accountName} ${item.sequenceName} ${item.subject}`.toLowerCase().includes(term));
  }, [items, query]);

  async function enrollmentAction(enrollmentId: string, action: "pause" | "resume" | "stop") {
    setBusyId(enrollmentId);
    try {
      const response = await fetch(`/api/manage/outreach/enrollments/${enrollmentId}/${action}`, { method: "POST" });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || `Enrollment could not be ${action === "resume" ? "resumed" : `${action}d`}.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The enrollment action failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="manage-sequence-mail-view" aria-label="Sequence emails">
      <div className="manage-sequence-mail-metrics">
        <div><span>Scheduled today</span><strong>{metrics.scheduledToday}</strong></div>
        <div><span>Sent today</span><strong>{metrics.sentToday}</strong></div>
        <div><span>Delivered</span><strong>{metrics.delivered}</strong></div>
        <div><span>Replies</span><strong>{metrics.replies}</strong></div>
        <div><span>Bounced</span><strong>{metrics.bounced}</strong></div>
      </div>
      <div className="manage-sequence-mail-toolbar">
        <div className="manage-sequence-mail-filters" aria-label="Sequence email status filter">
          {statusOptions.map((option) => (
            <button type="button" key={option} className={status === option ? "active" : ""} onClick={() => setStatus(option)}>{option === "all" ? "All" : pretty(option)}</button>
          ))}
        </div>
        <button type="button" className="manage-button manage-button--quiet" onClick={() => void load()} disabled={loading}><RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh</button>
      </div>
      {error && <div className="manage-sequence-mail-error"><AlertCircle size={16} /> {error}</div>}
      {loading ? <div className="manage-empty"><LoaderCircle size={20} className="spin" /><strong>Loading sequence email activity…</strong></div> : !visibleItems.length ? <div className="manage-empty"><strong>No sequence emails match this view.</strong><span>Scheduled and sent sequence messages will appear here after an enrollment runs.</span></div> : <div className="manage-sequence-mail-table" role="table" aria-label="Sequence email activity">
        <div className="manage-sequence-mail-row manage-sequence-mail-row--header" role="row"><span>Recipient</span><span>Sequence</span><span>Step</span><span>Provider state</span><span>Time</span><span aria-hidden="true" /></div>
        {visibleItems.map((item) => <div className="manage-sequence-mail-row" role="row" key={item.id}>
          <div><strong>{item.contactName}</strong><small>{item.recipient} · {item.accountName}</small></div>
          <div><strong>{item.sequenceName}</strong><small>{item.subject}</small></div>
          <div><span>Step {item.stepPosition || "—"}</span><small>{pretty(item.stepType)}</small></div>
          <div><span className={`manage-sequence-mail-status status-${item.providerStatus}`}>{pretty(item.providerStatus)}</span><small>{item.enrollmentState !== "unknown" ? pretty(item.enrollmentState) : item.stopReason || ""}</small></div>
          <div><span>{displayDate(item.sentAt || item.scheduledAt)}</span><small>{item.nextActionAt ? `Next ${displayDate(item.nextActionAt)}` : item.mailboxAddress}</small></div>
          <div className="manage-sequence-mail-actions">
            {item.threadId && <Link href={`/manage/mail/${item.threadId}?view=all&folder=sent`} aria-label={`Open ${item.subject}`}><ChevronRight size={16} /></Link>}
            {item.enrollmentId && (["pending", "active", "waiting_for_task"].includes(item.enrollmentState) || item.enrollmentState === "paused") && <>
              {item.enrollmentState === "paused"
                ? <button type="button" onClick={() => void enrollmentAction(item.enrollmentId!, "resume")} disabled={busyId === item.enrollmentId} aria-label="Resume enrollment" title="Resume enrollment"><Play size={14} /></button>
                : <button type="button" onClick={() => void enrollmentAction(item.enrollmentId!, "pause")} disabled={busyId === item.enrollmentId} aria-label="Pause enrollment" title="Pause enrollment"><Pause size={14} /></button>}
              <button type="button" onClick={() => void enrollmentAction(item.enrollmentId!, "stop")} disabled={busyId === item.enrollmentId} aria-label="Stop enrollment" title="Stop enrollment"><Square size={14} /></button>
            </>}
          </div>
        </div>)}
      </div>}
    </section>
  );
}
