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

type BannerDismissal = {
  mode: "free";
  used: number;
  limit: number;
  expiresAt: number;
};

const BANNER_DISMISSAL_STORAGE_KEY = "costivra.workspace-experience-banner.dismissal";
const BANNER_REAPPEAR_DELAY_MS = 5 * 60 * 1000;

function readBannerDismissal(storageKey: string): BannerDismissal | null {
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BannerDismissal>;
    if (
      parsed.mode !== "free"
      || !Number.isFinite(parsed.used)
      || !Number.isFinite(parsed.limit)
      || !Number.isFinite(parsed.expiresAt)
    ) return null;
    return parsed as BannerDismissal;
  } catch {
    return null;
  }
}

function clearBannerDismissal(storageKey: string) {
  try {
    window.sessionStorage.removeItem(storageKey);
  } catch {
    // Storage can be unavailable in private browsing; a local dismissal still works.
  }
}

export function WorkspaceExperienceBanner({
  initialDocumentCount,
  organizationId,
}: {
  initialDocumentCount: number;
  organizationId: string;
}) {
  const [state, setState] = useState<FreeReviewState | null>(null);
  const [visible, setVisible] = useState(false);
  const reappearTimerRef = useRef<number | null>(null);
  const isFree = state?.mode === "free";
  const used = isFree ? Math.max(state?.used ?? 0, initialDocumentCount) : 0;
  const limit = isFree ? state?.limit ?? 3 : 0;
  const remaining = isFree ? Math.max(limit - used, 0) : 0;
  const dismissalStorageKey = `${BANNER_DISMISSAL_STORAGE_KEY}.${organizationId}`;

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
    const show = () => {
      clearBannerDismissal(dismissalStorageKey);
      setVisible(true);
    };

    if (!isFree) {
      const frame = window.requestAnimationFrame(show);
      return () => window.cancelAnimationFrame(frame);
    }

    const dismissal = readBannerDismissal(dismissalStorageKey);
    const isCurrentDismissal = dismissal
      && dismissal.used === used
      && dismissal.limit === limit
      && dismissal.expiresAt > Date.now();
    if (!isCurrentDismissal) {
      clearBannerDismissal(dismissalStorageKey);
      const frame = window.requestAnimationFrame(show);
      return () => window.cancelAnimationFrame(frame);
    }

    reappearTimerRef.current = window.setTimeout(show, dismissal.expiresAt - Date.now());
    return () => {
      if (reappearTimerRef.current !== null) window.clearTimeout(reappearTimerRef.current);
    };
  }, [dismissalStorageKey, isFree, limit, state, used]);

  useEffect(() => () => {
    if (reappearTimerRef.current !== null) window.clearTimeout(reappearTimerRef.current);
  }, []);

  if (!state) return null;

  const dismiss = () => {
    setVisible(false);
    if (reappearTimerRef.current !== null) window.clearTimeout(reappearTimerRef.current);
    const expiresAt = Date.now() + BANNER_REAPPEAR_DELAY_MS;
    try {
      window.sessionStorage.setItem(dismissalStorageKey, JSON.stringify({
        mode: "free",
        used,
        limit,
        expiresAt,
      } satisfies BannerDismissal));
    } catch {
      // Keep the notice dismissed for this mounted page if storage is unavailable.
    }
    reappearTimerRef.current = window.setTimeout(() => {
      clearBannerDismissal(dismissalStorageKey);
      setVisible(true);
    }, BANNER_REAPPEAR_DELAY_MS);
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
      <button type="button" className="workspace-close-button workspace-experience-banner__dismiss" onClick={(event) => { event.stopPropagation(); dismiss(); }} aria-label="Dismiss free review notice" tabIndex={visible ? 0 : -1}><X size={15} /></button>
      <LockKeyhole className="workspace-experience-banner__lock" aria-hidden="true" size={15} />
    </div>
  </div>;
}
