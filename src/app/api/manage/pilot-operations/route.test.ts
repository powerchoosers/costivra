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

function database(rowsByTable: Record<string, unknown[]> = {}) {
  return { from: vi.fn((table: string) => {
    const result = { count: 0, data: rowsByTable[table] ?? [], error: null };
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
    return query;
  }) };
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

  it("does not turn an unavailable ledger into a misleading zero", async () => {
    const db = database();
    const originalFrom = db.from;
    db.from = vi.fn((table: string) => {
      const query = originalFrom(table) as Record<string, unknown>;
      if (table === "report_delivery_runs") {
        query.then = (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({ count: null, data: null, error: { code: "42P01" } }));
      }
      return query;
    });
    requireInternalOperator.mockResolvedValue({ db });
    checkSystemReadiness.mockResolvedValue({ overall: "warning", services: [] });
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.dataWarnings).toEqual(["operations_snapshot_incomplete"]);
    expect(body.metrics.reportFailures).toBeNull();
  });

  it("includes safe recent extraction and scanner failures with recovery links", async () => {
    const db = database({
      document_extraction_versions: [{ status: "failed", failure_code: "ocr_unavailable", created_at: "2026-08-15T23:00:00.000Z" }],
      inbound_email_attachments: [{ scan_status: "unavailable", updated_at: "2026-08-15T23:01:00.000Z" }],
    });
    requireInternalOperator.mockResolvedValue({ db });
    checkSystemReadiness.mockResolvedValue({ overall: "warning", services: [] });
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.recentCriticalErrors).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: "document_extraction", errorCode: "ocr_unavailable", recoveryHref: "/manage/intake" }),
      expect.objectContaining({ source: "malware_scanner", errorCode: "SCANNER_UNAVAILABLE", recoveryHref: "/manage/intake" }),
    ]));
    expect(JSON.stringify(body)).not.toContain("document_id");
  });
});
