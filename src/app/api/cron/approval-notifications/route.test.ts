import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("approval notification cron", () => {
  it("rejects unauthenticated cron calls", async () => {
    const response = await GET(new Request("https://costivra.ai/api/cron/approval-notifications"));
    expect(response.status).toBe(401);
  });
});
