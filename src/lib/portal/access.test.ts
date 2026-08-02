import { describe, expect, it } from "vitest";
import { portalRoleCanWrite } from "@/lib/portal/access";

describe("portalRoleCanWrite", () => {
  it.each(["owner", "admin", "member"])("allows %s mutations", (role) => {
    expect(portalRoleCanWrite(role)).toBe(true);
  });

  it.each(["viewer", "", "unknown"])("keeps %s read only", (role) => {
    expect(portalRoleCanWrite(role)).toBe(false);
  });
});
