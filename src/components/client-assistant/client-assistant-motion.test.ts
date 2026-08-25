import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const assistantCss = readFileSync(new URL("./client-assistant.css", import.meta.url), "utf8");

describe("shared assistant message motion", () => {
  it("owns the bubble blur and top-to-bottom copy reveal keyframes", () => {
    expect(assistantCss).toContain("@keyframes assistant-bubble-blur-in");
    expect(assistantCss).toContain("@keyframes assistant-copy-reveal");
    expect(assistantCss).toContain("clip-path: inset(0 0 100% 0)");
  });

  it("applies the shared entrance to drawer and dashboard messages", () => {
    expect(assistantCss).toMatch(/\.assistant-message,[\s\S]*\.manage-dashboard-assistant__message,[\s\S]*animation: assistant-bubble-blur-in/);
    expect(assistantCss).toMatch(/\.assistant-message \.assistant-prose > p,[\s\S]*\.manage-dashboard-assistant__message > p[\s\S]*animation: assistant-copy-reveal/);
  });

  it("removes both message animations for reduced motion", () => {
    const reducedMotionBlock = assistantCss.slice(assistantCss.indexOf("@media (prefers-reduced-motion: reduce)"));

    expect(reducedMotionBlock).toContain(".assistant-message");
    expect(reducedMotionBlock).toContain(".assistant-message .assistant-prose > p");
    expect(reducedMotionBlock).toContain(".manage-dashboard-assistant__message > p");
    expect(reducedMotionBlock).toContain("animation: none !important");
  });
});
