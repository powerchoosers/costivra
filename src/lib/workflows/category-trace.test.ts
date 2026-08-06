import { describe, expect, it } from "vitest";
import { resolveCategoryTrace, withCategoryTrace } from "./category-trace";

describe("opportunity category trace", () => {
  it("records the shared pack version without changing deterministic inputs", async () => {
    const trace = await resolveCategoryTrace("Software");
    const inputs = withCategoryTrace(
      { currentExpenseId: "expense-current", priorExpenseId: "expense-prior" },
      trace,
    );

    expect(trace).toMatchObject({
      categoryKey: "saas-subscriptions",
      packStatus: "draft",
    });
    expect(inputs).toMatchObject({
      currentExpenseId: "expense-current",
      priorExpenseId: "expense-prior",
      categoryIntelligence: trace,
    });
  });

  it("leaves an unsupported category explicitly unknown", async () => {
    await expect(resolveCategoryTrace("Specialist laboratory services")).resolves.toEqual({
      categoryKey: null,
      packVersion: null,
      packStatus: "unknown",
      resolutionSource: "fallback",
    });
  });
});
