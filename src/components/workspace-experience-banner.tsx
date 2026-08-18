"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, LockKeyhole, ReceiptText, X } from "@/lib/icons";
import { useEffect, useRef, useState } from "react";

type FreeReviewState = {
  mode: "free" | "paid";
  used: number;
  limit: number | null;
  remaining: number | null;
};

export function WorkspaceExperienceBanner({ initialDocumentCount }: { initialDocumentCount: number }) {
  const [state, setState] = useState<FreeReviewState | null>(null);
  const [visible, setVisible] = useState(false);
  const reappearTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/portal/free-review/status", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<{ freeReview?: FreeReviewState }> : null)
      .then((payload) => {
        if (active && payload?.freeReview) setState(payload.freeReview);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!state) return;
    const frame = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [state?.mode]);

  useEffect(() => () => {
    if (reappearTimerRef.current !== null) window.clearTimeout(reappearTimerRef.current);
  }, []);

  if (!state) return null;
  const isFree = state.mode === "free";
  const used = isFree ? Math.max(state.used, initialDocumentCount) : 0;
  const limit = isFree ? state.limit ?? 3 : 0;
  const remaining = isFree ? Math.max(limit - used, 0) : 0;

  const dismiss = () => {
    setVisible(false);
    if (reappearTimerRef.current !== null) window.clearTimeout(reappearTimerRef.current);
    reappearTimerRef.current = window.setTimeout(() => setVisible(true), 5 * 60 * 1000);
  };

  if (state.mode === "paid") {
    return <div className={`workspace-experience-banner-shell${visible ? " is-visible" : ""}`}>
      <div className="workspace-experience-banner workspace-experience-banner--paid" data-tour="plan-status" role="status">
        <span className="workspace-experience-banner__icon"><CheckCircle2 size={17} /></span>
        <div><strong>Paid workspace</strong><span>Ongoing monitoring, evidence history, and team controls are active.</span></div>
        <Link href="/app/settings?tab=billing">Manage billing <ArrowRight size={14} /></Link>
      </div>
    </div>;
  }
  return <div className={`workspace-experience-banner-shell${visible ? " is-visible" : ""}`}>
    <div className={`workspace-experience-banner workspace-experience-banner--free${remaining === 0 ? " is-complete" : ""}`} data-tour="free-review-banner" role="status" aria-hidden={!visible}>
      <span className="workspace-experience-banner__icon"><ReceiptText size={17} /></span>
      <div className="workspace-experience-banner__copy"><strong>Free review · {used} of {limit} bills used</strong><span>{remaining ? `${remaining} bill${remaining === 1 ? "" : "s"} left to analyze. Your source evidence stays private.` : "Your free review is complete. Subscribe to keep analyzing bills and monitoring costs."}</span></div>
      <div className="workspace-experience-banner__progress" aria-label={`${used} of ${limit} free bills used`}><span style={{ width: `${Math.min((used / limit) * 100, 100)}%` }} /></div>
      <Link className="button button-quiet button-sm" href="/pricing?from=workspace">{remaining ? "See paid plans" : "Unlock the full workspace"} <ArrowRight size={14} /></Link>
      <button type="button" className="workspace-experience-banner__dismiss" onPointerDown={(event) => { event.stopPropagation(); dismiss(); }} onClick={(event) => { event.stopPropagation(); dismiss(); }} aria-label="Dismiss free review notice" tabIndex={visible ? 0 : -1}><X size={15} /></button>
      <LockKeyhole className="workspace-experience-banner__lock" aria-hidden="true" size={15} />
    </div>
  </div>;
}
