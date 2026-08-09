import type { ManageTask } from "./types";

export function sequenceTaskOriginLabel(task: Pick<ManageTask, "origin" | "sequenceStepPosition">) {
  if (task.origin !== "sequence") return null;
  return `Sequence · Step ${task.sequenceStepPosition ?? "—"}`;
}
