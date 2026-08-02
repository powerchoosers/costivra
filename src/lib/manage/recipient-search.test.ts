import { describe, expect, it } from "vitest";
import { buildRecipientCandidates, searchRecipientCandidates, splitRecipientValues } from "./recipient-search";

const contacts = [
  { id: "1", organizationId: "current", organizationName: "Apex", fullName: "Avery Client", email: "avery@example.com", title: "Controller", phone: null, isPrimary: true, status: "active", source: "crm" as const, marketingStatus: null, marketingConsentAt: null },
  { id: "2", organizationId: "other", organizationName: "Beacon", fullName: "Bailey Contact", email: "bailey@example.com", title: null, phone: null, isPrimary: false, status: "active", source: "crm" as const, marketingStatus: null, marketingConsentAt: null },
];

const staff = [
  { id: "3", email: "team@costivra.ai", fullName: "Taylor Teammate", role: "operator" as const },
];

describe("composer recipient search", () => {
  it("puts contacts from the selected account ahead of other contacts and staff", () => {
    const candidates = buildRecipientCandidates(contacts, staff, "current");
    expect(candidates.map((candidate) => candidate.source)).toEqual(["account", "contact", "staff"]);
    expect(searchRecipientCandidates(candidates, "", [])[0]?.email).toBe("avery@example.com");
  });

  it("searches names and emails while excluding recipients already selected", () => {
    const candidates = buildRecipientCandidates(contacts, staff, "current");
    expect(searchRecipientCandidates(candidates, "team", []).map((candidate) => candidate.email)).toEqual(["team@costivra.ai"]);
    expect(searchRecipientCandidates(candidates, "avery", ["AVERY@example.com"])).toEqual([]);
  });

  it("normalizes a comma or semicolon separated starting value", () => {
    expect(splitRecipientValues("One@Example.com; two@example.com,one@example.com")).toEqual(["one@example.com", "two@example.com"]);
  });
});
