import { describe, expect, it } from "vitest";
import { hashUnsubscribeToken } from "./unsubscribe";

describe("sequence unsubscribe tokens", () => {
  it("stores only a deterministic hash", () => {
    expect(hashUnsubscribeToken("test-token")).toBe(hashUnsubscribeToken("test-token"));
    expect(hashUnsubscribeToken("test-token")).not.toBe(hashUnsubscribeToken("other-token"));
  });
});
