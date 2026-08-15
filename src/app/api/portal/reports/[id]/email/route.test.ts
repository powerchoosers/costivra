import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  requirePortalContext: vi.fn(),
  generateReport: vi.fn(),
  renderReportEmail: vi.fn(),
  sendTransactionalEmail: vi.fn(),
  emailRequestHash: vi.fn(),
  claimExternalSideEffect: vi.fn(),
}));

vi.mock("@/lib/portal/repository", () => ({ requirePortalContext: mocks.requirePortalContext }));
vi.mock("@/lib/reports/generate-report", () => ({ generateReport: mocks.generateReport }));
vi.mock("@/lib/reports/render-report-email", () => ({ renderReportEmail: mocks.renderReportEmail }));
vi.mock("@/lib/email/resend", () => ({
  sendTransactionalEmail: mocks.sendTransactionalEmail,
  emailRequestHash: mocks.emailRequestHash,
}));
vi.mock("@/lib/email/side-effect-claim", () => ({ claimExternalSideEffect: mocks.claimExternalSideEffect }));

function dbStub() {
  const calls: string[] = [];
  const db = {
    calls,
    from(table: string) {
      calls.push(table);
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.upsert = () => chain;
      chain.maybeSingle = async () => table === "report_definitions"
        ? { data: { id: "11111111-1111-4111-8111-111111111111", name: "Monthly report", description: "Summary", report_type: "executive", organization_id: "org-1" }, error: null }
        : { data: { email: "owner@example.com" }, error: null };
      chain.single = async () => table === "report_delivery_runs"
        ? { data: { id: "run-1", status: "claimed", external_side_effect_id: null, provider_message_id: null }, error: null }
        : { data: { id: "recipient-1", status: "pending", external_side_effect_id: null, provider_message_id: null }, error: null };
      chain.update = () => ({ eq: async () => ({ error: null }) });
      return chain;
    },
  };
  return db;
}

describe("POST /api/portal/reports/[id]/email", () => {
  let db: ReturnType<typeof dbStub>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = dbStub();
    mocks.requirePortalContext.mockResolvedValue({ db, organizationId: "org-1", userId: "user-1" });
    mocks.generateReport.mockResolvedValue({ generatedAt: "2026-08-15T00:00:00.000Z", values: [{ label: "Potential", value: 12 }] });
    mocks.renderReportEmail.mockReturnValue({ subject: "Monthly report is ready", text: "Report text", html: "<p>Report</p>" });
    mocks.emailRequestHash.mockReturnValue("request-hash");
    mocks.claimExternalSideEffect.mockResolvedValue({ claimed: true, id: "effect-1" });
    mocks.sendTransactionalEmail.mockResolvedValue({ ok: true, providerId: "msg-1" });
  });

  it("records manual delivery history before provider acceptance", async () => {
    const response = await POST(
      new Request("https://costivra.ai/api/portal/reports/11111111-1111-4111-8111-111111111111/email", { method: "POST" }),
      { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, providerMessageId: "msg-1" });
    expect(db.calls).toEqual(["report_definitions", "profiles", "report_delivery_runs", "report_delivery_recipients", "report_delivery_recipients", "report_delivery_runs", "external_side_effects", "report_delivery_recipients", "report_delivery_runs"]);
    expect(mocks.claimExternalSideEffect).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      type: "report_email",
      idempotencyKey: expect.stringContaining("report-now/org-1/11111111-1111-4111-8111-111111111111"),
    }));
  });
});
