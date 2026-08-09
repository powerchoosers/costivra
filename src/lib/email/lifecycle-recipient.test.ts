import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendLifecycleEmailToWorkspace } from "./lifecycle-recipient";

const { sendLifecycleEmail } = vi.hoisted(() => ({ sendLifecycleEmail: vi.fn() }));

vi.mock("./lifecycle", () => ({ sendLifecycleEmail }));

function query(data: unknown, error: unknown = null) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    maybeSingle: async () => ({ data, error }),
    then: (resolve: (value: { data: unknown; error: unknown }) => unknown) => Promise.resolve({ data, error }).then(resolve),
  };
  return builder;
}

function dbStub(preferences: Record<string, boolean> | null, members: unknown[]) {
  return {
    from(table: string) {
      if (table === "report_communication_preferences") return query(preferences);
      if (table === "organization_memberships") return query(members);
      throw new Error(`Unexpected table: ${table}`);
    },
  } as never;
}

describe("workspace lifecycle recipients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendLifecycleEmail.mockResolvedValue({ sent: true, deliveryStatus: "accepted" });
  });

  it("respects the workspace preference for optional finding alerts", async () => {
    const result = await sendLifecycleEmailToWorkspace({
      db: dbStub({ immediate_finding_alerts: false }, [{ profiles: { email: "owner@example.com" } }]),
      kind: "finding_ready",
      organizationId: "org-1",
      payload: { findingTitle: "Potential increase" },
    });
    expect(result).toEqual([]);
    expect(sendLifecycleEmail).not.toHaveBeenCalled();
  });

  it("uses current owner/admin membership and deduplicates email addresses", async () => {
    const result = await sendLifecycleEmailToWorkspace({
      db: dbStub(null, [
        { profiles: { email: " Owner@Example.com ", full_name: "Owner" } },
        { profiles: { email: "owner@example.com", full_name: "Duplicate" } },
        { profiles: { email: "admin@example.com", full_name: "Admin" } },
      ]),
      kind: "upload_received",
      organizationId: "org-1",
      payload: { documentName: "invoice.pdf" },
    });
    expect(result).toHaveLength(2);
    expect(sendLifecycleEmail).toHaveBeenCalledTimes(2);
    expect(sendLifecycleEmail.mock.calls.map(([, input]) => input.recipientEmail)).toEqual([
      "owner@example.com",
      "admin@example.com",
    ]);
  });
});
