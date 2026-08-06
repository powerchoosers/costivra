// Executable coverage for upload result handling and breakdown readiness polling.
import { describe, expect, it, vi } from "vitest";
import {
  DocumentUploadRequestError,
  submitDocumentUpload,
  waitForDocumentBreakdown,
} from "./client-upload";

function jsonResponse(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function uploadForm() {
  const form = new FormData();
  form.set("file", new File(["invoice"], "invoice.pdf", { type: "application/pdf" }));
  form.set("organizationVendorId", "11111111-1111-4111-8111-111111111111");
  return form;
}

describe("submitDocumentUpload", () => {
  it("posts the supplied multipart form and returns a processed document ID", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse(201, {
        ok: true,
        outcome: "processed",
        documentId: "22222222-2222-4222-8222-222222222222",
      }),
    );
    const form = uploadForm();

    await expect(submitDocumentUpload(form, fetcher)).resolves.toEqual(
      expect.objectContaining({
        kind: "processed",
        documentId: "22222222-2222-4222-8222-222222222222",
      }),
    );
    expect(fetcher).toHaveBeenCalledWith("/api/portal/documents", {
      method: "POST",
      body: form,
    });
  });

  it("returns the existing document for a duplicate 409", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse(409, {
        error: "This file already exists.",
        documentId: "33333333-3333-4333-8333-333333333333",
      }),
    );

    await expect(submitDocumentUpload(uploadForm(), fetcher)).resolves.toEqual(
      expect.objectContaining({
        kind: "duplicate",
        documentId: "33333333-3333-4333-8333-333333333333",
        message: "This file already exists.",
      }),
    );
  });

  it("returns a quarantined result for an accepted 202", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse(202, {
        ok: true,
        outcome: "quarantined",
        documentId: "44444444-4444-4444-8444-444444444444",
        warning: "The scanner is temporarily unavailable.",
      }),
    );

    await expect(submitDocumentUpload(uploadForm(), fetcher)).resolves.toEqual(
      expect.objectContaining({
        kind: "quarantined",
        documentId: "44444444-4444-4444-8444-444444444444",
        warning: "The scanner is temporarily unavailable.",
      }),
    );
  });

  it.each([
    [415, "Unsupported file type."],
    [422, "The file was blocked by the security scan."],
    [425, "The upload is not ready yet."],
    [500, "Document processing failed."],
  ])("throws a typed request error for HTTP %s", async (status, message) => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(status, { error: message }));

    const promise = submitDocumentUpload(uploadForm(), fetcher);
    await expect(promise).rejects.toMatchObject({
      name: "DocumentUploadRequestError",
      message,
      status,
    } satisfies Partial<DocumentUploadRequestError>);
  });
});

describe("waitForDocumentBreakdown", () => {
  it("retries temporary states and resolves when the breakdown becomes ready", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(404, { error: "Not ready." }))
      .mockResolvedValueOnce(jsonResponse(425, { error: "Still processing." }))
      .mockResolvedValueOnce(jsonResponse(200, { document: { id: "doc" } }));
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(
      waitForDocumentBreakdown("55555555-5555-4555-8555-555555555555", {
        fetcher,
        delays: [1, 1, 1],
        sleep,
      }),
    ).resolves.toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("stops immediately for a non-retryable response", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(403, { error: "Denied." }));
    const sleep = vi.fn();

    await expect(
      waitForDocumentBreakdown("66666666-6666-4666-8666-666666666666", {
        fetcher,
        delays: [1],
        sleep,
      }),
    ).resolves.toBe(false);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("returns false after retryable responses exhaust the retry window", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(503, { error: "Unavailable." }));
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(
      waitForDocumentBreakdown("77777777-7777-4777-8777-777777777777", {
        fetcher,
        delays: [1, 1],
        sleep,
      }),
    ).resolves.toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
