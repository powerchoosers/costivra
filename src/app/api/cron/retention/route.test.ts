import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const runRetention = vi.hoisted(() => vi.fn());
const createServerSupabaseClient = vi.hoisted(() => vi.fn());

vi.mock("@/lib/retention/runner", () => ({ runRetention }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient }));

import { GET } from "@/app/api/cron/retention/route";

describe("GET /api/cron/retention", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "cron-secret-for-test");
    runRetention.mockReset();
  });

  it("returns 401 when secret is placeholder-like", async () => {
    vi.stubEnv("CRON_SECRET", "placeholder");
    const response = await GET(new Request("https://costivra.ai/api/cron/retention", {
      headers: { authorization: "Bearer placeholder" },
    }));

    expect(response.status).toBe(401);
  });

  it("returns completion status from retention runner", async () => {
    runRetention.mockResolvedValue({ status: "completed", runs: 2 });

    const response = await GET(new Request("https://costivra.ai/api/cron/retention", {
      headers: { authorization: "Bearer cron-secret-for-test" },
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "completed", runs: 2 });
  });

  it("supports lowercase bearer header and alternate cron secret header", async () => {
    runRetention.mockResolvedValue({ status: "completed", runs: 2 });
    const response = await GET(new Request("https://costivra.ai/api/cron/retention", {
      headers: { "x-vercel-cron-secret": "cron-secret-for-test" },
    }));
    expect(response.status).toBe(200);

    const responseWithLowercaseBearer = await GET(new Request("https://costivra.ai/api/cron/retention", {
      headers: { authorization: "bearer cron-secret-for-test" },
    }));
    expect(responseWithLowercaseBearer.status).toBe(200);
  });

  it("supports query-token debug/manual invocation", async () => {
    runRetention.mockResolvedValue({ status: "completed", runs: 2 });
    const response = await GET(new Request("https://costivra.ai/api/cron/retention?token=cron-secret-for-test"));
    expect(response.status).toBe(200);
  });
});
