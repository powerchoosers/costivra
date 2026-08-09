import { describe, expect, it } from "vitest";

import { shouldNotifyFindingReady } from "./value-engine";

describe("shouldNotifyFindingReady", () => {
  const ready = { hasEvidence: true, trustState: "evidence_backed", customerVisible: true } as const;

  it("requires evidence-backed trust state and customer visibility", () => {
    expect(shouldNotifyFindingReady(ready)).toBe(true);
    expect(shouldNotifyFindingReady({ ...ready, hasEvidence: false })).toBe(false);
    expect(shouldNotifyFindingReady({ ...ready, trustState: "needs_evidence" })).toBe(false);
    expect(shouldNotifyFindingReady({ ...ready, trustState: "manual_note" })).toBe(false);
    expect(shouldNotifyFindingReady({ ...ready, customerVisible: false })).toBe(false);
  });
});
