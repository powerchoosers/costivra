import { describe, expect, it } from "vitest";
import {
  canRescanInboundEvent,
  canRetryInboundEvent,
  intakeStatusGroup,
} from "@/lib/manage/intake-operations-policy";
import { summarizeInboundAttachmentStates } from "@/lib/email/quarantine-release-policy";

describe("intake operations policy", () => {
  it("keeps active work separate from events requiring a person", () => {
    expect(intakeStatusGroup("queued")).toBe("active");
    expect(intakeStatusGroup("retrying")).toBe("active");
    expect(intakeStatusGroup("quarantined")).toBe("attention");
    expect(intakeStatusGroup("dead_letter")).toBe("attention");
    expect(intakeStatusGroup("processed")).toBe("complete");
  });

  it("only permits manual queue retries from terminal failure states", () => {
    expect(canRetryInboundEvent("failed")).toBe(true);
    expect(canRetryInboundEvent("dead_letter")).toBe(true);
    expect(canRetryInboundEvent("processing")).toBe(false);
    expect(canRetryInboundEvent("processed")).toBe(false);
  });

  it("never releases quarantine without both a waiting file and scanner", () => {
    expect(canRescanInboundEvent("quarantined", true, true)).toBe(true);
    expect(canRescanInboundEvent("quarantined", true, false)).toBe(false);
    expect(canRescanInboundEvent("quarantined", false, true)).toBe(false);
    expect(canRescanInboundEvent("processed", true, true)).toBe(false);
  });
});

describe("quarantine release state", () => {
  it("keeps the event quarantined while any file is still waiting", () => {
    expect(summarizeInboundAttachmentStates(["processed", "quarantined"])).toEqual({
      status: "quarantined",
      processedAttachmentCount: 1,
      complete: false,
    });
  });

  it("sends rejected or unsupported files to review after scanning finishes", () => {
    expect(summarizeInboundAttachmentStates(["processed", "failed"])).toEqual({
      status: "needs_review",
      processedAttachmentCount: 1,
      complete: true,
    });
  });

  it("completes clean and duplicate-only events", () => {
    expect(summarizeInboundAttachmentStates(["processed", "duplicate"])).toEqual({
      status: "processed",
      processedAttachmentCount: 2,
      complete: true,
    });
  });
});
