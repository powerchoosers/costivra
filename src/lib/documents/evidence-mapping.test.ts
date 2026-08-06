import { describe, expect, it } from "vitest";
import { evidenceIdsForLineItem, lineItemEvidenceMap } from "./evidence-mapping";

describe("line-item evidence mapping", () => {
  const evidence = [
    { id: "header", fieldPath: "invoice.invoiceNumber", sourceKey: null },
    { id: "line-one", fieldPath: "invoice.lineItems[0].amount", sourceKey: "line-1" },
    { id: "line-one-detail", fieldPath: "invoice.lineItems.0.description", sourceKey: null },
    { id: "line-two", fieldPath: "invoice.lineItems[1]", sourceKey: "line-2" },
    { id: "broad-lines", fieldPath: "invoice.lineItems", sourceKey: null },
  ];

  it("supports indexed paths and stable source keys without assigning broad evidence", () => {
    expect(evidenceIdsForLineItem({ evidence, lineIndex: 0, sourceKey: "line-1" })).toEqual([
      "line-one",
      "line-one-detail",
    ]);
    expect(evidenceIdsForLineItem({ evidence, lineIndex: 1, sourceKey: "line-2" })).toEqual([
      "line-two",
    ]);
  });

  it("returns one ordered evidence list per stored line", () => {
    expect(lineItemEvidenceMap({ evidence, lineItems: [{ sourceKey: "line-1" }, { sourceKey: "line-2" }] })).toEqual([
      ["line-one", "line-one-detail"],
      ["line-two"],
    ]);
  });
});

