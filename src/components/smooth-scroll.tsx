"use client";

import Lenis from "lenis";
import { useEffect } from "react";
import {
  createWorkspaceScrollbarOverlay,
  type WorkspaceScrollbarAxis,
} from "@/lib/ui/workspace-scrollbar";

// Keep nested panels native without asking Lenis to inspect the entire DOM tree
// on every wheel event. This is a fixed selector so the hot path stays cheap.
const NATIVE_SCROLL_SELECTOR = [
  "[data-lenis-prevent]",
  ".workspace-scroll-region",
  ".app-sidebar nav",
  ".app-nav-scroll",
  ".app-work-canvas > .app-content",
  ".manage-sidebar nav.manage-primary-nav",
  ".manage-shell-v2 .manage-page",
  ".app-mobile-drawer",
  ".mobile-drawer",
  ".app-global-results",
  ".manage-global-results",
  ".workspace-notification-popover__list",
  ".costivra-select-popover",
  ".manage-compose-recipient-results",
  ".manage-mail-list > div",
  ".manage-sequence-mail-view",
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
  ".manage-outreach-task-table",
  ".table-scroll",
  ".table-wrap",
  ".workspace-table-scroll",
  ".invoice-review-table-wrap",
  ".breakdown-pdf-scroll-container",
  ".record-line-items",
  ".record-files-workspace__table",
  ".invoice-pdf-canvas",
  ".portal-modal-layer",
  ".portal-modal-body",
  ".portal-sheet",
  ".bill-breakdown-analysis",
  ".chat-scroll",
  ".ask-conversation",
  ".vendor-table-wrap",
  ".vendor-panel-scroll",
  ".document-upload-vendor-results",
  ".demo-drawer-layer",
  ".demo-drawer-body",
  ".bills-table-wrap",
  ".metric-strip",
  "textarea",
  "[contenteditable=\"true\"]",
].join(",");

const SCROLLBAR_IDLE_DELAY = 700;
const WORKSPACE_SCROLLBAR_ATTRIBUTE = "data-workspace-scrollbar";

function isScrollableOverflow(value: string) {
  return ["auto", "overlay", "scroll"].includes(value);
}

function isScrollport(element: Element) {
  if (!(element instanceof HTMLElement)) return false;

  const style = window.getComputedStyle(element);
  return (
    (isScrollableOverflow(style.overflowX) && element.scrollWidth > element.clientWidth)
    || (isScrollableOverflow(style.overflowY) && element.scrollHeight > element.clientHeight)
  );
}

function startsInNativeScrollRegion(event: Event) {
  for (const item of event.composedPath()) {
    if (!(item instanceof HTMLElement)) continue;
    if (item.matches(NATIVE_SCROLL_SELECTOR)) return true;
  }
  return false;
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
      // App and Manage use their own native page scrollports. Keeping every
      // marked region native lets the browser chain a panel's edge into its
      // parent rather than Lenis swallowing the next wheel event.
      allowNestedScroll: false,
      prevent: (node) => node.hasAttribute("data-lenis-prevent"),
      virtualScroll: ({ event }) => {
        return !startsInNativeScrollRegion(event);
      },
      stopInertiaOnNavigate: true,
    });

    const scrollbarOverlay = createWorkspaceScrollbarOverlay();
    const scrollTimers = new Map<HTMLElement, { x?: number; y?: number }>();
    const scrollPositions = new WeakMap<HTMLElement, { left: number; top: number }>();
    const registerScrollbar = (target: HTMLElement) => {
      if (!target.matches(NATIVE_SCROLL_SELECTOR)) return;
      // Keep legacy Manage/App scrollports on the same overlay contract even
      // when an older route has not yet added the opt-in attribute in markup.
      if (!target.hasAttribute(WORKSPACE_SCROLLBAR_ATTRIBUTE)) {
        target.setAttribute(WORKSPACE_SCROLLBAR_ATTRIBUTE, "");
      }
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
    const deactivateAxis = (target: HTMLElement, axis: WorkspaceScrollbarAxis) => {
      const activeClass = axis === "x" ? "is-scroll-x-active" : "is-scroll-y-active";
      const timerKey = axis === "x" ? "x" : "y";
      const timers = scrollTimers.get(target);

      target.classList.remove(activeClass);
      scrollbarOverlay.setActive(target, axis, false);

      if (!timers) return;
      if (timers[timerKey] !== undefined) window.clearTimeout(timers[timerKey]);
      delete timers[timerKey];
      if (timers.x === undefined && timers.y === undefined) scrollTimers.delete(target);
    };
    const activateAxis = (target: HTMLElement, axis: WorkspaceScrollbarAxis) => {
      const activeClass = axis === "x" ? "is-scroll-x-active" : "is-scroll-y-active";
      const timerKey = axis === "x" ? "x" : "y";
      const timers = scrollTimers.get(target) ?? {};

      target.classList.add(activeClass);
      scrollbarOverlay.setActive(target, axis, true);
      if (timers[timerKey] !== undefined) window.clearTimeout(timers[timerKey]);
      timers[timerKey] = window.setTimeout(() => {
        deactivateAxis(target, axis);
      }, SCROLLBAR_IDLE_DELAY);
      scrollTimers.set(target, timers);
    };
    const activatePageScrollbar = () => {
      activateAxis(document.documentElement, "y");
    };
    const handleNativeScroll = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !isScrollport(target)) return;

      registerScrollbar(target);
      if (!target.hasAttribute(WORKSPACE_SCROLLBAR_ATTRIBUTE)) return;

      const hadPreviousPosition = scrollPositions.has(target);
      const previous = scrollPositions.get(target) ?? { left: 0, top: 0 };
      const movedX = hadPreviousPosition ? target.scrollLeft !== previous.left : target.scrollLeft !== 0;
      const movedY = hadPreviousPosition ? target.scrollTop !== previous.top : target.scrollTop !== 0;
      scrollPositions.set(target, { left: target.scrollLeft, top: target.scrollTop });

      if (!movedX && !movedY) return;

      if (movedX && !movedY) deactivateAxis(target, "y");
      if (movedY && !movedX) deactivateAxis(target, "x");
      if (movedX) activateAxis(target, "x");
      if (movedY) activateAxis(target, "y");
    };

    // Scroll events do not bubble from nested panels, so capture them once at
    // the document rather than attaching a listener to every table instance.
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
        scrollbarOverlay.setActive(target, "x", false);
        scrollbarOverlay.setActive(target, "y", false);
      });
      scrollTimers.clear();
      scrollbarOverlay.destroy();
      if (lenis) {
        lenis.off("scroll", activatePageScrollbar);
        lenis.destroy();
      } else {
        window.removeEventListener("scroll", activatePageScrollbar);
      }
      document.documentElement.classList.remove("is-scroll-y-active");
    };
  }, []);

  return null;
}
