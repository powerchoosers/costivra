import { describe, expect, it } from "vitest";
import { generateReport } from "./generate-report";

function emptyQuery() {
  const query = {
    select: () => query,
    eq: () => query,
    order: () => query,
    then: (resolve: (value: { data: unknown[]; error: null }) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve),
  };
  return query;
}

describe("generateReport", () => {
  it("keeps scheduled report content stable when the generated timestamp is supplied", async () => {
    const db = { from: () => emptyQuery() };
    const definition = {
      id: "report-1",
      organization_id: "org-1",
      name: "Renewal calendar",
      description: "Upcoming renewals",
      report_type: "renewal_calendar",
    };
    const first = await generateReport(db as never, definition, { generatedAt: "2026-08-10T08:00:00.000Z" });
    const retry = await generateReport(db as never, definition, { generatedAt: "2026-08-10T08:00:00.000Z" });
    expect(first.generatedAt).toBe(retry.generatedAt);
    expect(first.summary).toEqual(retry.summary);
  });
});
