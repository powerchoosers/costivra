"use client";

import { useEffect, useState } from "react";

const DEFAULT_ROTATION_MS = 60_000;

export function useRotatingSearchPlaceholder(suggestions: readonly string[], rotationMs = DEFAULT_ROTATION_MS) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (suggestions.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % suggestions.length), rotationMs);
    return () => window.clearInterval(timer);
  }, [rotationMs, suggestions.length]);

  const safeIndex = suggestions.length ? index % suggestions.length : 0;
  return { index: safeIndex, placeholder: suggestions[safeIndex] ?? "Search records" };
}
