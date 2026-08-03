import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const checkSystemReadiness = vi.hoisted(() => vi.fn());
vi.mock("@/lib/manage/system-readiness", () => ({ checkSystemReadiness }));

import { getPublicSystemStatus } from "@/lib/status/public-status";

const service = (
  id: "database" | "resend" | "worker" | "openrouter" | "malware",
  status: "ready" | "warning" | "blocked",
) => ({ id, name: id, status, message: `${id} internal detail` });

describe("sanitized public system status", () => {
  beforeEach(() => {
    checkSystemReadiness.mockReset();
  });

  it("reports secure quarantine as limited without exposing internal details", async () => {
    checkSystemReadiness.mockResolvedValue({
      checkedAt: "2026-08-02T22:00:00.000Z",
      overall: "blocked",
      services: [
        service("database", "ready"),
        service("resend", "ready"),
        service("worker", "ready"),
        service("openrouter", "ready"),
        service("malware", "blocked"),
      ],
    });

    const result = await getPublicSystemStatus({} as never);

    expect(checkSystemReadiness).toHaveBeenCalledWith({}, {
      includeOptionalServices: false,
      includeOperatorServices: false,
    });
    expect(result.overall).toBe("limited");
    expect(result.services).toContainEqual(expect.objectContaining({ id: "website", state: "operational" }));
    expect(result.services).toContainEqual(expect.objectContaining({
      id: "intake",
      state: "limited",
      message: expect.stringMatching(/private quarantine/i),
    }));
    expect(result.services).toContainEqual(expect.objectContaining({ id: "extraction", state: "limited" }));
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("internal detail");
    expect(serialized).not.toContain("Apollo");
  });

  it("reports provider and database outages without inventing availability", async () => {
    checkSystemReadiness.mockResolvedValue({
      checkedAt: "2026-08-02T22:00:00.000Z",
      overall: "blocked",
      services: [
        service("database", "blocked"),
        service("resend", "blocked"),
        service("worker", "ready"),
        service("openrouter", "blocked"),
        service("malware", "warning"),
      ],
    });

    const result = await getPublicSystemStatus({} as never);

    expect(result.overall).toBe("outage");
    expect(result.headline).toMatch(/unavailable/i);
    expect(result.services).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "workspace", state: "outage" }),
      expect.objectContaining({ id: "intake", state: "outage" }),
      expect.objectContaining({ id: "extraction", state: "outage" }),
    ]));
  });

  it("reports operational only when every customer-facing dependency is available", async () => {
    checkSystemReadiness.mockResolvedValue({
      checkedAt: "2026-08-02T22:00:00.000Z",
      overall: "warning",
      services: [
        service("database", "ready"),
        service("resend", "ready"),
        service("worker", "ready"),
        service("openrouter", "ready"),
        service("malware", "warning"),
      ],
    });

    const result = await getPublicSystemStatus({} as never);

    expect(result.overall).toBe("operational");
    expect(result.services.every((item) => item.state === "operational")).toBe(true);
  });
});
