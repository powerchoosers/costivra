"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Check,
  CircleAlert,
  Copy,
  Eye,
  FileText,
  GripVertical,
  LoaderCircle,
  Mail,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Send,
  Settings2,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Sequence, SequenceStep, SequenceStepType } from "@/lib/manage/sequences/types";
import { TEMPLATE_TOKENS } from "@/lib/manage/sequences/validation";
import { sequenceActivationUiState } from "@/lib/manage/sequences/ui-state";

export type SequenceStepAddOptions = {
  afterStepId?: string | null;
  delayValue?: number;
  delayUnit?: SequenceStep["delayUnit"];
};

type Props = {
  sequence: Sequence;
  executionEnabled: boolean;
  busy: boolean;
  activation: ReturnType<typeof sequenceActivationUiState>;
  validationErrors: string[];
  readOnly: boolean;
  onActivate: () => void;
  onAdd: (type: SequenceStepType, options?: SequenceStepAddOptions) => Promise<string | undefined>;
  onSave: (patch: Record<string, unknown>) => Promise<void>;
  onSaveStep: (stepId: string, patch: Record<string, unknown>) => Promise<void>;
  onReorder: (stepIds: string[]) => void;
  onDelete: (stepId: string) => void;
  onDuplicate: (step: SequenceStep) => void;
  onTestSend: (stepId: string) => Promise<void>;
  onClone: () => void;
};

type InsertTarget = { afterStepId: string | null; closing: boolean } | null;

const STEP_OPTIONS = [
  { type: "automatic_email" as const, label: "Email", description: "Send a reviewed email", icon: Mail },
  { type: "manual_email" as const, label: "Manual email", description: "Create an email task", icon: FileText },
  { type: "call_task" as const, label: "Call", description: "Ask an owner to call", icon: Users },
  { type: "general_task" as const, label: "Task", description: "Create a follow-up task", icon: Check },
];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

function isEmailStep(step: SequenceStep) {
  return step.stepType === "manual_email" || step.stepType === "automatic_email";
}

function stepLabel(type: SequenceStepType) {
  return type === "manual_email" ? "Manual email" : type === "automatic_email" ? "Email" : type === "call_task" ? "Call" : "Task";
}

function stepTitle(step: SequenceStep) {
  return step.subjectTemplate || step.taskTitleTemplate || `Untitled ${stepLabel(step.stepType).toLowerCase()}`;
}

function stepSummary(step: SequenceStep) {
  return step.bodyText || step.taskNotesTemplate || "Add the details for this step.";
}

function delayLabel(value: number, unit: SequenceStep["delayUnit"]) {
  const label = unit === "business_days"
    ? "business day"
    : unit === "calendar_days"
      ? "calendar day"
      : unit === "hours"
        ? "hour"
        : "minute";
  return `${value} ${label}${value === 1 ? "" : "s"}`;
}

function templateFieldLabel(field: string) {
  return field.replace(/_/g, " ");
}

function plainTextToHtml(value: string) {
  const escaped = value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
  return escaped
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function SequenceMachine({
  sequence,
  executionEnabled,
  busy,
  activation,
  validationErrors,
  readOnly,
  onActivate,
  onAdd,
  onSave,
  onSaveStep,
  onReorder,
  onDelete,
  onDuplicate,
  onTestSend,
  onClone,
}: Props) {
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [insertTarget, setInsertTarget] = useState<InsertTarget>(null);
  const insertCloseTimer = useRef<number | null>(null);
  const orderedSteps = useMemo(() => [...sequence.steps].sort((left, right) => left.position - right.position), [sequence.steps]);
  const stepIds = useMemo(() => orderedSteps.map((step) => step.id), [orderedSteps]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => () => {
    if (insertCloseTimer.current !== null) window.clearTimeout(insertCloseTimer.current);
  }, []);

  const closeInsert = (immediate = false) => {
    if (!insertTarget || insertTarget.closing) return;
    const triggerId = `sequence-insert-trigger-${insertTarget.afterStepId ?? "start"}`;
    if (immediate) {
      if (insertCloseTimer.current !== null) window.clearTimeout(insertCloseTimer.current);
      setInsertTarget(null);
      return;
    }
    setInsertTarget({ ...insertTarget, closing: true });
    if (insertCloseTimer.current !== null) window.clearTimeout(insertCloseTimer.current);
    insertCloseTimer.current = window.setTimeout(() => {
      setInsertTarget(null);
      insertCloseTimer.current = null;
      document.getElementById(triggerId)?.focus();
    }, 180);
  };

  useEffect(() => {
    if (!insertTarget) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeInsert();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    if (!overId || activeId === overId || readOnly || busy) return;
    const oldIndex = stepIds.indexOf(activeId);
    const newIndex = stepIds.indexOf(overId);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(stepIds, oldIndex, newIndex));
  };

  const moveStep = (stepId: string, direction: -1 | 1) => {
    const index = stepIds.indexOf(stepId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= stepIds.length) return;
    onReorder(arrayMove(stepIds, index, nextIndex));
  };

  const addStep = async (type: SequenceStepType, options?: SequenceStepAddOptions) => {
    const createdId = await onAdd(type, options);
    if (createdId) {
      setExpandedStepId(createdId);
      closeInsert(true);
    }
    return createdId;
  };

  const readinessMessage = !executionEnabled
    ? "Execution is disabled for this release. You can still build and review the sequence."
    : validationErrors.length
      ? `${validationErrors.length} item${validationErrors.length === 1 ? "" : "s"} needs attention before activation.`
      : "This sequence is ready for review.";

  return <section className="sequence-machine" aria-label={`${sequence.name} sequence builder`}>
    <header className="sequence-machine__bar">
      <div className="sequence-machine__identity">
        <span className="sequence-machine__status"><i className={`sequence-status-dot sequence-status-dot--${sequence.status}`} /> {sequence.status}</span>
        <h3>{sequence.name}</h3>
        <p>{sequence.description || "A clear, chronological follow-up plan."}</p>
      </div>
      <div className="sequence-machine__actions">
        <Link href="/manage/mail?view=sequence&mode=queue&status=queued" className="manage-button manage-button--quiet"><CalendarClock size={15} /> Queue{sequence.scheduledNext24Hours > 0 ? ` (${sequence.scheduledNext24Hours})` : ""}</Link>
        <button type="button" className="manage-button manage-button--quiet" onClick={onClone} disabled={busy}><Copy size={15} /> Duplicate</button>
        <button type="button" className="manage-button manage-button--primary" onClick={onActivate} disabled={activation.disabled}><Send size={15} /> {activation.buttonLabel}</button>
      </div>
    </header>

    {readOnly && <div className="manage-inline-alert manage-inline-alert--warning" role="status"><strong>This sequence is locked.</strong><span>{sequence.status === "active" ? "Pause it before changing the flow." : "Return it to draft before editing."}</span></div>}
    {!readOnly && (!executionEnabled || validationErrors.length > 0) && <div className="sequence-machine__readiness" role="status"><CircleAlert size={16} /><span>{readinessMessage}{validationErrors.length > 0 ? ` ${validationErrors.slice(0, 2).join(" ")}` : ""}</span></div>}

    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={stepIds} strategy={verticalListSortingStrategy}>
        <ol className="sequence-machine__flow" aria-label="Chronological sequence steps">
          <li className="sequence-machine__start"><span>Start</span><strong>When a contact is enrolled</strong></li>
          {orderedSteps.length === 0
            ? <SequenceInsertControl afterStepId={null} first disabled={busy || readOnly} open={insertTarget?.afterStepId === null} closing={insertTarget?.closing === true} onOpen={() => setInsertTarget({ afterStepId: null, closing: false })} onClose={closeInsert} onAdd={addStep} />
            : orderedSteps.map((step, index) => <SequenceFlowItem
              key={step.id}
              step={step}
              index={index}
              total={orderedSteps.length}
              expanded={expandedStepId === step.id && stepIds.includes(step.id)}
              busy={busy}
              readOnly={readOnly}
              onToggle={() => setExpandedStepId((current) => current === step.id ? null : step.id)}
              onSave={onSaveStep}
              onMove={moveStep}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onTestSend={onTestSend}
              insertOpen={insertTarget?.afterStepId === step.id}
              insertClosing={insertTarget?.afterStepId === step.id && insertTarget?.closing === true}
              onOpenInsert={() => setInsertTarget({ afterStepId: step.id, closing: false })}
              onCloseInsert={closeInsert}
              onAdd={addStep}
            />)}
        </ol>
      </SortableContext>
    </DndContext>

    <details className="sequence-machine__settings">
      <summary><span><Settings2 size={15} /> Delivery settings</span><small>{sequence.timezone.replace("America/", "")} · {sequence.sendStartLocal}–{sequence.sendEndLocal}</small></summary>
      <div className="sequence-machine__settings-body">
        <label>Timezone<select disabled={readOnly || busy} value={sequence.timezone} onChange={(event) => void onSave({ timezone: event.target.value })}><option value="America/Chicago">Central time</option><option value="America/New_York">Eastern time</option><option value="America/Los_Angeles">Pacific time</option><option value="UTC">UTC</option></select></label>
        <label>Send window<select disabled={readOnly || busy} value={`${sequence.sendStartLocal}-${sequence.sendEndLocal}`} onChange={(event) => { const [sendStartLocal, sendEndLocal] = event.target.value.split("-"); void onSave({ sendStartLocal, sendEndLocal }); }}><option value="09:00-17:00">09:00–17:00</option><option value="08:00-16:00">08:00–16:00</option><option value="10:00-18:00">10:00–18:00</option></select></label>
        <label>Daily cap<input disabled={readOnly || busy} type="number" min={1} max={100} defaultValue={sequence.dailySendLimit} onBlur={(event) => { const dailySendLimit = Number(event.target.value); if (Number.isInteger(dailySendLimit) && dailySendLimit >= 1 && dailySendLimit <= 100) void onSave({ dailySendLimit }); }} /></label>
        <div className="sequence-machine__weekdays"><span>Business days</span>{[1, 2, 3, 4, 5].map((day) => <button key={day} type="button" className={sequence.businessDays.includes(day) ? "is-selected" : ""} disabled={readOnly || busy} onClick={() => void onSave({ businessDays: sequence.businessDays.includes(day) ? sequence.businessDays.filter((value) => value !== day) : [...sequence.businessDays, day].sort() })}>{DAY_LABELS[day - 1]}</button>)}</div>
        <p><Check size={14} /> Stops on reply, bounce, and unsubscribe.</p>
      </div>
    </details>
  </section>;
}

function SequenceFlowItem({
  step,
  index,
  total,
  expanded,
  busy,
  readOnly,
  onToggle,
  onSave,
  onMove,
  onDelete,
  onDuplicate,
  onTestSend,
  insertOpen,
  insertClosing,
  onOpenInsert,
  onCloseInsert,
  onAdd,
}: {
  step: SequenceStep;
  index: number;
  total: number;
  expanded: boolean;
  busy: boolean;
  readOnly: boolean;
  onToggle: () => void;
  onSave: (stepId: string, patch: Record<string, unknown>) => Promise<void>;
  onMove: (stepId: string, direction: -1 | 1) => void;
  onDelete: (stepId: string) => void;
  onDuplicate: (step: SequenceStep) => void;
  onTestSend: (stepId: string) => Promise<void>;
  insertOpen: boolean;
  insertClosing: boolean;
  onOpenInsert: () => void;
  onCloseInsert: (immediate?: boolean) => void;
  onAdd: (type: SequenceStepType, options?: SequenceStepAddOptions) => Promise<string | undefined>;
}) {
  return <>
    <SequenceDelayConnector step={step} first={index === 0} />
    <SortableSequenceCard step={step} index={index} total={total} expanded={expanded} busy={busy} readOnly={readOnly} onToggle={onToggle} onSave={onSave} onMove={onMove} onDelete={onDelete} onDuplicate={onDuplicate} onTestSend={onTestSend} />
    <SequenceInsertControl afterStepId={step.id} disabled={busy || readOnly} open={insertOpen} closing={insertClosing} onOpen={onOpenInsert} onClose={onCloseInsert} onAdd={onAdd} />
  </>;
}

function SequenceDelayConnector({ step, first }: { step: SequenceStep; first: boolean }) {
  return <li className={`sequence-machine__connector${first ? " is-first" : ""}`} aria-label={first ? "Starts immediately" : `Wait ${delayLabel(step.delayValue, step.delayUnit)}`}>
    <span>{first ? "Starts immediately" : <><CalendarClock size={13} /> Wait {delayLabel(step.delayValue, step.delayUnit)}</>}</span>
    <ArrowDown size={15} aria-hidden="true" />
  </li>;
}

function SequenceInsertControl({ afterStepId, first = false, disabled, open, closing, onOpen, onClose, onAdd }: {
  afterStepId: string | null;
  first?: boolean;
  disabled: boolean;
  open: boolean;
  closing: boolean;
  onOpen: () => void;
  onClose: (immediate?: boolean) => void;
  onAdd: (type: SequenceStepType, options?: SequenceStepAddOptions) => Promise<string | undefined>;
}) {
  return <li className="sequence-machine__insert">
    <span className="sequence-machine__insert-line" aria-hidden="true" />
    <button id={`sequence-insert-trigger-${afterStepId ?? "start"}`} type="button" className="sequence-machine__insert-button" onClick={open ? () => onClose() : onOpen} disabled={disabled} aria-haspopup="dialog" aria-expanded={open} aria-label={first ? "Add the first sequence step" : "Add the next sequence step"}><Plus size={17} /></button>
    {open && <SequenceInsertPopover afterStepId={afterStepId} first={first} closing={closing} onClose={onClose} onAdd={onAdd} />}
  </li>;
}

function SequenceInsertPopover({ afterStepId, first, closing, onClose, onAdd }: {
  afterStepId: string | null;
  first: boolean;
  closing: boolean;
  onClose: (immediate?: boolean) => void;
  onAdd: (type: SequenceStepType, options?: SequenceStepAddOptions) => Promise<string | undefined>;
}) {
  const [stepType, setStepType] = useState<SequenceStepType>("automatic_email");
  const [delayValue, setDelayValue] = useState(first ? 0 : 2);
  const [delayUnit, setDelayUnit] = useState<SequenceStep["delayUnit"]>("business_days");
  const [creating, setCreating] = useState(false);
  const selected = STEP_OPTIONS.find((option) => option.type === stepType) ?? STEP_OPTIONS[0];

  const create = async () => {
    setCreating(true);
    const created = await onAdd(stepType, {
      afterStepId,
      delayValue: first ? 0 : Math.max(0, Math.trunc(Number(delayValue) || 0)),
      delayUnit,
    });
    if (!created) setCreating(false);
  };

  return <div className={`sequence-machine__insert-popover${closing ? " is-closing" : ""}`} role="dialog" aria-label="Add sequence step">
      <div className="sequence-machine__insert-heading"><div><strong>Add next step</strong><span>Choose what happens next and when it starts.</span></div><button type="button" onClick={() => onClose()} aria-label="Close add step"><X size={16} /></button></div>
      <div className="sequence-machine__type-grid">
        {STEP_OPTIONS.map((option) => {
          const Icon = option.icon;
          return <button key={option.type} type="button" className={stepType === option.type ? "is-selected" : ""} onClick={() => setStepType(option.type)}><Icon size={16} /><span><strong>{option.label}</strong><small>{option.description}</small></span></button>;
        })}
      </div>
      <fieldset className="sequence-machine__insert-timing" disabled={first}>
        <legend>When should it start?</legend>
        {first ? <p>The first step starts immediately when a contact is enrolled.</p> : <div><label>Wait<input type="number" min={0} value={delayValue} onChange={(event) => setDelayValue(Math.max(0, Number(event.target.value)))} /></label><label>Unit<select value={delayUnit} onChange={(event) => setDelayUnit(event.target.value as SequenceStep["delayUnit"])}><option value="minutes">Minutes</option><option value="hours">Hours</option><option value="business_days">Business days</option><option value="calendar_days">Calendar days</option></select></label></div>}
      </fieldset>
      <button type="button" className="manage-button manage-button--primary" onClick={() => void create()} disabled={creating}>{creating ? <><LoaderCircle className="spin" size={15} /> Adding…</> : <><Plus size={15} /> Add {selected.label.toLowerCase()}</>}</button>
    </div>;
}

function SortableSequenceCard({ step, index, total, expanded, busy, readOnly, onToggle, onSave, onMove, onDelete, onDuplicate, onTestSend }: {
  step: SequenceStep;
  index: number;
  total: number;
  expanded: boolean;
  busy: boolean;
  readOnly: boolean;
  onToggle: () => void;
  onSave: (stepId: string, patch: Record<string, unknown>) => Promise<void>;
  onMove: (stepId: string, direction: -1 | 1) => void;
  onDelete: (stepId: string) => void;
  onDuplicate: (step: SequenceStep) => void;
  onTestSend: (stepId: string) => Promise<void>;
}) {
  const { attributes, listeners, setActivatorNodeRef, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id, disabled: readOnly || busy });
  const [menuOpen, setMenuOpen] = useState(false);
  const style = { transform: CSS.Transform.toString(transform), transition };
  const Icon = step.stepType === "automatic_email" ? Mail : step.stepType === "manual_email" ? FileText : step.stepType === "call_task" ? Users : Check;

  return <li ref={setNodeRef} style={style} className={`sequence-machine__card${expanded ? " is-expanded" : ""}${isDragging ? " is-dragging" : ""}`}>
    <header className="sequence-machine__card-header">
      <button type="button" className="sequence-machine__card-summary" onClick={onToggle} aria-expanded={expanded}>
        <span className="sequence-machine__card-icon"><Icon size={17} /></span>
        <span className="sequence-machine__card-copy"><small>Step {String(index + 1).padStart(2, "0")} · {stepLabel(step.stepType)}</small><strong>{stepTitle(step)}</strong><em>{stepSummary(step)}</em></span>
      </button>
      <div className="sequence-machine__card-actions">
        <button ref={setActivatorNodeRef} type="button" className="sequence-machine__icon-button sequence-machine__drag" aria-label={`Drag step ${index + 1}`} disabled={readOnly || busy} onClick={(event) => event.stopPropagation()} {...attributes} {...listeners}><GripVertical size={17} /></button>
        <button type="button" className="sequence-machine__icon-button" onClick={onToggle} aria-label={expanded ? "Collapse step" : "Edit step"}>{expanded ? <ArrowUp size={16} /> : <ArrowDown size={16} />}</button>
        <div className="sequence-machine__more-wrap"><button type="button" className="sequence-machine__icon-button" onClick={() => setMenuOpen((value) => !value)} aria-haspopup="menu" aria-expanded={menuOpen} aria-label="More step actions"><MoreHorizontal size={17} /></button>{menuOpen && <div className="sequence-machine__more-menu" role="menu"><button type="button" role="menuitem" disabled={readOnly || busy || index === 0} onClick={() => { onMove(step.id, -1); setMenuOpen(false); }}><ArrowUp size={14} /> Move earlier</button><button type="button" role="menuitem" disabled={readOnly || busy || index === total - 1} onClick={() => { onMove(step.id, 1); setMenuOpen(false); }}><ArrowDown size={14} /> Move later</button><button type="button" role="menuitem" disabled={readOnly || busy} onClick={() => { onDuplicate(step); setMenuOpen(false); }}><Copy size={14} /> Duplicate</button><button type="button" role="menuitem" className="is-danger" disabled={readOnly || busy} onClick={() => { onDelete(step.id); setMenuOpen(false); }}><Trash2 size={14} /> Delete</button></div>}</div>
      </div>
    </header>
    {expanded && <SequenceStepEditor step={step} index={index} busy={busy} readOnly={readOnly} onSave={onSave} onTestSend={onTestSend} />}
  </li>;
}

function SequenceStepEditor({ step, index, busy, readOnly, onSave, onTestSend }: {
  step: SequenceStep;
  index: number;
  busy: boolean;
  readOnly: boolean;
  onSave: (stepId: string, patch: Record<string, unknown>) => Promise<void>;
  onTestSend: (stepId: string) => Promise<void>;
}) {
  const isEmail = isEmailStep(step);
  const [title, setTitle] = useState(step.subjectTemplate ?? step.taskTitleTemplate ?? "");
  const [body, setBody] = useState(step.bodyText ?? step.taskNotesTemplate ?? "");
  const [threadMode, setThreadMode] = useState<SequenceStep["threadMode"]>(step.threadMode ?? "new_thread");
  const [delayValue, setDelayValue] = useState(step.delayValue);
  const [delayUnit, setDelayUnit] = useState<SequenceStep["delayUnit"]>(step.delayUnit);
  const [priority, setPriority] = useState<NonNullable<SequenceStep["taskPriority"]>>(step.taskPriority ?? "normal");
  const [pauseUntilComplete, setPauseUntilComplete] = useState(step.pauseUntilTaskComplete);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantIntent, setAssistantIntent] = useState("");
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const addToken = (field: string) => {
    if (!field) return;
    setBody((current) => `${current}${current && !current.endsWith("\n") ? "\n" : ""}{{${field}}}`);
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const timing = { delayValue: index === 0 ? 0 : Math.max(0, Math.trunc(Number(delayValue) || 0)), delayUnit };
      await onSave(step.id, isEmail
        ? { ...timing, subjectTemplate: title, bodyText: body, bodyHtml: plainTextToHtml(body), threadMode }
        : { ...timing, taskTitleTemplate: title, taskNotesTemplate: body, taskPriority: priority, pauseUntilTaskComplete: pauseUntilComplete });
      setMessage("Saved");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Could not save this step.");
    } finally {
      setSaving(false);
    }
  };

  const generateDraft = async () => {
    setAssistantBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/manage/outreach/sequences/${step.sequenceId}/steps/${step.id}/draft`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ intent: assistantIntent }) });
      const payload = await response.json() as { subjectTemplate?: string; bodyText?: string; error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not draft the email.");
      if (typeof payload.subjectTemplate === "string") setTitle(payload.subjectTemplate);
      if (typeof payload.bodyText === "string") setBody(payload.bodyText);
      setAssistantOpen(false);
      setMessage("Draft applied. Review it, then save the step.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Could not draft the email.");
    } finally {
      setAssistantBusy(false);
    }
  };

  return <div className="sequence-machine__editor">
    {index === 0 ? <div className="sequence-machine__timing-note"><CalendarClock size={15} /><span>This first step starts immediately after enrollment.</span></div> : <div className="sequence-machine__timing-fields"><span>Start this step after</span><label><input type="number" min={0} disabled={readOnly || busy} value={delayValue} onChange={(event) => setDelayValue(Math.max(0, Number(event.target.value)))} /><span>Delay</span></label><label><select disabled={readOnly || busy} value={delayUnit} onChange={(event) => setDelayUnit(event.target.value as SequenceStep["delayUnit"])}><option value="minutes">Minutes</option><option value="hours">Hours</option><option value="business_days">Business days</option><option value="calendar_days">Calendar days</option></select><span>Unit</span></label></div>}
    {isEmail && <div className="sequence-machine__draft-helper"><div><MessageSquareText size={16} /><span><strong>Draft template</strong><small>Creates editable copy for your review. It never sends an email.</small></span></div><button type="button" className="manage-button manage-button--quiet" disabled={readOnly || busy || assistantBusy} onClick={() => setAssistantOpen((value) => !value)}>{assistantOpen ? "Close" : "Draft with AI"}</button>{assistantOpen && <div className="sequence-machine__draft-form"><label>What should this email accomplish?<textarea value={assistantIntent} onChange={(event) => setAssistantIntent(event.target.value)} rows={3} placeholder="For example: introduce a review of telecom costs and ask for a short call." /></label><button type="button" className="manage-button manage-button--primary" onClick={() => void generateDraft()} disabled={assistantBusy}>{assistantBusy ? <><LoaderCircle className="spin" size={15} /> Drafting…</> : <><RefreshCw size={15} /> Create draft</>}</button></div>}</div>}
    <div className="sequence-machine__form">
      {isEmail && <label>Thread<select disabled={readOnly || busy} value={threadMode ?? "new_thread"} onChange={(event) => setThreadMode(event.target.value as SequenceStep["threadMode"])}><option value="new_thread">Start a new thread</option><option value="reply_to_previous">Reply to the last email</option></select></label>}
      <label>{isEmail ? "Subject" : "Task title"}<input readOnly={readOnly} disabled={busy} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={isEmail ? "Write a clear subject" : "Describe the task"} /></label>
      <label>{isEmail ? "Message" : "Notes"}<textarea readOnly={readOnly} disabled={busy} value={body} onChange={(event) => setBody(event.target.value)} rows={isEmail ? 10 : 6} placeholder={isEmail ? "Write the message…" : "Add instructions for the owner…"} /></label>
      {!isEmail && <div className="sequence-machine__task-options"><label>Priority<select disabled={readOnly || busy} value={priority} onChange={(event) => setPriority(event.target.value as NonNullable<SequenceStep["taskPriority"]>)}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option></select></label><label className="sequence-machine__checkbox"><input type="checkbox" disabled={readOnly || busy} checked={pauseUntilComplete} onChange={(event) => setPauseUntilComplete(event.target.checked)} /><span>Wait for completion before continuing</span></label></div>}
      <footer className="sequence-machine__form-footer"><label className="sequence-machine__token-select">Insert a merge field<select disabled={readOnly || busy} value="" onChange={(event) => addToken(event.target.value)}><option value="">Choose a field…</option>{TEMPLATE_TOKENS.map((field) => <option key={field} value={field}>{templateFieldLabel(field)}</option>)}</select></label><div><span aria-live="polite">{message}</span><button type="button" className="manage-button manage-button--primary" disabled={readOnly || busy || saving} onClick={() => void save()}>{saving ? "Saving…" : "Save step"}</button>{isEmail && <button type="button" className="manage-button manage-button--quiet" disabled={readOnly || busy || saving} onClick={() => void onTestSend(step.id)}><Eye size={15} /> Test to me</button>}</div></footer>
    </div>
  </div>;
}
