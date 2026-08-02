import { describe, expect, it } from "vitest";
import { actionOperationConfirmation } from "@/lib/portal/workflow-copy";

describe("action workflow confirmation copy", () => {
  it.each([
    ["approve", "Action approved."],
    ["decline", "Action declined."],
    ["start", "Action started."],
    ["complete", "Action completed."],
    ["unknown", "Action updated."],
  ])("uses natural language for %s", (operation, expected) => {
    expect(actionOperationConfirmation(operation)).toBe(expected);
  });
});
