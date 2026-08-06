"use client";

import Lenis from "lenis";
import { useEffect } from "react";

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
      lerp: 0.09,
      smoothWheel: true,
      allowNestedScroll: true,
      stopInertiaOnNavigate: true,
    });

    return () => lenis.destroy();
  }, []);

  return null;
}
