import { describe, expect, it } from "vitest";
import { identityTermsOverlap, normalizeVendorName, normalizeDomain, normalizeCategorySlug, resolveKnownVendorIdentity } from "./normalize";
import { validateVendorCandidatePolicy } from "./candidate-policy";

describe("Vendor Discovery and Normalization Suite", () => {
  it("normalizes vendor names and strips common corporate suffixes", () => {
    expect(normalizeVendorName("AT&T Inc.")).toBe("at t");
    expect(normalizeVendorName("Comcast Business Services LLC")).toBe("comcast business");
    expect(normalizeVendorName("Slack Technologies, Inc.")).toBe("slack");
    expect(normalizeVendorName("Acme Corp.")).toBe("acme");
    expect(resolveKnownVendorIdentity("Reliant Energy Retail Services, LLC")).toEqual({
      canonicalName: "Reliant Energy",
      categoryName: "Commercial Energy",
    });
    expect(resolveKnownVendorIdentity("waste_management")).toEqual({
      canonicalName: "Waste Management",
      categoryName: "Waste Management",
    });
  });

  it("normalizes domain URLs to registrable host domains", () => {
    expect(normalizeDomain("https://www.att.com/billing")).toBe("att.com");
    expect(normalizeDomain("http://subdomain.example.co.uk:8080/path")).toBe("example.co.uk");
    expect(normalizeDomain("my.portal.slack.com")).toBe("slack.com");
  });

  it("normalizes category strings to clean slugs", () => {
    expect(normalizeCategorySlug("Software Subscriptions & SaaS")).toBe("software-subscriptions-saas");
    expect(normalizeCategorySlug("Telecom / Internet")).toBe("telecom-internet");
  });

  it("enforces candidate policy guardrails and rejects generic names", () => {
    expect(validateVendorCandidatePolicy("Invoice").allowed).toBe(false);
    expect(validateVendorCandidatePolicy("Billing Department").allowed).toBe(false);
    expect(validateVendorCandidatePolicy("12345").allowed).toBe(false);
    expect(validateVendorCandidatePolicy("A").allowed).toBe(false);
    
    const valid = validateVendorCandidatePolicy("Datadog");
    expect(valid.allowed).toBe(true);
    if (valid.allowed) {
      expect(valid.cleanName).toBe("Datadog");
    }
  });

  it("treats catalog aliases as the same vendor identity", () => {
    expect(identityTermsOverlap(
      {
        canonicalName: "Reliant Energy",
        aliases: ["Reliant Energy Retail", "Reliant Energy"],
      },
      {
        canonicalName: "Reliant",
        aliases: ["Reliant Energy", "NRG Reliant"],
      },
    )).toBe(true);
    expect(identityTermsOverlap(
      { canonicalName: "Acme Telecom" },
      { canonicalName: "Acme Waste" },
    )).toBe(false);
  });
});
