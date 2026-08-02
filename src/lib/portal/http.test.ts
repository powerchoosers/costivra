import { describe, expect, it, vi } from "vitest";
import { apiError } from "@/lib/portal/http";

describe("apiError", () => {
  it("returns a safe 403 response for read-only portal roles", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = apiError(new Error("PORTAL_READ_ONLY"));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Your role can view this workspace but cannot change records.",
    });
    consoleError.mockRestore();
  });
});
