import { describe, expect, it } from "vitest";
import { recordDraftChanged } from "@/lib/records/draft-state";

describe("recordDraftChanged", () => {
  it("ignores nullable-string and safe formatting differences", () => {
    expect(recordDraftChanged({ website: null, amount: "100" }, { website: "", amount: "100" }, ["website", "amount"])).toBe(false);
    expect(recordDraftChanged({ name: "Acme" }, { name: " Acme " }, ["name"])).toBe(false);
  });

  it("detects changes only in editable fields", () => {
    expect(recordDraftChanged({ name: "Acme", audit: "a" }, { name: "Nodal", audit: "b" }, ["name"])).toBe(true);
    expect(recordDraftChanged({ name: "Acme", audit: "a" }, { name: "Acme", audit: "b" }, ["name"])).toBe(false);
  });
});
