import { describe, expect, it } from "vitest";
import { getUploadToastNotice } from "./upload-notifications";
import type { DocumentUploadCompletion } from "./client-upload";

const processed = (overrides: Partial<Extract<DocumentUploadCompletion, { kind: "processed" }>> = {}) => ({
  kind: "processed" as const,
  documentId: "22222222-2222-4222-8222-222222222222",
  payload: {},
  breakdownReady: true,
  ...overrides,
});

describe("getUploadToastNotice", () => {
  it("creates a review-specific actionable notice", () => {
    const notice = getUploadToastNotice(
      processed({ payload: { status: "needs_review" } }),
    );
    expect(notice).toMatchObject({
      title: "Bill breakdown ready for review",
      action: "breakdown",
      documentId: "22222222-2222-4222-8222-222222222222",
    });
  });

  it("creates a ready notice without opening anything automatically", () => {
    const notice = getUploadToastNotice(processed());
    expect(notice).toMatchObject({
      title: "Bill breakdown ready",
      action: "breakdown",
    });
  });

  it("keeps processing and security outcomes non-breakdown actions", () => {
    const quarantined = getUploadToastNotice({
      kind: "quarantined",
      documentId: "44444444-4444-4444-8444-444444444444",
      warning: "Scanner unavailable.",
      payload: {},
    });
    const processing = getUploadToastNotice(
      processed({ breakdownReady: false }),
    );
    expect(quarantined).toMatchObject({
      title: "Bill safely quarantined",
      action: "document",
    });
    expect(processing).toMatchObject({
      title: "Bill uploaded",
      message: "Costivra is still preparing the breakdown.",
      action: "document",
    });
  });

  it("does not create a success toast for a rejected file", () => {
    expect(
      getUploadToastNotice({
        kind: "rejected",
        message: "Blocked.",
        payload: { error: "Blocked." },
      }),
    ).toBeNull();
  });
});
