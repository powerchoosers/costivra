import { describe, expect, it, vi } from "vitest";
import type { InvoiceCandidate } from "@/lib/domain/invoices";

const checkEntitlement = vi.hoisted(() => vi.fn());

vi.mock("@/lib/billing/entitlements", () => ({ checkEntitlement }));

import { persistDetectedServiceLocation, persistServiceLocationAndMeter } from "./service-location";

function candidate(overrides: Partial<NonNullable<InvoiceCandidate["energyService"]>> = {}): InvoiceCandidate {
  return {
    invoiceNumber: "INV-1",
    invoiceDate: "2026-08-01",
    dueDate: "2026-08-31",
    servicePeriodStart: "2026-07-01",
    servicePeriodEnd: "2026-07-31",
    accountNumberLast4: "8349",
    purchaseOrderNumber: null,
    subtotal: "100.00",
    taxTotal: "0.00",
    feeTotal: "0.00",
    creditTotal: "0.00",
    previousBalance: null,
    paymentsAndCredits: null,
    balanceForward: null,
    currentCharges: "100.00",
    currentPeriodCredits: "0.00",
    totalAmount: "100.00",
    amountDue: "100.00",
    energyService: {
      customerName: "Apex Logistics Group",
      serviceAddress: "6700 WANDT DR DALLAS TX 75236-2528",
      serviceIdentifier: "10443720008430367",
      meterId: "113504026LG",
      productName: null,
      utilityTerritory: "Oncor",
      billingDays: 31,
      usageKwh: "39000",
      actualDemandKw: "154",
      billedDemandKw: "175",
      meterMultiplier: "200",
      averagePricePerKwh: "0.047270",
      readDateStart: "2026-07-01",
      readDateEnd: "2026-07-31",
      ...overrides,
    },
    lineItems: [],
  };
}

function database(options: {
  existingMeters?: Array<Record<string, unknown>>;
  onInsert?: (table: string, payload: Record<string, unknown>) => Record<string, unknown>;
}) {
  const inserts: Array<{ table: string; payload: Record<string, unknown> }> = [];
  const auditInserts: Array<Record<string, unknown>> = [];
  const existingMeters = options.existingMeters ?? [];
  const db = {
    from(table: string) {
      if (table === "locations") {
        return {
          insert(payload: Record<string, unknown>) {
            inserts.push({ table, payload });
            return { select: () => ({ single: async () => ({ data: options.onInsert?.(table, payload) ?? { id: "location-new" }, error: null }) }) };
          },
        };
      }
      if (table === "energy_meters") {
        return {
          select: () => ({ eq: async () => ({ data: existingMeters, error: null }) }),
          insert(payload: Record<string, unknown>) {
            inserts.push({ table, payload });
            return { select: () => ({ single: async () => ({ data: options.onInsert?.(table, payload) ?? { id: "meter-new" }, error: null }) }) };
          },
          update() {
            return { eq: () => ({ eq: async () => ({ error: null }) }) };
          },
        };
      }
      if (table === "audit_events") {
        return {
          insert(payload: Record<string, unknown>) {
            auditInserts.push(payload);
            return Promise.resolve({ error: null });
          },
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  };
  return { db, inserts, auditInserts };
}

describe("persistServiceLocationAndMeter", () => {
  it("creates a location for an explicit contract service address", async () => {
    checkEntitlement.mockResolvedValue({ allowed: true });
    const { db, inserts, auditInserts } = database({});

    const result = await persistDetectedServiceLocation({
      db: db as never,
      organizationId: "org-1",
      documentId: "contract-1",
      serviceAddress: "100 MAIN ST AUSTIN TX 78701",
      locations: [],
      sourceField: "serviceAddress",
    });

    expect(result.locationId).toBe("location-new");
    expect(result.serviceLocationMatchStatus).toBe("matched");
    expect(inserts).toEqual([
      expect.objectContaining({
        table: "locations",
        payload: expect.objectContaining({
          metadata: expect.objectContaining({
            autoCreated: true,
            sourceDocumentId: "contract-1",
            sourceField: "serviceAddress",
          }),
        }),
      }),
    ]);
    expect(auditInserts).toEqual([
      expect.objectContaining({
        action: "location.created_from_document",
        resource_id: "location-new",
        safe_metadata: expect.objectContaining({
          source_document_id: "contract-1",
          source_field: "serviceAddress",
        }),
      }),
    ]);
  });

  it("creates one location and one meter for a new source-backed address", async () => {
    checkEntitlement.mockResolvedValue({ allowed: true });
    const { db, inserts, auditInserts } = database({});

    const result = await persistServiceLocationAndMeter({
      db: db as never,
      organizationId: "org-1",
      documentId: "document-1",
      candidate: candidate(),
      workspaceNames: ["Apex Logistics Group"],
      accounts: [],
      locations: [],
    });

    expect(result.serviceLocationMatchStatus).toBe("matched");
    expect(result.locationId).toBe("location-new");
    expect(result.energyMeterId).toBe("meter-new");
    expect(result.issueCodes).toContain("service_location_created_from_document");
    expect(inserts).toEqual([
      expect.objectContaining({
        table: "locations",
        payload: expect.objectContaining({
          address: {
            line1: "6700 WANDT DR",
            city: "DALLAS",
            state: "TX",
            postal_code: "75236-2528",
            country: "US",
          },
        }),
      }),
      expect.objectContaining({
        table: "energy_meters",
        payload: expect.objectContaining({
          location_id: "location-new",
          meter_identifier: "113504026LG",
          service_identifier: "10443720008430367",
        }),
      }),
    ]);
    expect(auditInserts).toEqual([
      expect.objectContaining({ action: "location.created_from_document", resource_id: "location-new" }),
      expect.objectContaining({ action: "energy_meter.created_from_document", resource_id: "meter-new" }),
    ]);
  });

  it("links a later bill to the existing meter without creating another location", async () => {
    checkEntitlement.mockClear();
    const { db, inserts } = database({
      existingMeters: [{ id: "meter-1", location_id: "location-1", meter_identifier: "113504026LG", service_identifier: "10443720008430367" }],
    });

    const result = await persistServiceLocationAndMeter({
      db: db as never,
      organizationId: "org-1",
      documentId: "document-2",
      candidate: candidate(),
      workspaceNames: ["Apex Logistics Group"],
      accounts: [],
      locations: [{ id: "location-1", name: "Dallas service site", address: { line1: "6700 WANDT DR", city: "DALLAS", state: "TX", postal_code: "75236-2528" } }],
    });

    expect(result.locationId).toBe("location-1");
    expect(result.energyMeterId).toBe("meter-1");
    expect(inserts).toHaveLength(0);
    expect(checkEntitlement).not.toHaveBeenCalled();
  });

  it("does not create a location when the source customer conflicts with the workspace", async () => {
    checkEntitlement.mockClear();
    const { db, inserts, auditInserts } = database({});

    const result = await persistServiceLocationAndMeter({
      db: db as never,
      organizationId: "org-1",
      documentId: "document-3",
      candidate: candidate({ customerName: "Duncanville Independent School District" }),
      workspaceNames: ["Apex Logistics Group"],
      accounts: [],
      locations: [],
    });

    expect(result.locationId).toBeNull();
    expect(result.serviceLocationMatchStatus).toBe("unmatched");
    expect(result.issueCodes).toContain("service_location_creation_blocked_customer_mismatch");
    expect(checkEntitlement).not.toHaveBeenCalled();
    expect(inserts).toHaveLength(0);
    expect(auditInserts).toHaveLength(0);
  });

  it("keeps two meters under one newly detected service address", async () => {
    checkEntitlement.mockResolvedValue({ allowed: true });
    const { db, inserts } = database({
      onInsert: (table, payload) => table === "energy_meters"
        ? { id: payload.meter_identifier === "METER-2" ? "meter-2" : "meter-1" }
        : { id: "location-new" },
    });
    const first = { ...candidate().energyService!, sourceKey: "meter-1" };

    const result = await persistServiceLocationAndMeter({
      db: db as never,
      organizationId: "org-1",
      documentId: "document-multi-meter",
      candidate: {
        ...candidate(),
        energyServices: [first, { ...first, sourceKey: "meter-2", meterId: "METER-2", serviceIdentifier: "ESI-2" }],
      },
      workspaceNames: ["Apex Logistics Group"],
      accounts: [],
      locations: [],
    });

    expect(result.locationIds).toEqual(["location-new"]);
    expect(result.energyMeterIds).toEqual(["meter-1", "meter-2"]);
    expect(result.energyMeterLinks).toEqual([
      { energyMeterId: "meter-1", serviceIndex: 0, sourceKey: "meter-1" },
      { energyMeterId: "meter-2", serviceIndex: 1, sourceKey: "meter-2" },
    ]);
    expect(inserts.filter((insert) => insert.table === "locations")).toHaveLength(1);
    expect(inserts.filter((insert) => insert.table === "energy_meters")).toHaveLength(2);
  });

  it("creates standalone locations for multiple non-energy service addresses", async () => {
    checkEntitlement.mockResolvedValue({ allowed: true });
    const { db, inserts } = database({
      onInsert: (table, payload) => table === "locations"
        ? { id: payload.address && typeof payload.address === "object" && "line1" in payload.address
          ? (payload.address as { line1?: string }).line1 === "100 MAIN ST" ? "location-100" : "location-200"
          : "location-new" }
        : { id: "meter-new" },
    });

    const result = await persistServiceLocationAndMeter({
      db: db as never,
      organizationId: "org-1",
      documentId: "document-multi-address",
      candidate: {
        ...candidate(),
        energyService: null,
        serviceDetails: {
          planName: "Managed network",
          productFamily: "telecom",
          serviceAddresses: ["100 MAIN ST AUSTIN TX 78701", "200 MAIN ST AUSTIN TX 78701"],
          serviceIdentifiers: [],
          phoneNumbers: [],
          circuitIds: ["CIRCUIT-1"],
          subscriptionIdentifiers: [],
          resourceIdentifiers: [],
          cloudAccountIdentifiers: [],
          region: null,
          bandwidthQuantity: null,
          bandwidthUnit: null,
          lineCount: null,
          deviceCount: null,
          seatCount: null,
          usageQuantity: null,
          usageUnit: null,
          includedUsageQuantity: null,
          includedUsageUnit: null,
          commitmentType: null,
          commitmentTermMonths: null,
        },
      },
      workspaceNames: ["Apex Logistics Group"],
      accounts: [],
      locations: [],
    });

    expect(result.locationIds).toEqual(["location-100", "location-200"]);
    expect(result.energyMeterIds).toEqual([]);
    expect(inserts.filter((insert) => insert.table === "locations")).toHaveLength(2);
    expect(inserts.filter((insert) => insert.table === "energy_meters")).toHaveLength(0);
    expect(inserts.map((insert) => insert.payload).filter((payload) => payload.organization_id)).toEqual([
      expect.objectContaining({
        metadata: expect.objectContaining({
          sourceField: "invoice.serviceDetails.serviceAddresses[0]",
        }),
      }),
      expect.objectContaining({
        metadata: expect.objectContaining({
          sourceField: "invoice.serviceDetails.serviceAddresses[1]",
        }),
      }),
    ]);
  });
});
