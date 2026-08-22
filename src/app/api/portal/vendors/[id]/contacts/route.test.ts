import { beforeEach, describe, expect, it, vi } from "vitest";

const requirePortalEditor = vi.hoisted(() => vi.fn());

vi.mock("@/lib/portal/repository", () => ({ requirePortalEditor }));

import { POST } from "@/app/api/portal/vendors/[id]/contacts/route";

const organizationId = "c3d4e5f6-a7b8-4890-abcd-1234567890ab";
const userId = "d4e5f6a7-b8c9-4890-abcd-1234567890ab";
const relationshipId = "a1b2c3d4-e5f6-4890-abcd-1234567890ab";
const contactId = "b2c3d4e5-f6a7-4890-abcd-1234567890ab";

describe("vendor relationship contacts API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a contact without a usable contact method", async () => {
    const from = vi.fn((table: string) => table === "organization_vendors"
      ? { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: relationshipId }, error: null }) }) }) }) }
      : undefined);
    requirePortalEditor.mockResolvedValue({ db: { from }, organizationId, userId, role: "member" });

    const response = await POST(
      new Request(`http://localhost/api/portal/vendors/${relationshipId}/contacts`, {
        method: "POST",
        body: JSON.stringify({ contactName: "Billing desk", contactType: "billing" }),
      }),
      { params: Promise.resolve({ id: relationshipId }) },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Add an email, phone number, or website so this contact can be reached." });
    expect(from).toHaveBeenCalledWith("organization_vendors");
  });

  it("creates a broker contact inside the requested organization and relationship", async () => {
    let inserted: Record<string, unknown> | null = null;
    let audited: Record<string, unknown> | null = null;
    const from = vi.fn((table: string) => {
      if (table === "organization_vendors") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({ maybeSingle: async () => ({ data: { id: relationshipId }, error: null }) }),
            }),
          }),
        };
      }
      if (table === "organization_vendor_contacts") {
        return {
          insert: (value: Record<string, unknown>) => {
            inserted = value;
            return { select: () => ({ single: async () => ({ data: { id: contactId, ...value }, error: null }) }) };
          },
        };
      }
      if (table === "audit_events") {
        return { insert: async (value: Record<string, unknown>) => { audited = value; return { error: null }; } };
      }
      throw new Error(`Unexpected table ${table}`);
    });
    requirePortalEditor.mockResolvedValue({ db: { from }, organizationId, userId, role: "member" });

    const response = await POST(
      new Request(`http://localhost/api/portal/vendors/${relationshipId}/contacts`, {
        method: "POST",
        body: JSON.stringify({
          contactType: "broker",
          companyName: "Northstar Energy Advisors",
          contactName: "Alex Morgan",
          title: "Account advisor",
          email: "Alex@Northstar.example",
          preferredChannel: "email",
          isPrimary: false,
        }),
      }),
      { params: Promise.resolve({ id: relationshipId }) },
    );

    expect(response.status).toBe(201);
    expect(inserted).toMatchObject({
      organization_id: organizationId,
      organization_vendor_id: relationshipId,
      contact_type: "broker",
      email: "alex@northstar.example",
      created_by: userId,
      updated_by: userId,
    });
    expect(audited).toMatchObject({
      organization_id: organizationId,
      resource_type: "vendor_contact",
      resource_id: contactId,
      safe_metadata: { organization_vendor_id: relationshipId, contact_type: "broker" },
    });
    expect(JSON.stringify(audited)).not.toContain("alex@northstar.example");
  });
});
