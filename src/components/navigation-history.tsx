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
  floatingBackTabBottom: number | null;
  setFloatingBackTabBottom: (bottom: number | null) => void;
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
const FLOATING_BACK_SCROLL_KEYS = new Set([
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "End",
  "Home",
  "PageDown",
  "PageUp",
  " ",
]);
const recordDetailRootSelector = "[data-record-detail-root=\"true\"]";
const recordNavigationTabsSelector = "[data-record-navigation-tabs=\"true\"]";

export function isFloatingBackScrollKey(key: string) {
  return FLOATING_BACK_SCROLL_KEYS.has(key);
}

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

export function floatingBackControlTop(
  scope: NavigationScope,
  topbarBottom: number | null,
  recordTabsBottom: number | null = null,
) {
  const shellTop = topbarBottom !== null
    ? Math.ceil(topbarBottom + 12)
    : null;
  if (shellTop !== null) return shellTop;
  if (recordTabsBottom === null) return null;

  // Keep a measured record-tab fallback for unusual shell states where the
  // workspace header has not mounted yet. Once a shell header is available,
  // the floating control must stay in the shared chrome instead of dropping
  // into the record content below the tabs.
  return Math.ceil(recordTabsBottom + 10);
}

export function shouldShowFloatingBackControl(isFloating: boolean) {
  // Local record tabs tell a person where they are, but they cannot take them
  // back to the prior workspace. The compact control must remain available
  // once the in-page Back anchor has left view.
  return isFloating;
}

export function recordTabsAreVisibleInWorkspace({
  tabsTop,
  tabsBottom,
  workspaceHeaderBottom,
  viewportBottom,
}: {
  tabsTop: number;
  tabsBottom: number;
  workspaceHeaderBottom: number;
  viewportBottom: number;
}) {
  // The shell header obscures any tabs above its lower edge. Treat those tabs
  // as out of view so the compact Back control is available as soon as it has
  // a clear, visible position below the header.
  return tabsBottom > workspaceHeaderBottom && tabsTop < viewportBottom;
}

/**
 * Detail shells opt into the Back-control handoff with explicit markers. That
 * keeps ordinary workspace view filters from suppressing the control while
 * making generic records, vendor records, and Manage CRM records consistent.
 */
export function recordNavigationTabsWithin(root: Pick<ParentNode, "querySelector"> | null) {
  return root?.querySelector<HTMLElement>(recordNavigationTabsSelector) ?? null;
}

export function nextFloatingBackControlState({
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
  const isFloating = nextFloatingBackVisibility({ wasFloating, hasUserScrolled, anchorTop, anchorBottom });
  return {
    isFloating,
    visible: shouldShowFloatingBackControl(isFloating),
  };
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

export function isManageRecordDetailPath(pathname: string) {
  return /^\/manage\/(?:accounts|contacts|mail|invoice-review|intake)\/[^/]+$/.test(pathname)
    || /^\/manage\/outreach\/sequences\/[^/]+$/.test(pathname);
}

/**
 * The outer Manage page provides a contextual Back control for ordinary
 * workspaces. Detail components that render their own in-page control must
 * opt out so route changes never create duplicate anchors or floating state.
 */
export function shouldRenderManagePageBack(section: string, hasDedicatedRecordBack: boolean) {
  return section !== "overview" && !hasDedicatedRecordBack;
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
  const [floatingBackTabBottom, setFloatingBackTabBottom] = useState<number | null>(null);
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
      isManageRecordDetailPath(pathname),
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
      setFloatingBackTabBottom(null);
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
    floatingBackTabBottom,
    setFloatingBackTabBottom,
    setCurrentLabel,
  }), [current.fallbackHref, current.fallbackLabel, floatingBackTabBottom, floatingBackVisible, goBack, previous, setCurrentLabel]);

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
  const { label, goBack, floatingBackTabBottom, floatingBackVisible } = useNavigationHistory();
  const [topbarBottom, setTopbarBottom] = useState<number | null>(null);

  useLayoutEffect(() => {
    const topbarSelector = scope === "app"
      ? ".app-work-canvas > .app-topbar"
      : ".manage-shell-v2 .manage-topbar";
    const topbar = document.querySelector<HTMLElement>(topbarSelector);
    if (!topbar) return;

    const updateTop = () => {
      const nextTopbarBottom = topbar.getBoundingClientRect().bottom;
      setTopbarBottom((currentTopbarBottom) => currentTopbarBottom === nextTopbarBottom ? currentTopbarBottom : nextTopbarBottom);
    };

    const shellRoot = scope === "app"
      ? topbar.closest<HTMLElement>(".app-work-canvas")
      : topbar.closest<HTMLElement>(".manage-main");
    const scrollRoot = shellRoot?.querySelector<HTMLElement>(scope === "app" ? ".app-content" : ".manage-page");
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
    const reviewNotice = scope === "app"
      ? document.querySelector<HTMLElement>(".workspace-experience-banner-shell")
      : null;
    if (shellRoot) observer.observe(shellRoot);
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

  const top = floatingBackControlTop(scope, topbarBottom, floatingBackTabBottom);
  const style = top === null ? undefined : ({ "--global-back-top": `${top}px` } as CSSProperties);

  return (
    <div className={floatingBackControlClassName(scope, floatingBackVisible)} style={style} aria-hidden={!floatingBackVisible} inert={!floatingBackVisible}>
      <GlobalBackButton label={label} goBack={goBack} compact isInteractive={floatingBackVisible} />
      {floatingActions ? <span className="global-back-control__actions">{floatingActions}</span> : null}
    </div>
  );
}

export function GlobalBackControl({ className = "", floatingActions }: { className?: string; floatingActions?: ReactNode }) {
  const { label, goBack, floatingBackVisible, setFloatingBackTabBottom, setFloatingBackVisible } = useNavigationHistory();
  const floatingBackActionsController = useContext(FloatingBackActionsControllerContext);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const anchorRef = useRef<HTMLDivElement>(null);
  const hasUserScrolled = useRef(false);
  const routeSettled = useRef(false);
  const floatingBackIsFloatingRef = useRef(false);
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
    floatingBackIsFloatingRef.current = false;
    floatingBackVisibleRef.current = false;
    setFloatingBackVisible(false);
    setFloatingBackTabBottom(null);
    // Let the scroll observer evaluate after the route settles. Measuring in the
    // next animation frame can still see the outgoing page's scroll position,
    // which makes the fixed control flash during a client-side route change.
  }, [navigationKey, setFloatingBackTabBottom, setFloatingBackVisible]);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const scrollContainer = anchor.closest<HTMLElement>("[data-workspace-scrollbar]");
    const recordTabs = recordNavigationTabsWithin(anchor.closest<HTMLElement>(recordDetailRootSelector));
    const workspaceHeader = document.querySelector<HTMLElement>(".app-work-canvas > .app-topbar, .manage-shell-v2 .manage-topbar");

    hasUserScrolled.current = false;
    routeSettled.current = false;
    let updateFrameId: number | null = null;

    const eventTargetsScrollContainer = (target: EventTarget | null, allowDocumentRoot = false) => {
      if (!scrollContainer || !(target instanceof Node)) return true;
      if (allowDocumentRoot && (target === document.body || target === document.documentElement)) return true;
      return scrollContainer.contains(target);
    };
    const isEditableTarget = (target: EventTarget | null) => target instanceof HTMLElement
      && (target.isContentEditable || ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName));

    const updateFloatingState = () => {
      if (!routeSettled.current) return;
      const { top, bottom } = anchor.getBoundingClientRect();
      const documentScrollTop = Math.max(window.scrollY, document.documentElement.scrollTop, document.body.scrollTop);
      const workspaceScrollTop = scrollContainer?.scrollTop ?? 0;
      const workspaceIsAtStart = documentScrollTop <= 1 && workspaceScrollTop <= 1;
      const tabsRect = recordTabs?.getBoundingClientRect();
      const workspaceHeaderBottom = workspaceHeader?.getBoundingClientRect().bottom ?? 0;
      const recordTabsAreVisible = Boolean(tabsRect && recordTabsAreVisibleInWorkspace({
        tabsTop: tabsRect.top,
        tabsBottom: tabsRect.bottom,
        workspaceHeaderBottom,
        viewportBottom: window.innerHeight,
      }));
      const nextState = workspaceIsAtStart
        ? { isFloating: false, visible: false }
        : nextFloatingBackControlState({
            wasFloating: floatingBackIsFloatingRef.current,
            hasUserScrolled: hasUserScrolled.current,
            anchorTop: top,
            anchorBottom: bottom,
          });
      floatingBackIsFloatingRef.current = nextState.isFloating;
      setFloatingBackTabBottom(nextState.visible && recordTabsAreVisible && tabsRect ? tabsRect.bottom : null);
      if (floatingBackVisibleRef.current !== nextState.visible) {
        floatingBackVisibleRef.current = nextState.visible;
        setFloatingBackVisible(nextState.visible);
      }
    };
    const queueFloatingState = () => {
      if (updateFrameId !== null) return;
      updateFrameId = window.requestAnimationFrame(() => {
        updateFrameId = null;
        updateFloatingState();
      });
    };
    const observer = new IntersectionObserver(queueFloatingState, { rootMargin: "-80px 0px 0px 0px", threshold: 0 });
    const tabResizeObserver = recordTabs && typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(queueFloatingState)
      : null;
    const onScroll = () => {
      // Route restoration and layout changes can emit scroll events before a
      // person has interacted with the new record. Do not let those events
      // make the compact control appear on an otherwise fresh destination.
      if (!routeSettled.current || !hasUserScrolled.current) return;
      queueFloatingState();
    };
    const markUserScrolled = () => {
      hasUserScrolled.current = true;
      if (routeSettled.current) queueFloatingState();
    };
    const onWheel = (event: WheelEvent) => {
      if (!eventTargetsScrollContainer(event.target)) return;
      markUserScrolled();
    };
    const onTouchMove = (event: TouchEvent) => {
      if (!eventTargetsScrollContainer(event.target)) return;
      markUserScrolled();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isFloatingBackScrollKey(event.key) || isEditableTarget(event.target)) return;
      if (!eventTargetsScrollContainer(event.target, true)) return;
      markUserScrolled();
    };

    const settleTimer = window.setTimeout(() => {
      routeSettled.current = true;
      queueFloatingState();
    }, NAVIGATION_SETTLE_MS);
    observer.observe(anchor);
    if (tabResizeObserver && recordTabs) tabResizeObserver.observe(recordTabs);
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", queueFloatingState, { passive: true });
    window.addEventListener("wheel", onWheel, { capture: true, passive: true });
    window.addEventListener("touchmove", onTouchMove, { capture: true, passive: true });
    window.addEventListener("keydown", onKeyDown, { capture: true });
    scrollContainer?.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(settleTimer);
      observer.disconnect();
      tabResizeObserver?.disconnect();
      if (updateFrameId !== null) window.cancelAnimationFrame(updateFrameId);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", queueFloatingState);
      window.removeEventListener("wheel", onWheel, true);
      window.removeEventListener("touchmove", onTouchMove, true);
      window.removeEventListener("keydown", onKeyDown, true);
      scrollContainer?.removeEventListener("scroll", onScroll);
      setFloatingBackTabBottom(null);
    };
  }, [navigationKey, setFloatingBackTabBottom, setFloatingBackVisible]);

  return <div ref={anchorRef} className={`global-back-control ${className}`}><GlobalBackButton label={label} goBack={goBack} isInteractive={!floatingBackVisible} /></div>;
}
