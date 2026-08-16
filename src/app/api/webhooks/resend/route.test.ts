import { describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/webhooks/resend/route";

process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || "re_test_1234567890";
const webhookSecret = process.env.RESEND_WEBHOOK_SECRET || Buffer.from("resend-webhook-secret").toString("base64");
process.env.RESEND_WEBHOOK_SECRET = webhookSecret;

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));
vi.mock("@/lib/email/resend", () => ({
  getResendClient: vi.fn(),
}));

vi.mock("@/lib/security/malware-scanner", () => ({
  scanFileForMalware: vi.fn().mockResolvedValue({ status: "clean", detail: null }),
}));
vi.mock("@/lib/email/inbound-intake", () => ({
  notifyOrganizationOwners: vi.fn(),
}));
vi.mock("@/lib/env/secrets", () => ({
  isConfiguredSecret: vi.fn((value?: string | null) => Boolean(value && value.trim().length > 0)),
}));

const createMockDb = (options: { duplicateInbound?: boolean } = {}) => {
  const crmEmailEvents = {
    insert: vi.fn(async () => ({ error: null })),
  };
  const inboundEmailEvents = {
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => options.duplicateInbound
          ? { data: null, error: { code: "23505" } }
          : { data: { id: "event-1" }, error: null }),
      })),
    })),
  };
  const crmEmailMessages = {
    select: vi.fn(() => ({
      eq: vi.fn(async () => ({ data: [], error: null })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({ error: null })),
      in: vi.fn(() => ({ error: null })),
    })),
  };

  return {
    from: vi.fn((table: string) => {
      if (table === "crm_email_events") return crmEmailEvents;
      if (table === "crm_email_messages") return crmEmailMessages;
      if (table === "inbound_email_events") return inboundEmailEvents;
      if (table === "inbound_email_addresses") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              in: vi.fn(() => ({
                eq: vi.fn(() => ({
                  data: options.duplicateInbound
                    ? [{ id: "intake-1", organization_id: "org-1", local_part: "bills", domain: "costivra.ai", status: "active", trusted_senders: [] }]
                    : [],
                  error: null,
                })),
              })),
            })),
          })),
        };
      }
      return {
        insert: vi.fn(async () => ({ error: null })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ data: [], error: null })),
          maybeSingle: vi.fn(async () => ({ data: null, error: null })),
        })),
      };
    }),
  } as const;
};

describe("POST /api/webhooks/resend", () => {
  it("returns config error when webhook secret is missing", async () => {
    process.env.RESEND_WEBHOOK_SECRET = "";
    const response = await POST(new Request("https://costivra.ai/api/webhooks/resend", {
      method: "POST",
      body: JSON.stringify({ type: "email.delivered", created_at: new Date().toISOString(), data: {} }),
      headers: {
        "content-type": "application/json",
      },
    }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "Inbound email is not configured." });
  });

  it("rejects an unsigned webhook payload", async () => {
    process.env.RESEND_WEBHOOK_SECRET = webhookSecret;
    const { getResendClient } = await import("@/lib/email/resend");
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    vi.mocked(getResendClient).mockReturnValue({
      webhooks: {
        verify: vi.fn(() => {
          throw new Error("Invalid signature");
        }),
      } as unknown as ReturnType<typeof getResendClient>["webhooks"],
      emails: {
        receiving: { attachments: { list: vi.fn() }, get: vi.fn(), list: vi.fn() },
      } as unknown as ReturnType<typeof getResendClient>["emails"],
    } as ReturnType<typeof getResendClient>);
    vi.mocked(createServerSupabaseClient).mockReturnValue(createMockDb() as unknown as ReturnType<typeof createServerSupabaseClient>);

    const response = await POST(new Request("https://costivra.ai/api/webhooks/resend", {
      method: "POST",
      body: JSON.stringify({ type: "email.received", data: {} }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid webhook signature." });
  });

  it("accepts a properly signed non-received event", async () => {
    process.env.RESEND_WEBHOOK_SECRET = webhookSecret;
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const { getResendClient } = await import("@/lib/email/resend");
    const event = {
      type: "email.delivered",
      created_at: new Date().toISOString(),
      data: {
        email_id: "email-id",
        event: "delivered",
        recipient: "demo@example.com",
      },
    } as unknown as Parameters<ReturnType<typeof getResendClient>["webhooks"]["verify"]>[0];
    vi.mocked(getResendClient).mockReturnValue({
      webhooks: {
        verify: vi.fn(() => event),
      } as unknown as ReturnType<typeof getResendClient>["webhooks"],
      emails: {
        receiving: { attachments: { list: vi.fn() }, get: vi.fn(), list: vi.fn() },
      } as unknown as ReturnType<typeof getResendClient>["emails"],
    } as ReturnType<typeof getResendClient>);
    vi.mocked(createServerSupabaseClient).mockReturnValue(createMockDb() as unknown as ReturnType<typeof createServerSupabaseClient>);

    const response = await POST(new Request("https://costivra.ai/api/webhooks/resend", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "svix-id": "msg_123",
        "svix-timestamp": "1710000000",
        "svix-signature": "ignored-if-mocked",
      },
      body: JSON.stringify(event),
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
  });

  it("acknowledges a duplicate inbound event without queueing it again", async () => {
    process.env.RESEND_WEBHOOK_SECRET = webhookSecret;
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const { getResendClient } = await import("@/lib/email/resend");
    const event = {
      type: "email.received",
      created_at: new Date().toISOString(),
      data: {
        email_id: "received-email-1",
        message_id: "message-1",
        from: "billing@example.com",
        to: ["bills@costivra.ai"],
        received_for: [],
        subject: "Synthetic duplicate",
        attachments: [],
      },
    } as unknown as Parameters<ReturnType<typeof getResendClient>["webhooks"]["verify"]>[0];
    vi.mocked(getResendClient).mockReturnValue({
      webhooks: { verify: vi.fn(() => event) } as unknown as ReturnType<typeof getResendClient>["webhooks"],
      emails: { receiving: { attachments: { list: vi.fn() }, get: vi.fn(), list: vi.fn() } } as unknown as ReturnType<typeof getResendClient>["emails"],
    } as ReturnType<typeof getResendClient>);
    vi.mocked(createServerSupabaseClient).mockReturnValue(createMockDb({ duplicateInbound: true }) as unknown as ReturnType<typeof createServerSupabaseClient>);

    const response = await POST(new Request("https://costivra.ai/api/webhooks/resend", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "svix-id": "msg_duplicate",
        "svix-timestamp": "1710000000",
        "svix-signature": "ignored-if-mocked",
      },
      body: JSON.stringify(event),
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true, duplicate: true });
  });
});
