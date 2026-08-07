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
  ".table-scroll",
  ".table-wrap",
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

function hasNativeOverflow(element: Element) {
  if (!(element instanceof HTMLElement)) return false;

  const style = window.getComputedStyle(element);
  const canScrollVertically = ["auto", "overlay", "scroll"].includes(style.overflowY) && element.scrollHeight > element.clientHeight;
  const canScrollHorizontally = ["auto", "overlay", "scroll"].includes(style.overflowX) && element.scrollWidth > element.clientWidth;
  return canScrollVertically || canScrollHorizontally;
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
      prevent: (node) => {
        const nativeScroller = node.closest(NATIVE_SCROLL_SELECTOR);
        return nativeScroller !== null && hasNativeOverflow(nativeScroller);
      },
      stopInertiaOnNavigate: true,
    });

    return () => lenis.destroy();
  }, []);

  return null;
}
