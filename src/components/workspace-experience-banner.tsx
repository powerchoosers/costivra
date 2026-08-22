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
  tipKey: string;
  expiresAt: number;
};

const BANNER_DISMISSAL_STORAGE_KEY = "costivra.workspace-experience-banner.dismissal";
const FREE_BANNER_REAPPEAR_DELAY_MS = 24 * 60 * 60 * 1000;
const PAID_BANNER_REAPPEAR_DELAY_MS = 7 * 24 * 60 * 60 * 1000;

function readBannerDismissal(storageKey: string): BannerDismissal | null {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BannerDismissal>;
    if (typeof parsed.tipKey !== "string" || !Number.isFinite(parsed.expiresAt)) return null;
    return parsed as BannerDismissal;
  } catch {
    return null;
  }
}

function clearBannerDismissal(storageKey: string) {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Storage can be unavailable in private browsing; a local dismissal still works.
  }
}

export function WorkspaceExperienceBanner({
  initialDocumentCount,
  organizationId,
  activity,
}: {
  initialDocumentCount: number;
  organizationId: string;
  activity: { vendorCount: number; invoiceCount: number; contractCount: number; findingCount: number };
}) {
  const [state, setState] = useState<FreeReviewState | null>(null);
  const [visible, setVisible] = useState(false);
  const reappearTimerRef = useRef<number | null>(null);
  const isFree = state?.mode === "free";
  const used = isFree ? Math.max(state?.used ?? 0, initialDocumentCount) : 0;
  const limit = isFree ? state?.limit ?? 3 : 0;
  const remaining = isFree ? Math.max(limit - used, 0) : 0;
  const dismissalStorageKey = `${BANNER_DISMISSAL_STORAGE_KEY}.${organizationId}`;
  const tip = isFree
    ? { id: `free-${used}-${limit}`, title: `Free review · ${used} of ${limit} bills used`, message: remaining ? `${remaining} bill${remaining === 1 ? "" : "s"} left to analyze. Your source evidence stays private.` : "Your free review is complete. Subscribe to keep analyzing bills and monitoring costs.", href: null, action: null }
    : activity.invoiceCount === 0 && activity.contractCount === 0
      ? { id: "paid-first-source", title: "Bring your first source into focus", message: "Upload a bill or contract to create an evidence-backed workspace record.", href: "/app/bills", action: "Add a source" }
      : activity.vendorCount === 0
        ? { id: "paid-first-vendor", title: "Connect your first vendor", message: "Add a vendor relationship so bills, contracts, and follow-up stay together.", href: "/app/vendors", action: "Open vendors" }
        : activity.findingCount === 0
          ? { id: "paid-first-finding", title: "Turn evidence into a next step", message: "Review your source-backed records to see where Costivra can help.", href: "/app/findings", action: "Review findings" }
          : { id: "paid-review-settings", title: "Keep your workspace current", message: "Review alerts and your operating digest so important renewals stay visible.", href: "/app/settings", action: "Review settings" };
  const tipKey = `${state?.mode ?? "unknown"}:${tip.id}`;

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

    const dismissal = readBannerDismissal(dismissalStorageKey);
    const isCurrentDismissal = dismissal
      && dismissal.tipKey === tipKey
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
  }, [dismissalStorageKey, state, tipKey]);

  useEffect(() => () => {
    if (reappearTimerRef.current !== null) window.clearTimeout(reappearTimerRef.current);
  }, []);

  if (!state) return null;

  const dismiss = () => {
    setVisible(false);
    if (reappearTimerRef.current !== null) window.clearTimeout(reappearTimerRef.current);
    const expiresAt = Date.now() + (isFree ? FREE_BANNER_REAPPEAR_DELAY_MS : PAID_BANNER_REAPPEAR_DELAY_MS);
    try {
      window.localStorage.setItem(dismissalStorageKey, JSON.stringify({
        tipKey,
        expiresAt,
      } satisfies BannerDismissal));
    } catch {
      // Keep the notice dismissed for this mounted page if storage is unavailable.
    }
    reappearTimerRef.current = window.setTimeout(() => {
      clearBannerDismissal(dismissalStorageKey);
      setVisible(true);
    }, isFree ? FREE_BANNER_REAPPEAR_DELAY_MS : PAID_BANNER_REAPPEAR_DELAY_MS);
  };

  if (state.mode === "paid") {
    return <div className={`workspace-experience-banner-shell${visible ? " is-visible" : ""}`}>
      <div className="workspace-experience-banner workspace-experience-banner--paid" data-tour="plan-status" role="status">
        <span className="workspace-experience-banner__icon"><CheckCircle2 size={17} /></span>
        <div className="workspace-experience-banner__copy"><strong>{tip.title}</strong><span>{tip.message}</span></div>
        {tip.href && <Link href={tip.href}>{tip.action} <ArrowRight size={14} /></Link>}
        <button type="button" className="workspace-close-button workspace-experience-banner__dismiss" onClick={(event) => { event.stopPropagation(); dismiss(); }} aria-label="Dismiss workspace tip" tabIndex={visible ? 0 : -1}><X size={15} /></button>
      </div>
    </div>;
  }
  return <div className={`workspace-experience-banner-shell${visible ? " is-visible" : ""}`}>
    <div className={`workspace-experience-banner workspace-experience-banner--free${remaining === 0 ? " is-complete" : ""}`} data-tour="free-review-banner" role="status" aria-hidden={!visible}>
      <span className="workspace-experience-banner__icon"><ReceiptText size={17} /></span>
      <div className="workspace-experience-banner__copy"><strong>{tip.title}</strong><span>{tip.message}</span></div>
      <div className="workspace-experience-banner__progress" aria-label={`${used} of ${limit} free bills used`}><span style={{ width: `${Math.min((used / limit) * 100, 100)}%` }} /></div>
      <Link className="button button-quiet button-sm" href="/pricing?from=workspace">{remaining ? "See paid plans" : "Unlock the full workspace"} <ArrowRight size={14} /></Link>
      <button type="button" className="workspace-close-button workspace-experience-banner__dismiss" onClick={(event) => { event.stopPropagation(); dismiss(); }} aria-label="Dismiss free review notice" tabIndex={visible ? 0 : -1}><X size={15} /></button>
      <LockKeyhole className="workspace-experience-banner__lock" aria-hidden="true" size={15} />
    </div>
  </div>;
}
