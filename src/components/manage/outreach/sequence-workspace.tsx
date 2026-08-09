"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, ChevronRight, LoaderCircle, Plus, Trash2, Users, X } from "lucide-react";
import type { ManageData } from "@/lib/manage/types";
import type { Sequence, SequenceStep, SequenceStepType, Enrollment } from "@/lib/manage/sequences/types";
import { renderTemplate } from "@/lib/manage/sequences/validation";

type Props = { data: ManageData; query: string; mode?: "sequences" | "enrollments" };

const defaultEmail = {
  subjectTemplate: "Quick question for {{company_name}}",
  bodyHtml: "<p>Hi {{first_name}},</p><p>I wanted to ask a quick question about how {{company_name}} manages recurring costs.</p><p>Would a short conversation be useful?</p><p>Best,<br>{{sender_name}}</p>",
  bodyText: "Hi {{first_name}},\n\nI wanted to ask a quick question about how {{company_name}} manages recurring costs.\n\nWould a short conversation be useful?\n\nBest,\n{{sender_name}}",
};

function requestJson(input: RequestInfo, init?: RequestInit) {
  return fetch(input, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } }).then(async (response) => {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "The request could not be completed.");
    return payload as Record<string, unknown>;
  });
}

function stepLabel(type: SequenceStepType) {
  return type === "manual_email" ? "Manual email" : type === "automatic_email" ? "Automatic email" : type === "call_task" ? "Call task" : "General task";
}

function stepDraft(type: SequenceStepType, position: number) {
  return type === "manual_email" || type === "automatic_email"
    ? { stepType: type, delayValue: position === 1 ? 0 : 2, delayUnit: "business_days", threadMode: position === 1 ? "new_thread" : "reply_to_previous", ...defaultEmail, taskPriority: "normal", pauseUntilTaskComplete: false }
    : { stepType: type, delayValue: position === 1 ? 0 : 1, delayUnit: "business_days", taskTitleTemplate: type === "call_task" ? "Call {{full_name}}" : "Follow up with {{full_name}}", taskNotesTemplate: "Review the contact record before acting.", taskPriority: "normal", pauseUntilTaskComplete: true };
}

export function SequenceWorkspace({ data, query, mode = "sequences" }: Props) {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showEnroll, setShowEnroll] = useState(false);
  const [name, setName] = useState("");
  const [organizationId, setOrganizationId] = useState(data.accounts[0]?.id ?? "");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [mailboxId, setMailboxId] = useState(data.mail.mailboxes.find((item) => item.canSend && item.status === "active")?.id ?? "");

  const selected = sequences.find((item) => item.id === selectedId) ?? null;
  const visibleSequences = useMemo(() => sequences.filter((item) => `${item.name} ${item.description ?? ""}`.toLowerCase().includes(query.toLowerCase())), [query, sequences]);
  const visibleContacts = data.contacts.filter((contact) => contact.status === "active" && (!selected || contact.organizationId === selected.organizationId));

  async function load() {
    setLoading(true); setError(null);
    try {
      const [sequencePayload, enrollmentPayload] = await Promise.all([requestJson("/api/manage/outreach/sequences"), requestJson("/api/manage/outreach/enrollments")]);
      setSequences((sequencePayload.sequences as Sequence[]) ?? []);
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
      setShowNew(false); setName(""); await load(); setSelectedId(String(payload.id));
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

  async function saveSequence(patch: Record<string, unknown>) {
    if (!selected) return;
    setBusy(true); setError(null);
    try { await requestJson(`/api/manage/outreach/sequences/${selected.id}`, { method: "PATCH", body: JSON.stringify(patch) }); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The sequence could not be saved."); }
    finally { setBusy(false); }
  }

  async function enroll(event: React.FormEvent) {
    event.preventDefault(); if (!selected || !mailboxId || !selectedContactIds.length) return;
    setBusy(true); setError(null);
    try { await requestJson("/api/manage/outreach/enrollments", { method: "POST", body: JSON.stringify({ sequenceId: selected.id, mailboxId, contactIds: selectedContactIds }) }); setShowEnroll(false); setSelectedContactIds([]); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Enrollment could not be prepared."); }
    finally { setBusy(false); }
  }

  return <section className="sequence-workspace">
    <header className="manage-page-heading sequence-workspace__heading"><div><p className="manage-eyebrow">Outreach system</p><h2>{mode === "enrollments" ? "Enrollments" : "Sequences"}</h2><p>{mode === "enrollments" ? "Review staged contacts and why a record is waiting. No automatic messages are sent in this release." : "Build a reviewable follow-up plan. Sending and activation stay off until the safety checks are complete."}</p></div><div className="sequence-actions">{mode === "sequences" && <><button className="manage-button manage-button--quiet" onClick={() => setShowEnroll(true)} disabled={!selected}><Users size={15} /> Enroll contacts</button><button className="manage-button manage-button--primary" onClick={() => setShowNew(true)}><Plus size={16} /> New sequence</button></>}</div></header>
    {error && <div className="manage-inline-alert manage-inline-alert--error" role="alert">{error}</div>}
    {loading ? <div className="manage-empty"><LoaderCircle className="spin" size={20} /> Loading sequences…</div> : mode === "enrollments" ? <div className="manage-panel sequence-enrollment-summary"><div className="manage-panel-header"><div><h3>Staged enrollments</h3><p>{enrollments.length} record{enrollments.length === 1 ? "" : "s"} awaiting review</p></div></div>{enrollments.length ? <div className="sequence-enrollment-table">{enrollments.map((item) => <div key={item.id}><span><strong>{item.contactName}</strong><small>{item.sequenceName} · {item.contactEmail} · {item.mailboxAddress}</small></span><em>{item.state}</em></div>)}</div> : <div className="manage-empty"><strong>No pending enrollments.</strong><span>Choose a draft sequence, then stage contacts for review.</span></div>}</div> : <div className="sequence-layout">
      <div className="sequence-list manage-panel"><div className="manage-panel-header"><div><h3>Saved sequences</h3><p>{visibleSequences.length} draft plan{visibleSequences.length === 1 ? "" : "s"}</p></div></div>{visibleSequences.length ? visibleSequences.map((item) => <button key={item.id} className={`sequence-list-item${selectedId === item.id ? " is-selected" : ""}`} onClick={() => setSelectedId(item.id)}><span><strong>{item.name}</strong><small>{item.steps.length} steps · {item.status}</small></span><ChevronRight size={16} /></button>) : <div className="manage-empty"><strong>No sequences yet.</strong><span>Start with one focused, human-reviewable follow-up plan.</span></div>}</div>
      <div className="sequence-editor manage-panel">{selected ? <SequenceEditor sequence={selected} busy={busy} onAdd={addStep} onSave={saveSequence} /> : <div className="manage-empty sequence-editor__empty"><strong>Select a sequence to edit it.</strong><span>Sequences stay in draft mode until a later release adds execution proof.</span></div>}</div>
    </div>}
    {mode === "sequences" && enrollments.length > 0 && <div className="manage-panel sequence-enrollment-summary"><div className="manage-panel-header"><div><h3>Pending enrollment review</h3><p>These records are staged only; no message has been sent.</p></div></div><div className="sequence-enrollment-table">{enrollments.slice(0, 12).map((item) => <div key={item.id}><span><strong>{item.contactName}</strong><small>{item.sequenceName} · {item.contactEmail}</small></span><em>{item.state}</em></div>)}</div></div>}
    {showNew && <div className="portal-sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowNew(false); }}><form className="portal-sheet" onSubmit={createSequence}><div className="portal-sheet-header"><div><span className="manage-eyebrow">Draft only</span><h2>New sequence</h2></div><button type="button" className="manage-icon-button" onClick={() => setShowNew(false)} aria-label="Close"><X size={17} /></button></div><div className="portal-sheet-body"><label>Account<select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} required>{data.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label><label>Name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Renewal follow-up" required /></label><small>We will start with a blank-safe draft. Add content before enrolling anyone.</small><div className="portal-sheet-actions"><button type="button" className="manage-button manage-button--quiet" onClick={() => setShowNew(false)}>Cancel</button><button className="manage-button manage-button--primary" disabled={busy}>{busy ? "Creating…" : "Create draft"}</button></div></div></form></div>}
    {showEnroll && selected && <div className="portal-sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowEnroll(false); }}><form className="portal-sheet" onSubmit={enroll}><div className="portal-sheet-header"><div><span className="manage-eyebrow">Pending only</span><h2>Enroll contacts</h2></div><button type="button" className="manage-icon-button" onClick={() => setShowEnroll(false)} aria-label="Close"><X size={17} /></button></div><div className="portal-sheet-body"><label>Sender mailbox<select value={mailboxId} onChange={(event) => setMailboxId(event.target.value)} required><option value="">Choose a mailbox</option>{data.mail.mailboxes.filter((mailbox) => mailbox.canSend && mailbox.status === "active").map((mailbox) => <option key={mailbox.id} value={mailbox.id}>{mailbox.address}</option>)}</select></label><label>Contacts<select multiple size={Math.min(8, Math.max(3, visibleContacts.length))} value={selectedContactIds} onChange={(event) => setSelectedContactIds(Array.from(event.currentTarget.selectedOptions, (option) => option.value))}>{visibleContacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.fullName} · {contact.email}</option>)}</select><small>Suppressed, inactive, or already enrolled contacts will be blocked by the server.</small></label><div className="portal-sheet-actions"><button type="button" className="manage-button manage-button--quiet" onClick={() => setShowEnroll(false)}>Cancel</button><button className="manage-button manage-button--primary" disabled={busy || !selectedContactIds.length}>{busy ? "Checking…" : "Create pending enrollment"}</button></div></div></form></div>}
  </section>;
}

function SequenceEditor({ sequence, busy, onAdd, onSave }: { sequence: Sequence; busy: boolean; onAdd: (type: SequenceStepType) => void; onSave: (patch: Record<string, unknown>) => void }) {
  const sample = { first_name: "Jordan", full_name: "Jordan Lee", company_name: "Northstar Foods", sender_name: "Costivra team" };
  const saveStep = async (stepId: string, patch: Record<string, unknown>) => { await requestJson(`/api/manage/outreach/sequences/${sequence.id}/steps/${stepId}`, { method: "PATCH", body: JSON.stringify(patch) }); };
  return <div><div className="sequence-editor__header"><div><span className="manage-eyebrow">{sequence.status} · {sequence.steps.length} steps</span><h3>{sequence.name}</h3><p>{sequence.description || "Add a short description so another operator understands the intent."}</p></div><span className="sequence-disabled-badge">Activation unavailable</span></div><div className="sequence-safety"><div><strong>Safety controls</strong><span>Stop on reply, bounce, and unsubscribe are always required.</span></div><div className="sequence-safety__checks"><span><Check size={14} /> Reply</span><span><Check size={14} /> Bounce</span><span><Check size={14} /> Unsubscribe</span></div></div><div className="sequence-timeline">{sequence.steps.map((step, index) => <SequenceStepCard key={step.id} step={step} index={index} total={sequence.steps.length} sample={sample} onSave={saveStep} />)}{!sequence.steps.length && <div className="manage-empty"><strong>Add the first step.</strong><span>Use an immediate manual email, call task, or general task.</span></div>}</div><div className="sequence-add-row"><button className="manage-button manage-button--quiet" onClick={() => onAdd("manual_email")} disabled={busy}><Plus size={15} /> Manual email</button><button className="manage-button manage-button--quiet" onClick={() => onAdd("call_task")} disabled={busy}><Plus size={15} /> Call task</button><button className="manage-button manage-button--quiet" onClick={() => onAdd("general_task")} disabled={busy}><Plus size={15} /> General task</button></div><div className="sequence-editor__footer"><label>Send window<select defaultValue={`${sequence.sendStartLocal}-${sequence.sendEndLocal}`} onChange={(event) => { const [sendStartLocal, sendEndLocal] = event.target.value.split("-"); onSave({ sendStartLocal, sendEndLocal }); }}><option value="09:00-17:00">09:00–17:00</option><option value="08:00-16:00">08:00–16:00</option><option value="10:00-18:00">10:00–18:00</option></select></label><label>Daily cap<input type="number" min={1} max={100} defaultValue={sequence.dailySendLimit} onBlur={(event) => onSave({ dailySendLimit: Number(event.target.value) })} /></label><button className="manage-button manage-button--primary" disabled><Check size={15} /> Activation requires proof</button></div></div>;
}

function SequenceStepCard({ step, index, total, sample, onSave }: { step: SequenceStep; index: number; total: number; sample: Record<string, string>; onSave: (stepId: string, patch: Record<string, unknown>) => Promise<void> }) {
  const preview = step.subjectTemplate ? renderTemplate(step.subjectTemplate, sample) : step.taskTitleTemplate ? renderTemplate(step.taskTitleTemplate, sample) : "Untitled step";
  const [subject, setSubject] = useState(step.subjectTemplate ?? step.taskTitleTemplate ?? "");
  const [body, setBody] = useState(step.bodyText ?? step.taskNotesTemplate ?? "");
  const [saving, setSaving] = useState(false);
  const save = async () => { setSaving(true); try { await onSave(step.id, step.stepType === "manual_email" || step.stepType === "automatic_email" ? { subjectTemplate: subject, bodyText: body, bodyHtml: `<p>${body.replace(/\n/g, "</p><p>")}</p>` } : { taskTitleTemplate: subject, taskNotesTemplate: body }); } finally { setSaving(false); } };
  return <article className="sequence-step-card"><div className="sequence-step-card__rail"><span>{String(index + 1).padStart(2, "0")}</span>{index < total - 1 && <i />}</div><div className="sequence-step-card__body"><header><div><span className="sequence-step-type">{stepLabel(step.stepType)}</span><h4>{preview}</h4></div><div className="sequence-step-controls"><button disabled={index === 0} aria-label="Move step up"><ArrowUp size={14} /></button><button disabled={index === total - 1} aria-label="Move step down"><ArrowDown size={14} /></button><button aria-label="Delete step" disabled><Trash2 size={14} /></button></div></header><p className="sequence-step-delay">{index === 0 ? "Starts immediately" : `After ${step.delayValue} ${step.delayUnit.replace("_", " ")}`}{step.pauseUntilTaskComplete ? " · waits for completion" : ""}</p><div className="sequence-step-fields"><label>{step.stepType === "manual_email" || step.stepType === "automatic_email" ? "Subject" : "Task title"}<input value={subject} onChange={(event) => setSubject(event.target.value)} /></label><label>{step.stepType === "manual_email" || step.stepType === "automatic_email" ? "Message text" : "Task notes"}<textarea value={body} onChange={(event) => setBody(event.target.value)} rows={3} /></label><button className="manage-button manage-button--quiet" onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : "Save step"}</button></div></div></article>;
}
