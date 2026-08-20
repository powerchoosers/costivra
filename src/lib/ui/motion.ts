/**
 * Keeps in-workspace navigation from forcing motion on people who ask the
 * operating system to reduce it. Call this at the point an intentional scroll
 * begins so a changed system preference is honored immediately.
 */
export function resolveMotionSafeScrollBehavior(prefersReducedMotion: boolean): ScrollBehavior {
  return prefersReducedMotion ? "auto" : "smooth";
}

export function getMotionSafeScrollBehavior(): ScrollBehavior {
  return resolveMotionSafeScrollBehavior(
    typeof window !== "undefined"
      && typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
}
