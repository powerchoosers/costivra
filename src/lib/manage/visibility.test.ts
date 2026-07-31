import { describe, expect, it } from "vitest";

import { hiddenOrganizationIds } from "./visibility";

describe("owner CRM visibility", () => {
  it("keeps ordinary accounts visible by default", () => {
    const hidden = hiddenOrganizationIds([
      { organization_id: "real-client" },
      { organization_id: "active-client", visible_in_crm: true },
    ]);

    expect([...hidden]).toEqual([]);
  });

  it("returns only organizations explicitly hidden from the CRM", () => {
    const hidden = hiddenOrganizationIds([
      { organization_id: "demo-workspace", visible_in_crm: false },
      { organization_id: "real-client", visible_in_crm: true },
    ]);

    expect([...hidden]).toEqual(["demo-workspace"]);
  });
});
