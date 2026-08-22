import { checkEntitlement } from "@/lib/billing/entitlements";
import {
  normalizeAddress,
  normalizeIdentity,
  resolveInvoiceIdentity,
  type IdentityMatchStatus,
  type InvoiceIdentityResolution,
} from "@/lib/domain/invoice-matching";
import type { InvoiceCandidate } from "@/lib/domain/invoices";
import type { EnergyService } from "@/lib/domain/energy-service";
import type { createServerSupabaseClient } from "@/lib/supabase/server";

type DatabaseClient = ReturnType<typeof createServerSupabaseClient>;
type Row = Record<string, unknown>;

export type ServiceIdentityResolution = InvoiceIdentityResolution & {
  energyMeterId: string | null;
  energyMeterIds: string[];
  energyMeterLinks: Array<{ energyMeterId: string; serviceIndex: number; sourceKey: string | null }>;
  createdLocationId: string | null;
  createdMeterId: string | null;
  createdMeterIds: string[];
  locationIds: string[];
};

export type DetectedServiceLocationResolution = {
  locationId: string | null;
  serviceLocationMatchStatus: IdentityMatchStatus;
  createdLocationId: string | null;
  issueCodes: string[];
};

type AddressDraft = {
  name: string;
  address: Record<string, string>;
};

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function addressParts(serviceAddress: string): AddressDraft {
  const source = serviceAddress.replace(/[\r\n,]+/g, " ").replace(/\s+/g, " ").trim();
  const tail = source.match(/^(.+?)\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/i);
  const prefix = tail?.[1]?.trim() ?? source;
  const state = tail?.[2]?.toUpperCase() ?? "";
  const postalCode = tail?.[3] ?? "";
  const street = prefix.match(
    /^(.+?\b(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|parkway|pkwy|highway|hwy|freeway|fwy|court|ct|way|place|pl|terrace|ter|circle|cir)\b)\s+(.+)$/i,
  );
  const line1 = street?.[1]?.trim() ?? prefix;
  const city = street?.[2]?.trim() ?? "";
  const address: Record<string, string> = {
    line1,
    country: "US",
  };
  if (city) address.city = city;
  if (state) address.state = state;
  if (postalCode) address.postal_code = postalCode;

  return {
    name: `${city || "Service address"} · ${line1}`.slice(0, 120),
    address,
  };
}

function uniqueLocationName(base: string, locations: Row[]): string {
  const existing = new Set(locations.map((location) => text(location.name)?.toLowerCase()).filter(Boolean));
  if (!existing.has(base.toLowerCase())) return base;
  for (let index = 2; index < 100; index += 1) {
    const candidate = `${base.slice(0, 115)} · ${index}`;
    if (!existing.has(candidate.toLowerCase())) return candidate;
  }
  return `${base.slice(0, 110)} · ${Date.now()}`;
}

function energyServices(candidate: InvoiceCandidate): EnergyService[] {
  return candidate.energyServices?.length
    ? candidate.energyServices
    : candidate.energyService
      ? [candidate.energyService]
      : [];
}

function serviceIdentifiers(service: EnergyService | null): { meterId: string | null; serviceId: string | null } {
  return {
    meterId: text(service?.meterId),
    serviceId: text(service?.serviceIdentifier),
  };
}

function identifiersMatch(row: Row, identifiers: { meterId: string | null; serviceId: string | null }) {
  const meterId = text(row.meter_identifier);
  const serviceId = text(row.service_identifier);
  return Boolean(
    (identifiers.meterId && meterId && normalizeIdentity(identifiers.meterId) === normalizeIdentity(meterId))
      || (identifiers.serviceId && serviceId && normalizeIdentity(identifiers.serviceId) === normalizeIdentity(serviceId)),
  );
}

export function matchServiceAddress(serviceAddress: string | null, locations: Row[]): {
  status: IdentityMatchStatus;
  id: string | null;
} {
  if (!serviceAddress) return { status: "unknown", id: null };
  const normalizedSource = normalizeAddress(serviceAddress);
  if (!normalizedSource) return { status: "unknown", id: null };
  const matches = locations.filter((location) => normalizeAddress(location.address) === normalizedSource);
  if (matches.length === 1) return { status: "matched", id: text(matches[0].id) };
  if (matches.length > 1) return { status: "ambiguous", id: null };
  return { status: "unmatched", id: null };
}

export async function persistDetectedServiceLocation(input: {
  db: DatabaseClient;
  organizationId: string;
  documentId: string;
  serviceAddress: string | null;
  workspaceCustomerMatchStatus?: IdentityMatchStatus;
  locations: Row[];
  existingLocationId?: string | null;
  existingStatus?: IdentityMatchStatus;
  issueCodes?: string[];
  sourceField?: string;
}): Promise<DetectedServiceLocationResolution> {
  const detected = matchServiceAddress(input.serviceAddress, input.locations);
  let locationId = input.existingLocationId ?? detected.id;
  let locationStatus = input.existingStatus && input.existingStatus !== "unknown"
    ? input.existingStatus
    : detected.status;
  const issueCodes = [...(input.issueCodes ?? [])];
  let createdLocationId: string | null = null;

  if (!locationId && input.serviceAddress && normalizeAddress(input.serviceAddress) && locationStatus === "unmatched") {
    if (input.workspaceCustomerMatchStatus === "unmatched") {
      issueCodes.push("service_location_creation_blocked_customer_mismatch");
    } else {
      const entitlement = await checkEntitlement(
        input.db,
        input.organizationId,
        "locations",
        input.locations.length,
      );
      if (entitlement.allowed) {
        const draft = addressParts(input.serviceAddress);
        const created = await input.db
          .from("locations")
          .insert({
            organization_id: input.organizationId,
            name: uniqueLocationName(draft.name, input.locations),
            address: draft.address,
            status: "active",
            metadata: {
              autoCreated: true,
              sourceDocumentId: input.documentId,
              sourceField: input.sourceField ?? "serviceAddress",
              addressNormalized: normalizeAddress(input.serviceAddress),
            },
          })
          .select("id")
          .single();
        if (created.error) throw created.error;
        locationId = text(created.data?.id);
        createdLocationId = locationId;
        locationStatus = locationId ? "matched" : "unmatched";
        if (locationId) {
          const { error: auditError } = await input.db.from("audit_events").insert({
            organization_id: input.organizationId,
            actor_type: "service",
            actor_id: null,
            action: "location.created_from_document",
            resource_type: "location",
            resource_id: locationId,
            safe_metadata: {
              source_document_id: input.documentId,
              source_field: input.sourceField ?? "serviceAddress",
              auto_created: true,
            },
          });
          if (auditError) throw auditError;
          issueCodes.push("service_location_created_from_document");
          const unmatchedIndex = issueCodes.indexOf("service_location_unmatched");
          if (unmatchedIndex >= 0) issueCodes.splice(unmatchedIndex, 1);
        }
      } else {
        issueCodes.push("service_location_creation_blocked");
      }
    }
  }

  return {
    locationId,
    serviceLocationMatchStatus: locationStatus,
    createdLocationId,
    issueCodes: Array.from(new Set(issueCodes)),
  };
}

/**
 * Resolve a source service address to a location and persist a meter/service
 * point beneath it. This is intentionally deterministic: an exact address
 * match is required, while a new location is only created from a source-backed
 * address and remains in the invoice's review trail.
 */
export async function persistServiceLocationAndMeter(input: {
  db: DatabaseClient;
  organizationId: string;
  documentId: string;
  candidate: InvoiceCandidate;
  serviceAddress?: string | null;
  customerName?: string | null;
  workspaceNames: string[];
  accounts: Row[];
  locations: Row[];
}): Promise<ServiceIdentityResolution> {
  const initial = resolveInvoiceIdentity({
    candidate: input.candidate,
    workspaceNames: input.workspaceNames,
    accounts: input.accounts,
    locations: input.locations,
    customerName: input.customerName,
    serviceAddress: input.serviceAddress,
  });
  const services = energyServices(input.candidate);
  const serviceRows = services.length > 0 ? services : [null];
  const issueCodes = [...initial.issueCodes];
  const workingLocations = [...input.locations];
  const locationIds: string[] = [];
  const createdLocationIds: string[] = [];
  const meterLinks: Array<{ energyMeterId: string; serviceIndex: number; sourceKey: string | null }> = [];
  const createdMeterIds: string[] = [];
  let existingMeters: Row[] | null = null;
  const representedAddresses = new Set<string>();

  for (const [serviceIndex, service] of serviceRows.entries()) {
    // A top-level address on a summary statement is the common address for
    // rows that do not repeat it. A row-level address wins when present.
    const sourceAddress = text(service?.serviceAddress) ?? text(input.serviceAddress);
    const normalizedSourceAddress = sourceAddress ? normalizeAddress(sourceAddress) : "";
    if (normalizedSourceAddress) representedAddresses.add(normalizedSourceAddress);
    const detectedLocation = await persistDetectedServiceLocation({
      db: input.db,
      organizationId: input.organizationId,
      documentId: input.documentId,
      serviceAddress: sourceAddress,
      workspaceCustomerMatchStatus: initial.workspaceCustomerMatchStatus,
      locations: workingLocations,
      issueCodes,
      sourceField: service?.serviceAddress
        ? `invoice.energyServices[${serviceIndex}].serviceAddress`
        : input.serviceAddress
          ? "serviceAddress"
          : "invoice.energyService.serviceAddress",
    });
    issueCodes.splice(0, issueCodes.length, ...detectedLocation.issueCodes);
    if (detectedLocation.locationId) {
      if (!locationIds.includes(detectedLocation.locationId)) locationIds.push(detectedLocation.locationId);
      if (detectedLocation.createdLocationId) {
        createdLocationIds.push(detectedLocation.createdLocationId);
        const draft = sourceAddress ? addressParts(sourceAddress) : null;
        workingLocations.push({
          id: detectedLocation.createdLocationId,
          name: draft?.name ?? "Service address",
          address: draft?.address ?? {},
        });
      }
    }

    const identifiers = serviceIdentifiers(service);
    if (!identifiers.meterId && !identifiers.serviceId) continue;
    if (!detectedLocation.locationId) {
      issueCodes.push("energy_meter_location_required");
      continue;
    }
    if (!existingMeters) {
      const meterResult = await input.db
        .from("energy_meters")
        .select("id,location_id,meter_identifier,service_identifier")
        .eq("organization_id", input.organizationId);
      if (meterResult.error) throw meterResult.error;
      existingMeters = (meterResult.data ?? []) as Row[];
    }
    const matches = existingMeters.filter((row) => identifiersMatch(row, identifiers));
    let meterId: string | null = null;
    if (matches.length > 1) {
      issueCodes.push("energy_meter_identity_ambiguous");
    } else if (matches.length === 1) {
      const existing = matches[0];
      if (text(existing.location_id) !== detectedLocation.locationId) {
        issueCodes.push("energy_meter_location_conflict");
      } else {
        meterId = text(existing.id);
        if (meterId) {
          const { error: meterUpdateError } = await input.db
            .from("energy_meters")
            .update({
              last_seen_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", meterId)
            .eq("organization_id", input.organizationId);
          if (meterUpdateError) throw meterUpdateError;
        }
      }
    } else {
      const created = await input.db
        .from("energy_meters")
        .insert({
          organization_id: input.organizationId,
          location_id: detectedLocation.locationId,
          meter_identifier: identifiers.meterId,
          service_identifier: identifiers.serviceId,
          account_number_last4: text(input.candidate.accountNumberLast4),
          utility_territory: text(service?.utilityTerritory),
          meter_multiplier: text(service?.meterMultiplier),
          first_seen_document_id: input.documentId,
          last_seen_at: new Date().toISOString(),
          metadata: { source: "document_intake", serviceIndex, sourceKey: text(service?.sourceKey) },
        })
        .select("id")
        .single();
      if (created.error) throw created.error;
      meterId = text(created.data?.id);
      if (meterId) {
        const { error: auditError } = await input.db.from("audit_events").insert({
          organization_id: input.organizationId,
          actor_type: "service",
          actor_id: null,
          action: "energy_meter.created_from_document",
          resource_type: "energy_meter",
          resource_id: meterId,
          safe_metadata: {
            source_document_id: input.documentId,
            service_index: serviceIndex,
            source_key: text(service?.sourceKey),
          },
        });
        if (auditError) throw auditError;
        createdMeterIds.push(meterId);
        existingMeters.push({
          id: meterId,
          location_id: detectedLocation.locationId,
          meter_identifier: identifiers.meterId,
          service_identifier: identifiers.serviceId,
        });
      }
    }
    if (meterId) meterLinks.push({ energyMeterId: meterId, serviceIndex, sourceKey: text(service?.sourceKey) });
  }

  // Non-energy invoices can govern several physical service addresses without
  // exposing energy-meter rows. Persist those addresses as locations, but
  // never invent a meter relationship for them.
  for (const [addressIndex, rawAddress] of (input.candidate.serviceDetails?.serviceAddresses ?? []).entries()) {
    const sourceAddress = text(rawAddress);
    const normalizedSourceAddress = sourceAddress ? normalizeAddress(sourceAddress) : "";
    if (!sourceAddress || !normalizedSourceAddress || representedAddresses.has(normalizedSourceAddress)) continue;
    representedAddresses.add(normalizedSourceAddress);

    const detectedLocation = await persistDetectedServiceLocation({
      db: input.db,
      organizationId: input.organizationId,
      documentId: input.documentId,
      serviceAddress: sourceAddress,
      workspaceCustomerMatchStatus: initial.workspaceCustomerMatchStatus,
      locations: workingLocations,
      issueCodes,
      sourceField: `invoice.serviceDetails.serviceAddresses[${addressIndex}]`,
    });
    issueCodes.splice(0, issueCodes.length, ...detectedLocation.issueCodes);
    if (detectedLocation.locationId) {
      if (!locationIds.includes(detectedLocation.locationId)) locationIds.push(detectedLocation.locationId);
      if (detectedLocation.createdLocationId) {
        createdLocationIds.push(detectedLocation.createdLocationId);
        const draft = addressParts(sourceAddress);
        workingLocations.push({
          id: detectedLocation.createdLocationId,
          name: draft.name,
          address: draft.address,
        });
      }
    }
  }

  const serviceLocationMatchStatus: IdentityMatchStatus =
    issueCodes.includes("service_location_unmatched") || issueCodes.includes("service_location_creation_blocked") || issueCodes.includes("service_location_creation_blocked_customer_mismatch")
      ? "unmatched"
      : issueCodes.includes("service_location_ambiguous")
        ? "ambiguous"
        : locationIds.length > 0
          ? "matched"
          : initial.serviceLocationMatchStatus;
  const energyMeterIds = meterLinks.map((link) => link.energyMeterId);
  return {
    ...initial,
    serviceLocationMatchStatus,
    locationId: locationIds[0] ?? initial.locationId,
    locationIds,
    issueCodes: Array.from(new Set(issueCodes)),
    energyMeterId: energyMeterIds[0] ?? null,
    energyMeterIds,
    energyMeterLinks: meterLinks,
    createdLocationId: createdLocationIds[0] ?? null,
    createdMeterId: createdMeterIds[0] ?? null,
    createdMeterIds,
  };
}
