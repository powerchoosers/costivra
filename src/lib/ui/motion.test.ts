import { describe, expect, it } from "vitest";
import { resolveMotionSafeScrollBehavior } from "@/lib/ui/motion";

describe("motion-safe scrolling", () => {
  it("avoids animated scrolling when reduced motion is requested", () => {
    expect(resolveMotionSafeScrollBehavior(true)).toBe("auto");
    expect(resolveMotionSafeScrollBehavior(false)).toBe("smooth");
  });
});
