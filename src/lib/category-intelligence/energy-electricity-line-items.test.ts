import { describe, expect, it } from "vitest";
import { normalizeLineItems } from "./line-item-normalizer";

describe("commercial electricity line-item ontology", () => {
  it("classifies every Reliant invoice line without collapsing known charges into unknown", () => {
    const descriptions = [
      "Actual Consumption * Price 39,000 kWh @ $0.047270/kWh",
      "Market Securitization (Debt) Financing Default Jan",
      "ERCOT Cont Reserve Serv (ECRS)",
      "Firm Fuel Supply Service",
      "Market Securitization- Uplift",
      "Ancillary Services Obligation Adj",
      "TX-ERCOT Admin Fees - CIL",
      "TDSP Customer Charge",
      "Delivery Point Charge",
      "Distribution Cost Recovery Factor",
      "Energy Efficiency Cost Recovery Factor(EECRF)",
      "Distribution Charge (DUOS) 175 kW @ $5.969330/kW",
      "Transmission Cost Recov Factor 175 kW @ $5.114972/kW",
      "PUC Assessment",
    ];

    const results = normalizeLineItems(
      descriptions.map((description, index) => ({
        id: `reliant-line-${index + 1}`,
        description,
        amount: 1,
      })),
      "commercial-electricity-supply",
    );

    expect(results.map((result) => result.canonicalCode)).toEqual([
      "ELEC-GEN-01",
      "ELEC-SEC-01",
      "ELEC-ANC-01",
      "ELEC-FUEL-01",
      "ELEC-SEC-01",
      "ELEC-ANC-01",
      "ELEC-ADMIN-01",
      "ELEC-METER-01",
      "ELEC-RIDER-01",
      "ELEC-RIDER-01",
      "ELEC-RIDER-01",
      "ELEC-TDSP-01",
      "ELEC-RIDER-01",
      "ELEC-TAX-01",
    ]);
    expect(results.every((result) => result.canonicalCode && result.label !== "Unclassified line item")).toBe(true);
  });
});
