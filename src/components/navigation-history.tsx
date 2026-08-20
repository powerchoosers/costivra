"use client";

import { ArrowLeft } from "@/lib/icons";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  type CSSProperties,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type NavigationScope = "app" | "manage";

export type NavigationEntry = {
  href: string;
  label: string;
  index: number;
};

type NavigationState = {
  sessionId: string;
  entries: NavigationEntry[];
};

type NavigationContextValue = {
  label: string;
  fallbackHref: string;
  fallbackLabel: string;
  canGoBack: boolean;
  goBack: () => void;
  floatingBackVisible: boolean;
  setFloatingBackVisible: (visible: boolean) => void;
  setCurrentLabel: (label: string, fallbackHref: string, fallbackLabel: string) => void;
};

const NavigationContext = createContext<NavigationContextValue | null>(null);

type FloatingBackActionsController = {
  register: (controlId: symbol, actions: ReactNode) => void;
  update: (controlId: symbol, actions: ReactNode) => void;
  unregister: (controlId: symbol) => void;
};

const FloatingBackActionsControllerContext = createContext<FloatingBackActionsController | null>(null);

export const navigationStorageKey = (scope: NavigationScope) => `costivra.navigation-history.${scope}`;
const markerKey = "__costivraNavigation";
const NAVIGATION_SETTLE_MS = 240;
const FLOATING_BACK_SHOW_THRESHOLD = 80;
const FLOATING_BACK_HIDE_THRESHOLD = 96;

export function nextFloatingBackVisibility({
  wasFloating,
  hasUserScrolled,
  anchorTop,
  anchorBottom,
}: {
  wasFloating: boolean;
  hasUserScrolled: boolean;
  anchorTop: number;
  anchorBottom: number;
}) {
  // Keep the current state while the page-level control overlaps the fixed
  // shell bar. The gap between these thresholds prevents layout/scroll jitter
  // around a single pixel boundary from repeatedly toggling the fixed control.
  if (anchorBottom <= FLOATING_BACK_SHOW_THRESHOLD) return hasUserScrolled || wasFloating;
  if (anchorTop >= FLOATING_BACK_HIDE_THRESHOLD) return false;
  return wasFloating;
}

export function floatingBackControlClassName(scope: NavigationScope, visible: boolean) {
  return `global-back-control__floating global-back-control__floating--${scope}${visible ? " is-visible" : ""}`;
}

export function floatingBackControlTop(scope: NavigationScope, topbarBottom: number | null) {
  if (scope !== "app" || topbarBottom === null) return null;
  // The customer workspace canvas can move when the review notice is visible.
  // Keep the persistent control below the actual top bar instead of guessing a
  // fixed viewport offset that can land underneath the notice.
  return Math.ceil(topbarBottom + 12);
}

function makeSessionId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function readState(scope: NavigationScope): NavigationState | null {
  try {
    const raw = window.sessionStorage.getItem(navigationStorageKey(scope));
    if (!raw) return null;
    const value = JSON.parse(raw) as NavigationState;
    if (!value.sessionId || !Array.isArray(value.entries)) return null;
    return value;
  } catch {
    return null;
  }
}

function writeState(scope: NavigationScope, state: NavigationState) {
  try {
    window.sessionStorage.setItem(navigationStorageKey(scope), JSON.stringify(state));
  } catch {
    // Navigation remains usable for this page if session storage is unavailable.
  }
}

function currentHref(pathname: string, search: string) {
  return `${pathname}${search ? `?${search}` : ""}${window.location.hash}`;
}

function isManageRecordDetail(pathname: string) {
  return /^\/manage\/(?:accounts|contacts)\/[^/]+$/.test(pathname)
    || /^\/manage\/outreach\/sequences\/[^/]+$/.test(pathname);
}

function defaultLabel(scope: NavigationScope) {
  return scope === "app" ? "Command Center" : "Client operations";
}

export function upsertNavigationEntry(entries: NavigationEntry[], href: string, label: string, index: number) {
  const active = entries.at(-1);
  if (!active || active.href !== href) return [...entries, { href, label, index }];
  if (active.label === label) return entries;
  return [...entries.slice(0, -1), { ...active, label }];
}

export function previousNavigationEntry(entries: NavigationEntry[]) {
  return entries.length > 1 ? entries[entries.length - 2] : null;
}

export function NavigationHistoryProvider({ scope, children }: { scope: NavigationScope; children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<NavigationState | null>(null);
  const [current, setCurrent] = useState({ label: defaultLabel(scope), fallbackHref: scope === "app" ? "/app" : "/manage", fallbackLabel: defaultLabel(scope) });
  const [floatingBackVisible, setFloatingBackVisible] = useState(false);
  const [floatingBackActions, setFloatingBackActions] = useState<ReactNode>(null);
  const stateRef = useRef<NavigationState | null>(null);
  const isHistoryTraversal = useRef(false);
  const knownIndex = useRef<number | null>(null);
  const activeFloatingBackControl = useRef<symbol | null>(null);
  const floatingBackCleanupTimer = useRef<number | null>(null);
  const search = searchParams.toString();

  const updateState = useCallback((next: NavigationState) => {
    stateRef.current = next;
    setState(next);
    writeState(scope, next);
  }, [scope]);

  useEffect(() => {
    const onPopState = () => { isHistoryTraversal.current = true; };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const href = currentHref(pathname, search);
    const marker = (window.history.state?.[markerKey] ?? null) as { sessionId?: string; index?: number } | null;
    let next = stateRef.current ?? readState(scope) ?? { sessionId: makeSessionId(), entries: [] };
    const knownMarker = marker?.sessionId === next.sessionId && typeof marker.index === "number";
    const activeEntry = next.entries.at(-1);
    const isSameManageRecord = Boolean(
      !isHistoryTraversal.current &&
      activeEntry &&
      activeEntry.href.split("?")[0] === pathname &&
      isManageRecordDetail(pathname),
    );

    if (knownMarker && isHistoryTraversal.current) {
      const position = next.entries.findIndex((entry) => entry.index === marker.index);
      if (position >= 0) next = { ...next, entries: next.entries.slice(0, position + 1) };
    } else if (!next.entries.length || next.entries[next.entries.length - 1].href !== href) {
      if (isSameManageRecord && activeEntry) {
        next = { ...next, entries: [...next.entries.slice(0, -1), { ...activeEntry, href }] };
      } else {
        const index = knownMarker ? marker.index! : (next.entries.at(-1)?.index ?? -1) + 1;
        next = { ...next, entries: upsertNavigationEntry(next.entries, href, current.label, index) };
      }
    }

    next = { ...next, entries: upsertNavigationEntry(next.entries, href, current.label, next.entries.at(-1)?.index ?? 0) };
    const activeIndex = next.entries.at(-1)?.index ?? 0;
    if (!knownMarker || marker?.index !== activeIndex) {
      window.history.replaceState({ ...(window.history.state ?? {}), [markerKey]: { sessionId: next.sessionId, index: activeIndex } }, "");
    }
    isHistoryTraversal.current = false;
    knownIndex.current = activeIndex;
    updateState(next);
  }, [current.label, pathname, scope, search, updateState]);

  const setCurrentLabel = useCallback((label: string, fallbackHref: string, fallbackLabel: string) => {
    setCurrent({ label, fallbackHref, fallbackLabel });
  }, []);

  const previous = previousNavigationEntry(state?.entries ?? []);
  const goBack = useCallback(() => {
    if (previous) {
      // The marker is written to every in-app history entry, so this cannot leave
      // Costivra when a previous in-app page is available.
      // Let the popstate/navigation effect trim the stack after the destination
      // is known. Optimistically trimming it here briefly changes the label to
      // the wrong destination while the browser is still moving.
      window.history.back();
      return;
    }
    router.push(current.fallbackHref);
  }, [current.fallbackHref, previous, router]);

  const clearFloatingBackCleanupTimer = useCallback(() => {
    if (floatingBackCleanupTimer.current === null) return;
    window.clearTimeout(floatingBackCleanupTimer.current);
    floatingBackCleanupTimer.current = null;
  }, []);

  useEffect(() => clearFloatingBackCleanupTimer, [clearFloatingBackCleanupTimer]);

  const registerFloatingBackControl = useCallback((controlId: symbol, actions: ReactNode) => {
    clearFloatingBackCleanupTimer();
    activeFloatingBackControl.current = controlId;
    setFloatingBackActions(actions);
  }, [clearFloatingBackCleanupTimer]);

  const updateFloatingBackControl = useCallback((controlId: symbol, actions: ReactNode) => {
    if (activeFloatingBackControl.current === controlId) setFloatingBackActions(actions);
  }, []);

  const unregisterFloatingBackControl = useCallback((controlId: symbol) => {
    if (activeFloatingBackControl.current !== controlId) return;
    clearFloatingBackCleanupTimer();
    // Layout-effect cleanup for the old page runs before the replacement control
    // registers. Deferring the clear by one task lets that registration take over
    // without removing the fixed control between pages.
    floatingBackCleanupTimer.current = window.setTimeout(() => {
      if (activeFloatingBackControl.current !== controlId) return;
      activeFloatingBackControl.current = null;
      floatingBackCleanupTimer.current = null;
      setFloatingBackVisible(false);
      setFloatingBackActions(null);
    }, 0);
  }, [clearFloatingBackCleanupTimer]);

  const floatingBackActionsController = useMemo<FloatingBackActionsController>(() => ({
    register: registerFloatingBackControl,
    update: updateFloatingBackControl,
    unregister: unregisterFloatingBackControl,
  }), [registerFloatingBackControl, unregisterFloatingBackControl, updateFloatingBackControl]);

  const value = useMemo<NavigationContextValue>(() => ({
    label: previous?.label ?? current.fallbackLabel,
    fallbackHref: current.fallbackHref,
    fallbackLabel: current.fallbackLabel,
    canGoBack: Boolean(previous),
    goBack,
    floatingBackVisible,
    setFloatingBackVisible,
    setCurrentLabel,
  }), [current.fallbackHref, current.fallbackLabel, floatingBackVisible, goBack, previous, setCurrentLabel]);

  return (
    <FloatingBackActionsControllerContext.Provider value={floatingBackActionsController}>
      <NavigationContext.Provider value={value}>
        {children}
        <PersistentFloatingBackControl scope={scope} floatingActions={floatingBackActions} />
      </NavigationContext.Provider>
    </FloatingBackActionsControllerContext.Provider>
  );
}

export function useNavigationLabel(label: string, fallbackHref: string, fallbackLabel: string) {
  const context = useContext(NavigationContext);
  useEffect(() => {
    context?.setCurrentLabel(label, fallbackHref, fallbackLabel);
  }, [context, fallbackHref, fallbackLabel, label]);
}

function useNavigationHistory() {
  const context = useContext(NavigationContext);
  if (!context) throw new Error("Back navigation controls must be rendered inside NavigationHistoryProvider.");
  return context;
}

function GlobalBackButton({ label, goBack, compact = false, isInteractive = true }: { label: string; goBack: () => void; compact?: boolean; isInteractive?: boolean }) {
  return (
    <button type="button" className={`global-back-control__button${compact ? " is-compact" : ""}`} onClick={goBack} aria-label={`Back to ${label}`} title={`Back to ${label}`} tabIndex={isInteractive ? undefined : -1}>
      <span className="global-back-control__content">
        <ArrowLeft size={compact ? 17 : 15} aria-hidden="true" />
        <span className="global-back-control__label">{compact ? "Back" : `Back to ${label}`}</span>
      </span>
    </button>
  );
}

function PersistentFloatingBackControl({ scope, floatingActions }: { scope: NavigationScope; floatingActions: ReactNode }) {
  const { label, goBack, floatingBackVisible } = useNavigationHistory();
  const [top, setTop] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (scope !== "app") {
      return;
    }

    const topbar = document.querySelector<HTMLElement>(".app-work-canvas > .app-topbar");
    if (!topbar) return;

    const updateTop = () => {
      const nextTop = floatingBackControlTop(scope, topbar.getBoundingClientRect().bottom);
      setTop((currentTop) => currentTop === nextTop ? currentTop : nextTop);
    };

    const canvas = topbar.closest<HTMLElement>(".app-work-canvas");
    const scrollRoot = canvas?.querySelector<HTMLElement>(".app-content");
    let frameId: number | null = null;
    const queueTopUpdate = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        updateTop();
      });
    };

    const observer = new ResizeObserver(updateTop);
    observer.observe(topbar);
    const reviewNotice = document.querySelector<HTMLElement>(".workspace-experience-banner-shell");
    if (canvas) observer.observe(canvas);
    if (reviewNotice) observer.observe(reviewNotice);
    window.addEventListener("resize", queueTopUpdate);
    window.addEventListener("scroll", queueTopUpdate, { passive: true });
    scrollRoot?.addEventListener("scroll", queueTopUpdate, { passive: true });
    queueTopUpdate();
    return () => {
      observer.disconnect();
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", queueTopUpdate);
      window.removeEventListener("scroll", queueTopUpdate);
      scrollRoot?.removeEventListener("scroll", queueTopUpdate);
    };
  }, [scope]);

  const style = scope !== "app" || top === null ? undefined : ({ "--global-back-top": `${top}px` } as CSSProperties);

  return (
    <div className={floatingBackControlClassName(scope, floatingBackVisible)} style={style} aria-hidden={!floatingBackVisible} inert={!floatingBackVisible}>
      <GlobalBackButton label={label} goBack={goBack} compact isInteractive={floatingBackVisible} />
      {floatingActions ? <span className="global-back-control__actions">{floatingActions}</span> : null}
    </div>
  );
}

export function GlobalBackControl({ className = "", floatingActions }: { className?: string; floatingActions?: ReactNode }) {
  const { label, goBack, floatingBackVisible, setFloatingBackVisible } = useNavigationHistory();
  const floatingBackActionsController = useContext(FloatingBackActionsControllerContext);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const anchorRef = useRef<HTMLDivElement>(null);
  const hasUserScrolled = useRef(false);
  const routeSettled = useRef(false);
  const floatingBackControlId = useRef(Symbol("global-back-control"));
  const floatingActionsRef = useRef(floatingActions);
  const floatingBackVisibleRef = useRef(floatingBackVisible);
  const navigationKey = `${pathname}?${searchParams.toString()}`;

  if (!floatingBackActionsController) throw new Error("Back navigation controls must be rendered inside NavigationHistoryProvider.");

  useLayoutEffect(() => {
    floatingActionsRef.current = floatingActions;
    floatingBackActionsController.update(floatingBackControlId.current, floatingActions);
  }, [floatingActions, floatingBackActionsController]);

  useLayoutEffect(() => {
    floatingBackVisibleRef.current = floatingBackVisible;
  }, [floatingBackVisible]);

  useLayoutEffect(() => {
    const controlId = floatingBackControlId.current;
    floatingBackActionsController.register(controlId, floatingActionsRef.current);
    return () => floatingBackActionsController.unregister(controlId);
  }, [floatingBackActionsController]);

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    hasUserScrolled.current = false;
    routeSettled.current = false;
    // Hide before the new route paints. Without this reset, the persistent
    // control can briefly inherit the previous record's visible state.
    floatingBackVisibleRef.current = false;
    setFloatingBackVisible(false);
    // Let the scroll observer evaluate after the route settles. Measuring in the
    // next animation frame can still see the outgoing page's scroll position,
    // which makes the fixed control flash during a client-side route change.
  }, [navigationKey, setFloatingBackVisible]);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const scrollContainer = anchor.closest<HTMLElement>("[data-workspace-scrollbar]");

    hasUserScrolled.current = false;
    routeSettled.current = false;

    const updateFloatingState = () => {
      if (!routeSettled.current) return;
      const { top, bottom } = anchor.getBoundingClientRect();
      const nextIsFloating = nextFloatingBackVisibility({
        wasFloating: floatingBackVisibleRef.current,
        hasUserScrolled: hasUserScrolled.current,
        anchorTop: top,
        anchorBottom: bottom,
      });
      setFloatingBackVisible(nextIsFloating);
    };
    const observer = new IntersectionObserver(updateFloatingState, { rootMargin: "-80px 0px 0px 0px", threshold: 0 });
    const onScroll = () => {
      hasUserScrolled.current = true;
      if (!routeSettled.current) return;
      window.requestAnimationFrame(updateFloatingState);
    };
    const onWheel = (event: WheelEvent) => {
      if (scrollContainer && event.target instanceof Node && !scrollContainer.contains(event.target)) return;
      onScroll();
    };

    const settleTimer = window.setTimeout(() => {
      routeSettled.current = true;
      updateFloatingState();
    }, NAVIGATION_SETTLE_MS);
    observer.observe(anchor);
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("wheel", onWheel, { capture: true, passive: true });
    scrollContainer?.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(settleTimer);
      observer.disconnect();
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("wheel", onWheel, true);
      scrollContainer?.removeEventListener("scroll", onScroll);
    };
  }, [navigationKey, setFloatingBackVisible]);

  return <div ref={anchorRef} className={`global-back-control ${className}`}><GlobalBackButton label={label} goBack={goBack} isInteractive={!floatingBackVisible} /></div>;
}
