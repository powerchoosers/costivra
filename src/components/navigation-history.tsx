"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
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
  setCurrentLabel: (label: string, fallbackHref: string, fallbackLabel: string) => void;
};

const NavigationContext = createContext<NavigationContextValue | null>(null);

export const navigationStorageKey = (scope: NavigationScope) => `costivra.navigation-history.${scope}`;
const markerKey = "__costivraNavigation";

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
  const stateRef = useRef<NavigationState | null>(null);
  const isHistoryTraversal = useRef(false);
  const knownIndex = useRef<number | null>(null);
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

    if (knownMarker && isHistoryTraversal.current) {
      const position = next.entries.findIndex((entry) => entry.index === marker.index);
      if (position >= 0) next = { ...next, entries: next.entries.slice(0, position + 1) };
    } else if (!next.entries.length || next.entries[next.entries.length - 1].href !== href) {
      const index = knownMarker ? marker.index! : (next.entries.at(-1)?.index ?? -1) + 1;
      next = { ...next, entries: upsertNavigationEntry(next.entries, href, current.label, index) };
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
      const activeState = stateRef.current;
      if (activeState) updateState({ ...activeState, entries: activeState.entries.slice(0, -1) });
      window.history.back();
      return;
    }
    router.push(current.fallbackHref);
  }, [current.fallbackHref, previous, router, updateState]);

  const value = useMemo<NavigationContextValue>(() => ({
    label: previous?.label ?? current.fallbackLabel,
    fallbackHref: current.fallbackHref,
    fallbackLabel: current.fallbackLabel,
    canGoBack: Boolean(previous),
    goBack,
    setCurrentLabel,
  }), [current.fallbackHref, current.fallbackLabel, goBack, previous, setCurrentLabel]);

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
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

export function GlobalBackControl({ className = "", floatingActions }: { className?: string; floatingActions?: ReactNode }) {
  const { label, goBack } = useNavigationHistory();
  const anchorRef = useRef<HTMLDivElement>(null);
  const [isFloating, setIsFloating] = useState(false);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const observer = new IntersectionObserver(([entry]) => {
      const nextIsFloating = !entry.isIntersecting && entry.boundingClientRect.bottom <= 80;
      setIsFloating((current) => current === nextIsFloating ? current : nextIsFloating);
    }, { rootMargin: "-80px 0px 0px 0px", threshold: 0 });
    observer.observe(anchor);
    return () => observer.disconnect();
  }, []);

  const backButton = (compact = false) => (
    <button type="button" className={`global-back-control__button${compact ? " is-compact" : ""}`} onClick={goBack} aria-label={`Back to ${label}`} title={`Back to ${label}`}>
      <ArrowLeft size={compact ? 17 : 15} aria-hidden="true" />
      <span>{compact ? "Back" : `Back to ${label}`}</span>
    </button>
  );

  return <>
    <div ref={anchorRef} className={`global-back-control ${className}`}>{backButton()}</div>
    <div className={`global-back-control__floating${isFloating ? " is-visible" : ""}`} aria-hidden={!isFloating}>
      {backButton(true)}
      {floatingActions && <span className="global-back-control__actions">{floatingActions}</span>}
    </div>
  </>;
}
