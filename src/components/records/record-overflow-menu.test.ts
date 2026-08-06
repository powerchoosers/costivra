import { describe, expect, it } from "vitest";
import { shouldOpenMenuUpward } from "@/components/records/record-overflow-menu";

describe("record overflow placement", () => {
  it("opens above a trigger close to the viewport bottom", () => {
    expect(shouldOpenMenuUpward(700, 742, 800)).toBe(true);
  });

  it("opens below when there is sufficient room", () => {
    expect(shouldOpenMenuUpward(120, 162, 800)).toBe(false);
  });
});
