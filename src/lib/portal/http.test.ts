import { describe, expect, it, vi } from "vitest";
import { apiError, PortalInputError } from "@/lib/portal/http";

describe("portal API errors", () => {
  it("returns intentional validation copy", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = apiError(new PortalInputError("Choose a valid option."));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Choose a valid option." });
    vi.restoreAllMocks();
  });

  it("does not expose database or provider details", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = apiError({
      code: "23505",
      message: "duplicate key value violates unique constraint internal_table_key",
    }, "The record could not be saved.");
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "The record could not be saved." });
    vi.restoreAllMocks();
  });

  it("turns internal membership codes into plain language", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = apiError(new Error("NO_ORGANIZATION_MEMBERSHIP"));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "This account does not have an active Costivra workspace.",
    });
    vi.restoreAllMocks();
  });

  it("keeps the existing safe response for read-only roles", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = apiError(new Error("PORTAL_READ_ONLY"));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Your role can view this workspace but cannot change records.",
    });
    vi.restoreAllMocks();
  });
});
