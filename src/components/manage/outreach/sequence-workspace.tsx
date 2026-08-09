"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Archive, ArrowDown, ArrowUp, Check, ChevronRight, CircleAlert, Copy, Eye, LoaderCircle, Pause, Play, Plus, Search, Trash2, Users, X } from "lucide-react";
import type { ManageData } from "@/lib/manage/types";
import type { Sequence, SequenceStep, SequenceStepType, Enrollment } from "@/lib/manage/sequences/types";
import { sanitizeEmailHtml } from "@/lib/manage/sanitize-email-html";
import { PERSONALIZATION_OVERRIDE_FIELDS, TEMPLATE_TOKENS, renderTemplate, validateSequenceDraft } from "@/lib/manage/sequences/validation";
import { sequenceActivationUiState } from "@/lib/manage/sequences/ui-state";

type Props = { data: ManageData; query: string; mode?: "sequences" | "enrollments" };
type SequenceAction = "clone" | "pause" | "archive";
type PreviewResult = { id: string; fullName: string; email: string; blockedReason: string | null; missingFields?: string[]; subject: string; body: string };

const defaultEmail = {
  subjectTemplate: "Quick question for {{company_name}}",
  bodyHtml: "<p>Hi {{first_name}},</p><p>I wanted to ask a quick question about how {{company_name}} manages recurring costs.</p><p>Would a short conversation be useful?</p><p>Best,<br>{{sender_name}}</p>",
  bodyText: "Hi {{first_name}},\n\nI wanted to ask a quick question about how {{company_name}} manages recurring costs.\n\nWould a short conversation be useful?\n\nBest,\n{{sender_name}}",
};

const templateFieldLabel = (field: string) => field.replace(/_/g, " ");

function requestJson(input: RequestInfo, init?: RequestInit) {
  return fetch(input, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } }).then(async (response) => {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const blockedServices = Array.isArray(payload.blockedServices) ? payload.blockedServices : [];
      const readinessDetails = blockedServices
        .map((service: unknown) => service && typeof service === "object" && "message" in service && typeof service.message === "string" ? service.message : null)
        .filter(Boolean)
        .join(" ");
      throw new Error([payload.error || "The request could not be completed.", readinessDetails].filter(Boolean).join(" "));
    }
    return payload as Record<string, unknown>;
  });
}

function stepLabel(type: SequenceStepType) {
  return type === "manual_email" ? "Manual email" : type === "automatic_email" ? "Automatic email" : type === "call_task" ? "Call task" : "General task";
}

function formatSequenceDate(value: string | null) {
  if (!value) return "not scheduled";
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "not scheduled";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(timestamp);
}

function stepDraft(type: SequenceStepType, position: number) {
  return type === "manual_email" || type === "automatic_email"
    ? { stepType: type, delayValue: position === 1 ? 0 : 2, delayUnit: "business_days", threadMode: position === 1 ? "new_thread" : "reply_to_previous", ...defaultEmail, taskPriority: "normal", pauseUntilTaskComplete: false }
    : { stepType: type, delayValue: position === 1 ? 0 : 1, delayUnit: "business_days", taskTitleTemplate: type === "call_task" ? "Call {{full_name}}" : "Follow up with {{full_name}}", taskNotesTemplate: "Review the contact record before acting.", taskPriority: "normal", pauseUntilTaskComplete: true };
}

export function SequenceWorkspace({ data, query, mode = "sequences" }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.toString();
  const sequenceQueryId = searchParams.get("sequence");
  const enrollmentQueryId = searchParams.get("enrollment");
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [sequenceExecutionEnabled, setSequenceExecutionEnabled] = useState(false);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sequenceSearch, setSequenceSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Sequence["status"]>("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [enrollmentSearch, setEnrollmentSearch] = useState("");
  const [enrollmentStateFilter, setEnrollmentStateFilter] = useState("all");
  const [enrollmentSequenceFilter, setEnrollmentSequenceFilter] = useState("all");
  const [enrollmentMailboxFilter, setEnrollmentMailboxFilter] = useState("all");
  const [enrollmentAccountFilter, setEnrollmentAccountFilter] = useState("all");
  const [enrollmentOwnerFilter, setEnrollmentOwnerFilter] = useState("all");
  const [enrollmentFromDate, setEnrollmentFromDate] = useState("");
  const [enrollmentToDate, setEnrollmentToDate] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showEnroll, setShowEnroll] = useState(false);
  const [name, setName] = useState("");
  const [organizationId, setOrganizationId] = useState(data.accounts[0]?.id ?? "");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [previewResults, setPreviewResults] = useState<PreviewResult[]>([]);
  const [previewPersonalization, setPreviewPersonalization] = useState<Record<string, Record<string, string>>>({});
  const [previewBusy, setPreviewBusy] = useState(false);
  const [mailboxId, setMailboxId] = useState(data.mail.mailboxes.find((item) => item.canSend && item.status === "active")?.id ?? "");
  const activeSheet = showNew ? "new" : showEnroll ? "enroll" : enrollmentQueryId ? "inspect" : null;

  const selectSequence = (id: string | null) => {
    const next = new URLSearchParams(urlQuery);
    next.set("tab", "sequences");
    if (id) next.set("sequence", id); else next.delete("sequence");
    next.delete("enrollment");
    router.replace(`/manage/outreach?${next.toString()}`, { scroll: false });
  };

  const selectEnrollment = (id: string | null) => {
    const next = new URLSearchParams(urlQuery);
    next.set("tab", "enrollments");
    if (id) next.set("enrollment", id); else next.delete("enrollment");
    next.delete("sequence");
    router.replace(`/manage/outreach?${next.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (!activeSheet) return;
    const focusableSelector = "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])";
    const getFocusable = () => Array.from(document.querySelector<HTMLElement>(".portal-sheet")?.querySelectorAll<HTMLElement>(focusableSelector) ?? []);
    getFocusable()[0]?.focus();
    const handleSheetKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setShowNew(false);
        setShowEnroll(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleSheetKeyDown);
    return () => document.removeEventListener("keydown", handleSheetKeyDown);
  }, [activeSheet]);

  const selected = sequences.find((item) => item.id === sequenceQueryId) ?? null;
  const selectedEnrollment = enrollments.find((item) => item.id === enrollmentQueryId) ?? null;
  const selectedDraftValidation = selected ? validateSequenceDraft(selected, { forActivation: true }) : null;
  const ownerOptions = useMemo(() => Array.from(new Set(sequences.map((item) => item.ownerName || "Unassigned"))).sort(), [sequences]);
  const visibleSequences = useMemo(() => sequences.filter((item) => {
    const searchTerm = `${query} ${sequenceSearch}`.trim().toLowerCase();
    const matchesSearch = !searchTerm || `${item.name} ${item.description ?? ""} ${item.ownerName ?? ""}`.toLowerCase().includes(searchTerm);
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const matchesOwner = ownerFilter === "all" || (item.ownerName || "Unassigned") === ownerFilter;
    const matchesArchive = showArchived || item.status !== "archived";
    return matchesSearch && matchesStatus && matchesOwner && matchesArchive;
  }), [ownerFilter, query, sequenceSearch, sequences, showArchived, statusFilter]);
  // Keep ineligible contacts visible so the operator can understand why the
  // server will block them instead of mistaking a filtered list for consent.
  const visibleContacts = data.contacts.filter((contact) => !selected || contact.organizationId === selected.organizationId);
  const enrollmentOwners = useMemo(() => new Map(sequences.map((item) => [item.id, item.ownerName || "Unassigned"])), [sequences]);
  const enrollmentSequenceOptions = useMemo(() => sequences.filter((sequence) => enrollments.some((item) => item.sequenceId === sequence.id)).sort((a, b) => a.name.localeCompare(b.name)), [enrollments, sequences]);
  const enrollmentMailboxOptions = useMemo(() => Array.from(new Set(enrollments.map((item) => item.mailboxAddress).filter(Boolean))).sort(), [enrollments]);
  const enrollmentAccountOptions = useMemo(() => Array.from(new Set(enrollments.map((item) => item.accountName).filter(Boolean))).sort(), [enrollments]);
  const enrollmentOwnerOptions = useMemo(() => Array.from(new Set(enrollments.map((item) => enrollmentOwners.get(item.sequenceId) || "Unassigned"))).sort(), [enrollmentOwners, enrollments]);
  const visibleEnrollments = useMemo(() => enrollments.filter((item) => {
    const term = enrollmentSearch.trim().toLowerCase();
    return (!term || `${item.contactName} ${item.contactEmail} ${item.sequenceName} ${item.accountName} ${item.mailboxAddress}`.toLowerCase().includes(term))
      && (enrollmentStateFilter === "all" || item.state === enrollmentStateFilter)
      && (enrollmentSequenceFilter === "all" || item.sequenceId === enrollmentSequenceFilter)
      && (enrollmentMailboxFilter === "all" || item.mailboxAddress === enrollmentMailboxFilter)
      && (enrollmentAccountFilter === "all" || item.accountName === enrollmentAccountFilter)
      && (enrollmentOwnerFilter === "all" || (enrollmentOwners.get(item.sequenceId) || "Unassigned") === enrollmentOwnerFilter)
      && (!enrollmentFromDate || item.createdAt.slice(0, 10) >= enrollmentFromDate)
      && (!enrollmentToDate || item.createdAt.slice(0, 10) <= enrollmentToDate);
  }), [enrollmentAccountFilter, enrollmentFromDate, enrollmentMailboxFilter, enrollmentOwnerFilter, enrollmentSearch, enrollmentSequenceFilter, enrollmentStateFilter, enrollmentToDate, enrollmentOwners, enrollments]);
  const summary = useMemo(() => ({
    activeSequences: sequences.filter((item) => item.status === "active").length,
    activeEnrollments: enrollments.filter((item) => ["active", "waiting_for_task"].includes(item.state)).length,
    scheduled: sequences.reduce((total, item) => total + item.scheduledNext24Hours, 0),
    replies: sequences.reduce((total, item) => total + item.replies, 0),
    needsAttention: sequences.filter((item) => item.status === "draft" && !validateSequenceDraft(item, { forActivation: true }).valid).length
      + enrollments.filter((item) => ["failed", "bounced", "unsubscribed"].includes(item.state)).length,
  }), [enrollments, sequences]);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [sequencePayload, enrollmentPayload] = await Promise.all([requestJson("/api/manage/outreach/sequences"), requestJson("/api/manage/outreach/enrollments")]);
      setSequences((sequencePayload.sequences as Sequence[]) ?? []);
      setSequenceExecutionEnabled(sequencePayload.executionEnabled === true);
      setEnrollments((enrollmentPayload.enrollments as Enrollment[]) ?? []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The outreach workspace could not load."); }
    finally { setLoading(false); }
  }
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, []);

  async function createSequence(event: React.FormEvent) {
    event.preventDefault(); if (!organizationId || !name.trim()) return;
    setBusy(true); setError(null);
    try {
      const payload = await requestJson("/api/manage/outreach/sequences", { method: "POST", body: JSON.stringify({ organizationId, name }) });
      setShowNew(false); setName(""); await load(); selectSequence(String(payload.id));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The sequence could not be created."); }
    finally { setBusy(false); }
  }

  async function addStep(type: SequenceStepType) {
    if (!selected) return;
    setBusy(true); setError(null);
    try { await requestJson(`/api/manage/outreach/sequences/${selected.id}/steps`, { method: "POST", body: JSON.stringify(stepDraft(type, selected.steps.length + 1)) }); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The step could not be added."); }
    finally { setBusy(false); }
  }

  async function sendTest(stepId: string) {
    if (!selected) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      const payload = await requestJson(`/api/manage/outreach/sequences/${selected.id}/steps/${stepId}/test`, { method: "POST", body: JSON.stringify({ testRequestId: crypto.randomUUID() }) });
      setNotice(typeof payload.duplicate === "boolean" && payload.duplicate ? "That test was already accepted; no second message was sent." : "Test email sent to your verified operator address.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The test email could not be sent."); }
    finally { setBusy(false); }
  }

  async function saveSequence(patch: Record<string, unknown>) {
    if (!selected) return;
    setBusy(true); setError(null);
    try { await requestJson(`/api/manage/outreach/sequences/${selected.id}`, { method: "PATCH", body: JSON.stringify(patch) }); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The sequence could not be saved."); }
    finally { setBusy(false); }
  }

  async function reorderSteps(stepIds: string[]) { if (!selected) return; setBusy(true); try { await requestJson(`/api/manage/outreach/sequences/${selected.id}/steps/reorder`, { method: "POST", body: JSON.stringify({ stepIds }) }); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "The steps could not be reordered."); } finally { setBusy(false); } }
  async function deleteStep(stepId: string) { if (!selected) return; setBusy(true); try { await requestJson(`/api/manage/outreach/sequences/${selected.id}/steps/${stepId}`, { method: "DELETE" }); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "The step could not be deleted."); } finally { setBusy(false); } }
  async function duplicateStep(step: SequenceStep) {
    if (!selected) return;
    setBusy(true); setError(null);
    try {
      await requestJson(`/api/manage/outreach/sequences/${selected.id}/steps`, { method: "POST", body: JSON.stringify({ stepType: step.stepType, delayValue: step.delayValue, delayUnit: step.delayUnit, threadMode: step.threadMode, subjectTemplate: step.subjectTemplate, bodyHtml: step.bodyHtml, bodyText: step.bodyText, taskTitleTemplate: step.taskTitleTemplate, taskNotesTemplate: step.taskNotesTemplate, taskPriority: step.taskPriority, pauseUntilTaskComplete: step.pauseUntilTaskComplete }) });
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The step could not be duplicated."); }
    finally { setBusy(false); }
  }

  async function enroll(event: React.FormEvent) {
    event.preventDefault(); if (!selected || !mailboxId || !selectedContactIds.length) return;
    setBusy(true); setError(null);
    try { await requestJson("/api/manage/outreach/enrollments", { method: "POST", body: JSON.stringify({ sequenceId: selected.id, mailboxId, contactIds: selectedContactIds, personalization: previewPersonalization }) }); setShowEnroll(false); setSelectedContactIds([]); setPreviewResults([]); setPreviewPersonalization({}); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Enrollment could not be prepared."); }
    finally { setBusy(false); }
  }

  async function previewEnrollment() {
    if (!selected || !selectedContactIds.length) return;
    setPreviewBusy(true); setError(null);
    try {
      const payload = await requestJson("/api/manage/outreach/enrollments/preview", { method: "POST", body: JSON.stringify({ sequenceId: selected.id, contactIds: selectedContactIds, personalization: previewPersonalization }) });
      setPreviewResults((payload.results as PreviewResult[]) ?? []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The enrollment preview could not be generated."); }
    finally { setPreviewBusy(false); }
  }

  function updatePreviewPersonalization(contactId: string, field: string, value: string) {
    setPreviewPersonalization((current) => ({ ...current, [contactId]: { ...(current[contactId] ?? {}), [field]: value } }));
    // Require a fresh server preview after an operator changes a merge value.
    setPreviewResults([]);
  }

  async function sequenceAction(id: string, action: SequenceAction) {
    const labels: Record<SequenceAction, string> = { clone: "clone this sequence", pause: "pause this active sequence", archive: "archive this sequence" };
    if (action !== "clone" && !window.confirm(`Are you sure you want to ${labels[action]}?`)) return;
    setBusy(true); setError(null);
    try {
      const payload = await requestJson(`/api/manage/outreach/sequences/${id}/${action}`, { method: "POST", body: JSON.stringify({}) });
      if (action === "clone" && typeof payload.id === "string") selectSequence(payload.id);
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : `The sequence could not be ${action}d.`); }
    finally { setBusy(false); }
  }

  async function enrollmentAction(id: string, action: "pause" | "resume" | "stop") {
    if (action === "stop" && !window.confirm("Stop this enrollment? This records a durable stop and will not send another touch.")) return;
    setBusy(true); setError(null);
    try {
      await requestJson(`/api/manage/outreach/enrollments/${id}/${action}`, { method: "POST", body: JSON.stringify(action === "stop" ? { reason: "Stopped from Outreach enrollments." } : {}) });
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The enrollment control could not be completed."); }
    finally { setBusy(false); }
  }

  async function activateSequence() {
    if (!selected) return;
    setActivating(true); setError(null);
    try {
      await requestJson(`/api/manage/outreach/sequences/${selected.id}/activate`, { method: "POST", body: JSON.stringify({}) });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The sequence could not be activated.");
    } finally { setActivating(false); }
  }

  return <section className="sequence-workspace">
    <header className="manage-page-heading sequence-workspace__heading">
      <div><p className="manage-eyebrow">Outreach system</p><h2>{mode === "enrollments" ? "Enrollments" : "Sequences"}</h2><p>{mode === "enrollments" ? "Review staged contacts and why a record is waiting. Enrollment never sends until its sequence is active." : "Build a reviewable follow-up plan. Activation is gated by server-side readiness checks before any send."}</p></div>
      <div className="sequence-actions">{mode === "sequences" && <><button className="manage-button manage-button--quiet" onClick={() => setShowEnroll(true)} disabled={!selected || selected.status !== "draft" || !selectedDraftValidation?.valid} title={!selected ? "Select a draft sequence first" : selected.status !== "draft" ? "Only draft sequences can stage enrollments" : !selectedDraftValidation?.valid ? "Finish the sequence setup before previewing enrollments" : undefined}><Users size={15} /> Enroll contacts</button><button className="manage-button manage-button--primary" onClick={() => setShowNew(true)}><Plus size={16} /> New sequence</button></>}</div>
    </header>
    {error && <div className="manage-inline-alert manage-inline-alert--error" role="alert"><CircleAlert size={16} /> <span>{error}</span></div>}{notice && <div className="manage-inline-alert manage-inline-alert--success" role="status"><Check size={16} /> <span>{notice}</span></div>}
    {loading ? <div className="manage-empty"><LoaderCircle className="spin" size={20} /> Loading sequences…</div> : mode === "enrollments" ? <div className="manage-panel sequence-enrollment-summary">
      <div className="manage-panel-header"><div><h3>Enrollment review</h3><p>{visibleEnrollments.length} of {enrollments.length} staged record{enrollments.length === 1 ? "" : "s"}</p></div><div className="sequence-filter-row"><label className="sequence-search"><Search size={14} /><input value={enrollmentSearch} onChange={(event) => setEnrollmentSearch(event.target.value)} placeholder="Search contacts or sequences" aria-label="Search enrollments" /></label><label><span className="sr-only">Filter enrollment state</span><select value={enrollmentStateFilter} onChange={(event) => setEnrollmentStateFilter(event.target.value)}><option value="all">All states</option><option value="pending">Pending</option><option value="active">Active</option><option value="paused">Paused</option><option value="waiting_for_task">Waiting for task</option><option value="stopped">Stopped</option><option value="completed">Completed</option><option value="failed">Failed</option></select></label><label><span className="sr-only">Filter enrollment sequence</span><select value={enrollmentSequenceFilter} onChange={(event) => setEnrollmentSequenceFilter(event.target.value)}><option value="all">All sequences</option>{enrollmentSequenceOptions.map((sequence) => <option key={sequence.id} value={sequence.id}>{sequence.name}</option>)}</select></label><label><span className="sr-only">Filter enrollment mailbox</span><select value={enrollmentMailboxFilter} onChange={(event) => setEnrollmentMailboxFilter(event.target.value)}><option value="all">All mailboxes</option>{enrollmentMailboxOptions.map((mailbox) => <option key={mailbox} value={mailbox}>{mailbox}</option>)}</select></label><label><span className="sr-only">Filter enrollment account</span><select value={enrollmentAccountFilter} onChange={(event) => setEnrollmentAccountFilter(event.target.value)}><option value="all">All accounts</option>{enrollmentAccountOptions.map((account) => <option key={account} value={account}>{account}</option>)}</select></label><label><span className="sr-only">Filter enrollment owner</span><select value={enrollmentOwnerFilter} onChange={(event) => setEnrollmentOwnerFilter(event.target.value)}><option value="all">All owners</option>{enrollmentOwnerOptions.map((owner) => <option key={owner} value={owner}>{owner}</option>)}</select></label></div><div className="sequence-filter-row sequence-filter-row--dates"><label><span>From</span><input type="date" value={enrollmentFromDate} onChange={(event) => setEnrollmentFromDate(event.target.value)} /></label><label><span>To</span><input type="date" value={enrollmentToDate} onChange={(event) => setEnrollmentToDate(event.target.value)} /></label></div></div>
      {visibleEnrollments.length ? <div className="sequence-enrollment-table">{visibleEnrollments.map((item) => <div key={item.id}><span><strong>{item.contactName}</strong><small>{item.accountName} · {item.sequenceName} · {item.contactEmail}</small><small>Step {item.currentStepPosition || "Pending"} · {item.nextActionAt ? `Next ${formatSequenceDate(item.nextActionAt)}` : "No action scheduled"} · Last touch {item.lastTouchAt ? formatSequenceDate(item.lastTouchAt) : "none"} · {item.mailboxAddress}</small></span><em>{item.state}</em><div className="sequence-row-actions"><button className="manage-icon-button" onClick={() => selectEnrollment(item.id)} disabled={busy} aria-label={`Inspect ${item.contactName}`} title="Inspect enrollment"><Eye size={14} /></button>{["active", "waiting_for_task"].includes(item.state) && <button className="manage-icon-button" onClick={() => void enrollmentAction(item.id, "pause")} disabled={busy} aria-label={`Pause ${item.contactName}`} title="Pause enrollment"><Pause size={14} /></button>}{item.state === "paused" && <button className="manage-icon-button" onClick={() => void enrollmentAction(item.id, "resume")} disabled={busy || !sequenceExecutionEnabled} aria-label={`Resume ${item.contactName}`} title={sequenceExecutionEnabled ? "Resume enrollment" : "Resume unavailable until sequence execution is enabled"}><Play size={14} /></button>}{["pending", "active", "paused", "waiting_for_task"].includes(item.state) && <button className="manage-icon-button" onClick={() => void enrollmentAction(item.id, "stop")} disabled={busy} aria-label={`Stop ${item.contactName}`} title="Stop enrollment"><X size={14} /></button>}</div></div>)}</div> : <div className="manage-empty"><strong>No matching enrollments.</strong><p>Pending contacts appear here before any sequence touch is sent.</p></div>}
    </div> : <>
      <div className="sequence-summary-strip" aria-label="Outreach sequence summary"><div><span>Active sequences</span><strong>{summary.activeSequences}</strong></div><div><span>Active enrollments</span><strong>{summary.activeEnrollments}</strong></div><div><span>Scheduled next 24h</span><strong>{summary.scheduled}</strong></div><div><span>Replies</span><strong>{summary.replies}</strong></div><div><span>Needs attention</span><strong>{summary.needsAttention}</strong></div></div>
      <div className="sequence-toolbar"><label className="sequence-search"><Search size={14} /><input value={sequenceSearch} onChange={(event) => setSequenceSearch(event.target.value)} placeholder="Search sequences" aria-label="Search sequences" /></label><label><span className="sr-only">Filter sequence status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | Sequence["status"])}><option value="all">All statuses</option><option value="draft">Draft</option><option value="active">Active</option><option value="paused">Paused</option><option value="archived">Archived</option></select></label><label><span className="sr-only">Filter sequence owner</span><select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}><option value="all">All owners</option>{ownerOptions.map((owner) => <option key={owner} value={owner}>{owner}</option>)}</select></label><label className="sequence-checkbox"><input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} /> Show archived</label></div>
      <div className="sequence-layout">
        <div className="sequence-list manage-panel"><div className="manage-panel-header"><div><h3>Saved sequences</h3><p>{visibleSequences.length} plan{visibleSequences.length === 1 ? "" : "s"}</p></div></div>{visibleSequences.length ? visibleSequences.map((item) => <div key={item.id} className={`sequence-list-item${sequenceQueryId === item.id ? " is-selected" : ""}`}><button className="sequence-list-item__main" onClick={() => selectSequence(item.id)}><span><strong>{item.name}</strong><small>{item.steps.length} steps · {item.status} · {item.ownerName || "Unassigned"}</small><small>{item.activeEnrollments} active contacts · {item.scheduledNext24Hours} scheduled · {item.sent} sent · {item.replies} replies · {item.sent ? `${Math.round((item.replies / item.sent) * 100)}% reply rate` : "— reply rate"}</small></span><ChevronRight size={16} /></button><div className="sequence-row-actions"><button className="manage-icon-button" onClick={() => void sequenceAction(item.id, "clone")} disabled={busy} aria-label={`Clone ${item.name}`} title="Clone sequence"><Copy size={14} /></button>{item.status === "active" && <button className="manage-icon-button" onClick={() => void sequenceAction(item.id, "pause")} disabled={busy} aria-label={`Pause ${item.name}`} title="Pause sequence"><Pause size={14} /></button>}{["draft", "paused"].includes(item.status) && <button className="manage-icon-button" onClick={() => void sequenceAction(item.id, "archive")} disabled={busy} aria-label={`Archive ${item.name}`} title="Archive sequence"><Archive size={14} /></button>}</div></div>) : <div className="manage-empty"><strong>No matching sequences.</strong><p>Start with one focused, human-reviewable follow-up plan.</p></div>}</div>
        <div className="sequence-editor manage-panel">{selected ? <SequenceEditor sequence={selected} executionEnabled={sequenceExecutionEnabled} busy={busy} activating={activating} onActivate={activateSequence} onAdd={addStep} onSave={saveSequence} onReorder={reorderSteps} onDelete={deleteStep} onDuplicate={duplicateStep} onTestSend={sendTest} onClone={() => void sequenceAction(selected.id, "clone")} /> : <div className="manage-empty sequence-editor__empty"><strong>Select a sequence to edit it.</strong><p>Activation is checked server-side before any message can be sent.</p></div>}</div>
      </div>
      {enrollments.length > 0 && <div className="manage-panel sequence-enrollment-summary"><div className="manage-panel-header"><div><h3>Pending enrollment review</h3><p>These records are staged only; no message has been sent.</p></div></div><div className="sequence-enrollment-table">{enrollments.slice(0, 12).map((item) => <div key={item.id}><span><strong>{item.contactName}</strong><small>{item.sequenceName} · {item.contactEmail}</small></span><em>{item.state}</em></div>)}</div></div>}
    </>}
    {showNew && <div className="portal-sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowNew(false); }}><form className="portal-sheet" onSubmit={createSequence}><div className="portal-sheet-header"><div><span className="manage-eyebrow">Draft only</span><h2>New sequence</h2></div><button type="button" className="manage-icon-button" onClick={() => setShowNew(false)} aria-label="Close"><X size={17} /></button></div><div className="portal-sheet-body"><label>Account<select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} required>{data.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label><label>Name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Renewal follow-up" required /></label><small>We will start with a blank-safe draft. Add content before enrolling anyone.</small><div className="portal-sheet-actions"><button type="button" className="manage-button manage-button--quiet" onClick={() => setShowNew(false)}>Cancel</button><button className="manage-button manage-button--primary" disabled={busy}>{busy ? "Creating…" : "Create draft"}</button></div></div></form></div>}
    {showEnroll && selected && <div className="portal-sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowEnroll(false); }}><form className="portal-sheet portal-sheet--wide" onSubmit={enroll}><div className="portal-sheet-header"><div><span className="manage-eyebrow">Pending only · {selected.name}</span><h2>Enroll contacts</h2></div><button type="button" className="manage-icon-button" onClick={() => setShowEnroll(false)} aria-label="Close"><X size={17} /></button></div><div className="portal-sheet-body"><label>Sender mailbox<select value={mailboxId} onChange={(event) => setMailboxId(event.target.value)} required><option value="">Choose a mailbox</option>{data.mail.mailboxes.filter((mailbox) => mailbox.canSend && mailbox.status === "active").map((mailbox) => <option key={mailbox.id} value={mailbox.id}>{mailbox.address} · {selected.dailySendLimit}/day sequence cap</option>)}</select></label><label>Contacts<select multiple size={Math.min(8, Math.max(3, visibleContacts.length))} value={selectedContactIds} onChange={(event) => { setSelectedContactIds(Array.from(event.currentTarget.selectedOptions, (option) => option.value)); setPreviewResults([]); setPreviewPersonalization({}); }} aria-label="Contacts to enroll">{visibleContacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.fullName} · {contact.organizationName}{contact.title ? ` · ${contact.title}` : ""} · {contact.email}{contact.status !== "active" ? ` · status: ${contact.status}` : ""}{contact.marketingStatus ? ` · ${contact.marketingStatus.replace("_", " ")}` : " · consent not recorded"}{contact.outreachSuppressionReason ? ` · blocked: ${contact.outreachSuppressionReason}` : ""}</option>)}</select><small>Suppressed, opted-out, bounced, inactive, or already enrolled contacts will be blocked by the server. Marketing permission is shown separately from workspace access.</small></label><section className="sequence-enrollment-confirmation" aria-label="Enrollment confirmation summary"><strong>Before you confirm</strong><dl><div><dt>Contacts</dt><dd>{selectedContactIds.length}</dd></div><div><dt>Sequence</dt><dd>{selected.name}</dd></div><div><dt>Sender mailbox</dt><dd>{data.mail.mailboxes.find((mailbox) => mailbox.id === mailboxId)?.address || "No mailbox selected"}</dd></div><div><dt>First action</dt><dd>{selected.steps.length ? "Starts immediately" : "Not scheduled"}</dd></div><div><dt>Daily cap</dt><dd>{selected.dailySendLimit} sequence touches/day</dd></div><div><dt>Safety</dt><dd>Stops on reply, bounce, and unsubscribe</dd></div></dl><small>No email is sent in this packet. Confirmation creates pending records only.</small></section><div className="portal-sheet-actions"><button type="button" className="manage-button manage-button--quiet" onClick={() => void previewEnrollment()} disabled={previewBusy || !selectedContactIds.length}><Eye size={15} /> {previewBusy ? "Previewing…" : "Preview first touch"}</button><button type="button" className="manage-button manage-button--quiet" onClick={() => setShowEnroll(false)}>Cancel</button><button className="manage-button manage-button--primary" disabled={busy || !selectedContactIds.length || !previewResults.length || previewResults.some((item) => item.blockedReason)}>{busy ? "Checking…" : "Create pending enrollment"}</button></div>{previewResults.length > 0 && <div className="sequence-preview-results" aria-live="polite"><h3>Personalization preview</h3>{previewResults.map((result) => <article key={result.id}><div><strong>{result.fullName}</strong><small>{result.email}</small></div>{result.blockedReason ? <p className="sequence-preview-blocked"><CircleAlert size={14} /> {result.blockedReason}</p> : <><div className="sequence-preview-overrides">{PERSONALIZATION_OVERRIDE_FIELDS.map((field) => <label key={field}>{field.replace("_", " ")}<input value={previewPersonalization[result.id]?.[field] ?? ""} onChange={(event) => updatePreviewPersonalization(result.id, field, event.target.value)} placeholder="Use CRM value" /></label>)}</div>{result.missingFields?.length ? <p className="sequence-preview-missing"><CircleAlert size={14} /> Missing merge values: {result.missingFields.join(", ")}. Add an override, then preview again.</p> : null}<strong>{result.subject || "No subject"}</strong><p>{result.body || "No message text"}</p><small>Change a merge value, then preview again before confirming.</small></>}</article>)}</div>}</div></form></div>}
    {mode === "enrollments" && selectedEnrollment && <EnrollmentDrawer enrollment={selectedEnrollment} onClose={() => selectEnrollment(null)} />}
  </section>;
}

function EnrollmentDrawer({ enrollment, onClose }: { enrollment: Enrollment; onClose: () => void }) {
  return <div className="portal-sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="portal-sheet" role="dialog" aria-modal="true" aria-labelledby="enrollment-inspector-title"><header className="portal-sheet-header"><div><span className="manage-eyebrow">Enrollment inspector</span><h2 id="enrollment-inspector-title">{enrollment.contactName}</h2><p>{enrollment.contactEmail}</p></div><button type="button" className="manage-icon-button" onClick={onClose} aria-label="Close enrollment inspector"><X size={17} /></button></header><div className="portal-sheet-body"><dl className="sequence-inspector-list"><div><dt>Sequence</dt><dd>{enrollment.sequenceName}</dd></div><div><dt>Account</dt><dd>{enrollment.accountName}</dd></div><div><dt>State</dt><dd>{enrollment.state}</dd></div><div><dt>Current step</dt><dd>{enrollment.currentStepPosition || "Pending"}</dd></div><div><dt>Next action</dt><dd>{enrollment.nextActionAt ? formatSequenceDate(enrollment.nextActionAt) : "No action scheduled"}</dd></div><div><dt>Last touch</dt><dd>{enrollment.lastTouchAt ? formatSequenceDate(enrollment.lastTouchAt) : "No touch recorded"}</dd></div><div><dt>Sender mailbox</dt><dd>{enrollment.mailboxAddress}</dd></div><div><dt>Stop reason</dt><dd>{enrollment.stopReason || "—"}</dd></div><div><dt>Created</dt><dd>{formatSequenceDate(enrollment.createdAt)}</dd></div></dl><p className="muted">This view is read-only. Use the row controls to pause, resume, or stop the enrollment.</p><footer className="portal-sheet-actions"><button type="button" className="manage-button manage-button--quiet" onClick={onClose}>Close</button></footer></div></section></div>;
}

function SequenceEditor({ sequence, executionEnabled, busy, activating, onActivate, onAdd, onSave, onReorder, onDelete, onDuplicate, onTestSend, onClone }: { sequence: Sequence; executionEnabled: boolean; busy: boolean; activating: boolean; onActivate: () => void; onAdd: (type: SequenceStepType) => void; onSave: (patch: Record<string, unknown>) => void; onReorder: (stepIds: string[]) => void; onDelete: (stepId: string) => void; onDuplicate: (step: SequenceStep) => void; onTestSend: (stepId: string) => Promise<void>; onClone: () => void }) {
  const sample = { first_name: "Jordan", full_name: "Jordan Lee", company_name: "Northstar Foods", sender_name: "Costivra team" };
  const validation = validateSequenceDraft(sequence, { forActivation: true });
  const activation = sequenceActivationUiState(sequence.status, validation.valid, activating, executionEnabled);
  const readOnly = sequence.status !== "draft";
  const [previewWidth, setPreviewWidth] = useState<"mobile" | "desktop">("desktop");
  const previewStep = [...sequence.steps].sort((a, b) => a.position - b.position)[0] ?? null;
  const previewWarnings = validation.errors.filter((error) => error.toLowerCase().includes("unknown template token"));
  const saveStep = async (stepId: string, patch: Record<string, unknown>) => { await requestJson(`/api/manage/outreach/sequences/${sequence.id}/steps/${stepId}`, { method: "PATCH", body: JSON.stringify(patch) }); };
  const move = (index: number, direction: -1 | 1) => { const ids = sequence.steps.map((item) => item.id); const target = index + direction; if (target < 0 || target >= ids.length) return; [ids[index], ids[target]] = [ids[target], ids[index]]; onReorder(ids); };
  return <div><div className="sequence-editor__header"><div><span className="manage-eyebrow">{sequence.status} · {sequence.steps.length} steps</span><h3>{sequence.name}</h3><p>{sequence.description || "Add a short description so another operator understands the intent."}</p></div><div className="sequence-editor__header-actions"><span className="sequence-disabled-badge">{activation.badge}</span><button className="manage-icon-button" onClick={onClone} disabled={busy} aria-label={`Clone ${sequence.name}`} title="Clone sequence"><Copy size={14} /></button></div></div><div className="sequence-safety"><div><strong>Safety controls</strong><span>Stop on reply, bounce, and unsubscribe are always required.</span></div><div className="sequence-safety__checks"><span><Check size={14} /> Reply</span><span><Check size={14} /> Bounce</span><span><Check size={14} /> Unsubscribe</span></div></div>{readOnly && <div className="manage-inline-alert manage-inline-alert--warning" role="status"><strong>This sequence is locked.</strong><span>{sequence.status === "active" ? "Active sequences cannot be edited while they are eligible to run." : "Paused sequences cannot be edited until they are returned to draft."}</span></div>}{!validation.valid && <div className="manage-inline-alert manage-inline-alert--warning" role="status"><strong>Execution setup required.</strong><span>{validation.errors.slice(0, 3).join(" ")}{validation.errors.length > 3 ? ` +${validation.errors.length - 3} more.` : ""}</span></div>}<div className="sequence-timeline">{sequence.steps.map((step, index) => <SequenceStepCard key={step.id} step={step} index={index} total={sequence.steps.length} sample={sample} readOnly={readOnly} onSave={saveStep} onMove={(direction) => move(index, direction)} onDelete={() => onDelete(step.id)} onDuplicate={() => onDuplicate(step)} onTestSend={onTestSend} />)}{!sequence.steps.length && <div className="manage-empty"><strong>Add the first step.</strong><p>Use an immediate manual email, automatic email, call task, or general task.</p></div>}</div><div className="sequence-add-row"><button className="manage-button manage-button--quiet" onClick={() => onAdd("manual_email")} disabled={busy || readOnly}><Plus size={15} /> Manual email</button><button className="manage-button manage-button--quiet" onClick={() => onAdd("automatic_email")} disabled={busy || readOnly}><Plus size={15} /> Automatic email</button><button className="manage-button manage-button--quiet" onClick={() => onAdd("call_task")} disabled={busy || readOnly}><Plus size={15} /> Call task</button><button className="manage-button manage-button--quiet" onClick={() => onAdd("general_task")} disabled={busy || readOnly}><Plus size={15} /> General task</button></div><div className="sequence-editor__footer"><label>Timezone<select disabled={readOnly || busy} defaultValue={sequence.timezone} onChange={(event) => onSave({ timezone: event.target.value })}><option value="America/Chicago">Central time</option><option value="America/New_York">Eastern time</option><option value="America/Los_Angeles">Pacific time</option><option value="UTC">UTC</option></select></label><label>Send window<select disabled={readOnly || busy} defaultValue={`${sequence.sendStartLocal}-${sequence.sendEndLocal}`} onChange={(event) => { const [sendStartLocal, sendEndLocal] = event.target.value.split("-"); onSave({ sendStartLocal, sendEndLocal }); }}><option value="09:00-17:00">09:00–17:00</option><option value="08:00-16:00">08:00–16:00</option><option value="10:00-18:00">10:00–18:00</option></select></label><label>Daily cap<input disabled={readOnly || busy} type="number" min={1} max={100} defaultValue={sequence.dailySendLimit} onBlur={(event) => onSave({ dailySendLimit: Number(event.target.value) })} /></label><button className="manage-button manage-button--primary" onClick={onActivate} disabled={activation.disabled}><Check size={15} /> {activation.buttonLabel}</button></div><div className="sequence-business-days"><span>Business days</span>{[1, 2, 3, 4, 5].map((day) => <button key={day} type="button" className={sequence.businessDays.includes(day) ? "is-selected" : ""} disabled={readOnly || busy} onClick={() => onSave({ businessDays: sequence.businessDays.includes(day) ? sequence.businessDays.filter((value) => value !== day) : [...sequence.businessDays, day].sort() })}>{["Mon", "Tue", "Wed", "Thu", "Fri"][day - 1]}</button>)}</div><SequenceBuilderPreview step={previewStep} sample={sample} width={previewWidth} warnings={previewWarnings} onWidthChange={setPreviewWidth} /></div>;
}

function SequenceBuilderPreview({ step, sample, width, warnings, onWidthChange }: { step: SequenceStep | null; sample: Record<string, string>; width: "mobile" | "desktop"; warnings: string[]; onWidthChange: (width: "mobile" | "desktop") => void }) {
  const isEmail = step ? step.stepType === "manual_email" || step.stepType === "automatic_email" : false;
  const subject = step ? renderTemplate(step.subjectTemplate ?? step.taskTitleTemplate, sample) : "";
  const body = step ? renderTemplate(step.bodyText ?? step.taskNotesTemplate, sample) : "";
  const richBody = step ? sanitizeEmailHtml(renderTemplate(step.bodyHtml, sample)) : "";
  return <section className="sequence-builder-preview" aria-labelledby="sequence-builder-preview-title"><header className="sequence-builder-preview__header"><div><span className="manage-eyebrow">Preview</span><strong id="sequence-builder-preview-title">Jordan Lee · Northstar Foods</strong><small>{isEmail ? "Sample email · sender Costivra team" : step ? "Sample task" : "Add a step to preview it"}</small></div><div className="sequence-builder-preview__widths" role="group" aria-label="Preview width"><button type="button" className={width === "desktop" ? "is-selected" : ""} onClick={() => onWidthChange("desktop")}>Desktop</button><button type="button" className={width === "mobile" ? "is-selected" : ""} onClick={() => onWidthChange("mobile")}>Mobile</button></div></header>{warnings.length > 0 && <div className="manage-inline-alert manage-inline-alert--warning" role="status"><CircleAlert size={15} /><span>Unresolved template token: {warnings.join(" ")}</span></div>}<div className={`sequence-builder-preview__frame sequence-builder-preview__frame--${width}`}>{step ? <><span className="sequence-builder-preview__meta">{isEmail ? "To Jordan Lee · jordan@example.com" : "Internal task preview"}</span><h4>{subject || "No subject or task title"}</h4>{isEmail && richBody ? <><span className="sequence-builder-preview__label">Rendered preview</span><div className="sequence-builder-preview__rich" aria-label="Rendered email preview" dangerouslySetInnerHTML={{ __html: richBody }} /></> : null}<span className={isEmail && richBody ? "sequence-builder-preview__label" : "sr-only"}>Plain-text preview</span><p>{body || "No preview text has been saved yet."}</p></> : <p className="sequence-builder-preview__empty">Add an email or task step to see a deterministic sample here.</p>}</div></section>;
}

function SequenceStepCard({ step, index, total, sample, readOnly, onSave, onMove, onDelete, onDuplicate, onTestSend }: { step: SequenceStep; index: number; total: number; sample: Record<string, string>; readOnly: boolean; onSave: (stepId: string, patch: Record<string, unknown>) => Promise<void>; onMove: (direction: -1 | 1) => void; onDelete: () => void; onDuplicate: () => void; onTestSend: (stepId: string) => Promise<void> }) {
  const preview = step.subjectTemplate ? renderTemplate(step.subjectTemplate, sample) : step.taskTitleTemplate ? renderTemplate(step.taskTitleTemplate, sample) : "Untitled step";
  const [subject, setSubject] = useState(step.subjectTemplate ?? step.taskTitleTemplate ?? "");
  const [body, setBody] = useState(step.bodyText ?? step.taskNotesTemplate ?? "");
  const [threadMode, setThreadMode] = useState<SequenceStep["threadMode"]>(step.threadMode);
  const [saving, setSaving] = useState(false);
  const insertVariable = (field: string) => setBody((value) => `${value}${value && !value.endsWith("\n") ? "\n" : ""}{{${field}}}`);
  const save = async () => { setSaving(true); try { await onSave(step.id, step.stepType === "manual_email" || step.stepType === "automatic_email" ? { subjectTemplate: subject, bodyText: body, bodyHtml: `<p>${body.replace(/\n/g, "</p><p>")}</p>`, threadMode } : { taskTitleTemplate: subject, taskNotesTemplate: body }); } finally { setSaving(false); } };
  return <article className="sequence-step-card"><div className="sequence-step-card__rail"><span>{String(index + 1).padStart(2, "0")}</span>{index < total - 1 && <i />}</div><div className="sequence-step-card__body"><header><div><span className="sequence-step-type">{stepLabel(step.stepType)}</span><h4>{preview}</h4></div><div className="sequence-step-controls"><button disabled={readOnly || index === 0} onClick={() => onMove(-1)} aria-label="Move step up"><ArrowUp size={14} /></button><button disabled={readOnly || index === total - 1} onClick={() => onMove(1)} aria-label="Move step down"><ArrowDown size={14} /></button><button disabled={readOnly} onClick={onDuplicate} aria-label="Duplicate step"><Copy size={14} /></button><button disabled={readOnly} aria-label="Delete step" onClick={onDelete}><Trash2 size={14} /></button></div></header><p className="sequence-step-delay">{index === 0 ? "Starts immediately" : `After ${step.delayValue} ${step.delayUnit.replace("_", " ")}`}{step.pauseUntilTaskComplete ? " · waits for completion" : ""}</p><div className="sequence-step-fields">{(step.stepType === "manual_email" || step.stepType === "automatic_email") && <label>Thread mode<select disabled={readOnly} value={threadMode ?? "new_thread"} onChange={(event) => setThreadMode(event.target.value as SequenceStep["threadMode"])}><option value="new_thread">New thread</option><option value="reply_to_previous">Reply to previous</option></select></label>}<label>{step.stepType === "manual_email" || step.stepType === "automatic_email" ? "Subject" : "Task title"}<input readOnly={readOnly} value={subject} onChange={(event) => setSubject(event.target.value)} /></label><label>{step.stepType === "manual_email" || step.stepType === "automatic_email" ? "Message text" : "Task notes"}<textarea readOnly={readOnly} value={body} onChange={(event) => setBody(event.target.value)} rows={3} /></label><label className="sequence-step-variable">Insert merge field<select disabled={readOnly} value="" aria-label="Insert merge field" onChange={(event) => insertVariable(event.target.value)}><option value="">Choose a field…</option>{TEMPLATE_TOKENS.map((field) => <option key={field} value={field}>{templateFieldLabel(field)}</option>)}</select></label><div className="sequence-step-actions"><button className="manage-button manage-button--quiet" onClick={() => void save()} disabled={readOnly || saving}>{saving ? "Saving…" : "Save step"}</button>{(step.stepType === "manual_email" || step.stepType === "automatic_email") && <button className="manage-button manage-button--quiet" onClick={() => void onTestSend(step.id)} disabled={readOnly || saving} title="Sends only to your verified operator email"><Eye size={14} /> Test to me</button>}</div></div></div></article>;
}
