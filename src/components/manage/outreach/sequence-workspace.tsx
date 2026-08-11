"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Archive, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CalendarClock, Check, ChevronDown, ChevronUp, CircleAlert, Copy, Eye, FileText, LoaderCircle, Mail, MessageSquareText, MoreHorizontal, Pause, Play, Plus, RefreshCw, Search, Send, Settings2, Trash2, Users, X } from "@/lib/icons";
import type { ManageData } from "@/lib/manage/types";
import type { Sequence, SequenceStep, SequenceStepType, Enrollment } from "@/lib/manage/sequences/types";
import { sanitizeEmailHtml } from "@/lib/manage/sanitize-email-html";
import { PERSONALIZATION_OVERRIDE_FIELDS, TEMPLATE_TOKENS, renderTemplate, validateSequenceDraft } from "@/lib/manage/sequences/validation";
import { sequenceActivationUiState } from "@/lib/manage/sequences/ui-state";
import { GlobalBackControl, useNavigationLabel } from "@/components/navigation-history";
import { SequenceMachine, type SequenceStepAddOptions } from "@/components/manage/outreach/sequence-machine";

type Props = { data: ManageData; query: string; mode?: "sequences" | "enrollments"; sequenceId?: string | null };
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

function stepDraft(type: SequenceStepType, position: number, options: Pick<SequenceStepAddOptions, "delayValue" | "delayUnit"> = {}) {
  const delayValue = position === 1 ? 0 : options.delayValue ?? (type === "manual_email" || type === "automatic_email" ? 2 : 1);
  const delayUnit = options.delayUnit ?? "business_days";
  return type === "manual_email" || type === "automatic_email"
    ? { stepType: type, delayValue, delayUnit, threadMode: position === 1 ? "new_thread" : "reply_to_previous", ...defaultEmail, taskPriority: "normal", pauseUntilTaskComplete: false }
    : { stepType: type, delayValue, delayUnit, taskTitleTemplate: type === "call_task" ? "Call {{full_name}}" : "Follow up with {{full_name}}", taskNotesTemplate: "Review the contact record before acting.", taskPriority: "normal", pauseUntilTaskComplete: true };
}

function createLocalStep(type: SequenceStepType, position: number, id: string, sequenceId: string, options: Pick<SequenceStepAddOptions, "delayValue" | "delayUnit"> = {}): SequenceStep {
  const draft = stepDraft(type, position, options);
  return {
    id,
    sequenceId,
    position,
    stepType: type,
    delayValue: draft.delayValue,
    delayUnit: draft.delayUnit as SequenceStep["delayUnit"],
    threadMode: ("threadMode" in draft ? draft.threadMode : null) as SequenceStep["threadMode"],
    subjectTemplate: "subjectTemplate" in draft ? draft.subjectTemplate ?? null : null,
    bodyHtml: "bodyHtml" in draft ? draft.bodyHtml ?? null : null,
    bodyText: "bodyText" in draft ? draft.bodyText ?? null : null,
    taskTitleTemplate: "taskTitleTemplate" in draft ? draft.taskTitleTemplate ?? null : null,
    taskNotesTemplate: "taskNotesTemplate" in draft ? draft.taskNotesTemplate ?? null : null,
    taskPriority: draft.taskPriority as SequenceStep["taskPriority"],
    pauseUntilTaskComplete: draft.pauseUntilTaskComplete,
  };
}

export function SequenceWorkspace({ data, query, mode = "sequences", sequenceId = null }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.toString();
  const sequenceQueryId = sequenceId ?? searchParams.get("sequence");
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
  const [enrollmentSequenceFilter, setEnrollmentSequenceFilter] = useState(() => searchParams.get("sequenceId") ?? "all");
  const [enrollmentMailboxFilter, setEnrollmentMailboxFilter] = useState("all");
  const [enrollmentAccountFilter, setEnrollmentAccountFilter] = useState("all");
  const [enrollmentOwnerFilter, setEnrollmentOwnerFilter] = useState("all");
  const [enrollmentFromDate, setEnrollmentFromDate] = useState("");
  const [enrollmentToDate, setEnrollmentToDate] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newSheetClosing, setNewSheetClosing] = useState(false);
  const newSheetCloseTimer = useRef<number | null>(null);
  const localMutationRevision = useRef(0);
  const [showEnroll, setShowEnroll] = useState(false);
  const [sequenceMenuOpen, setSequenceMenuOpen] = useState(false);
  const [sequenceMenuClosing, setSequenceMenuClosing] = useState(false);
  const sequenceMenuRef = useRef<HTMLDivElement | null>(null);
  const sequenceMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const sequenceMenuCloseTimer = useRef<number | null>(null);
  const [showActivationReview, setShowActivationReview] = useState(false);
  const [name, setName] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [previewResults, setPreviewResults] = useState<PreviewResult[]>([]);
  const [previewPersonalization, setPreviewPersonalization] = useState<Record<string, Record<string, string>>>({});
  const [previewBusy, setPreviewBusy] = useState(false);
  const [mailboxId, setMailboxId] = useState(data.mail.mailboxes.find((item) => item.canSend && item.status === "active")?.id ?? "");
  const activeSheet = showNew ? "new" : showEnroll ? "enroll" : enrollmentQueryId ? "inspect" : null;

  const closeNewSheet = useCallback((afterClose?: () => void) => {
    if (newSheetClosing) return;
    setNewSheetClosing(true);
    if (newSheetCloseTimer.current !== null) window.clearTimeout(newSheetCloseTimer.current);
    newSheetCloseTimer.current = window.setTimeout(() => {
      setShowNew(false);
      setNewSheetClosing(false);
      newSheetCloseTimer.current = null;
      afterClose?.();
    }, 190);
  }, [newSheetClosing, setShowNew]);

  useEffect(() => () => {
    if (newSheetCloseTimer.current !== null) window.clearTimeout(newSheetCloseTimer.current);
    if (sequenceMenuCloseTimer.current !== null) window.clearTimeout(sequenceMenuCloseTimer.current);
  }, []);

  const closeSequenceMenu = useCallback((immediate = false) => {
    if (!sequenceMenuOpen) return;
    if (sequenceMenuCloseTimer.current !== null) window.clearTimeout(sequenceMenuCloseTimer.current);
    if (immediate) {
      setSequenceMenuOpen(false);
      setSequenceMenuClosing(false);
      return;
    }
    setSequenceMenuClosing(true);
    sequenceMenuCloseTimer.current = window.setTimeout(() => {
      setSequenceMenuOpen(false);
      setSequenceMenuClosing(false);
      sequenceMenuCloseTimer.current = null;
      sequenceMenuButtonRef.current?.focus();
    }, 160);
  }, [sequenceMenuOpen]);

  const toggleSequenceMenu = () => {
    if (sequenceMenuOpen) {
      closeSequenceMenu();
      return;
    }
    if (sequenceMenuCloseTimer.current !== null) window.clearTimeout(sequenceMenuCloseTimer.current);
    setSequenceMenuClosing(false);
    setSequenceMenuOpen(true);
  };

  useEffect(() => {
    if (!sequenceMenuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (sequenceMenuRef.current && !sequenceMenuRef.current.contains(event.target as Node)) closeSequenceMenu();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSequenceMenu();
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeSequenceMenu, sequenceMenuOpen]);

  const openSequence = (id: string) => {
    router.push(`/manage/outreach/sequences/${id}`);
  };

  const selectEnrollment = (id: string | null) => {
    const next = new URLSearchParams(urlQuery);
    next.set("tab", "enrollments");
    if (id) next.set("enrollment", id); else next.delete("enrollment");
    next.delete("sequence");
    router.replace(`/manage/outreach?${next.toString()}`, { scroll: false });
  };

  const clearEnrollmentSequenceFilter = () => {
    setEnrollmentSequenceFilter("all");
    const next = new URLSearchParams(urlQuery);
    next.delete("sequenceId");
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
        if (showNew) closeNewSheet();
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
  }, [activeSheet, closeNewSheet, showNew]);

  const selected = sequences.find((item) => item.id === sequenceQueryId) ?? null;
  const selectedEnrollment = enrollments.find((item) => item.id === enrollmentQueryId) ?? null;
  const selectedDraftValidation = selected ? validateSequenceDraft(selected, { forActivation: true }) : null;
  const selectedActivation = selected ? sequenceActivationUiState(selected.status, selectedDraftValidation?.valid ?? false, activating, sequenceExecutionEnabled) : null;
  const activationAvailable = Boolean(selectedActivation && !selectedActivation.disabled);
  useNavigationLabel(sequenceId ? selected?.name ?? "Sequence" : mode === "sequences" ? "Sequences" : "Outreach", sequenceId ? "/manage/outreach?tab=sequences" : "/manage", sequenceId ? "Sequences" : "Outreach");
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
  // Sequences are workspace-level campaigns. Contacts may come from different
  // customer accounts; the enrollment retains each contact's account boundary.
  const visibleContacts = data.contacts;
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
  const sequencePageSize = 25;
  const [sequencePage, setSequencePage] = useState(1);
  const failedSequenceIds = useMemo(() => new Set(enrollments.filter((item) => item.state === "failed").map((item) => item.sequenceId)), [enrollments]);
  const sequenceSummary = useMemo(() => ({
    total: visibleSequences.length,
    active: visibleSequences.filter((item) => item.status === "active").length,
    scheduled: visibleSequences.reduce((total, item) => total + item.scheduledNext24Hours, 0),
    needsSetup: visibleSequences.filter((item) => item.status === "draft" && !validateSequenceDraft(item, { forActivation: true }).valid).length,
  }), [visibleSequences]);
  const sequencePageCount = Math.max(1, Math.ceil(visibleSequences.length / sequencePageSize));
  const currentSequencePage = Math.min(sequencePage, sequencePageCount);
  const pageSequences = visibleSequences.slice((currentSequencePage - 1) * sequencePageSize, currentSequencePage * sequencePageSize);

  const load = useCallback(async () => {
    const requestRevision = localMutationRevision.current;
    setLoading(true); setError(null);
    try {
      const sequenceRequest = sequenceId
        ? requestJson(`/api/manage/outreach/sequences/${sequenceId}`)
        : requestJson("/api/manage/outreach/sequences");
      const [sequencePayload, enrollmentPayload] = await Promise.all([sequenceRequest, requestJson("/api/manage/outreach/enrollments")]);
      if (requestRevision === localMutationRevision.current) {
        setSequences(sequenceId
          ? (sequencePayload.sequence ? [sequencePayload.sequence as Sequence] : [])
          : ((sequencePayload.sequences as Sequence[]) ?? []));
        setSequenceExecutionEnabled(sequencePayload.executionEnabled === true);
        setEnrollments((enrollmentPayload.enrollments as Enrollment[]) ?? []);
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The outreach workspace could not load."); }
    finally { setLoading(false); }
  }, [sequenceId]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);

  async function createSequence(event: React.FormEvent) {
    event.preventDefault(); if (!name.trim()) return;
    setBusy(true); setError(null);
    try {
      const payload = await requestJson("/api/manage/outreach/sequences", { method: "POST", body: JSON.stringify({ name }) });
      setName("");
      closeNewSheet(() => {
        if (typeof payload.id === "string") openSequence(payload.id);
      });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The sequence could not be created."); }
    finally { setBusy(false); }
  }

  async function addStep(type: SequenceStepType, options: SequenceStepAddOptions = {}) {
    if (!selected) return undefined;
    setBusy(true); setError(null);
    try {
      const selectedSequenceId = selected.id;
      const orderedSteps = [...selected.steps].sort((left, right) => left.position - right.position);
      const anchorIndex = options.afterStepId ? orderedSteps.findIndex((step) => step.id === options.afterStepId) : orderedSteps.length - 1;
      const provisionalPosition = anchorIndex + 2;
      const draft = stepDraft(type, provisionalPosition, options);
      const payload = await requestJson(`/api/manage/outreach/sequences/${selectedSequenceId}/steps`, { method: "POST", body: JSON.stringify({ ...draft, afterStepId: options.afterStepId ?? null }) });
      if (typeof payload.id !== "string") throw new Error("The step was created but its identifier was missing.");
      const position = Number(payload.position) || provisionalPosition;
      const createdStep = createLocalStep(type, position, payload.id, selectedSequenceId, options);
      setSequences((current) => current.map((item) => item.id === selectedSequenceId
        ? { ...item, steps: [...item.steps.map((step) => step.position >= position ? { ...step, position: step.position + 1 } : step), createdStep].sort((left, right) => left.position - right.position) }
        : item));
      setNotice(`${stepLabel(type)} added.`);
      return createdStep.id;
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The step could not be added."); return undefined; }
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
    try {
      await requestJson(`/api/manage/outreach/sequences/${selected.id}`, { method: "PATCH", body: JSON.stringify(patch) });
      setSequences((current) => current.map((item) => item.id === selected.id ? { ...item, ...patch } as Sequence : item));
      setNotice("Delivery settings saved.");
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The sequence could not be saved."); }
    finally { setBusy(false); }
  }

  async function saveStep(stepId: string, patch: Record<string, unknown>) {
    if (!selected) throw new Error("Choose a sequence before saving a step.");
    setBusy(true); setError(null);
    try {
      await requestJson(`/api/manage/outreach/sequences/${selected.id}/steps/${stepId}`, { method: "PATCH", body: JSON.stringify(patch) });
      setSequences((current) => current.map((item) => item.id === selected.id
        ? { ...item, steps: item.steps.map((step) => step.id === stepId ? { ...step, ...patch } as SequenceStep : step) }
        : item));
      setNotice("Step saved.");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "The step could not be saved.";
      setError(message);
      throw new Error(message);
    } finally { setBusy(false); }
  }

  async function reorderSteps(stepIds: string[]) {
    if (!selected) return;
    const priorSteps = selected.steps;
    const stepsById = new Map(priorSteps.map((step) => [step.id, step]));
    const reorderedSteps = stepIds.map((id, index) => ({ ...stepsById.get(id)!, position: index + 1, delayValue: index === 0 ? 0 : stepsById.get(id)!.delayValue }));
    setSequences((current) => current.map((item) => item.id === selected.id ? { ...item, steps: reorderedSteps } : item));
    setBusy(true); setError(null);
    try {
      await requestJson(`/api/manage/outreach/sequences/${selected.id}/steps/reorder`, { method: "POST", body: JSON.stringify({ stepIds }) });
      setNotice("Step order saved.");
    } catch (cause) {
      setSequences((current) => current.map((item) => item.id === selected.id ? { ...item, steps: priorSteps } : item));
      setError(cause instanceof Error ? cause.message : "The steps could not be reordered.");
    } finally { setBusy(false); }
  }

  async function deleteStep(stepId: string) {
    if (!selected) return;
    localMutationRevision.current += 1;
    const priorSteps = selected.steps;
    const remainingSteps = priorSteps.filter((step) => step.id !== stepId).map((step, index) => ({ ...step, position: index + 1 }));
    setSequences((current) => current.map((item) => item.id === selected.id ? { ...item, steps: remainingSteps } : item));
    setBusy(true); setError(null);
    try {
      await requestJson(`/api/manage/outreach/sequences/${selected.id}/steps/${stepId}`, { method: "DELETE" });
      setNotice("Step deleted.");
    } catch (cause) {
      setSequences((current) => current.map((item) => item.id === selected.id ? { ...item, steps: priorSteps } : item));
      setError(cause instanceof Error ? cause.message : "The step could not be deleted.");
    } finally { setBusy(false); }
  }
  async function duplicateStep(step: SequenceStep) {
    if (!selected) return;
    setBusy(true); setError(null);
    try {
      const position = selected.steps.length + 1;
      const payload = await requestJson(`/api/manage/outreach/sequences/${selected.id}/steps`, { method: "POST", body: JSON.stringify({ stepType: step.stepType, delayValue: step.delayValue, delayUnit: step.delayUnit, threadMode: step.threadMode, subjectTemplate: step.subjectTemplate, bodyHtml: step.bodyHtml, bodyText: step.bodyText, taskTitleTemplate: step.taskTitleTemplate, taskNotesTemplate: step.taskNotesTemplate, taskPriority: step.taskPriority, pauseUntilTaskComplete: step.pauseUntilTaskComplete }) });
      if (typeof payload.id !== "string") throw new Error("The step was duplicated but its identifier was missing.");
      const duplicate = { ...step, id: payload.id, position: Number(payload.position) || position, sequenceId: selected.id };
      setSequences((current) => current.map((item) => item.id === selected.id ? { ...item, steps: [...item.steps, duplicate] } : item));
      setNotice(`${stepLabel(step.stepType)} duplicated.`);
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
      if (action === "clone" && typeof payload.id === "string") openSequence(payload.id);
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
      setShowActivationReview(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The sequence could not be activated.");
    } finally { setActivating(false); }
  }

  function requestActivation() {
    if (selected) setShowActivationReview(true);
  }

  if (mode === "sequences" && !sequenceId) {
    return <section className="sequence-workspace sequence-directory-workspace">
      {error && <div className="manage-inline-alert manage-inline-alert--error" role="alert"><CircleAlert size={16} /> <span>{error}</span></div>}
      {notice && <div className="manage-inline-alert manage-inline-alert--success" role="status"><Check size={16} /> <span>{notice}</span></div>}
      {loading ? <div className="manage-empty"><LoaderCircle className="spin" size={20} /> Loading sequences…</div> : <SequenceDirectory
        sequences={pageSequences}
        totalSequences={sequences.length}
        visibleCount={sequenceSummary.total}
        activeCount={sequenceSummary.active}
        scheduledCount={sequenceSummary.scheduled}
        needsSetupCount={sequenceSummary.needsSetup}
        page={currentSequencePage}
        pageCount={sequencePageCount}
        onPage={setSequencePage}
        sequenceSearch={sequenceSearch}
        onSequenceSearch={(value) => { setSequenceSearch(value); setSequencePage(1); }}
        statusFilter={statusFilter}
        onStatusFilter={(value) => { setStatusFilter(value); setSequencePage(1); }}
        ownerFilter={ownerFilter}
        onOwnerFilter={(value) => { setOwnerFilter(value); setSequencePage(1); }}
        ownerOptions={ownerOptions}
        showArchived={showArchived}
        onShowArchived={(value) => { setShowArchived(value); setSequencePage(1); }}
        failedSequenceIds={failedSequenceIds}
        busy={busy}
        onAction={sequenceAction}
        onNew={() => setShowNew(true)}
      />}
      {showNew && <NewSequenceSheet name={name} busy={busy} isClosing={newSheetClosing} onNameChange={setName} onClose={() => closeNewSheet()} onSubmit={createSequence} />}
    </section>;
  }

  return <section className="sequence-workspace">
    {error && <div className="manage-inline-alert manage-inline-alert--error" role="alert"><CircleAlert size={16} /> <span>{error}</span></div>}{notice && <div className="manage-inline-alert manage-inline-alert--success" role="status"><Check size={16} /> <span>{notice}</span></div>}
    {loading ? <div className="manage-empty"><LoaderCircle className="spin" size={20} /> Loading sequences…</div> : mode === "enrollments" ? <div className="manage-panel sequence-enrollment-summary">
      <div className="manage-panel-header"><div><h3>Enrollment review</h3><p>{visibleEnrollments.length} of {enrollments.length} staged record{enrollments.length === 1 ? "" : "s"}</p></div><div className="sequence-filter-row"><label className="sequence-search"><Search size={14} /><input value={enrollmentSearch} onChange={(event) => setEnrollmentSearch(event.target.value)} placeholder="Search contacts or sequences" aria-label="Search enrollments" /></label><label><span className="sr-only">Filter enrollment state</span><select value={enrollmentStateFilter} onChange={(event) => setEnrollmentStateFilter(event.target.value)}><option value="all">All states</option><option value="pending">Pending</option><option value="active">Active</option><option value="paused">Paused</option><option value="waiting_for_task">Waiting for task</option><option value="stopped">Stopped</option><option value="completed">Completed</option><option value="failed">Failed</option></select></label><label><span className="sr-only">Filter enrollment sequence</span><select value={enrollmentSequenceFilter} onChange={(event) => setEnrollmentSequenceFilter(event.target.value)}><option value="all">All sequences</option>{enrollmentSequenceOptions.map((sequence) => <option key={sequence.id} value={sequence.id}>{sequence.name}</option>)}</select></label><label><span className="sr-only">Filter enrollment mailbox</span><select value={enrollmentMailboxFilter} onChange={(event) => setEnrollmentMailboxFilter(event.target.value)}><option value="all">All mailboxes</option>{enrollmentMailboxOptions.map((mailbox) => <option key={mailbox} value={mailbox}>{mailbox}</option>)}</select></label><label><span className="sr-only">Filter enrollment account</span><select value={enrollmentAccountFilter} onChange={(event) => setEnrollmentAccountFilter(event.target.value)}><option value="all">All accounts</option>{enrollmentAccountOptions.map((account) => <option key={account} value={account}>{account}</option>)}</select></label><label><span className="sr-only">Filter enrollment owner</span><select value={enrollmentOwnerFilter} onChange={(event) => setEnrollmentOwnerFilter(event.target.value)}><option value="all">All owners</option>{enrollmentOwnerOptions.map((owner) => <option key={owner} value={owner}>{owner}</option>)}</select></label></div><div className="sequence-filter-row sequence-filter-row--dates"><label><span>From</span><input type="date" value={enrollmentFromDate} onChange={(event) => setEnrollmentFromDate(event.target.value)} /></label><label><span>To</span><input type="date" value={enrollmentToDate} onChange={(event) => setEnrollmentToDate(event.target.value)} /></label></div></div>
      {enrollmentSequenceFilter !== "all" && <div className="sequence-filter-context"><span>Showing enrollments for {enrollmentSequenceOptions.find((item) => item.id === enrollmentSequenceFilter)?.name || "this sequence"}.</span><button type="button" onClick={clearEnrollmentSequenceFilter}>Clear sequence filter</button></div>}
      {visibleEnrollments.length ? <div className="sequence-enrollment-table">{visibleEnrollments.map((item) => <div key={item.id}><span><strong>{item.contactName}</strong><small>{item.accountName} · {item.sequenceName} · {item.contactEmail}</small><small>Step {item.currentStepPosition || "Pending"} · {item.nextActionAt ? `Next ${formatSequenceDate(item.nextActionAt)}` : "No action scheduled"} · Last touch {item.lastTouchAt ? formatSequenceDate(item.lastTouchAt) : "none"} · {item.mailboxAddress}</small></span><em>{item.state}</em><div className="sequence-row-actions"><button className="manage-icon-button" onClick={() => selectEnrollment(item.id)} disabled={busy} aria-label={`Inspect ${item.contactName}`} title="Inspect enrollment"><Eye size={14} /></button>{["active", "waiting_for_task"].includes(item.state) && <button className="manage-icon-button" onClick={() => void enrollmentAction(item.id, "pause")} disabled={busy} aria-label={`Pause ${item.contactName}`} title="Pause enrollment"><Pause size={14} /></button>}{item.state === "paused" && <button className="manage-icon-button" onClick={() => void enrollmentAction(item.id, "resume")} disabled={busy || !sequenceExecutionEnabled} aria-label={`Resume ${item.contactName}`} title={sequenceExecutionEnabled ? "Resume enrollment" : "Resume unavailable until sequence execution is enabled"}><Play size={14} /></button>}{["pending", "active", "paused", "waiting_for_task"].includes(item.state) && <button className="manage-icon-button" onClick={() => void enrollmentAction(item.id, "stop")} disabled={busy} aria-label={`Stop ${item.contactName}`} title="Stop enrollment"><X size={14} /></button>}</div></div>)}</div> : <div className="manage-empty"><strong>No matching enrollments.</strong><p>Pending contacts appear here before any sequence touch is sent.</p></div>}
    </div> : sequenceId ? (
      selected ? <div className="sequence-detail-page">
        <div className="sequence-detail-context-row">
          <GlobalBackControl className="sequence-detail-back" />
          <div className="sequence-detail-actions">
            {activationAvailable ? (
              <button className="manage-button manage-button--primary" onClick={requestActivation} disabled={activating}><Send size={15} /> {selectedActivation?.buttonLabel}</button>
            ) : selected.status === "draft" ? (
              <button className="manage-button manage-button--primary" onClick={() => setShowEnroll(true)} disabled={!selectedDraftValidation?.valid} title={selectedDraftValidation?.valid ? "Enroll contacts" : "Complete sequence setup before enrolling contacts."}><Users size={15} /> Enroll contacts</button>
            ) : null}
            <div className="sequence-detail-actions-menu" ref={sequenceMenuRef}>
              <button ref={sequenceMenuButtonRef} type="button" className="manage-icon-button" onClick={toggleSequenceMenu} aria-haspopup="menu" aria-expanded={sequenceMenuOpen} aria-label="More sequence actions" title="More sequence actions"><MoreHorizontal size={18} /></button>
              {sequenceMenuOpen && <div className={`sequence-detail-actions-menu__popover${sequenceMenuClosing ? " is-closing" : ""}`} role="menu" aria-label="More sequence actions">
                {selected.status === "draft" && activationAvailable && <button type="button" role="menuitem" onClick={() => { closeSequenceMenu(true); setShowEnroll(true); }}><Users size={15} /> Enroll contacts</button>}
                <Link role="menuitem" href={`/manage/outreach?tab=enrollments&sequenceId=${selected.id}`} onClick={() => closeSequenceMenu(true)}><Eye size={15} /> View enrollments</Link>
                <Link role="menuitem" href="/manage/mail?view=sequence&mode=queue&status=queued" onClick={() => closeSequenceMenu(true)}><CalendarClock size={15} /> Queue &amp; activity</Link>
                <button type="button" role="menuitem" onClick={() => { closeSequenceMenu(true); void sequenceAction(selected.id, "clone"); }} disabled={busy}><Copy size={15} /> Duplicate sequence</button>
                {selected.status === "active" && <button type="button" role="menuitem" onClick={() => { closeSequenceMenu(true); void sequenceAction(selected.id, "pause"); }} disabled={busy}><Pause size={15} /> Pause sequence</button>}
                {["draft", "paused"].includes(selected.status) && <button type="button" role="menuitem" className="is-danger" onClick={() => { closeSequenceMenu(true); void sequenceAction(selected.id, "archive"); }} disabled={busy}><Archive size={15} /> Archive sequence</button>}
              </div>}
            </div>
          </div>
        </div>
        <div className="sequence-editor manage-panel sequence-detail-editor">
          <SequenceEditor sequence={selected} executionEnabled={sequenceExecutionEnabled} busy={busy} onAdd={addStep} onSave={saveSequence} onSaveStep={saveStep} onReorder={reorderSteps} onDelete={deleteStep} onDuplicate={duplicateStep} onTestSend={sendTest} />
        </div>
      </div> : <div className="manage-empty"><strong>Sequence not found.</strong><p>It may have been archived or removed.</p></div>
    ) : <>
      <div className="sequence-toolbar"><label className="sequence-search"><Search size={14} /><input value={sequenceSearch} onChange={(event) => setSequenceSearch(event.target.value)} placeholder="Search sequences" aria-label="Search sequences" /></label><label><span className="sr-only">Filter sequence status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | Sequence["status"])}><option value="all">All statuses</option><option value="draft">Draft</option><option value="active">Active</option><option value="paused">Paused</option><option value="archived">Archived</option></select></label><label><span className="sr-only">Filter sequence owner</span><select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}><option value="all">All owners</option>{ownerOptions.map((owner) => <option key={owner} value={owner}>{owner}</option>)}</select></label><label className="sequence-checkbox"><input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} /> Show archived</label></div>
      <div className="sequence-layout">
        <div className="sequence-list manage-panel"><div className="manage-panel-header"><div><h3>Saved sequences</h3><p>{visibleSequences.length} plan{visibleSequences.length === 1 ? "" : "s"}</p></div></div>{visibleSequences.length ? visibleSequences.map((item) => <div key={item.id} className={`sequence-list-item${sequenceQueryId === item.id ? " is-selected" : ""}`}><button className="sequence-list-item__main" onClick={() => openSequence(item.id)}><span><strong>{item.name}</strong><small>{item.steps.length} steps · {item.status} · {item.ownerName || "Unassigned"}</small><small>{item.activeEnrollments} active contacts · {item.scheduledNext24Hours} scheduled · {item.sent} sent · {item.replies} replies · {item.sent ? `${Math.round((item.replies / item.sent) * 100)}% reply rate` : "— reply rate"}</small></span><ArrowRight size={16} /></button><div className="sequence-row-actions"><button className="manage-icon-button" onClick={() => void sequenceAction(item.id, "clone")} disabled={busy} aria-label={`Clone ${item.name}`} title="Clone sequence"><Copy size={14} /></button>{item.status === "active" && <button className="manage-icon-button" onClick={() => void sequenceAction(item.id, "pause")} disabled={busy} aria-label={`Pause ${item.name}`} title="Pause sequence"><Pause size={14} /></button>}{["draft", "paused"].includes(item.status) && <button className="manage-icon-button" onClick={() => void sequenceAction(item.id, "archive")} disabled={busy} aria-label={`Archive ${item.name}`} title="Archive sequence"><Archive size={14} /></button>}</div></div>) : <div className="manage-empty"><strong>No matching sequences.</strong><p>Start with one focused, human-reviewable follow-up plan.</p></div>}</div>
        <div className="sequence-editor manage-panel">{selected ? <SequenceEditor sequence={selected} executionEnabled={sequenceExecutionEnabled} busy={busy} onAdd={addStep} onSave={saveSequence} onSaveStep={saveStep} onReorder={reorderSteps} onDelete={deleteStep} onDuplicate={duplicateStep} onTestSend={sendTest} /> : <div className="manage-empty sequence-editor__empty"><strong>Select a sequence to edit it.</strong><p>Activation is checked server-side before any message can be sent.</p></div>}</div>
      </div>
      {enrollments.length > 0 && <div className="manage-panel sequence-enrollment-summary"><div className="manage-panel-header"><div><h3>Pending enrollment review</h3><p>These records are staged only; no message has been sent.</p></div></div><div className="sequence-enrollment-table">{enrollments.slice(0, 12).map((item) => <div key={item.id}><span><strong>{item.contactName}</strong><small>{item.sequenceName} · {item.contactEmail}</small></span><em>{item.state}</em></div>)}</div></div>}
    </>}
    {showNew && <div className="portal-sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowNew(false); }}><form className="portal-sheet" onSubmit={createSequence}><div className="portal-sheet-header"><div><span className="manage-eyebrow">Draft only</span><h2>New sequence</h2></div><button type="button" className="manage-icon-button" onClick={() => setShowNew(false)} aria-label="Close"><X size={17} /></button></div><div className="portal-sheet-body"><label>Name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Renewal follow-up" required /></label><small>This sequence can include people from different accounts. Account-specific eligibility and consent checks happen when people are enrolled.</small><div className="portal-sheet-actions"><button type="button" className="manage-button manage-button--quiet" onClick={() => setShowNew(false)}>Cancel</button><button className="manage-button manage-button--primary" disabled={busy}>{busy ? "Creating…" : "Create draft"}</button></div></div></form></div>}
    {showEnroll && selected && <div className="portal-sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowEnroll(false); }}><form className="portal-sheet portal-sheet--wide" onSubmit={enroll}><div className="portal-sheet-header"><div><span className="manage-eyebrow">Pending only · {selected.name}</span><h2>Enroll contacts</h2></div><button type="button" className="manage-icon-button" onClick={() => setShowEnroll(false)} aria-label="Close"><X size={17} /></button></div><div className="portal-sheet-body"><label>Sender mailbox<select value={mailboxId} onChange={(event) => setMailboxId(event.target.value)} required><option value="">Choose a mailbox</option>{data.mail.mailboxes.filter((mailbox) => mailbox.canSend && mailbox.status === "active").map((mailbox) => <option key={mailbox.id} value={mailbox.id}>{mailbox.address} · {selected.dailySendLimit}/day sequence cap</option>)}</select></label><label>Contacts<select multiple size={Math.min(8, Math.max(3, visibleContacts.length))} value={selectedContactIds} onChange={(event) => { setSelectedContactIds(Array.from(event.currentTarget.selectedOptions, (option) => option.value)); setPreviewResults([]); setPreviewPersonalization({}); }} aria-label="Contacts to enroll">{visibleContacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.fullName} · {contact.organizationName}{contact.title ? ` · ${contact.title}` : ""} · {contact.email}{contact.status !== "active" ? ` · status: ${contact.status}` : ""}{contact.marketingStatus ? ` · ${contact.marketingStatus.replace("_", " ")}` : " · consent not recorded"}{contact.outreachSuppressionReason ? ` · blocked: ${contact.outreachSuppressionReason}` : ""}</option>)}</select><small>Suppressed, opted-out, bounced, inactive, or already enrolled contacts will be blocked by the server. Marketing permission is shown separately from workspace access.</small></label><section className="sequence-enrollment-confirmation" aria-label="Enrollment confirmation summary"><strong>Before you confirm</strong><dl><div><dt>Contacts</dt><dd>{selectedContactIds.length}</dd></div><div><dt>Sequence</dt><dd>{selected.name}</dd></div><div><dt>Sender mailbox</dt><dd>{data.mail.mailboxes.find((mailbox) => mailbox.id === mailboxId)?.address || "No mailbox selected"}</dd></div><div><dt>First action</dt><dd>{selected.steps.length ? "Starts immediately" : "Not scheduled"}</dd></div><div><dt>Daily cap</dt><dd>{selected.dailySendLimit} sequence touches/day</dd></div><div><dt>Safety</dt><dd>Stops on reply, bounce, and unsubscribe</dd></div></dl><small>No email is sent in this packet. Confirmation creates pending records only.</small></section><div className="portal-sheet-actions"><button type="button" className="manage-button manage-button--quiet" onClick={() => void previewEnrollment()} disabled={previewBusy || !selectedContactIds.length}><Eye size={15} /> {previewBusy ? "Previewing…" : "Preview first touch"}</button><button type="button" className="manage-button manage-button--quiet" onClick={() => setShowEnroll(false)}>Cancel</button><button className="manage-button manage-button--primary" disabled={busy || !selectedContactIds.length || !previewResults.length || previewResults.some((item) => item.blockedReason)}>{busy ? "Checking…" : "Create pending enrollment"}</button></div>{previewResults.length > 0 && <div className="sequence-preview-results" aria-live="polite"><h3>Personalization preview</h3>{previewResults.map((result) => <article key={result.id}><div><strong>{result.fullName}</strong><small>{result.email}</small></div>{result.blockedReason ? <p className="sequence-preview-blocked"><CircleAlert size={14} /> {result.blockedReason}</p> : <><div className="sequence-preview-overrides">{PERSONALIZATION_OVERRIDE_FIELDS.map((field) => <label key={field}>{field.replace("_", " ")}<input value={previewPersonalization[result.id]?.[field] ?? ""} onChange={(event) => updatePreviewPersonalization(result.id, field, event.target.value)} placeholder="Use CRM value" /></label>)}</div>{result.missingFields?.length ? <p className="sequence-preview-missing"><CircleAlert size={14} /> Missing merge values: {result.missingFields.join(", ")}. Add an override, then preview again.</p> : null}<strong>{result.subject || "No subject"}</strong><p>{result.body || "No message text"}</p><small>Change a merge value, then preview again before confirming.</small></>}</article>)}</div>}</div></form></div>}
    {showActivationReview && selected && <div className="portal-sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowActivationReview(false); }}><section className="portal-sheet" role="dialog" aria-modal="true" aria-labelledby="activation-review-title"><header className="portal-sheet-header"><div><span className="manage-eyebrow">Final safety review</span><h2 id="activation-review-title">Activate and schedule</h2><p>{selected.name}</p></div><button type="button" className="manage-icon-button" onClick={() => setShowActivationReview(false)} aria-label="Close activation review"><X size={17} /></button></header><div className="portal-sheet-body"><div className="sequence-activation-review"><dl><div><dt>Recipients</dt><dd>{enrollments.filter((item) => item.sequenceId === selected.id && ["pending", "active", "paused", "waiting_for_task"].includes(item.state)).length}</dd></div><div><dt>Steps</dt><dd>{selected.steps.length} · first touch {selected.steps[0]?.stepType === "automatic_email" ? "automatic email" : selected.steps[0] ? stepLabel(selected.steps[0].stepType) : "not configured"}</dd></div><div><dt>Daily cap</dt><dd>{Math.min(selected.dailySendLimit, 10)} sends per mailbox · weekdays</dd></div><div><dt>Window</dt><dd>{selected.sendStartLocal}–{selected.sendEndLocal} · {selected.timezone}</dd></div><div><dt>Stops</dt><dd>Reply, bounce, complaint, suppression, unsubscribe</dd></div><div><dt>Next action</dt><dd>{selected.steps.length ? "Worker schedules eligible first steps after activation" : "Add a step before activating"}</dd></div></dl><h3>First-message preview</h3><p>{selected.steps[0]?.subjectTemplate || selected.steps[0]?.taskTitleTemplate || "No first step configured"}</p><p className="muted">Personalization is checked again for each person at enrollment and send time. Unresolved fields block sending.</p></div><div className="portal-sheet-actions"><button type="button" className="manage-button manage-button--quiet" onClick={() => setShowActivationReview(false)}>Go back</button><button type="button" className="manage-button manage-button--primary" disabled={activating || !selected.steps.length} onClick={() => void activateSequence()}>{activating ? "Activating…" : "Activate and schedule"}</button></div></div></section></div>}
    {mode === "enrollments" && selectedEnrollment && <EnrollmentDrawer enrollment={selectedEnrollment} onClose={() => selectEnrollment(null)} />}
  </section>;
}

function NewSequenceSheet({ name, busy, isClosing, onNameChange, onClose, onSubmit }: { name: string; busy: boolean; isClosing?: boolean; onNameChange: (value: string) => void; onClose: () => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return <div className={`portal-sheet-backdrop${isClosing ? " is-closing" : ""}`} role="presentation" onMouseDown={(event) => { if (!isClosing && event.target === event.currentTarget) onClose(); }}><form className={`portal-sheet portal-sheet--new-sequence${isClosing ? " is-closing" : ""}`} role="dialog" aria-modal="true" aria-labelledby="new-sequence-title" onSubmit={onSubmit}><div className="portal-sheet-header"><div><span className="manage-eyebrow">Draft only</span><h2 id="new-sequence-title">New sequence</h2></div><button type="button" className="manage-icon-button" onClick={onClose} aria-label="Close new sequence"><X size={17} /></button></div><div className="portal-sheet-body"><label>Name<input value={name} onChange={(event) => onNameChange(event.target.value)} placeholder="Renewal follow-up" required /></label><small>This sequence can include people from different accounts. Account-specific eligibility and consent checks happen when people are enrolled.</small><div className="portal-sheet-actions"><button type="button" className="manage-button manage-button--quiet" onClick={onClose}>Cancel</button><button className="manage-button manage-button--primary" disabled={busy}>{busy ? "Creating…" : "Create draft"}</button></div></div></form></div>;
}

function SequenceDirectory({ sequences, totalSequences, visibleCount, activeCount, scheduledCount, needsSetupCount, page, pageCount, onPage, sequenceSearch, onSequenceSearch, statusFilter, onStatusFilter, ownerFilter, onOwnerFilter, ownerOptions, showArchived, onShowArchived, failedSequenceIds, busy, onAction, onNew }: {
  sequences: Sequence[];
  totalSequences: number;
  visibleCount: number;
  activeCount: number;
  scheduledCount: number;
  needsSetupCount: number;
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
  sequenceSearch: string;
  onSequenceSearch: (value: string) => void;
  statusFilter: "all" | Sequence["status"];
  onStatusFilter: (value: "all" | Sequence["status"]) => void;
  ownerFilter: string;
  onOwnerFilter: (value: string) => void;
  ownerOptions: string[];
  showArchived: boolean;
  onShowArchived: (value: boolean) => void;
  failedSequenceIds: Set<string>;
  busy: boolean;
  onAction: (id: string, action: SequenceAction) => Promise<void>;
  onNew: () => void;
}) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!openMenuId) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target as HTMLElement).closest(".sequence-directory-actions")) setOpenMenuId(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpenMenuId(null);
      menuTriggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenuId]);

  const runAction = (id: string, action: SequenceAction) => {
    setOpenMenuId(null);
    void onAction(id, action);
  };

  return <section className="manage-panel manage-account-table manage-account-table--full sequence-directory-panel">
    <header className="sequence-directory-header">
      <div>
        <span className="manage-eyebrow">Outreach</span>
        <h2>Sequences</h2>
        <p>{totalSequences ? `${visibleCount} matching ${visibleCount === 1 ? "sequence" : "sequences"} · ${activeCount} active · ${scheduledCount} scheduled next 24h${needsSetupCount ? ` · ${needsSetupCount} need setup` : ""}` : "Create a focused, human-reviewable follow-up plan."}</p>
      </div>
      <button type="button" className="manage-button manage-button--primary" onClick={onNew}><Plus size={16} /> New sequence</button>
    </header>
    <div className="sequence-directory-toolbar">
      <label className="sequence-search"><Search size={14} /><input value={sequenceSearch} onChange={(event) => onSequenceSearch(event.target.value)} placeholder="Search sequences" aria-label="Search sequences" /></label>
      <label><span className="sr-only">Filter sequence status</span><select value={statusFilter} onChange={(event) => onStatusFilter(event.target.value as "all" | Sequence["status"])}><option value="all">All statuses</option><option value="draft">Draft</option><option value="active">Active</option><option value="paused">Paused</option><option value="archived">Archived</option></select></label>
      <label><span className="sr-only">Filter sequence owner</span><select value={ownerFilter} onChange={(event) => onOwnerFilter(event.target.value)}><option value="all">All owners</option>{ownerOptions.map((owner) => <option key={owner} value={owner}>{owner}</option>)}</select></label>
      <label className="sequence-checkbox"><input type="checkbox" checked={showArchived} onChange={(event) => onShowArchived(event.target.checked)} /> Show archived</label>
    </div>
    <div className={`manage-table-wrap sequence-directory-table-wrap${sequences.length === 0 ? " is-empty" : ""}`}>
      <table className="manage-data-table sequence-directory-table">
        <thead><tr><th className="manage-sticky-column">Sequence</th><th>Status</th><th>Steps</th><th>Contacts</th><th>Results</th><th>Owner</th><th>Updated</th><th aria-label="Actions" /></tr></thead>
        <tbody>{sequences.map((item) => {
          const needsSetup = item.status === "draft" && !validateSequenceDraft(item, { forActivation: true }).valid;
          const deliveryIssue = failedSequenceIds.has(item.id);
          return <tr key={item.id}>
            <td className="manage-sticky-column" data-label="Sequence"><Link href={`/manage/outreach/sequences/${item.id}`} className="manage-table-record-card sequence-directory-record"><span className="sequence-directory-record__mark" aria-hidden="true">{item.steps.length}</span><span className="manage-table-record-meta"><strong>{item.name}</strong><small>{item.description || "No description added"}</small></span></Link></td>
            <td data-label="Status"><span className={`sequence-status sequence-status--${item.status}`}>{item.status}</span>{needsSetup && <small className="sequence-row-attention">Needs setup</small>}{!needsSetup && deliveryIssue && <small className="sequence-row-attention">Delivery issue</small>}</td>
            <td data-label="Steps"><strong>{item.steps.length}</strong><small>{item.steps.length === 1 ? "step" : "steps"}</small></td>
            <td data-label="Contacts"><strong>{item.activeEnrollments}</strong><small>{item.scheduledNext24Hours} scheduled next 24h</small></td>
            <td data-label="Results"><strong>{item.sent ? `${item.sent} sent` : "No sends yet"}</strong><small>{item.replies} replies{item.sent ? ` · ${Math.round((item.replies / item.sent) * 100)}% reply rate` : ""}</small></td>
            <td data-label="Owner">{item.ownerName || "Unassigned"}</td>
            <td data-label="Updated">{formatSequenceDate(item.updatedAt)}</td>
            <td className="sequence-directory-actions"><button ref={openMenuId === item.id ? menuTriggerRef : undefined} type="button" className="manage-icon-button" aria-label={`Actions for ${item.name}`} aria-haspopup="menu" aria-expanded={openMenuId === item.id} onClick={() => setOpenMenuId((current) => current === item.id ? null : item.id)} disabled={busy}><MoreHorizontal size={16} /></button>{openMenuId === item.id && <div className="sequence-directory-menu" role="menu"><button type="button" role="menuitem" onClick={() => runAction(item.id, "clone")}>Clone sequence</button>{item.status === "active" && <button type="button" role="menuitem" onClick={() => runAction(item.id, "pause")}>Pause sequence</button>}{["draft", "paused"].includes(item.status) && <button type="button" role="menuitem" onClick={() => runAction(item.id, "archive")}>Archive sequence</button>}</div>}</td>
          </tr>;
        })}</tbody>
      </table>
      {sequences.length === 0 && <div className="manage-table-empty-state"><div className="manage-empty"><strong>{totalSequences ? "No matching sequences" : "No sequences yet"}</strong><p>{totalSequences ? "Clear the search or choose another filter." : "Create a draft to start building a human-reviewable follow-up plan."}</p><button type="button" className="manage-button manage-button--primary" onClick={onNew}><Plus size={15} /> New sequence</button></div></div>}
    </div>
    <footer className="sequence-directory-footer"><span>{visibleCount} {visibleCount === 1 ? "sequence" : "sequences"}</span>{pageCount > 1 && <div className="sequence-directory-pagination"><button type="button" className="manage-icon-button" onClick={() => onPage(Math.max(1, page - 1))} disabled={page <= 1} aria-label="Previous page"><ArrowLeft size={15} /></button><span>Page {page} of {pageCount}</span><button type="button" className="manage-icon-button" onClick={() => onPage(Math.min(pageCount, page + 1))} disabled={page >= pageCount} aria-label="Next page"><ArrowRight size={15} /></button></div>}</footer>
  </section>;
}

function EnrollmentDrawer({ enrollment, onClose }: { enrollment: Enrollment; onClose: () => void }) {
  return <div className="portal-sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="portal-sheet" role="dialog" aria-modal="true" aria-labelledby="enrollment-inspector-title"><header className="portal-sheet-header"><div><span className="manage-eyebrow">Enrollment inspector</span><h2 id="enrollment-inspector-title">{enrollment.contactName}</h2><p>{enrollment.contactEmail}</p></div><button type="button" className="manage-icon-button" onClick={onClose} aria-label="Close enrollment inspector"><X size={17} /></button></header><div className="portal-sheet-body"><dl className="sequence-inspector-list"><div><dt>Sequence</dt><dd>{enrollment.sequenceName}</dd></div><div><dt>Account</dt><dd>{enrollment.accountName}</dd></div><div><dt>State</dt><dd>{enrollment.state}</dd></div><div><dt>Current step</dt><dd>{enrollment.currentStepPosition || "Pending"}</dd></div><div><dt>Next action</dt><dd>{enrollment.nextActionAt ? formatSequenceDate(enrollment.nextActionAt) : "No action scheduled"}</dd></div><div><dt>Last touch</dt><dd>{enrollment.lastTouchAt ? formatSequenceDate(enrollment.lastTouchAt) : "No touch recorded"}</dd></div><div><dt>Sender mailbox</dt><dd>{enrollment.mailboxAddress}</dd></div><div><dt>Stop reason</dt><dd>{enrollment.stopReason || "—"}</dd></div><div><dt>Created</dt><dd>{formatSequenceDate(enrollment.createdAt)}</dd></div></dl><p className="muted">This view is read-only. Use the row controls to pause, resume, or stop the enrollment.</p><footer className="portal-sheet-actions"><button type="button" className="manage-button manage-button--quiet" onClick={onClose}>Close</button></footer></div></section></div>;
}

function SequenceEditor({ sequence, executionEnabled, busy, onAdd, onSave, onSaveStep, onReorder, onDelete, onDuplicate, onTestSend }: { sequence: Sequence; executionEnabled: boolean; busy: boolean; onAdd: (type: SequenceStepType, options?: SequenceStepAddOptions) => Promise<string | undefined>; onSave: (patch: Record<string, unknown>) => Promise<void>; onSaveStep: (stepId: string, patch: Record<string, unknown>) => Promise<void>; onReorder: (stepIds: string[]) => void; onDelete: (stepId: string) => void; onDuplicate: (step: SequenceStep) => void; onTestSend: (stepId: string) => Promise<void> }) {
  const validation = validateSequenceDraft(sequence, { forActivation: true });
  const readOnly = sequence.status !== "draft";
  return <SequenceMachine sequence={sequence} executionEnabled={executionEnabled} busy={busy} validationErrors={validation.errors} readOnly={readOnly} onAdd={onAdd} onSave={onSave} onSaveStep={onSaveStep} onReorder={onReorder} onDelete={onDelete} onDuplicate={onDuplicate} onTestSend={onTestSend} />;
}

// Archived v2: retained here only while the new sequence machine settles in production.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function SequenceBuilderCanvas({ sequence, executionEnabled, busy, activation, validationErrors, readOnly, onActivate, onAdd, onSave, onSaveStep, onReorder, onDelete, onDuplicate, onTestSend, onClone }: { sequence: Sequence; executionEnabled: boolean; busy: boolean; activation: ReturnType<typeof sequenceActivationUiState>; validationErrors: string[]; readOnly: boolean; onActivate: () => void; onAdd: (type: SequenceStepType) => Promise<string | undefined>; onSave: (patch: Record<string, unknown>) => Promise<void>; onSaveStep: (stepId: string, patch: Record<string, unknown>) => Promise<void>; onReorder: (stepIds: string[]) => void; onDelete: (stepId: string) => void; onDuplicate: (step: SequenceStep) => void; onTestSend: (stepId: string) => Promise<void>; onClone: () => void }) {
  const [activeStepId, setActiveStepId] = useState<string | null>(() => sequence.steps[0]?.id ?? null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewWidth, setPreviewWidth] = useState<"mobile" | "desktop">("desktop");
  const sample = { first_name: "Jordan", full_name: "Jordan Lee", company_name: "Northstar Foods", sender_name: "Costivra team" };
  const orderedSteps = [...sequence.steps].sort((left, right) => left.position - right.position);
  const activeStep = orderedSteps.find((step) => step.id === activeStepId) ?? orderedSteps[0] ?? null;
  const activeIndex = activeStep ? orderedSteps.findIndex((step) => step.id === activeStep.id) : -1;
  const previewWarnings = validationErrors.filter((error) => error.toLowerCase().includes("unknown template token"));

  const addStep = async (type: SequenceStepType) => {
    const createdId = await onAdd(type);
    if (createdId) setActiveStepId(createdId);
    setAddMenuOpen(false);
  };

  const moveActiveStep = (direction: -1 | 1) => {
    if (activeIndex < 0) return;
    const target = activeIndex + direction;
    if (target < 0 || target >= orderedSteps.length) return;
    const nextIds = orderedSteps.map((step) => step.id);
    [nextIds[activeIndex], nextIds[target]] = [nextIds[target], nextIds[activeIndex]];
    onReorder(nextIds);
  };

  return <div className="sequence-builder-v2">
    <header className="sequence-builder-v2__topbar">
      <div>
        <span className="sequence-builder-v2__eyebrow"><i className={`sequence-status-dot sequence-status-dot--${sequence.status}`} /> {sequence.status}</span>
        <h3>{sequence.name}</h3>
        <p>{sequence.description || "Build the follow-up one step at a time."}</p>
      </div>
      <div className="sequence-builder-v2__top-actions">
        <span className={`sequence-builder-v2__readiness${validationErrors.length || !executionEnabled ? " is-blocked" : ""}`}>{!executionEnabled ? "Execution disabled" : validationErrors.length ? `${validationErrors.length} setup item${validationErrors.length === 1 ? "" : "s"}` : "Ready for review"}</span>
        <button type="button" className="manage-button manage-button--quiet" onClick={onClone} disabled={busy}><Copy size={15} /> Duplicate</button>
        <button type="button" className="manage-button manage-button--primary" onClick={onActivate} disabled={activation.disabled}><Send size={15} /> {activation.buttonLabel}</button>
      </div>
    </header>

    {readOnly && <div className="manage-inline-alert manage-inline-alert--warning" role="status"><strong>This sequence is locked.</strong><span>{sequence.status === "active" ? "Pause it before changing its workflow." : "Return it to draft before editing."}</span></div>}
    {!readOnly && validationErrors.length > 0 && <div className="sequence-builder-v2__setup-note" role="status"><CircleAlert size={16} /><span><strong>Before activation</strong>{validationErrors.slice(0, 2).join(" ")}{validationErrors.length > 2 ? ` +${validationErrors.length - 2} more.` : ""}</span></div>}

    <div className="sequence-builder-v2__workspace">
      <aside className="sequence-builder-v2__timeline" aria-label="Sequence steps">
        <div className="sequence-builder-v2__timeline-head"><span>Workflow</span><strong>{orderedSteps.length} {orderedSteps.length === 1 ? "step" : "steps"}</strong></div>
        <div className="sequence-builder-v2__timeline-list">
          {orderedSteps.map((step, index) => {
            const isEmail = step.stepType === "manual_email" || step.stepType === "automatic_email";
            const title = step.subjectTemplate || step.taskTitleTemplate || stepLabel(step.stepType);
            return <button type="button" key={step.id} className={`sequence-builder-v2__timeline-item${step.id === activeStep?.id ? " is-active" : ""}`} onClick={() => setActiveStepId(step.id)}>
              <span className="sequence-builder-v2__timeline-number">{String(index + 1).padStart(2, "0")}</span>
              <span><small>{isEmail ? "Email" : stepLabel(step.stepType)}</small><strong>{title}</strong><em>{index === 0 ? "Immediately" : `After ${step.delayValue} ${step.delayUnit.replace("_", " ")}`}</em></span>
            </button>;
          })}
          {!orderedSteps.length && <div className="sequence-builder-v2__empty-steps"><Mail size={18} /><strong>No steps yet</strong><span>Add the first action below.</span></div>}
        </div>
        <div className="sequence-builder-v2__add-wrap">
          <button type="button" className="sequence-builder-v2__add-trigger" onClick={() => setAddMenuOpen((open) => !open)} disabled={busy || readOnly} aria-expanded={addMenuOpen}><Plus size={16} /> Add step</button>
          {addMenuOpen && <div className="sequence-builder-v2__add-menu" role="menu"><span>Add to the end of this workflow</span><button type="button" role="menuitem" onClick={() => void addStep("automatic_email")}><Mail size={15} /> Email</button><button type="button" role="menuitem" onClick={() => void addStep("manual_email")}><FileText size={15} /> Manual email</button><button type="button" role="menuitem" onClick={() => void addStep("call_task")}><Users size={15} /> Call task</button><button type="button" role="menuitem" onClick={() => void addStep("general_task")}><Check size={15} /> General task</button></div>}
        </div>
      </aside>

      <main className="sequence-builder-v2__editor">
        {activeStep ? <SequenceBuilderStepEditor key={activeStep.id} sequenceId={sequence.id} step={activeStep} index={activeIndex} total={orderedSteps.length} readOnly={readOnly} busy={busy} onSave={onSaveStep} onMove={moveActiveStep} onDelete={() => onDelete(activeStep.id)} onDuplicate={() => onDuplicate(activeStep)} onTestSend={onTestSend} /> : <div className="sequence-builder-v2__blank"><Mail size={21} /><h4>Start with the first touch</h4><p>Add an email or task. Nothing sends until you review, enroll contacts, and activate the sequence.</p></div>}
      </main>

      <aside className="sequence-builder-v2__rail">
        <section className="sequence-builder-v2__queue-card">
          <div><span>Delivery queue</span><strong>{sequence.scheduledNext24Hours} scheduled next 24h</strong></div>
          <Link href="/manage/mail?view=sequence&mode=queue&status=queued" className="manage-button manage-button--quiet"><CalendarClock size={15} /> View queue</Link>
        </section>
        <section className="sequence-builder-v2__preview-card">
          <SequenceBuilderPreview step={activeStep} sample={sample} width={previewWidth} warnings={previewWarnings} onWidthChange={setPreviewWidth} />
        </section>
        <section className="sequence-builder-v2__settings-card">
          <button type="button" className="sequence-builder-v2__settings-toggle" onClick={() => setSettingsOpen((open) => !open)} aria-expanded={settingsOpen}><span><Settings2 size={15} /> Delivery settings</span>{settingsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
          {settingsOpen && <div className="sequence-builder-v2__settings-body"><label>Timezone<select disabled={readOnly || busy} value={sequence.timezone} onChange={(event) => void onSave({ timezone: event.target.value })}><option value="America/Chicago">Central time</option><option value="America/New_York">Eastern time</option><option value="America/Los_Angeles">Pacific time</option><option value="UTC">UTC</option></select></label><label>Send window<select disabled={readOnly || busy} value={`${sequence.sendStartLocal}-${sequence.sendEndLocal}`} onChange={(event) => { const [sendStartLocal, sendEndLocal] = event.target.value.split("-"); void onSave({ sendStartLocal, sendEndLocal }); }}><option value="09:00-17:00">09:00–17:00</option><option value="08:00-16:00">08:00–16:00</option><option value="10:00-18:00">10:00–18:00</option></select></label><label>Daily cap<input disabled={readOnly || busy} type="number" min={1} max={100} defaultValue={sequence.dailySendLimit} onBlur={(event) => { const dailySendLimit = Number(event.target.value); if (Number.isInteger(dailySendLimit) && dailySendLimit >= 1 && dailySendLimit <= 100) void onSave({ dailySendLimit }); }} /></label><div className="sequence-builder-v2__weekdays"><span>Business days</span>{[1, 2, 3, 4, 5].map((day) => <button key={day} type="button" className={sequence.businessDays.includes(day) ? "is-selected" : ""} disabled={readOnly || busy} onClick={() => void onSave({ businessDays: sequence.businessDays.includes(day) ? sequence.businessDays.filter((value) => value !== day) : [...sequence.businessDays, day].sort() })}>{["Mon", "Tue", "Wed", "Thu", "Fri"][day - 1]}</button>)}</div><p><Check size={14} /> Stops on reply, bounce, and unsubscribe.</p></div>}
        </section>
      </aside>
    </div>
  </div>;
}

function SequenceBuilderStepEditor({ sequenceId, step, index, total, readOnly, busy, onSave, onMove, onDelete, onDuplicate, onTestSend }: { sequenceId: string; step: SequenceStep; index: number; total: number; readOnly: boolean; busy: boolean; onSave: (stepId: string, patch: Record<string, unknown>) => Promise<void>; onMove: (direction: -1 | 1) => void; onDelete: () => void; onDuplicate: () => void; onTestSend: (stepId: string) => Promise<void> }) {
  const isEmail = step.stepType === "manual_email" || step.stepType === "automatic_email";
  const [subject, setSubject] = useState(step.subjectTemplate ?? step.taskTitleTemplate ?? "");
  const [body, setBody] = useState(step.bodyText ?? step.taskNotesTemplate ?? "");
  const [threadMode, setThreadMode] = useState<SequenceStep["threadMode"]>(step.threadMode ?? "new_thread");
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantIntent, setAssistantIntent] = useState("");
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const addToken = (field: string) => setBody((current) => `${current}${current && !current.endsWith("\n") ? "\n" : ""}{{${field}}}`);
  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await onSave(step.id, isEmail ? { subjectTemplate: subject, bodyText: body, bodyHtml: `<p>${body.replace(/\n/g, "</p><p>")}</p>`, threadMode } : { taskTitleTemplate: subject, taskNotesTemplate: body });
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
      const response = await fetch(`/api/manage/outreach/sequences/${sequenceId}/steps/${step.id}/draft`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ intent: assistantIntent }) });
      const payload = await response.json() as { subjectTemplate?: string; bodyText?: string; error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not draft the email.");
      if (typeof payload.subjectTemplate === "string") setSubject(payload.subjectTemplate);
      if (typeof payload.bodyText === "string") setBody(payload.bodyText);
      setAssistantOpen(false);
      setMessage("Draft applied. Review it, then save the step.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Could not draft the email.");
    } finally {
      setAssistantBusy(false);
    }
  };

  return <section className="sequence-builder-v2__step-editor" aria-labelledby="sequence-step-editor-title">
    <header><div><span>Step {index + 1} of {total}</span><h4 id="sequence-step-editor-title">{isEmail ? "Email" : stepLabel(step.stepType)}</h4><p>{index === 0 ? "Sends or starts immediately" : `Starts after ${step.delayValue} ${step.delayUnit.replace("_", " ")}`}{step.pauseUntilTaskComplete ? " and waits for completion" : ""}</p></div><div className="sequence-builder-v2__step-actions"><button type="button" onClick={() => onMove(-1)} disabled={readOnly || busy || index === 0} aria-label="Move step earlier"><ArrowUp size={15} /></button><button type="button" onClick={() => onMove(1)} disabled={readOnly || busy || index === total - 1} aria-label="Move step later"><ArrowDown size={15} /></button><button type="button" onClick={onDuplicate} disabled={readOnly || busy} aria-label="Duplicate step"><Copy size={15} /></button><button type="button" onClick={onDelete} disabled={readOnly || busy} aria-label="Delete step"><Trash2 size={15} /></button></div></header>
    {isEmail && <div className="sequence-builder-v2__assistant"><div><MessageSquareText size={16} /><span><strong>Draft with assistant</strong><small>Creates a template for review. It never sends anything.</small></span></div><button type="button" className="manage-button manage-button--quiet" onClick={() => setAssistantOpen((open) => !open)} disabled={readOnly || busy || assistantBusy}>{assistantOpen ? "Close" : "Draft email"}</button>{assistantOpen && <div className="sequence-builder-v2__assistant-form"><label>What should this email accomplish?<textarea value={assistantIntent} onChange={(event) => setAssistantIntent(event.target.value)} rows={3} placeholder="For example: introduce a review of telecom costs and ask for a 15-minute call." /></label><button type="button" className="manage-button manage-button--primary" onClick={() => void generateDraft()} disabled={assistantBusy}>{assistantBusy ? <><LoaderCircle className="spin" size={15} /> Drafting…</> : <><RefreshCw size={15} /> Generate draft</>}</button></div>}</div>}
    <div className="sequence-builder-v2__form">
      {isEmail && <label>Thread<select disabled={readOnly} value={threadMode ?? "new_thread"} onChange={(event) => setThreadMode(event.target.value as SequenceStep["threadMode"])}><option value="new_thread">Start a new thread</option><option value="reply_to_previous">Reply to the last email</option></select></label>}
      <label>{isEmail ? "Subject" : "Task title"}<input readOnly={readOnly} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder={isEmail ? "Write a clear subject" : "Describe the task"} /></label>
      <label>{isEmail ? "Message" : "Notes"}<textarea readOnly={readOnly} value={body} onChange={(event) => setBody(event.target.value)} rows={isEmail ? 10 : 7} placeholder={isEmail ? "Write the message…" : "Add instructions for the owner…"} /></label>
      <div className="sequence-builder-v2__form-footer"><label className="sequence-builder-v2__token-select">Insert a merge field<select disabled={readOnly} value="" onChange={(event) => addToken(event.target.value)}><option value="">Choose a field…</option>{TEMPLATE_TOKENS.map((field) => <option key={field} value={field}>{templateFieldLabel(field)}</option>)}</select></label><div><span aria-live="polite">{message}</span><button type="button" className="manage-button manage-button--primary" onClick={() => void save()} disabled={readOnly || saving || busy}>{saving ? "Saving…" : "Save changes"}</button>{isEmail && <button type="button" className="manage-button manage-button--quiet" onClick={() => void onTestSend(step.id)} disabled={readOnly || saving || busy}><Eye size={15} /> Test to me</button>}</div></div>
    </div>
  </section>;
}

function SequenceBuilderPreview({ step, sample, width, warnings, onWidthChange }: { step: SequenceStep | null; sample: Record<string, string>; width: "mobile" | "desktop"; warnings: string[]; onWidthChange: (width: "mobile" | "desktop") => void }) {
  const isEmail = step ? step.stepType === "manual_email" || step.stepType === "automatic_email" : false;
  const subject = step ? renderTemplate(step.subjectTemplate ?? step.taskTitleTemplate, sample) : "";
  const body = step ? renderTemplate(step.bodyText ?? step.taskNotesTemplate, sample) : "";
  const richBody = step ? sanitizeEmailHtml(renderTemplate(step.bodyHtml, sample)) : "";
  return <section className="sequence-builder-preview" aria-labelledby="sequence-builder-preview-title"><header className="sequence-builder-preview__header"><div><span className="manage-eyebrow">Preview</span><strong id="sequence-builder-preview-title">Jordan Lee · Northstar Foods</strong><small>{isEmail ? "Sample email · sender Costivra team" : step ? "Sample task" : "Add a step to preview it"}</small></div><div className="sequence-builder-preview__widths" role="group" aria-label="Preview width"><button type="button" className={width === "desktop" ? "is-selected" : ""} onClick={() => onWidthChange("desktop")}>Desktop</button><button type="button" className={width === "mobile" ? "is-selected" : ""} onClick={() => onWidthChange("mobile")}>Mobile</button></div></header>{warnings.length > 0 && <div className="manage-inline-alert manage-inline-alert--warning" role="status"><CircleAlert size={15} /><span>Unresolved template token: {warnings.join(" ")}</span></div>}<div className={`sequence-builder-preview__frame sequence-builder-preview__frame--${width}`}>{step ? <><span className="sequence-builder-preview__meta">{isEmail ? "To Jordan Lee · jordan@example.com" : "Internal task preview"}</span><h4>{subject || "No subject or task title"}</h4>{isEmail && richBody ? <><span className="sequence-builder-preview__label">Rendered preview</span><div className="sequence-builder-preview__rich" aria-label="Rendered email preview" dangerouslySetInnerHTML={{ __html: richBody }} /></> : null}<span className={isEmail && richBody ? "sequence-builder-preview__label" : "sr-only"}>Plain-text preview</span><p>{body || "No preview text has been saved yet."}</p></> : <p className="sequence-builder-preview__empty">Add an email or task step to see a deterministic sample here.</p>}</div></section>;
}
