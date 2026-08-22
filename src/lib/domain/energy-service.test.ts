import { describe, expect, it } from "vitest";
import { parseEnergyService } from "@/lib/domain/energy-service";

describe("energy service candidate parsing", () => {
  it("retains source-visible reads, net/generation usage, and power factor", () => {
    expect(parseEnergyService({
      serviceAddress: "100 MAIN ST AUSTIN TX 78701",
      meterId: "SOLAR-1",
      serviceIdentifier: "ESI-1",
      readStatus: "actual",
      previousMeterRead: "10000",
      currentMeterRead: "11000",
      meterReadUnit: "kWh",
      usageKwh: "1000",
      deliveredKwh: "1000",
      receivedKwh: "50",
      netUsageKwh: "950",
      generationKwh: "50",
      powerFactor: "0.95",
    })).toMatchObject({
      readStatus: "actual",
      previousMeterRead: "10000",
      currentMeterRead: "11000",
      meterReadUnit: "kWh",
      netUsageKwh: "950",
      generationKwh: "50",
      powerFactor: "0.95",
    });
  });

  it("leaves invalid negative source readings unknown", () => {
    expect(parseEnergyService({
      meterId: "METER-1",
      previousMeterRead: "-1",
      currentMeterRead: "-2",
      powerFactor: "-0.5",
    })).toMatchObject({
      meterId: "METER-1",
      previousMeterRead: null,
      currentMeterRead: null,
      powerFactor: null,
    });
  });
});
