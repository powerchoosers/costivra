import { describe, expect, it } from "vitest";
import { sequenceTaskOriginLabel } from "./task-origin";

describe("sequenceTaskOriginLabel", () => {
  it("labels sequence tasks with their step and leaves manual tasks unmarked", () => {
    expect(sequenceTaskOriginLabel({ origin: "sequence", sequenceStepPosition: 3 })).toBe("Sequence · Step 3");
    expect(sequenceTaskOriginLabel({ origin: "sequence", sequenceStepPosition: null })).toBe("Sequence · Step —");
    expect(sequenceTaskOriginLabel({ origin: "manual", sequenceStepPosition: null })).toBeNull();
  });
});
