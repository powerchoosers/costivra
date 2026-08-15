import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const requireInternalOperator = vi.hoisted(() => vi.fn());
const checkSystemReadiness = vi.hoisted(() => vi.fn());
vi.mock("@/lib/manage/auth", () => ({
  requireInternalOperator,
  manageApiError: (error: unknown) => ({ error: error instanceof Error ? error.message : "Internal error.", status: 500 }),
}));
vi.mock("@/lib/manage/system-readiness", () => ({ checkSystemReadiness }));

import { GET } from "@/app/api/manage/pilot-operations/route";

function database() {
  const result = { count: 0, error: null };
  const query: Record<string, unknown> = {};
  query.select = () => query;
  query.in = () => query;
  query.eq = () => query;
  query.lt = () => query;
  query.gte = () => query;
  query.lte = () => query;
  query.order = () => query;
  query.limit = () => query;
  query.then = (resolve: (value: typeof result) => unknown) => Promise.resolve(resolve(result));
  return { from: vi.fn(() => query) };
}

describe("GET /api/manage/pilot-operations", () => {
  beforeEach(() => {
    requireInternalOperator.mockReset();
    checkSystemReadiness.mockReset();
  });

  it("returns aggregate operational signals without record content", async () => {
    requireInternalOperator.mockResolvedValue({ db: database() });
    checkSystemReadiness.mockResolvedValue({ overall: "ready", services: [] });
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.metrics).toEqual(expect.objectContaining({ pilotTenants: 0, inboundAttention: 0, quarantined: 0 }));
    expect(body.readiness).toEqual({ overall: "ready", services: [] });
    expect(body).not.toHaveProperty("documents");
    expect(body.recentCriticalErrors).toEqual([]);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
