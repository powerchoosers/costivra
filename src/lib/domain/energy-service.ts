export type EnergyService = {
  /** Stable source-row key used to connect the meter row to page evidence. */
  sourceKey?: string | null;
  customerName: string | null;
  serviceAddress: string | null;
  serviceIdentifier: string | null;
  meterId: string | null;
  productName: string | null;
  utilityTerritory: string | null;
  billingDays: number | null;
  readStatus?: string | null;
  previousMeterRead?: string | null;
  currentMeterRead?: string | null;
  meterReadUnit?: string | null;
  usageKwh: string | null;
  deliveredKwh?: string | null;
  receivedKwh?: string | null;
  netUsageKwh?: string | null;
  generationKwh?: string | null;
  actualDemandKw: string | null;
  billedDemandKw: string | null;
  powerFactor?: string | null;
  meterMultiplier: string | null;
  averagePricePerKwh: string | null;
  readDateStart: string | null;
  readDateEnd: string | null;
  assignedRateCode?: string | null;
  serviceVoltage?: string | null;
  meteringConfiguration?: string | null;
  serviceClass?: string | null;
  historicalDemandKw?: string | null;
  ratchetApplies?: boolean | null;
};

const nonNegativeDecimalPattern = /^\d{1,16}(?:\.\d{1,6})?$/;

function nullableString(value: unknown, maxLength: number): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : null;
}

function nullableDate(value: unknown): string | null {
  const date = nullableString(value, 10);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date
    ? null
    : date;
}

function nullableNonNegativeInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value;
  if (typeof value === "string" && /^\d{1,4}$/.test(value.trim())) return Number(value.trim());
  return null;
}

function nullableNonNegativeDecimal(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replaceAll(",", "");
  return nonNegativeDecimalPattern.test(normalized) ? normalized : null;
}

function nullableBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

/**
 * Validate the optional energy-specific extraction without treating any
 * missing field as a fact. Full identifiers are retained server-side for
 * matching, but customer-facing code must use masked representations.
 */
export function parseEnergyService(value: unknown): EnergyService | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const service: EnergyService = {
    sourceKey: nullableString(source.sourceKey, 80),
    customerName: nullableString(source.customerName, 255),
    serviceAddress: nullableString(source.serviceAddress, 500),
    serviceIdentifier: nullableString(source.serviceIdentifier, 120),
    meterId: nullableString(source.meterId, 120),
    productName: nullableString(source.productName, 160),
    utilityTerritory: nullableString(source.utilityTerritory, 120),
    billingDays: nullableNonNegativeInteger(source.billingDays),
    readStatus: nullableString(source.readStatus, 40),
    previousMeterRead: nullableNonNegativeDecimal(source.previousMeterRead),
    currentMeterRead: nullableNonNegativeDecimal(source.currentMeterRead),
    meterReadUnit: nullableString(source.meterReadUnit, 40),
    usageKwh: nullableNonNegativeDecimal(source.usageKwh),
    deliveredKwh: nullableNonNegativeDecimal(source.deliveredKwh),
    receivedKwh: nullableNonNegativeDecimal(source.receivedKwh),
    netUsageKwh: nullableNonNegativeDecimal(source.netUsageKwh),
    generationKwh: nullableNonNegativeDecimal(source.generationKwh),
    actualDemandKw: nullableNonNegativeDecimal(source.actualDemandKw),
    billedDemandKw: nullableNonNegativeDecimal(source.billedDemandKw),
    powerFactor: nullableNonNegativeDecimal(source.powerFactor),
    meterMultiplier: nullableNonNegativeDecimal(source.meterMultiplier),
    averagePricePerKwh: nullableNonNegativeDecimal(source.averagePricePerKwh),
    readDateStart: nullableDate(source.readDateStart),
    readDateEnd: nullableDate(source.readDateEnd),
  };
  const tariffFields = {
    assignedRateCode: nullableString(source.assignedRateCode, 80),
    serviceVoltage: nullableString(source.serviceVoltage, 80),
    meteringConfiguration: nullableString(source.meteringConfiguration, 120),
    serviceClass: nullableString(source.serviceClass, 120),
    historicalDemandKw: nullableNonNegativeDecimal(source.historicalDemandKw),
    ratchetApplies: nullableBoolean(source.ratchetApplies),
  };
  Object.assign(service, Object.fromEntries(Object.entries(tariffFields).filter(([, field]) => field !== null)));
  return Object.values(service).some((field) => field !== null) ? service : null;
}
