import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const assistantCss = readFileSync(new URL("./client-assistant.css", import.meta.url), "utf8");
const conversationScroller = readFileSync(new URL("../assistant-conversation-scroller.tsx", import.meta.url), "utf8");
const providerSource = readFileSync(new URL("./client-assistant-provider.tsx", import.meta.url), "utf8");

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

  it("keeps follow-up copy and its responsive arrow in one shared action row", () => {
    expect(assistantCss).toMatch(/\.assistant-follow-up \{[\s\S]*display: inline-grid;[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto;/);
    expect(assistantCss).toMatch(/\.assistant-follow-up:hover \.assistant-follow-up__arrow,[\s\S]*transform: translateX\(3px\);/);

    const reducedMotionBlock = assistantCss.slice(assistantCss.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reducedMotionBlock).toContain(".assistant-follow-up__arrow");
    expect(reducedMotionBlock).toContain("transform: none");
  });

  it("uses one interpolable dashboard expansion that smoothly pushes following content", () => {
    expect(assistantCss).toMatch(/\.dashboard-assistant__conversation,[\s\S]*height: 86px;[\s\S]*transition: height var\(--assistant-motion-layout\)/);
    expect(assistantCss).toMatch(/\.manage-dashboard-assistant__conversation \{[\s\S]*height: 56px;/);
    expect(assistantCss).toMatch(/\.dashboard-assistant__conversation\.is-active,[\s\S]*height: min\(54vh, 520px\);/);
    expect(assistantCss).not.toContain("grid-template-rows: auto");
  });

  it("coordinates drawer resizing, rail movement, and newly mounted chat content", () => {
    expect(assistantCss).toMatch(/\.assistant-surface,[\s\S]*transition: width var\(--assistant-motion-surface\)/);
    expect(assistantCss).toMatch(/\.assistant-main-container \{[\s\S]*transition: grid-template-columns var\(--assistant-motion-surface\)/);
    expect(assistantCss).toContain(".assistant-main-container > .assistant-canvas { grid-column: 2; }");
    expect(assistantCss).toContain("@keyframes assistant-content-settle-in");
    expect(assistantCss).toContain(".assistant-inspector-panel");
  });

  it("smooth-scrolls new messages while keeping initial session positioning immediate", () => {
    expect(conversationScroller).toContain('scrollToLatest("auto")');
    expect(conversationScroller).toMatch(/messageCountChanged && \(followLatestRef\.current \|\| nearBottom\)[\s\S]*scrollToLatest\(\)/);
  });

  it("finishes drawer exit from the actual animation instead of a duplicated delay", () => {
    expect(providerSource).toContain("finishClosing");
    expect(providerSource).not.toMatch(/setTimeout\([\s\S]{0,120}SET_MODE[\s\S]{0,120}240/);
  });
});
