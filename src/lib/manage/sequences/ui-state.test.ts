import { describe, expect, it } from "vitest";
import { sequenceActivationUiState } from "./ui-state";

describe("sequenceActivationUiState", () => {
  it("offers activation only for a valid draft", () => {
    expect(sequenceActivationUiState("draft", true)).toEqual({ badge: "Ready for gated activation", buttonLabel: "Activate sequence", disabled: false });
    expect(sequenceActivationUiState("draft", false)).toEqual({ badge: "Activation needs setup", buttonLabel: "Fix setup to activate", disabled: true });
  });

  it("keeps active and archived sequences locked", () => {
    expect(sequenceActivationUiState("active", true).disabled).toBe(true);
    expect(sequenceActivationUiState("archived", true).buttonLabel).toBe("Archived sequence");
  });

  it("makes a paused sequence resumable only when valid", () => {
    expect(sequenceActivationUiState("paused", true).buttonLabel).toBe("Resume sequence");
    expect(sequenceActivationUiState("paused", false).disabled).toBe(true);
  });

  it("shows an honest busy state", () => {
    expect(sequenceActivationUiState("draft", true, true)).toEqual({ badge: "Checking system readiness", buttonLabel: "Checking readiness…", disabled: true });
  });
});
