"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ChevronRight, LoaderCircle, Pause, Play, RefreshCw, Square } from "@/lib/icons";

type SequenceMailItem = {
  id: string;
  recordKind?: "message" | "planned";
  threadId: string | null;
  sequenceId?: string | null;
  accountName: string;
  contactName: string;
  recipient: string;
  sequenceName: string;
  enrollmentId: string | null;
  enrollmentState: string;
  stepPosition: number;
  stepId?: string | null;
  stepType: string;
  mailboxAddress: string;
  providerStatus: string;
  subject: string;
  previewText?: string;
  scheduledAt: string | null;
  sentAt: string | null;
  nextActionAt: string | null;
  stopReason: string | null;
  ownerId?: string | null;
  sideEffect?: { status?: string; failure_class?: string | null; provider_reference?: string | null; last_error?: string | null; last_provider_event_at?: string | null } | null;
  latestEvent?: { event_type?: string; occurred_at?: string } | null;
};

type SequenceMailMetrics = {
  scheduledToday: number;
  sentToday: number;
  delivered: number;
  replies: number;
  bounced: number;
  needsAttention?: number;
  queued?: number;
  scheduledNext24Hours?: number;
};

type Props = {
  selectedMailboxId: string | null;
  query: string;
};

const statusOptions = ["all", "scheduled", "queued", "sent", "delivered", "delayed", "replied", "bounced", "complained", "suppressed", "failed", "canceled"] as const;
type SequenceMailStatus = (typeof statusOptions)[number];

function statusFromQuery(value: string | null): SequenceMailStatus {
  return statusOptions.includes(value as SequenceMailStatus) ? value as SequenceMailStatus : "all";
}

function pretty(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function displayDate(value: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function SequenceMailView({ selectedMailboxId, query }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<SequenceMailItem[]>([]);
  const [metrics, setMetrics] = useState<SequenceMailMetrics>({ scheduledToday: 0, sentToday: 0, delivered: 0, replies: 0, bounced: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selected, setSelected] = useState<SequenceMailItem | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const mode = searchParams.get("mode") === "queue" ? "queue" : "activity";
  const status = statusFromQuery(searchParams.get("status"));

  function updateView(nextMode: "activity" | "queue", nextStatus: SequenceMailStatus) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", "sequence");
    if (nextMode === "queue") params.set("mode", "queue");
    else params.delete("mode");
    if (nextStatus === "all") params.delete("status");
    else params.set("status", nextStatus);
    setPage(1);
    router.push(`/manage/mail?${params.toString()}`);
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ limit: "25", page: String(page) });
    if (mode === "queue") params.set("mode", "queue");
    if (selectedMailboxId) params.set("mailbox", selectedMailboxId);
    if (status !== "all") params.set("status", status);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    try {
      const response = await fetch(`/api/manage/mail/sequence?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json() as { items?: SequenceMailItem[]; metrics?: SequenceMailMetrics; hasMore?: boolean; error?: string };
      if (!response.ok) throw new Error(payload.error || "Sequence email records could not be loaded.");
      setItems(payload.items ?? []);
      setMetrics(payload.metrics ?? { scheduledToday: 0, sentToday: 0, delivered: 0, replies: 0, bounced: 0 });
      setHasMore(Boolean(payload.hasMore));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sequence email records could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [selectedMailboxId, mode, status, page, fromDate, toDate]);

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
      <div className={`manage-sequence-mail-metrics${mode === "queue" ? " is-queue" : ""}`}>
        {mode === "queue" ? <>
          <div><span>Queued</span><strong>{metrics.queued ?? items.length}</strong></div>
          <div><span>Next 24 hours</span><strong>{metrics.scheduledNext24Hours ?? 0}</strong></div>
          <div><span>Today</span><strong>{metrics.scheduledToday}</strong></div>
        </> : <>
          <div><span>Scheduled today</span><strong>{metrics.scheduledToday}</strong></div>
          <div><span>Sent today</span><strong>{metrics.sentToday}</strong></div>
          <div><span>Delivered</span><strong>{metrics.delivered}</strong></div>
          <div><span>Replies</span><strong>{metrics.replies}</strong></div>
          <div><span>Bounced</span><strong>{metrics.bounced}</strong></div>
        </>}
      </div>
      <div className="manage-sequence-mail-toolbar">
        <div className="manage-sequence-mail-view-switcher" role="tablist" aria-label="Sequence email views">
          <button type="button" role="tab" aria-selected={mode === "activity"} className={mode === "activity" ? "active" : ""} onClick={() => updateView("activity", status === "queued" ? "all" : status)}>Activity</button>
          <button type="button" role="tab" aria-selected={mode === "queue"} className={mode === "queue" ? "active" : ""} onClick={() => updateView("queue", "queued")}>Queue</button>
        </div>
        {mode === "activity" && <div className="manage-sequence-mail-filters" aria-label="Sequence email status filter">
          {statusOptions.map((option) => (
            <button type="button" key={option} className={status === option ? "active" : ""} onClick={() => updateView("activity", option)}>{option === "all" ? "All" : pretty(option)}</button>
          ))}
        </div>}
        <div className="manage-sequence-mail-date-filters"><label>From<input type="date" value={fromDate} onChange={(event) => { setPage(1); setFromDate(event.target.value); }} /></label><label>To<input type="date" value={toDate} onChange={(event) => { setPage(1); setToDate(event.target.value); }} /></label></div>
        <button type="button" className="manage-button manage-button--quiet" onClick={() => void load()} disabled={loading}><RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh</button>
      </div>
      {mode === "queue" && <p className="manage-sequence-mail-queue-note">Upcoming automatic emails. These are planned actions, not provider-accepted messages.</p>}
      {error && <div className="manage-sequence-mail-error"><AlertCircle size={16} /> {error}</div>}
      {loading ? <div className="manage-empty"><LoaderCircle size={20} className="spin" /><strong>Loading {mode === "queue" ? "planned sequence emails" : "sequence email activity"}…</strong></div> : !visibleItems.length ? <div className="manage-empty"><strong>{mode === "queue" ? "No automatic emails are queued." : "No sequence emails match this view."}</strong><span>{mode === "queue" ? "When an active enrollment reaches an automatic email step, its next send will appear here." : "Scheduled and sent sequence messages will appear here after an enrollment runs."}</span></div> : <div className="manage-sequence-mail-table" role="table" aria-label={mode === "queue" ? "Planned sequence email queue" : "Sequence email activity"}>
        <div className="manage-sequence-mail-row manage-sequence-mail-row--header" role="row"><span>Recipient</span><span>Sequence</span><span>Step</span><span>{mode === "queue" ? "Queue state" : "Provider state"}</span><span>{mode === "queue" ? "Planned for" : "Time"}</span><span aria-hidden="true" /></div>
        {visibleItems.map((item) => <div className={`manage-sequence-mail-row ${selected?.id === item.id ? "is-selected" : ""}`} role="row" key={item.id} onClick={() => setSelected(item)}>
          <div><strong>{item.contactName}</strong><small>{item.recipient} · {item.accountName}</small></div>
          <div><strong>{item.sequenceName}</strong><small>{item.subject}</small></div>
          <div><span>Step {item.stepPosition || "—"}</span><small>{pretty(item.stepType)}</small></div>
          <div><span className={`manage-sequence-mail-status status-${item.providerStatus}`}>{pretty(item.providerStatus)}</span><small>{item.enrollmentState !== "unknown" ? pretty(item.enrollmentState) : item.stopReason || ""}</small></div>
          <div><span>{displayDate(item.sentAt || item.scheduledAt)}</span><small>{mode === "queue" ? item.mailboxAddress : item.nextActionAt ? `Next ${displayDate(item.nextActionAt)}` : item.mailboxAddress}</small></div>
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
      {!loading && (page > 1 || hasMore) && <div className="manage-sequence-mail-pagination"><button type="button" className="manage-button manage-button--quiet" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button><span>Page {page}</span><button type="button" className="manage-button manage-button--quiet" disabled={!hasMore || loading} onClick={() => setPage((value) => value + 1)}>Next</button></div>}
      {selected && <aside className="manage-sequence-mail-context" aria-label="Sequence message context"><div className="manage-sequence-mail-context-head"><div><span>{selected.recordKind === "planned" ? "Queued plan" : "Sequence context"}</span><strong>{selected.contactName}</strong></div><button type="button" onClick={() => setSelected(null)} aria-label="Close context">×</button></div><dl><div><dt>Sequence</dt><dd>{selected.sequenceName}</dd></div><div><dt>Subject</dt><dd>{selected.subject}</dd></div><div><dt>Enrollment</dt><dd>{pretty(selected.enrollmentState)}</dd></div><div><dt>{selected.recordKind === "planned" ? "Planned for" : "Next action"}</dt><dd>{selected.nextActionAt ? displayDate(selected.nextActionAt) : "None scheduled"}</dd></div><div><dt>Provider</dt><dd>{selected.recordKind === "planned" ? "Not sent to provider" : `${pretty(selected.providerStatus)}${selected.sideEffect?.failure_class ? ` · ${pretty(selected.sideEffect.failure_class)}` : ""}`}</dd></div><div><dt>Stop reason</dt><dd>{selected.stopReason ? pretty(selected.stopReason) : "No stop reason"}</dd></div>{selected.recordKind !== "planned" && <div><dt>Latest event</dt><dd>{selected.latestEvent?.event_type ? `${pretty(selected.latestEvent.event_type)} · ${displayDate(selected.latestEvent.occurred_at ?? null)}` : "No event yet"}</dd></div>}</dl>{selected.previewText && <p className="manage-sequence-mail-context-preview">{selected.previewText}</p>}{selected.sideEffect?.last_error && <p className="manage-sequence-mail-context-warning">{selected.sideEffect.last_error}</p>}<div className="manage-sequence-mail-context-actions">{selected.enrollmentId && <Link className="manage-button manage-button--quiet" href={`/manage/outreach?tab=enrollments&enrollment=${selected.enrollmentId}`}>Open enrollment</Link>}{selected.threadId && <Link className="manage-button manage-button--quiet" href={`/manage/mail/${selected.threadId}?view=all&folder=sent`}>Open thread</Link>}</div></aside>}
    </section>
  );
}
