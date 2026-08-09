import type { EnrollmentState } from "./types";

const pausableStates = new Set<EnrollmentState>(["pending", "active", "waiting_for_task"]);
const stoppableStates = new Set<EnrollmentState>(["pending", "active", "paused", "waiting_for_task"]);

export function canPauseEnrollment(state: unknown): state is "pending" | "active" | "waiting_for_task" {
  return typeof state === "string" && pausableStates.has(state as EnrollmentState);
}

export function canStopEnrollment(state: unknown): state is "pending" | "active" | "paused" | "waiting_for_task" {
  return typeof state === "string" && stoppableStates.has(state as EnrollmentState);
}

export function canResumeEnrollment(state: unknown): state is "paused" {
  return state === "paused";
}
