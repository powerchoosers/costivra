"use client";

import Lenis from "lenis";
import { useEffect } from "react";

// Keep nested panels native without asking Lenis to inspect the entire DOM tree
// on every wheel event. This is a fixed selector so the hot path stays cheap.
const NATIVE_SCROLL_SELECTOR = [
  "[data-lenis-prevent]",
  ".app-sidebar nav",
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

function canNativeScroll(element: Element, deltaX: number, deltaY: number) {
  if (!(element instanceof HTMLElement)) return false;

  const style = window.getComputedStyle(element);
  const horizontal = Math.abs(deltaX) > Math.abs(deltaY);

  if (horizontal) {
    if (!["auto", "overlay", "scroll"].includes(style.overflowX) || element.scrollWidth <= element.clientWidth) return false;
    const maxScrollLeft = element.scrollWidth - element.clientWidth;
    return deltaX < 0 ? element.scrollLeft > 0 : element.scrollLeft < maxScrollLeft;
  }

  if (!["auto", "overlay", "scroll"].includes(style.overflowY) || element.scrollHeight <= element.clientHeight) return false;
  const maxScrollTop = element.scrollHeight - element.clientHeight;
  return deltaY < 0 ? element.scrollTop > 0 : element.scrollTop < maxScrollTop;
}

function findNativeScroller(event: Event) {
  for (const item of event.composedPath()) {
    if (!(item instanceof HTMLElement)) continue;
    const scroller = item.closest(NATIVE_SCROLL_SELECTOR);
    if (scroller instanceof HTMLElement) return scroller;
  }
  return null;
}

/**
 * Keeps page-level scrolling deliberate without taking over scrollable panels,
 * dialogs, or the experience of people who request reduced motion.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
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
        const nativeScroller = findNativeScroller(event);
        return nativeScroller === null || !canNativeScroll(nativeScroller, deltaX, deltaY);
      },
      stopInertiaOnNavigate: true,
    });

    const scrollTimers = new WeakMap<HTMLElement, { x?: number; y?: number }>();
    const scrollPositions = new WeakMap<HTMLElement, { left: number; top: number }>();
    const primeNativeScrollPosition = (event: Event) => {
      const target = findNativeScroller(event);
      if (target !== null && !scrollPositions.has(target)) {
        scrollPositions.set(target, { left: target.scrollLeft, top: target.scrollTop });
      }
    };
    const handleNativeScroll = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !target.matches(NATIVE_SCROLL_SELECTOR)) return;

      const previous = scrollPositions.get(target) ?? { left: target.scrollLeft, top: target.scrollTop };
      const movedX = target.scrollLeft !== previous.left;
      const movedY = target.scrollTop !== previous.top;
      scrollPositions.set(target, { left: target.scrollLeft, top: target.scrollTop });

      if (!movedX && !movedY) return;

      const timers = scrollTimers.get(target) ?? {};
      const activateAxis = (axis: "x" | "y") => {
        const activeClass = axis === "x" ? "is-scroll-x-active" : "is-scroll-y-active";
        const timerKey = axis === "x" ? "x" : "y";
        target.classList.add(activeClass);
        if (timers[timerKey] !== undefined) window.clearTimeout(timers[timerKey]);
        timers[timerKey] = window.setTimeout(() => {
          target.classList.remove(activeClass);
          delete timers[timerKey];
        }, 450);
      };

      if (movedX) activateAxis("x");
      if (movedY) activateAxis("y");
      scrollTimers.set(target, timers);
    };

    // Scroll events do not bubble from nested panels, so capture them once at
    // the document rather than attaching a listener to every table instance.
    document.addEventListener("wheel", primeNativeScrollPosition, { capture: true, passive: true });
    document.addEventListener("touchstart", primeNativeScrollPosition, { capture: true, passive: true });
    document.addEventListener("pointerdown", primeNativeScrollPosition, { capture: true, passive: true });
    document.addEventListener("scroll", handleNativeScroll, { capture: true, passive: true });

    return () => {
      document.removeEventListener("wheel", primeNativeScrollPosition, true);
      document.removeEventListener("touchstart", primeNativeScrollPosition, true);
      document.removeEventListener("pointerdown", primeNativeScrollPosition, true);
      document.removeEventListener("scroll", handleNativeScroll, true);
      lenis.destroy();
    };
  }, []);

  return null;
}
