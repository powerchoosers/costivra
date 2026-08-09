import type { SequenceStatus } from "./types";

export type SequenceActivationUiState = {
  badge: string;
  buttonLabel: string;
  disabled: boolean;
};

export function sequenceActivationUiState(status: SequenceStatus, valid: boolean, busy = false, executionEnabled = true): SequenceActivationUiState {
  if (busy) return { badge: "Checking system readiness", buttonLabel: "Checking readiness…", disabled: true };
  if (status === "active") return { badge: "Execution active", buttonLabel: "Execution active", disabled: true };
  if (status === "archived") return { badge: "Archived", buttonLabel: "Archived sequence", disabled: true };
  if (!executionEnabled) return { badge: "Execution disabled for this release", buttonLabel: "Execution disabled", disabled: true };
  if (status === "paused") return { badge: "Paused · activation is gated", buttonLabel: valid ? "Resume sequence" : "Fix setup to resume", disabled: !valid };
  return { badge: valid ? "Ready for gated activation" : "Activation needs setup", buttonLabel: valid ? "Activate sequence" : "Fix setup to activate", disabled: !valid };
}
