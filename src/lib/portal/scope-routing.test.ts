import { describe, expect, it } from "vitest";
import { getCanonicalParentPath, getLegacyWorkspaceRedirect } from "@/lib/portal/scope-routing";

describe("scope routing", () => {
  it("maps every legacy global list to its canonical workspace", () => {
    expect(getLegacyWorkspaceRedirect("expenses", false)).toBe("/app/bills?view=spend");
    expect(getLegacyWorkspaceRedirect("documents", false)).toBe("/app/bills?view=files");
    expect(getLegacyWorkspaceRedirect("opportunities", false)).toBe("/app/findings");
    expect(getLegacyWorkspaceRedirect("savings", false)).toBe("/app/results?view=verified");
    expect(getLegacyWorkspaceRedirect("reports", false)).toBe("/app/results?view=reports");
  });

  it("does not redirect legacy detail records", () => {
    expect(getLegacyWorkspaceRedirect("opportunities", true)).toBeNull();
    expect(getLegacyWorkspaceRedirect("unknown", false)).toBeNull();
  });

  it("resolves the active canonical parent for legacy and current pages", () => {
    expect(getCanonicalParentPath("documents")).toBe("/app/bills");
    expect(getCanonicalParentPath("opportunities")).toBe("/app/findings");
    expect(getCanonicalParentPath("savings")).toBe("/app/results");
    expect(getCanonicalParentPath("contracts")).toBe("/app/contracts");
  });
});
