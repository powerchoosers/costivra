import { describe, expect, it } from "vitest";
import { ALLOWED_CATEGORY_FACT_KEYS, CATEGORY_FACT_FIELD_GUIDANCE, isAllowedCategoryFactKey } from "./category-facts";

describe("category fact field guidance", () => {
  it("keeps representative bill fields allowlisted and grouped for extraction", () => {
    expect(isAllowedCategoryFactKey("esi_id")).toBe(true);
    expect(isAllowedCategoryFactKey("merchant_id")).toBe(true);
    expect(isAllowedCategoryFactKey("container_size")).toBe(true);
    expect(CATEGORY_FACT_FIELD_GUIDANCE).toContain("Commercial Electricity Supply");
    expect(CATEGORY_FACT_FIELD_GUIDANCE).toContain("identityFields=[esi_id");
    expect(CATEGORY_FACT_FIELD_GUIDANCE).toContain("Merchant Processing & Card Acceptance Fees");
    expect(CATEGORY_FACT_FIELD_GUIDANCE).toContain("Solid Waste, Recycling & Environmental Services");
    expect(ALLOWED_CATEGORY_FACT_KEYS.size).toBeGreaterThan(20);
  });
});
