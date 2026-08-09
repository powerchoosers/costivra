import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("vendor monitoring cron", () => {
  it("rejects unauthenticated cron calls before touching the database", async () => {
    const response = await GET(new Request("https://costivra.ai/api/cron/vendor-monitoring"));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized." });
  });
});
