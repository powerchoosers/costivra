import { describe, expect, it } from "vitest";
import {
  canPauseEnrollment,
  canResumeEnrollment,
  canStopEnrollment,
} from "./enrollment-controls";

describe("sequence enrollment controls", () => {
  it("only pauses non-terminal work that has not already been paused", () => {
    expect(canPauseEnrollment("pending")).toBe(true);
    expect(canPauseEnrollment("waiting_for_task")).toBe(true);
    expect(canPauseEnrollment("paused")).toBe(false);
    expect(canPauseEnrollment("completed")).toBe(false);
  });

  it("allows stopping paused work but never terminal work", () => {
    expect(canStopEnrollment("paused")).toBe(true);
    expect(canStopEnrollment("active")).toBe(true);
    expect(canStopEnrollment("stopped")).toBe(false);
    expect(canStopEnrollment("replied")).toBe(false);
  });

  it("only resumes paused work", () => {
    expect(canResumeEnrollment("paused")).toBe(true);
    expect(canResumeEnrollment("active")).toBe(false);
    expect(canResumeEnrollment("pending")).toBe(false);
  });
});
