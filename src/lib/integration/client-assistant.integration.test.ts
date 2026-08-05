import { describe, expect, it } from "vitest";
import { parseClientAssistantModelOutput } from "@/lib/client-assistant/schemas";
import { buildClientAssistantSystemPrompt } from "@/lib/client-assistant/prompt";
import type { AssistantBoundedContext } from "@/lib/client-assistant/context-builder";

describe("Client Assistant V2 Integration Suite", () => {
  it("parses structured model outputs into validated answer and block requests", () => {
    const rawJson = JSON.stringify({
      version: "client-assistant-v1",
      answer: "We found 2 contracts renewing in Q3.",
      citationIds: ["doc-123"],
      blockRequests: [
        { type: "invoice_summary", invoiceId: "inv-999" },
        { type: "renewal_timeline", contractIds: ["c-1", "c-2"] },
      ],
      followUps: ["Compare vendor bills?"],
      missingInformation: ["Notice window on Fiber Contract"],
    });

    const parsed = parseClientAssistantModelOutput(rawJson);
    expect(parsed.version).toBe("client-assistant-v1");
    expect(parsed.answer).toBe("We found 2 contracts renewing in Q3.");
    expect(parsed.citationIds).toEqual(["doc-123"]);
    expect(parsed.blockRequests).toHaveLength(2);
    expect(parsed.blockRequests[0].type).toBe("invoice_summary");
    expect(parsed.followUps).toEqual(["Compare vendor bills?"]);
  });

  it("handles non-JSON raw model output gracefully without crashing", () => {
    const plainText = "Here is your spend summary for AT&T.";
    const parsed = parseClientAssistantModelOutput(plainText);
    expect(parsed.answer).toBe(plainText);
    expect(parsed.blockRequests).toEqual([]);
    expect(parsed.citationIds).toEqual([]);
  });

  it("assembles system prompt with Costivra financial doctrine and bounded context", () => {
    const mockContext: AssistantBoundedContext = {
      organizationName: "Acme Logistics",
      currentViewContext: "Viewing Vendor: AT&T Business",
      attachedDocuments: [{ id: "doc-1", filename: "att-july.pdf", extractionSummary: "July bill" }],
      recentVendors: [{ id: "v-1", name: "AT&T", category: "Telecom", spend: 12000 }],
      recentInvoices: [{ id: "i-1", vendorName: "AT&T", amount: 1000, date: "2026-07-31", status: "ready" }],
      openOpportunities: [{ id: "o-1", title: "Unused Fiber Line", estimatedAnnualValue: 2400, status: "open" }],
      upcomingContracts: [{ id: "c-1", title: "Fiber agreement", vendorName: "AT&T", endDate: "2026-11-15", noticeDeadline: "2026-08-17", autoRenews: true }],
    };

    const prompt = buildClientAssistantSystemPrompt(mockContext);
    expect(prompt).toContain('Organization: "Acme Logistics"');
    expect(prompt).toContain("Viewing Vendor: AT&T Business");
    expect(prompt).toContain("AI interprets, code calculates, policies control, humans authorize, and evidence proves.");
    expect(prompt).toContain('"att-july.pdf"');
  });
});
