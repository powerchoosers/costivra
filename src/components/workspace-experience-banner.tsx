"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, LockKeyhole, ReceiptText } from "@/lib/icons";
import { useEffect, useState } from "react";

type FreeReviewState = {
  mode: "free" | "paid";
  used: number;
  limit: number | null;
  remaining: number | null;
};

export function WorkspaceExperienceBanner({ initialDocumentCount }: { initialDocumentCount: number }) {
  const [state, setState] = useState<FreeReviewState | null>(null);

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

  if (!state) return null;
  if (state.mode === "paid") {
    return <div className="workspace-experience-banner workspace-experience-banner--paid" data-tour="plan-status" role="status">
      <span className="workspace-experience-banner__icon"><CheckCircle2 size={17} /></span>
      <div><strong>Paid workspace</strong><span>Ongoing monitoring, evidence history, and team controls are active.</span></div>
      <Link href="/app/settings?tab=billing">Manage billing <ArrowRight size={14} /></Link>
    </div>;
  }

  const used = Math.max(state.used, initialDocumentCount);
  const limit = state.limit ?? 3;
  const remaining = Math.max(limit - used, 0);
  return <div className={`workspace-experience-banner workspace-experience-banner--free${remaining === 0 ? " is-complete" : ""}`} data-tour="free-review-banner" role="status">
    <span className="workspace-experience-banner__icon"><ReceiptText size={17} /></span>
    <div className="workspace-experience-banner__copy"><strong>Free review · {used} of {limit} bills used</strong><span>{remaining ? `${remaining} bill${remaining === 1 ? "" : "s"} left to analyze. Your source evidence stays private.` : "Your free review is complete. Subscribe to keep analyzing bills and monitoring costs."}</span></div>
    <div className="workspace-experience-banner__progress" aria-label={`${used} of ${limit} free bills used`}><span style={{ width: `${Math.min((used / limit) * 100, 100)}%` }} /></div>
    <Link className="button button-quiet button-sm" href="/pricing?from=workspace">{remaining ? "See paid plans" : "Unlock the full workspace"} <ArrowRight size={14} /></Link>
    <LockKeyhole className="workspace-experience-banner__lock" aria-hidden="true" size={15} />
  </div>;
}
