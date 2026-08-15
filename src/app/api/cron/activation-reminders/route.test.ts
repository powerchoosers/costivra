import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(() => { throw new Error("database should not be touched"); }),
}));

describe("activation reminder cron", () => {
  it("rejects unauthenticated calls before loading onboarding rows", async () => {
    const response = await GET(new Request("https://costivra.ai/api/cron/activation-reminders"));
    expect(response.status).toBe(401);
  });
});
