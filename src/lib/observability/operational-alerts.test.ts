import { describe, expect, it, vi } from "vitest";
import {
  getActiveOperationalAlerts,
  recordOperationalAlert,
  resolveOperationalAlert,
} from "./operational-alerts";

describe("Operational Alerts Ledger & Signal Processing", () => {
  it("inserts new alert when signal key does not exist", async () => {
    const singleMock = vi.fn().mockResolvedValue({
      data: {
        id: "alert-1",
        signal_key: "security:scanner_fail",
        severity: "warning",
        category: "security",
        title: "Scanner Failed",
        message: "Probes failed",
        metadata: {},
        status: "active",
        first_seen_at: "2026-08-16T00:00:00Z",
        last_seen_at: "2026-08-16T00:00:00Z",
        occurrence_count: 1,
        resolved_at: null,
        created_at: "2026-08-16T00:00:00Z",
      },
      error: null,
    });

    const mockDb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: singleMock,
          }),
        }),
      }),
    } as unknown as Parameters<typeof recordOperationalAlert>[0];

    const result = await recordOperationalAlert(mockDb, {
      signalKey: "security:scanner_fail",
      severity: "warning",
      category: "security",
      title: "Scanner Failed",
      message: "Probes failed",
    });

    expect(result.id).toBe("alert-1");
    expect(result.occurrenceCount).toBe(1);
    expect(result.status).toBe("active");
  });

  it("increments occurrence count when signal key already exists", async () => {
    const singleMock = vi.fn().mockResolvedValue({
      data: {
        id: "alert-1",
        signal_key: "security:scanner_fail",
        severity: "warning",
        category: "security",
        title: "Scanner Failed",
        message: "Probes failed again",
        metadata: {},
        status: "active",
        first_seen_at: "2026-08-16T00:00:00Z",
        last_seen_at: "2026-08-16T01:00:00Z",
        occurrence_count: 2,
        resolved_at: null,
        created_at: "2026-08-16T00:00:00Z",
      },
      error: null,
    });

    const mockDb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: "alert-1",
                signal_key: "security:scanner_fail",
                occurrence_count: 1,
                metadata: {},
              },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: singleMock,
            }),
          }),
        }),
      }),
    } as unknown as Parameters<typeof recordOperationalAlert>[0];

    const result = await recordOperationalAlert(mockDb, {
      signalKey: "security:scanner_fail",
      severity: "warning",
      category: "security",
      title: "Scanner Failed",
      message: "Probes failed again",
    });

    expect(result.occurrenceCount).toBe(2);
  });

  it("resolves active alert correctly", async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    const mockDb = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: eqMock,
          }),
        }),
      }),
    } as unknown as Parameters<typeof resolveOperationalAlert>[0];

    await resolveOperationalAlert(mockDb, "security:scanner_fail");
    expect(mockDb.from).toHaveBeenCalledWith("operational_alerts");
  });

  it("retrieves active alerts with filters", async () => {
    const mockRows = [
      {
        id: "alert-1",
        signal_key: "security:scanner_fail",
        severity: "critical",
        category: "security",
        title: "Critical Security Alert",
        message: "Immediate action needed",
        metadata: {},
        status: "active",
        first_seen_at: "2026-08-16T00:00:00Z",
        last_seen_at: "2026-08-16T00:00:00Z",
        occurrence_count: 1,
        resolved_at: null,
        created_at: "2026-08-16T00:00:00Z",
      },
    ];

    const mockDb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: mockRows, error: null }),
            }),
          }),
        }),
      }),
    } as unknown as Parameters<typeof getActiveOperationalAlerts>[0];

    const alerts = await getActiveOperationalAlerts(mockDb, { severity: "critical" });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe("critical");
  });
});
