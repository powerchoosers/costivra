"use client";

import Lenis from "lenis";
import { useEffect } from "react";

// Keep nested panels native without asking Lenis to inspect the entire DOM tree
// on every wheel event. This is a fixed selector so the hot path stays cheap.
const NATIVE_SCROLL_SELECTOR = [
  "[data-lenis-prevent]",
  ".workspace-scroll-region",
  ".app-sidebar nav",
  ".app-nav-scroll",
  ".manage-sidebar nav.manage-primary-nav",
  ".app-mobile-drawer",
  ".mobile-drawer",
  ".app-global-results",
  ".manage-global-results",
  ".manage-compose-recipient-results",
  ".manage-mail-list > div",
  ".manage-message-stack",
  ".manage-mail-contact",
  ".drawer-content",
  ".drawer-body",
  ".command-overlay",
  ".command-list",
  ".manage-modal",
  ".manage-sidepanel",
  ".manage-inspector-tab-panel",
  ".manage-record-right-rail",
  ".manage-compose-message-scroll",
  ".manage-assistant-body",
  ".assistant-history-rail",
  ".assistant-session-list",
  ".assistant-welcome",
  ".assistant-thread",
  ".assistant-composer-textarea",
  ".manage-table-wrap",
  ".table-scroll",
  ".table-wrap",
  ".invoice-review-table-wrap",
  ".record-line-items",
  ".record-files-workspace__table",
  ".invoice-pdf-canvas",
  ".portal-modal-layer",
  ".portal-modal-body",
  ".chat-scroll",
  ".vendor-table-wrap",
  ".vendor-panel-scroll",
  ".demo-drawer-layer",
  ".demo-drawer-body",
  ".bills-table-wrap",
].join(",");

const SCROLLBAR_IDLE_DELAY = 700;
const WORKSPACE_SCROLLBAR_ATTRIBUTE = "data-workspace-scrollbar";

function isScrollableOverflow(value: string) {
  return ["auto", "overlay", "scroll"].includes(value);
}

function canNativeScroll(element: Element, deltaX: number, deltaY: number) {
  if (!(element instanceof HTMLElement)) return false;

  const style = window.getComputedStyle(element);
  const canScrollX = deltaX !== 0 && isScrollableOverflow(style.overflowX) && element.scrollWidth > element.clientWidth;
  const canScrollY = deltaY !== 0 && isScrollableOverflow(style.overflowY) && element.scrollHeight > element.clientHeight;

  if (canScrollX) {
    const maxScrollLeft = element.scrollWidth - element.clientWidth;
    if (deltaX < 0 ? element.scrollLeft > 0 : element.scrollLeft < maxScrollLeft) return true;
  }

  if (canScrollY) {
    const maxScrollTop = element.scrollHeight - element.clientHeight;
    if (deltaY < 0 ? element.scrollTop > 0 : element.scrollTop < maxScrollTop) return true;
  }

  return false;
}

function isScrollport(element: Element) {
  if (!(element instanceof HTMLElement)) return false;

  const style = window.getComputedStyle(element);
  return (
    (isScrollableOverflow(style.overflowX) && element.scrollWidth > element.clientWidth)
    || (isScrollableOverflow(style.overflowY) && element.scrollHeight > element.clientHeight)
  );
}

function findNativeScroller(event: Event, deltaX: number, deltaY: number) {
  for (const item of event.composedPath()) {
    if (!(item instanceof HTMLElement)) continue;
    if (item.matches(NATIVE_SCROLL_SELECTOR) && canNativeScroll(item, deltaX, deltaY)) return item;
  }
  return null;
}

function findScrollport(event: Event) {
  for (const item of event.composedPath()) {
    if (!(item instanceof HTMLElement)) continue;
    if (isScrollport(item)) return item;
  }
  return null;
}

/**
 * Keeps page-level scrolling deliberate without taking over scrollable panels,
 * dialogs, or the experience of people who request reduced motion.
 */
export function SmoothScroll() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lenis = reducedMotion ? null : new Lenis({
      anchors: true,
      autoRaf: true,
      // A slightly higher lerp keeps the page fluid while reaching the input
      // position sooner, which feels better on high-refresh and trackpad input.
      lerp: 0.12,
      smoothWheel: true,
      // Explicit native panels avoid Lenis' per-event nested-scroll DOM walk.
      allowNestedScroll: false,
      prevent: (node) => node.hasAttribute("data-lenis-prevent"),
      virtualScroll: ({ deltaX, deltaY, event }) => {
        return findNativeScroller(event, deltaX, deltaY) === null;
      },
      stopInertiaOnNavigate: true,
    });

    const scrollTimers = new Map<HTMLElement, { x?: number; y?: number }>();
    const scrollPositions = new WeakMap<HTMLElement, { left: number; top: number }>();
    let pageScrollTimer: number | undefined;
    const activatePageScrollbar = () => {
      const root = document.documentElement;
      root.classList.add("is-scroll-y-active");
      if (pageScrollTimer !== undefined) window.clearTimeout(pageScrollTimer);
      pageScrollTimer = window.setTimeout(() => {
        root.classList.remove("is-scroll-y-active");
        pageScrollTimer = undefined;
      }, SCROLLBAR_IDLE_DELAY);
    };
    const registerScrollbar = (target: HTMLElement) => {
      if (!target.matches(NATIVE_SCROLL_SELECTOR)) return;
      target.setAttribute(WORKSPACE_SCROLLBAR_ATTRIBUTE, "");
      if (!scrollPositions.has(target)) {
        scrollPositions.set(target, { left: target.scrollLeft, top: target.scrollTop });
      }
    };
    const registerAddedScrollbars = (node: Node) => {
      if (!(node instanceof HTMLElement)) return;
      registerScrollbar(node);
      node.querySelectorAll<HTMLElement>(NATIVE_SCROLL_SELECTOR).forEach(registerScrollbar);
    };
    const primeNativeScrollPosition = (event: Event) => {
      const target = findScrollport(event);
      if (target !== null && !scrollPositions.has(target)) {
        scrollPositions.set(target, { left: target.scrollLeft, top: target.scrollTop });
      }
    };
    const handleNativeScroll = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !isScrollport(target)) return;

      registerScrollbar(target);

      const hadPreviousPosition = scrollPositions.has(target);
      const previous = scrollPositions.get(target) ?? { left: 0, top: 0 };
      const movedX = hadPreviousPosition ? target.scrollLeft !== previous.left : target.scrollLeft !== 0;
      const movedY = hadPreviousPosition ? target.scrollTop !== previous.top : target.scrollTop !== 0;
      scrollPositions.set(target, { left: target.scrollLeft, top: target.scrollTop });

      if (!movedX && !movedY) return;

      const timers = scrollTimers.get(target) ?? {};
      const deactivateAxis = (axis: "x" | "y") => {
        const activeClass = axis === "x" ? "is-scroll-x-active" : "is-scroll-y-active";
        const timerKey = axis === "x" ? "x" : "y";
        target.classList.remove(activeClass);
        if (timers[timerKey] !== undefined) window.clearTimeout(timers[timerKey]);
        delete timers[timerKey];
      };
      const activateAxis = (axis: "x" | "y") => {
        const activeClass = axis === "x" ? "is-scroll-x-active" : "is-scroll-y-active";
        const timerKey = axis === "x" ? "x" : "y";
        target.classList.add(activeClass);
        if (timers[timerKey] !== undefined) window.clearTimeout(timers[timerKey]);
        timers[timerKey] = window.setTimeout(() => {
          target.classList.remove(activeClass);
          delete timers[timerKey];
          if (timers.x === undefined && timers.y === undefined) scrollTimers.delete(target);
        }, SCROLLBAR_IDLE_DELAY);
      };

      if (movedX && !movedY) deactivateAxis("y");
      if (movedY && !movedX) deactivateAxis("x");
      if (movedX) activateAxis("x");
      if (movedY) activateAxis("y");
      scrollTimers.set(target, timers);
    };

    // Scroll events do not bubble from nested panels, so capture them once at
    // the document rather than attaching a listener to every table instance.
    document.documentElement.setAttribute(WORKSPACE_SCROLLBAR_ATTRIBUTE, "");
    document.querySelectorAll<HTMLElement>(NATIVE_SCROLL_SELECTOR).forEach(registerScrollbar);
    const scrollbarObserver = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach(registerAddedScrollbars);
      }
    });
    scrollbarObserver.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("wheel", primeNativeScrollPosition, { capture: true, passive: true });
    document.addEventListener("touchstart", primeNativeScrollPosition, { capture: true, passive: true });
    document.addEventListener("pointerdown", primeNativeScrollPosition, { capture: true, passive: true });
    document.addEventListener("keydown", primeNativeScrollPosition, { capture: true });
    document.addEventListener("scroll", handleNativeScroll, { capture: true, passive: true });

    if (lenis) {
      lenis.on("scroll", activatePageScrollbar);
    } else {
      window.addEventListener("scroll", activatePageScrollbar, { passive: true });
    }

    return () => {
      document.removeEventListener("wheel", primeNativeScrollPosition, true);
      document.removeEventListener("touchstart", primeNativeScrollPosition, true);
      document.removeEventListener("pointerdown", primeNativeScrollPosition, true);
      document.removeEventListener("keydown", primeNativeScrollPosition, true);
      document.removeEventListener("scroll", handleNativeScroll, true);
      scrollbarObserver.disconnect();
      scrollTimers.forEach((timers, target) => {
        if (timers.x !== undefined) window.clearTimeout(timers.x);
        if (timers.y !== undefined) window.clearTimeout(timers.y);
        target.classList.remove("is-scroll-x-active", "is-scroll-y-active");
      });
      scrollTimers.clear();
      if (lenis) {
        lenis.off("scroll", activatePageScrollbar);
        lenis.destroy();
      } else {
        window.removeEventListener("scroll", activatePageScrollbar);
      }
      if (pageScrollTimer !== undefined) window.clearTimeout(pageScrollTimer);
      document.documentElement.classList.remove("is-scroll-y-active");
      document.documentElement.removeAttribute(WORKSPACE_SCROLLBAR_ATTRIBUTE);
    };
  }, []);

  return null;
}
