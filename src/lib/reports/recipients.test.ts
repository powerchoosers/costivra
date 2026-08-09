import { describe, expect, it } from "vitest";
import { authorizedReportRecipients, normalizeReportRecipients } from "./recipients";

describe("report recipients", () => {
  it("normalizes, removes blanks, and deduplicates addresses", () => {
    expect(normalizeReportRecipients([" Owner@Example.com ", "owner@example.com", "", 42])).toEqual(["owner@example.com"]);
  });

  it("keeps only current authorized workspace recipients", () => {
    expect(authorizedReportRecipients(["owner@example.com", "outside@example.com", "OWNER@example.com"], ["OWNER@example.com"])).toEqual(["owner@example.com"]);
  });
});
