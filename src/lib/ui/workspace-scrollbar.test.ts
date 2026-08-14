import { describe, expect, it } from "vitest";
import {
  getNextVerticalScrollTop,
  getWorkspaceScrollbarThumbMetrics,
} from "./workspace-scrollbar";

describe("getWorkspaceScrollbarThumbMetrics", () => {
  it("does not paint a thumb when the content fits", () => {
    expect(getWorkspaceScrollbarThumbMetrics({
      viewportOffset: 0,
      viewportSize: 200,
      scrollSize: 200,
      scrollOffset: 0,
    })).toBeNull();
  });

  it("keeps a usable thumb and tracks scroll progress", () => {
    const metrics = getWorkspaceScrollbarThumbMetrics({
      viewportOffset: 12,
      viewportSize: 100,
      scrollSize: 1_000,
      scrollOffset: 450,
    });

    expect(metrics).toMatchObject({
      trackOffset: 16,
      trackSize: 92,
      size: 28,
    });
    expect(metrics?.offset).toBe(48);
  });

  it("clamps an overscrolled measurement to the end of its track", () => {
    const metrics = getWorkspaceScrollbarThumbMetrics({
      viewportOffset: 0,
      viewportSize: 200,
      scrollSize: 800,
      scrollOffset: 9_999,
    });

    expect(metrics).not.toBeNull();
    expect((metrics?.offset ?? 0) + (metrics?.size ?? 0)).toBeCloseTo(
      (metrics?.trackOffset ?? 0) + (metrics?.trackSize ?? 0),
    );
  });
});

describe("getNextVerticalScrollTop", () => {
  it("moves only while the current scrollport has room", () => {
    const scrollport = {
      clientHeight: 200,
      scrollHeight: 800,
      scrollTop: 250,
    } as HTMLElement;

    expect(getNextVerticalScrollTop(scrollport, 100)).toBe(350);
    expect(getNextVerticalScrollTop(scrollport, -400)).toBe(0);
  });

  it("returns null at either edge so the browser can hand off the wheel", () => {
    const atTop = {
      clientHeight: 200,
      scrollHeight: 800,
      scrollTop: 0,
    } as HTMLElement;
    const atBottom = {
      clientHeight: 200,
      scrollHeight: 800,
      scrollTop: 600,
    } as HTMLElement;

    expect(getNextVerticalScrollTop(atTop, -24)).toBeNull();
    expect(getNextVerticalScrollTop(atBottom, 24)).toBeNull();
  });
});
