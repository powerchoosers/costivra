import { describe, expect, it } from "vitest";
import { supplierCategoryMatches } from "./supplier-matching";

describe("supplierCategoryMatches", () => {
  it.each([
    ["Telecom & Internet", "Telecom"],
    ["saas-subscriptions", "Software"],
    ["commercial-electricity-supply", "Commercial Energy"],
    ["Waste Management", "Wastewater Utility"],
  ])("matches %s to %s", (requested, candidate) => {
    expect(supplierCategoryMatches(requested, candidate)).toBe(true);
  });

  it("does not cross-match unrelated supplier categories", () => {
    expect(supplierCategoryMatches("Telecom", "Software")).toBe(false);
    expect(supplierCategoryMatches("Commercial Energy", "Facilities")).toBe(false);
  });
});
