import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("report delivery cron", () => {
  it("rejects unauthenticated calls before touching report state", async () => {
    const response = await GET(new Request("https://costivra.ai/api/cron/reports"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized." });
  });
});
