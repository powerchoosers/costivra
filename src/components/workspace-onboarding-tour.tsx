"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ElementType } from "react";
import { ArrowLeft, ArrowRight, Check, CheckSquare, Gear, Layout, Target, Upload, X } from "@/lib/icons";

type TutorialStep = {
  id: string;
  selector: string;
  eyebrow: string;
  title: string;
  copy: string;
  Icon: ElementType;
  action?: "upload";
};

type WorkspacePlanState = {
  mode: "free" | "paid";
  used: number;
  limit: number | null;
  remaining: number | null;
};

const TOUR_STEPS: readonly TutorialStep[] = [
  { id: "workspace", selector: "[data-tour='workspace']", eyebrow: "01 · YOUR WORKSPACE", title: "A calm home for cost decisions.", copy: "Bills, evidence, findings, approvals, and results stay together in one private operating view.", Icon: Layout },
  { id: "upload", selector: "[data-tour='upload']", eyebrow: "02 · START WITH A BILL", title: "Upload the source before making a claim.", copy: "Choose a bill or contract and Costivra keeps the original source attached as it reads the details. Free workspaces can analyze three documents before an upgrade is required.", Icon: Upload, action: "upload" },
  { id: "findings", selector: "[data-tour='findings']", eyebrow: "03 · SEE WHAT MATTERS", title: "Findings connect the issue to its evidence.", copy: "A finding should tell you what changed, why it matters, and where to look in the source—not just show a generated score.", Icon: Target },
  { id: "actions", selector: "[data-tour='actions']", eyebrow: "04 · DECIDE WITH CONTROL", title: "Actions wait for a human decision.", copy: "Costivra can prepare the next step, but consequential work remains visible, scoped, and approved by the right person.", Icon: CheckSquare },
  { id: "settings", selector: "[data-tour='settings'], [data-tour='menu']", eyebrow: "05 · MAKE IT YOURS", title: "Add people and set the operating rules.", copy: "Use Settings to invite teammates, define approval controls, and choose how each vendor should be monitored.", Icon: Gear },
];

type Rect = { top: number; left: number; width: number; height: number };

function visibleTarget(selector: string): HTMLElement | null {
  return Array.from(document.querySelectorAll<HTMLElement>(selector)).find((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== "hidden";
  }) ?? null;
}

export function WorkspaceOnboardingTour() {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [planState, setPlanState] = useState<WorkspacePlanState | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const step = TOUR_STEPS[stepIndex];

  const positionTarget = useCallback(() => {
    if (!open) return;
    const target = visibleTarget(step.selector);
    if (!target) {
      setRect(null);
      return;
    }
    const targetRect = target.getBoundingClientRect();
    setRect({ top: targetRect.top - 6, left: targetRect.left - 6, width: targetRect.width + 12, height: targetRect.height + 12 });
  }, [open, step.selector]);

  useEffect(() => {
    let active = true;
    fetch("/api/portal/free-review/status", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<{ freeReview?: WorkspacePlanState }> : null)
      .then((payload) => {
        if (active && payload?.freeReview) setPlanState(payload.freeReview);
      })
      .catch(() => undefined);
    fetch("/api/portal/tutorial", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<{ tutorial?: { status?: string; current_step?: number } }> : null)
      .then((payload) => {
        if (!active || !payload?.tutorial) return;
        const status = payload.tutorial.status;
        if (status !== "completed" && status !== "skipped") {
          setStepIndex(Math.min(Math.max(Number(payload.tutorial.current_step ?? 0), 0), TOUR_STEPS.length - 1));
          setOpen(true);
        }
      })
      .catch(() => undefined);
    const replay = () => { restoreFocusRef.current = document.activeElement as HTMLElement | null; setStepIndex(0); setOpen(true); };
    window.addEventListener("costivra:replay-tour", replay);
    return () => { active = false; window.removeEventListener("costivra:replay-tour", replay); };
  }, []);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const initialFrame = window.requestAnimationFrame(positionTarget);
    const handle = () => window.requestAnimationFrame(positionTarget);
    window.addEventListener("resize", handle);
    window.addEventListener("scroll", handle, true);
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.cancelAnimationFrame(initialFrame);
      window.removeEventListener("resize", handle);
      window.removeEventListener("scroll", handle, true);
      document.body.style.overflow = bodyOverflow;
    };
  }, [open, positionTarget]);

  const persist = async (status: "in_progress" | "completed" | "skipped", currentStep = stepIndex) => {
    await fetch("/api/portal/tutorial", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status, currentStep }) }).catch(() => undefined);
  };

  const close = (status: "completed" | "skipped") => {
    setOpen(false);
    window.setTimeout(() => restoreFocusRef.current?.focus(), 0);
    void persist(status);
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        void close("skipped");
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>("button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])")).filter((element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true");
      if (!focusable.length) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }
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
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (!open) return null;
  const Icon = step.Icon;
  const isLast = stepIndex === TOUR_STEPS.length - 1;
  const stepCopy = planState?.mode === "free"
    ? step.id === "actions"
      ? "Review the finding and save the decision you want to revisit. Ongoing monitoring and team-controlled actions become available when you subscribe."
      : step.id === "settings"
        ? "Settings shows the controls a paid workspace can unlock—team access, approval rules, and vendor monitoring. Your contained review is available now."
        : step.copy
    : step.copy;
  return <div className="workspace-tour" role="presentation">
    <div className="workspace-tour__backdrop" style={rect ? undefined : { background: "rgba(8,16,29,.52)" }} aria-hidden="true" />
    {rect && <div className="workspace-tour__spotlight" style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }} aria-hidden="true" />}
    <div className="workspace-tour__panel" role="dialog" aria-modal="true" aria-labelledby="workspace-tour-title" tabIndex={-1} ref={panelRef}>
      <div className="workspace-tour__topline"><span>Costivra workspace tour</span><button type="button" onClick={() => void close("skipped")} aria-label="Skip workspace tour"><X size={17} /></button></div>
      {planState && <div className={`workspace-tour__plan workspace-tour__plan--${planState.mode}`}>
        <span className="workspace-tour__plan-dot" aria-hidden="true" />
        <strong>{planState.mode === "paid" ? "Paid workspace" : "Free review"}</strong>
        <span>{planState.mode === "paid" ? "Full monitoring and controls are active." : `${Math.max(planState.remaining ?? 0, 0)} of ${planState.limit ?? 3} document${(planState.limit ?? 3) === 1 ? "" : "s"} left`}</span>
        {planState.mode === "free" && <Link href="/pricing?from=tour" onClick={() => void close("skipped")}>See paid plans <ArrowRight size={12} /></Link>}
      </div>}
      <div className="workspace-tour__body">
        <div className="workspace-tour__icon"><Icon size={22} /></div>
        <span className="workspace-tour__eyebrow">{step.eyebrow}</span>
        <h2 id="workspace-tour-title">{step.title}</h2>
        <p>{stepCopy}</p>
        {step.action === "upload" && <button type="button" className="workspace-tour__inline-action" onClick={() => { void persist("in_progress"); setOpen(false); window.setTimeout(() => window.dispatchEvent(new CustomEvent("costivra:global-action", { detail: "upload" })), 120); }}>Try uploading a bill <ArrowRight size={14} /></button>}
      </div>
      <div className="workspace-tour__footer">
        <div className="workspace-tour__progress" aria-label={`Tour step ${stepIndex + 1} of ${TOUR_STEPS.length}`}>{TOUR_STEPS.map((item, index) => <span key={item.id} className={index === stepIndex ? "is-current" : index < stepIndex ? "is-complete" : ""}>{index < stepIndex ? <Check size={11} /> : index + 1}</span>)}</div>
        <button type="button" className="button button-quiet button-sm" onClick={() => void close("skipped")}>Skip tour</button>
        <button type="button" className="button button-primary button-sm" onClick={() => { if (isLast) void close("completed"); else { void persist("in_progress", stepIndex + 1); setStepIndex((current) => current + 1); } }}>{isLast ? "Finish tour" : "Next"} {isLast ? <Check size={14} /> : <ArrowRight size={14} />}</button>
      </div>
      {stepIndex > 0 && <button type="button" className="workspace-tour__back" onClick={() => { void persist("in_progress", stepIndex - 1); setStepIndex((current) => current - 1); }}><ArrowLeft size={13} /> Back</button>}
      {stepIndex === 0 && <Link className="workspace-tour__free-note" href="/pricing?from=tour" onClick={() => void close("skipped")}>See the full paid workspace <ArrowRight size={13} /></Link>}
    </div>
  </div>;
}
