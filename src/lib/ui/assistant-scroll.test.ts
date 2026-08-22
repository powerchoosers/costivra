import { describe, expect, it } from "vitest";
import {
  getAssistantBottomScrollTop,
  getAssistantScrollDistanceFromBottom,
  isAssistantNearBottom,
} from "./assistant-scroll";

describe("assistant conversation scrolling", () => {
  it("calculates distance from the bottom", () => {
    expect(getAssistantScrollDistanceFromBottom({ scrollTop: 300, scrollHeight: 1_000, clientHeight: 600 })).toBe(100);
  });

  it("treats the final 48 pixels as the latest-message zone", () => {
    expect(isAssistantNearBottom({ scrollTop: 351, scrollHeight: 1_000, clientHeight: 600 })).toBe(false);
    expect(isAssistantNearBottom({ scrollTop: 352, scrollHeight: 1_000, clientHeight: 600 })).toBe(true);
  });

  it("clamps the bottom target for content shorter than the viewport", () => {
    expect(getAssistantBottomScrollTop({ scrollHeight: 400, clientHeight: 600 })).toBe(0);
    expect(getAssistantBottomScrollTop({ scrollHeight: 1_000, clientHeight: 600 })).toBe(400);
  });
});
