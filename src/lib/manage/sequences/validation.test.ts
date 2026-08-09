import { describe, expect, it } from "vitest";
import { isValidLocalTime, missingTemplateValues, renderTemplate, sanitizeSequencePersonalization, sanitizeSequencePersonalizationMap, unresolvedTemplateTokens, validateSequenceDraft } from "./validation";

describe("sequence validation", () => {
  it("allows only the pilot token allowlist", () => {
    expect(unresolvedTemplateTokens("Hi {{first_name}} {{contact.secret}} {{company_name}}" )).toEqual(["contact.secret"]);
    expect(renderTemplate("Hi {{first_name}} at {{company_name}}", { first_name: "Ava", company_name: "Acme" })).toBe("Hi Ava at Acme");
  });

  it("flags missing allowlisted values without treating unknown tokens as merge fields", () => {
    expect(missingTemplateValues("Hi {{first_name}} at {{company_name}} ({{contact.secret}})", { first_name: "", company_name: "Acme" })).toEqual(["first_name"]);
  });

  it("requires safe stops and complete ordered steps before activation", () => {
    const result = validateSequenceDraft({ name: "", timezone: "UTC", businessDays: [], sendStartLocal: "16:00", sendEndLocal: "09:00", stopOnReply: false, stopOnBounce: true, stopOnUnsubscribe: true, steps: [] }, { forActivation: true });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining(["A sequence name is required.", "Add at least one step.", "Reply, bounce, and unsubscribe stops are mandatory."]));
  });

  it("rejects invalid schedule values before activation", () => {
    const result = validateSequenceDraft({ name: "Pilot", timezone: "Not/A_Timezone", businessDays: [1, 1, 8], sendStartLocal: "9:00", sendEndLocal: "25:00", stopOnReply: true, stopOnBounce: true, stopOnUnsubscribe: true, steps: [{ id: "step", sequenceId: "sequence", position: 1, stepType: "manual_email", delayValue: 0, delayUnit: "business_days", threadMode: "new_thread", subjectTemplate: "Hello", bodyHtml: null, bodyText: "Hi", taskTitleTemplate: null, taskNotesTemplate: null, taskPriority: "normal", pauseUntilTaskComplete: true }] }, { forActivation: true });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining(["Choose a valid timezone.", "Business days must be Monday through Sunday.", "Choose each business day only once.", "Choose valid send times."]));
  });

  it("accepts only real 24-hour local times", () => {
    expect(isValidLocalTime("09:00")).toBe(true);
    expect(isValidLocalTime("9:00")).toBe(false);
    expect(isValidLocalTime("24:00")).toBe(false);
    expect(isValidLocalTime("12:60")).toBe(false);
  });

  it("keeps enrollment personalization to the explicit merge-field allowlist", () => {
    expect(sanitizeSequencePersonalization({ first_name: " Ava ", company_name: "Acme", sender_name: "spoof", nested: { secret: "no" }, empty: "" })).toEqual({ first_name: "Ava", company_name: "Acme" });
    expect(sanitizeSequencePersonalizationMap({ contact_a: { job_title: "Controller" }, contact_b: { website: "https://example.com" }, contact_c: { sender_name: "spoof" } })).toEqual({ contact_a: { job_title: "Controller" }, contact_b: { website: "https://example.com" } });
  });
});
