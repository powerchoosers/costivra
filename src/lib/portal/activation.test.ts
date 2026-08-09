import { describe, expect, it } from "vitest";
import { getActivationProgress } from "./activation";

const base = {
  documents: [],
  locations: [],
  vendors: [],
  invoices: [],
  contracts: [],
};

describe("activation progress", () => {
  it("does not count quarantined, rejected, or processing documents", () => {
    const progress = getActivationProgress({
      ...base,
      documents: [
        { id: "quarantined", status: "needs_review", securityStatus: "quarantined", extractionStatus: "needs_review" } as never,
        { id: "rejected", status: "failed", securityStatus: "clean", extractionStatus: "failed" } as never,
        { id: "processing", status: "processing", securityStatus: "clean", extractionStatus: "processing" } as never,
      ],
    });
    expect(progress.documentCount).toBe(0);
    expect(progress.authoritativeReview).toBe(false);
  });

  it("requires an approved source record and a real monitoring state", () => {
    const progress = getActivationProgress({
      ...base,
      documents: [{ id: "doc-1", status: "ready", securityStatus: "clean", extractionStatus: "completed" } as never],
      invoices: [{ documentId: "doc-1", reviewStatus: "approved" } as never],
      vendors: [{ monitoringState: "pending_test" } as never],
    });
    expect(progress.documentCount).toBe(1);
    expect(progress.authoritativeReview).toBe(true);
    expect(progress.monitoredCount).toBe(0);
  });

  it("counts manual tracking and approved contracts after clean intake", () => {
    const progress = getActivationProgress({
      ...base,
      documents: [{ id: "doc-1", status: "needs_review", securityStatus: "clean", extractionStatus: "needs_review" } as never],
      contracts: [{ documentId: "doc-1", status: "active" } as never],
      vendors: [{ monitoringState: "manual_tracking" } as never],
    });
    expect(progress.authoritativeReview).toBe(true);
    expect(progress.monitoredCount).toBe(1);
  });
});
